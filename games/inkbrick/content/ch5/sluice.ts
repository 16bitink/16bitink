/**
 * Level 42, "The Lock Keeper". Signature: Layers, pieces: lever + flip walls + shutters. Three stone
 * floors with gaps on alternating sides. The bottom gap is a trap door (shutter) on a beat, the middle
 * gap is shut by stone flip walls that a lever in the corridor under it opens (every hit flips them
 * again), and the top gap is a second trap door a beat behind. Teaches: time the doors, pull the lever,
 * and don't get shut in. Rebuilt 2026-11-18 (was the single-shutter boathouse "The Sluice Gate"; its
 * replay pin, if any, is gone).
 */
import { fill, stone } from '../../src/sim/kit';
import type { BrickDef, FlipDef, LevelDef, ShutterDef } from '../../src/sim/types';

/** A stone floor across the board with gaps (x, w), in cells. */
function floor(y: number, gaps: readonly (readonly [number, number])[]): BrickDef[] {
  const edges = [0, ...gaps.flatMap(([x, w]) => [x, x + w]), 36];
  const runs: BrickDef[] = [];
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1]! > edges[i]!) runs.push(stone(edges[i]!, y, edges[i + 1]! - edges[i]!, 1));
  return runs;
}
const GAPS = [{ x: 5, y: 36, w: 3 }, { x: 28, y: 28, w: 3 }, { x: 5, y: 20, w: 3 }] as const;
const FLOORS = GAPS.flatMap((g) => floor(g.y, [[g.x, g.w]]));
/** The middle gap is a flip wall, shut at the start. */
const FLIPS: FlipDef[] = [{ x: 28, y: 28, w: 3, h: 1, link: 'lock', on: true }];
/** Trap doors on the bottom and top gaps, the top one half a beat behind. */
const SHUTTERS: ShutterDef[] = [
  { x: 5, y: 36, w: 3, h: 1, open: 2.2, closed: 1.6, phase: 2.4 },
  { x: 5, y: 20, w: 3, h: 1, open: 1.8, closed: 1.6, phase: 1.7 },
];
/** A lever on the floor of each corridor the flip wall can shut, away from the gaps. */
const LEVERS: BrickDef[] = [
  { x: 12, y: 35, w: 4, h: 1, kind: 'lever', link: 'lock' },
  { x: 14, y: 27, w: 4, h: 1, kind: 'lever', link: 'lock' },
];
const BAND_SHELLS = [6, 17, 29];
const band = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 2, 'tough', { hp: 2 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (BAND_SHELLS.includes(b.x) ? { ...b, kind: 'x3' as const } : b)),
];
const BANDS = [...band(30), ...band(22)];
const ROOM_SHELLS = fill(0, 16, 36, 1, 'x3', { bw: 1, skip: (x) => x % 4 !== 1 });
const ROOM = [...ROOM_SHELLS, ...fill(0, 4, 36, 6, 'tough', { hp: 3 }), ...fill(0, 10, 36, 6, 'tough', { hp: 3 })];
const TEASERS = [...fill(10, 50, 6, 1, 'tough', { hp: 3 }), ...fill(23, 40, 13, 1, 'tough', { hp: 2 }), ...fill(23, 43, 13, 1, 'soft'), ...fill(26, 46, 10, 1, 'soft')];

export const SLUICE_GATE: LevelDef = {
  id: 'ch5-42-sluice',
  name: 'The Lock Keeper',
  number: 42,
  chapter: 5,
  layout: 'layers',
  par: 110,
  tip: 'Trap doors open on a beat. The lever works the gate.',
  flips: FLIPS,
  shutters: SHUTTERS,
  bricks: [...FLOORS, ...LEVERS, ...BANDS, ...ROOM, ...TEASERS],
};
