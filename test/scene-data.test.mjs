import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {Space} from '../server/space.mjs';
import {createApp} from '../server/index.mjs';
import {DEMO_SCENE_VALUES, sceneDataSnapshot, validateSceneData} from '../server/scene-data.mjs';
import {DEFAULT_PRESENTATION, buildSceneQueue} from '../shared/scene-engine.mjs';
import {portfolio, STORIES} from '../src/home/data.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'xiaotong-scenes-test-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return dir;
}

test('重新接收的旧业务数据仍按产生时间过期，且接入字段与规则字段一致', t => {
  const now = Date.parse('2026-10-13T04:00:00Z');
  const store = new Space(fixture(t), {clock: () => now});
  const asOf = now - 86400000;
  store.writeSceneData('finance', {status: 'ready', asOf, values: {todayProfit: 100}});
  const snapshot = store.sceneSnapshot().snapshots.finance;
  assert.equal(snapshot.updatedAt, now);
  assert.equal(snapshot.asOf, asOf);
  const scene = buildSceneQueue(DEFAULT_PRESENTATION, {finance: snapshot}, {now}).find(item => item.moduleId === 'finance');
  assert.equal(scene.dataStatus, 'unavailable');
  assert.equal(scene.ruleId, 'fallback');
  assert.throws(() => store.writeSceneData('finance', {status: 'ready', asOf: now + 1, values: {todayProfit: 1}}));
  const field = '_' + 'a'.repeat(47);
  assert.doesNotThrow(() => validateSceneData('custom', {status: 'ready', values: {[field]: 1}}));
  assert.throws(() => validateSceneData('custom', {status: 'ready', values: {[field + 'a']: 1}}));
});

test('场景演示摘要与页面演示数据一致，上海时段按每次读取重新计算', () => {
  const finance = portfolio();
  assert.deepEqual(DEMO_SCENE_VALUES.finance, {todayProfit: finance.today, totalProfit: finance.total});
  assert.equal(DEMO_SCENE_VALUES.feed.newItems, STORIES.length);
  const before = Date.parse('2026-10-13T15:59:59Z');
  const after = Date.parse('2026-10-13T16:00:00Z');
  assert.equal(sceneDataSnapshot({}, before).snapshots.daily.values.hour, 23);
  assert.equal(sceneDataSnapshot({}, after).snapshots.daily.values.hour, 0);
  assert.equal(sceneDataSnapshot({}, after).fetchedAt, after);
  assert.equal(sceneDataSnapshot({}, after).snapshots.finance.mode, 'demo');
});

test('旧设置迁移补齐人物模块，同时保留偏好、收藏、通知和旧字段', t => {
  const dir = fixture(t);
  const previous = {
    settings: {autoMood: false, slots: ['assets', 'empty', 'saved'], plugins: {finance: false}},
    saved: ['one'], notifications: [{id: 'kept', status: 'clicked'}], legacyNote: '保留资料',
  };
  writeFileSync(join(dir, 'xiaotong.json'), JSON.stringify(previous));
  const store = new Space(dir);
  const snapshot = store.snapshot();
  assert.equal(snapshot.settings.autoMood, false);
  assert.deepEqual(snapshot.settings.slots, previous.settings.slots);
  assert.deepEqual(snapshot.settings.plugins, {finance: false, feed: true});
  assert.deepEqual(snapshot.settings.presentation, DEFAULT_PRESENTATION);
  assert.deepEqual(snapshot.saved, previous.saved);
  assert.deepEqual(snapshot.notifications, previous.notifications);
  assert.equal(snapshot.legacyNote, '保留资料');
  assert.equal(snapshot.sceneData, undefined);
  assert.deepEqual(new Space(dir).snapshot(), snapshot);
});

test('人物配置整体验证并持久保存，验证或磁盘写入失败均不部分更新', t => {
  const dir = fixture(t), store = new Space(dir);
  const presentation = structuredClone(DEFAULT_PRESENTATION);
  presentation.intervalSeconds = 12;
  store.settings({presentation});
  assert.deepEqual(new Space(dir).snapshot().settings.presentation, presentation);
  const previous = store.snapshot(), disk = readFileSync(store.file, 'utf8');
  assert.throws(() => store.settings({autoMood: false, presentation: {...presentation, intervalSeconds: 3}}));
  assert.throws(() => store.settings({autoMood: false, presentation: {intervalSeconds: 8}}));
  assert.deepEqual(store.snapshot(), previous);
  assert.equal(readFileSync(store.file, 'utf8'), disk);
  mkdirSync(store.file + '.tmp');
  assert.throws(() => store.settings({autoMood: false}));
  assert.deepEqual(store.snapshot(), previous);
  assert.equal(readFileSync(store.file, 'utf8'), disk);
});

test('数据摘要只接收安全标量字段，字符按可见字计数并限制数量', () => {
  const family = '👨‍👩‍👧‍👦';
  assert.equal(validateSceneData('health', {status: 'ready', values: {tip: family.repeat(96), complete: true, steps: 0}}).values.tip, family.repeat(96));
  assert.throws(() => validateSceneData('health', {status: 'ready', values: {tip: family.repeat(97)}}));
  for (const value of [null, undefined, [], {}, NaN, Infinity, -Infinity]) {
    assert.throws(() => validateSceneData('finance', {status: 'ready', values: {todayProfit: value}}));
  }
  for (const name of ['__proto__', 'prototype', 'constructor', 'nested.field', 'space field']) {
    const values = JSON.parse(`{"${name}":1}`);
    assert.throws(() => validateSceneData('health', {status: 'ready', values}));
  }
  assert.throws(() => validateSceneData('daily', {status: 'ready', values: {hour: 12}}));
  assert.throws(() => validateSceneData('constructor', {status: 'ready', values: {value: 1}}));
  assert.throws(() => validateSceneData('../finance', {status: 'ready', values: {value: 1}}));
  assert.throws(() => validateSceneData('finance', {status: 'ready', values: {}}));
  assert.throws(() => validateSceneData('finance', {status: 'ready', values: {value: 1}, updatedAt: 123}));
  const fields = Object.fromEntries(Array.from({length: 20}, (_, i) => [`value${i}`, i]));
  assert.equal(Object.keys(validateSceneData('health', {status: 'ready', values: fields}).values).length, 20);
  assert.throws(() => validateSceneData('health', {status: 'ready', values: {...fields, excess: 21}}));
  assert.deepEqual(validateSceneData('health', {status: 'error'}), {status: 'error', values: {}});
  assert.throws(() => validateSceneData('health', {status: 'error', values: null}));
});

test('实时摘要持久化，读取不刷新接收时间，错误状态不倒退到演示收益', t => {
  let now = Date.parse('2026-10-13T08:00:00Z');
  const dir = fixture(t), store = new Space(dir, {clock: () => now});
  store.writeSceneData('finance', {status: 'ready', values: {todayProfit: -25, totalProfit: 500}});
  const receivedAt = now;
  now += 60000;
  const restored = new Space(dir, {clock: () => now});
  const snapshot = restored.sceneSnapshot();
  assert.equal(snapshot.snapshots.finance.mode, 'live');
  assert.equal(snapshot.snapshots.finance.values.todayProfit, -25);
  assert.equal(snapshot.snapshots.finance.updatedAt, receivedAt);
  assert.equal(snapshot.fetchedAt, now);
  snapshot.snapshots.finance.values.todayProfit = 123;
  assert.equal(restored.sceneSnapshot().snapshots.finance.values.todayProfit, -25);
  restored.writeSceneData('finance', {status: 'error', values: {todayProfit: -25}});
  const failed = restored.sceneSnapshot().snapshots.finance;
  assert.equal(failed.status, 'error');
  assert.equal(failed.mode, 'live');
  assert.deepEqual(failed.values, {});
  assert.equal(failed.updatedAt, now);
  assert.equal(restored.snapshot().sceneData, undefined);
  assert.equal(JSON.parse(readFileSync(store.file, 'utf8')).sceneData.finance.status, 'error');
});

test('八个自定义数据源与内置数据源独立计数，满额后仍可更新已有源', t => {
  const store = new Space(fixture(t));
  for (let i = 0; i < 8; i++) store.writeSceneData(`custom-${i}`, {status: 'ready', values: {count: i}});
  assert.throws(() => store.writeSceneData('custom-nine', {status: 'ready', values: {count: 9}}));
  store.writeSceneData('custom-0', {status: 'ready', values: {count: 100}});
  store.writeSceneData('finance', {status: 'ready', values: {todayProfit: 0}});
  store.writeSceneData('feed', {status: 'ready', values: {newItems: 0}});
  assert.equal(Object.keys(store.sceneSnapshot().snapshots).length, 11);
  assert.equal(store.sceneSnapshot().snapshots['custom-0'].values.count, 100);
});

test('HTTP 场景接口接受标准摘要并拒绝越界数据，状态接口仅增加人物配置', async t => {
  const dir = fixture(t), now = Date.parse('2026-10-13T08:00:00Z');
  const server = createApp({dataDir: dir, origin: 'http://localhost', clock: () => now, scheduler: false});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const root = `http://127.0.0.1:${server.address().port}`, base = root + server.prefix;
  const request = (path, method, value, origin = 'http://localhost') => fetch(base + path, {
    method, headers: {'Content-Type': 'application/json', Origin: origin}, body: JSON.stringify(value),
  });
  assert.equal((await fetch(root + '/api/scene-data')).status, 404);
  let result = await (await fetch(base + 'api/scene-data')).json();
  assert.equal(result.snapshots.finance.mode, 'demo');
  assert.equal(result.snapshots.daily.values.hour, 16);
  const response = await request('api/scene-data/finance', 'POST', {status: 'ready', values: {todayProfit: -50}});
  assert.equal(response.status, 200);
  result = await response.json();
  assert.deepEqual(result.snapshots.finance, {status: 'ready', values: {todayProfit: -50}, updatedAt: now, mode: 'live'});
  assert.equal((await request('api/scene-data/finance', 'POST', {status: 'ready', values: {todayProfit: 5}}, 'https://bad.example')).status, 403);
  for (const [source, input] of [
    ['daily', {status: 'ready', values: {hour: 1}}],
    ['finance', {status: 'ready', values: {todayProfit: null}}],
    ['finance', {status: 'ready', values: {tip: '字'.repeat(97)}}],
    ['finance', {status: 'unknown', values: {todayProfit: 1}}],
    ['constructor', {status: 'ready', values: {value: 1}}],
  ]) assert.equal((await request('api/scene-data/' + source, 'POST', input)).status, 400);
  result = await (await fetch(base + 'api/scene-data')).json();
  assert.equal(result.snapshots.finance.values.todayProfit, -50);
  assert.equal((await request('api/scene-data/finance', 'POST', {status: 'error', values: {}})).status, 200);
  const state = await (await fetch(base + 'api/state')).json();
  assert.deepEqual(state.settings.presentation, DEFAULT_PRESENTATION);
  assert.equal(state.sceneData, undefined);
  assert.equal(state.snapshots, undefined);
  const invalid = await request('api/settings', 'PATCH', {autoMood: false, presentation: {...DEFAULT_PRESENTATION, intervalSeconds: 61}});
  assert.equal(invalid.status, 400);
  assert.equal((await (await fetch(base + 'api/state')).json()).settings.autoMood, true);
  const presentation = {...structuredClone(DEFAULT_PRESENTATION), intervalSeconds: 10};
  assert.equal((await request('api/settings', 'PATCH', {presentation})).status, 200);
  assert.deepEqual((await (await fetch(base + 'api/state')).json()).settings.presentation, presentation);
});
