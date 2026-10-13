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
const words = new Intl.Segmenter('zh-CN', {granularity: 'word'});
export const textUnits = value => [...segments.segment(value)].map(part => part.segment);

export function fitSceneText(text, width, height, measure) {
  const tokens = paragraph => {
    const result = [];
    const appendWords = value => result.push(...[...words.segment(value)].map(part => part.segment));
    let position = 0;
    for (const match of paragraph.matchAll(/[+\-−]?\d[\d,]*(?:\.\d+)?%?/g)) {
      appendWords(paragraph.slice(position, match.index));
      result.push(match[0]);
      position = match.index + match[0].length;
    }
    appendWords(paragraph.slice(position));
    const grouped = [];
    for (const part of result) {
      // 中文词语保持完整，句末标点跟随前词，避免出现“关／系”或标点独占一行。
      if (grouped.length && (/^[，。？！、：；）》】」』]+$/.test(part) || /^[（《【「『]+$/.test(grouped.at(-1)))) grouped[grouped.length - 1] += part;
      else grouped.push(part);
    }
    return grouped.flatMap(part => measure(part, 16) > width && !/^[+\-−]?\d/.test(part) ? textUnits(part) : [part]);
  };
  const paragraphs = text.split('\n').map(value => value.trim()).filter(Boolean);
  const maxSize = Math.min(44, Math.floor(width / 3));
  // 短文案优先保留作者的语句分行，通过字号适配宽度，不为放大字号拆碎短句。
  if (paragraphs.length > 1 && paragraphs.length <= 4 && textUnits(paragraphs.join('')).length <= 16) {
    for (let size = maxSize; size >= 16; size--) {
      if (paragraphs.every(line => measure(line, size) <= width) && paragraphs.length * size * 1.4 <= height) {
        return {lines: paragraphs, size, lineHeight: 1.4, clipped: false};
      }
    }
  }
  const wrap = size => {
    const lines = [];
    for (const paragraph of paragraphs) {
      let line = [];
      for (const unit of tokens(paragraph)) {
        if (line.length && measure(line.join('') + unit, size) > width) {
          lines.push(line.join('').trimEnd()); line = [];
        }
        if (line.length || unit.trim()) line.push(unit);
      }
      if (line.length) lines.push(line.join('').trimEnd());
    }
    return lines.length ? lines : [' '];
  };
  // 用实际字体测量安全区，从大字号逐步缩小；文字始终留在人物左侧。
  for (let size = maxSize; size >= 16; size--) {
    const lines = wrap(size), lineHeight = 1.4;
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
