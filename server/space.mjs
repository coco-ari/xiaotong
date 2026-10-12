import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export const DEFAULT_SETTINGS={autoMood:true,slots:['reading','saved','assets'],plugins:{finance:true,feed:true}};
export class Space {
 constructor(dir,{clock=()=>Date.now()}={}){this.file=join(dir,'xiaotong.json');this.clock=clock;this.data=existsSync(this.file)?JSON.parse(readFileSync(this.file,'utf8')):{settings:structuredClone(DEFAULT_SETTINGS),saved:[],notifications:[]};for(const n of this.data.notifications)if(n.status==='sending')n.status='pending';this.persist();}
 persist(){writeFileSync(this.file+'.tmp',JSON.stringify(this.data),{mode:0o600});renameSync(this.file+'.tmp',this.file);}
 snapshot(){return structuredClone(this.data);}
 settings(patch){if(!patch||typeof patch!=='object'||Array.isArray(patch))fail('设置格式不正确');const next=structuredClone(this.data.settings);for(const [key,value] of Object.entries(patch)){
  if(key==='autoMood'){if(typeof value!=='boolean')fail('心情设置无效');next[key]=value;}
  else if(key==='slots'){if(!Array.isArray(value)||value.length!==3||value.some(v=>!['reading','saved','assets','empty'].includes(v)))fail('统计位置无效');next.slots=value;}
  else if(key==='plugins'){if(!value||typeof value!=='object'||Array.isArray(value)||Object.entries(value).some(([k,v])=>!['finance','feed'].includes(k)||typeof v!=='boolean'))fail('插件设置无效');next.plugins={...next.plugins,...value};}
  else fail('设置项不存在');
 }this.data.settings=next;this.persist();}
 save(id,saved){if(!['one','two','three'].includes(id)||typeof saved!=='boolean')fail('收藏内容无效');this.data.saved=this.data.saved.filter(v=>v!==id);if(saved)this.data.saved.push(id);this.persist();}
 enqueue(id){const last=this.data.notifications.at(0);if(last&&this.clock()-last.createdAt<30000)fail('30 秒后可以再次测试',429);this.data.notifications.unshift({id,status:'pending',createdAt:this.clock(),due:this.clock()+10000,attempts:0});this.data.notifications=this.data.notifications.slice(0,50);this.persist();}
 receipt(id,event){if(!['shown','clicked'].includes(event))fail('回执无效');const n=this.data.notifications.find(v=>v.id===id);if(n){if(n.status!=='clicked')n.status=event;n[event+'At']=this.clock();this.persist();}}
 async tick(send){if(this.running)return this.running;this.running=this.deliver(send).finally(()=>{this.running=null;});return this.running;}
 async deliver(send){for(const n of this.data.notifications.filter(v=>v.status==='pending'&&v.due<=this.clock())){if(this.clock()-n.createdAt>300000){n.status='failed';this.persist();continue;}n.status='sending';n.attempts++;this.persist();try{await send({id:n.id,title:'小彤',body:'你的新消息已经准备好了。',type:'test',view:'feed'});if(n.status==='sending')n.status='accepted';}catch{if(['shown','clicked'].includes(n.status))continue;n.status=n.attempts>=3?'failed':'pending';n.due=this.clock()+30000;}this.persist();}}
}
