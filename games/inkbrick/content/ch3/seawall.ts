/**
 * Level 25, "The Crab Quay". Signature: Over the wall, new piece: crabs. The full-width stone quay
 * with one tunnel by the right edge, as before; a crab walks the quay's face back and forth across
 * the tunnel's mouth, and a second one patrols the water under it, so the way in opens and shuts as
 * they walk. Up the tunnel the stone climbs an empty chimney lined with x3 shells to the open water
 * under the ceiling and runs along the backs of the driftwood. Teaches: crabs are moving stone that
 * knocks the stone back; time the shot as the crab walks off (a hit makes it scuttle fast for a second).
 * Rebuilt 2026-11-18 (was "The Long Quay": same wall, no crabs; its replay pin, if any, is gone).
 * Pieces: crab, soft, tough, x3, ice.
 */
import { fill, stone, swapKind } from '../../src/sim/kit';
import type { BrickDef, CrabDef, LevelDef } from '../../src/sim/types';

const WALL = [stone(0, 14, 28, 1), stone(32, 14, 4, 1)];
/** Both sides of the chimney over the tunnel, 1 x 1: an x3 shell every third row, sandcastle between. */
const LINING: BrickDef[] = [26, 32].flatMap((x) => fill(x, 4, 1, 10, 'soft', { bw: 1 }).map((b) => ((b.y - 1) % 3 === 0 && b.y >= 7 ? { ...b, kind: 'x3' as const } : b)));
const BEHIND = swapKind([
  ...fill(0, 4, 26, 2, 'tough', { hp: 2, bw: 2 }), ...fill(0, 6, 26, 2, 'tough', { hp: 2, bw: 2 }), ...fill(0, 8, 26, 2, 'tough', { hp: 2, bw: 2 }), ...fill(0, 10, 26, 2, 'tough', { hp: 2, bw: 2 }), ...fill(0, 12, 26, 2, 'soft', { bw: 2 }),
  ...fill(33, 4, 3, 10, 'soft', { bw: 1 }),
], [[12, 8]], 'x3');
/** In front: a driftwood row and an ice band to chew on while lining up, teasers left of the tunnel's lane. */
const FRONT = [
  ...fill(0, 18, 24, 1, 'tough', { hp: 2 }), ...fill(4, 22, 15, 2, 'ice'), ...fill(0, 27, 24, 1, 'soft'),
  ...fill(6, 31, 18, 1, 'tough', { hp: 2 }), ...fill(0, 35, 15, 1, 'tough', { hp: 2 }),
];
/**
 * The quay crab walks the wall's face (rows 15-16) across the tunnel's mouth at 2 cells/s: over the
 * mouth it shuts it, beside it it leaves 2-3 cells. The water crab walks the lane under the tunnel
 * (row 44) at 3 cells/s, half a cycle behind.
 */
const CRABS: CrabDef[] = [{ y: 15, x0: 24, x1: 33, speed: 2, phase: 0 }, { y: 44, x0: 16, x1: 33, speed: 3, phase: 0.5 }];

export const LONG_QUAY: LevelDef = {
  id: 'ch3-25-quay', name: 'The Crab Quay', number: 25, chapter: 3, layout: 'wall', par: 95,
  tip: 'A crab guards the tunnel. Shoot when it walks away.',
  crabs: CRABS,
  bricks: [...WALL, ...LINING, ...BEHIND, ...FRONT],
};
