import { RED_FINISH } from '../../../src/art/brineFauna';
import { drawRockslide, ROCKSLIDE_ART, type RockslidePose } from '../../../src/art/creatures/rockslide';
import { makeDraw } from '../../../src/art/kit';
import { BOIL, RED } from '../../../src/art/palette';
import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND, type Pose } from '../../../src/art/prospector';
import { PROSPECTOR_FINISH, render } from '../../../src/art/textures';
import { evenLoadout, prospectorLook } from '../../../src/logic/gear';
import { bakeSprite, type Sprite } from '../sprites';

/** The game's own drawings at video size: the prospector at Brine's marks of gear (Talus comes after it), and the Rockslide front on, as in play. */
export interface Figures {
  readonly fly: Sprite;
  readonly drill: Sprite;
  readonly idle: Sprite;
  readonly walk: Sprite;
  readonly sleep: Sprite;
  readonly awake: Sprite;
}

const FRAME = { w: PROSPECTOR_FRAME, h: PROSPECTOR_FRAME, ox: PROSPECTOR_FRAME / 2, oy: PROSPECTOR_FRAME / 2 + PROSPECTOR_GROUND };
/** The prospector's feet, under its origin (drawing units). */
export const FEET = PROSPECTOR_GROUND;
/** Canvas px per drawing unit: the giant is shown up to 4 px a unit, so a little over. */
const GIANT_RES = 5;
const POSE_SEED: Readonly<Record<RockslidePose, number>> = { sleep: 7700, stir: 7710, awake: 7720 };

/** The Rockslide as the game bakes it (talusFauna.ts): red ink and finish, only finer. */
function bakeGiant(pose: RockslidePose): Sprite {
  const { w, h, ox, oy } = ROCKSLIDE_ART;
  const frames = Array.from({ length: BOIL }, (_, f) =>
    render(w, h, ox, oy, GIANT_RES, (ctx) => drawRockslide(makeDraw(ctx, POSE_SEED[pose] + f, f, 0, RED), pose), RED_FINISH));
  return { frames, frame: ROCKSLIDE_ART, res: GIANT_RES };
}

export function makeFigures(): Figures {
  const look = prospectorLook(evenLoadout(3));
  const bake = (pose: Pose, seed: number): Sprite => bakeSprite(FRAME, 8, seed, (d) => drawProspector(d, pose, look), PROSPECTOR_FINISH);
  return { fly: bake('fly', 100), drill: bake('drillDown', 110), idle: bake('idle', 120), walk: bake('walk', 130), sleep: bakeGiant('sleep'), awake: bakeGiant('awake') };
}
