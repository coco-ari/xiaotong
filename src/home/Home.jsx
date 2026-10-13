import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowUpRight, Check} from 'lucide-react';
import {MotionConfig} from 'motion/react';
import useMotionPreference from './useMotionPreference.js';
import SceneCover from './SceneCover.jsx';
import useScenePlaylist from './useScenePlaylist.js';
import {sceneView} from './scene-view.mjs';
import {DEFAULT_PRESENTATION} from '../../shared/scene-engine.mjs';
import FinanceCard from './FinanceCard.jsx';
import FinancePage from './FinancePage.jsx';
import FeedPage from './FeedPage.jsx';
import SettingsPage, {Toggle} from './SettingsPage.jsx';
import Dialog from './ui/Dialog.jsx';
import useNavigation from './useNavigation.js';
import {MOODS} from './moods.mjs';
import {SCENES} from './scenes.mjs';
import {characterArt} from './art.js';
import {portfolio, daySeries, STORIES} from './data.mjs';
import {api, BASE, DEFAULT_SETTINGS} from './api.mjs';
import './home.css';
import './ui/primitives.css';
import './refined.css';

const PORTFOLIO = portfolio();
const TODAY = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
const DAYS = daySeries(TODAY);
const MOOD_NOTES = {greeting:'暖阳问候', happy:'暖阳庆祝', sad:'雨天陪伴', excited:'礼物惊喜', reading:'安静书香', sleepy:'月色晚安'};
const SLOT_LABELS = {assets:'持仓', reading:'待读', saved:'收藏', empty:'留给以后'};

function Overview({saved, slots, onEdit}) {
  const values = {assets:PORTFOLIO.rows.length, reading:STORIES.length, saved:saved.length, empty:'—'};
  return <div className="overview-sticky"><button className="overview-bar" onClick={onEdit} data-focus-key="overview-edit" aria-label="自定义首页统计">
    {slots.map((slot,index)=><span className="overview-item" key={index}>
      <strong>{typeof values[slot]==='number' ? String(values[slot]).padStart(2,'0') : values[slot]}</strong>
      <span>{SLOT_LABELS[slot]}{['assets','reading'].includes(slot)?' · 演示':''}</span>
    </span>)}
  </button></div>;
}

export default function PersonalHome() {
  const {route,go,back}=useNavigation();
  const [state,setState]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [dialog,setDialog]=useState(null),[draftSlots,setDraftSlots]=useState(DEFAULT_SETTINGS.slots);
  const [manualScene,setManualScene]=useState(null);
  const [sceneData,setSceneData]=useState({snapshots:{},fetchedAt:0}),[sceneNow,setSceneNow]=useState(Date.now);
  const sceneRequest=useRef(0);
  const [pendingSaved,setPendingSaved]=useState([]),[status,setStatus]=useState('');
  const [feedFilters,setFeedFilters]=useState({source:'全部',query:'',onlySaved:false});
  const [hasPlayed,setHasPlayed]=useState(false);
  const markPlayed=useCallback(()=>setHasPlayed(true),[]);
  const revision=useRef(0),saving=useRef(false),savingArticle=useRef(false);
  const reduced=useMotionPreference();
  const settings=state?.settings||DEFAULT_SETTINGS,saved=state?.saved||[],slots=settings.slots;
  const autoMood=settings.autoMood&&!manualScene,page=route.view;
  const presentation=settings.presentation||DEFAULT_PRESENTATION;
  const playlist=useScenePlaylist({presentation,snapshots:sceneData.snapshots,plugins:settings.plugins,
    enabled:autoMood&&!reduced&&!dialog,onHome:page==='home',manualScene,now:sceneNow});
  const moodId=playlist.scene.characterId;
  const refreshScenes=useCallback(async()=>{
    const request=++sceneRequest.current;
    try {
      const next=await api('scene-data');
      if(request===sceneRequest.current){setSceneData(next);setSceneNow(Date.now());}
    } catch {
      if(request===sceneRequest.current){
        setSceneData(previous=>({...previous,snapshots:Object.fromEntries(Object.entries(previous.snapshots).map(([id,value])=>[id,{...value,status:'error'}]))}));
        setSceneNow(Date.now());
      }
    }
  },[]);
  const refresh=useCallback(async()=>{
    const startedAt=revision.current;
    try {const next=await api('state');if(startedAt===revision.current){setState(next);setError('');}}
    catch {if(startedAt===revision.current)setError('暂时无法连接，演示内容仍可浏览。');}
  },[]);
  useEffect(()=>{refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},30000);return()=>clearInterval(timer);},[refresh]);
  useEffect(()=>{
    refreshScenes();
    const timer=setInterval(()=>{if(!document.hidden)refreshScenes();},30000);
    const resume=()=>{if(!document.hidden){setSceneNow(Date.now());refreshScenes();}};
    document.addEventListener('visibilitychange',resume);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',resume);sceneRequest.current++;};
  },[refreshScenes]);
  useEffect(()=>{
    if('serviceWorker' in navigator&&isSecureContext)navigator.serviceWorker.register(BASE+'sw.js',{scope:BASE}).then(registration=>registration.update()).catch(()=>{});
    const onMessage=event=>{if(event.data?.type==='open-feed')go('feed');};
    navigator.serviceWorker?.addEventListener('message',onMessage);
    return()=>navigator.serviceWorker?.removeEventListener('message',onMessage);
  },[go]);
  useEffect(()=>{setDialog(null);},[route.key]);
  useEffect(()=>{if(!status)return;const timer=setTimeout(()=>setStatus(''),2600);return()=>clearTimeout(timer);},[status]);

  const saveSettings=async patch=>{
    if(saving.current)return false;
    saving.current=true;revision.current++;setBusy(true);
    try {setState(await api('settings','PATCH',patch));if(patch.autoMood===true)setManualScene(null);setError('');return true;}
    catch(failure){setError(failure.message);return false;}
    finally{saving.current=false;revision.current++;setBusy(false);}
  };
  const toggleSaved=async id=>{
    if(savingArticle.current)return;
    savingArticle.current=true;revision.current++;setPendingSaved(STORIES.map(story=>story.id));
    const isSaved=saved.includes(id);
    try{setState(await api('saved','POST',{id,saved:!isSaved}));setError('');setStatus(isSaved?'已取消收藏':'已收藏，稍后慢慢读。');}
    catch(failure){setError(failure.message);}
    finally{savingArticle.current=false;revision.current++;setPendingSaved([]);}
  };
  return <MotionConfig reducedMotion={reduced?'always':'never'}><div className="personal-app refined-app">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <main id="main-content" tabIndex={-1} className={'personal-main view-'+page}>
      {page==='home'&&<div className="home-layout">
        <SceneCover scene={playlist.scene} onSettled={playlist.onSettled} ambient={playlist.ambient} onChoose={()=>setDialog('moods')}/>
        <Overview saved={saved} slots={slots} onEdit={()=>{setDraftSlots([...slots]);setDialog('overview');}}/>
        <div className="home-content-column">
          {!state&&!error&&<div className="loading-card" role="status" aria-label="正在读取首页设置"/>}
          {(state||error)&&settings.plugins.finance&&<FinanceCard onOpen={()=>go('finance')} portfolio={PORTFOLIO} days={DAYS} completed={hasPlayed} onComplete={markPlayed}/>}
          {(state||error)&&settings.plugins.feed&&<button className="collection-card" data-focus-key="feed-open" onClick={()=>go('feed')} aria-label="查看关注的资讯">
            <span className="collection-top"><span><b>{String(STORIES.length).padStart(2,'0')}</b> 篇待发现</span><small>演示</small></span>
            <span className="collection-headline">{STORIES[0].title}</span>
            <span className="collection-secondary">给好奇心，留一段好时光。</span>
            <span className="collection-line"><span>LINUX DO · REDDIT · 知乎</span><ArrowUpRight size={18}/></span>
          </button>}
          {!settings.plugins.finance&&!settings.plugins.feed&&<div className="home-empty"><p>挑选你想看到的内容。</p><button className="soft-button" onClick={()=>go('settings')}>管理首页内容</button></div>}
          <footer className="quiet-settings"><button onClick={()=>go('settings')} data-focus-key="settings-open" aria-label="个人设置">设置</button></footer>
        </div>
      </div>}
      {page==='finance'&&<FinancePage onBack={()=>back()} portfolio={PORTFOLIO} days={DAYS}/>}
      {page==='feed'&&<FeedPage saved={saved} pendingSaved={pendingSaved} toggleSaved={toggleSaved} onBack={()=>back()}
        selectedId={route.story} onSelect={id=>go('feed',id)} onCloseArticle={()=>back('feed')} filters={feedFilters} onFilters={setFeedFilters}/>}
      {page==='settings'&&<SettingsPage state={state} onBack={()=>back()} onSave={saveSettings} busy={busy} refresh={refresh}
        sceneSnapshots={sceneData.snapshots}/>}
      {error&&!dialog&&<div className="home-connection" role="status">{error}<button onClick={refresh}>重试</button></div>}
    </main>
    <div className="feedback-toast" role="status" aria-live="polite">{status&&<span><Check size={16}/>{status}</span>}</div>
    {dialog==='moods'&&<Dialog title="小彤的心情" description="每一种心情，都有一处风景。" onClose={()=>setDialog(null)}>
      <div className="mood-gallery">{MOODS.map(mood=><button key={mood.id} className={'mood-choice '+(moodId===mood.id?'selected':'')}
        disabled={busy||!state} aria-pressed={moodId===mood.id} aria-label={'预览'+mood.label} onClick={()=>{
          setManualScene(sceneView(mood.id));setDialog(null);void saveSettings({autoMood:false});
        }}>
        <span className="mood-scene-preview"><img className="mood-scene-background" src={characterArt(SCENES[mood.id].background)} alt=""/>
          <img className="mood-scene-character" src={characterArt(mood.file)} alt=""/></span>
        <span className="mood-copy"><b>{mood.label}</b><small>{MOOD_NOTES[mood.id]}</small></span>
        {moodId===mood.id&&<Check size={15} aria-hidden="true"/>}
      </button>)}</div>
      <div className="mood-auto-row"><span><b>按模块数据轮换</b><small>每幅画面停留 {presentation.intervalSeconds} 秒</small></span>
        <Toggle label="自动切换角色心情" checked={autoMood} disabled={busy||!state} onChange={async()=>{
          if(await saveSettings({autoMood:!autoMood}))setManualScene(null);
        }}/></div>
      <p className="preview-footnote">手动选择会暂停轮换；系统开启减少动态效果时，场景保持静止。收益与资讯为演示数据。</p>
      <button className="soft-button" onClick={()=>{setDialog(null);go('settings');}}>配置模块、画面与文案</button>
      {error&&<p className="inline-error" role="alert">{error}</p>}
    </Dialog>}
    {dialog==='overview'&&<Dialog title="首页统计" description="为三个位置，挑选你关心的内容。" onClose={()=>setDialog(null)}>
      <div className="overview-preview">{draftSlots.map((slot,index)=><span key={index}>{String(index+1).padStart(2,'0')}<small>{SLOT_LABELS[slot]}</small></span>)}</div>
      {draftSlots.map((slot,index)=><label className="overview-select" key={index}>位置 {index+1}<select aria-label={'统计位置 '+(index+1)} value={slot}
        onChange={event=>setDraftSlots(values=>values.map((value,i)=>i===index?event.target.value:value))}>
        <option value="assets">持仓（演示）</option><option value="reading">待读（演示）</option><option value="saved">收藏</option><option value="empty">留给以后</option>
      </select></label>)}
      <p className="preview-footnote">布局和收藏会保存到你的服务器。</p>
      {error&&<p className="inline-error" role="alert">{error}</p>}
      <button className="personal-primary dialog-save" disabled={busy||!state} onClick={async()=>{
        if(await saveSettings({slots:draftSlots})){setDialog(null);setStatus('首页统计已更新');}
      }}>{busy?'正在保存…':'就这样放'}<Check size={17}/></button>
    </Dialog>}
  </div></MotionConfig>;
}
