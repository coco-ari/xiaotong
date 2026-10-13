import {readFileSync} from 'node:fs';
import {validateSceneData} from './scene-data.mjs';

const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_RESPONSE_BYTES = 256 * 1024;
const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function keys(value, allowed, message) {
  check(object(value) && Object.keys(value).every(key => allowed.includes(key)), message);
}

function pathParts(path) {
  check(typeof path === 'string' && path.length <= 256, '字段路径无效');
  const parts = path.split('.');
  check(parts.length <= 12 && parts.every(part => /^[a-zA-Z0-9_-]+$/.test(part) && !FORBIDDEN.has(part)), '字段路径无效');
  return parts;
}

function readPath(payload, path) {
  let value = payload;
  for (const part of pathParts(path)) {
    check(value !== null && typeof value === 'object' && Object.hasOwn(value, part), '上游缺少配置字段');
    value = value[part];
  }
  return value;
}

export function validateSceneSources(config, env = process.env) {
  keys(config, ['version', 'sources'], '接入配置格式不正确');
  check(config.version === 1 && Array.isArray(config.sources) && config.sources.length <= 10, '接入配置需要版本 1，最多 10 个源');
  const ids = new Set();
  let customCount = 0;
  return config.sources.map(source => {
    keys(source, ['id', 'url', 'intervalSeconds', 'timeoutMs', 'headers', 'fields', 'asOf', 'readyWhen'], '数据源配置含未知字段');
    validateSceneData(source.id, {status: 'error'});
    check(!ids.has(source.id), '同一数据源只能配置一个接入器');
    ids.add(source.id);
    if (!['finance', 'feed'].includes(source.id)) check(++customCount <= 8, '自定义接入源最多 8 个');
    let url;
    try {url = new URL(source.url);} catch {throw new Error('上游地址无效');}
    check(url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)), '上游需要 HTTPS，本机联调可用 HTTP');
    check(!url.username && !url.password && !url.hash, '上游地址不能包含用户信息或片段');
    const intervalSeconds = source.intervalSeconds ?? 60, timeoutMs = source.timeoutMs ?? 10000;
    check(Number.isInteger(intervalSeconds) && intervalSeconds >= 15 && intervalSeconds <= 86400, '采集间隔为 15 至 86400 秒');
    check(Number.isInteger(timeoutMs) && timeoutMs >= 500 && timeoutMs <= 30000, '接口超时为 500 至 30000 毫秒');
    const headers = {Accept: 'application/json'};
    check(source.headers === undefined || object(source.headers), '请求头配置无效');
    const headerNames = new Set(['accept']);
    for (const [name, entry] of Object.entries(source.headers ?? {})) {
      check(/^[a-zA-Z][a-zA-Z0-9-]{0,63}$/.test(name) && !['host', 'cookie', 'content-length', 'connection', 'transfer-encoding', 'origin', 'referer'].includes(name.toLowerCase()) && !headerNames.has(name.toLowerCase()), '请求头名称无效或重复');
      headerNames.add(name.toLowerCase());
      keys(entry, ['env', 'prefix'], '请求头仅支持环境变量引用');
      check(typeof entry.env === 'string' && ENV_NAME.test(entry.env), '请求头环境变量名称无效');
      check(entry.prefix === undefined || typeof entry.prefix === 'string', '请求头前缀无效');
      const secret = env[entry.env];
      check(typeof secret === 'string' && secret.length > 0, '接入器所需环境变量未配置');
      const value = (entry.prefix ?? '') + secret;
      check(value.length <= 4096 && !/[\r\n\0]/.test(value), '请求头值无效');
      headers[name] = value;
    }
    check(object(source.fields) && Object.keys(source.fields).length >= 1 && Object.keys(source.fields).length <= 20, '接入字段需要 1 至 20 个');
    const placeholderValues = Object.fromEntries(Object.keys(source.fields).map(key => [key, 0]));
    validateSceneData(source.id, {status: 'ready', values: placeholderValues});
    for (const mapping of Object.values(source.fields)) {
      keys(mapping, ['path', 'type'], '字段映射格式不正确');
      pathParts(mapping.path);
      check(['number', 'numericString', 'string', 'boolean'].includes(mapping.type), '字段转换类型无效');
    }
    keys(source.asOf, ['path', 'format'], '必须配置上游数据产生时间');
    pathParts(source.asOf.path);
    check(['iso', 'milliseconds', 'seconds'].includes(source.asOf.format), '数据时间格式无效');
    if (source.readyWhen !== undefined) {
      keys(source.readyWhen, ['path', 'equals'], '业务成功条件格式不正确');
      pathParts(source.readyWhen.path);
      check(['string', 'number', 'boolean'].includes(typeof source.readyWhen.equals) && (typeof source.readyWhen.equals !== 'number' || Number.isFinite(source.readyWhen.equals)), '业务成功条件只支持标量等值');
    }
    return {...structuredClone(source), url: url.href, intervalSeconds, timeoutMs, headers};
  });
}

export function loadSceneSources(file, env = process.env) {
  let config;
  try {config = JSON.parse(readFileSync(file, 'utf8'));} catch {throw new Error('无法读取场景接入配置，请检查文件和 JSON 格式');}
  return validateSceneSources(config, env);
}

export function mapScenePayload(source, payload, now = Date.now()) {
  if (source.readyWhen) check(readPath(payload, source.readyWhen.path) === source.readyWhen.equals, '上游业务状态未成功');
  const values = {};
  for (const [field, mapping] of Object.entries(source.fields)) {
    let value = readPath(payload, mapping.path);
    if (mapping.type === 'numericString') {
      // 仅显式声明的十进制字符串允许转换，空值、布尔值和混合单位都不能变成零。
      check(typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim()), '上游数字文本格式不正确');
      value = Number(value);
    }
    const expected = mapping.type === 'numericString' ? 'number' : mapping.type;
    check(typeof value === expected && (expected !== 'number' || Number.isFinite(value)), '上游字段类型不匹配');
    values[field] = value;
  }
  const rawTime = readPath(payload, source.asOf.path);
  let asOf;
  if (source.asOf.format === 'iso') {
    check(typeof rawTime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(rawTime), '上游时间必须包含时区');
    const year = Number(rawTime.slice(0, 4)), month = Number(rawTime.slice(5, 7)), day = Number(rawTime.slice(8, 10));
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    check(month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number(rawTime.slice(11, 13)) < 24 && Number(rawTime.slice(14, 16)) < 60 && Number(rawTime.slice(17, 19)) < 60, '上游日期或时间不存在');
    asOf = Date.parse(rawTime);
  } else {
    check(typeof rawTime === 'number' && Number.isFinite(rawTime), '上游时间需要数字时间戳');
    asOf = source.asOf.format === 'seconds' ? rawTime * 1000 : rawTime;
  }
  return validateSceneData(source.id, {status: 'ready', values, asOf}, {}, now);
}

async function readJson(response) {
  const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  check(type === 'application/json' || /^application\/[\w.+-]+\+json$/.test(type), '上游未返回 JSON');
  check(response.body && Number(response.headers.get('content-length') || 0) <= MAX_RESPONSE_BYTES, '上游响应超过大小限制');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    check(size <= MAX_RESPONSE_BYTES, '上游响应超过大小限制');
    chunks.push(chunk);
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw new Error('上游 JSON 格式不正确');}
}

export async function collectSceneSource(source, {fetchImpl = fetch, signal, clock = Date.now} = {}) {
  const timeout = AbortSignal.timeout(source.timeoutMs);
  const response = await fetchImpl(source.url, {
    method: 'GET', headers: source.headers, redirect: 'error', cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  try {
    check(response.ok, '上游请求未成功');
    return mapScenePayload(source, await readJson(response), clock());
  } finally {
    // 对提前拒绝的响应也释放连接，不让错误页面或大响应持续占用资源。
    if (response.body && !response.body.locked) await response.body.cancel().catch(() => {});
  }
}

export function startSceneAdapters({sources, write, onError = () => {}, fetchImpl = fetch, clock = Date.now, schedule = setTimeout, cancel = clearTimeout}) {
  const controller = new AbortController(), timers = new Set();
  const report = (id, message) => {try {onError(id, message);} catch { /* 诊断回调不能中断其他数据源。 */ }};
  const run = async source => {
    if (controller.signal.aborted) return;
    let result;
    try {
      result = await collectSceneSource(source, {fetchImpl, clock, signal: controller.signal});
    } catch {
      if (controller.signal.aborted) return;
      result = {status: 'error'};
      // 不记录 URL、响应正文或异常原文，避免上游凭据与个人数据进入日志。
      report(source.id, '采集失败，将使用默认场景');
    }
    if (controller.signal.aborted) return;
    try {await write(source.id, result);} catch {report(source.id, '摘要保存失败，请检查运行数据目录');}
    if (controller.signal.aborted) return;
    // 每个源完成一次采集后再计时，慢接口不会产生重叠请求。
    const timer = schedule(() => {timers.delete(timer); void run(source);}, source.intervalSeconds * 1000);
    timers.add(timer);
    timer?.unref?.();
  };
  const ready = Promise.all(sources.map(run));
  return {
    ready,
    stop() {controller.abort(); for (const timer of timers) cancel(timer); timers.clear();},
  };
}
