import React, {useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {MOODS} from './moods.mjs';
import {SCENES, COVER_TIMING as TIME} from './scenes.mjs';
import {characterArt} from './art.js';

const decoded = new Map();
function loadImage(src) {
  if (!src) return Promise.reject(new Error('Missing scene asset'));
  if (!decoded.has(src)) {
    const img = new Image();
    img.src = src;
    decoded.set(src, img.decode().catch(error => { decoded.delete(src); throw error; }));
  }
  return decoded.get(src);
}
export function preloadScene(id) {
  const mood = MOODS.find(m => m.id === id) || MOODS[0];
  return Promise.all([characterArt(mood.file), characterArt(SCENES[mood.id].background)].map(loadImage));
}

export default function SceneCover({moodId, onChoose}) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(moodId);
  const [background, setBackground] = useState(moodId);
  const [phase, setPhase] = useState('idle');
  const pending = useRef(moodId);
  const displayed = useRef(moodId);
  const mood = MOODS.find(m => m.id === ready) || MOODS[0];
  const scene = SCENES[ready];
  const duration = n => reduced ? 0 : n;

  useEffect(() => {
    let cancelled = false;
    preloadScene(moodId).then(() => {
      if (cancelled) return;
      pending.current = moodId;
      if (displayed.current !== moodId) {
        setPhase('exiting');
        displayed.current = moodId;
        setReady(moodId);
      }
    }).catch(() => {}); // 保留完整旧场景，加载失败不显示空白。
    return () => { cancelled = true; };
  }, [moodId]);

  return <section className="scene-cover" data-mood={ready} data-scene={background} data-phase={phase} aria-label="小彤的封面">
    <AnimatePresence initial={false}>
      <motion.div key={background} className={'scene-environment tone-' + SCENES[background].tone}
        initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
        transition={{duration: duration(TIME.background), ease: [0.22, 1, 0.36, 1]}}>
        <img className="scene-background" src={characterArt(SCENES[background].background)} alt="" fetchPriority="high"/>
        <div className="scene-wash"/>
        <div className="scene-light"/>
        <div className="scene-atmosphere" aria-hidden="true"><i/><i/><i/><i/></div>
      </motion.div>
    </AnimatePresence>
    <AnimatePresence initial={false} mode="wait" onExitComplete={() => {
      setBackground(pending.current);
      setPhase('entering');
    }}>
      <motion.div key={ready} className={'scene-foreground tone-' + scene.tone}
        initial="hidden" animate="enter" exit="exit"
        variants={{hidden: {opacity: 1}, enter: {opacity: 1}, exit: {opacity: 0, transition: {duration: duration(TIME.exit)}}}}
        onAnimationComplete={label => {if (label === 'enter') setPhase('idle');}}>
        <motion.div className="scene-character-position" variants={{
          hidden: {opacity: 0, x: 22, y: 9, scale: 1.035},
          enter: {opacity: 1, x: 0, y: 0, scale: 1, transition: {duration: duration(TIME.enter), delay: duration(TIME.characterDelay), ease: [0.16, 1, 0.3, 1]}},
          exit: {opacity: 0, x: -15, y: 5, scale: 0.987, transition: {duration: duration(TIME.exit), ease: [0.4, 0, 1, 1]}},
        }}><img className="scene-character" src={characterArt(mood.file)} alt={'小彤：' + mood.alt} fetchPriority="high"/></motion.div>
        <h1 className="scene-words">{scene.lines.map((line, index) => <span className="scene-line-mask" key={line}>
          <motion.span variants={{
            hidden: {opacity: 0, y: 24},
            enter: {opacity: 1, y: 0, transition: {duration: duration(0.8), delay: duration(TIME.textDelay + index * 0.11), ease: [0.16, 1, 0.3, 1]}},
            exit: {opacity: 0, y: -9, transition: {duration: duration(0.3)}},
          }}>{line}</motion.span>
        </span>)}</h1>
      </motion.div>
    </AnimatePresence>
    <button className="scene-touch" onClick={onChoose} aria-label="选择小彤的心情"/>
  </section>;
}
