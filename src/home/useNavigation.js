import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {BASE} from './api.mjs';

function readRoute() {
  const params = new URLSearchParams(location.search);
  const view = ['finance', 'feed', 'settings'].includes(params.get('view')) ? params.get('view') : 'home';
  return {view, story: view === 'feed' ? params.get('story') : null, key: history.state?.xtKey};
}

export default function useNavigation() {
  const [route, setRoute] = useState(() => {
    if (!history.state?.xtKey) history.replaceState({...history.state, xtKey: crypto.randomUUID(), xtDepth: 0}, '', location.href);
    return readRoute();
  });
  const positions = useRef(new Map());
  const activeKey = useRef(route.key);
  const firstRender = useRef(true);
  const savePosition = useCallback(() => {
    const locked = document.body.style.position === 'fixed';
    const previous = positions.current.get(activeKey.current);
    const scroll = locked ? -(parseFloat(document.body.style.top) || 0) : window.scrollY;
    const focus = document.activeElement?.dataset.focusKey || (locked ? previous?.focus : undefined);
    positions.current.set(activeKey.current, {scroll, focus});
  }, []);
  const go = useCallback((view, story = null, replace = false) => {
    savePosition();
    const params = new URLSearchParams();
    if (view !== 'home') params.set('view', view);
    if (view === 'feed' && story) params.set('story', story);
    const state = {xtKey: crypto.randomUUID(), xtDepth: replace ? 0 : (history.state?.xtDepth || 0) + 1};
    history[replace ? 'replaceState' : 'pushState'](state, '', BASE + (params.size ? '?' + params : ''));
    setRoute(readRoute());
  }, [savePosition]);
  const back = useCallback((fallback = 'home') => {
    savePosition();
    if (history.state?.xtDepth > 0) history.back();
    else go(fallback, null, true);
  }, [go, savePosition]);

  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const onPopState = () => {savePosition(); setRoute(readRoute());};
    window.addEventListener('popstate', onPopState);
    return () => {history.scrollRestoration = previous; window.removeEventListener('popstate', onPopState);};
  }, [savePosition]);

  useLayoutEffect(() => {
    activeKey.current = route.key;
    const initial = firstRender.current;
    firstRender.current = false;
    const restored = positions.current.get(route.key);
    // 恢复阅读位置与触发控件，焦点变化不应再次拉动页面。
    const frame = requestAnimationFrame(() => {
      const target = restored?.focus && document.querySelector('[data-focus-key="' + CSS.escape(restored.focus) + '"]');
      if (!initial) {
        (target || document.querySelector('[data-page-heading]') || document.querySelector('#main-content'))?.focus({preventScroll: true});
        window.scrollTo({top: restored?.scroll || 0, behavior: 'instant'});
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [route.key]);
  return {route, go, back};
}
