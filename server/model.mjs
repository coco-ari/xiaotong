import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

export const DEFAULT_SETTINGS={name:'你',timezone:'Asia/Shanghai',notifications:true,quietStart:'22:00',quietEnd:'08:00',morning:true,morningTime:'09:00',evening:true,eveningTime:'20:30',dailyLimit:6,snoozedUntil:0,theme:'light',celebrate:true};
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function dayAt(ms=Date.now(),zone='Asia/Shanghai'){
  return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(ms);
}
export function timeAt(ms,zone){return new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(ms);}
export function addDays(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export const isDay=v=>typeof v==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const title=(v,max=160)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail('内容需要 1–'+max+' 个字');return v.trim();};
const enumValue=(v,allowed,label)=>{if(!allowed.includes(v))fail(label+'不正确');return v;};
const dateTime=v=>{if(v===null||v==='')return null;if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))fail('截止时间不正确');return new Date(v).toISOString();};
const progress=v=>{if(!Number.isFinite(v)||v<0||v>100)fail('进度应为 0–100');return Math.round(v);};
export function validateTask(input,previous,now){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('任务格式不正确');
  const allowed=['title','note','kind','day','dueAt','category','priority','status','progress','steps','reminder','repeat','color'];
  for(const key of Object.keys(input))if(!allowed.includes(key))fail('未知的任务字段：'+key);
  const v={kind:'task',note:'',day:dayAt(now),dueAt:null,category:'生活',priority:'normal',status:'todo',progress:0,steps:[],reminder:'gentle',repeat:'none',color:'green',...previous,...input};
  v.title=title(v.title);if(typeof v.note!=='string'||v.note.length>4000)fail('备注最多 4000 字');
  v.kind=enumValue(v.kind,['task','goal'],'计划类型');if(previous&&v.kind!==previous.kind)fail('不能改变计划类型');
  if(!isDay(v.day))fail('请选择有效日期');
  v.dueAt=dateTime(v.dueAt);v.category=enumValue(v.category,['生活','工作','学习','健康','创作'],'分类');
  v.priority=enumValue(v.priority,['normal','high'],'优先级');
  v.color=enumValue(v.color,['green','purple','blue','orange'],'颜色');
  v.status=enumValue(v.status,['todo','doing','done','paused'],'任务状态');
  v.reminder=enumValue(v.reminder,['off','gentle','persistent'],'提醒频率');
  v.repeat=enumValue(v.repeat,['none','daily','weekdays'],'重复方式');if(v.kind==='goal'&&v.repeat!=='none')fail('长期计划不能重复');
  if(!Array.isArray(v.steps)||v.steps.length>40)fail('最多添加 40 个节点');
  const ids=new Set();
  v.steps=v.steps.map(s=>{
    if(!s||typeof s!=='object')fail('节点格式不正确');
    const id=typeof s.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s.id)?s.id:randomUUID();
    if(ids.has(id))fail('节点不能重复');ids.add(id);
    const old=previous?.steps.find(o=>o.id===id);
    const p=progress(s.progress??(s.done?100:0));
    return {id,title:title(s.title,120),dueAt:dateTime(s.dueAt??null),progress:p,done:p===100,completedAt:p===100?(old?.completedAt||now):null};
  });
  if(input.status==='done')v.steps=v.steps.map(s=>({...s,progress:100,done:true,completedAt:s.completedAt||now}));
  if(input.status==='todo'){v.steps=v.steps.map(s=>({...s,progress:0,done:false,completedAt:null}));v.progress=0;}
  else if(v.steps.length)v.progress=Math.round(v.steps.reduce((a,s)=>a+s.progress,0)/v.steps.length);
  else v.progress=progress(v.progress);
  if(input.status==='done')v.progress=100;
  if(v.status!=='paused'){
    if(v.progress===100)v.status='done';
    else if(v.progress>0)v.status='doing';
    else if(v.status==='done')v.status='todo';
  }
  if(v.status==='done')v.completedAt=previous?.status==='done'?previous.completedAt:now;else v.completedAt=null;
  return v;
}
export class Store {
  constructor(dir,{clock=()=>Date.now()}={}){
    mkdirSync(dir,{recursive:true,mode:0o700});this.clock=clock;this.db=new DatabaseSync(join(dir,'planner.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS series(id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,dedupe TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,last_error TEXT,accepted_at INTEGER,shown_at INTEGER,clicked_at INTEGER);');
    this.db.prepare('INSERT OR IGNORE INTO settings(id,payload) VALUES(1,?)').run(JSON.stringify(DEFAULT_SETTINGS));
  }
  settings(){return {...DEFAULT_SETTINGS,...JSON.parse(this.db.prepare('SELECT payload FROM settings WHERE id=1').get().payload)};}
  saveSettings(patch){
    const s=this.settings();for(const [key,value] of Object.entries(patch)){
      if(!Object.hasOwn(DEFAULT_SETTINGS,key))fail('未知设置');
      if(['notifications','morning','evening','celebrate'].includes(key)&&typeof value!=='boolean')fail('开关值不正确');
      if(['quietStart','quietEnd','morningTime','eveningTime'].includes(key)&&!(typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)))fail('时间格式不正确');
      if(key==='dailyLimit'&&![3,6,10].includes(value))fail('提醒上限不正确');
      if(key==='snoozedUntil'&&(!Number.isFinite(value)||value<0||value>this.clock()+7*86400000))fail('暂停时间不正确');
      if(key==='name')title(value,30);
      if(key==='theme')enumValue(value,['light','dark','system'],'主题');
      if(key==='timezone'){try{new Intl.DateTimeFormat('en',{timeZone:value}).format();}catch{fail('时区不正确');}}
      s[key]=value;
    }
    this.db.prepare('UPDATE settings SET payload=? WHERE id=1').run(JSON.stringify(s));
    if(!s.notifications)this.db.prepare("UPDATE outbox SET status='cancelled' WHERE status='pending'").run();
    return s;
  }
  all(includeDeleted=false){return this.db.prepare('SELECT payload FROM tasks').all().map(r=>JSON.parse(r.payload)).filter(t=>includeDeleted||!t.deletedAt);}
  get(id,includeDeleted=false){const row=this.db.prepare('SELECT payload FROM tasks WHERE id=?').get(id);if(!row)fail('任务不存在',404);const task=JSON.parse(row.payload);if(task.deletedAt&&!includeDeleted)fail('任务已移到回收站',404);return task;}
  put(t){this.db.prepare('INSERT OR REPLACE INTO tasks(id,payload) VALUES(?,?)').run(t.id,JSON.stringify(t));return t;}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  create(input,id=randomUUID()){
    if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(id))fail('任务标识无效');
    const old=this.db.prepare('SELECT payload FROM tasks WHERE id=?').get(id);if(old)return JSON.parse(old.payload);
    if(this.all(true).length>=5000)fail('计划空间已满，请先导出整理');
    const now=this.clock(),task={...validateTask(input,null,now),id,createdAt:now,updatedAt:now,version:1,deletedAt:null,seriesId:null,sample:false};
    return this.transaction(()=>{
      if(task.repeat!=='none'){task.seriesId=id;this.saveSeries(task);}
      return this.put(task);
    });
  }
  saveSeries(task){
    this.db.prepare('INSERT OR REPLACE INTO series(id,payload) VALUES(?,?)').run(task.seriesId,JSON.stringify({id:task.seriesId,template:task,enabled:task.repeat!=='none',startDay:task.day}));
  }
  update(id,patch,version){
    const old=this.get(id);if(version!==old.version)fail('任务已更新，请刷新后再试',409);
    const next={...validateTask(patch,old,this.clock()),id,version:old.version+1,updatedAt:this.clock()};
    return this.transaction(()=>{
      if(Object.hasOwn(patch,'repeat')&&next.repeat!==old.repeat){
        if(!next.seriesId&&next.repeat!=='none')next.seriesId=id;
        if(next.seriesId){
          this.saveSeries(next);
          for(const t of this.all())if(t.seriesId===next.seriesId&&t.day>next.day&&t.status!=='done')this.put({...t,deletedAt:this.clock(),version:t.version+1});
        }
      }
      this.put(next);
      if(['done','paused'].includes(next.status)||next.reminder==='off'||next.dueAt!==old.dueAt)this.cancelTaskPending(id);
      return next;
    });
  }
  cancelTaskPending(id){
    for(const r of this.db.prepare("SELECT id,payload FROM outbox WHERE status='pending'").all()){
      const p=JSON.parse(r.payload);if(p.taskId===id)this.db.prepare("UPDATE outbox SET status='cancelled' WHERE id=?").run(r.id);
    }
  }
  remove(id,version){
    const t=this.get(id);if(t.version!==version)fail('任务已更新，请刷新后再试',409);
    return this.transaction(()=>{if(t.seriesId)this.stopSeries(t.seriesId);this.cancelTaskPending(id);return this.put({...t,deletedAt:this.clock(),version:t.version+1,updatedAt:this.clock()});});
  }
  restore(id){const t=this.get(id,true);if(!t.deletedAt)return t;return this.put({...t,deletedAt:null,repeat:'none',seriesId:null,version:t.version+1,updatedAt:this.clock()});}
  stopSeries(id){
    const r=this.db.prepare('SELECT payload FROM series WHERE id=?').get(id);if(!r)fail('重复计划不存在',404);
    const s=JSON.parse(r.payload);s.enabled=false;this.db.prepare('UPDATE series SET payload=? WHERE id=?').run(JSON.stringify(s),id);
    const today=dayAt(this.clock(),this.settings().timezone);
    for(const t of this.all())if(t.seriesId===id){this.put({...t,repeat:'none',deletedAt:t.day>today&&t.status!=='done'?this.clock():t.deletedAt,version:t.version+1});this.cancelTaskPending(t.id);}
  }
  generateRoutines(){
    const today=dayAt(this.clock(),this.settings().timezone),all=this.all(true);
    for(const row of this.db.prepare('SELECT payload FROM series').all()){
      const s=JSON.parse(row.payload);if(!s.enabled)continue;
      for(let i=0;i<7;i++){
        const day=addDays(today,i);if(day<s.startDay)continue;
        const weekday=new Date(day+'T12:00:00Z').getUTCDay();if(s.template.repeat==='weekdays'&&[0,6].includes(weekday))continue;
        if(all.some(t=>t.seriesId===s.id&&t.day===day))continue;
        const seed=s.template;
        const delta=Math.round((Date.parse(day+'T12:00:00Z')-Date.parse(seed.day+'T12:00:00Z'))/86400000);
        const shift=v=>v?new Date(Date.parse(v)+delta*86400000).toISOString():null;
        const task={...seed,id:randomUUID(),day,dueAt:shift(seed.dueAt),steps:seed.steps.map(t=>({...t,done:false,progress:0,completedAt:null,dueAt:shift(t.dueAt)})),status:'todo',progress:0,completedAt:null,createdAt:this.clock(),updatedAt:this.clock(),version:1,deletedAt:null};
        this.put(task);all.push(task);
      }
    }
  }
  history(){return this.db.prepare('SELECT id,payload,status,created_at,accepted_at,shown_at,last_error FROM outbox ORDER BY created_at DESC LIMIT 30').all().map(r=>({...r,payload:JSON.parse(r.payload)}));}
  snapshot(){
    const tasks=this.all(),s=this.settings(),today=dayAt(this.clock(),s.timezone);
    const done=tasks.filter(t=>t.status==='done'&&!t.sample);
    const days=new Set(done.map(t=>dayAt(t.completedAt,s.timezone)));let streak=0,d=days.has(today)?today:addDays(today,-1);
    while(days.has(d)&&streak<3660){streak++;d=addDays(d,-1);}
    const week=Array.from({length:7},(_,i)=>{const date=addDays(today,i-6);return {day:date,count:done.filter(t=>dayAt(t.completedAt,s.timezone)===date).length};});
    return {tasks,settings:s,today,serverTime:this.clock(),stats:{completed:done.length,streak,xp:done.reduce((n,t)=>n+(t.kind==='goal'?50:10),0),week},trash:this.all(true).filter(t=>t.deletedAt).slice(-50),notifications:this.history()};
  }
  seedSamples(){
    const existing=this.all(true).filter(t=>t.sample);
    if(existing.length){for(const t of existing)if(t.deletedAt)this.put({...t,deletedAt:null,version:t.version+1});return;}
    const today=dayAt(this.clock(),this.settings().timezone);
    const samples=[
      {kind:'task',title:'读 10 页喜欢的书',category:'学习',day:today,steps:[{title:'挑一个安静的角落',progress:100},{title:'读完 10 页并记下一句话',progress:0}],reminder:'off',color:'blue'},
      {kind:'task',title:'出门走走，给自己充个电',category:'健康',day:today,priority:'high',reminder:'off',color:'orange'},
      {kind:'goal',title:'把阅读变成一种习惯',category:'学习',day:today,color:'purple',status:'doing',reminder:'off',steps:[{title:'选出真正想读的 3 本书',progress:100},{title:'第一本：每天留出 15 分钟',progress:35},{title:'记录 10 个触动自己的句子',progress:0},{title:'完成一本书的小小回顾',progress:0}]}
    ];
    for(const s of samples){const t=this.create(s);this.put({...t,sample:true});}
  }
  clearSamples(){for(const t of this.all())if(t.sample)this.put({...t,deletedAt:this.clock(),version:t.version+1});}
  close(){this.db.close();}
}
