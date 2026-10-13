import React, {useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import useMotionPreference from './useMotionPreference.js';
import {COVER_TIMING as TIME} from './scenes.mjs';
import {characterArt} from './art.js';
import {sceneView} from './scene-view.mjs';
import AdaptiveSceneWords from './AdaptiveSceneWords.jsx';
import './scene-presentation.css';

const decoded = new Map();
function loadImage(src) {
  if (!src) return Promise.reject(new Error('场景资源不存在'));
  if (!decoded.has(src)) {
    const img = new Image();
    img.src = src;
    decoded.set(src, img.decode().catch(error => { decoded.delete(src); throw error; }));
  }
  return decoded.get(src);
}
export function preloadScene(value) {
  const scene = sceneView(value);
  return Promise.all([characterArt(scene.character.file), characterArt(scene.background)].map(loadImage));
}

export default function SceneCover({scene: requested, moodId = 'greeting', onChoose, ambient = true, onSettled}) {
  const desired = sceneView(requested || moodId);
  const reduced = useMotionPreference();
  const [ready, setReady] = useState(() => sceneView('greeting'));
  const [background, setBackground] = useState(ready);
  const [phase, setPhase] = useState('idle');
  const [failure, setFailure] = useState('');
  const pending = useRef(ready), displayed = useRef(ready.key), settled = useRef(onSettled);
  settled.current = onSettled;
  const duration = n => reduced ? 0 : n;

  useEffect(() => {
    let cancelled = false;
    preloadScene(desired).then(() => {
      if (cancelled) return;
      setFailure('');
      pending.current = desired;
      if (displayed.current !== desired.key) {
        setPhase('exiting');
        displayed.current = desired.key;
        setReady(desired);
      } else settled.current?.(desired.key);
    }).catch(() => {
      if (cancelled) return;
      // 保留完整旧画面并明确标记，队列仍可继续尝试下一模块。
      setFailure('新场景暂未载入，当前为上一画面');
      settled.current?.(desired.key);
    });
    return () => { cancelled = true; };
  }, [desired.key]);

  return <section className="scene-cover" data-mood={ready.characterId} data-scene={background.backgroundId} data-module={ready.moduleId}
    data-rule={ready.ruleId} data-key={ready.key} data-phase={phase} data-ambient={ambient ? 'running' : 'paused'} aria-label={ready.moduleName + '的角色场景'}>
    <AnimatePresence initial={false}>
      <motion.div key={background.background} className={'scene-environment tone-' + background.tone}
        initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
        transition={{duration: duration(TIME.background), ease: [0.22, 1, 0.36, 1]}}>
        <img className="scene-background" src={characterArt(background.background)} alt="" fetchPriority="high"/>
        <div className="scene-wash"/>
        <div className="scene-light"/>
        <div className="scene-atmosphere" aria-hidden="true"><i/><i/><i/><i/></div>
      </motion.div>
    </AnimatePresence>
    <AnimatePresence initial={false} mode="wait" onExitComplete={() => {
      setBackground(pending.current);
      setPhase('entering');
    }}>
      <motion.div key={ready.key} className={'scene-foreground tone-' + ready.tone}
        initial="hidden" animate="enter" exit="exit"
        variants={{hidden: {opacity: 1}, enter: {opacity: 1, transition: {when: 'afterChildren'}}, exit: {opacity: 0, transition: {duration: duration(TIME.exit)}}}}
        onAnimationComplete={label => {if (label === 'enter') {setPhase('idle'); settled.current?.(ready.key);}}}>
        <motion.div className="scene-character-position" variants={{
          hidden: {opacity: 0, x: 22, y: 9, scale: 1.035},
          enter: {opacity: 1, x: 0, y: 0, scale: 1, transition: {duration: duration(TIME.enter), delay: duration(TIME.characterDelay), ease: [0.16, 1, 0.3, 1]}},
          exit: {opacity: 0, x: -15, y: 5, scale: 0.987, transition: {duration: duration(TIME.exit), ease: [0.4, 0, 1, 1]}},
        }}><img className="scene-character" src={characterArt(ready.character.file)} alt={'小彤：' + ready.character.alt} fetchPriority="high"/></motion.div>
        <AdaptiveSceneWords scene={ready} duration={duration}/>
        <p className="scene-module-caption">{ready.moduleName}{ready.dataStatus === 'unavailable' ? ' · 等待更新' : ready.dataMode === 'demo' ? ' · 演示' : ''}</p>
      </motion.div>
    </AnimatePresence>
    <button className="scene-touch" data-focus-key="moods-open" onClick={onChoose} aria-label="选择小彤的心情"/>
    {failure && <p className="scene-load-status" role="status">{failure}</p>}
  </section>;
}
