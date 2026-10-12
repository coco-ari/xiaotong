import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEMO_ASSETS,portfolio,daySeries,chartPoints} from '../src/home/data.mjs';
import {MOODS,automaticMoods} from '../src/home/moods.mjs';
import {SCENES} from '../src/home/scenes.mjs';
import {PLAYBACK,playbackAt} from '../src/home/playback.mjs';

test('收益回放：每一天的合计等于所有持仓，最后一天增量等于今日收益',()=>{
  const result=portfolio();
  assert.equal(result.series.length,30);
  result.series.forEach((value,day)=>assert.equal(Math.round(value*100),result.rows.reduce((sum,row)=>sum+Math.round(row.series[day]*100),0)));
  for(const row of [...result.rows,result]){
    assert.equal(row.series.at(-1),row.total);
    assert.equal(Math.round((row.series.at(-1)-row.series.at(-2))*100),Math.round(row.today*100));
  }
  assert.equal(result.total,12680.52);
  assert.equal(result.today,368.24);
  assert.ok(DEMO_ASSETS.some(a=>a.total<0));
  assert.ok(DEMO_ASSETS.some(a=>a.today<0));
});

test('最近 30 天：包含今天且跨年和闰年时没有日期缺失',()=>{
  const days=daySeries('2026-01-10');
  assert.equal(days[0],'2025-12-12');
  assert.equal(days.at(-1),'2026-01-10');
  assert.equal(new Set(days).size,30);
  assert.deepEqual(daySeries('2024-03-01',3),['2024-02-28','2024-02-29','2024-03-01']);
  for(const values of [[1,1,1],[-9,-4,-7],[0],[]]){
    assert.ok(chartPoints(values).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.y>=12&&p.y<=148));
  }
});

test('角色条件：盈利开心、亏损落泪、资讯兴奋、夜间晚安，零收益不误报',()=>{
  assert.deepEqual(automaticMoods({hour:12,todayProfit:10,newItems:1}),['greeting','happy','excited','reading']);
  assert.deepEqual(automaticMoods({hour:23,todayProfit:-10,newItems:0}),['greeting','sad','sleepy']);
  assert.deepEqual(automaticMoods({hour:5,todayProfit:0}),['greeting','sleepy']);
  assert.deepEqual(automaticMoods({hour:6,todayProfit:NaN}),['greeting','reading']);
  assert.equal(new Set(MOODS.map(m=>m.id)).size,6);
  for(const mood of MOODS){
    const png=readFileSync(new URL('../src/home/art/'+mood.file,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.ok([4,6].includes(png[25]),mood.id+' 必须保留透明通道');
  }
});

test('收益动画按日期递进，最后一个交易日稳定后再展示今日收益',()=>{
  const steps=new Set();
  for(let ms=0;ms<=PLAYBACK.draw;ms+=10){
    const frame=playbackAt(ms);
    steps.add(frame.step);
    assert.ok(frame.progress>=0&&frame.progress<=1);
    assert.equal(frame.step,Math.min(29,Math.floor(frame.progress*29)));
  }
  assert.equal(steps.size,30);
  assert.equal(playbackAt(PLAYBACK.draw-1).phase,'drawing');
  assert.deepEqual(playbackAt(PLAYBACK.draw),{progress:1,step:29,phase:'settling'});
  assert.equal(playbackAt(PLAYBACK.draw+PLAYBACK.settle-1).phase,'settling');
  assert.deepEqual(playbackAt(Infinity),{progress:1,step:29,phase:'done'});
});

test('每个心情都存在完整场景资源，雨夜使用相应环境',()=>{
  assert.equal(SCENES.sad.background,'scene-city-rain-v3.png');
  assert.equal(SCENES.sleepy.background,'scene-city-night-v3.png');
  for(const mood of MOODS){
    const scene=SCENES[mood.id];
    assert.equal(scene.lines.length,2);
    const png=readFileSync(new URL('../src/home/art/'+scene.background,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');
  }
});
