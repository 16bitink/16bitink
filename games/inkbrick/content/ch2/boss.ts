/**
 * Level 20, "Brumm's Ice Shelf". Signature: chapter 2 boss. Brumm has moved out onto the ice and
 * grown fatter: he lies in a low ice cave behind a stone shelf with one gap, off to the right. His
 * shield is wider and quicker than on the beach; ice floes drift under the left bank. Inside, his ice garden shatters a band at a time and the
 * stone bounces off his belly again and again. Pieces: ice, floe, soft, tough, Brumm and his shield.
 */
import { fill, stone } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const WALL_ROW = 11;
const GAP_X = 22;
const GAP_W = 4;

const WALL = [stone(0, WALL_ROW, GAP_X, 1), stone(GAP_X + GAP_W, WALL_ROW, 36 - GAP_X - GAP_W, 1)];
// Brumm's ice garden: ice bands between rows of sandcastle, so one hit shatters one band.
const GARDEN = (x: number, w: number) => [...fill(x, 3, w, 1, 'tough', { hp: 3, tint: 2, bw: 2 }), ...fill(x, 4, w, 1, 'ice', { bw: 2 }),
  ...fill(x, 5, w, 1, 'soft', { tint: 2, bw: 2 }), ...fill(x, 6, w, 1, 'ice', { bw: 2 })];
const BEHIND = [...GARDEN(0, 10), ...GARDEN(26, 10)];
// The packed ice in front: banks either side of the lane under the gap, ice bands through them.
const BANK = (x: number, w: number) => [...fill(x, 15, w, 1, 'tough', { hp: 2, bw: 2 }), ...fill(x, 16, w, 4, 'soft', { bw: 2 }),
  ...fill(x, 20, w, 1, 'ice', { bw: 2 }), ...fill(x, 21, w, 6, 'soft', { bw: 2 }), ...fill(x, 27, w, 1, 'ice', { bw: 2 }),
  ...fill(x, 28, w, 3, 'soft', { bw: 2 })];
const FRONT = [...BANK(0, 16), ...BANK(32, 4)];
// Floes drifting in the open water under the left bank: a cell apart, so each needs its own hit.
const FLOES: BrickDef[] = [1, 4, 7].map((x) => ({ x, y: 35, w: 2, h: 1, kind: 'ice', floe: 'drift' }));

export const BRUMMS_ICE_SHELF: LevelDef = {
  id: 'ch2-20-brumm',
  name: "Brumm's Ice Shelf",
  number: 20,
  chapter: 2,
  layout: 'boss',
  par: 120,
  tip: 'Beat the floes and the shield to the gap. Inside, Brumm does the rest.',
  floes: [{ id: 'drift', dx: 6, dy: 0, period: 5 }],
  boss: { hits: 28, shieldW: 6, speed: 11, x: 13, y: 4, w: 8, h: 4, shieldY: WALL_ROW, trackX0: 14, trackX1: 30 },
  bricks: [...WALL, ...BEHIND, ...FRONT, ...FLOES],
};
