import {mkdirSync,copyFileSync,chmodSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
const state=resolve(process.env.DATA_DIR||'state'),root=join(state,'backups');
mkdirSync(root,{recursive:true,mode:0o700});
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),folder=join(root,stamp);
mkdirSync(folder,{mode:0o700});
for(const name of ['xiaotong.json','secrets.json','public-origin.txt']){copyFileSync(join(state,name),join(folder,name));chmodSync(join(folder,name),0o600);}
const dates=readdirSync(root).filter(n=>/^\d{4}-\d{2}-\d{2}T[\dTZ-]+$/.test(n)).sort();
for(const old of dates.slice(0,-7))rmSync(join(root,old),{recursive:true});
console.log('小彤数据备份完成：'+stamp);
