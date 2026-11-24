/**
 * Level 6, "The Buoy Garden". Signature: Open (no stone), new piece: the bumper. A rainbow of
 * sandcastle hangs high in the cove with open water over it, under it and down both sides (owner,
 * 2026-11-24: the old full-width wall took far too long to chew through). Barnacle buoys stand in
 * the lanes where returns fall: a stone that lands on one is kicked back up early, steeper and
 * faster. Teaches: buoys kick the stone; aim the returns at them. Pieces: soft, x3, keg, bumper,
 * a wide-raft pickup. Mirrored about the middle.
 */
import type { BrickDef, BumperDef, LevelDef } from '../../sim/types';

const CELL = 15;
/** The rainbow: one row of the left half per line, each letter a 2 x 1 brick (16 columns, mirrored). */
const ART = [
  '.....rrr',
  '...rrooo',
  '..rooyyy',
  '.rooygg3',
  '.roygbbb',
  'rooyg...',
  'royg....',
  'roy3....',
  'royg....',
  'koyg....',
];
const BRICK_W = 2;
const X0 = 2;
const Y0 = 9;
const TINTS: Record<string, number> = { r: 2, o: 8, y: 1, g: 7, b: 5 };
const HALF: BrickDef[] = ART.flatMap((row, r) => [...row].flatMap((c, i): BrickDef[] => {
  if (c === '.') return [];
  const at = { x: X0 + i * BRICK_W, y: Y0 + r, w: BRICK_W, h: 1 };
  if (c === '3') return [{ ...at, kind: 'x3' }];
  if (c === 'k') return [{ ...at, kind: 'keg' }];
  return [{ ...at, kind: 'soft', tint: TINTS[c]! }];
}));
const mirror = (b: BrickDef): BrickDef => ({ ...b, x: 36 - b.x - b.w });
const RAINBOW = [...HALF, ...HALF.map(mirror)];
// A sun under the arch: x3 shells round a wide-raft pickup.
const SUN: BrickDef[] = [
  { x: 14, y: 15, w: 3, h: 1, kind: 'x3' }, { x: 17, y: 15, w: 2, h: 1, kind: 'pickup', drop: 'wide' }, { x: 19, y: 15, w: 3, h: 1, kind: 'x3' },
];
const at = (col: number, row: number, r: number): BumperDef => ({ x: col * CELL, y: row * CELL + CELL / 2, r });
/** Barnacle buoys in the lanes where returns come down: two in the middle, two out by the walls. */
const BUOYS: BumperDef[] = [at(12, 29, 18), at(24, 29, 18), at(4, 34, 16), at(32, 34, 16)];

export const TIDE_WALL: LevelDef = {
  id: 'ch1-06-tide',
  name: 'The Buoy Garden',
  number: 6,
  chapter: 1,
  layout: 'open',
  par: 60,
  tip: 'Barnacle buoys kick the stone back up. Use them!',
  inside: [{ x: 10, y: Y0 + 5, w: 16, h: 4 }],
  bumpers: BUOYS,
  bricks: [...RAINBOW, ...SUN],
};
