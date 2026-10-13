import React, {useLayoutEffect, useRef, useState} from 'react';
import {ChevronRight} from 'lucide-react';
import PageHeading from './PageHeading.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';
import Trend from './Trend.jsx';
import {money} from './data.mjs';

const signClass = value => value >= 0 ? 'positive' : 'negative';
const shortDate = value => value.slice(5).replace('-', '.');

export default function FinancePage({onBack, portfolio, days: allDays}) {
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState(30);
  const [selected, setSelected] = useState(null);
  const [cursor, setCursor] = useState(null);
  const listPosition = useRef(null);
  const assetButtons = useRef(new Map());
  const data = selected || portfolio;
  const values = data.series.slice(-period), days = allDays.slice(-period);
  const value = cursor === null ? values.at(-1) : values[cursor];
  const selectedDay = days[cursor ?? values.length - 1];
  const selectAsset = asset => {
    listPosition.current = {scroll: window.scrollY, assetId: asset.id};
    setSelected(asset); setCursor(null);
  };
  useLayoutEffect(() => {
    if (!selected && !listPosition.current) return;
    const frame = requestAnimationFrame(() => {
      if (selected) {
        document.querySelector('[data-page-heading]')?.focus({preventScroll: true});
        window.scrollTo({top: 0, behavior: 'instant'});
        return;
      }
      // 列表重新渲染后再恢复原资产行，避免焦点滚动覆盖阅读位置。
      const previous = listPosition.current;
      assetButtons.current.get(previous.assetId)?.focus({preventScroll: true});
      window.scrollTo({top: previous.scroll, behavior: 'instant'});
      listPosition.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);
  return <div className="detail-page finance-page">
    <PageHeading title={selected ? selected.name : '收益'} subtitle={selected ? selected.symbol : '每一点积累，都看得见。'}
      onBack={selected ? () => {setSelected(null); setCursor(null);} : onBack}/>
    <div className="demo-notice"><span>以下持仓与收益均为演示 · 人民币</span></div>
    <section className="finance-detail-panel">
      <header><span>{cursor === null ? '累计收益' : shortDate(selectedDay) + ' 累计收益'}</span><span className="demo-label">演示</span></header>
      <strong className={'detail-total ' + signClass(value)}>{money(value)}</strong>
      <div className="detail-small-stats"><span>今日收益 <b className={signClass(data.today)}>{money(data.today)}</b></span>
        <span>累计收益率 <b className={signClass(data.total)}>{money(data.total / data.cost * 100)}%</b></span></div>
      <div className={'detail-chart ' + signClass(data.total)}><Trend values={values} cursorProgress={cursor === null ? 1 : cursor / (values.length - 1)}/></div>
      <div className="chart-axis"><span>{shortDate(days[0])}</span><span>{shortDate(days.at(-1))}</span></div>
      <label className="chart-slider"><span>查看每日收益</span><input aria-label="查看每日收益" type="range" min="0" max={values.length - 1}
        value={cursor ?? values.length - 1} aria-valuetext={selectedDay + '，累计收益 ' + money(value) + ' 元'}
        onChange={event => setCursor(Number(event.target.value))}/><b>{shortDate(selectedDay)}</b></label>
      <SegmentedControl label="收益周期" value={period} onChange={next => {setPeriod(next); setCursor(null);}}
        options={[7, 14, 30].map(id => ({id, label: '近 ' + id + ' 天'}))}/>
    </section>
    {!selected && <><div className="section-caption"><h2>持仓</h2><span>{portfolio.rows.length} 项 · 演示</span></div>
      <SegmentedControl label="持仓类型" value={filter} onChange={setFilter}
        options={[['all', '全部'], ['crypto', '虚拟币'], ['fund', '基金'], ['stock', '股票']].map(([id, label]) => ({id, label}))}/>
      <div className="asset-list">{portfolio.rows.filter(asset => filter === 'all' || asset.type === filter).map(asset => <button
        className="asset-row" key={asset.id} data-focus-key={'asset-' + asset.id}
        ref={element => {if (element) assetButtons.current.set(asset.id, element); else assetButtons.current.delete(asset.id);}}
        onClick={() => selectAsset(asset)} aria-label={'查看' + asset.name + '走势'}>
        <span className="asset-mark" style={{'--asset-color': asset.color}}>{asset.mark}</span>
        <span className="asset-name"><b>{asset.name}</b><small>{asset.symbol} · {asset.category}</small></span>
        <span className={'asset-sparkline ' + signClass(asset.total)}><Trend values={asset.series} mini/></span>
        <span className="asset-pnl"><small>今日收益</small><b className={signClass(asset.today)}>{money(asset.today)}</b>
          <span>累计 <em className={signClass(asset.total)}>{money(asset.total)}</em></span></span><ChevronRight size={15}/>
      </button>)}</div></>}
    {selected && <div className="asset-note"><span className="asset-mark" style={{'--asset-color': selected.color}}>{selected.mark}</span>
      <div><h2>{selected.name}</h2><p>{selected.category} · 演示投入 ¥{money(selected.cost, {sign: false})}</p><p>走势图展示演示持仓盈亏，不代表市场价格。</p></div></div>}
  </div>;
}
