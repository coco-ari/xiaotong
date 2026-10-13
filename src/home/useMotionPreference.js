import {useSyncExternalStore} from 'react';

const query = '(prefers-reduced-motion: reduce)';
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => true;
function subscribe(notify) {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}

// 系统设置运行中改变时，CSS 和脚本动画必须同时响应。
export default function useMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
