/**
 * Level 40, "Brumm's Whirlpool Den". Signature: chapter 4 boss. Brumm hides at the back of the sea
 * cave behind a rock wall with a single door on the right, and a spinner turns in that door. The
 * other way in is the whirlpool low on the left: a stone through it comes up behind the wall. His
 * shield is short and quick and rides just under him, and a second spinner churns beside him.
 * Pieces: whirlpool, spinner, soft, tough, x3, Brumm and his shield.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { LevelDef } from '../../src/sim/types';

const WALL_ROW = 14;
const DOOR_X = 25;
const DOOR_W = 4;

const WALL = [stone(0, WALL_ROW, DOOR_X, 1), stone(DOOR_X + DOOR_W, WALL_ROW, 36 - DOOR_X - DOOR_W, 1)];
// The den behind the wall: rock heaps either side of Brumm, x3 shells where the stone arrives.
const BEHIND = swapKind([...fill(0, 3, 10, 2, 'tough', { hp: 3, tint: 4 }), ...fill(26, 3, 10, 2, 'tough', { hp: 3, tint: 4 }),
  ...fill(0, 5, 10, 3, 'soft', { tint: 4, bw: 2 }), ...fill(26, 5, 10, 3, 'soft', { tint: 4, bw: 2 })], [[2, 7], [30, 7]], 'x3');
// The cave floor in front: one big bank with a lane up to the door and room round the whirlpool.
const BANK = (x: number, w: number) => [...fill(x, 18, w, 1, 'tough', { hp: 2, bw: 2 }), ...fill(x, 19, w, 12, 'soft', { bw: 2 }),
  ...fill(x, 31, w, 1, 'tough', { hp: 2, bw: 2 })];
const FRONT = [...BANK(9, 16), ...BANK(0, 2), ...BANK(30, 6)];

export const BRUMMS_WHIRLPOOL_DEN: LevelDef = {
  id: 'ch4-40-brumm',
  name: "Brumm's Whirlpool Den",
  number: 40,
  chapter: 4,
  layout: 'boss',
  par: 80,
  tip: 'Two ways in: the turning door, or the whirlpool on the left.',
  whirlpools: [{ a: { x: 5, y: 40 }, b: { x: 5, y: 11 } }],
  spinners: [
    { x: 27, y: WALL_ROW, length: 4, period: 3, phase: 0 },
    { x: 11, y: 9, length: 4, period: -2.4, phase: 0 },
  ],
  boss: { hits: 38, shieldW: 5, speed: 12, x: 15, y: 4, w: 6, h: 3, shieldY: 8, trackX0: 11, trackX1: 25 },
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
