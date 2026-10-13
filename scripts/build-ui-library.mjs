import {access, copyFile, mkdir, readFile, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libraryRoot = path.join(projectRoot, 'ui-library');
const generatedMarker = '<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->';
const sourceVerdicts = new Set(['推荐', '有条件', '不入库', '待读']);
const promptVerdicts = new Set(['推荐', '有条件']);
const categories = new Set(['设计系统', '交互动效', '可用性', '场景方案']);
const slugPattern = /^[a-z][a-z0-9-]*$/;

function ensure(condition, message) {
  if (!condition) throw new Error(`UI 仓库校验失败：${message}`);
}

function requireText(value, label) {
  ensure(typeof value === 'string' && value.trim().length > 0, `${label} 必须是非空文字`);
}

function requireList(value, label, minimum = 1) {
  ensure(Array.isArray(value) && value.length >= minimum, `${label} 至少需要 ${minimum} 项`);
  value.forEach((item, index) => requireText(item, `${label}[${index}]`));
  ensure(new Set(value).size === value.length, `${label} 不能含重复项`);
}

function requireScore(value, label) {
  ensure(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10, `${label} 必须在 0–10 之间`);
}

function canonicalUrl(value) {
  const url = new URL(value);
  ensure(url.protocol === 'https:' && !url.username && !url.password, `来源地址必须使用无凭据的 HTTPS：${value}`);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
  return url.href;
}

export function validateCatalog(catalog) {
  ensure(catalog && typeof catalog === 'object', '目录必须是对象');
  ensure(catalog.meta && typeof catalog.meta === 'object', '缺少 meta');
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(catalog.meta.reviewedAt), 'meta.reviewedAt 必须使用 YYYY-MM-DD');
  requireText(catalog.meta.summary, 'meta.summary');
  requireList(catalog.meta.methodology, 'meta.methodology');
  ensure(Array.isArray(catalog.sources) && catalog.sources.length > 0, 'sources 不能为空');
  ensure(Array.isArray(catalog.prompts) && catalog.prompts.length > 0, 'prompts 不能为空');

  const sourceMap = new Map();
  const uniqueUrls = new Set();
  const families = new Set();
  for (const source of catalog.sources) {
    ensure(source && slugPattern.test(source.id), `来源 id 必须是小写英文标识：${source?.id}`);
    ensure(!sourceMap.has(source.id), `来源 id 重复：${source.id}`);
    for (const key of ['title', 'url', 'type', 'author', 'reviewedAt', 'evidence', 'popularity', 'licenseOrReuse', 'sourceFamily']) {
      requireText(source[key], `${source.id}.${key}`);
    }
    ensure(/^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt), `${source.id} 的查证日期格式错误`);
    ensure(slugPattern.test(source.sourceFamily), `${source.id}.sourceFamily 必须是小写英文标识`);
    ensure(sourceVerdicts.has(source.verdict), `${source.id} 的评价分级无效`);
    requireScore(source.score, `${source.id}.score`);
    for (const key of ['strengths', 'limits', 'suitable', 'unsuitable']) requireList(source[key], `${source.id}.${key}`);
    if (source.evidenceStatus !== undefined) {
      ensure(['read', 'partial', 'search-only', 'blocked'].includes(source.evidenceStatus), `${source.id} 的阅读状态无效`);
      if (['search-only', 'blocked'].includes(source.evidenceStatus)) {
        ensure(['不入库', '待读'].includes(source.verdict), `${source.id} 未取得正文，不能直接推荐`);
      }
    }
    uniqueUrls.add(canonicalUrl(source.url));
    families.add(source.sourceFamily);
    sourceMap.set(source.id, source);
  }

  const promptIds = new Set();
  for (const prompt of catalog.prompts) {
    ensure(prompt && slugPattern.test(prompt.id), `提示词 id 必须是小写英文标识：${prompt?.id}`);
    ensure(!promptIds.has(prompt.id), `提示词 id 重复：${prompt.id}`);
    promptIds.add(prompt.id);
    for (const key of ['title', 'why', 'cost', 'prompt']) requireText(prompt[key], `${prompt.id}.${key}`);
    ensure(prompt.prompt.length >= 120, `${prompt.id} 的提示词缺少可实施细节`);
    ensure(categories.has(prompt.category), `${prompt.id} 的分类无效`);
    ensure(promptVerdicts.has(prompt.verdict), `${prompt.id} 不能将未推荐条目放入提示词库`);
    requireScore(prompt.score, `${prompt.id}.score`);
    ensure(prompt.score >= (prompt.verdict === '推荐' ? 8 : 7), `${prompt.id} 未达到本库相应收录门槛`);
    for (const key of ['tags', 'sourceIds', 'suitable', 'avoid']) requireList(prompt[key], `${prompt.id}.${key}`);
    requireList(prompt.acceptance, `${prompt.id}.acceptance`, 3);
    requireList(prompt.appliedTo, `${prompt.id}.appliedTo`, 0);
    for (const id of prompt.sourceIds) {
      const source = sourceMap.get(id);
      ensure(source, `${prompt.id} 引用了不存在的来源 ${id}`);
      ensure(['推荐', '有条件'].includes(source.verdict), `${prompt.id} 不得使用待读或不入库来源 ${id} 支持推荐`);
    }
    for (const filename of prompt.appliedTo) {
      ensure(!path.isAbsolute(filename) && !filename.includes('\\') && !filename.split('/').includes('..'), `${prompt.id} 的应用路径不安全：${filename}`);
      ensure(/^(src|ui-library)\/.+\.(jsx?|mjs|css|html)$/.test(filename), `${prompt.id} 的应用路径必须指向项目源文件：${filename}`);
    }
  }

  const readSources = catalog.sources.filter(source => ['read', 'partial'].includes(source.evidenceStatus));
  const statistics = {
    sourceCount:catalog.sources.length,
    uniqueURLCount:uniqueUrls.size,
    independentSourceCount:families.size,
    readSourceCount:readSources.length,
    readUniqueURLCount:new Set(readSources.map(source => canonicalUrl(source.url))).size,
    readSourceFamilyCount:new Set(readSources.map(source => source.sourceFamily)).size,
    promptCount:catalog.prompts.length,
    appliedPromptCount:catalog.prompts.filter(prompt => prompt.appliedTo.length > 0).length,
  };
  for (const [key, value] of Object.entries(statistics)) {
    ensure(catalog.meta[key] === value, `meta.${key} 为 ${catalog.meta[key]}，实际为 ${value}；请更新人工目录的统计`);
  }
  return {statistics, sourceMap};
}

function escapeLabel(value) {
  return value.replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function renderPrompt(prompt, sourceMap, reviewedAt) {
  const references = prompt.sourceIds.map(id => {
    const source = sourceMap.get(id);
    return `- [${escapeLabel(source.title)}](${source.url}) — ${source.author}；查证 ${source.reviewedAt}；${source.verdict}。`;
  });
  const applied = prompt.appliedTo.length
    ? prompt.appliedTo.map(filename => `- [${filename}](../../${filename})`).join('\n')
    : '当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。';
  return `${generatedMarker}\n\n# ${prompt.title}\n\n分类：${prompt.category} · 标签：${prompt.tags.join('、')} · ${prompt.verdict} · 主观评分：${prompt.score}/10 · 整理：${reviewedAt}\n\n${prompt.why}\n\n## 适用边界\n\n- 适合：${prompt.suitable.join('；')}。\n- 避免：${prompt.avoid.join('；')}。\n- 实现成本：${prompt.cost}。\n\n## 可复制提示词\n\n~~~~text\n${prompt.prompt}\n~~~~\n\n## 验收条件\n\n${prompt.acceptance.map(item => `- ${item}`).join('\n')}\n\n## 本项目应用\n\n${applied}\n${prompt.applicationScope ? `\n应用范围：${prompt.applicationScope}\n` : ''}\n## 参考来源\n\n${references.join('\n')}\n\n本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。\n`;
}

async function publishLibrary(catalog, sourceMap) {
  const promptRoot = path.join(libraryRoot, 'prompts');
  const outputRoot = path.join(projectRoot, 'public', 'ui-library');
  const manifestPath = path.join(promptRoot, '.generated.json');
  await mkdir(promptRoot, {recursive:true});
  await mkdir(outputRoot, {recursive:true});

  let previous = [];
  try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  ensure(Array.isArray(previous) && previous.every(name => /^[a-z][a-z0-9-]*\.md$/.test(name)), '生成文件清单格式错误');

  const current = catalog.prompts.map(prompt => `${prompt.id}.md`);
  // 只清理清单内且带本脚本标记的旧产物，保留人工文档和目录源数据。
  for (const filename of previous.filter(name => !current.includes(name))) {
    const target = path.resolve(promptRoot, filename);
    ensure(path.dirname(target) === promptRoot, '旧产物路径越过生成目录');
    try {
      const content = await readFile(target, 'utf8');
      ensure(content.startsWith(generatedMarker), `拒绝删除无生成标记的文件 ${filename}`);
      await unlink(target);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }

  for (const prompt of catalog.prompts) {
    const target = path.join(promptRoot, `${prompt.id}.md`);
    try {
      const existing = await readFile(target, 'utf8');
      ensure(existing.startsWith(generatedMarker), `拒绝覆盖人工提示词文件 ${prompt.id}.md`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(target, renderPrompt(prompt, sourceMap, catalog.meta.reviewedAt), 'utf8');
  }
  await writeFile(manifestPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  // 公共目录仅接收固定前端资源和已校验目录，不反向覆盖手工维护的源文件。
  for (const filename of ['index.html', 'library.css', 'library.js']) {
    await copyFile(path.join(libraryRoot, 'site', filename), path.join(outputRoot, filename));
  }
  await copyFile(path.join(libraryRoot, 'catalog.json'), path.join(outputRoot, 'catalog.json'));
}

export async function buildLibrary({checkOnly = false} = {}) {
  const catalog = JSON.parse(await readFile(path.join(libraryRoot, 'catalog.json'), 'utf8'));
  const {statistics, sourceMap} = validateCatalog(catalog);
  for (const filename of new Set(catalog.prompts.flatMap(prompt => prompt.appliedTo))) {
    try { await access(path.join(projectRoot, filename)); }
    catch { throw new Error(`UI 仓库校验失败：已应用文件不存在：${filename}`); }
  }
  if (!checkOnly) await publishLibrary(catalog, sourceMap);
  return statistics;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const checkOnly = process.argv.includes('--check');
    const statistics = await buildLibrary({checkOnly});
    console.log(`UI 仓库${checkOnly ? '校验' : '构建'}完成：${statistics.promptCount} 条提示词，${statistics.sourceCount} 条来源评审，${statistics.uniqueURLCount} 个唯一 URL，${statistics.independentSourceCount} 个同源作者／机构族。`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
