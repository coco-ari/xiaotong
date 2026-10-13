import {useCallback, useEffect, useMemo, useState} from 'react';
import {buildSceneQueue} from '../../shared/scene-engine.mjs';
import {preloadScene} from './SceneCover.jsx';
import {sceneView} from './scene-view.mjs';

export default function useScenePlaylist({presentation, snapshots, plugins, enabled, onHome, manualScene, now}) {
  const queue = useMemo(() => buildSceneQueue(presentation, snapshots, {now, plugins}), [presentation, snapshots, now, plugins]);
  const [cursor, setCursor] = useState({moduleId: 'daily', round: 0});
  const index = Math.max(0, queue.findIndex(scene => scene.moduleId === cursor.moduleId));
  const scene = useMemo(() => manualScene || sceneView(queue[index], cursor.round), [manualScene, queue, index, cursor.round]);
  const [settledKey, setSettledKey] = useState(null);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(!document.hidden);
  const onSettled = useCallback(key => setSettledKey(key), []);

  useEffect(() => {
    const update = () => setForeground(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (!onHome) {setVisible(false); return;}
    const cover = document.querySelector('.scene-cover');
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2), {threshold: [0, 0.2]});
    if (cover) observer.observe(cover);
    return () => observer.disconnect();
  }, [onHome]);

  const canAdvance = enabled && onHome && visible && foreground && !manualScene;
  const nextIndex = (index + 1) % queue.length;
  const nextRound = cursor.round + (nextIndex === 0 ? 1 : 0);
  const next = sceneView(queue[nextIndex], nextRound);
  const hasNext = queue.length > 1 || queue[0].templates.length > 1;
  useEffect(() => {
    if (!canAdvance || settledKey !== scene.key) return;
    if (!hasNext) return;
    // 停留时间从完整入场后计算，预加载与转场不挤占阅读时间。
    void preloadScene(next).catch(() => {});
    const timer = setTimeout(() => setCursor({moduleId: next.moduleId, round: nextRound}), presentation.intervalSeconds * 1000);
    return () => clearTimeout(timer);
  }, [canAdvance, settledKey, scene.key, next.key, next.moduleId, nextRound, hasNext, presentation.intervalSeconds]);
  return {scene, queue, onSettled, ambient: canAdvance};
}
