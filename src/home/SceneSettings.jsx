import React, {useEffect, useMemo, useRef, useState} from 'react';
import {DEFAULT_PRESENTATION, SCENE_LIMITS, validatePresentation, countCharacters, renderSceneText, buildSceneQueue} from '../../shared/scene-engine.mjs';
import {MOODS} from './moods.mjs';
import {SCENES} from './scenes.mjs';
import {characterArt} from './art.js';
import './scene-settings.css';

const copy = value => JSON.parse(JSON.stringify(value));
const assetNames = {greeting: '汽水晴日', happy: '收获时刻', sad: '雨窗陪伴', excited: '心动来信', reading: '午后书页', sleepy: '月灯晚安'};
const operators = [['gt', '大于'], ['lt', '小于'], ['eq', '等于'], ['gte', '大于或等于'], ['lte', '小于或等于']];
const statusNames = {ready: '数据可用', missing: '尚未接入', stale: '数据已过期', error: '获取失败', invalid: '数据无效'};
const modeNames = {demo: '演示数据', live: '接口数据', local: '本地数据'};
const newId = prefix => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
const replaceAt = (items, index, next) => items.map((item, i) => i === index ? next : item);
function reordered(items, index, step) {
  const result = [...items];
  [result[index], result[index + step]] = [result[index + step], result[index]];
  return result;
}

function AssetPreview({characterId, backgroundId, text, name}) {
  const mood = MOODS.find(item => item.id === characterId) || MOODS[0];
  const background = SCENES[backgroundId] || SCENES.greeting;
  return <div className="scene-setting-preview" data-tone={background.tone} role="img" aria-label={`${name}：${mood.label}，${assetNames[backgroundId] || '日系插画背景'}。${text || '暂无文案'}`}>
    <img className="scene-setting-background" src={characterArt(background.background)} alt="" loading="lazy"/>
    <div className="scene-setting-shade"/>
    <p className="scene-setting-preview-text" aria-hidden="true" data-length={countCharacters(text) > 16 ? 'long' : 'short'}>{text || '填写文案，\n预览此刻。'}</p>
    <img className="scene-setting-character" src={characterArt(mood.file)} alt="" loading="lazy"/>
  </div>;
}

function StateEditor({state, onChange, values, fallback = false}) {
  const templates = state.templates || [''];
  const [previewIndex, setPreviewIndex] = useState(0);
  const currentIndex = Math.min(previewIndex, templates.length - 1);
  let rendered = '';
  try { rendered = renderSceneText(templates[currentIndex] || '', values || {}); } catch { rendered = '请检查模板格式'; }
  const field = state.when?.field || 'todayProfit';
  const updateWhen = next => onChange({...state, when: {...state.when, ...next}});
  const valueType = typeof state.when?.value;
  return <div className="scene-state-editor">
    <label className="scene-field">状态名称<input value={state.label} onChange={event => onChange({...state, label: event.target.value})} maxLength={48}/></label>
    {!fallback && <fieldset className="scene-condition"><legend>当数据满足</legend>
      <label className="scene-field">数据字段<input value={state.when.field} onChange={event => updateWhen({field: event.target.value})} placeholder="todayProfit" autoCapitalize="none" spellCheck={false}/></label>
      <label className="scene-field">比较方式<select value={state.when.op} onChange={event => updateWhen({op: event.target.value})}>{operators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="scene-field">值的类型<select value={valueType} onChange={event => updateWhen({value: event.target.value === 'number' ? 0 : event.target.value === 'boolean' ? true : '', ...(event.target.value === 'number' ? {} : {op: 'eq'})})}><option value="number">数值</option><option value="string">文字</option><option value="boolean">是 / 否</option></select></label>
      <label className="scene-field">{valueType === 'number' ? '比较数值' : '比较内容'}{valueType === 'boolean' ? <select value={String(state.when.value)} onChange={event => updateWhen({value: event.target.value === 'true'})}><option value="true">是（true）</option><option value="false">否（false）</option></select> : <input type={valueType === 'number' ? 'number' : 'text'} step={valueType === 'number' ? 'any' : undefined} value={state.when.value} onChange={event => updateWhen({value: valueType === 'number' ? Number(event.target.value) : event.target.value})}/>}</label>
      <p className="scene-help">字段名对应接口数据，例如收益用 todayProfit，资讯条数用 newItems。</p>
    </fieldset>}
    <div className="scene-field-pair">
      <label className="scene-field">人物形象<select value={state.characterId} onChange={event => onChange({...state, characterId: event.target.value})}>{MOODS.map(mood => <option key={mood.id} value={mood.id}>{mood.label}</option>)}</select></label>
      <label className="scene-field">场景背景<select value={state.backgroundId} onChange={event => onChange({...state, backgroundId: event.target.value})}>{MOODS.map(mood => <option key={mood.id} value={mood.id}>{assetNames[mood.id] || mood.label + '的背景'}</option>)}</select></label>
    </div>
    <fieldset className="scene-templates"><legend>左侧文案 <small>{templates.length} / {SCENE_LIMITS.maxTemplates} 套</small></legend>
      <p className="scene-help">再次轮到本模块时，依次使用这些文案。手动换行最多 {SCENE_LIMITS.maxLines} 行；首页按字数排版，展开后最多显示 {SCENE_LIMITS.maxRenderedChars} 字，超出部分会省略。建议精简到 {SCENE_LIMITS.maxRenderedChars} 字以内。</p>
      {templates.map((template, index) => {
        const length = countCharacters(template);
        const lineCount = template.split('\n').length;
        const invalid = length > SCENE_LIMITS.maxTemplateChars || lineCount > SCENE_LIMITS.maxLines;
        return <div className="scene-template" key={index}>
          <label className="scene-field">文案 {index + 1}<textarea rows={3} value={template} aria-label={`文案 ${index + 1}`} aria-invalid={invalid || undefined} onFocus={() => setPreviewIndex(index)} onChange={event => onChange({...state, templates: replaceAt(templates, index, event.target.value)})} placeholder={fallback ? '稍等一下，\n新的消息就来。' : `今天的消息，\n{{${field}}}`}/></label>
          <div className="scene-template-meta"><span className={invalid ? 'scene-invalid' : ''}>{length} / {SCENE_LIMITS.maxTemplateChars} 字 · {lineCount} / {SCENE_LIMITS.maxLines} 行</span><button type="button" className="scene-text-button" disabled={templates.length === 1} aria-label={`删除文案 ${index + 1}`} onClick={() => onChange({...state, templates: templates.filter((_, i) => i !== index)})}>删除</button></div>
        </div>;
      })}
      <button type="button" className="scene-outline-button" disabled={templates.length >= SCENE_LIMITS.maxTemplates} onClick={() => {setPreviewIndex(templates.length); onChange({...state, templates: [...templates, '']});}}>＋ 添加一套文案</button>
    </fieldset>
    <details className="scene-variable-help"><summary>可用变量与写法</summary><p>将数据字段放在双大括号里，保存后会自动替换为当前数据。</p><dl><dt>{'{{todayProfit:money}}'}</dt><dd>带正负号的金额，例如 +368.24</dd><dt>{'{{todayProfit:absMoney}}'}</dt><dd>金额绝对值，例如 368.24</dd><dt>{'{{newItems:integer}}'}</dt><dd>整数，例如 3</dd><dt>{'{{字段名}}'}</dt><dd>自定义字段的文字或数值</dd></dl><p>没有数据时展示默认状态；不要在默认文案里依赖接口变量。</p></details>
    <div className="scene-preview-caption"><b>文案 {currentIndex + 1} 的内容预览</b><span>{countCharacters(rendered)} / {SCENE_LIMITS.maxRenderedChars} 字</span></div>
    <AssetPreview characterId={state.characterId} backgroundId={state.backgroundId} text={rendered} name={state.label}/>
  </div>;
}

export default function SceneSettings({presentation, snapshots = {}, plugins, onSave, busy = false, disabled = false}) {
  const incoming = presentation || DEFAULT_PRESENTATION;
  const incomingKey = JSON.stringify(incoming);
  const [draft, setDraft] = useState(() => copy(incoming));
  const [selectedId, setSelectedId] = useState(incoming.modules[0]?.id || '');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const savingRef = useRef(false);
  const lastIncoming = useRef(incomingKey);
  // 后台刷新仅更新未编辑的配置，用户正在输入的草稿始终保留。
  useEffect(() => {
    if (lastIncoming.current === incomingKey) return;
    lastIncoming.current = incomingKey;
    if (!dirty && !savingRef.current) setDraft(copy(incoming));
  }, [incomingKey, dirty]);
  const locked = busy || saving || disabled;
  const validationError = useMemo(() => {try {validatePresentation(draft); return '';} catch (error) {return error.message;}}, [draft]);
  const queue = useMemo(() => {if (validationError) return []; try {return buildSceneQueue(draft, snapshots, {plugins});} catch {return [];}}, [draft, snapshots, plugins, validationError]);
  const selected = draft.modules.find(module => module.id === selectedId) || draft.modules[0];
  const snapshot = selected ? snapshots[selected.source] : null;
  const matched = queue.find(scene => scene.moduleId === selected?.id);
  const sourceStatus = !snapshot ? 'missing' : snapshot.status === 'error' ? 'error' : Date.now() - (snapshot.asOf ?? snapshot.updatedAt) > selected.maxAgeSeconds * 1000 ? 'stale' : matched?.dataStatus === 'unavailable' ? 'invalid' : snapshot.status;
  const previewValues = sourceStatus === 'ready' ? snapshot?.values : {};
  const updateDraft = next => {setDraft(next); setDirty(true); setMessage(''); setSaveError('');};
  const updateModule = next => updateDraft({...draft, modules: draft.modules.map(module => module.id === selected.id ? next : module)});
  const discard = () => {setDraft(copy(incoming)); setDirty(false); setMessage('已恢复服务器保存的配置。'); setSaveError('');};
  const addModule = () => {
    const id = newId('module');
    updateDraft({...draft, modules: [...draft.modules, {id, name: '新模块', enabled: true, source: id, plugin: null, maxAgeSeconds: 3600, rules: [], fallback: {id: 'fallback', label: '等待数据', characterId: 'greeting', backgroundId: 'greeting', templates: ['新的消息，\n正在路上。']}}]});
    setSelectedId(id);
  };
  const save = async () => {
    if (locked || savingRef.current) return;
    let payload;
    try {payload = validatePresentation(draft);} catch (error) {setSaveError(error.message); return;}
    savingRef.current = true;
    setSaving(true); setMessage(''); setSaveError('');
    try {
      const accepted = await onSave({presentation: payload});
      if (accepted === false) setSaveError('保存未完成，请检查连接后重试。你的草稿已保留。');
      else {setDraft(copy(payload)); setDirty(false); setMessage('已保存，首页会按照新的模块顺序与规则展示。');}
    } catch (error) {setSaveError(error.message || '保存失败，请稍后重试。你的草稿已保留。');}
    finally {savingRef.current = false; setSaving(false);}
  };

  return <section className="scene-settings" aria-labelledby="scene-settings-title">
    <div className="scene-settings-heading"><h2 id="scene-settings-title">人物与模块场景</h2><span>{draft.modules.length} / {SCENE_LIMITS.maxModules} 个模块</span></div>
    <p className="scene-settings-intro">每个模块根据自己的数据选择人物、背景和文案，再按下面的顺序轮换。</p>
    <fieldset className="scene-settings-fields" disabled={locked}>
      <legend className="scene-sr-only">首页人物展示配置</legend>
      <div className="scene-interval-row"><label className="scene-field">场景停留时间<div className="scene-number-unit"><input type="number" min={4} max={60} step={1} inputMode="numeric" value={draft.intervalSeconds} onChange={event => updateDraft({...draft, intervalSeconds: event.target.value === '' ? '' : Number(event.target.value)})}/><span>秒</span></div></label><p className="scene-help">可设 4–60 秒，默认 8 秒。切换动画完成后开始计时。</p></div>
      <div className="scene-subheading"><h3>模块顺序</h3><button type="button" className="scene-text-button" disabled={draft.modules.length >= SCENE_LIMITS.maxModules} onClick={addModule}>＋ 新增模块</button></div>
      <div className="scene-module-list">{draft.modules.map((module, index) => <div className={'scene-module-item ' + (selected?.id === module.id ? 'is-selected' : '')} key={module.id}>
        <button type="button" className="scene-module-select" aria-pressed={selected?.id === module.id} onClick={() => setSelectedId(module.id)}><span className="scene-module-number">{String(index + 1).padStart(2, '0')}</span><span><b>{module.name || '未命名模块'}</b><small>{module.enabled ? '参与轮换' : '已停用'}</small></span></button>
        <div className="scene-module-actions"><button type="button" className="scene-icon-button" disabled={index === 0} aria-label={`上移${module.name}`} onClick={() => updateDraft({...draft, modules: reordered(draft.modules, index, -1)})}>↑</button><button type="button" className="scene-icon-button" disabled={index === draft.modules.length - 1} aria-label={`下移${module.name}`} onClick={() => updateDraft({...draft, modules: reordered(draft.modules, index, 1)})}>↓</button></div>
      </div>)}</div>
      {selected && <div className="scene-module-editor" key={selected.id}>
        <div className="scene-subheading"><h3>编辑：{selected.name || '未命名模块'}</h3><label className="scene-check"><input type="checkbox" checked={selected.enabled} onChange={event => updateModule({...selected, enabled: event.target.checked})}/>启用</label></div>
        <label className="scene-field">模块名称<input value={selected.name} maxLength={48} onChange={event => updateModule({...selected, name: event.target.value})}/></label>
        <details className="scene-data-settings"><summary>数据与内容关联</summary><div className="scene-details-body">
          <label className="scene-field">数据源标识<input value={selected.source} onChange={event => updateModule({...selected, source: event.target.value})} autoCapitalize="none" spellCheck={false}/></label>
          <p className="scene-help">这是接入器的名称，如 finance、feed；填入标识后，还需由服务端接入对应数据。</p>
          <div className="scene-field-pair"><label className="scene-field">关联首页卡片<select value={selected.plugin || ''} onChange={event => updateModule({...selected, plugin: event.target.value || null})}><option value="">独立展示</option><option value="finance">收益卡片</option><option value="feed">资讯卡片</option></select></label><label className="scene-field">数据有效时间（秒）<input type="number" min={60} max={86400} step={1} value={selected.maxAgeSeconds} onChange={event => updateModule({...selected, maxAgeSeconds: event.target.value === '' ? '' : Number(event.target.value)})}/></label></div>
          <p className="scene-help">有效时间为 60–86400 秒。数据缺失、过期、获取失败时使用默认状态；关闭关联卡片后，该模块也不参与轮换。</p>
          <p className="scene-module-id">模块标识：{selected.id}</p>
        </div></details>
        <div className="scene-data-status" role="status"><span>{modeNames[snapshot?.mode] || '未接入数据'} · {statusNames[sourceStatus] || '检查数据'}</span><b>{!selected.enabled ? '此模块已停用' : selected.plugin && plugins?.[selected.plugin] === false ? '关联卡片已关闭，此模块不参与轮换' : matched ? `当前命中：${matched.label}` : validationError ? '修正配置后可预览命中结果' : '使用默认状态'}</b></div>
        <div className="scene-subheading"><h3>条件状态</h3><span>{selected.rules.length} / {SCENE_LIMITS.maxRules}</span></div>
        <p className="scene-help">从上到下检查，只展示第一条满足条件的状态。未命中时使用默认状态。</p>
        <div className="scene-rules">{selected.rules.map((rule, index) => <details className="scene-rule" key={rule.id}>
          <summary><span><b>{rule.label || `状态 ${index + 1}`}</b><small>{rule.when.field} {operators.find(([op]) => op === rule.when.op)?.[1]} {String(rule.when.value)}</small></span>{matched?.ruleId === rule.id && <span className="scene-match-badge">当前</span>}</summary>
          <div className="scene-rule-body"><div className="scene-rule-actions"><button type="button" className="scene-text-button" disabled={index === 0} onClick={() => updateModule({...selected, rules: reordered(selected.rules, index, -1)})}>↑ 上移</button><button type="button" className="scene-text-button" disabled={index === selected.rules.length - 1} onClick={() => updateModule({...selected, rules: reordered(selected.rules, index, 1)})}>↓ 下移</button><button type="button" className="scene-text-button scene-remove" onClick={() => updateModule({...selected, rules: selected.rules.filter(item => item.id !== rule.id)})}>删除状态</button></div>
            <StateEditor state={rule} values={previewValues} onChange={next => updateModule({...selected, rules: replaceAt(selected.rules, index, next)})}/>
          </div>
        </details>)}</div>
        <button type="button" className="scene-outline-button" disabled={selected.rules.length >= SCENE_LIMITS.maxRules} onClick={() => updateModule({...selected, rules: [...selected.rules, {id: newId('rule'), label: '新状态', when: {field: selected.plugin === 'feed' ? 'newItems' : 'todayProfit', op: 'gt', value: 0}, characterId: 'happy', backgroundId: 'happy', templates: [selected.plugin === 'feed' ? '发现 {{newItems:integer}} 条，\n新的喜欢。' : '今天赚了，\n{{todayProfit:absMoney}} 元。']}]})}>＋ 添加条件状态</button>
        <details className="scene-rule scene-fallback"><summary><span><b>默认状态 · {selected.fallback.label}</b><small>未命中条件或没有可用数据时展示</small></span>{matched?.ruleId === 'fallback' && <span className="scene-match-badge">当前</span>}</summary><div className="scene-rule-body"><StateEditor state={selected.fallback} values={previewValues} fallback onChange={next => updateModule({...selected, fallback: next})}/></div></details>
        <button type="button" className="scene-text-button scene-remove" disabled={draft.modules.length <= 1} onClick={() => {const remaining = draft.modules.filter(module => module.id !== selected.id); updateDraft({...draft, modules: remaining}); setSelectedId(remaining[0]?.id || '');}}>删除「{selected.name || '此模块'}」</button>
      </div>}
      <div className="scene-settings-save"><button type="button" className="scene-outline-button" disabled={!dirty} onClick={discard}>放弃修改</button><button type="button" className="personal-primary" disabled={!dirty || !!validationError} onClick={save}>{saving ? '保存中…' : '保存场景配置'}</button></div>
    </fieldset>
    {dirty && <p className="scene-help scene-unsaved">有尚未保存的修改。保存后首页才会应用。</p>}
    {(saveError || (dirty && validationError)) && <p className="scene-settings-error" role="alert">{saveError || validationError}</p>}
    {message && <p className="scene-settings-message" role="status">{message}</p>}
  </section>;
}
