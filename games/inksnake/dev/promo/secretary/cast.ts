import { VIDEO } from '../short';
import { bakeSprite, bakeStrip } from '../sprites';
import type { GameSnake } from '../deer/cta';
import { CORN } from '../../../src/art/snakes/corn';
import { CORN_HEAD } from '../../../src/art/snakes/cornHead';
import { paintVeld, type VeldFrame } from '../badger/kalahari';

/**
 * The short's backdrops, painted once: the savanna at golden hour (the
 * badger short's veld, its light run most of the way to evening) for the
 * hook and the aim, the meeting and the dramatic low kick, and InkSnake's
 * own corn snake for the call to action. The bird and the snakes are drawn
 * live (bird.ts, snake.ts).
 */
export interface Cast {
  readonly bg: Readonly<Record<'hook' | 'meet' | 'kick', HTMLCanvasElement>>;
  readonly game: GameSnake;
}

/** Backdrops are this much bigger than the frame each way, for the camera's moves. */
export const BG_PAD = 120;

const frame = (horizon: number, dusk: number, sun: number, tussocks: VeldFrame['tussocks'], tree?: VeldFrame['tree']): VeldFrame => ({
  width: VIDEO.width + BG_PAD * 2, height: VIDEO.height + BG_PAD * 2, horizon, dusk, sun, tussocks, tree,
});

export function bakeCast(): Cast {
  return {
    bg: {
      hook: paintVeld(frame(1010, 0.42, 0.8, [[60, 1500, 230], [1240, 1480, 200], [160, 1880, 280], [1150, 1900, 260], [700, 1960, 200]], { x: 1050, base: 1030, h: 420, flip: true }), 91),
      meet: paintVeld(frame(1080, 0.36, 0.22, [[90, 1560, 220], [1200, 1600, 240], [640, 1980, 260]], { x: 230, base: 1100, h: 460 }), 93),
      kick: paintVeld(frame(1180, 0.72, 0.7, [[80, 1600, 260], [1220, 1640, 240], [300, 2000, 300]], { x: 1000, base: 1200, h: 360, flip: true }), 95),
    },
    game: { strips: { right: bakeStrip(CORN, 6, 51), left: bakeStrip(CORN, 6, 51) }, head: bakeSprite(CORN_HEAD, 'shut', 6, 660) },
  };
}
