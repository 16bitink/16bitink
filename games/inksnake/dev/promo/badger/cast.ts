import { VIDEO } from '../short';
import { bakeSprite, bakeStrip } from '../sprites';
import type { GameSnake } from '../deer/cta';
import { CORN } from '../../../src/art/snakes/corn';
import { CORN_HEAD } from '../../../src/art/snakes/cornHead';
import type { AdderSprites, BadgerSprites } from './actors';
import { ADDER_HEAD, ADDER_STRIP } from './adderArt';
import { BADGER_BODY } from './badgerBody';
import { BADGER_HEAD } from './badgerHead';
import { paintVeld, type VeldFrame } from './kalahari';

/**
 * The short's cast, baked once at video size: the honey badger (its body
 * in each pose, its head in each), the puff adder (its back and heads),
 * the Kalahari in each framing, and InkSnake's own corn snake for the call
 * to action.
 */
export interface Cast {
  readonly badger: BadgerSprites;
  readonly adder: AdderSprites;
  readonly bg: Readonly<Record<'hook' | 'adder' | 'grab' | 'down' | 'later' | 'laterDusk' | 'lunch' | 'rest', HTMLCanvasElement>>;
  readonly game: GameSnake;
}

const frame = (horizon: number, dusk: number, sun: number, tussocks: VeldFrame['tussocks'], tree?: VeldFrame['tree'], extra = 0): VeldFrame => ({
  width: VIDEO.width + extra, height: VIDEO.height + extra, horizon, dusk, sun, tussocks, tree,
});

export function bakeCast(): Cast {
  const body = { stand: bakeSprite(BADGER_BODY, 'stand', 3, 900), lunge: bakeSprite(BADGER_BODY, 'lunge', 3, 910), flop: bakeSprite(BADGER_BODY, 'flop', 3, 920) };
  const head = Object.fromEntries(BADGER_HEAD.poses.map((p, i) => [p, bakeSprite(BADGER_HEAD, p, 4, 930 + (p === 'gripTop' ? 1 : p === 'gripWinceTop' ? 3 : i) * 10)])) as unknown as BadgerSprites['head'];
  return {
    badger: { body, head },
    adder: { strip: bakeStrip(ADDER_STRIP, 7, 61), head: { top: bakeSprite(ADDER_HEAD, 'top', 10, 970), strike: bakeSprite(ADDER_HEAD, 'strike', 10, 980) } },
    bg: {
      hook: paintVeld(frame(840, 0, 0.75, [[90, 1200, 150], [990, 1180, 120], [40, 1560, 220], [1000, 1640, 200]], { x: 230, base: 860, h: 420 }, 100), 71),
      adder: paintVeld(frame(700, 0, 0.3, [[880, 980, 190], [120, 1040, 160], [980, 1500, 240]], { x: 860, base: 720, h: 330, flip: true }), 73),
      grab: paintVeld(frame(860, 0.05, 0.6, [[60, 1180, 170], [1010, 1230, 150], [500, 1620, 210]], { x: 820, base: 880, h: 400 }), 75),
      down: paintVeld(frame(880, 0.15, 0.4, [[80, 1170, 150], [990, 1210, 170], [920, 1640, 220]], { x: 200, base: 900, h: 380, flip: true }), 77),
      later: paintVeld(frame(880, 0.15, 0.4, [[80, 1170, 150], [990, 1210, 170], [920, 1640, 220]], { x: 200, base: 900, h: 380, flip: true }), 77),
      laterDusk: paintVeld(frame(880, 1, 0.78, [[80, 1170, 150], [990, 1210, 170], [920, 1640, 220]], { x: 200, base: 900, h: 380, flip: true }), 77),
      lunch: paintVeld(frame(860, 0.85, 0.7, [[70, 1190, 160], [1000, 1220, 150], [120, 1640, 230]], { x: 860, base: 880, h: 380 }), 79),
      rest: paintVeld(frame(900, 0.75, 0.25, [[90, 1200, 160], [1000, 1240, 150], [980, 1650, 230]], { x: 210, base: 920, h: 400 }), 81),
    },
    game: { strips: { right: bakeStrip(CORN, 6, 51), left: bakeStrip(CORN, 6, 51) }, head: bakeSprite(CORN_HEAD, 'shut', 6, 660) },
  };
}
