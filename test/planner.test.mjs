import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {Store,dayAt} from '../server/model.mjs';
import {Reminders,quietNow} from '../server/reminders.mjs';
import {createApp} from '../server/index.mjs';
const at=s=>Date.parse(s+'+08:00');
function fixture(t,stamp='2026-10-12T10:00:00'){
  const dir=mkdtempSync(join(tmpdir(),'xiaobu-test-'));let now=at(stamp);
  const store=new Store(dir,{clock:()=>now});t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  return {store,dir,clock:()=>now,set:s=>now=typeof s==='number'?s:at(s)};
}
const task=(extra={})=>({title:'完成测试任务',day:'2026-10-12',reminder:'gentle',...extra});
test('每日任务：保存、版本冲突、状态、撤销、回收站与重启持久化',t=>{
  const {store,dir}=fixture(t);let one=store.create(task(),randomUUID());assert.equal(one.status,'todo');
  one=store.update(one.id,{status:'doing',progress:35},one.version);assert.equal(one.progress,35);
  assert.throws(()=>store.update(one.id,{title:'覆盖旧版本'},1),e=>e.status===409);
  one=store.update(one.id,{status:'done'},one.version);assert.equal(one.progress,100);assert.ok(one.completedAt);
  assert.equal(store.snapshot().stats.xp,10);
  one=store.update(one.id,{status:'doing',progress:35},one.version);assert.equal(one.status,'doing');assert.equal(one.completedAt,null);assert.equal(store.snapshot().stats.xp,0);
  store.remove(one.id,one.version);assert.equal(store.all().length,0);assert.equal(store.snapshot().trash.length,1);
  store.restore(one.id);const reopened=new Store(dir);assert.equal(reopened.get(one.id).title,'完成测试任务');reopened.close();
});
test('长期目标：节点增量、自动总进度、全部完成及取消节点',t=>{
  const {store}=fixture(t);let goal=store.create(task({kind:'goal',steps:[{id:'one',title:'第一个节点',progress:0},{id:'two',title:'第二个节点',progress:0}]}));
  goal=store.update(goal.id,{steps:goal.steps.map(s=>({...s,progress:s.id==='one'?100:50}))},goal.version);
  assert.equal(goal.progress,75);assert.equal(goal.status,'doing');assert.ok(goal.steps[0].completedAt);
  goal=store.update(goal.id,{status:'done'},goal.version);assert.equal(goal.progress,100);assert.ok(goal.steps.every(s=>s.done));
  goal=store.update(goal.id,{steps:goal.steps.map(s=>({...s,progress:s.id==='two'?0:100}))},goal.version);
  assert.equal(goal.status,'doing');assert.equal(goal.progress,50);assert.equal(goal.completedAt,null);
});
test('输入校验：无效日历、注入字段、过长标题、非法进度与重复节点',t=>{
  const {store}=fixture(t);
  for(const patch of [{day:'2026-02-30'},{day:'bogus'},{title:' '},{title:'a'.repeat(161)},{progress:101},{dueAt:'invalid'},{sample:true},{steps:[{id:'x',title:'a'},{id:'x',title:'b'}]}])assert.throws(()=>store.create(task(patch)));
  assert.throws(()=>store.saveSettings({quietStart:'25:61'}));assert.throws(()=>store.saveSettings({dailyLimit:99}));
});
test('创建请求幂等：网络重试不会生成两件任务',t=>{
  const {store}=fixture(t),id=randomUUID();const a=store.create(task(),id),b=store.create(task(),id);assert.equal(a.id,b.id);assert.equal(store.all().length,1);
});
test('重复日常：跨天补齐、不重建已删实例、停止后续且保留历史',t=>{
  const {store,set}=fixture(t);let a=store.create(task({repeat:'daily',dueAt:'2026-10-12T12:00:00.000Z'}));
  store.generateRoutines();assert.equal(store.all().length,7);store.generateRoutines();assert.equal(store.all().length,7);
  a=store.update(a.id,{status:'done'},a.version);set('2026-10-13T08:00:00');store.generateRoutines();assert.equal(store.all().length,8);
  const tomorrow=store.all().find(t=>t.day==='2026-10-13');assert.equal(tomorrow.status,'todo');assert.equal(tomorrow.dueAt,'2026-10-13T12:00:00.000Z');
  store.stopSeries(a.seriesId);store.generateRoutines();assert.equal(store.all().filter(t=>t.day>'2026-10-13').length,0);assert.equal(store.get(a.id).status,'done');
});
test('工作日重复：周末不创建、开始日之前不创建',t=>{
  const {store}=fixture(t,'2026-10-09T10:00:00');store.create(task({day:'2026-10-09',repeat:'weekdays'}));store.generateRoutines();
  assert.deepEqual(store.all().map(t=>t.day).sort(),['2026-10-09','2026-10-12','2026-10-13','2026-10-14','2026-10-15']);
});
test('统计：真实完成日连续天数、取消后回退、示例不制造成就',t=>{
  const {store,set}=fixture(t);let a=store.create(task());a=store.update(a.id,{status:'done'},a.version);
  set('2026-10-13T10:00:00');let b=store.create(task({day:'2026-10-13'}));b=store.update(b.id,{status:'done'},b.version);
  assert.equal(store.snapshot().stats.streak,2);assert.equal(store.snapshot().stats.completed,2);
  store.seedSamples();for(const t of store.all().filter(t=>t.sample))store.update(t.id,{status:'done'},t.version);
  assert.equal(store.snapshot().stats.completed,2);store.clearSamples();store.seedSamples();assert.equal(store.all().filter(t=>t.sample).length,3);
});
test('免打扰：跨午夜、同日区间、全天允许',t=>{
  const {store}=fixture(t),s=store.settings();assert.equal(quietNow(at('2026-10-12T23:00:00'),s),true);assert.equal(quietNow(at('2026-10-12T07:59:00'),s),true);assert.equal(quietNow(at('2026-10-12T08:00:00'),s),false);
  assert.equal(quietNow(at('2026-10-12T12:30:00'),{...s,quietStart:'12:00',quietEnd:'13:00'}),true);
  assert.equal(quietNow(at('2026-10-12T12:30:00'),{...s,quietStart:'00:00',quietEnd:'00:00'}),false);
});
test('提醒实际调用：提前剩余时间、任务路由、重复轮询只发一次、设备回执',async t=>{
  const {store,clock}=fixture(t),sent=[];const a=store.create(task({dueAt:'2026-10-12T02:20:00.000Z'}));
  const r=new Reminders(store,{clock,hasSubscription:()=>true,send:async p=>sent.push(p)});
  await r.tick();await r.tick();assert.equal(sent.length,1);assert.match(sent[0].body,/剩 20 分钟/);assert.equal(sent[0].taskId,a.id);assert.equal(store.history()[0].status,'accepted');
  r.receipt(sent[0].id,'shown');assert.equal(store.history()[0].status,'shown');
});
test('节点独立截止：发送节点剩余时间，完成的节点不提醒',async t=>{
  const {store,clock}=fixture(t),sent=[],r=new Reminders(store,{clock,hasSubscription:()=>true,send:async p=>sent.push(p)});
  const a=store.create(task({kind:'goal',steps:[{id:'one',title:'整理照片',progress:25,dueAt:'2026-10-12T02:20:00Z'},{id:'two',title:'已经完成的节点',progress:100,dueAt:'2026-10-12T02:20:00Z'}]}));
  await r.tick();assert.equal(sent.length,1);assert.match(sent[0].body,/整理照片.*剩 20 分钟.*25%/);assert.equal(sent[0].taskId,a.id);
  store.update(a.id,{status:'done'},a.version);await r.tick();assert.equal(sent.length,1);
});
test('暂停再继续：重新启用尚未发送的提醒，不重复已发送提醒',async t=>{
  const {store,clock}=fixture(t),sent=[],r=new Reminders(store,{clock,hasSubscription:()=>true,send:async p=>sent.push(p)});
  let a=store.create(task({dueAt:'2026-10-12T02:20:00Z'}));r.plan();a=store.update(a.id,{status:'paused'},a.version);
  await r.tick();assert.equal(sent.length,0);a=store.update(a.id,{status:'doing'},a.version);await r.tick();assert.equal(sent.length,1);
  a=store.update(a.id,{status:'paused'},a.version);store.update(a.id,{status:'doing'},a.version);await r.tick();assert.equal(sent.length,1);
});
test('提醒阶段过期：重试时不会连续补发提前和到期提醒',async t=>{
  const {store,clock,set}=fixture(t),sent=[],r=new Reminders(store,{clock,hasSubscription:()=>true,send:async p=>sent.push(p)});
  store.create(task({dueAt:'2026-10-12T02:20:00Z'}));r.plan();set('2026-10-12T10:21:00');await r.tick();
  assert.equal(sent.length,1);assert.match(sent[0].body,/超过约 1 分钟/);assert.equal(store.history().filter(x=>x.status==='cancelled').length,1);
});
test('任务已完成、暂停、关闭提醒及夜间，均不会发送',async t=>{
  const {store,clock,set}=fixture(t),sent=[],r=new Reminders(store,{clock,hasSubscription:()=>true,send:async p=>sent.push(p)});
  store.create(task({status:'done',dueAt:'2026-10-12T02:20:00Z'}));store.create(task({status:'paused',dueAt:'2026-10-12T02:20:00Z'}));store.create(task({reminder:'off',dueAt:'2026-10-12T02:20:00Z'}));
  await r.tick();assert.equal(sent.length,0);
  set('2026-10-12T23:00:00');store.create(task({dueAt:'2026-10-12T15:20:00Z'}));await r.tick();assert.equal(sent.length,0);assert.equal(store.history().length,0);
});
test('待发提醒发送前再次检查：完成后取消，编辑截止日期不发送旧提醒',async t=>{
  const {store,clock}=fixture(t),sent=[],r=new Reminders(store,{clock,hasSubscription:()=>true,send:async p=>sent.push(p)});
  let a=store.create(task({dueAt:'2026-10-12T02:20:00Z'}));r.plan();a=store.update(a.id,{status:'done'},a.version);await r.tick();assert.equal(sent.length,0);assert.equal(store.history()[0].status,'cancelled');
  let b=store.create(task({dueAt:'2026-10-12T02:30:00Z'}));r.plan();store.update(b.id,{dueAt:'2026-10-13T02:30:00Z'},b.version);await r.tick();assert.equal(sent.length,0);
});
test('更新进度不会吞掉一条待发的有效提醒',async t=>{
  const {store,clock}=fixture(t),sent=[],r=new Reminders(store,{clock,hasSubscription:()=>true,send:async p=>sent.push(p)});
  const a=store.create(task({dueAt:'2026-10-12T02:20:00Z'}));r.plan();store.update(a.id,{progress:25},a.version);await r.tick();assert.equal(sent.length,1);assert.match(sent[0].body,/25%/);
});
test('每日提醒上限、暂停一天、早晚汇总去重',async t=>{
  const {store,clock,set}=fixture(t,'2026-10-12T09:00:00'),sent=[],r=new Reminders(store,{clock,hasSubscription:()=>true,send:async p=>sent.push(p)});
  store.create(task());await r.tick();await r.tick();assert.equal(sent.length,1);assert.match(sent[0].title,/早上好/);
  store.saveSettings({dailyLimit:3});for(let i=0;i<6;i++)store.create(task({title:'任务 '+i,dueAt:'2026-10-12T01:20:00Z'}));await r.tick();assert.equal(sent.length,3);
  store.saveSettings({snoozedUntil:clock()+86400000});set('2026-10-12T20:30:00');await r.tick();assert.equal(sent.length,3);
});
test('网络失败重试、重启恢复以及样例绝不发送',async t=>{
  const {store,clock,set}=fixture(t);let attempts=0;const r=new Reminders(store,{clock,hasSubscription:()=>true,send:async()=>{attempts++;if(attempts===1)throw Object.assign(Error('transient'),{statusCode:503});}});
  store.seedSamples();await r.tick();assert.equal(attempts,0);
  store.create(task({dueAt:'2026-10-12T02:20:00Z'}));await r.tick();assert.equal(attempts,1);assert.equal(store.history()[0].status,'pending');
  set(clock()+31000);await r.tick();assert.equal(attempts,2);assert.equal(store.history()[0].status,'accepted');
  store.db.prepare("UPDATE outbox SET status='sending'").run();new Reminders(store,{clock,hasSubscription:()=>true,send:async()=>{}});assert.equal(store.history()[0].status,'pending');
});
test('HTTP 完整流程：私密入口、跨域防护、数据导出、Push 校验、真实调度协议',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'xiaobu-http-'));let now=at('2026-10-12T10:00:00'),push=[];
  const app=createApp({dataDir:dir,staticDir:resolve('dist'),origin:'https://test.example',additionalOrigins:['https://legacy.example'],clock:()=>now,scheduler:false,sendPush:async(...args)=>{push.push(args);return {statusCode:201};}});
  app.listen(0,'127.0.0.1');await once(app,'listening');const root='http://127.0.0.1:'+app.address().port,base=root+app.prefix;
  t.after(async()=>{await new Promise(r=>app.close(r));rmSync(dir,{recursive:true,force:true});});
  const call=(p,method='GET',data,headers={})=>fetch(base+p,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...headers},body:data?JSON.stringify(data):undefined});
  assert.equal((await fetch(root+'/')).status,404);assert.equal((await fetch(root+'/api/state')).status,404);assert.equal((await call('')).status,200);
  const manifest=await (await call('manifest.webmanifest')).json();assert.equal(manifest.start_url,app.prefix);assert.equal(manifest.display,'standalone');
  assert.equal((await call('api/tasks','POST',{task:task(),id:randomUUID()},{Origin:'https://evil.example'})).status,403);
  assert.equal((await call('api/settings','PATCH',{name:'迁移测试'},{Origin:'https://legacy.example'})).status,200);
  assert.equal((await call('api/settings','PATCH',{name:'迁移测试'},{Origin:'https://test.example'})).status,200);
  assert.equal((await call('api/settings','PATCH',{name:'不得保存'},{Origin:'https://legacy.example.evil.example'})).status,403);
  let response=await call('api/tasks','POST',{task:task(),id:randomUUID()});assert.equal(response.status,201);let a=(await response.json()).task;
  response=await call('api/tasks/'+a.id,'PATCH',{patch:{progress:45},version:a.version});a=(await response.json()).task;assert.equal(a.progress,45);
  assert.equal((await call('api/tasks/'+a.id,'PATCH',{patch:{status:'done'},version:1})).status,409);
  const exported=await (await call('api/export')).json();assert.equal(exported.tasks.length,1);assert.ok(!('push' in exported));assert.ok(!JSON.stringify(exported).includes('privateKey'));
  assert.equal((await call('api/push/subscribe','POST',{subscription:{endpoint:'https://127.0.0.1/private',keys:{auth:'x',p256dh:'x'}}})).status,400);
  assert.equal((await call('api/push/subscribe','POST',{subscription:{endpoint:'https://web.push.apple.com/test',keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}}})).status,200);
  response=await call('api/push/test','POST',{});assert.equal(response.status,202);await app.reminders.tick();assert.equal(push.length,0);
  now+=10000;await app.reminders.tick();assert.equal(push.length,1);assert.equal(push[0][2].urgency,'high');assert.ok(push[0][2].vapidDetails.privateKey);
  const state=await (await call('api/state')).json();assert.ok(!JSON.stringify(state).includes('privateKey'));assert.equal(state.push.subscribed,true);assert.equal(state.notifications[0].status,'accepted');
});
