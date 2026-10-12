"""Run on the public gateway with BaoTa's own Python. No credentials in source."""
import os,sys,json,sqlite3
from pathlib import Path
from datetime import datetime,timezone
os.chdir('/www/server/panel')
sys.path[:0]=['/www/server/panel','/www/server/panel/class']
import public
from panelSite import panelSite
name='planner.example.com'
old=public.M('sites').where('name=?',(name,)).find()
if old:
    print(json.dumps({'existingSiteId':old['id'],'name':old['name']}))
    raise SystemExit(0)
backup=Path('/root/xiaobu-proxy-backup-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
backup.mkdir(mode=0o700)
source=sqlite3.connect('/www/server/panel/data/db/site.db')
dest=sqlite3.connect(str(backup/'site.db'));source.backup(dest);dest.close();source.close()
args=public.to_dict_obj({'webname':json.dumps({'domain':name,'domainlist':[],'count':0}),'path':'/www/wwwroot/'+name,'port':'80','version':'00','ps':'小步个人计划 · ZeroTier 反向代理','ftp':'false','sql':'false','type_id':0,'type':'PHP','project_type':'PHP','codeing':'utf8'})
result=panelSite().AddSite(args)
print(json.dumps(result,ensure_ascii=False))
if not result.get('siteStatus'):raise SystemExit(1)
