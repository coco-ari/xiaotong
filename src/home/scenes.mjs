import {SCENE_ASSETS} from '../../shared/scene-assets.mjs';

export const SCENES=Object.fromEntries(SCENE_ASSETS.map(({id,background,sceneLines,tone})=>[id,{background,lines:sceneLines,tone}]));

export const COVER_TIMING = { exit: 0.48, background: 1.1, enter: 0.95, characterDelay: 0.22, textDelay: 0.38 };
