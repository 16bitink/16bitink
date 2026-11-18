/**
 * Level 30, "Brumm's Harbour Lock". Signature: chapter 3 boss. Brumm guards the harbour from
 * behind a lock wall. Its big door, beside him, is a gate: the key hangs at the foot of the left
 * bank. A small door on the left is a shutter that opens now and then. Once inside, the stone
 * splits on a crate of x3 and thumps him from every side, and his shield slides along the big
 * door. Pieces: key, gate, shutter, soft, tough, x3, Brumm and his shield.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const WALL_ROW = 11;
const GATE_X = 24;
const GATE_W = 4;
const KEY_X = 8;
const KEY_ROW = 25;

const SIDE_X = 6;
const SIDE_W = 3;
const WALL = [stone(0, WALL_ROW, SIDE_X, 1), stone(SIDE_X + SIDE_W, WALL_ROW, GATE_X - SIDE_X - SIDE_W, 1),
  stone(GATE_X + GATE_W, WALL_ROW, 36 - GATE_X - GATE_W, 1)];
const GATE: BrickDef = { x: GATE_X, y: WALL_ROW, w: GATE_W, h: 1, kind: 'gate', link: 'lock' };
const KEY: BrickDef = { x: KEY_X, y: KEY_ROW, w: 4, h: 1, kind: 'key', link: 'lock' };
// Crates stacked on the quay behind the wall.
const BEHIND = swapKind([...fill(0, 3, 10, 2, 'tough', { hp: 3, tint: 3, bw: 2 }), ...fill(26, 3, 10, 2, 'tough', { hp: 3, tint: 3, bw: 2 }),
  ...fill(0, 5, 10, 2, 'soft', { tint: 3, bw: 2 }), ...fill(26, 5, 10, 2, 'soft', { tint: 3, bw: 2 })], [[26, 6]], 'x3');
const BANK = (x: number, w: number) => [...fill(x, 15, w, 1, 'tough', { hp: 2, bw: 2 }), ...fill(x, 16, w, 9, 'soft', { bw: 2 }),
  ...fill(x, KEY_ROW, w, 1, 'tough', { hp: 2, bw: 2 })];
const notKey = (b: BrickDef) => !(b.y === KEY_ROW && b.x + b.w > KEY_X && b.x < KEY_X + KEY.w);
const FRONT = [...BANK(0, 18).filter(notKey), ...BANK(31, 5)];

export const BRUMMS_HARBOUR_LOCK: LevelDef = {
  id: 'ch3-30-brumm',
  name: "Brumm's Harbour Lock",
  number: 30,
  chapter: 3,
  layout: 'boss',
  par: 115,
  tip: 'Break the key under the left bank to open the big door.',
  shutters: [{ x: SIDE_X, y: WALL_ROW, w: SIDE_W, h: 1, open: 1.2, closed: 2.4, phase: 0 }],
  boss: { hits: 34, shieldW: 6, speed: 8, x: 14, y: 4, w: 8, h: 4, shieldY: WALL_ROW, trackX0: 14, trackX1: 30 },
  bricks: [...WALL, GATE, KEY, ...BEHIND, ...FRONT],
};
