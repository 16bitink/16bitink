/**
 * Level 21, "The Lock Keepers Stairs". Signature: Layers, new piece: lever + flip walls.
 * WIP.
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
const GAP_W = 3;
const GAPS = [{ x: 5, y: 36 }, { x: 28, y: 28 }, { x: 5, y: 20 }] as const;
const FLOORS = GAPS.flatMap((g) => floor(g.y, [[g.x, GAP_W]]));
/** The bottom two gaps are flip walls (shut at the start); the top gap is a gate opened by the key. */
const FLIPS: FlipDef[] = GAPS.slice(0, 2).map((g) => ({ x: g.x, y: g.y, w: GAP_W, h: 1, link: 'lock', on: true }));
const GATE: BrickDef = { x: GAPS[2].x, y: GAPS[2].y, w: GAP_W, h: 1, kind: 'gate', link: 'loft' };
/** Levers: one low by the left wall in the water, one on the floor of each corridor (a stone shut in can always get out). */
const LEVERS: BrickDef[] = [
  { x: 1, y: 41, w: 3, h: 1, kind: 'lever', link: 'lock' },
  { x: 32, y: 35, w: 3, h: 1, kind: 'lever', link: 'lock' },
  { x: 1, y: 27, w: 3, h: 1, kind: 'lever', link: 'lock' },
];
const band = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 2, 'tough', { hp: 2 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 8 === 1 ? { ...b, kind: 'x3' as const } : b)),
];
const BANDS = [...band(30), ...band(22)];
/** The key hangs at the right end of the top corridor's band, under the gate's far side. */
const KEY: BrickDef = { x: 31, y: 22, w: 3, h: 2, kind: 'key', link: 'loft' };
const ROOM_SHELLS = fill(0, 16, 36, 1, 'x3', { bw: 1, skip: (x) => x % 2 !== 0 });
const ROOM = [...ROOM_SHELLS, ...fill(0, 4, 36, 6, 'tough', { hp: 3 }), ...fill(0, 10, 36, 6, 'tough', { hp: 2 })];
const TEASERS = [...fill(15, 39, 21, 1, 'tough', { hp: 2 }), ...fill(15, 42, 21, 1, 'soft')];

const minusKey = (bricks: readonly BrickDef[]): BrickDef[] =>
  bricks.filter((b) => !(b.y < KEY.y + KEY.h && b.y + b.h > KEY.y && b.x < KEY.x + KEY.w && b.x + b.w > KEY.x));

export const HARBOUR_KEY: LevelDef = {
  id: 'ch3-21-key',
  name: 'The Lock Keepers Stairs',
  number: 21,
  chapter: 3,
  layout: 'layers',
  par: 110,
  tip: 'Hit the lever to open the floors. It shuts them too!',
  flips: FLIPS,
  bricks: [...FLOORS, GATE, ...LEVERS, ...minusKey(BANDS), KEY, ...ROOM, ...TEASERS],
};
