/**
 * Level 45, "The Warded Keep". Signature: Multiplier core behind a key + gate, nested. A stone
 * hall with its floor door gated holds a second room, and in that room a core packed with x3
 * shells. Break the key in the left corner, get in through the hall door, cross the cavity and
 * up through the core room's door: the stones multiply and pour out. Pieces: key, gate, x3, soft, tough.
 * Lab (30 runs): 10/11 PASS · MISS cascade 8s 0.0%
 */
import { fill, shell } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const OUTER = shell(8, 14, 20, 20, [{ side: 'bottom', at: 1, width: 3 }]);
const INNER = shell(12, 18, 14, 9, [{ side: 'bottom', at: 2, width: 3 }]);
const GATE: BrickDef = { x: 9, y: 33, w: 3, h: 1, kind: 'gate', link: 'ward' };
const KEY: BrickDef = { x: 1, y: 36, w: 3, h: 1, kind: 'key', link: 'ward' };
const CORE = [
  ...fill(13, 20, 12, 5, 'x3', { bw: 1, skip: (x, y) => (x + y) % 2 === 1 }),
  ...fill(13, 20, 12, 5, 'soft', { bw: 1, skip: (x, y) => (x + y) % 2 === 0 }),
];
const FIELD = [
  ...fill(0, 4, 36, 4, 'soft', { tint: 5, bw: 6, bh: 2 }), ...fill(0, 8, 36, 5, 'tough', { hp: 2, tint: 5, bw: 6, bh: 2 }),
  ...fill(0, 14, 8, 20, 'soft', { bw: 4, bh: 5 }), ...fill(28, 14, 8, 20, 'soft', { bw: 4, bh: 5 }),
  ...fill(24, 36, 12, 1, 'soft'), ...fill(0, 40, 12, 1, 'soft'), ...fill(24, 40, 12, 1, 'tough', { hp: 2 }), 
];

export const WARDED_KEEP: LevelDef = {
  id: 'ch5-45-keep',
  name: 'The Warded Keep',
  number: 45,
  chapter: 5,
  layout: 'core',
  par: 80,
  tip: 'The keep is locked: its key is down in the left corner.',
  bricks: [...OUTER, ...INNER, GATE, KEY, ...CORE, ...FIELD],
};
