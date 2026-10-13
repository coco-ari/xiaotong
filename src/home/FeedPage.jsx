import React from 'react';
import {ArrowUpRight, Bookmark, Compass, Search} from 'lucide-react';
import PageHeading from './PageHeading.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';
import {STORIES} from './data.mjs';

function StoryCard({story, saved, pending, onOpen, onSave, index}) {
  return <article className="story-card">
    <button className="story-main" data-focus-key={'story-' + story.id} onClick={onOpen}>
      <div className="story-source"><span className="story-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span>{story.source}</span><small>{story.tag}</small></div>
      <h2>{story.title}</h2><p>{story.summary}</p>
      <footer><span>{story.time} · 演示</span><span>阅读 <ArrowUpRight size={15}/></span></footer>
    </button>
    <button className={'save-story ' + (saved ? 'saved' : '')} disabled={pending} onClick={onSave}
      aria-label={(saved ? '取消收藏：' : '收藏：') + story.title} aria-pressed={saved}>
      <Bookmark size={18} fill={saved ? 'currentColor' : 'none'}/>
    </button>
  </article>;
}

export default function FeedPage({saved, pendingSaved, toggleSaved, onBack, selectedId, onSelect, onCloseArticle, filters, onFilters}) {
  const selected = STORIES.find(story => story.id === selectedId);
  const update = patch => onFilters(value => ({...value, ...patch}));
  if (selected) return <div className="detail-page article-page">
    <PageHeading title="阅读" onBack={onCloseArticle}/>
    <article className="article-body">
      <div className="article-source">{selected.source}<span>{selected.tag}</span></div>
      <h2>{selected.title}</h2>
      <p className="article-lead">{selected.summary}</p>
      <p className="article-demo">阅读体验示例 · 当前内容并非平台真实文章</p>
      <div className="article-prose">{selected.body.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      <footer className="article-footer"><button className={'soft-button ' + (saved.includes(selected.id) ? 'selected' : '')}
        aria-pressed={saved.includes(selected.id)} disabled={pendingSaved.includes(selected.id)} onClick={() => toggleSaved(selected.id)}>
        <Bookmark size={17} fill={saved.includes(selected.id) ? 'currentColor' : 'none'}/>{saved.includes(selected.id) ? '已收藏' : '收藏这份灵感'}
      </button><button className="text-button" onClick={onCloseArticle}>返回文章列表</button></footer>
    </article>
  </div>;

  const stories = STORIES.filter(story => (filters.source === '全部' || story.source === filters.source)
    && (!filters.onlySaved || saved.includes(story.id))
    && (!filters.query || (story.title + story.summary + story.tag).toLowerCase().includes(filters.query.toLowerCase())));
  return <div className="detail-page">
    <PageHeading title="关注" subtitle="把值得读的，留给现在的自己。" onBack={onBack}/>
    <div className="feed-search"><Search size={18}/><input type="search" aria-label="搜索资讯" placeholder="搜索文章与灵感"
      value={filters.query} onChange={event => update({query: event.target.value})}/>
      <button className={filters.onlySaved ? 'active' : ''} onClick={() => update({onlySaved: !filters.onlySaved})}
        aria-label="只看收藏" aria-pressed={filters.onlySaved}><Bookmark size={18}/></button>
    </div>
    <SegmentedControl label="资讯来源" value={filters.source} onChange={source => update({source})}
      className="source-control" options={['全部', 'LINUX DO', 'X', '知乎', '微博', 'REDDIT'].map(id => ({id, label: id}))}/>
    <div className="feed-demo-line"><span role="status">{stories.length} 篇{filters.onlySaved ? '收藏' : '内容'}</span><span>演示内容 · 尚未接入采集</span></div>
    <div className="feed-grid">{stories.map((story, index) => <StoryCard key={story.id} story={story} index={index}
      saved={saved.includes(story.id)} pending={pendingSaved.includes(story.id)} onOpen={() => onSelect(story.id)} onSave={() => toggleSaved(story.id)}/>)}</div>
    {!stories.length && <div className="home-empty"><Compass size={32}/><h2>暂时没有找到内容</h2>
      <p>{filters.source !== '全部' ? '这个来源还没有示例，先看看其他内容。' : '试试其他关键词，或关闭收藏筛选。'}</p>
      <button className="soft-button" onClick={() => update({query: '', source: '全部', onlySaved: false})}>查看全部示例</button></div>}
  </div>;
}
