/**
 * Level 14, "The Puffin Hut". Signature: Vault, goal Rescue, new piece for the vault: drifting floes.
 * A stone hut with a 3-wide door in its floor at the left and an empty chimney (lined with sandcastle
 * and three x3 shells) up to a band under the roof. Inside, bands of ice and driftwood fill the hut
 * flush to its right wall, so the puffin's pen in the far bottom-right corner (3-hit driftwood, a
 * 3-hit cap) must be chewed down to, not reached down an open side corridor (that corridor made the
 * rescue luck: CV 0.81). Two kegs, 3 rows apart so they chain, sit over and against the pen's left
 * wall: the dig that reaches them blows the wall open. Outside: two floes of ice drift along the lower
 * board (the west one only 3 cells, or it shuts the door: aim 2.1% at 8 cells), a band under the floor
 * where returns land, and one 3-hit launch-screen plank from `screenLaunch` on row 50 (the full
 * three-plank screen cut the aim window to 1.3%). Pieces: ice floe, ice, soft, tough, x3, keg.
 * Lab (30 runs): 9/10, MISS luck 0.55 (aim 3.9%, break-in novice 33.6 s, skilled 9.9 s, cascade 37%,
 * drought 4.5 s, rescue skilled 46.7 s, novice clears 80%). At 20 runs 10/10 (luck 0.43). The luck
 * tail is re-entry: a decent run that loses its stones out of the door can take 4 minutes to dig the
 * last rows. Five lining x3 (0.82) or a 3-hit row 22 (0.59) made it worse.
 */
import { fill, minus, shell, stone } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const SHELL = shell(6, 10, 24, 20, [{ side: 'bottom', at: 2, width: 3 }]);
const PUFFIN = { x: 27, y: 26, who: 'puffin' as const };
/** A band of the hut's fill, x 12-28, flush with the right wall (no corridor down to the pen). */
const band = (y: number, h: number, kind: 'soft' | 'tough' | 'ice', hp?: number): BrickDef[] => [
  ...fill(12, y, 15, h, kind, hp ? { hp } : {}), ...fill(27, y, 2, h, kind, { bw: 2, ...(hp ? { hp } : {}) }),
];
// The chimney's side (x 11): 1 x 1 sandcastle with x3 shells, so the stone climbing the chimney splits.
const LINING: BrickDef[] = fill(11, 14, 1, 15, 'soft', { bw: 1 }).map((b) => (b.y % 4 === 1 ? { ...b, kind: 'x3' as const } : b));
// Two kegs over and against the pen's left wall (3 rows apart, so they chain): the dig that reaches either blows the wall open.
const PEN_KEG: BrickDef = { x: 23, y: 26, w: 1, h: 1, kind: 'keg' };
const ROOF_KEG: BrickDef = { x: 23, y: 23, w: 1, h: 1, kind: 'keg' };
const INSIDE = [...minus([
  ...band(14, 4, 'ice'), ...band(18, 2, 'tough', 2), ...band(20, 2, 'tough', 3), ...band(22, 1, 'ice'), ...band(23, 2, 'tough', 2), ...band(25, 4, 'soft'),
], [stone(21, 25, 8, 4), stone(21, 23, 3, 1)]),
  ...fill(21, 25, 2, 4, 'soft', { bw: 2 }), ...fill(23, 25, 1, 4, 'soft', { bw: 1 }).filter((b) => b.y !== PEN_KEG.y), PEN_KEG,
  { x: 21, y: 23, w: 2, h: 1, kind: 'tough' as const, hp: 2 }, ROOF_KEG];
// The pen: 3-hit driftwood on its left and a 3-hit cap over the puffin, in the corner farthest from the door.
const PEN = [...fill(24, 25, 3, 4, 'tough', { hp: 3 }), ...fill(27, 25, 2, 1, 'tough', { hp: 3, bw: 2 })];
const TOP = [...fill(0, 3, 36, 1, 'soft', { tint: 1 }), ...fill(0, 4, 36, 3, 'ice')];
const SIDES = [...fill(0, 12, 3, 6, 'soft'), ...fill(31, 12, 3, 6, 'soft')];
// Where returns land: a band under the hut's floor, away from the door.
const WINGS = fill(15, 31, 15, 2, 'soft');
// The launch screen from \`screenLaunch\` (src/gen/screen.ts, LOW_SCREEN_ROWS): driftwood across the launch spot's shots at the door.
const SCREEN = [14].map((x) => ({ x, y: 50, w: 3, h: 1, kind: 'tough' as const, hp: 3 }));
const FLOES = [...fill(0, 32, 6, 2, 'ice', { floe: 'west' }), ...fill(30, 36, 6, 2, 'ice', { floe: 'east' })];

export const ICE_HUT: LevelDef = {
  id: 'ch2-14-hut',
  name: 'The Puffin Hut',
  number: 14,
  chapter: 2,
  layout: 'vault',
  goal: 'rescue',
  rescue: PUFFIN,
  par: 115,
  tip: 'Slip in the door and free the puffin in the far corner.',
  floes: [{ id: 'west', dx: 3, dy: 0, period: 7 }, { id: 'east', dx: -8, dy: 0, period: 7 }],
  bricks: [...SHELL, ...LINING, ...INSIDE, ...PEN, ...TOP, ...SIDES, ...WINGS, ...SCREEN, ...FLOES],
};
