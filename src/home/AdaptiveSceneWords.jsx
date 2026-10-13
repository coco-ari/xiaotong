import React, {useLayoutEffect, useRef, useState} from 'react';
import {motion} from 'motion/react';
import {fitSceneText} from './scene-view.mjs';
import {COVER_TIMING as TIME} from './scenes.mjs';

export default function AdaptiveSceneWords({scene, duration}) {
  const ref = useRef(null);
  const [layout, setLayout] = useState({lines: scene.text.split('\n'), size: 28, lineHeight: 1.5, clipped: false});
  useLayoutEffect(() => {
    let disposed = false;
    const element = ref.current, cover = element.closest('.scene-cover');
    const context = document.createElement('canvas').getContext('2d');
    const measure = () => {
      if (disposed || !context) return;
      const rect = cover.getBoundingClientRect(), style = getComputedStyle(element);
      // 文案限制在封面中上部，为下方插画与人物发梢保留空间。
      setLayout(fitSceneText(scene.text, rect.width * 0.44 - 4, rect.height * 0.44, (value, size) => {
        context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
        return context.measureText(value).width;
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(cover);
    document.fonts.ready.then(measure);
    return () => {disposed = true; observer.disconnect();};
  }, [scene.text]);
  return <h1 ref={ref} className="scene-words scene-adaptive-words" aria-label={scene.text}
    data-clipped={layout.clipped || undefined} style={{fontSize: layout.size, lineHeight: layout.lineHeight}}>
    {layout.lines.map((line, index) => <span className="scene-line-mask" key={index} aria-hidden="true">
      <motion.span variants={{
        hidden: {opacity: 0, y: 18},
        enter: {opacity: 1, y: 0, transition: {duration: duration(0.6), delay: duration(TIME.textDelay + index * 0.07), ease: [0.16, 1, 0.3, 1]}},
        exit: {opacity: 0, y: -7, transition: {duration: duration(0.25)}},
      }}>{line}</motion.span>
    </span>)}
  </h1>;
}
