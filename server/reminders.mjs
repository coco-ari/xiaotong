import {randomUUID} from 'node:crypto';
import {dayAt,timeAt} from './model.mjs';

export function quietNow(now,s){
  const t=timeAt(now,s.timezone);if(s.quietStart===s.quietEnd)return false;
  return s.quietStart<s.quietEnd?t>=s.quietStart&&t<s.quietEnd:t>=s.quietStart||t<s.quietEnd;
}
export function remaining(dueAt,now){
  const mins=Math.ceil((Date.parse(dueAt)-now)/60000);
  if(mins<0){const n=Math.abs(mins);return n<60?'已超过约 '+n+' 分钟':n<1440?'已超过约 '+Math.floor(n/60)+' 小时':'已超过 '+Math.floor(n/1440)+' 天';}
  if(mins<60)return '还剩 '+Math.max(1,mins)+' 分钟';
  if(mins<1440)return '还剩 '+Math.floor(mins/60)+' 小时'+(mins%60?' '+mins%60+' 分钟':'');
  return '还剩 '+Math.ceil(mins/1440)+' 天';
}
const active=t=>t&&!t.deletedAt&&!t.sample&&!['done','paused'].includes(t.status)&&t.reminder!=='off';
function stageFor(task,dueAt,now,settings){
  const minutes=(Date.parse(dueAt)-now)/60000;
  if(task.reminder==='persistent'&&minutes>10&&minutes<=60)return 'before60';
  if(minutes>0&&minutes<=(task.reminder==='persistent'?10:30))return 'before';
  if(minutes<=0&&minutes>-60)return 'due';
  if(minutes<=-180&&minutes>=-7*1440){
    const time=timeAt(now,settings.timezone),minute=Number(time.slice(0,2))*60+Number(time.slice(3));
    return 'overdue:'+dayAt(now,settings.timezone)+':'+(task.reminder==='persistent'?Math.floor(minute/180):'daily');
  }
  return null;
}
export class Reminders {
  constructor(store,{send,hasSubscription=()=>false,clock=()=>Date.now()}={}){
    this.store=store;this.send=send;this.hasSubscription=hasSubscription;this.clock=clock;this.running=null;
    // A process crash can interrupt an attempt. Retrying may duplicate that one notification;
    // the stable Web Push tag replaces it on the phone.
    store.db.prepare("UPDATE outbox SET status='pending' WHERE status='sending'").run();
  }
  enqueue(key,payload,{delay=0,ttl=24*3600000}={}){
    const id=randomUUID(),now=this.clock();
    this.store.db.prepare("INSERT INTO outbox(id,dedupe,payload,status,next_at,created_at,expires_at) VALUES(?,?,?,'pending',?,?,?) ON CONFLICT(dedupe) DO UPDATE SET status='pending',next_at=excluded.next_at,expires_at=excluded.expires_at,attempts=0,last_error=NULL WHERE outbox.status='cancelled'").run(id,key,JSON.stringify(payload),now+delay,now,now+ttl);
    return this.store.db.prepare('SELECT id FROM outbox WHERE dedupe=?').get(key).id;
  }
  plan(){
    const now=this.clock(),s=this.store.settings(),tasks=this.store.all(),today=dayAt(now,s.timezone);
    if(!s.notifications||s.snoozedUntil>now||quietNow(now,s)||!this.hasSubscription())return;
    const current=timeAt(now,s.timezone);
    const minute=v=>Number(v.slice(0,2))*60+Number(v.slice(3));
    for(const [type,enabled,time] of [['morning',s.morning,s.morningTime],['evening',s.evening,s.eveningTime]]){
      const diff=minute(current)-minute(time);
      if(enabled&&diff>=0&&diff<45&&tasks.some(t=>active(t)&&t.kind==='task'&&t.day<=today))
        this.enqueue('digest:'+type+':'+today,{type,day:today},{ttl:2*3600000});
    }
    for(const task of tasks){
      if(!active(task))continue;
      const targets=[{dueAt:task.dueAt,stepId:null},...task.steps.filter(n=>!n.done).map(n=>({dueAt:n.dueAt,stepId:n.id}))];
      for(const target of targets){
        if(!target.dueAt)continue;
        const stage=stageFor(task,target.dueAt,now,s);
        if(stage)this.enqueue('task:'+task.id+':'+(target.stepId||'main')+':'+target.dueAt+':'+stage,{type:'task',taskId:task.id,stepId:target.stepId,dueAt:target.dueAt,stage},{ttl:stage.startsWith('before')?3600000:24*3600000});
      }
    }
  }
  compose(payload){
    const now=this.clock(),s=this.store.settings(),today=dayAt(now,s.timezone);
    if(payload.type==='test')return {title:'小步，已经连上啦',body:'以后重要的计划，也会像这样轻轻提醒你。',taskId:null};
    if(payload.type==='task'){
      let t;try{t=this.store.get(payload.taskId);}catch{return null;}
      if(!active(t))return null;
      const step=payload.stepId?t.steps.find(n=>n.id===payload.stepId):null;
      if(payload.stepId&&(!step||step.done))return null;
      const due=step?step.dueAt:t.dueAt;if(due!==payload.dueAt)return null;
      if(payload.stage!==stageFor(t,due,now,s))return null;
      return {title:Date.parse(due)<now?'这一小步，还等着你':'给你的计划提个醒',body:(step?step.title:t.title)+' · '+remaining(due,now)+'。已完成 '+(step?step.progress:t.progress)+'%。',taskId:t.id};
    }
    if(payload.day!==today||!s[payload.type])return null;
    const todo=this.store.all().filter(t=>active(t)&&t.kind==='task'&&t.day<=today);
    if(!todo.length)return null;
    const first=todo.sort((a,b)=>(b.priority==='high')-(a.priority==='high'))[0];
    return {title:payload.type==='morning'?'早上好，今天从一小步开始':'今天还有一点小期待',body:'还有 '+todo.length+' 项计划未完成。先从「'+first.title+'」开始，也很好。',taskId:first.id};
  }
  async tick(){
    if(this.running)return this.running;
    this.running=this.run().finally(()=>this.running=null);return this.running;
  }
  async run(){
    this.store.generateRoutines();this.plan();
    const db=this.store.db,now=this.clock(),settings=this.store.settings();
    db.prepare("UPDATE outbox SET status='expired' WHERE status='pending' AND expires_at<?").run(now);
    if(!this.hasSubscription())return;
    const rows=db.prepare("SELECT * FROM outbox WHERE status='pending' AND next_at<=? ORDER BY created_at LIMIT 10").all(now);
    for(const row of rows){
      const p=JSON.parse(row.payload),s=this.store.settings();
      if(p.type!=='test'&&(!s.notifications||s.snoozedUntil>this.clock()||quietNow(this.clock(),s)))continue;
      const today=dayAt(this.clock(),s.timezone);
      const sent=db.prepare("SELECT accepted_at FROM outbox WHERE status IN ('accepted','shown') AND json_extract(payload,'$.type')!='test'").all().filter(r=>r.accepted_at&&dayAt(r.accepted_at,s.timezone)===today).length;
      if(p.type!=='test'&&sent>=s.dailyLimit)continue;
      const content=this.compose(p);
      if(!content){db.prepare("UPDATE outbox SET status='cancelled' WHERE id=?").run(row.id);continue;}
      // Re-check task and settings immediately before network delivery, so completed work is not chased.
      db.prepare("UPDATE outbox SET status='sending',attempts=attempts+1 WHERE id=?").run(row.id);
      try{
        await this.send({...content,id:row.id,sentAt:this.clock()});
        db.prepare("UPDATE outbox SET status=CASE WHEN shown_at IS NULL THEN 'accepted' ELSE 'shown' END,accepted_at=?,last_error=NULL WHERE id=?").run(this.clock(),row.id);
      }catch(e){
        const code=e.statusCode||0,retry=[0,408,429,500,502,503,504].includes(code)&&row.attempts<4;
        db.prepare('UPDATE outbox SET status=?,next_at=?,last_error=? WHERE id=?').run(retry?'pending':'failed',this.clock()+Math.min(3600000,30000*2**row.attempts),code?'推送服务返回 '+code:'网络连接暂时不可用',row.id);
      }
    }
  }
  receipt(id,event){
    if(event==='shown')this.store.db.prepare("UPDATE outbox SET status='shown',shown_at=? WHERE id=? AND status IN ('sending','accepted','shown')").run(this.clock(),id);
    else if(event==='clicked')this.store.db.prepare('UPDATE outbox SET clicked_at=? WHERE id=?').run(this.clock(),id);
  }
}
