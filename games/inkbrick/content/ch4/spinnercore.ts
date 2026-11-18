/**
 * Level 38, "The Reef Steps". Signature: Open (no stone), pieces: bumpers + x3. The armour is a
 * single big step: 3-hit driftwood planks high on the left (row 22) and low on the right (row 28),
 * each side's payload packed above it with a face of kegs and x3 shells and a second face of x3.
 * Coral bumpers stand in the open water: a stone that lands on one is kicked back up, steeper and
 * faster, into the planks. Teaches: bumpers kick, x3 shells multiply, aim the returns.
 * Rebuilt 2026-11-18 (was the core "The Whirling Core"): old replay pins go.
 */
import { fill, minus, swapKind } from '../../src/sim/kit';
import type { BrickDef, BumperDef, LevelDef } from '../../src/sim/types';

const CELL = 15;
const arm = (bs: BrickDef[]): BrickDef[] => bs.map((b) => ({ ...b, armour: true }));
// Planks 6 wide: a step of 6 rows between the halves, wider than the 5-cell probe, so no notch counts as inside.
const STEP_WALL = arm(fill(18, 22, 2, 6, 'tough', { hp: 3, bw: 2, bh: 6 }));
const ARMOUR = arm([...fill(0, 22, 18, 1, 'tough', { hp: 3, bw: 6 }), ...fill(18, 28, 18, 1, 'tough', { hp: 3, bw: 6 })]);
/** A face of keg, x3, sandcastle on a row (kegs every 3 cells chain), 1 x 1 bricks over x0..x1. */
const face = (x0: number, x1: number, y: number): BrickDef[] => [
  ...fill(x0, y, x1 - x0, 1, 'keg', { bw: 1, skip: (x) => x % 3 !== 0 }),
  ...fill(x0, y, x1 - x0, 1, 'x3', { bw: 1, skip: (x) => x % 3 !== 1 }),
  ...fill(x0, y, x1 - x0, 1, 'soft', { bw: 1, skip: (x) => x % 3 !== 2 }),
];
/** A second face of x3 every other cell. */
const beds = (x0: number, x1: number, y: number): BrickDef[] => [
  ...fill(x0, y, x1 - x0, 1, 'x3', { bw: 1, skip: (x) => x % 2 === 1 }),
  ...fill(x0, y, x1 - x0, 1, 'soft', { bw: 1, skip: (x) => x % 2 === 0 }),
];
// Three empty rows over each armour, then the face; the payload above it.
const LEFT = [
  ...face(0, 18, 18), ...beds(0, 18, 14), ...fill(0, 15, 18, 3, 'soft', { tint: 3 }),
  ...fill(0, 9, 18, 5, 'tough', { hp: 2, tint: 3 }), ...fill(0, 6, 18, 3, 'tough', { hp: 2, tint: 5 }), ...fill(0, 4, 18, 2, 'soft', { tint: 5 }),
];
const RIGHT = [
  ...face(18, 36, 24), ...beds(18, 36, 20), ...fill(18, 21, 18, 3, 'soft', { tint: 4 }),
  ...fill(18, 13, 18, 7, 'soft', { tint: 4 }), ...fill(18, 9, 18, 4, 'tough', { hp: 2, tint: 6 }), ...fill(18, 6, 18, 3, 'soft', { tint: 6 }), ...fill(18, 4, 18, 2, 'soft', { tint: 6 }),
];
const at = (col: number, row: number, r: number): BumperDef => ({ x: col * CELL, y: row * CELL + CELL / 2, r });
// Coral bumpers in the lanes where returns fall, off the launch column, staggered on two heights.
const BUMPERS: BumperDef[] = [at(9, 38, 20), at(27, 40, 20), at(3, 45, 16), at(33, 46, 16)];
const TEASERS = [...fill(0, 28, 9, 1, 'tough', { hp: 2 }), ...fill(30, 33, 6, 1, 'soft')];
// Kegs in the corners of the field: they blast the last stragglers, so no hunt.
const CORNER_KEGS: [number, number][] = [[0, 4], [33, 4], [0, 6], [33, 6], [15, 4], [18, 4], [0, 15], [33, 21], [33, 25]];

export const WHIRLING_CORE: LevelDef = {
  id: 'ch4-38-core',
  name: 'The Reef Steps',
  number: 38,
  chapter: 4,
  layout: 'open',
  par: 90,
  tip: 'Coral bumpers kick the stone. Use them to climb the steps.',
  bumpers: BUMPERS,
  bricks: swapKind([...ARMOUR, ...STEP_WALL, ...LEFT, ...minus(RIGHT, STEP_WALL), ...TEASERS], CORNER_KEGS, 'keg'),
};
