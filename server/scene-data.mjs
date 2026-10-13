const SOURCE_ID = /^[a-z][a-z0-9-]{0,31}$/;
const FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_]{0,47}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const BUILTIN_SOURCES = new Set(['daily', 'finance', 'feed']);
const segmenter = new Intl.Segmenter('zh-CN', {granularity: 'grapheme'});
const hourFormatter = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23'});

export const MAX_CUSTOM_SOURCES = 8;
export const DEMO_SCENE_VALUES = {
  finance: {todayProfit: 368.24, totalProfit: 12680.52},
  feed: {newItems: 3},
};

function invalid(message) {
  throw Object.assign(new Error(message), {status: 400});
}

function record(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

export function validateSceneData(sourceId, input, existing = {}, now = Date.now()) {
  if (typeof sourceId !== 'string' || !SOURCE_ID.test(sourceId) || FORBIDDEN_KEYS.has(sourceId)) invalid('数据源标识无效');
  if (sourceId === 'daily') invalid('日常时段由服务器生成，不能覆盖');
  if (!record(input) || Object.keys(input).some(key => !['status', 'values', 'asOf'].includes(key))) invalid('场景数据格式不正确');
  if (!['ready', 'error'].includes(input.status)) invalid('数据状态必须是 ready 或 error');
  if (Object.hasOwn(input, 'asOf') && (!Number.isFinite(input.asOf) || input.asOf <= 0 || input.asOf > now)) invalid('数据产生时间必须是有效且不晚于当前时间的毫秒时间戳');

  const values = Object.hasOwn(input, 'values') ? input.values : (input.status === 'error' ? {} : null);
  if (!record(values)) invalid('数据字段必须是对象');
  const entries = Object.entries(values);
  if (entries.length > 20 || (input.status === 'ready' && entries.length === 0)) invalid('可用数据需要 1 至 20 个字段');
  for (const [key, value] of entries) {
    if (!FIELD_NAME.test(key) || FORBIDDEN_KEYS.has(key)) invalid('数据字段名称无效');
    if (typeof value === 'number' && Number.isFinite(value)) continue;
    if (typeof value === 'boolean') continue;
    if (typeof value === 'string' && [...segmenter.segment(value)].length <= 96) continue;
    invalid('字段只支持有限数字、布尔值或最多 96 字的文本');
  }

  const customSources = Object.keys(existing).filter(id => !BUILTIN_SOURCES.has(id));
  if (!BUILTIN_SOURCES.has(sourceId) && !Object.hasOwn(existing, sourceId) && customSources.length >= MAX_CUSTOM_SOURCES) {
    invalid('自定义数据源最多 8 个');
  }
  // 错误状态不携带旧数值，防止接入方把旧结果误当成当前可用数据。
  return {status: input.status, values: input.status === 'error' ? {} : structuredClone(values), ...(Object.hasOwn(input, 'asOf') ? {asOf: input.asOf} : {})};
}

export function sceneDataSnapshot(overrides = {}, now = Date.now()) {
  const snapshots = {
    daily: {status: 'ready', updatedAt: now, mode: 'local', values: {hour: Number(hourFormatter.format(new Date(now)))}},
    finance: {status: 'ready', updatedAt: now, mode: 'demo', values: structuredClone(DEMO_SCENE_VALUES.finance)},
    feed: {status: 'ready', updatedAt: now, mode: 'demo', values: structuredClone(DEMO_SCENE_VALUES.feed)},
  };
  for (const [id, snapshot] of Object.entries(overrides)) {
    // 保留接收时刻，读取不能把过期实时数据刷新成新数据。
    if (id !== 'daily') snapshots[id] = structuredClone(snapshot);
  }
  return {snapshots, fetchedAt: now};
}
