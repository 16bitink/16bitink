/**
 * Level 21, "The Lever Locks". Signature: Layers, new piece: lever + flip walls. Three stone floors
 * with gaps on alternating sides (left 2 wide, right, left); the bottom two gaps are shut by stone
 * flip walls at the start. A lever hangs under the bottom floor right over the launch spot, so the
 * first straight shot pulls it: it leans, the walls open (dashed outline), and the climb begins.
 * Every hit flips them again, so a stone in a corridor can be shut in (it rattles the band) until it
 * hits that corridor's own lever. Teaches: a lever works every wall of its colour, both ways.
 * Rebuilt 2026-11-18 (was the key + gate vault "The Harbour Master's Key"; its replay pin is gone).
 * Pieces: lever, flip wall, soft, tough, x3.
 */
import { fill, stone } from '../../src/sim/kit';
import type { BrickDef, FlipDef, LevelDef } from '../../src/sim/types';

/** A stone floor across the board with gaps (x, w), in cells. */
function floor(y: number, gaps: readonly (readonly [number, number])[]): BrickDef[] {
  const edges = [0, ...gaps.flatMap(([x, w]) => [x, x + w]), 36];
  const runs: BrickDef[] = [];
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1]! > edges[i]!) runs.push(stone(edges[i]!, y, edges[i + 1]! - edges[i]!, 1));
  return runs;
}
const GAPS = [{ x: 5, y: 36, w: 2 }, { x: 28, y: 28, w: 3 }, { x: 5, y: 20, w: 3 }] as const;
const FLOORS = GAPS.flatMap((g) => floor(g.y, [[g.x, g.w]]));
/** The bottom two gaps are flip walls (shut at the start); the top gap is always open. */
const FLIPS: FlipDef[] = GAPS.slice(0, 2).map((g) => ({ x: g.x, y: g.y, w: g.w, h: 1, link: 'lock', on: true }));
/**
 * Levers: one under the bottom floor over the launch spot (column 18: the first straight shot finds
 * it; 5+ cells from any wall, or the pocket beside it counts as inside), and one on the floor of each
 * corridor, away from its gaps, so a stone shut in always has a way out.
 */
const LEVERS: BrickDef[] = [
  { x: 16, y: 37, w: 4, h: 1, kind: 'lever', link: 'lock' },
  { x: 32, y: 35, w: 3, h: 1, kind: 'lever', link: 'lock' },
  { x: 1, y: 27, w: 3, h: 1, kind: 'lever', link: 'lock' },
];
/** Each corridor's band: two rows of driftwood over 1 x 1 sandcastle, x3 shells only over the gaps. */
const BAND_SHELLS = [6, 29];
const band = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 2, 'tough', { hp: 2 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (BAND_SHELLS.includes(b.x) ? { ...b, kind: 'x3' as const } : b)),
];
const BANDS = [...band(30), ...band(22)];
/** The top room: x3 shells every 4th cell on its bottom row, driftwood above (2-hit, then 3-hit under the roof). */
const ROOM_SHELLS = fill(0, 16, 36, 1, 'x3', { bw: 1, skip: (x) => x % 4 !== 1 });
const ROOM = [...ROOM_SHELLS, ...fill(0, 4, 36, 6, 'tough', { hp: 3 }), ...fill(0, 10, 36, 6, 'tough', { hp: 2 })];
/** Teasers on the right, away from the gap's lane and the lever's. */
const TEASERS = [...fill(23, 40, 13, 1, 'tough', { hp: 2 }), ...fill(23, 43, 13, 1, 'soft'), ...fill(26, 46, 10, 1, 'soft')];

export const HARBOUR_KEY: LevelDef = {
  id: 'ch3-21-key',
  name: 'The Lever Locks',
  number: 21,
  chapter: 3,
  layout: 'layers',
  par: 110,
  tip: 'Hit the lever to open the floors. It shuts them too!',
  flips: FLIPS,
  bricks: [...FLOORS, ...LEVERS, ...BANDS, ...ROOM, ...TEASERS],
};
