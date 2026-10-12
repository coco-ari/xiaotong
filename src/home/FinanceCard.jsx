import React, {memo, useEffect, useRef, useState} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import NumberFlow from '@number-flow/react';
import Trend from './Trend.jsx';
import {money} from './data.mjs';
import {PLAYBACK, playbackAt} from './playback.mjs';

const AMOUNT_FORMAT = {minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero', useGrouping: true};
const NUMBER_TIMING = {duration: 340, easing: 'cubic-bezier(.22,1,.36,1)'};
const SPIN_TIMING = {duration: 240, easing: 'cubic-bezier(.2,.65,.3,1)'};
const OPACITY_TIMING = {duration: 140, easing: 'ease-out'};
const ProfitNumber = memo(function ProfitNumber({value, reduced}) {
  return <NumberFlow className={'profit-number ' + (value >= 0 ? 'positive' : 'negative')}
    value={value} locales="en-US" format={AMOUNT_FORMAT} animated={!reduced}
    transformTiming={NUMBER_TIMING} spinTiming={SPIN_TIMING} opacityTiming={OPACITY_TIMING}
    respectMotionPreference aria-hidden="true"/>;
});

function usePlayback(ref, count) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(() => reduced ? playbackAt(Infinity, count) : {...playbackAt(0, count), phase: 'waiting'});
  useEffect(() => {
    if (reduced) {setFrame(playbackAt(Infinity, count)); return;}
    let raf = 0, elapsed = 0, previous = null, inView = false, complete = false, fontReady = false, disposed = false;
    setFrame({...playbackAt(0, count), phase: 'waiting'});
    const tick = now => {
      if (previous !== null) elapsed += Math.min(now - previous, 64);
      previous = now;
      setFrame(playbackAt(elapsed, count));
      complete = elapsed >= PLAYBACK.draw + PLAYBACK.settle + PLAYBACK.reveal;
      if (!complete) raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(raf); previous = null;
      if (inView && fontReady && !document.hidden && !complete && !disposed) raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {inView = entry.intersectionRatio >= 0.55; sync();}, {threshold: 0.55});
    if (ref.current) observer.observe(ref.current);
    // 字体稳定后开始回放，避免加载时数字宽度突然改变。
    document.fonts.load('500 60px "Inter Variable"').catch(() => {}).then(() => {fontReady = true; sync();});
    document.addEventListener('visibilitychange', sync);
    return () => {disposed = true; observer.disconnect(); cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', sync);};
  }, [count, reduced]);
  return frame;
}

export default function FinanceCard({onOpen, portfolio, days}) {
  const ref = useRef(null), reduced = useReducedMotion(), frame = usePlayback(ref, days.length);
  const settled = frame.phase === 'settling' || frame.phase === 'done';
  const total = portfolio.series[frame.step];
  return <section ref={ref} className={'finance-card quiet-finance ' + (portfolio.total >= 0 ? 'positive' : 'negative')}
    data-phase={frame.phase} data-day={days[frame.step]} aria-label="收益概览，演示数据">
    <button className="card-open-layer" onClick={onOpen} aria-label="查看收益详情"/>
    <div className="finance-scene-chart"><Trend values={portfolio.series} progress={frame.progress}/></div>
    <span className="finance-demo">演示</span>
    <motion.span className="finance-total-label finance-amount-label" initial={false}
      animate={{y: settled ? 0 : 64}}
      transition={{duration: reduced ? 0 : 0.92, ease: [0.22, 1, 0.36, 1]}}>累计</motion.span>
    <motion.div className="finance-total" initial={false}
      animate={{x: settled ? 0 : 5, y: settled ? 0 : 64, scale: settled ? 0.54 : 1}}
      transition={{duration: reduced ? 0 : 0.92, ease: [0.22, 1, 0.36, 1]}}>
      <ProfitNumber value={total} reduced={reduced}/>
    </motion.div>
    <motion.div className="finance-today" initial={false}
      animate={{opacity: frame.phase === 'done' ? 1 : 0, y: frame.phase === 'done' ? 0 : 16}}
      transition={{duration: reduced ? 0 : 0.55, ease: [0.16, 1, 0.3, 1]}} aria-hidden={frame.phase !== 'done'}>
      <span className="finance-amount-label">今日</span><ProfitNumber value={portfolio.today} reduced={reduced}/>
    </motion.div>
    <div className="finance-dates" aria-hidden="true"><span>{days[0].slice(5).replace('-', '.')}</span>
      {!settled && <span className="finance-current-day">{days[frame.step].slice(5).replace('-', '.')}</span>}
      <span>{days.at(-1).slice(5).replace('-', '.')}</span></div>
    <span className="sr-only">演示累计收益 {money(portfolio.total)} 元，今日收益 {money(portfolio.today)} 元。点击查看详情。</span>
  </section>;
}
