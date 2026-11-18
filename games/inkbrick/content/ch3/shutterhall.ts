/**
 * Level 26, "The Trapdoor Decks". Rebuilt 2026-11-18 as layers (the old pins of ch3-26-gate are
 * gone). Signature: Layers with shutters as trap doors. Three stone decks cross the harbour; every
 * gap in them is a stone trap door that swings open and shut, each on its own beat. The stone
 * climbs right, left, right, deck by deck, to the loft with the x3 shells. Pieces: shutter, soft,
 * tough, x3.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const GAPS = [{ x: 26, y: 38, w: 2 }, { x: 5, y: 30, w: 3 }, { x: 26, y: 22, w: 3 }];
const FLOORS = GAPS.flatMap((g) => [stone(0, g.y, g.x, 1), stone(g.x + g.w, g.y, 36 - g.x - g.w, 1)]);
/** A corridor's band, hung two rows under the deck above: driftwood over a row of 1 x 1 sandcastle, an x3 every 6th cell. */
const band = (y: number): BrickDef[] => [
  ...fill(0, y, 36, 1, 'tough', { hp: 3 }), ...fill(0, y + 1, 36, 1, 'tough', { hp: 2 }),
  ...fill(0, y + 2, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 8 === 2 ? { ...b, kind: 'x3' as const } : b)),
];
const LOFT = [
  ...fill(0, 18, 36, 1, 'soft', { bw: 1 }).map((b) => (b.x % 3 === 1 ? { ...b, kind: 'x3' as const } : b)),
  ...fill(0, 12, 36, 6, 'tough', { hp: 3 }), ...fill(0, 6, 36, 6, 'tough', { hp: 3 }), ...fill(0, 4, 36, 2, 'tough', { hp: 3 }),
];
const TEASERS: BrickDef[] = [...fill(0, 41, 22, 1, 'tough', { hp: 2 }), ...fill(0, 44, 18, 1, 'soft'), ...fill(30, 41, 6, 1, 'soft'), { x: 20, y: 50, w: 3, h: 1, kind: 'tough', hp: 3 }];

export const SHUTTERED_GATE: LevelDef = {
  id: 'ch3-26-gate', name: 'The Trapdoor Decks', number: 26, chapter: 3, layout: 'layers', par: 120,
  tip: 'Shoot as each trap door swings open and climb.',
  shutters: [
    { x: 26, y: 38, w: 2, h: 1, open: 1.8, closed: 1.8, phase: 0 },
    { x: 5, y: 30, w: 3, h: 1, open: 2.2, closed: 1.4, phase: 1.2 },
    { x: 26, y: 22, w: 3, h: 1, open: 2.2, closed: 1.4, phase: 2.4 },
  ],
  bricks: [...FLOORS, ...band(32), ...band(24), ...LOFT, ...TEASERS],
};
