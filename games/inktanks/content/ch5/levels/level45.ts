import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, depot, each, felled, grove, LOOT_FOREST, path, TANK, thicket } from './kit';

/**
 * Level 45, The Last Convoy (Escort): bring the Ink Brigade's convoy, two
 * supply trucks, down the forest trail to our fort, 4 × 2 screens of old
 * forest. The Hive has felled trees across the trail: the trucks stop at each
 * one until you saw through it (shoot it: 160 HP; the HUD says so as they
 * reach it), and its loggers wait in the undergrowth by every felled tree.
 * The trucks only drive while you're near, the old trees block shots both
 * ways (the trail is the only open line), and a Hive Rail in the trees north
 * of the trail fires through them at the convoy. Lose a truck and it's over.
 * The trail ends inside our white-cement fort, whose gun towers open up once
 * you're in sight.
 */
const ROAD = [at(0.1, 1.5), at(0.7, 1.45), at(1.1, 1.2), at(1.6, 1.12), at(2.05, 1.3), at(2.5, 1.32), at(2.9, 1.1), at(3.2, 1.0), at(3.75, 1.0)];
const FORT = depot(3420, 540, 320, 260, ['cannon', 'machinegun']);
/** The felled trees across the trail (x, y): the trucks stop at each until it's sawn through. */
const FELLED = [[1300, 627], [2240, 708], [3020, 550]] as const;
/** Keep the trees off the trail and the clearings (x, y, radius). */
const OPEN: readonly (readonly [number, number, number])[] = [
  ...ROAD.map((p) => [p.x, p.y, 100] as const), ...ROAD.slice(1).map((p, i) => [(p.x + ROAD[i]!.x) / 2, (p.y + ROAD[i]!.y) / 2, 100] as const),
  [3560, 540, 260], [700, 400, 120], [2500, 330, 120], [1750, 950, 110],
];

export const LEVEL_45: LevelDef = {
  id: 'ch5-45', number: 45, name: 'The Last Convoy', type: 'escort',
  briefing: 'The Brigade’s last convoy has to reach our fort in the forest. Two supply trucks; they only drive while you stay close, and losing either ends it. The Hive has felled trees across the trail: the trucks stop at each, so saw through it (shoot it), and watch the undergrowth beside it, where the loggers wait. The old trees block shots both ways; a Hive Rail north of the trail fires through them, so keep an eye out for its charge line. The fort’s gun towers cover you at the end.',
  teaches: 'Escort a convoy; saw through felled trees; ambushes from undergrowth; a Rail through the trees',
  map: {
    cols: 4, rows: 2, base: 'forestFloor',
    terrain: [
      path('forestTrailH', ROAD, 80),
      blob('clearing', 3560, 540, 240), blob('clearing', 700, 400, 110), blob('clearing', 2500, 330, 110), blob('clearing', 1750, 950, 100),
    ],
    structures: [
      // The old forest both sides of the trail.
      ...grove(500, 300, 420, 22, OPEN), ...grove(450, 1050, 300, 10, OPEN), ...grove(1500, 300, 380, 18, OPEN), ...grove(1500, 1000, 360, 14, OPEN),
      ...grove(2400, 300, 380, 18, OPEN), ...grove(2500, 1020, 360, 14, OPEN), ...grove(3150, 280, 260, 9, OPEN), ...grove(3200, 980, 300, 10, OPEN),
      ...thicket(950, 980, 8), ...thicket(2000, 450, 8), ...thicket(2900, 820, 7),
      // The felled trees across the trail (a north–south log across an east–west trail).
      ...FELLED.map(([x, y], i) => felled(x, y, true, 'felled', `felled${i + 1}`)),
      // The loggers' undergrowth by each felled tree, stumps and log piles where they cut.
      ...each('undergrowth', [[1400, 520], [1380, 760], [2330, 600], [2330, 840], [3080, 460], [3110, 700], [600, 700], [1800, 880]]),
      ...each('stump', [[1230, 540], [1360, 690], [2170, 790], [2290, 620], [2960, 640], [3080, 520]]),
      ...each('logPile', [[1240, 760], [2160, 600], [2950, 470]]),
      // Our fort at the end of the trail (one wall piece is 64 px: runs are laid 63 px apart).
      ...FORT.structures, { kind: 'crate', x: 3680, y: 460 },
    ],
    points: {
      log1n: { x: 1410, y: 520 }, log1s: { x: 1390, y: 760 }, log2n: { x: 2340, y: 600 }, log2s: { x: 2340, y: 840 }, log3n: { x: 3090, y: 460 }, log3s: { x: 3110, y: 700 },
      railNest: { x: 1750, y: 380 }, glade: { x: 700, y: 400 }, raidS: { x: 1700, y: 1060 }, raidN: { x: 2600, y: 30 }, raidNE: { x: 3000, y: 30 },
    },
    roads: { convoy: ROAD },
  },
  start: at(0.25, 1.7), startHeading: 0,
  enemies: [
    // A drone at the glade by the start, to warm up.
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'glade', hpMult: 0.5, sight: 360 },
    // Loggers in the undergrowth by each felled tree.
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'log1n', hpMult: 0.4, sight: 380, leash: 260 },
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'log1s', hpMult: 0.5, sight: 380, leash: 260 },
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'log2n', hpMult: 0.5, sight: 380, leash: 260 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'log2s', hpMult: 0.4, sight: 380, leash: 260 },
    { role: 'guard', clan: 'hive', tank: TANK.heavy, at: 'log3n', hpMult: 0.25, sight: 380, leash: 240 },
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'log3s', hpMult: 0.5, sight: 380, leash: 260 },
    // The Rail north of the trail, shooting through the trees.
    { role: 'turret', clan: 'hive', tank: TANK.rail, at: 'railNest', hpMult: 0.35, sight: 420 },
    // Raiders for the trucks.
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'raidS', when: 50, hpMult: 0.5 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'raidN', when: 95, hpMult: 0.5 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner, at: 'raidNE', when: 125, hpMult: 0.4 },
  ],
  allies: FORT.allies,
  crates: [{ at: { x: 700, y: 330 }, content: 'kit' }, { at: { x: 1750, y: 980 } }, { at: { x: 2500, y: 380 }, content: 'kit' }, { at: { x: 3300, y: 1000 } }],
  objective: { kind: 'escort', road: 'convoy', truckHp: 1650, speed: 32, trucks: 2, clear: 'felled' },
  bonus: [{ kind: 'truckHp', min: 0.25 }, { kind: 'kills', n: 9 }],
  loot: LOOT_FOREST,
};
