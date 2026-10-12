import http from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,renameSync,statSync} from 'node:fs';
import {resolve,join,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {Store,fail} from './model.mjs';
import {Reminders} from './reminders.mjs';

async function body(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))fail('需要 JSON 格式',415);
  let bytes=0;const chunks=[];for await(const c of req){bytes+=c.length;if(bytes>65536)fail('内容过大',413);chunks.push(c);}
  try{const b=JSON.parse(Buffer.concat(chunks));if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b;}catch{fail('请求格式不正确');}
}
export function createApp({dataDir=resolve('state'),staticDir=resolve('dist'),origin='http://127.0.0.1:18788',additionalOrigins=[],clock=()=>Date.now(),scheduler=true,sendPush}={}){
  const allowedOrigins=new Set([origin,...additionalOrigins]);
  mkdirSync(dataDir,{recursive:true,mode:0o700});
  const secretsFile=join(dataDir,'secrets.json');
  const secrets=existsSync(secretsFile)?JSON.parse(readFileSync(secretsFile,'utf8')):{access:randomBytes(24).toString('base64url'),vapid:webpush.generateVAPIDKeys(),subscription:null};
  function persist(){writeFileSync(secretsFile+'.tmp',JSON.stringify(secrets),{mode:0o600});renameSync(secretsFile+'.tmp',secretsFile);}persist();
  const prefix='/app/'+secrets.access+'/',store=new Store(dataDir,{clock});
  const send=async payload=>{
    if(!secrets.subscription)throw Error('尚未连接手机');
    try{return await (sendPush||webpush.sendNotification.bind(webpush))(secrets.subscription,JSON.stringify(payload),{TTL:3600,urgency:'high',timeout:15000,vapidDetails:{subject:origin.startsWith('https:')?origin:'mailto:local@example.com',...secrets.vapid}});}
    catch(e){if([404,410].includes(e.statusCode)){secrets.subscription=null;persist();}throw e;}
  };
  const reminders=new Reminders(store,{send,clock,hasSubscription:()=>!!secrets.subscription});
  const snapshot=()=>({...store.snapshot(),push:{subscribed:!!secrets.subscription,publicKey:secrets.vapid.publicKey},version:'1.0.0'});
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
  const counts=new Map();
  const server=http.createServer(async(req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
    const reply=(status,value,type='application/json; charset=utf-8',extra={})=>{res.writeHead(status,{...headers,'Content-Type':type,...extra});res.end(Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value));};
    try{
      const url=new URL(req.url,'http://local'),method=req.method;
      if(url.pathname==='/health'&&method==='GET')return reply(200,{ok:true,app:'xiaobu',version:'1.0.0'});
      if(!url.pathname.startsWith(prefix))return reply(404,{error:'页面不存在，请使用你的私人入口'});
      const path=url.pathname.slice(prefix.length);
      if(path.startsWith('api/')){
        if(!['GET','POST','PATCH','DELETE'].includes(method))fail('不支持此操作',405);
        if(method!=='GET'){
          if(req.headers.origin&&!allowedOrigins.has(req.headers.origin))fail('请求来源不匹配',403);
          const ip=req.socket.remoteAddress,now=clock();let c=counts.get(ip);
          if(!c||now-c.at>60000){c={at:now,count:0};counts.set(ip,c);}if(++c.count>150)fail('操作太快，请稍等一下',429);
        }
        if(path==='api/state'&&method==='GET'){store.generateRoutines();return reply(200,snapshot());}
        if(path==='api/export'&&method==='GET')return reply(200,{app:'小步',exportedAt:new Date(clock()).toISOString(),tasks:store.all(true),settings:store.settings()},'application/json; charset=utf-8',{'Content-Disposition':'attachment; filename="xiaobu-backup.json"'});
        if(path==='api/tasks'&&method==='POST'){const b=await body(req);const task=store.create(b.task,b.id);store.generateRoutines();return reply(201,{task,state:snapshot()});}
        const taskMatch=path.match(/^api\/tasks\/([a-zA-Z0-9_-]{16,80})$/);
        if(taskMatch&&method==='PATCH'){const b=await body(req);const task=store.update(taskMatch[1],b.patch,b.version);store.generateRoutines();return reply(200,{task,state:snapshot()});}
        if(taskMatch&&method==='DELETE'){const b=await body(req);store.remove(taskMatch[1],b.version);return reply(200,snapshot());}
        const restore=path.match(/^api\/tasks\/([a-zA-Z0-9_-]{16,80})\/restore$/);
        if(restore&&method==='POST'){await body(req);store.restore(restore[1]);return reply(200,snapshot());}
        const series=path.match(/^api\/series\/([a-zA-Z0-9_-]{16,80})\/stop$/);
        if(series&&method==='POST'){await body(req);store.stopSeries(series[1]);return reply(200,snapshot());}
        if(path==='api/settings'&&method==='PATCH'){store.saveSettings(await body(req));return reply(200,snapshot());}
        if(path==='api/samples'&&method==='POST'){await body(req);store.seedSamples();return reply(200,snapshot());}
        if(path==='api/samples'&&method==='DELETE'){await body(req);store.clearSamples();return reply(200,snapshot());}
        if(path==='api/push/subscribe'&&method==='POST'){
          const {subscription}=await body(req);let u;try{u=new URL(subscription.endpoint);}catch{fail('设备信息无效');}
          if(u.protocol!=='https:'||!(u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.apple.com'))||u.port||u.username||u.password||u.hash)fail('请在 iPhone 桌面 App 或 Safari 中连接通知');
          if(typeof subscription.keys?.auth!=='string'||typeof subscription.keys?.p256dh!=='string'||!/^[-_a-zA-Z0-9]{16,100}$/.test(subscription.keys.auth)||!/^[-_a-zA-Z0-9]{60,200}$/.test(subscription.keys.p256dh))fail('通知密钥格式不正确');
          secrets.subscription={endpoint:u.href,keys:subscription.keys};persist();return reply(200,snapshot());
        }
        if(path==='api/push/test'&&method==='POST'){
          await body(req);if(!secrets.subscription)fail('请先连接手机通知',409);
          const last=store.db.prepare("SELECT created_at FROM outbox WHERE json_extract(payload,'$.type')='test' ORDER BY created_at DESC LIMIT 1").get();
          if(last&&clock()-last.created_at<30000)fail('刚刚发过测试，30 秒后再试',429);
          const id=reminders.enqueue('test:'+randomBytes(8).toString('hex'),{type:'test'},{delay:10000,ttl:5*60000});return reply(202,{id});
        }
        if(path==='api/receipt'&&method==='POST'){const b=await body(req);if(typeof b.id!=='string'||!['shown','clicked'].includes(b.event))fail('回执无效');reminders.receipt(b.id,b.event);return reply(200,{ok:true});}
        fail('接口不存在',404);
      }
      if(method!=='GET'&&method!=='HEAD')fail('页面不存在',404);
      if(path==='manifest.webmanifest')return reply(200,{id:prefix,name:'小步 · 每日计划',short_name:'小步',description:'每天一点，走得更远',lang:'zh-CN',start_url:prefix,scope:prefix,display:'standalone',background_color:'#f7f9f4',theme_color:'#f7f9f4',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},'application/manifest+json');
      const file=resolve(staticDir,path||'index.html');if(!file.startsWith(resolve(staticDir)+sep)||!existsSync(file)||!statSync(file).isFile())fail('页面不存在',404);
      return reply(200,readFileSync(file),mime[extname(file)]||'application/octet-stream',path==='sw.js'?{'Service-Worker-Allowed':prefix}:{});
    }catch(e){if(!res.headersSent)reply(e.status||500,{error:e.status?e.message:'服务暂时不可用，请重试'});else res.destroy();}
  });
  const timer=scheduler?setInterval(()=>void reminders.tick().catch(e=>console.error('Reminder tick failed:',e.message)),1000):null;
  timer?.unref();server.requestTimeout=30000;server.headersTimeout=15000;
  Object.assign(server,{store,reminders,prefix,snapshot});
  server.on('close',()=>{if(timer)clearInterval(timer);Promise.resolve(reminders.running).finally(()=>store.close());});
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const dataDir=resolve(process.env.DATA_DIR||'state'),origin=process.env.PUBLIC_ORIGIN||readFileSync(join(dataDir,'public-origin.txt'),'utf8').trim();
  const additionalOrigins=(process.env.ADDITIONAL_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
  const app=createApp({dataDir,origin,additionalOrigins}),port=Number(process.env.PORT||18788);
  app.listen(port,'127.0.0.1',()=>console.log('小步已启动：http://127.0.0.1:'+port+app.prefix));
  for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>app.close(()=>process.exit(0)));
}
