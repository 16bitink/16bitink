/**
 * Level 10, "Brumm's Sea Wall". Signature: chapter 1 boss. Brumm the walrus sunbathes behind a
 * full-width sea wall with one gap; his stone shield slides back and forth along the wall and
 * covers the gap much of the time. In front, two packed sandcastle banks either side of an open
 * lane, so every return breaks something while you wait. Time a shot for when the gap is open:
 * once behind the wall the stone rattles around his rock and thumps him again and again. Teaches:
 * boss fights are about timing the way in. Pieces: soft and tough rocks behind the wall, soft and
 * tough banks, Brumm and his shield.
 */
import { fill, stone } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const WALL_ROW = 12;
const GAP_X = 16;
const GAP_W = 4;

const WALL = [stone(0, WALL_ROW, GAP_X, 1), stone(GAP_X + GAP_W, WALL_ROW, 36 - GAP_X - GAP_W, 1)];
// Brumm's rock garden behind the wall: something to smash while the stone is in there.
const BEHIND = [...fill(0, 6, 12, 4, 'soft', { tint: 1 }), ...fill(24, 6, 12, 4, 'soft', { tint: 1 }),
  ...fill(0, 4, 6, 2, 'tough', { hp: 3, tint: 1 }), ...fill(30, 4, 6, 2, 'tough', { hp: 3, tint: 1 })];
// The beach in front of the wall: two packed banks either side of an open lane under the gap, so
// every return breaks something while the stone waits for the shield to pass.
const BANK = (x: number) => [...fill(x, 16, 10, 1, 'tough', { hp: 2, bw: 2 }), ...fill(x, 17, 10, 14, 'soft', { bw: 2 }),
  ...fill(x, 31, 10, 1, 'tough', { hp: 2, bw: 2 })];
const FRONT = [...BANK(0), ...BANK(26)];

export const BRUMMS_SEA_WALL: LevelDef = {
  id: 'ch1-10-brumm',
  name: "Brumm's Sea Wall",
  number: 10,
  chapter: 1,
  layout: 'boss',
  par: 100,
  tip: 'Wait for the shield to slide past, then send the stone through the gap.',
  boss: { hits: 26, shieldW: 5, speed: 8, x: 15, y: 5, w: 6, h: 3, shieldY: WALL_ROW, trackX0: 8, trackX1: 26 },
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
