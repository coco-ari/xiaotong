import React,{useState,useEffect,useRef,useCallback} from 'react';
import {motion,AnimatePresence,MotionConfig,useReducedMotion} from 'motion/react';
import {ArrowUpRight,ArrowLeft,ChevronRight,Sparkles,Search,Compass,Bookmark,X,Check} from 'lucide-react';
import SettingsPage from './SettingsPage.jsx';
import {api,DEFAULT_SETTINGS} from './api.mjs';
import {portfolio,daySeries,money,STORIES} from './data.mjs';
import {MOODS,automaticMoods} from './moods.mjs';
import {characterArt} from './art.js';
import SceneCover,{preloadScene} from './SceneCover.jsx';
import FinanceCard from './FinanceCard.jsx';
import Trend from './Trend.jsx';
import './home.css';

const BASE=location.pathname.match(/^\/app\/[^/]+\//)?.[0]||'/';
const PORTFOLIO=portfolio();
const TODAY=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const DAYS=daySeries(TODAY);
const shortDate=s=>s.slice(5).replace('-','.');

const signClass=n=>n>=0?'positive':'negative';
const Demo=()=> <span className="demo-label">演示数据</span>;

function Dialog({title,children,onClose}){
  const ref=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.querySelector('button,input,select')?.focus();
    const key=e=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const all=[...ref.current.querySelectorAll('button,input,select,a[href]')].filter(n=>!n.disabled),first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
    document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus?.();};
  },[]);
  return <div className="xt-dialog-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}><motion.section ref={ref} role="dialog" aria-modal="true" aria-label={title} className="xt-dialog" initial={{opacity:0,y:25}} animate={{opacity:1,y:0}}><header><div><h2>{title}</h2></div><button className="round-button" onClick={onClose} aria-label="关闭"><X size={20}/></button></header>{children}</motion.section></div>;
}
function Overview({state,saved,slots,onEdit}){
  const available={assets:{label:'持仓 · 演示',value:PORTFOLIO.rows.length},reading:{label:'待读 · 演示',value:STORIES.length},saved:{label:'收藏 · 演示',value:saved.length},empty:{label:'留给以后',value:'—'}};
  return <div className="overview-sticky"><button className="overview-bar" onClick={onEdit} aria-label="自定义首页统计">{slots.map((s,i)=>{const item=available[s];return <span key={i} className="overview-item"><strong>{typeof item.value==='number'?String(item.value).padStart(2,'0'):item.value}</strong><span>{item.label}</span></span>;})}</button></div>;
}
function StoryCard({story,saved,onOpen,onSave,compact=false}){return <article className={'story-card '+(compact?'compact ':'')+story.color}><button className="story-main" onClick={onOpen}><div className="story-source"><span className="source-dot"/>{story.source}<small>{story.tag}</small></div><h3>{story.title}</h3>{!compact&&<p>{story.summary}</p>}<footer><span>{story.time} · 演示</span><ArrowUpRight size={17}/></footer></button><button className={'save-story '+(saved?'saved':'')} onClick={onSave} aria-label={(saved?'取消收藏':'收藏')+story.title} aria-pressed={saved}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button></article>;}
function FinancePage({onBack}){
  const [filter,setFilter]=useState('all'),[period,setPeriod]=useState(30),[selected,setSelected]=useState(null),[cursor,setCursor]=useState(null);
  const values=(selected?selected.series:PORTFOLIO.series).slice(-period),days=DAYS.slice(-period),value=cursor===null?values.at(-1):values[cursor],total=selected?.total??PORTFOLIO.total;
  const data=selected||PORTFOLIO;
  const selectAsset=a=>{setSelected(a);setCursor(null);document.querySelector('.finance-detail-panel')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
  return <div className="detail-page"><PageHeading title={selected?selected.name:'收益'} onBack={selected?()=>{setSelected(null);setCursor(null);}:onBack}/><div className="demo-notice"><Sparkles size={16}/><span>以下持仓与收益均为演示 · 统一以人民币展示</span></div><section className="finance-detail-panel"><header><span>{selected?selected.symbol:'全部持仓'} · {cursor===null?'累计收益':shortDate(days[cursor])+' 累计收益'}</span><Demo/></header><strong className={'detail-total '+signClass(value)}>{money(value)}</strong><div className="detail-small-stats"><span>今日收益 <b className={signClass(data.today)}>{money(data.today)}</b></span><span>累计收益率 <b className={signClass(total)}>{money(total/data.cost*100)}%</b></span></div><div className={'detail-chart '+signClass(total)}><Trend values={values} cursorProgress={cursor===null?1:cursor/(values.length-1)}/></div><div className="chart-axis"><span>{shortDate(days[0])}</span><span>{shortDate(days.at(-1))}</span></div><label className="chart-slider"><span>查看每日收益</span><input aria-label="查看每日收益" type="range" min="0" max={values.length-1} value={cursor??values.length-1} onChange={e=>setCursor(Number(e.target.value))}/><b>{shortDate(days[cursor??values.length-1])}</b></label><div className="period-switch">{[7,14,30].map(n=><button key={n} className={period===n?'selected':''} onClick={()=>{setPeriod(n);setCursor(null);}}>近 {n} 天</button>)}</div></section>
    {!selected&&<><div className="section-caption"><div><h2>持仓</h2></div><span>{PORTFOLIO.rows.length} 项持仓</span></div><div className="home-filters">{[['all','全部'],['crypto','虚拟币'],['fund','基金'],['stock','股票']].map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}</button>)}</div><div className="asset-list">{PORTFOLIO.rows.filter(a=>filter==='all'||a.type===filter).map(a=><button className="asset-row" key={a.id} onClick={()=>selectAsset(a)} aria-label={'查看'+a.name+'走势'}><span className="asset-mark" style={{'--asset-color':a.color}}>{a.mark}</span><span className="asset-name"><b>{a.name}</b><small>{a.symbol} · {a.category}</small></span><span className={'asset-sparkline '+signClass(a.total)}><Trend values={a.series} mini/></span><span className="asset-pnl"><small>今日收益</small><b className={signClass(a.today)}>{money(a.today)}</b><span>累计 <em className={signClass(a.total)}>{money(a.total)}</em></span></span><ChevronRight size={15}/></button>)}</div></>}
    {selected&&<div className="asset-note"><span className="asset-mark" style={{'--asset-color':selected.color}}>{selected.mark}</span><div><h3>{selected.name}</h3><p>{selected.category} · 演示投入金额 ¥{money(selected.cost,{sign:false})}</p><p>走势图展示这项演示持仓的累计盈亏，不代表市场价格。</p></div></div>}
  </div>;
}
export function PageHeading({title,subtitle,onBack}){return <header className="personal-page-heading"><button className="round-button" onClick={onBack} aria-label="返回"><ArrowLeft size={20}/></button><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div></header>;}
function FeedPage({saved,toggleSaved,onBack,selected,onSelect}){
  const [source,setSource]=useState('全部'),[query,setQuery]=useState(''),[onlySaved,setOnlySaved]=useState(false);
  if(selected)return <div className="detail-page article-page"><PageHeading title={selected.title} onBack={()=>onSelect(null)}/><div className="demo-notice"><Sparkles size={16}/>这是阅读体验示例，尚未接入平台内容</div><article className={'article-body '+selected.color}><div className="article-source">{selected.source} / {selected.tag}</div><p className="article-lead">{selected.summary}</p>{selected.body.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}<button className={'soft-button '+(saved.includes(selected.id)?'selected':'')} onClick={()=>toggleSaved(selected.id)}><Bookmark size={17}/>{saved.includes(selected.id)?'已收藏，点击取消':'收藏这份灵感'}</button></article></div>;
  const stories=STORIES.filter(s=>(source==='全部'||s.source===source)&&(!onlySaved||saved.includes(s.id))&&(!query||(s.title+s.summary+s.tag).toLowerCase().includes(query.toLowerCase())));
  return <div className="detail-page"><PageHeading title="关注" onBack={onBack}/><div className="feed-search"><Search size={18}/><input aria-label="搜索资讯" placeholder="找一找感兴趣的内容" value={query} onChange={e=>setQuery(e.target.value)}/><button className={onlySaved?'active':''} onClick={()=>setOnlySaved(v=>!v)} aria-label="只看收藏" aria-pressed={onlySaved}><Bookmark size={18}/></button></div><div className="home-filters source-filters">{['全部','LINUX DO','X','知乎','微博','REDDIT'].map(s=><button key={s} className={source===s?'active':''} onClick={()=>setSource(s)}>{s}</button>)}</div><div className="feed-demo-line"><Demo/><span>采集尚未接入，先逛逛阅读体验</span></div><div className="feed-grid">{stories.map(s=><StoryCard key={s.id} story={s} saved={saved.includes(s.id)} onOpen={()=>onSelect(s)} onSave={()=>toggleSaved(s.id)}/>)}</div>{!stories.length&&<div className="home-empty"><Compass size={38}/><h3>{source!=='全部'?'这里的故事，还在路上':'暂时没有找到内容'}</h3><p>{source!=='全部'?'这个来源还没有示例内容，接入后会显示你的关注。':'试试其他关键词，或关闭收藏筛选。'}</p><button className="soft-button" onClick={()=>{setQuery('');setSource('全部');setOnlySaved(false);}}>查看全部示例</button></div>}</div>;
}
export default function PersonalHome(){
  const [page,setPage]=useState(()=>{const value=new URLSearchParams(location.search).get('view');return ['finance','feed','settings'].includes(value)?value:'home';}),[state,setState]=useState(null),[error,setError]=useState(''),[story,setStory]=useState(null),[dialog,setDialog]=useState(null),[draftSlots,setDraftSlots]=useState(DEFAULT_SETTINGS.slots),[busy,setBusy]=useState(false);
  const settings=state?.settings||DEFAULT_SETTINGS,saved=state?.saved||[],slots=settings.slots;
  const refresh=useCallback(async()=>{try{setState(await api('state'));setError('');}catch{setError('暂时无法连接，演示内容仍可浏览。');}},[]);
  useEffect(()=>{refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},30000);return()=>clearInterval(timer);},[refresh]);
  useEffect(()=>{if('serviceWorker' in navigator&&isSecureContext)navigator.serviceWorker.register(BASE+'sw.js',{scope:BASE}).then(reg=>reg.update()).catch(()=>{});const onMessage=e=>{if(e.data?.type==='open-feed'){history.replaceState(null,'',BASE+'?view=feed');setPage('feed');}};navigator.serviceWorker?.addEventListener('message',onMessage);return()=>navigator.serviceWorker?.removeEventListener('message',onMessage);},[]);
  const saveSettings=async patch=>{setBusy(true);try{const next=await api('settings','PATCH',patch);setState(next);setError('');return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}};
  const homeScroll=useRef(0);
  useEffect(()=>{const back=()=>{const id=new URLSearchParams(location.search).get('view')||'home';setPage(['home','finance','feed','settings'].includes(id)?id:'home');setStory(null);setDialog(null);requestAnimationFrame(()=>window.scrollTo({top:id==='home'?homeScroll.current:0,behavior:'instant'}));};window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);},[]);
  const go=id=>{if(page==='home')homeScroll.current=window.scrollY;history.pushState(null,'',BASE+(id==='home'?'':'?view='+id));setPage(id);setStory(null);setDialog(null);requestAnimationFrame(()=>window.scrollTo({top:id==='home'?homeScroll.current:0,behavior:'instant'}));if(id==='home')refresh();};
  const toggleSaved=async id=>{try{setState(await api('saved','POST',{id,saved:!saved.includes(id)}));setError('');}catch(e){setError(e.message);}};

  const [moodId,setMoodId]=useState('greeting');const autoMood=settings.autoMood;const reduced=useReducedMotion();
  useEffect(()=>{if(!autoMood||reduced)return;const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(new Date()));const ids=automaticMoods({hour,todayProfit:PORTFOLIO.today,newItems:STORIES.length});const timer=setInterval(()=>{if(!document.hidden&&page==='home'&&!dialog&&document.querySelector('.scene-cover')?.getBoundingClientRect().bottom>0)setMoodId(id=>ids[(ids.indexOf(id)+1)%ids.length]);},18000);return()=>clearInterval(timer);},[autoMood,reduced,page,dialog]);
  // 首屏只下载当前形象；轮换前预取下一张，打开选择面板才加载整套。
  useEffect(()=>{
    if(!autoMood||reduced||page!=='home')return;
    const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
    const ids=automaticMoods({hour,todayProfit:PORTFOLIO.today,newItems:STORIES.length});
    const next=MOODS.find(m=>m.id===ids[(ids.indexOf(moodId)+1)%ids.length]);
    const timer=setTimeout(()=>{preloadScene(next.id).catch(()=>{});},3500);
    return()=>clearTimeout(timer);
  },[autoMood,reduced,page,moodId]);

  return <MotionConfig reducedMotion="user"><div className="personal-app refined-app">
    <main className={'personal-main view-'+page}>
      {page==='home'&&<div className="home-layout">
        <SceneCover moodId={moodId} onChoose={()=>setDialog('moods')}/>
        <Overview state={state} saved={saved} slots={slots} onEdit={()=>{setDraftSlots([...slots]);setDialog('overview');}}/>
        <div className="home-content-column">
          {!state&&!error&&<div className="loading-card" role="status" aria-label="正在读取首页设置"/>}
          {(state||error)&&settings.plugins.finance&&<FinanceCard onOpen={()=>go('finance')} portfolio={PORTFOLIO} days={DAYS}/>}
          {(state||error)&&settings.plugins.feed&&<button className="collection-card" onClick={()=>go('feed')} aria-label="查看关注的资讯">
            <span className="collection-meta"><b>{String(STORIES.length).padStart(2,'0')}</b><span>条新内容</span><small>演示</small></span>
            <span className="collection-headline">{STORIES[0].title}</span>
            <span className="collection-secondary">{STORIES[1].title}</span>
            <span className="collection-sources">LINUX DO <i/> REDDIT <i/> 知乎</span>
          </button>}
          {!settings.plugins.finance&&!settings.plugins.feed&&<div className="home-empty"><p>挑选你想看到的内容。</p><button className="soft-button" onClick={()=>go('settings')}>管理插件</button></div>}
          {error&&<div className="home-connection" role="status">{error}<button onClick={refresh}>重试</button></div>}
          <footer className="quiet-settings"><button onClick={()=>go('settings')} aria-label="个人设置">设置</button></footer>
        </div>
      </div>}
      {page==='finance'&&<FinancePage onBack={()=>go('home')}/>}
      {page==='feed'&&<FeedPage saved={saved} toggleSaved={toggleSaved} onBack={()=>go('home')} selected={story} onSelect={setStory}/>}
      {page==='settings'&&<SettingsPage state={state} onBack={()=>go('home')} onSave={saveSettings} busy={busy} refresh={refresh}/>}
      {page!=='home'&&error&&<div className="home-connection" role="status">{error}<button onClick={refresh}>重试</button></div>}

    </main>
    {dialog==='moods'&&<Dialog title="小彤的心情" onClose={()=>setDialog(null)}><p className="dialog-intro">小彤的每一种心情。</p><div className="mood-gallery">{MOODS.map(m=><button key={m.id} className={moodId===m.id?'selected':''} onClick={()=>{setMoodId(m.id);void saveSettings({autoMood:false});setDialog(null);}} aria-label={'预览'+m.label}><span><img src={characterArt(m.file)} alt=""/></span><b>{m.label}</b>{moodId===m.id&&<Check size={14}/>}</button>)}</div><div className="mood-auto-row"><span><b>让心情自然变化</b><small>根据时段、示例收益与示例资讯轮换</small></span><button role="switch" aria-label="自动切换角色心情" aria-checked={autoMood} className={'mood-toggle '+(autoMood?'on':'')} disabled={busy} onClick={()=>saveSettings({autoMood:!autoMood})}><i/></button></div><p className="preview-footnote">当前收益和资讯均为演示。手动选择会暂停轮换；减少动态效果模式下不会自动切换。</p></Dialog>}
    {dialog==='overview'&&<Dialog title="首页统计" onClose={()=>setDialog(null)}><p className="dialog-intro">先为这三个位置挑选内容，以后可以换成其他插件的统计。</p><div className="overview-preview">{draftSlots.map((s,i)=><span key={i}>{['01','02','03'][i]}<small>{({assets:'持仓',reading:'待读',saved:'收藏',empty:'留给以后'})[s]}</small></span>)}</div>{draftSlots.map((s,i)=><label className="overview-select" key={i}>位置 {i+1}<select aria-label={'统计位置 '+(i+1)} value={s} onChange={e=>setDraftSlots(v=>v.map((x,j)=>j===i?e.target.value:x))}><option value="assets">持仓（演示）</option><option value="reading">待读（演示）</option><option value="saved">收藏（演示）</option><option value="empty">留给以后</option></select></label>)}<p className="preview-footnote">布局和收藏会保存到你的服务器。</p><button className="personal-primary" disabled={busy} onClick={async()=>{if(await saveSettings({slots:draftSlots}))setDialog(null);}}>就这样放 <Check size={17}/></button></Dialog>}

  </div></MotionConfig>;
}
