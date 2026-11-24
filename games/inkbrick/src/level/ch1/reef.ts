/**
 * Level 7, "The Pearl Reef". Signature: Multiplier core. A reef of stone in the middle of the cove,
 * its door below and its door above both 10 cells wide, with a row of tiny x3 shells
 * inside: break in and the stones multiply and pour out of the top onto the kelp beds. Open water
 * down both sides. Pieces: soft, tough, x3, keg (barrels in the kelp end the hunt). Mirrored.
 */
import { fill, shell } from '../../sim/kit';
import type { BrickDef, LevelDef } from '../../sim/types';

const X = 8;
const Y = 18;
const W = 20;
const H = 12;
const DOOR = 10;
const REEF = shell(X, Y, W, H, [{ side: 'bottom', at: 5, width: DOOR }, { side: 'top', at: 5, width: DOOR }]);
// A row of x3 shells across the room, over a sandcastle heap on each side of the door.
const CORE = [
  ...fill(X + 1, Y + 4, W - 2, 1, 'soft', { bw: 1 }).map((b): BrickDef => ((b.x - X) % 2 === 1 && b.x !== X + 9 && b.x !== X + 11 ? { ...b, kind: 'x3' } : b)),
  ...fill(X + 1, Y + 7, 3, 3, 'soft'), ...fill(X + W - 4, Y + 7, 3, 3, 'soft'),
];
// Barrels: built untinted (a tinted brick is drawn as a picture brick, so a barrel's art wouldn't show).
const BARRELS = new Set(['0,7', '33,7', '9,7', '24,7', '0,11', '33,11']);
const KELP = [...fill(0, 5, 36, 5, 'soft', { tint: 2 }), ...fill(0, 10, 36, 1, 'tough', { hp: 2 }), ...fill(0, 11, 36, 2, 'soft', { tint: 2 })]
  .map((b): BrickDef => (BARRELS.has(`${b.x},${b.y}`) ? { x: b.x, y: b.y, w: b.w, h: b.h, kind: 'keg' } : b));
// A few teasers low on the sides, the lane under the door kept clear.
const TEASERS = [...fill(0, 35, 6, 1, 'soft'), ...fill(30, 35, 6, 1, 'soft')];

export const PEARL_REEF: LevelDef = {
  id: 'ch1-07-reef',
  name: 'The Pearl Reef',
  number: 7,
  chapter: 1,
  layout: 'core',
  par: 75,
  tip: 'x3 shells split stones. Get in and pour out the top!',
  inside: [{ x: X + 1, y: Y + 1, w: W - 2, h: H - 2 }],
  bricks: [...REEF, ...CORE, ...KELP, ...TEASERS],
};
