import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {collectSceneSource, mapScenePayload, startSceneAdapters, validateSceneSources} from '../server/scene-adapters.mjs';
import {createApp} from '../server/index.mjs';
import {buildSceneQueue, DEFAULT_PRESENTATION} from '../shared/scene-engine.mjs';

const now = Date.parse('2026-10-13T04:00:00Z');
const payload = (profit = 50, asOf = now) => ({code: 0, data: {profit, total: 100, at: new Date(asOf).toISOString()}});
const config = (url = 'https://example.com/summary') => ({version: 1, sources: [{
  id: 'finance', url, intervalSeconds: 15, timeoutMs: 500,
  fields: {todayProfit: {path: 'data.profit', type: 'number'}, totalProfit: {path: 'data.total', type: 'number'}},
  asOf: {path: 'data.at', format: 'iso'}, readyWhen: {path: 'code', equals: 0},
}]});
const source = () => validateSceneSources(config())[0];
const jsonResponse = value => new Response(JSON.stringify(value), {headers: {'Content-Type': 'application/json'}});

async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  await new Promise(resolve => {server.close(resolve); server.closeAllConnections();});
}

function directory(t) {
  const dir = mkdtempSync(join(tmpdir(), 'xiaotong-adapters-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return dir;
}

async function waitUntil(predicate) {
  for (let i = 0; i < 100; i++) {if (await predicate()) return; await delay(10);}
  assert.fail('接入摘要未按预期更新');
}

test('接入配置约束源数量、唯一标识、字段、时间、URL 和凭据引用', () => {
  const accepted = config();
  accepted.sources[0].headers = {Authorization: {env: 'FINANCE_TOKEN', prefix: 'Bearer '}};
  assert.equal(validateSceneSources(accepted, {FINANCE_TOKEN: 'private-token'})[0].headers.Authorization, 'Bearer private-token');
  assert.throws(() => validateSceneSources(accepted, {}), /环境变量/);
  assert.throws(() => validateSceneSources(accepted, {FINANCE_TOKEN: 'secret\r\nInjected: yes'}));
  for (const mutate of [
    c => {c.sources.push(c.sources[0]);},
    c => {c.sources[0].id = 'daily';},
    c => {delete c.sources[0].asOf;},
    c => {c.sources[0].fields.todayProfit.path = '__proto__.profit';},
    c => {c.sources[0].fields = JSON.parse('{"constructor":{"path":"data.profit","type":"number"}}');},
    c => {c.sources[0].intervalSeconds = 1;},
    c => {c.sources[0].url = 'http://example.com/summary';},
    c => {c.sources[0].url = 'https://user:secret@example.com/summary';},
    c => {c.sources[0].headers = {Authorization: 'literal-secret'};},
    c => {c.sources[0].headers = {Host: {env: 'HOST'}};},
    c => {c.sources[0].fields.todayProfit.type = 'javascript';},
    c => {c.sources[0].unexpected = true;},
    c => {c.sources = Array.from({length: 9}, (_, i) => ({...c.sources[0], id: `custom-${i}`}));},
  ]) {const invalid = config(); mutate(invalid); assert.throws(() => validateSceneSources(invalid));}
});

test('上游映射保留正负零和原始时间，字段及业务状态使用严格类型', () => {
  for (const profit of [50, -15, 0]) assert.deepEqual(mapScenePayload(source(), payload(profit), now), {status: 'ready', values: {todayProfit: profit, totalProfit: 100}, asOf: now});
  for (const profit of [null, false, '', '0', [], {}]) assert.throws(() => mapScenePayload(source(), payload(profit), now));
  assert.throws(() => mapScenePayload(source(), {...payload(), code: '0'}, now));
  assert.throws(() => mapScenePayload(source(), {code: 0, data: {}}, now));
  assert.throws(() => mapScenePayload(source(), payload(1, now + 1), now));
  assert.throws(() => mapScenePayload(source(), {code: 0, data: {profit: 1, total: 2, at: '2026-10-13T04:00:00'}}, now));
  for (const at of ['2026-02-30T04:00:00Z', '2026-02-29T04:00:00Z', '2026-10-12T24:00:00Z']) {
    assert.throws(() => mapScenePayload(source(), {code: 0, data: {profit: 1, total: 2, at}}, now));
  }
  assert.equal(mapScenePayload(source(), payload(50, now - 86400000), now).asOf, now - 86400000);
  for (const [format, raw] of [['seconds', now / 1000], ['milliseconds', now]]) {
    const entry = source(); entry.asOf.format = format;
    const input = payload(); input.data.at = raw;
    assert.equal(mapScenePayload(entry, input, now).asOf, now);
  }
});

test('数字文本必须显式转换，空白、千分位、单位、非有限值不能变成收益', () => {
  const entry = source(); entry.fields.todayProfit.type = 'numericString';
  assert.equal(mapScenePayload(entry, payload(' -15.25 '), now).values.todayProfit, -15.25);
  for (const value of ['', ' ', '0x10', '1,000', '5元', 'Infinity', '1e3', true, null, '9'.repeat(400)]) assert.throws(() => mapScenePayload(entry, payload(value), now));
  const custom = source();
  custom.fields = {tip: {path: 'data.tip', type: 'string'}, complete: {path: 'data.complete', type: 'boolean'}};
  assert.deepEqual(mapScenePayload(custom, {code: 0, data: {tip: '完成啦', complete: true, at: payload().data.at}}, now).values, {tip: '完成啦', complete: true});
});

test('响应大小、内容类型及重定向受控，错误正文不会写入场景摘要', async () => {
  const entry = source();
  let request;
  const result = await collectSceneSource(entry, {clock: () => now, fetchImpl: async (url, options) => {request = options; return jsonResponse(payload(-5));}});
  assert.equal(result.values.todayProfit, -5);
  assert.equal(request.redirect, 'error');
  assert.equal(request.cache, 'no-store');
  for (const response of [
    new Response('secret upstream failure', {status: 500}),
    new Response('<html>secret</html>', {headers: {'Content-Type': 'text/html'}}),
    new Response('{invalid', {headers: {'Content-Type': 'application/json'}}),
    new Response('x'.repeat(262145), {headers: {'Content-Type': 'application/json'}}),
    new Response('{}', {headers: {'Content-Type': 'application/json', 'Content-Length': '262145'}}),
  ]) await assert.rejects(collectSceneSource(entry, {fetchImpl: async () => response, clock: () => now}));
});

test('采集循环失败清空摘要、下一轮恢复，完成后调度且日志不泄露上游错误', async () => {
  const writes = [], logs = [], callbacks = [], canceled = [];
  let attempts = 0;
  const runner = startSceneAdapters({sources: [source()], clock: () => now,
    fetchImpl: async () => {attempts++; if (attempts === 1) throw new Error('token=secret'); return jsonResponse(payload(-9));},
    write: async (id, value) => {writes.push({id, value});},
    onError: (id, message) => logs.push({id, message}),
    schedule: (callback, ms) => {callbacks.push({callback, ms}); return callbacks.length;}, cancel: id => canceled.push(id),
  });
  await runner.ready;
  assert.deepEqual(writes, [{id: 'finance', value: {status: 'error'}}]);
  assert.equal(JSON.stringify(logs).includes('secret'), false);
  assert.equal(callbacks[0].ms, 15000);
  callbacks[0].callback();
  await waitUntil(() => writes.length === 2 && callbacks.length === 2);
  assert.equal(writes[1].value.values.todayProfit, -9);
  runner.stop();
  assert.deepEqual(canceled, [2]);
  callbacks[1].callback();
  assert.equal(attempts, 2);
});

test('慢接口不会重叠调度，关闭时取消请求且不覆盖最后的有效摘要', async () => {
  let fetchSignal, scheduled = 0, writes = 0;
  const runner = startSceneAdapters({sources: [source()],
    fetchImpl: (url, {signal}) => new Promise((resolve, reject) => {fetchSignal = signal; signal.addEventListener('abort', () => reject(new Error('已中止')), {once: true});}),
    write: () => {writes++;}, schedule: () => {scheduled++;},
  });
  assert.equal(scheduled, 0);
  runner.stop();
  await runner.ready;
  assert.equal(fetchSignal.aborted, true);
  assert.equal(writes, 0);
  assert.equal(scheduled, 0);
});

test('实际 HTTP 超时和重定向不会携带认证信息继续请求', async t => {
  let forwarded = 0;
  const upstream = http.createServer((req, res) => {
    if (req.url === '/slow') return;
    if (req.url === '/redirect') {res.writeHead(302, {Location: '/destination'}); return res.end();}
    forwarded++; res.end('{}');
  });
  const root = await listen(upstream);
  t.after(() => close(upstream));
  const entry = validateSceneSources(config(root + '/slow'))[0];
  await assert.rejects(collectSceneSource(entry));
  await assert.rejects(collectSceneSource({...entry, url: root + '/redirect', headers: {Authorization: 'Bearer private'}}));
  assert.equal(forwarded, 0);
});

test('模拟上游经实际 HTTP 自动入库，盈利、亏损、零、过期及错误命中正确场景', async t => {
  const cases = [
    {name: '盈利', body: payload(50), rule: 'profit', mood: 'happy'},
    {name: '亏损', body: payload(-15), rule: 'loss', mood: 'sad'},
    {name: '持平', body: payload(0), rule: 'flat', mood: 'greeting'},
    {name: '旧报表', body: payload(100, now - 86400000), rule: 'fallback', mood: 'reading'},
    {name: '业务失败', body: {...payload(), code: 403}, rule: 'fallback', mood: 'reading', error: true},
    {name: '字段类型错误', body: payload(null), rule: 'fallback', mood: 'reading', error: true},
    {name: '服务错误', status: 503, body: payload(), rule: 'fallback', mood: 'reading', error: true},
  ];
  for (const item of cases) await t.test(item.name, async t => {
    let requests = 0;
    const upstream = http.createServer((req, res) => {requests++; res.writeHead(item.status || 200, {'Content-Type': 'application/json'}); res.end(JSON.stringify(item.body));});
    const upstreamRoot = await listen(upstream);
    const dataDir = directory(t);
    writeFileSync(join(dataDir, 'scene-sources.json'), JSON.stringify(config(upstreamRoot)));
    const app = createApp({dataDir, origin: 'http://localhost', scheduler: false, clock: () => now});
    const root = await listen(app);
    t.after(async () => {await close(app); await close(upstream);});
    await waitUntil(() => requests === 1 && (item.error || app.store.sceneSnapshot().snapshots.finance.status === 'ready'));
    // 初始错误占位与采集错误相同，等待响应处理结束以验证采集后的持久状态。
    if (item.error) await delay(50);
    const data = await (await fetch(root + app.prefix + 'api/scene-data')).json();
    const finance = data.snapshots.finance;
    assert.equal(finance.mode, 'live');
    assert.equal(finance.status, item.error ? 'error' : 'ready');
    if (item.error) assert.deepEqual(finance.values, {});
    const scene = buildSceneQueue(DEFAULT_PRESENTATION, data.snapshots, {now}).find(entry => entry.moduleId === 'finance');
    assert.equal(scene.ruleId, item.rule);
    assert.equal(scene.characterId, item.mood);
    assert.equal(scene.backgroundId, item.mood);
    assert.equal(scene.dataStatus, item.rule === 'fallback' ? 'unavailable' : 'ready');
    const publicState = await (await fetch(root + app.prefix + 'api/state')).json();
    assert.equal(JSON.stringify(publicState).includes(upstreamRoot), false);
  });
});

test('默认不启用采集，配置文件错误在监听前报告且不会静默退回演示数据', async t => {
  const dataDir = directory(t);
  const app = createApp({dataDir, scheduler: false});
  assert.equal(app.store.sceneSnapshot().snapshots.finance.mode, 'demo');
  await close(app);
  writeFileSync(join(dataDir, 'scene-sources.json'), '{invalid');
  assert.throws(() => createApp({dataDir, scheduler: false}), /无法读取/);
});
