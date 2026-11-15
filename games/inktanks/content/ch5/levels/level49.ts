import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, depot, each, grove, LOOT_FOREST, path, TANK, thicket } from './kit';

/**
 * Level 49, The Long Night (Hold): hold the Brigade's camp for 3 minutes,
 * 3 × 2 screens of old forest. The camp is our white-cement yard with two gun
 * towers at its gate and two more inside; the forest closes round it, and the
 * Hive throws everything it has at it in rhythm: drone raiders first, then
 * gunners and a logger with a flamer, mortars that shell the yard from the
 * trees, Rails that shoot through the forest, a Heavy, and in the last minute
 * the clans' veterans (a Laser, hover skimmers, a Boar Heavy) on the alarm.
 * Three trails bring the waves: the clock only runs while you are in the
 * ring, so you hold by moving: drive out of mortar rings, break a Rail's
 * line, let the towers cover the gate. A Boar Heavy from the clans stands
 * with you.
 */
const CX = 1500;
const CY = 540;
const MAP = { w: 2880, h: 1080 } as const;
/** The camp: gate west at (1300, 540), yard 320 × 260 to the east. */
const FORT = depot(CX - 200, CY, 320, 260, ['cannon', 'machinegun']);
const TRAILS = [
  path('forestTrailH', [at(0, 0.5), at(0.5, 0.5), at(1.0, 0.5)], 80),
  path('forestTrail', [at(1.5, 0), at(1.5, 0.3), at(1.45, 0.6)], 70),
  path('forestTrail', [at(1.5, 2), at(1.5, 1.7), at(1.48, 1.4)], 70),
  path('forestTrailH', [at(1.7, 0.5), at(2.2, 0.45), at(3, 0.5)], 80),
];
const OPEN: readonly (readonly [number, number, number])[] = [
  [CX, CY, 330], [200, 540, 150], [500, 540, 100], [900, 540, 100], [1500, 150, 90], [1500, 950, 90], [2300, 520, 100], [2700, 540, 130],
];

export const LEVEL_49: LevelDef = {
  id: 'ch5-49', number: 49, name: 'The Long Night', type: 'hold',
  briefing: 'The Hive wants the Brigade’s camp, and it is sending everything. Hold the yard for 3 minutes: drones and gunners first, then flamers, mortars that shell the yard from the trees, Rails whose slug goes through walls and forest, and at the end the clans’ old veterans. The clock only runs while you are in the ring, so keep moving inside it: leave each mortar ring, get off a Rail’s charge line, and let the gun towers cover the gate. A clan Heavy fights beside you.',
  teaches: 'The last stand: hold the camp against every enemy type; keep moving; read the charge lines',
  map: {
    cols: 3, rows: 2, base: 'forestFloor',
    terrain: [...TRAILS, blob('clearing', CX, CY, 330), blob('clearing', 200, 540, 130), blob('clearing', 2700, 540, 120)],
    structures: [
      ...grove(500, 250, 380, 16, OPEN, MAP), ...grove(500, 850, 380, 16, OPEN, MAP), ...grove(1000, 160, 300, 12, OPEN, MAP), ...grove(1000, 920, 300, 12, OPEN, MAP),
      ...grove(2000, 160, 320, 12, OPEN, MAP), ...grove(2000, 920, 320, 12, OPEN, MAP), ...grove(2450, 280, 360, 14, OPEN, MAP), ...grove(2450, 820, 360, 14, OPEN, MAP),
      ...thicket(900, 760, 7, MAP), ...thicket(2050, 400, 7, MAP), ...thicket(1900, 720, 6, MAP), ...thicket(1000, 340, 6, MAP),
      ...each('undergrowth', [[1000, 420], [1200, 760], [1850, 300], [1950, 840], [2300, 620]]),
      ...each('stump', [[1120, 380], [1250, 700], [1800, 450], [1850, 650], [1700, 280]]),
      ...each('logPile', [[1160, 330], [1760, 780]]),
      ...FORT.structures, { kind: 'crate', x: CX + 40, y: CY + 80 },
    ],
    points: {
      zone: { x: CX + 20, y: CY },
      west: { x: 40, y: 540 }, east: { x: 2840, y: 540 }, north: { x: 1500, y: 30 }, south: { x: 1500, y: 1050 },
      railN: { x: 1100, y: 130 }, railS: { x: 1950, y: 960 }, mortarN: { x: 2050, y: 130 }, mortarS: { x: 950, y: 980 },
      northE: { x: 2700, y: 60 }, southW: { x: 300, y: 1040 },
    },
    roads: {},
  },
  start: { x: CX - 120, y: CY }, startHeading: 0,
  mixedClans: true,
  allies: [...FORT.allies, { kind: 'tower', at: { x: CX + 90, y: CY - 90 }, gun: 'cannon' }, { kind: 'tower', at: { x: CX + 90, y: CY + 90 }, gun: 'machinegun' }],
  friends: [{ at: { x: CX - 60, y: CY + 70 }, tank: TANK.boarHeavy, clan: 'boars', name: 'Tusk' }],
  enemies: [
    // Dusk: drone raiders from both trails.
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'west', when: 5, hpMult: 0.58 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'east', when: 8, hpMult: 0.58 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner, at: 'north', when: 19, hpMult: 0.47 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner, at: 'south', when: 22, hpMult: 0.47 },
    // Midnight: loggers, mortars from the trees, the Rails.
    { role: 'wave', clan: 'hive', tank: TANK.logger, at: 'west', when: 40, hpMult: 0.34 },
    { role: 'wave', clan: 'hive', tank: TANK.mortar, at: 'mortarN', when: 45, hpMult: 0.47 },
    { role: 'wave', clan: 'hive', tank: TANK.mortar, at: 'mortarS', when: 48, hpMult: 0.47 },
    { role: 'wave', clan: 'hive', tank: TANK.rail, at: 'railN', when: 59, hpMult: 0.41 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'east', when: 62, hpMult: 0.58 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner3, at: 'south', when: 72, hpMult: 0.47 },
    { role: 'wave', clan: 'hive', tank: TANK.rail, at: 'railS', when: 80, hpMult: 0.41 },
    { role: 'wave', clan: 'hive', tank: TANK.heavy, at: 'east', when: 86, hpMult: 0.29 },
    // The last hour before dawn: the clans' veterans (a Laser, hovers, a Heavy) and a mortar barrage.
    { role: 'wave', clan: 'crows', tank: 'laser3/medium3/halftracks3', at: 'north', when: 102, hpMult: 0.45 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'northE', when: 107, hpMult: 0.58 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'southW', when: 110, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.crowMortar, at: 'mortarN', when: 117, hpMult: 0.41 },
    { role: 'wave', clan: 'hive', tank: TANK.logger, at: 'east', when: 122, hpMult: 0.34 },
    { role: 'wave', clan: 'boars', tank: TANK.boarHeavy, at: 'west', when: 126, hpMult: 0.29 },
  ],
  crates: [{ at: { x: CX + 120, y: CY - 20 }, content: 'kit' }, { at: { x: CX - 130, y: CY - 70 }, content: 'kit' }, { at: { x: 700, y: 540 } }, { at: { x: 2300, y: 560 }, content: 'kit' }, { at: { x: 1500, y: 960 } }],
  objective: { kind: 'hold', zone: 'zone', radius: 230, seconds: 180 },
  bonus: [{ kind: 'kills', n: 5 }, { kind: 'noKit' }],
  loot: LOOT_FOREST,
};
