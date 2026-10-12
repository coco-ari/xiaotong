// One-time migration on the user's own server. Never print credentials.
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,chmodSync} from 'node:fs';
const dir='/opt/lifehub-planner/state',old='/opt/lifehub-push-test/state';
mkdirSync(dir,{recursive:true,mode:0o700});
if(!existsSync(dir+'/secrets.json')){
  const data=JSON.parse(readFileSync(old+'/state.json','utf8'));
  if(!data.access||!data.vapid?.publicKey||!data.vapid?.privateKey)throw Error('Existing notification configuration is incomplete');
  writeFileSync(dir+'/secrets.json',JSON.stringify({access:data.access,vapid:data.vapid,subscription:data.subscription||null}),{mode:0o600});
}
if(!existsSync(dir+'/public-origin.txt'))copyFileSync(old+'/public-origin.txt',dir+'/public-origin.txt');
chmodSync(dir+'/public-origin.txt',0o600);
console.log('已迁移原有私人入口与通知配置；未发送通知。');
