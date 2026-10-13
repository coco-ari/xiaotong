import {SCENE_ASSETS} from './scene-assets.mjs';

export const SCENE_LIMITS=Object.freeze({maxModules:8,maxRules:8,maxTemplates:3,maxTemplateChars:120,maxRenderedChars:28,maxLines:4});

const ASSET_IDS=new Set(SCENE_ASSETS.map(asset=>asset.id));
const OPS=new Set(['gt','lt','eq','gte','lte']);
const MODES=new Set(['local','demo','live']);
const IDENTIFIER=/^[a-z][a-z0-9-]{0,31}$/;
const FIELD=/^[a-zA-Z_][a-zA-Z0-9_]{0,47}$/;
const FORBIDDEN_FIELDS=new Set(['__proto__','prototype','constructor']);
const segmenter=new Intl.Segmenter('zh-CN',{granularity:'grapheme'});
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
const moneyFormatter=new Intl.NumberFormat('zh-CN',{useGrouping:false,minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:'always'});
const absMoneyFormatter=new Intl.NumberFormat('zh-CN',{useGrouping:false,minimumFractionDigits:2,maximumFractionDigits:2});
const integerFormatter=new Intl.NumberFormat('zh-CN',{useGrouping:false,maximumFractionDigits:0});

export function countCharacters(value){return [...segmenter.segment(String(value??''))].length;}

function fail(message){throw new Error(message);}
function record(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function keys(value,allowed,label){
 if(!record(value))fail(label+'必须是对象');
 if(Object.keys(value).some(key=>!allowed.includes(key)))fail(label+'包含不支持的字段');
}
function integer(value,min,max,label){
 if(!Number.isInteger(value)||value<min||value>max)fail(label+'必须为 '+min+'–'+max+' 的整数');
 return value;
}
function shortText(value,label){
 if(typeof value!=='string'||!value.trim()||countCharacters(value)>48||/[\r\n\u0000-\u001f]/.test(value))fail(label+'必须是 1–48 字的单行文本');
 return value.trim();
}
function identifier(value,label){
 if(typeof value!=='string'||!IDENTIFIER.test(value))fail(label+'须以小写字母开头，仅含小写字母、数字和短横线，最多 32 字符');
 return value;
}
function fieldName(value){return typeof value==='string'&&FIELD.test(value)&&!FORBIDDEN_FIELDS.has(value);}
function templates(value,label){
 if(!Array.isArray(value)||value.length<1||value.length>SCENE_LIMITS.maxTemplates)fail(label+'需要 1–3 条文案');
 return value.map((template,index)=>{
  const name=label+'第 '+(index+1)+' 条';
  if(typeof template!=='string'||!template.trim())fail(name+'不能为空');
  const normalized=template.replace(/\r\n?/g,'\n').trim();
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalized))fail(name+'包含不可见控制字符');
  if(countCharacters(normalized)>SCENE_LIMITS.maxTemplateChars)fail(name+'最多 120 字');
  if(normalized.split('\n').filter(line=>line.trim()).length>SCENE_LIMITS.maxLines)fail(name+'最多 4 行非空文案');
  if(/\{\{|\}\}/.test(normalized.replace(/\{\{.*?\}\}/g,'')))fail(name+'的模板变量缺少成对双花括号');
  for(const match of normalized.matchAll(/\{\{(.*?)\}\}/g)){
   const [field,format,...rest]=match[1].trim().split(':').map(part=>part.trim());
   if(!fieldName(field)||rest.length||(format!==undefined&&!['money','absMoney','integer'].includes(format)))fail(name+'包含不支持的模板变量');
  }
  return normalized;
 });
}
function variant(value,label,isFallback=false){
 keys(value,isFallback?['id','label','characterId','backgroundId','templates']:['id','label','when','characterId','backgroundId','templates'],label);
 const id=identifier(value.id,label+'标识');
 if(isFallback?id!=='fallback':id==='fallback')fail(label+'标识无效，fallback 仅用于默认场景');
 if(!ASSET_IDS.has(value.characterId)||!ASSET_IDS.has(value.backgroundId))fail(label+'的人物或背景不存在');
 const next={id,label:shortText(value.label,label+'名称'),characterId:value.characterId,backgroundId:value.backgroundId,templates:templates(value.templates,label+'文案')};
 if(!isFallback){
  keys(value.when,['field','op','value'],label+'条件');
  const {field,op,value:expected}=value.when;
  if(!fieldName(field))fail(label+'条件字段无效');
  if(!OPS.has(op))fail(label+'比较方式无效');
  if(!['number','string','boolean'].includes(typeof expected)||(typeof expected==='number'&&!Number.isFinite(expected)))fail(label+'比较值必须是有限数字、文本或布尔值');
  if(op!=='eq'&&typeof expected!=='number')fail(label+'的大小比较必须使用数字');
  if(typeof expected==='string'&&countCharacters(expected)>96)fail(label+'比较文本最多 96 字');
  next.when={field,op,value:expected};
 }
 return next;
}

// 配置在浏览器和服务器共同校验，避免非法规则绕过界面直接写入。
export function validatePresentation(value){
 keys(value,['intervalSeconds','modules'],'场景设置');
 const intervalSeconds=integer(value.intervalSeconds,4,60,'轮换间隔');
 if(!Array.isArray(value.modules)||value.modules.length>SCENE_LIMITS.maxModules)fail('场景模块最多 8 个');
 const moduleIds=new Set();
 const modules=value.modules.map((module,index)=>{
  const label='第 '+(index+1)+' 个模块';
  keys(module,['id','name','enabled','source','plugin','maxAgeSeconds','rules','fallback'],label);
  const id=identifier(module.id,label+'标识');
  if(moduleIds.has(id))fail('模块标识不能重复：'+id);
  moduleIds.add(id);
  if(typeof module.enabled!=='boolean')fail(label+'的启用状态必须是布尔值');
  if(module.plugin!==null&&!['finance','feed'].includes(module.plugin))fail(label+'关联插件无效');
  if(!Array.isArray(module.rules)||module.rules.length>SCENE_LIMITS.maxRules)fail(label+'最多 8 条规则');
  const ruleIds=new Set();
  const rules=module.rules.map((rule,ruleIndex)=>{
   const next=variant(rule,label+'第 '+(ruleIndex+1)+' 条规则');
   if(ruleIds.has(next.id))fail(label+'规则标识不能重复：'+next.id);
   ruleIds.add(next.id);
   return next;
  });
  return {id,name:shortText(module.name,label+'名称'),enabled:module.enabled,source:identifier(module.source,label+'数据源'),plugin:module.plugin,maxAgeSeconds:integer(module.maxAgeSeconds,60,86400,label+'数据有效期'),rules,fallback:variant(module.fallback,label+'默认场景',true)};
 });
 return {intervalSeconds,modules};
}

function deepFreeze(value){
 Object.freeze(value);
 for(const item of Object.values(value))if(item&&typeof item==='object'&&!Object.isFrozen(item))deepFreeze(item);
 return value;
}

export const DEFAULT_PRESENTATION=deepFreeze(validatePresentation({intervalSeconds:8,modules:[
 {id:'daily',name:'日常问候',enabled:true,source:'daily',plugin:null,maxAgeSeconds:3600,rules:[
  {id:'late-night',label:'夜间陪伴',when:{field:'hour',op:'gte',value:22},characterId:'sleepy',backgroundId:'sleepy',templates:['夜深了，慢慢收尾吧。\n今晚也辛苦啦。']},
  {id:'early-morning',label:'深夜晚安',when:{field:'hour',op:'lt',value:6},characterId:'sleepy',backgroundId:'sleepy',templates:['把今天的心事放下。\n好好睡一觉吧。']}
 ],fallback:{id:'fallback',label:'日常问候',characterId:'greeting',backgroundId:'greeting',templates:['给忙碌的今天，\n留一点自己的时间。','茶已经泡好了。\n今天也一起慢慢来。']}},
 {id:'finance',name:'理财收益',enabled:true,source:'finance',plugin:'finance',maxAgeSeconds:3600,rules:[
  {id:'profit',label:'今日盈利',when:{field:'todayProfit',op:'gt',value:0},characterId:'happy',backgroundId:'happy',templates:['今天赚了 {{todayProfit:absMoney}} 元。\n为这份小收获开心一下。','今日收益 {{todayProfit:money}} 元。\n好消息，想先告诉你。']},
  {id:'loss',label:'今日亏损',when:{field:'todayProfit',op:'lt',value:0},characterId:'sad',backgroundId:'sad',templates:['今日收益 {{todayProfit:money}} 元。\n别着急，我陪你慢慢看。']},
  {id:'flat',label:'今日持平',when:{field:'todayProfit',op:'eq',value:0},characterId:'greeting',backgroundId:'greeting',templates:['今日收益 {{todayProfit:money}} 元。\n平稳的一天，也很珍贵。']}
 ],fallback:{id:'fallback',label:'等待收益',characterId:'reading',backgroundId:'reading',templates:['收益还在路上。\n稍后再来看看。']}},
 {id:'feed',name:'关注资讯',enabled:true,source:'feed',plugin:'feed',maxAgeSeconds:3600,rules:[
  {id:'updates',label:'发现新内容',when:{field:'newItems',op:'gt',value:0},characterId:'excited',backgroundId:'excited',templates:['发现 {{newItems:integer}} 条新内容。\n一起看看今天的新鲜事。']},
  {id:'quiet',label:'安静阅读',when:{field:'newItems',op:'eq',value:0},characterId:'reading',backgroundId:'reading',templates:['今天还没有新的内容。\n翻翻收藏，也会有新发现。']}
 ],fallback:{id:'fallback',label:'等待资讯',characterId:'reading',backgroundId:'reading',templates:['内容正在路上。\n先陪你安静读一会儿。']}}
]}));

function ownValue(values,field){
 if(!record(values)||!fieldName(field)||!Object.hasOwn(values,field))return undefined;
 const value=values[field];
 if(typeof value==='number')return Number.isFinite(value)?value:undefined;
 return typeof value==='string'||typeof value==='boolean'?value:undefined;
}

// 模板只替换自身字段，不执行表达式，不返回可执行的 HTML。
export function renderSceneText(template,values={}){
 const expanded=String(template??'').replace(/\{\{(.*?)\}\}/g,(_,token)=>{
  const [field,format,...rest]=token.trim().split(':').map(part=>part.trim());
  const value=ownValue(values,field);
  if(value===undefined||rest.length)return '—';
  if(!format)return String(value);
  if(typeof value!=='number')return '—';
  if(format==='money')return moneyFormatter.format(value);
  if(format==='absMoney')return absMoneyFormatter.format(Math.abs(value));
  if(format==='integer')return integerFormatter.format(value);
  return '—';
 });
 const allLines=expanded.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').split('\n').map(line=>line.trim()).filter(Boolean);
 const lines=allLines.slice(0,SCENE_LIMITS.maxLines);
 const characters=[...segmenter.segment(lines.join('\n'))].map(part=>part.segment);
 const clipped=characters.length>SCENE_LIMITS.maxRenderedChars||allLines.length>SCENE_LIMITS.maxLines;
 if(!clipped)return characters.join('');
 return characters.slice(0,SCENE_LIMITS.maxRenderedChars-1).join('').trimEnd()+'…';
}

function sameShanghaiDay(left,right){return dayFormatter.format(left)===dayFormatter.format(right);}
function readySnapshot(snapshot,module,now){
 const time=snapshot?.asOf??snapshot?.updatedAt;
 return record(snapshot)&&snapshot.status==='ready'&&record(snapshot.values)&&Number.isFinite(time)&&time<=now&&now-time<=module.maxAgeSeconds*1000&&sameShanghaiDay(time,now);
}
function matches(when,values){
 const actual=ownValue(values,when.field);
 if(actual===undefined||typeof actual!==typeof when.value)return false;
 if(when.op==='eq')return actual===when.value;
 if(typeof actual!=='number')return false;
 if(when.op==='gt')return actual>when.value;
 if(when.op==='lt')return actual<when.value;
 if(when.op==='gte')return actual>=when.value;
 if(when.op==='lte')return actual<=when.value;
 return false;
}

export function buildSceneQueue(presentation,snapshots={},options={}){
 const config=validatePresentation(presentation);
 const now=options.now instanceof Date?options.now.getTime():options.now??Date.now();
 if(!Number.isFinite(now)||Math.abs(now)>8.64e15)fail('场景时间无效');
 const queue=[];
 for(const module of config.modules){
  if(!module.enabled||(module.plugin&&options.plugins?.[module.plugin]===false))continue;
  const snapshot=Object.hasOwn(snapshots??{},module.source)?snapshots[module.source]:undefined;
  const validSnapshot=readySnapshot(snapshot,module,now);
  const ready=validSnapshot&&(module.rules.length===0||module.rules.some(rule=>typeof ownValue(snapshot.values,rule.when.field)===typeof rule.when.value));
  const selected=ready?module.rules.find(rule=>matches(rule.when,snapshot.values))??module.fallback:module.fallback;
  // 不将过期或失败的数据填入默认文案，避免把旧收益当成今日结果。
  const values=ready?snapshot.values:{};
  queue.push({id:module.id+':'+selected.id,moduleId:module.id,moduleName:module.name,ruleId:selected.id,label:selected.label,characterId:selected.characterId,backgroundId:selected.backgroundId,templates:selected.templates.map(template=>renderSceneText(template,values)),dataMode:MODES.has(snapshot?.mode)?snapshot.mode:'local',dataStatus:ready?'ready':'unavailable'});
 }
 if(queue.length)return queue;
 const safe=DEFAULT_PRESENTATION.modules[0];
 return [{id:'daily:fallback',moduleId:'daily',moduleName:safe.name,ruleId:'fallback',label:safe.fallback.label,characterId:'greeting',backgroundId:'greeting',templates:safe.fallback.templates.map(template=>renderSceneText(template)),dataMode:'local',dataStatus:'unavailable'}];
}
