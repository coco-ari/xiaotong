import {MOODS} from './moods.mjs';
import {SCENES} from './scenes.mjs';

export function sceneView(scene, variant = 0) {
  if (typeof scene === 'string' || !scene) {
    const id = MOODS.some(mood => mood.id === scene) ? scene : 'greeting';
    scene = {id: 'preview-' + id, moduleId: 'preview', moduleName: '形象预览', characterId: id, backgroundId: id,
      templates: [SCENES[id].lines.join('\n')], dataMode: 'local', dataStatus: 'ready'};
  }
  const character = MOODS.find(mood => mood.id === scene.characterId) || MOODS[0];
  const backgroundId = SCENES[scene.backgroundId] ? scene.backgroundId : 'greeting';
  const text = scene.text ?? scene.templates[variant % scene.templates.length];
  return {...scene, characterId: character.id, backgroundId, character, background: SCENES[backgroundId].background,
    tone: SCENES[backgroundId].tone, text,
    key: JSON.stringify([scene.id, character.id, backgroundId, text, scene.dataMode, scene.dataStatus])};
}

const segments = new Intl.Segmenter('zh-CN', {granularity: 'grapheme'});
export const textUnits = value => [...segments.segment(value)].map(part => part.segment);

export function fitSceneText(text, width, height, measure) {
  const tokens = paragraph => {
    const result = [];
    let position = 0;
    for (const match of paragraph.matchAll(/[+\-−]?\d[\d,]*(?:\.\d+)?%?/g)) {
      result.push(...textUnits(paragraph.slice(position, match.index)), match[0]);
      position = match.index + match[0].length;
    }
    return [...result, ...textUnits(paragraph.slice(position))];
  };
  const wrap = size => {
    const lines = [];
    for (const paragraph of text.split('\n').filter(Boolean)) {
      let line = [];
      for (const unit of tokens(paragraph)) {
        if (line.length && measure(line.join('') + unit, size) > width) {
          // 金额整体换行，中文句末标点尽量与前一个字一起保留。
          const previous = /^[，。？！、：；）》】」』]$/.test(unit) && line.length > 1 ? line.pop() : null;
          lines.push(line.join('').trimEnd()); line = previous ? [previous] : [];
        }
        if (line.length || unit.trim()) line.push(unit);
      }
      if (line.length) lines.push(line.join('').trimEnd());
    }
    return lines.length ? lines : [' '];
  };
  // 用实际字体测量安全区，从大字号逐步缩小；文字始终留在人物左侧。
  for (let size = Math.min(49, Math.floor(width / 3)); size >= 16; size--) {
    const lines = wrap(size), lineHeight = lines.length > 2 ? 1.4 : 1.55;
    if (lines.length <= 4 && lines.every(line => measure(line, size) <= width) && lines.length * size * lineHeight <= height) return {lines, size, lineHeight, clipped: false};
  }
  const all = wrap(16), lines = all.slice(0, 4);
  let clipped = all.length > 4;
  lines.forEach((line, index) => {
    if (measure(line, 16) <= width && !(index === 3 && all.length > 4)) return;
    clipped = true;
    const units = textUnits(line);
    while (units.length && measure(units.join('') + '…', 16) > width) units.pop();
    lines[index] = units.join('') + '…';
  });
  return {lines, size: 16, lineHeight: 1.4, clipped};
}
