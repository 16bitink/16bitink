import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, grove, LOOT_FOREST, path, TANK, thicket } from './kit';

/**
 * Level 46, Three Clans (Capture): three clearings in the old forest, each
 * with a flagpole and each held by a different clan (Boars west, Weasels in
 * the north, Crows east), 4 × 2 screens. Raise our flag on all three at once.
 * `mixedClans` and `clanWar`: every clan is its own side, so the Boars, Weasels,
 * Crows and the Iron Hive shoot each other as well as you. Their patrols meet
 * on the trails between the clearings, and any clan will march on a flag that
 * isn't its own: let them. A flag runs up while you sit alone in its ring.
 */
const A = { x: 1000, y: 760 };
const B = { x: 1900, y: 330 };
const C = { x: 2800, y: 760 };
const TRAIL_AB = [at(0.15, 1.5), A, { x: 1450, y: 540 }, B];
const TRAIL_BC = [B, { x: 2350, y: 540 }, C, { x: 3700, y: 800 }];
const TRAIL_AC = [A, { x: 1400, y: 900 }, { x: 1900, y: 860 }, { x: 2400, y: 900 }, C];
const MAP = { w: 3840, h: 1080 } as const;
const OPEN: readonly (readonly [number, number, number])[] = [
  [A.x, A.y, 230], [B.x, B.y, 230], [C.x, C.y, 230], [250, 1000, 160],
  ...[TRAIL_AB, TRAIL_BC, TRAIL_AC].flatMap((r) => r.flatMap((p, i) => (i ? [[p.x, p.y, 95] as const, [(p.x + r[i - 1]!.x) / 2, (p.y + r[i - 1]!.y) / 2, 95] as const] : []))),
];

export const LEVEL_46: LevelDef = {
  id: 'ch5-46', number: 46, name: 'Three Clans', type: 'capture',
  briefing: 'Three clearings hold the forest’s old flagpoles, and three clans hold the clearings: the Boars, the Weasels and the Crows, with the Iron Hive prowling between. Raise our flag on all three at once. A flag runs up while you sit alone in its ring. The clans are at war with each other as well as with you, so when two of them meet on a trail, let them fight, then take what is left. Any clan marches on a flag that is not its own, so never leave one unwatched.',
  teaches: 'The clans fight each other: use the chaos; juggling three flags',
  map: {
    cols: 4, rows: 2, base: 'forestFloor',
    terrain: [
      path('forestTrailH', TRAIL_AB, 80), path('forestTrailH', TRAIL_BC, 80), path('forestTrailH', TRAIL_AC, 80),
      blob('clearing', A.x, A.y, 200), blob('clearing', B.x, B.y, 200), blob('clearing', C.x, C.y, 200), blob('clearing', 250, 1000, 150),
    ],
    structures: [
      ...grove(500, 300, 380, 14, OPEN, MAP), ...grove(1000, 250, 300, 8, OPEN, MAP), ...grove(1450, 1000, 300, 8, OPEN, MAP), ...grove(2400, 150, 360, 12, OPEN, MAP),
      ...grove(2300, 540, 220, 6, OPEN, MAP), ...grove(3350, 300, 400, 16, OPEN, MAP), ...grove(3400, 1000, 300, 10, OPEN, MAP), ...grove(500, 800, 260, 8, OPEN, MAP),
      ...thicket(1500, 400, 6, MAP), ...thicket(2300, 400, 6, MAP), ...thicket(1900, 560, 5, MAP),
      // Cover in each clearing: stumps and log piles; undergrowth round them.
      ...each('stump', [[A.x - 110, A.y - 80], [A.x + 90, A.y + 100], [B.x - 120, B.y + 90], [B.x + 100, B.y - 90], [C.x - 100, C.y - 90], [C.x + 120, C.y + 70]]),
      ...each('logPile', [[A.x + 130, A.y - 60], [B.x - 20, B.y + 130], [C.x - 130, C.y + 60]]),
      ...each('undergrowth', [[A.x - 240, A.y + 40], [B.x + 250, B.y + 30], [C.x + 250, C.y - 40], [1500, 700], [2350, 700], [1900, 640]]),
      { kind: 'crate', x: 300, y: 940 },
    ],
    points: {
      start: { x: 250, y: 1000 },
      flagA: A, flagB: B, flagC: C,
      gA: { x: A.x - 60, y: A.y - 30 }, gB: { x: B.x + 60, y: B.y + 20 }, gC: { x: C.x + 50, y: C.y - 30 },
      mortarC: { x: C.x + 200, y: C.y + 150 }, railB: { x: 1750, y: 130 },
      pAB: { x: 1450, y: 540 }, pBC: { x: 2350, y: 540 }, pAC: { x: 1900, y: 860 },
      hiveE: { x: 3780, y: 800 }, weaselN: { x: 1900, y: 30 }, boarW: { x: 60, y: 600 }, crowS: { x: 2600, y: 1050 },
    },
    roads: { ab: TRAIL_AB, bc: TRAIL_BC, ac: TRAIL_AC },
  },
  start: 'start', startHeading: 0,
  mixedClans: true, clanWar: true,
  enemies: [
    // The clearings' keepers, a clan each.
    { role: 'guard', clan: 'boars', tank: TANK.boarHeavy, at: 'gA', hpMult: 0.37, sight: 440, leash: 260 },
    { role: 'guard', clan: 'weasels', tank: TANK.skimmer, at: 'gB', hpMult: 0.67, sight: 400, leash: 240 },
    { role: 'guard', clan: 'crows', tank: TANK.crowMortar, at: 'gC', hpMult: 0.52, sight: 420, leash: 240 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'mortarC', hpMult: 0.45, sight: 400, leash: 200 },
    { role: 'turret', clan: 'hive', tank: TANK.rail, at: 'railB', hpMult: 0.3, sight: 420 },
    // Patrols that meet on the trails: the clans clash.
    { role: 'patrol', clan: 'boars', tank: TANK.gunner, at: 'pAB', route: 'ab', hpMult: 0.3 },
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer, at: 'pBC', route: 'bc', hpMult: 0.45 },
    { role: 'patrol', clan: 'hive', tank: TANK.gunner, at: 'pAC', route: 'ac', hpMult: 0.3 },
    // Each clan marches on a flag that isn't its own.
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'hiveE', when: 70, hpMult: 0.37 },
    { role: 'wave', clan: 'boars', tank: TANK.boarHeavy, at: 'boarW', when: 100, hpMult: 0.22 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'weaselN', when: 120, hpMult: 0.6 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'crowS', when: 150, hpMult: 0.45 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner3, at: 'hiveE', when: 190, hpMult: 0.37 },
  ],
  crates: [{ at: { x: 400, y: 930 }, content: 'kit' }, { at: { x: 1450, y: 600 } }, { at: { x: 2350, y: 620 }, content: 'kit' }, { at: { x: 1900, y: 940 } }],
  objective: { kind: 'capture', flags: ['flagA', 'flagB', 'flagC'], radius: 140, capture: 6, holdAll: 5 },
  bonus: [{ kind: 'time', under: 200 }, { kind: 'kills', n: 7 }],
  timeLimit: 420,
  loot: LOOT_FOREST,
};
