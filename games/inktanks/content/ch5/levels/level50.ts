import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, grove, LOOT_FOREST, path, TANK, thicket } from './kit';

/**
 * Level 50, The Harvester (Fortress): the end of the campaign. The Iron Hive's
 * logging fortress, a 320 px felling machine, circles a clearing in the
 * oldest part of Deepwood, 3 × 2 screens. Its hull is armoured while its four
 * turrets stand: two Cannons, a Machinegun and a Rail at the tail (the Rail's
 * slug goes through the trees: its charge line is the warning). With them gone
 * it charges (phase 2) on its saws; bait the charge into the old trunks and
 * the felled logs round the clearing and shoot while it is dazed. Halfway in,
 * the Hive sets the forest alight to flush you out: the blaze spreads tree to
 * tree from the north-east, closing the thickets and the edge of the clearing
 * until it burns out. Hive raiders come on the alarm and at the fire.
 */
const FX = 1440;
const FY = 560;
const MAP = { w: 2880, h: 1080 } as const;
const OPEN: readonly (readonly [number, number, number])[] = [
  [FX, FY, 470], [300, 540, 120], [650, 540, 100], [2750, 500, 160],
];

export const LEVEL_50: LevelDef = {
  id: 'ch5-50', number: 50, name: 'The Harvester', type: 'fortress',
  briefing: 'This is the end of the road. The Iron Hive’s logging fortress, the Harvester, circles the clearing at the heart of Deepwood, felling everything it passes. The hull is armoured while any turret stands: two Cannons, a Machinegun, and a Rail at the tail whose slug goes through the trees. With its guns gone it charges on its saws: watch the red lane, step aside, and let it hit the old trunks and the logs. A dazed Harvester takes extra damage. Halfway through the Hive sets the forest on fire; keep to the clearing. Finish it.',
  teaches: 'The campaign’s final boss; baiting a charge into old trees; a forest fire; a Rail through the trees',
  map: {
    cols: 3, rows: 2, base: 'forestFloor',
    terrain: [
      path('forestTrailH', [at(0, 0.5), at(0.35, 0.5), at(0.7, 0.52), at(1.0, 0.52)], 80),
      blob('clearing', FX, FY, 520), blob('clearing', 300, 540, 120), blob('clearing', 2750, 500, 140),
    ],
    structures: [
      // The ring of old trees round the clearing: the walls it charges into (trunks 110 apart close the way to its hull).
      ...grove(FX, FY, 750, 70, [[FX, FY, 540], [300, 540, 120], [650, 540, 100], [2750, 500, 160]], MAP),
      ...grove(300, 220, 260, 10, OPEN, MAP), ...grove(300, 900, 260, 10, OPEN, MAP), ...grove(2650, 250, 260, 10, OPEN, MAP), ...grove(2650, 880, 260, 10, OPEN, MAP),
      ...thicket(700, 800, 6, MAP), ...thicket(2200, 220, 6, MAP), ...thicket(2250, 900, 6, MAP),
      // Felled logs and stumps inside the clearing: low cover (the Harvester rolls over nothing, it charges into them), and trunks to dodge behind.
      { kind: 'fallenLog', x: FX - 200, y: FY - 60 }, { kind: 'fallenLogV', x: FX + 240, y: FY + 100 }, { kind: 'fallenLog', x: FX + 40, y: FY + 250 }, { kind: 'fallenLog', x: FX - 80, y: FY - 300 },
      ...each('stump', [[FX - 400, FY + 100], [FX + 380, FY - 160], [FX - 120, FY + 150], [FX + 160, FY - 180], [FX - 300, FY - 250], [FX + 330, FY + 270]]),
      ...each('logPile', [[FX - 450, FY - 120], [FX + 450, FY + 120]]),
      ...each('undergrowth', [[600, 420], [800, 680], [2250, 480], [2100, 700]]),
      { kind: 'cabinSmall', x: 260, y: 640 },
    ],
    points: { gateW: { x: 700, y: 540 }, east: { x: 2840, y: 500 }, fireNE: { x: 2350, y: 330 }, north: { x: 1500, y: 40 }, south: { x: 1500, y: 1040 } },
    roads: {
      ring: [{ x: FX - 330, y: FY - 200 }, { x: FX + 330, y: FY - 200 }, { x: FX + 330, y: FY + 200 }, { x: FX - 330, y: FY + 200 }],
    },
  },
  start: at(0.12, 0.5), startHeading: 0,
  mixedClans: true,
  fire: { start: [{ x: 2300, y: 250 }, { x: 2350, y: 330 }], at: 75, every: 3, spread: 120, burn: 14, hops: 8, text: 'The Hive has set the forest on fire!' },
  friends: [{ at: at(0.1, 0.45), tank: TANK.boarHeavy, clan: 'boars', name: 'Tusk' }],
  enemies: [
    // The Hive's guard of the fortress arrives on the alarm and with the fire.
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'east', when: 'alarm', hpMult: 0.37 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner, at: 'north', when: 70, hpMult: 0.3 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'south', when: 80, hpMult: 0.37 },
    { role: 'wave', clan: 'hive', tank: TANK.logger, at: 'east', when: 100, hpMult: 0.22 },
  ],
  crates: [
    { at: at(0.15, 0.55), content: { family: 'rail', mk: 4 } }, { at: at(0.2, 0.4), content: 'kit' }, { at: { x: 700, y: 640 }, content: 'kit' },
    { at: { x: FX - 480, y: FY + 40 }, content: 'kit' }, { at: { x: FX + 480, y: FY - 40 }, content: 'kit' }, { at: { x: FX, y: FY + 330 } },
  ],
  objective: {
    kind: 'fortress',
    boss: {
      name: 'The Harvester', hp: 2600, speed: 24, road: 'ring', body: 'harvester', clan: 'hive', radius: 98, armour: 14,
      turrets: [
        { gun: 'cannon', dx: 30, dy: -34, hp: 200 }, { gun: 'cannon', dx: 30, dy: 34, hp: 200 },
        { gun: 'rail', dx: -28, dy: 0, hp: 240 }, { gun: 'machinegun', dx: 59, dy: 0, hp: 180 },
      ],
    },
  },
  bonus: [{ kind: 'time', under: 135 }, { kind: 'kills', n: 4 }],
  loot: LOOT_FOREST,
};
