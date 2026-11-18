/**
 * Level 50, "Brumm's Last Stand". Signature: the finale. Brumm's fort has two walls. The outer
 * wall has a gate on the left (its key hangs in the front bank) and a shutter on the right, and a
 * whirlpool in the open water carries a stone straight into the courtyard. In the courtyard ice
 * floes drift and a spinner turns; the inner wall has one gap, and Brumm's widest, fastest shield
 * slides along it. Every piece from the five chapters, and the most hits of all.
 * Pieces: key, gate, shutter, whirlpool, spinner, floe, ice, soft, tough, x3, Brumm and his shield.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const INNER_ROW = 11;
const INNER_GAP = 22;
const INNER_W = 4;
const OUTER_ROW = 21;
const DOOR_W = 3;
const GATE_X = 4;
const SHUTTER_X = 28;

const INNER = [stone(0, INNER_ROW, INNER_GAP, 1), stone(INNER_GAP + INNER_W, INNER_ROW, 36 - INNER_GAP - INNER_W, 1)];
const OUTER = [stone(0, OUTER_ROW, GATE_X, 1), stone(GATE_X + DOOR_W, OUTER_ROW, SHUTTER_X - GATE_X - DOOR_W, 1),
  stone(SHUTTER_X + DOOR_W, OUTER_ROW, 36 - SHUTTER_X - DOOR_W, 1)];
const GATE: BrickDef = { x: GATE_X, y: OUTER_ROW, w: DOOR_W, h: 1, kind: 'gate', link: 'fort' };
const KEY: BrickDef = { x: 14, y: 33, w: 3, h: 1, kind: 'key', link: 'fort' };
// Brumm's hall: tough walls of kegs and crates, x3 shells by the gap.
const HALL = swapKind([...fill(0, 3, 12, 2, 'tough', { hp: 3, tint: 5 }), ...fill(24, 3, 12, 2, 'tough', { hp: 3, tint: 5 }),
  ...fill(0, 5, 12, 4, 'soft', { tint: 5 }), ...fill(24, 5, 12, 4, 'soft', { tint: 5 })], [[12 - 3, 8], [24, 8]], 'x3');
// The courtyard: ice bands at its sides and a drifting floe of ice blocks.
const YARD = [...fill(0, 13, 12, 1, 'ice', { bw: 2 }), ...fill(24, 13, 12, 1, 'ice', { bw: 2 }),
  ...fill(0, 15, 12, 2, 'soft', { bw: 2 }), ...fill(24, 15, 12, 2, 'soft', { bw: 2 }),
  ...[13, 16, 19].map((x): BrickDef => ({ x, y: 18, w: 2, h: 1, kind: 'ice', floe: 'yard' }))];
// The glacis in front of the fort: packed banks with lanes to the gate, the shutter and the whirlpool.
const BANK = (x: number, w: number) => [...fill(x, 25, w, 1, 'tough', { hp: 2, bw: 2 }), ...fill(x, 26, w, 7, 'soft', { bw: 2 }),
  ...fill(x, 34, w, 1, 'tough', { hp: 2, bw: 2 })];
const FRONT = [...BANK(9, 18).filter((b) => !(b.y === KEY.y && b.x + b.w > KEY.x && b.x < KEY.x + KEY.w)), ...BANK(0, 3), ...BANK(33, 3),
  ...fill(10, 33, 4, 1, 'soft', { bw: 2 }), ...fill(18, 33, 8, 1, 'soft', { bw: 2 })];

export const BRUMMS_LAST_STAND: LevelDef = {
  id: 'ch5-50-brumm',
  name: "Brumm's Last Stand",
  number: 50,
  chapter: 5,
  layout: 'boss',
  par: 135,
  tip: 'Get into the courtyard first, then past his shield.',
  floes: [{ id: 'yard', dx: 6, dy: 0, period: 5 }],
  shutters: [{ x: SHUTTER_X, y: OUTER_ROW, w: DOOR_W, h: 1, open: 1.4, closed: 2.2, phase: 0 }],
  whirlpools: [{ a: { x: 34, y: 23 }, b: { x: 30, y: 18 } }],
  spinners: [{ x: 8, y: 17, length: 4, period: 2.6, phase: 0 }],
  boss: { hits: 40, shieldW: 7, speed: 11, x: 13, y: 4, w: 8, h: 4, shieldY: INNER_ROW, trackX0: 13, trackX1: 30 },
  bricks: [...INNER, ...OUTER, GATE, KEY, ...HALL, ...YARD, ...FRONT],
};
