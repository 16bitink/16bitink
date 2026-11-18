import { fill, shell } from '../src/sim/kit';
import type { LevelDef } from '../src/sim/types';

/** Scratch levels for the dev page only (?scratch=dark|boss|pieces): not part of the campaign. */
const BASE = { number: 1, chapter: 1, par: 90 } as const;

const DARK: LevelDef = {
  ...BASE, id: 'scratch-dark', name: 'Dark test', dark: true,
  bricks: [
    ...shell(11, 22, 14, 10, [{ side: 'bottom', at: 5, width: 3 }, { side: 'top', at: 5, width: 4 }]),
    ...fill(12, 25, 12, 4, 'x3', { bw: 1, skip: (x, y) => (x + y) % 2 === 1 }),
    ...fill(0, 6, 36, 8, 'soft'),
  ],
};

const BOSS: LevelDef = {
  ...BASE, id: 'scratch-boss', name: 'Brumm test', chapter: 5,
  boss: { hits: 4, shieldW: 8, speed: 6 },
  bricks: [...fill(0, 14, 36, 3, 'soft'), ...fill(2, 18, 6, 2, 'tough', { hp: 3 })],
};

const PIECES: LevelDef = {
  ...BASE, id: 'scratch-pieces', name: 'Pieces test', chapter: 2,
  bricks: [
    ...fill(2, 6, 8, 2, 'ice'), ...fill(14, 6, 6, 2, 'tough', { hp: 3 }), ...fill(24, 6, 8, 2, 'soft'),
    { x: 4, y: 12, w: 4, h: 2, kind: 'soft', floe: 'f' },
    { x: 10, y: 12, w: 2, h: 2, kind: 'key', link: 'a' }, { x: 14, y: 12, w: 4, h: 2, kind: 'gate', link: 'a' },
    { x: 22, y: 12, w: 4, h: 2, kind: 'tough', hp: 2 },
    // Every other kind, long and square (the style check: ?scratch=pieces).
    { x: 2, y: 16, w: 6, h: 2, kind: 'stone' }, { x: 9, y: 16, w: 6, h: 2, kind: 'x3' }, { x: 16, y: 16, w: 6, h: 2, kind: 'keg' },
    { x: 23, y: 16, w: 6, h: 2, kind: 'pickup', drop: 'wide' }, { x: 30, y: 16, w: 4, h: 2, kind: 'soft', tint: 4 },
    { x: 14, y: 20, w: 2, h: 2, kind: 'stone' }, { x: 17, y: 20, w: 2, h: 2, kind: 'x3' }, { x: 20, y: 20, w: 2, h: 2, kind: 'keg' },
    { x: 23, y: 20, w: 2, h: 2, kind: 'pickup', drop: 'fireball' }, { x: 26, y: 20, w: 2, h: 2, kind: 'ice' }, { x: 29, y: 20, w: 2, h: 2, kind: 'tough', hp: 3 },
    { x: 32, y: 20, w: 2, h: 2, kind: 'soft' },
  ],
  floes: [{ id: 'f', dx: 6, dy: 0, period: 4 }],
  shutters: [{ x: 4, y: 20, w: 8, h: 2, open: 2, closed: 2, phase: 0 }],
  spinners: [{ x: 24, y: 28, length: 7, period: 4, phase: 0 }],
  whirlpools: [{ a: { x: 6, y: 34 }, b: { x: 30, y: 40 } }],
};

export const SCRATCH: Readonly<Record<string, LevelDef>> = { dark: DARK, boss: BOSS, pieces: PIECES };
