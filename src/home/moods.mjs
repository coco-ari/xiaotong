import {SCENE_ASSETS} from '../../shared/scene-assets.mjs';

export const MOODS=SCENE_ASSETS.map(({background,tone,sceneLines,...mood})=>mood);
export function automaticMoods({hour=12,todayProfit=0,newItems=0}={}){
  const ids=['greeting'];
  if(Number.isFinite(todayProfit)&&todayProfit!==0)ids.push(todayProfit>0?'happy':'sad');
  if(newItems>0)ids.push('excited');
  ids.push(hour>=22||hour<6?'sleepy':'reading');
  return ids;
}
