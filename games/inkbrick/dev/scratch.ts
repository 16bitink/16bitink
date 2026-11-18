import { fill, shell } from '../src/sim/kit';
import { Sim } from '../src/sim/sim';
import type { LevelDef } from '../src/sim/types';

/** Scratch levels for the dev page only (?scratch=dark|boss|pieces|variety|pearls|stones|tide|rescue): not part of the campaign. */
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

const LEVERS: LevelDef['bricks'] = [{ x: 2, y: 20, w: 2, h: 2, kind: 'lever', link: 'a' }, { x: 32, y: 20, w: 2, h: 2, kind: 'lever', link: 'b' }];

/** The level, or (while the sim doesn't take levers yet) the level without its levers. */
function withLevers(l: LevelDef): LevelDef {
  try {
    new Sim(l);
    return l;
  } catch (e) {
    console.warn('[scratch] the sim rejects levers for now; drawn without them', e);
    return { ...l, bricks: l.bricks.filter((b) => b.kind !== 'lever') };
  }
}

/** Every new piece of 2026-11-18 at once (the art check: ?scratch=variety). */
const VARIETY: LevelDef = withLevers({
  ...BASE, id: 'scratch-variety', name: 'Variety test', chapter: 3, goal: 'rescue', rule: 'current',
  rescue: { x: 17, y: 12, who: 'pup' },
  bricks: [
    ...shell(12, 8, 12, 9, [{ side: 'bottom', at: 5, width: 3 }]),
    ...fill(13, 9, 10, 2, 'soft'),
    ...LEVERS,
    ...fill(4, 4, 8, 2, 'soft').map((b) => ({ ...b, hidden: true })), ...fill(24, 4, 8, 2, 'tough', { hp: 2 }),
  ],
  flips: [{ x: 6, y: 22, w: 8, h: 1, link: 'a', on: true }, { x: 22, y: 22, w: 8, h: 1, link: 'b', on: false }],
  bumpers: [{ x: 90, y: 420, r: 22 }, { x: 270, y: 470, r: 16 }, { x: 450, y: 420, r: 24 }],
  crabs: [{ y: 36, x0: 4, x1: 29, speed: 3, phase: 0.3 }],
  pearls: [{ x: 8, y: 42 }, { x: 27, y: 42 }],
  shutters: [{ x: 15, y: 17, w: 6, h: 1, open: 2, closed: 2, phase: 0 }],
  dailyPearl: { x: 33, y: 30 },
});

const GOALS: Readonly<Record<string, LevelDef>> = {
  pearls: {
    ...BASE, id: 'scratch-pearls', name: 'Pearl test', goal: 'pearls', rule: 'bigStone',
    pearls: [{ x: 6, y: 14 }, { x: 18, y: 10 }, { x: 30, y: 14 }, { x: 18, y: 30 }],
    bricks: [...shell(10, 6, 16, 10, [{ side: 'bottom', at: 7, width: 3 }]), ...fill(0, 20, 36, 3, 'soft')],
  },
  stones: {
    ...BASE, id: 'scratch-stones', name: 'Few Stones test', goal: 'stones', stones: 4, need: 0.6, rule: 'twoStones',
    bricks: [...fill(0, 6, 36, 10, 'soft'), ...fill(6, 18, 24, 2, 'x3', { bw: 2 })],
  },
  tide: {
    ...BASE, id: 'scratch-tide', name: 'Rising Tide test', goal: 'tide', tide: { every: 6, line: 46 }, rule: 'sticky',
    bricks: [...fill(0, 6, 36, 12, 'soft'), ...fill(4, 20, 28, 2, 'tough', { hp: 2 })],
  },
  rescue: {
    ...BASE, id: 'scratch-rescue', name: 'Rescue test', goal: 'rescue', rule: 'tinyRaft', rescue: { x: 17, y: 12, who: 'puffin' },
    bricks: [...shell(11, 7, 14, 11, [{ side: 'bottom', at: 6, width: 3 }]), ...fill(12, 8, 12, 3, 'soft'), ...fill(0, 22, 36, 3, 'soft')],
  },
};

export const SCRATCH: Readonly<Record<string, LevelDef>> = { dark: DARK, boss: BOSS, pieces: PIECES, variety: VARIETY, ...GOALS };
