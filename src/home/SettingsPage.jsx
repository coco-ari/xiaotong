import React,{useState} from 'react';
import {Bell,ChevronRight} from 'lucide-react';
import {PageHeading} from './Home.jsx';
import {api,BASE,DEFAULT_SETTINGS} from './api.mjs';
export function Toggle({label,checked,onChange,disabled}){return <button className={'mood-toggle '+(checked?'on':'')} role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={onChange}><i/></button>;}
export default function SettingsPage({state,onBack,onSave,busy,refresh}){
 const [message,setMessage]=useState(''),[working,setWorking]=useState(false);
 const settings=state?.settings||DEFAULT_SETTINGS;
 const connect=async()=>{setWorking(true);setMessage('');try{
  if(!('Notification' in window)||!('PushManager' in window))throw Error('请在 iPhone 的 Safari 中添加到主屏幕，再从桌面打开小彤。');
  const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('通知尚未允许，请在系统设置中开启小彤的通知。');
  const registration=await navigator.serviceWorker.ready;
  const raw=atob(state.push.publicKey.replace(/-/g,'+').replace(/_/g,'/'));
  const applicationServerKey=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey});
  await api('push/subscribe','POST',{subscription:subscription.toJSON()});await refresh();setMessage('通知已连接。');
 }catch(e){setMessage(e.message);}finally{setWorking(false);}};
 const test=async()=>{setWorking(true);try{await api('push/test','POST',{});setMessage('10 秒后发送。现在可以回到桌面查看横幅。');await refresh();}catch(e){setMessage(e.message);}finally{setWorking(false);}};
 return <div className="detail-page settings-page"><PageHeading title="设置" onBack={onBack}/>
 <section className="settings-identity"><img src={BASE+'xiaotong-icon-192-v3.png'} alt="小彤 App 图标"/><div><h2>小彤</h2><p>你的个人空间</p></div><span>2.1</span></section>
 <h2 className="settings-caption">首页</h2><section className="settings-group">
 {[['finance','收益','持仓与最近走势'],['feed','资讯','你关注的内容']].map(([id,title,note])=><div className="setting-row" key={id}><span><b>{title}</b><small>{note}</small></span><Toggle label={'显示'+title+'插件'} checked={settings.plugins[id]} disabled={busy||!state} onChange={()=>onSave({plugins:{...settings.plugins,[id]:!settings.plugins[id]}})}/></div>)}
 <div className="setting-row"><span><b>心情轮换</b><small>跟随时段与演示内容变化</small></span><Toggle label="自动切换角色心情" checked={settings.autoMood} disabled={busy||!state} onChange={()=>onSave({autoMood:!settings.autoMood})}/></div></section>
 <h2 className="settings-caption">通知</h2><section className="settings-group"><div className="setting-row"><span><b>{state?.push.subscribed?'设备已连接':'连接你的 iPhone'}</b><small>{state?.push.subscribed?'保留现有通知连接':'添加到主屏幕后开启通知'}</small></span><Bell size={19}/></div><div className="settings-actions"><button className="soft-button" disabled={working||!state} onClick={connect}>{state?.push.subscribed?'连接此设备':'开启通知'}</button><button className="personal-primary" disabled={working||!state?.push.subscribed} onClick={test}>测试横幅 <ChevronRight size={17}/></button></div>
 {state?.notifications?.[0]&&<p className="delivery-state">最近通知：{({pending:'等待发送',sending:'发送中',accepted:'推送服务已接收',shown:'设备已显示',clicked:'已打开',failed:'发送失败'})[state.notifications[0].status]||'已处理'}</p>}</section>
 {message&&<p className="settings-message" role="status">{message}</p>}
 <p className="settings-footnote">收益与资讯目前使用演示数据。首页偏好和收藏保存在服务器。系统开启「减少动态效果」后会自动简化动画。</p>
 </div>;
}
