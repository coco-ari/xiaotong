import test from 'node:test';
import assert from 'node:assert/strict';
import {fitSceneText, textUnits} from '../src/home/scene-view.mjs';

const measure = (text, size) => textUnits(text).reduce((sum, unit) => sum + (/^[\d+\-., ]$/.test(unit) ? 0.6 : 1) * size, 0);

test('文案排版保持正负金额完整，并在窄屏安全区控制行数和字号', () => {
  for (const width of [108, 126, 158, 286]) {
    for (const amount of ['-15.00', '+368.24', '-12345.67']) {
      const layout = fitSceneText('今天慢一点，\n今日收益 ' + amount + ' 元。', width, 220, measure);
      assert.ok(layout.lines.length <= 4);
      assert.ok(layout.size >= 16);
      assert.ok(layout.lines.some(line => line.includes(amount)), JSON.stringify(layout));
      assert.ok(layout.lines.every(line => measure(line, layout.size) <= width));
    }
  }
});

test('不可容纳的超长数字明确省略，不越界也不无限缩小字体', () => {
  const layout = fitSceneText('1234567890123456789012345678', 108, 180, measure);
  assert.equal(layout.clipped, true);
  assert.equal(layout.size, 16);
  assert.ok(layout.lines[0].endsWith('…'));
  assert.ok(layout.lines.every(line => measure(line, layout.size) <= 108));
});
