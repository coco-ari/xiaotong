(() => {
  'use strict';

  const state = { prompts: [], sources: [], sourceMap: new Map(), category: 'all', verdict: 'all', query: '', sourceQuery: '', loaded: false };
  const byId = id => document.getElementById(id);
  let copyTimer = 0;

  const values = value => {
    if (Array.isArray(value)) return value.flatMap(values);
    if (value === null || value === undefined || value === false) return [];
    if (typeof value === 'object') return Object.entries(value).map(([key, entry]) => `${key}：${values(entry).join('；')}`);
    return String(value).trim() ? [String(value).trim()] : [];
  };
  const text = (value, fallback = '') => values(value).join('；') || fallback;
  const promptText = value => values(value).join('\n\n');
  const normalize = value => text(value).toLocaleLowerCase('zh-CN');
  const applied = prompt => values(prompt.appliedTo).length > 0;
  const verdictType = value => {
    const label = normalize(value);
    if (/有条件|慎用|条件|conditional|caution/.test(label)) return 'conditional';
    if (/不推荐|未推荐|淘汰|不采用|reject|not recommended/.test(label)) return 'other';
    if (/推荐|优秀|已采用|采用|精选|recommend|approved/.test(label)) return 'recommended';
    return 'other';
  };
  const element = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = text(content);
    return node;
  };
  const safeUrl = value => {
    try {
      const url = new URL(text(value));
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  };
  const externalLink = (label, url) => {
    const href = safeUrl(url);
    const link = element(href ? 'a' : 'span', '', label);
    if (href) {
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${text(label)}（在新标签页打开来源）`);
    }
    return link;
  };
  const scoreNode = score => {
    const raw = text(score);
    const number = Number.parseFloat(raw);
    const node = element('span', 'quality-score');
    if (Number.isFinite(number)) {
      const scale = /\/\s*100/.test(raw) || number > 10 ? 100 : 10;
      node.append(document.createTextNode(String(number)), element('small', '', `/${scale}`));
      node.setAttribute('aria-label', `主观适配评分 ${number} 分，满分 ${scale} 分`);
    } else {
      node.append(element('small', '', '未评分'));
    }
    return node;
  };
  const badge = (verdict, isApplied = false) => {
    const kind = isApplied ? 'applied' : verdictType(verdict);
    return element('span', `verdict-badge is-${kind}`, isApplied ? '本项目采用' : text(verdict, '待评价'));
  };
  const fact = (label, value, className = '') => {
    const row = element('div', className);
    row.append(element('dt', '', label), element('dd', '', value));
    return row;
  };
  const showCopyStatus = message => {
    const status = byId('copy-status');
    window.clearTimeout(copyTimer);
    status.textContent = message;
    status.hidden = false;
    copyTimer = window.setTimeout(() => { status.hidden = true; }, 4300);
  };

  async function copyPrompt(content, button, fallback) {
    button.disabled = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('剪贴板不可用');
      await navigator.clipboard.writeText(content);
      button.textContent = '已复制';
      fallback.hidden = true;
      showCopyStatus('完整提示词已复制，可以直接交给 AI 使用。');
      window.setTimeout(() => { button.textContent = '复制提示词'; }, 2200);
    } catch {
      fallback.hidden = false;
      const field = fallback.querySelector('textarea');
      field.value = content;
      field.focus();
      field.select();
      showCopyStatus('自动复制不可用。已选中完整提示词，可按 Ctrl / ⌘ + C 或长按复制。');
    } finally {
      button.disabled = false;
    }
  }

  function promptCard(prompt, index) {
    const card = element('article', 'prompt-card');
    const titleId = `prompt-title-${index}`;
    const top = element('div', 'card-topline');
    top.append(element('span', 'card-category', text(prompt.category, '未分类')), badge(prompt.verdict, applied(prompt)));
    const heading = element('div', 'card-title-row');
    const title = element('h3', '', text(prompt.title, '未命名提示词'));
    title.id = titleId;
    card.setAttribute('aria-labelledby', titleId);
    heading.append(title, scoreNode(prompt.score));
    card.append(top, heading);
    const tags = values(prompt.tags);
    if (tags.length) {
      const group = element('div', 'card-tags');
      tags.forEach(tag => group.append(element('span', '', tag)));
      card.append(group);
    }
    card.append(element('p', 'card-evaluation', text(prompt.why, '本条尚未填写具体评价理由。')));
    const facts = element('dl', 'card-facts');
    facts.append(fact('适合', text(prompt.suitable, '尚未标注适用场景')), fact('慎用', text(prompt.avoid, '未记录额外限制，仍需按实际场景判断')));
    if (values(prompt.cost).length) facts.append(fact('实现成本', text(prompt.cost)));
    card.append(facts);
    if (applied(prompt)) {
      card.append(element('p', 'applied-location', `已用于：${text(prompt.appliedTo)}`));
      if (prompt.applicationScope) card.append(element('p', 'applied-location', `采用范围：${text(prompt.applicationScope)}`));
    }

    const details = element('details', 'prompt-details');
    const summary = element('summary', '', '查看完整提示词');
    const body = element('div', 'prompt-content');
    const copyHeading = element('div', 'prompt-copy-heading');
    const button = element('button', 'copy-button', '复制提示词');
    button.type = 'button';
    button.setAttribute('aria-label', `复制「${text(prompt.title)}」完整提示词`);
    copyHeading.append(element('span', '', '原创整理 · 中文 · 可直接使用'), button);
    const content = promptText(prompt.prompt) || '本条尚未填写完整提示词。';
    const pre = element('pre', 'prompt-text', content);
    const fallback = element('div', 'copy-fallback');
    fallback.hidden = true;
    const fallbackId = `prompt-copy-${index}`;
    const fallbackLabel = element('label', '', '已选中下方文本，请手动复制：');
    fallbackLabel.htmlFor = fallbackId;
    const textarea = element('textarea');
    textarea.id = fallbackId;
    textarea.readOnly = true;
    textarea.setAttribute('aria-label', `「${text(prompt.title)}」完整提示词，可手动复制`);
    fallback.append(fallbackLabel, textarea);
    button.addEventListener('click', () => { void copyPrompt(content, button, fallback); });
    body.append(copyHeading, pre, fallback);
    const acceptance = values(prompt.acceptance);
    if (acceptance.length) {
      body.append(element('p', 'acceptance-title', '验收时，检查这些事'));
      const list = element('ul', 'acceptance-list');
      acceptance.forEach(item => list.append(element('li', '', item)));
      body.append(list);
    }
    details.append(summary, body);
    card.append(details);

    const references = element('div', 'card-source-list');
    references.append(element('span', '', '原始来源与查证时间'));
    const referenceList = element('div');
    const sourceIds = values(prompt.sourceIds);
    if (!sourceIds.length) referenceList.append(element('span', 'source-reference', '本项目原创方案；未关联外部来源。'));
    sourceIds.forEach(id => {
      const source = state.sourceMap.get(id);
      const row = element('span', 'source-reference');
      if (source) {
        row.append(externalLink(text(source.title, id), source.url), element('small', '', `查证 ${text(source.reviewedAt, '日期未记录')}`));
      } else {
        row.textContent = `来源 ${id}：记录暂缺`;
      }
      referenceList.append(row);
    });
    references.append(referenceList);
    card.append(references);
    return card;
  }

  function sourceCard(source) {
    const card = element('article', 'source-card');
    const introduction = element('div');
    const meta = element('div', 'source-meta-line');
    meta.append(element('span', '', text(source.type, '资料来源')), badge(source.verdict));
    const title = element('h3');
    title.append(externalLink(text(source.title, '未命名来源'), source.url));
    introduction.append(meta, title, element('p', 'source-author', `作者 / 维护者：${text(source.author, '未标注')}`), element('p', 'source-reviewed', `查证日期：${text(source.reviewedAt, '未记录')}`));
    const quality = element('div', 'source-quality');
    quality.append(scoreNode(source.verdict === '待读' || ['blocked', 'search-only'].includes(source.evidenceStatus) ? null : source.score), element('span', '', '主观适配评价'));
    introduction.append(quality);
    const facts = element('dl', 'source-facts');
    facts.append(fact('证据', text(source.evidence, '未记录可核实的直接证据'), 'evidence-fact'), fact('热度', text(source.popularity, '未查证到公开热度数据，不据此推断受欢迎程度。'), 'popularity-fact'), fact('评价', text(source.strengths, '未记录具体优点')), fact('边界', text(source.limits, '未记录使用限制，采用前需结合场景判断')), fact('适合', text(source.suitable, '未标注')));
    if (source.evidenceStatus) facts.prepend(fact('查证层级', ({read:'已读正文或标明的重点段落', partial:'部分阅读，范围见证据', 'search-only':'仅搜索摘要，未读正文', blocked:'访问受限，未读正文'})[source.evidenceStatus] || text(source.evidenceStatus)));
    if (values(source.unsuitable).length) facts.append(fact('不适合', source.unsuitable));
    if (source.licenseOrReuse) facts.append(fact('复用说明', text(source.licenseOrReuse)));
    card.append(introduction, facts);
    return card;
  }

  function renderPrompts() {
    const query = normalize(state.query);
    const filtered = state.prompts.filter(prompt => {
      if (state.category !== 'all' && !values(prompt.category).includes(state.category)) return false;
      if (state.verdict === 'applied' && !applied(prompt)) return false;
      if (['recommended', 'conditional'].includes(state.verdict) && verdictType(prompt.verdict) !== state.verdict) return false;
      const sourceWords = values(prompt.sourceIds).map(id => state.sourceMap.get(id)).filter(Boolean).map(source => [source.title, source.author, source.type]);
      return !query || normalize([prompt.title, prompt.category, prompt.tags, prompt.why, prompt.suitable, prompt.avoid, prompt.prompt, prompt.appliedTo, sourceWords]).includes(query);
    });
    const fragment = document.createDocumentFragment();
    filtered.forEach((prompt, index) => fragment.append(promptCard(prompt, index)));
    byId('prompt-list').replaceChildren(fragment);
    byId('result-count').textContent = `找到 ${filtered.length} 条提示词，共 ${state.prompts.length} 条`;
    byId('prompt-empty').hidden = filtered.length > 0;
    byId('clear-filters').hidden = state.category === 'all' && state.verdict === 'all' && !state.query;
  }

  function renderSources() {
    const query = normalize(state.sourceQuery);
    const filtered = state.sources.filter(source => !query || normalize([source.title, source.type, source.author, source.evidence, source.strengths, source.limits, source.suitable]).includes(query));
    const fragment = document.createDocumentFragment();
    filtered.forEach(source => fragment.append(sourceCard(source)));
    byId('source-list').replaceChildren(fragment);
    byId('source-result-count').textContent = `${filtered.length} 条来源评审记录，共 ${state.sources.length} 条`;
    byId('source-empty').hidden = filtered.length > 0;
  }

  function showView() {
    const sourceView = location.hash === '#sources';
    byId('prompts-panel').hidden = !state.loaded || sourceView;
    byId('sources-panel').hidden = !state.loaded || !sourceView;
    document.querySelectorAll('[data-view]').forEach(link => {
      if ((link.dataset.view === 'sources') === sourceView) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function resetFilters() {
    state.category = 'all';
    state.verdict = 'all';
    state.query = '';
    byId('prompt-search').value = '';
    document.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === 'all')));
    document.querySelectorAll('[data-verdict]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.verdict === 'all')));
    renderPrompts();
    byId('prompt-search').focus({ preventScroll: true });
  }

  async function loadCatalog() {
    byId('load-error').hidden = true;
    byId('loading-message').hidden = false;
    try {
      const response = await fetch('./catalog.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`资料文件读取失败（HTTP ${response.status}）`);
      const catalog = await response.json();
      if (!Array.isArray(catalog.prompts) || !Array.isArray(catalog.sources)) throw new Error('资料格式不完整，需要 prompts 和 sources 列表');
      state.prompts = catalog.prompts.filter(item => item && typeof item === 'object');
      state.sources = catalog.sources.filter(item => item && typeof item === 'object');
      state.sourceMap = new Map(state.sources.map(source => [text(source.id), source]));
      state.loaded = true;
      byId('stat-prompts').textContent = String(state.prompts.length).padStart(2, '0');
      byId('stat-recommended').textContent = String(state.prompts.filter(prompt => verdictType(prompt.verdict) === 'recommended').length).padStart(2, '0');
      byId('stat-applied').textContent = String(state.prompts.filter(applied).length).padStart(2, '0');
      byId('stat-sources').textContent = String(state.sources.length).padStart(2, '0');
      byId('nav-prompt-count').textContent = String(state.prompts.length);
      byId('nav-source-count').textContent = String(state.sources.length);
      byId('review-date').textContent = `最近整理：${text(catalog.meta?.reviewedAt, '未记录日期')} · 评价与原始来源一起保留`;
      byId('footer-reviewed').textContent = `资料更新于 ${text(catalog.meta?.reviewedAt, '未记录日期')}`;
      if (values(catalog.meta?.summary).length) byId('catalog-summary').textContent = text(catalog.meta.summary);
      renderPrompts();
      renderSources();
      showView();
    } catch (error) {
      state.loaded = false;
      byId('prompts-panel').hidden = true;
      byId('sources-panel').hidden = true;
      byId('load-error').hidden = false;
      const fileHint = location.protocol === 'file:' ? '请通过本地 HTTP 服务打开这个目录，浏览器不能直接从文件页面读取资料。' : '请确认同目录存在 catalog.json，稍后重试。';
      byId('load-error-detail').textContent = `${error.message}。${fileHint}`;
      byId('review-date').textContent = '资料尚未载入';
    } finally {
      byId('loading-message').hidden = true;
    }
  }

  byId('prompt-search').addEventListener('input', event => { state.query = event.target.value.trim(); renderPrompts(); });
  byId('source-search').addEventListener('input', event => { state.sourceQuery = event.target.value.trim(); renderSources(); });
  byId('category-filters').addEventListener('click', event => {
    const target = event.target.closest('button[data-category]');
    if (!target) return;
    state.category = target.dataset.category;
    byId('category-filters').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === target)));
    renderPrompts();
  });
  byId('verdict-filters').addEventListener('click', event => {
    const target = event.target.closest('button[data-verdict]');
    if (!target) return;
    state.verdict = target.dataset.verdict;
    byId('verdict-filters').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === target)));
    renderPrompts();
  });
  byId('clear-filters').addEventListener('click', resetFilters);
  byId('reset-empty').addEventListener('click', resetFilters);
  byId('reload-catalog').addEventListener('click', () => { void loadCatalog(); });
  window.addEventListener('hashchange', showView);
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !target.closest('input, textarea, select, [contenteditable="true"]')) {
      event.preventDefault();
      if (state.loaded) byId(location.hash === '#sources' ? 'source-search' : 'prompt-search').focus();
    }
  });
  const preview = document.querySelector('.preview-segments');
  const previewDescriptions = ['暖光停在茶杯边。选中底板轻移，文字与点击区域保持稳定。', '翻到喜欢的那一页。只让状态移动，内容保持清楚、安静。', '把今天轻轻放下。减少动态效果开启时，底板会直接就位。'];
  preview.addEventListener('click', event => {
    const target = event.target.closest('[data-preview-index]');
    if (!target) return;
    const index = Number(target.dataset.previewIndex);
    preview.dataset.preview = String(index);
    preview.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === target)));
    byId('preview-description').textContent = previewDescriptions[index];
    document.querySelector('.preview-number').textContent = `0${index + 1} / 03`;
  });

  showView();
  void loadCatalog();
})();
