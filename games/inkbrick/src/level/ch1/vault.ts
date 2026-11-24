/**
 * Level 1, "The Sandcastle Vault". Signature: Vault, and nothing in it is unbreakable (owner,
 * 2026-11-24: the first level has no stone). A driftwood room with a 10-wide doorway in the middle
 * of its floor, right over the raft: the first straight shot goes in, up an empty chimney to a gap
 * under the roof, and rattles around the sandcastle. Any other shot breaks the room itself.
 * Teaches: get the stone in and let it work. Pieces: soft, tough, x3 shells where the stone first
 * arrives, wide-raft pickups. Mirrored about the middle.
 */
import { fill, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const X = 6;
const Y = 10;
const W = 24;
const DOOR = 10;
const SIDE = (W - DOOR) / 2;
const H = 13;
const WALL = { hp: 2, bw: 1, bh: H / 2 - 0.5 };
const ROOM = [
  ...fill(X, Y, W, 1, 'tough', { hp: 2, bw: 4 }),
  ...fill(X, Y + 1, 1, H - 1, 'tough', WALL), ...fill(X + W - 1, Y + 1, 1, H - 1, 'tough', WALL),
  ...fill(X, Y + H, SIDE, 1, 'tough', { hp: 2, bw: SIDE }), ...fill(X + SIDE + DOOR, Y + H, SIDE, 1, 'tough', { hp: 2, bw: SIDE }),
];
// Two heaps of sandcastle either side of the chimney, three empty rows under the roof.
const HEAP_ROW = Y + 4;
const L = X + 4;
const R = X + SIDE + DOOR;
const HEAPS = swapKind(swapKind([...fill(X + 1, HEAP_ROW, SIDE - 1, H - 4, 'soft'), ...fill(R, HEAP_ROW, SIDE - 1, H - 4, 'soft')],
  [[L, HEAP_ROW], [R, HEAP_ROW], [L, HEAP_ROW + 3], [R, HEAP_ROW + 3], [L, HEAP_ROW + 6], [R, HEAP_ROW + 6]], 'x3'),
[[X + 1, HEAP_ROW + 8], [R + 3, HEAP_ROW + 8]], 'pickup', { drop: 'wide' });

export const VAULT: LevelDef = {
  id: 'ch1-01-vault',
  name: 'The Sandcastle Vault',
  number: 1,
  chapter: 1,
  layout: 'vault',
  par: 45,
  tip: 'Send the stone up through the doorway and let it rattle.',
  inside: [{ x: X + 1, y: Y + 1, w: W - 2, h: H - 1 }],
  bricks: [...ROOM, ...HEAPS],
};
