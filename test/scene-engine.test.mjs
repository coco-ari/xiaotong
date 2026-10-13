import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PRESENTATION,SCENE_LIMITS,validatePresentation,buildSceneQueue,renderSceneText,countCharacters} from '../shared/scene-engine.mjs';

const NOW=Date.parse('2026-10-13T04:00:00Z');
const config=()=>structuredClone(DEFAULT_PRESENTATION);
const snapshot=(values,patch={})=>({status:'ready',updatedAt:NOW,mode:'live',values,...patch});
const finance=(value,patch={})=>buildSceneQueue(DEFAULT_PRESENTATION,{finance:snapshot({todayProfit:value},patch)},{now:NOW}).find(scene=>scene.moduleId==='finance');

test('理财规则严格区分盈利、亏损和零收益，文案来自当日接口数字',()=>{
 const positive=finance(128.5);
 assert.equal(positive.characterId,'happy');
 assert.equal(positive.backgroundId,'happy');
 assert.equal(positive.ruleId,'profit');
 assert.ok(positive.templates[0].includes('128.50'));
 assert.equal(positive.dataMode,'live');
 assert.equal(positive.dataStatus,'ready');
 const negative=finance(-26.8);
 assert.equal(negative.characterId,'sad');
 assert.ok(negative.templates[0].includes('-26.80'));
 assert.equal(finance(0).ruleId,'flat');
 assert.equal(finance(-0).ruleId,'flat');
 assert.equal(finance(3).id,finance(300).id);
});

test('缺值、空值、数字字符串和非有限值不会被误认成持平或盈利',()=>{
 for(const value of [undefined,null,'0','32',NaN,Infinity,-Infinity,false,{},[]]){
  const scene=finance(value);
  assert.equal(scene.ruleId,'fallback',String(value));
  assert.equal(scene.characterId,'reading');
  assert.equal(scene.dataStatus,'unavailable');
  assert.equal(scene.templates[0],'收益还在路上。\n稍后再来看看。');
 }
});

test('接口失败、过期、未来时间和前一日数据均使用默认场景',()=>{
 for(const patch of [{status:'error'},{updatedAt:NOW-3600001},{updatedAt:NOW+1},{updatedAt:NaN},{updatedAt:'2026-10-13'}]){
  assert.equal(finance(10,patch).ruleId,'fallback');
  assert.equal(finance(10,patch).dataStatus,'unavailable');
 }
 assert.equal(finance(10,{updatedAt:NOW-3600000}).ruleId,'profit');
 const nextDay=Date.parse('2026-10-13T16:00:01Z');
 const yesterday=Date.parse('2026-10-13T15:59:59Z');
 const scene=buildSceneQueue(DEFAULT_PRESENTATION,{finance:snapshot({todayProfit:10},{updatedAt:yesterday})},{now:nextDay}).find(item=>item.moduleId==='finance');
 assert.equal(scene.ruleId,'fallback');
 assert.equal(scene.dataStatus,'unavailable');
});

test('上海日期边界与 UTC 日期边界分开判断',()=>{
 const now=Date.parse('2026-10-13T00:05:00Z');
 const earlier=Date.parse('2026-10-12T23:55:00Z');
 const scene=buildSceneQueue(DEFAULT_PRESENTATION,{finance:snapshot({todayProfit:10},{updatedAt:earlier})},{now}).find(item=>item.moduleId==='finance');
 assert.equal(scene.ruleId,'profit');
});

test('日常白天有效默认问候，夜间与清晨显示晚安人物',()=>{
 for(const [hour,expected] of [[0,'early-morning'],[5,'early-morning'],[6,'fallback'],[21,'fallback'],[22,'late-night'],[23,'late-night']]){
  const scene=buildSceneQueue(DEFAULT_PRESENTATION,{daily:snapshot({hour},{mode:'local'})},{now:NOW})[0];
  assert.equal(scene.ruleId,expected);
  assert.equal(scene.dataStatus,'ready');
 }
});

test('每个启用模块只选第一个命中规则，保持模块顺序并允许人物背景独立组合',()=>{
 const value=config();
 value.modules[1].rules.unshift({id:'large-profit',label:'惊喜收益',when:{field:'todayProfit',op:'gte',value:100},characterId:'excited',backgroundId:'happy',templates:['{{todayProfit:money}} 元，真开心。']});
 const queue=buildSceneQueue(value,{finance:snapshot({todayProfit:200})},{now:NOW});
 assert.deepEqual(queue.map(item=>item.moduleId),['daily','finance','feed']);
 assert.equal(queue[1].ruleId,'large-profit');
 assert.equal(queue[1].characterId,'excited');
 assert.equal(queue[1].backgroundId,'happy');
 assert.equal(queue[1].templates[0],'+200.00 元，真开心。');
});

test('新增模块通过独立数据源和规则接入，无需改写引擎',()=>{
 const value=config();
 value.modules.push({id:'health',name:'每日步数',enabled:true,source:'steps-api',plugin:null,maxAgeSeconds:3600,rules:[{id:'target-met',label:'完成目标',when:{field:'steps',op:'gte',value:8000},characterId:'excited',backgroundId:'greeting',templates:['今天走了 {{steps:integer}} 步。\n目标完成啦。']}],fallback:{id:'fallback',label:'等待同步',characterId:'reading',backgroundId:'reading',templates:['步数还没有同步。']}});
 const scene=buildSceneQueue(value,{'steps-api':snapshot({steps:9038})},{now:NOW}).at(-1);
 assert.equal(scene.id,'health:target-met');
 assert.equal(scene.templates[0],'今天走了 9038 步。\n目标完成啦。');
});

test('字符串和布尔等值规则保持类型，原型链属性不能作为接口数据',()=>{
 const value=config();
 const target=value.modules[0];
 target.rules=[{id:'complete',label:'已完成',when:{field:'complete',op:'eq',value:true},characterId:'happy',backgroundId:'happy',templates:['完成啦。']}];
 for(const actual of ['true',1,null])assert.equal(buildSceneQueue(value,{daily:snapshot({complete:actual})},{now:NOW})[0].ruleId,'fallback');
 assert.equal(buildSceneQueue(value,{daily:snapshot({complete:true})},{now:NOW})[0].ruleId,'complete');
 assert.equal(buildSceneQueue(value,{daily:snapshot(Object.create({complete:true}))},{now:NOW})[0].ruleId,'fallback');
 target.rules[0].when={field:'state',op:'eq',value:'完成'};
 assert.equal(buildSceneQueue(value,{daily:snapshot({state:'完成'})},{now:NOW})[0].ruleId,'complete');
});

test('关闭插件或模块会移出轮播，空队列仍提供安全问候',()=>{
 const value=config();
 value.modules[0].enabled=false;
 assert.deepEqual(buildSceneQueue(value,{}, {now:NOW,plugins:{finance:false,feed:true}}).map(scene=>scene.moduleId),['feed']);
 const empty=buildSceneQueue(value,{}, {now:NOW,plugins:{finance:false,feed:false}});
 assert.equal(empty.length,1);
 assert.equal(empty[0].characterId,'greeting');
 assert.equal(empty[0].dataStatus,'unavailable');
 assert.equal(buildSceneQueue({intervalSeconds:8,modules:[]},{},{now:NOW})[0].id,'daily:fallback');
});

test('模板支持正负金额、绝对金额、整数与缺值占位，不执行表达式',()=>{
 assert.equal(renderSceneText('{{value:money}} / {{value:absMoney}}',{value:-3.5}),'-3.50 / 3.50');
 assert.equal(renderSceneText('{{value:money}}',{value:3.5}),'+3.50');
 assert.equal(renderSceneText('{{value:integer}}',{value:8.8}),'9');
 assert.equal(renderSceneText('{{value}} / {{missing}}',{value:false}),'false / —');
 assert.equal(renderSceneText('{{value:money}}',{value:'3.50'}),'—');
 assert.equal(renderSceneText('{{constructor}} / {{globalThis.alert(1)}}',{}),'— / —');
 assert.equal(renderSceneText('{{message}}',{message:'<b>你好</b>'}),'<b>你好</b>');
});

test('渲染最多 28 个 Unicode 字素与 4 行，emoji 不会被切开',()=>{
 const family='👨‍👩‍👧‍👦';
 assert.equal(countCharacters(family),1);
 assert.equal(countCharacters('e\u0301'),1);
 const result=renderSceneText('{{text}}',{text:family.repeat(80)});
 assert.equal(countCharacters(result),SCENE_LIMITS.maxRenderedChars);
 assert.equal(result,family.repeat(SCENE_LIMITS.maxRenderedChars-1)+'…');
 assert.equal(renderSceneText('甲\n乙\n丙\n丁\n戊'),'甲\n乙\n丙\n丁…');
 assert.equal(renderSceneText('甲\n\n乙\r\n丙\n丁'),'甲\n乙\n丙\n丁');
 assert.ok(countCharacters(renderSceneText('甲'.repeat(120)))<=SCENE_LIMITS.maxRenderedChars);
});

test('失败和过期数据不会被填入默认文案',()=>{
 const value=config();
 value.modules[1].fallback.templates=['等待 {{todayProfit:money}}'];
 const scene=buildSceneQueue(value,{finance:snapshot({todayProfit:100},{status:'error'})},{now:NOW})[1];
 assert.equal(scene.templates[0],'等待 —');
});

test('配置校验返回独立完整对象，默认配置保持不可变',()=>{
 const original=config();
 const result=validatePresentation(original);
 assert.deepEqual(result,original);
 result.modules[0].fallback.templates[0]='修改后';
 assert.notEqual(original.modules[0].fallback.templates[0],'修改后');
 assert.ok(Object.isFrozen(DEFAULT_PRESENTATION.modules[0].fallback.templates));
 assert.equal(validatePresentation({...config(),intervalSeconds:4}).intervalSeconds,4);
 assert.equal(validatePresentation({...config(),intervalSeconds:60}).intervalSeconds,60);
});

test('配置校验阻止非法类型、重复标识、未知资产和不安全字段',()=>{
 const cases=[
  value=>{value.intervalSeconds='8';},
  value=>{value.intervalSeconds=3;},
  value=>{value.intervalSeconds=61;},
  value=>{value.unknown=true;},
  value=>{value.modules[0].enabled='true';},
  value=>{value.modules[0].source='../bad';},
  value=>{value.modules[0].plugin='unknown';},
  value=>{value.modules[0].maxAgeSeconds=59;},
  value=>{value.modules[0].fallback.characterId='missing';},
  value=>{value.modules[0].rules[0].when.field='__proto__';},
  value=>{value.modules[0].rules[0].when.value=null;},
  value=>{value.modules[0].rules[0].when.value='22';},
  value=>{value.modules[0].rules[0].when.value=Infinity;},
  value=>{value.modules[0].rules[0].when.op='script';},
  value=>{value.modules[0].rules[0].id='fallback';},
  value=>{value.modules[0].fallback.id='other';},
  value=>{value.modules.push(structuredClone(value.modules[0]));},
  value=>{value.modules[0].rules.push(structuredClone(value.modules[0].rules[0]));},
  value=>{value.modules[0].fallback.templates=['{{value:execute}}'];},
  value=>{value.modules[0].fallback.templates=['{{value:}}'];},
  value=>{value.modules[0].fallback.templates=['金额 {{value'];},
  value=>{value.modules[0].fallback.templates=['金额 value}}'];}
 ];
 for(const mutate of cases){const value=config();mutate(value);assert.throws(()=>validatePresentation(value),Error);}
});

test('配置校验限制模块、规则、模板数量及模板字素与行数',()=>{
 const cases=[
  value=>{value.modules=Array.from({length:9},(_,index)=>({...structuredClone(value.modules[0]),id:'module-'+index}));},
  value=>{value.modules[0].rules=Array.from({length:9},(_,index)=>({...structuredClone(value.modules[0].rules[0]),id:'rule-'+index}));},
  value=>{value.modules[0].fallback.templates=['甲','乙','丙','丁'];},
  value=>{value.modules[0].fallback.templates=[];},
  value=>{value.modules[0].fallback.templates=['  '];},
  value=>{value.modules[0].fallback.templates=['甲'.repeat(121)];},
  value=>{value.modules[0].fallback.templates=['甲\n乙\n丙\n丁\n戊'];}
 ];
 for(const mutate of cases){const value=config();mutate(value);assert.throws(()=>validatePresentation(value),Error);}
 const valid=config();
 valid.modules[0].fallback.templates=['👨‍👩‍👧‍👦'.repeat(120),'甲\n\n乙\n丙\n丁'];
 assert.equal(validatePresentation(valid).modules[0].fallback.templates.length,2);
});
