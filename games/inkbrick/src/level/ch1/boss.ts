/**
 * Level 10, "Brumm's Sea Wall". Signature: chapter 1 boss. Brumm the walrus sunbathes behind a
 * full-width sea wall with one wide gap (10 cells) in the middle; his stone shield (4 cells) slides
 * back and forth along the wall, so part of the gap is nearly always open. In front, two low
 * sandcastle banks either side of an open lane, so every return breaks something while you wait.
 * Once behind the wall the stone rattles around his rock and thumps him again and again. Teaches:
 * boss fights are about timing the way in. Pieces: soft and tough rocks behind the wall, soft
 * banks with pickups (wide raft, +3 stones), Brumm and his shield.
 */
import { fill, stone, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const WALL_ROW = 12;
const GAP_X = 13;
const GAP_W = 10;

const WALL = [stone(0, WALL_ROW, GAP_X, 1), stone(GAP_X + GAP_W, WALL_ROW, 36 - GAP_X - GAP_W, 1)];
// Brumm's rock garden behind the wall: something to smash while the stone is in there.
const BEHIND = [...fill(0, 6, 12, 4, 'soft', { tint: 1 }), ...fill(24, 6, 12, 4, 'soft', { tint: 1 }),
  ...fill(0, 5, 6, 1, 'tough', { hp: 2, tint: 1 }), ...fill(30, 5, 6, 1, 'tough', { hp: 2, tint: 1 })];
const FRONT = swapKind(swapKind([...fill(0, 18, 9, 4, 'soft'), ...fill(27, 18, 9, 4, 'soft')],
  [[6, 21], [27, 21]], 'pickup', { drop: 'wide' }), [[3, 20], [30, 20], [6, 18], [27, 18]], 'pickup', { drop: 'plus3' });

export const BRUMMS_SEA_WALL: LevelDef = {
  id: 'ch1-10-brumm',
  name: "Brumm's Sea Wall",
  number: 10,
  chapter: 1,
  layout: 'boss',
  par: 80,
  tip: 'Slip the stone through the gap beside the shield.',
  inside: [{ x: 0, y: 0, w: 36, h: WALL_ROW }],
  boss: { hits: 15, shieldW: 4, speed: 7, x: 15, y: 5, w: 6, h: 3, shieldY: WALL_ROW, trackX0: 8, trackX1: 26 },
  bricks: [...WALL, ...BEHIND, ...FRONT],
};
