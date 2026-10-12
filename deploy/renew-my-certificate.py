"""Renew only planner.example.com through the existing BaoTa ACME account."""
import os,sys,subprocess,shutil,fcntl,json
from pathlib import Path
os.chdir('/www/server/panel')
sys.path[:0]=['/www/server/panel','/www/server/panel/class']
lock=open('/run/lock/xiaobu-my-certificate.lock','w')
fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
name='planner.example.com'
source=Path('/www/server/panel/vhost/letsencrypt')/name
target=Path('/www/server/panel/vhost/cert')/name
nginx='/www/server/nginx/sbin/nginx'
def good_for_30_days(path):
    return path.exists() and subprocess.run(['openssl','x509','-checkend','2592000','-noout','-in',str(path)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
if not good_for_30_days(source/'fullchain.pem'):
    from acme_v2 import acme_v2
    manager=acme_v2()
    orders=[(k,v) for k,v in manager._config.get('orders',{}).items() if v.get('domains')==[name] and v.get('save_path')]
    if not orders:raise RuntimeError('找不到本站证书订单')
    index,_=max(orders,key=lambda item:item[1].get('cert_timeout',0))
    result=manager.renew_cert(index,cycle=30)
    if result and result.get('status') is False:raise RuntimeError('本站证书续期失败，请检查宝塔证书日志')
if not good_for_30_days(source/'fullchain.pem'):raise RuntimeError('续期后证书有效期不足')
subprocess.run(['openssl','x509','-checkhost',name,'-noout','-in',str(source/'fullchain.pem')],check=True)
pub_cert=subprocess.check_output(['openssl','x509','-pubkey','-noout','-in',str(source/'fullchain.pem')])
pub_key=subprocess.check_output(['openssl','pkey','-pubout','-in',str(source/'privkey.pem')])
if pub_cert!=pub_key:raise RuntimeError('证书与私钥不匹配')
target.mkdir(parents=True,exist_ok=True,mode=0o700)
changed=any(not (target/n).exists() or (source/n).read_bytes()!=(target/n).read_bytes() for n in ['fullchain.pem','privkey.pem'])
if changed:
    previous={n:(target/n).read_bytes() if (target/n).exists() else None for n in ['fullchain.pem','privkey.pem']}
    try:
        for n in previous:
            tmp=target/(n+'.new');shutil.copyfile(source/n,tmp);os.chmod(tmp,0o600 if n=='privkey.pem' else 0o644);os.replace(tmp,target/n)
        subprocess.run([nginx,'-t'],check=True)
        subprocess.run([nginx,'-s','reload'],check=True)
    except Exception:
        for n,data in previous.items():
            if data is not None:(target/n).write_bytes(data)
        raise
print(json.dumps({'domain':name,'certificateValid':True,'deployedUpdate':changed}))
