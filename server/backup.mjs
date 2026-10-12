import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,copyFileSync,chmodSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
const state=resolve(process.env.DATA_DIR||'state'),root=join(state,'backups');
mkdirSync(root,{recursive:true,mode:0o700});
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),folder=join(root,stamp);
mkdirSync(folder,{mode:0o700});
const db=new DatabaseSync(join(state,'planner.sqlite'),{readOnly:true});
try{await backup(db,join(folder,'planner.sqlite'));}finally{db.close();}
for(const name of ['secrets.json','public-origin.txt'])copyFileSync(join(state,name),join(folder,name));
for(const name of ['planner.sqlite','secrets.json','public-origin.txt'])chmodSync(join(folder,name),0o600);
const dates=readdirSync(root).filter(n=>/^\d{4}-\d{2}-\d{2}T[\dTZ-]+$/.test(n)).sort();
for(const old of dates.slice(0,-7))rmSync(join(root,old),{recursive:true});
console.log('小步数据备份完成：'+stamp);
