import React, {memo, useEffect, useRef, useState} from 'react';
import {motion, useReducedMotion} from 'motion/react';
import Trend from './Trend.jsx';
import {money} from './data.mjs';
import {PLAYBACK, playbackAt} from './playback.mjs';

const ProfitNumber = memo(function ProfitNumber({value, reduced}) {
  const [whole, fraction] = Math.abs(value).toFixed(2).split('.');
  const integer = Number(whole).toLocaleString('en-US');
  const part = (text, prefix) => [...text].map((char, index) => /\d/.test(char)
    ? <span className="reel-slot" key={prefix + index}><motion.span className="digit-reel"
        initial={false} animate={{y: -Number(char) * 10 + '%'}}
        transition={{duration: reduced ? 0 : 0.135, ease: [0.2, 0.65, 0.3, 1]}}>
        {[0,1,2,3,4,5,6,7,8,9].map(n => <span key={n}>{n}</span>)}
      </motion.span></span>
    : <span key={prefix + index} className={char === ' ' ? 'reel-space' : 'reel-separator'}>{char === ' ' ? '\u00a0' : char}</span>);
  return <span className={'profit-number ' + (value >= 0 ? 'positive' : 'negative')} aria-hidden="true">
    <span className="reel-sign">{value < 0 ? '−' : '+'}</span>
    {part(integer, 'i')}<span className="reel-fraction"><span className="reel-point">.</span>{part(fraction, 'f')}</span>
  </span>;
});

function usePlayback(ref, count) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(() => reduced ? playbackAt(Infinity, count) : {...playbackAt(0, count), phase: 'waiting'});
  useEffect(() => {
    if (reduced) {setFrame(playbackAt(Infinity, count)); return;}
    let raf = 0, elapsed = 0, previous = null, inView = false, complete = false;
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
      if (inView && !document.hidden && !complete) raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; sync();}, {threshold: 0.55});
    if (ref.current) observer.observe(ref.current);
    document.addEventListener('visibilitychange', sync);
    return () => {observer.disconnect(); cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', sync);};
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
    <motion.div className="finance-total" initial={false}
      animate={{x: settled ? 0 : '5%', y: settled ? 0 : 64, scale: settled ? 0.47 : 1}}
      transition={{duration: reduced ? 0 : 0.92, ease: [0.22, 1, 0.36, 1]}}>
      <span className="finance-amount-label">累计</span>
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
