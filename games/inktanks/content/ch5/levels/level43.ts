import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, grove, LOOT_FOREST, path, TANK, thicket } from './kit';

/**
 * Level 43, Hive Scouts (Recon): photograph three Hive works hidden in the old
 * forest, 4 × 2 screens: the sawmill, the watchtower and the log-pile yard.
 * Each sits in a logged clearing; the old trees' canopies block sight, so a
 * tank creeping through the groves can't be seen from a clearing's far side,
 * and undergrowth hides it too. Guards stand at each work (short sight) and
 * patrols walk the trails between them. Being seen is not a fail: it raises the
 * alarm and Hive reinforcements come from the east. Sets up the Hive's
 * strength for level 44.
 */
const MILL = { x: 1250, y: 330 } as const;
const TOWER = { x: 2150, y: 830 } as const;
const YARD = { x: 3050, y: 330 } as const;
const TRAIL = [at(0.1, 1.6), at(0.55, 1.5), at(1.0, 1.1), at(1.35, 0.8), at(1.75, 0.75), at(2.2, 1.15), at(2.65, 1.05), at(3.0, 0.8), at(3.3, 0.6)];
const OPEN: readonly (readonly [number, number, number])[] = [
  ...TRAIL.map((p) => [p.x, p.y, 55] as const), ...TRAIL.slice(1).map((p, i) => [(p.x + TRAIL[i]!.x) / 2, (p.y + TRAIL[i]!.y) / 2, 55] as const),
  [MILL.x, MILL.y, 220], [TOWER.x, TOWER.y, 220], [YARD.x, YARD.y, 220], [220, 860, 100],
];

export const LEVEL_43: LevelDef = {
  id: 'ch5-43', number: 43, name: 'Hive Scouts', type: 'recon',
  briefing: 'The Iron Hive has three works deep in the forest: a sawmill, a watchtower and a log-pile yard. Command wants each photographed before we move on them. Creep close to every one and wait unseen. The old trees block sight, and so does the undergrowth, so use them: a guard can’t shoot what it can’t see. If you are seen, the Hive calls reinforcements from the east.',
  teaches: 'Stealth in the old forest; trees and undergrowth break sight; a Hive works to photograph',
  map: {
    cols: 4, rows: 2, base: 'forestFloor',
    terrain: [
      path('forestTrailH', TRAIL, 70),
      blob('clearing', MILL.x, MILL.y, 190), blob('clearing', TOWER.x, TOWER.y, 190), blob('clearing', YARD.x, YARD.y, 190), blob('clearing', 220, 860, 90),
    ],
    structures: [
      ...grove(500, 330, 420, 24, OPEN), ...grove(600, 960, 330, 14, OPEN), ...grove(1250, 800, 420, 26, OPEN), ...grove(1700, 250, 350, 22, OPEN),
      ...grove(2150, 400, 330, 20, OPEN), ...grove(1700, 1000, 300, 14, OPEN), ...grove(2650, 800, 380, 22, OPEN), ...grove(3150, 800, 380, 22, OPEN),
      ...grove(2550, 280, 330, 18, OPEN), ...grove(3600, 300, 300, 14, OPEN),
      ...thicket(900, 560, 7), ...thicket(1700, 520, 6), ...thicket(2600, 540, 7),
      // Undergrowth to wait in.
      ...each('undergrowth', [[1050, 480], [1400, 520], [1950, 640], [2340, 640], [2780, 520], [3220, 540], [900, 800], [2000, 960]]),
      // The sawmill, with its piles and stumps.
      { kind: 'sawmill', x: MILL.x + 20, y: MILL.y - 30 }, ...each('logPile', [[MILL.x - 110, MILL.y + 60], [MILL.x + 130, MILL.y + 80]]),
      ...each('stump', [[MILL.x - 60, MILL.y - 100], [MILL.x + 90, MILL.y + 130]]),
      // The watchtower.
      { kind: 'hiveTower', x: TOWER.x, y: TOWER.y - 30 }, ...each('logPile', [[TOWER.x - 120, TOWER.y + 40]]), ...each('stump', [[TOWER.x + 100, TOWER.y + 60], [TOWER.x - 40, TOWER.y + 120]]),
      // The log-pile yard.
      ...each('logPile', [[YARD.x - 90, YARD.y - 20], [YARD.x + 30, YARD.y - 60], [YARD.x + 130, YARD.y + 20], [YARD.x - 30, YARD.y + 90]]), ...each('stump', [[YARD.x + 100, YARD.y + 100], [YARD.x - 140, YARD.y + 70]]),
    ],
    points: {
      start: { x: 220, y: 860 },
      mill: { x: MILL.x, y: MILL.y + 20 }, tower: { x: TOWER.x, y: TOWER.y }, yard: { x: YARD.x, y: YARD.y },
      gMill: { x: MILL.x + 170, y: MILL.y + 130 }, gTower: { x: TOWER.x - 150, y: TOWER.y - 100 }, gYard: { x: YARD.x - 150, y: YARD.y + 120 },
      east: { x: 3800, y: 560 },
    },
    roads: { trailA: [TRAIL[2]!, TRAIL[4]!], trailB: [TRAIL[5]!, TRAIL[7]!] },
  },
  start: 'start', startHeading: 0,
  enemies: [
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'gMill', hpMult: 0.36, sight: 230, leash: 140 },
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'gTower', hpMult: 0.42, sight: 230, leash: 140 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'gYard', hpMult: 0.36, sight: 230, leash: 140 },
    { role: 'patrol', clan: 'hive', tank: TANK.drone, at: TRAIL[2]!, route: 'trailA', hpMult: 0.36 },
    { role: 'patrol', clan: 'hive', tank: TANK.gunner, at: TRAIL[5]!, route: 'trailB', hpMult: 0.3 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner, at: 'east', when: 'alarm', hpMult: 0.36 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'east', when: 'alarm', hpMult: 0.36 },
    { role: 'wave', clan: 'hive', tank: TANK.rail, at: 'east', when: 'alarm', hpMult: 0.21 },
  ],
  crates: [{ at: { x: 300, y: 800 }, content: 'kit' }, { at: { x: 1600, y: 560 } }, { at: { x: 2400, y: 700 }, content: 'kit' }, { at: { x: 3300, y: 560 } }],
  objective: { kind: 'recon', spots: ['mill', 'tower', 'yard'] },
  bonus: [{ kind: 'noAlarm' }, { kind: 'time', under: 125 }],
  loot: LOOT_FOREST,
};
