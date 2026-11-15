import { lengths, spineOf } from '../pythonbear/python';
import type { Pt } from '../sprites';
import { adderShare, type BadgerPose, drawAdderBody, drawBadger, headPoint } from './actors';
import { GRIP_AT } from './badgerHead';
import type { Cast } from './cast';
import { evening, vignette } from './fx';
import { chewAt, leftAt } from './story';

/**
 * "and finishes its lunch!": evening, closer in. The badger stands over
 * what is left of the adder, chewing, its jaws on the snake; the last of
 * the body, then the stubby tail, slides up off the sand and into its
 * mouth (the chevrons travelling with it). Then it is gone and the badger
 * shuts its jaws, pleased. No blood, no torn flesh: only the tail end goes
 * in.
 */
const GROUND = 1400;
const POSE: BadgerPose = { at: { x: 470, y: GROUND }, scale: 2.4, body: 'stand', head: 'grip' };
const BASE = 76;
/** The whole adder's length at this scale, and the most of it ever seen here (its back part). */
const SNAKE_LEN = 900;
const SHOWN = 400;

function tailPath(grip: Pt): Pt[] {
  return spineOf([grip, { x: grip.x + 4, y: grip.y + 60 }, { x: grip.x - 10, y: GROUND - 6 }, { x: grip.x + 60, y: GROUND + 34 }, { x: grip.x + 170, y: GROUND + 40 }, { x: grip.x + 230, y: GROUND + 20 }], 3);
}

export function drawLunch(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const left = leftAt(t);
  const chew = chewAt(t);
  const eating = left > 0;
  const pose: BadgerPose = { ...POSE, head: eating ? 'grip' : 'shut', nod: eating ? -0.05 + 0.07 * chew : -0.04 * chew };
  ctx.drawImage(cast.bg.lunch, 0, 0);
  drawBadger(ctx, cast.badger, boil, pose);
  if (eating) {
    const grip = headPoint(pose, GRIP_AT);
    const path = tailPath(grip);
    const s = lengths(path);
    const shown = SHOWN * left;
    const spine = path.filter((_, i) => s[i]! <= shown);
    if (spine.length >= 2) {
      const f0 = 1 - shown / SNAKE_LEN;
      drawAdderBody(ctx, cast.adder, boil, { spine, base: BASE, share: (u) => adderShare(f0 + (1 - f0) * u), offset: (SNAKE_LEN - shown) / (BASE / 24) }, 0.8);
    }
    drawBadger(ctx, cast.badger, boil, { ...pose, head: 'gripTop' }, 'head');
  }
  evening(ctx, 0.55);
  vignette(ctx, 0.5, 1150);
}
