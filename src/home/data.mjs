// 隔离的界面演示数据，不代表行情、真实持仓或投资建议。
export const DEMO_ASSETS = [
  {id:'btc',name:'比特币',symbol:'BTC',type:'crypto',category:'虚拟币',mark:'₿',color:'#dc9b42',cost:48000,total:4821.46,today:382.62,seed:1},
  {id:'eth',name:'以太坊',symbol:'ETH',type:'crypto',category:'虚拟币',mark:'Ξ',color:'#8792b2',cost:26000,total:-862.40,today:-127.84,seed:3},
  {id:'fund',name:'沪深 300 指数基金',symbol:'指数基金',type:'fund',category:'基金',mark:'基',color:'#638e81',cost:36000,total:2860.24,today:156.23,seed:5},
  {id:'stock',name:'贵州茅台',symbol:'600519',type:'stock',category:'股票',mark:'股',color:'#c67c72',cost:72000,total:4266.00,today:208.43,seed:7},
  {id:'tech',name:'科技成长基金',symbol:'混合基金',type:'fund',category:'基金',mark:'基',color:'#a68cbb',cost:18000,total:1595.22,today:-251.20,seed:9},
];
const cents=n=>Math.round(n*100)/100;
export function makeSeries(asset,count=30){
  return Array.from({length:count},(_,i)=>{
    if(i===count-1)return asset.total;
    if(i===count-2)return cents(asset.total-asset.today);
    const t=i/(count-1),wave=Math.sin(i*.72+asset.seed)*Math.abs(asset.total)*.085+Math.cos(i*1.7+asset.seed)*120;
    return cents(asset.total*(.19+.81*t)+wave+(t>.44&&t<.57?-370:0));
  });
}
export function portfolio(assets=DEMO_ASSETS,count=30){
  const rows=assets.map(a=>({...a,series:makeSeries(a,count)}));
  const sum=key=>cents(rows.reduce((s,a)=>s+a[key],0));
  return {rows,total:sum('total'),today:sum('today'),cost:sum('cost'),series:Array.from({length:count},(_,i)=>cents(rows.reduce((s,a)=>s+a.series[i],0)))};
}
export function daySeries(endDay,count=30){
  const date=new Date(endDay+'T12:00:00Z');
  return Array.from({length:count},(_,i)=>new Date(date.getTime()-(count-i-1)*86400000).toISOString().slice(0,10));
}
export function chartPoints(values,{width=600,height=160,padding=12}={}){
  if(!values.length)return [];
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  return values.map((v,i)=>({x:padding+i/Math.max(1,values.length-1)*(width-padding*2),y:height-padding-(v-min)/range*(height-padding*2),value:v}));
}
export function money(n,{sign=true,decimals=2}={}){return (sign?(n>0?'+':n<0?'−':''):'')+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});}
export const STORIES=[
  {id:'one',source:'LINUX DO',tag:'AI 与效率',title:'值得关注的开源 AI 项目',summary:'关注的主题、想读的文章、值得收藏的灵感，都可以在这里相遇。',body:'这是资讯插件的阅读体验示例，并非平台上的真实文章。未来接入数据源后，这里会展示采集到的标题、摘要、发布时间和原文链接。\n\n你可以按兴趣筛选，只保留自己关心的内容。收藏和未读状态会帮助你在合适的时候继续阅读。',time:'阅读体验',color:'mint',icon:'✳'},
  {id:'two',source:'REDDIT',tag:'数字生活',title:'给个人知识库找一点新灵感',summary:'用一个安静的收件箱，整理每天值得关注的新发现。',body:'这是一条用于预览布局的示例内容。当前没有连接 Reddit，也没有实时采集或推送。\n\n现在可以体验筛选、收藏、阅读详情和返回；后续接入后会使用服务器上的真实内容。',time:'界面示例',color:'peach',icon:'✦'},
  {id:'three',source:'知乎',tag:'生活灵感',title:'把计划拆成每天能做到的小事',summary:'给计划、灵感和期待，都留一个舒服的位置。',body:'这是一条界面演示文章，不代表知乎的真实内容。你的关注来源会集中显示在这个页面，支持按照来源和关键词筛选。',time:'界面示例',color:'lavender',icon:'☀'},
];
