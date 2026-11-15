import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, depot, drifts, each, LOOT_SNOW, path, ridge, TANK } from './kit';

/**
 * Level 34, Blizzard Pass (Escort): bring the supply truck up through the
 * mountain pass to our depot, 4 × 2 screens of snow. The truck keeps to the
 * packed-snow road (deep snow slows Wheels to ×0.75) and drives only while
 * you're near. Blizzards blow through the pass (at 0:35, again at 1:30):
 * nobody sees past 200 px and the wind pushes everything that moves, tanks
 * and shells alike. The clans use them: Weasel skimmers raid the truck under
 * the first, a skimmer and a Crow scout under the second. Inside the pass the
 * ridges close in: a Crow mortar on the north ridge top shells the road over
 * the cliff, a Boar Heavy waits behind the drifts, and a Laser watches the
 * pass's mouth (its aim line shows before each beam). The road ends inside
 * our white-cement depot, whose gun towers open up once you're in sight.
 */
const ROAD = [at(0.15, 1.58), at(0.85, 1.52), at(1.35, 1.28), at(1.75, 1.02), at(2.3, 0.96), at(2.8, 1.02), at(3.3, 1.0), at(3.8, 1.0)];
const DEPOT = depot(3420, 540, 320, 260, ['cannon', 'machinegun']);
/** The pass: ridge cliffs north and south of the road from PASS.x0 to PASS.x1. */
const PASS = { x0: 1460, north: 330, south: 760, n: 10 } as const;

export const LEVEL_34: LevelDef = {
  id: 'ch4-34', number: 34, name: 'Blizzard Pass', type: 'escort',
  briefing: 'Our depot past the mountain pass is cut off. Bring the supply truck through; it only drives while you stay close. Blizzards blow through the pass: in one you’ll see only a stone’s throw, and the wind pushes you and your shells off line. The clans will use them to raid the truck. A mortar on the north ridge can shell the road over the cliff, and a Laser watches the far end of the pass. The depot’s gun towers cover you at the end.',
  teaches: 'Escort through blizzards; the wind pushes tanks and shells; mortars over cliffs; the Laser at long range',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', ROAD, 80),
      // Frozen ground on the ridge tops and by the depot; a frozen pond by the road's start.
      blob('frozenDirt', 1950, 160, 220), blob('frozenDirt', 2100, 940, 200), blob('frozenDirt', 3640, 540, 230),
      blob('ice', 520, 420, 150), blob('ice', 2950, 900, 120),
    ],
    structures: [
      // The pass: ridge cliffs either side of the road (unbreakable: they block sight, shots and driving).
      ...ridge(PASS.x0, PASS.north, PASS.n), ...ridge(PASS.x0 + 64, PASS.south, PASS.n - 1),
      { kind: 'ridgeCorner', x: PASS.x0 - 86, y: PASS.north }, { kind: 'ridgeCorner', x: PASS.x0 + 64 + 128 * (PASS.n - 1) - 22, y: PASS.south },
      // Snowdrift banks in the pass: low cover any gun digs through.
      ...drifts(1800, 640, 2), ...drifts(2250, 420, 2), ...drifts(2350, 660, 2),
      // The north ridge top: the mortar's nest behind drifts, firs.
      ...drifts(1880, 260, 2), ...each('firSmall', [[1700, 180], [2200, 200], [2400, 120]]),
      // The approach: pines, firs (they hide a tank), log cabins, a frozen fence.
      ...each('snowPine', [[300, 300], [700, 250], [1000, 420], [1200, 1000], [600, 1020], [250, 650], [1500, 120], [2700, 160], [3050, 980], [3200, 200]]),
      ...each('firSmall', [[900, 620], [1100, 980], [1250, 520], [2900, 420], [3000, 700]]),
      { kind: 'cabinSmall', x: 450, y: 1000 }, { kind: 'cabinLarge', x: 1100, y: 200 },
      { kind: 'frozenFenceH', x: 700, y: 960 }, { kind: 'frozenFenceH', x: 764, y: 960 },
      ...each('iceRockB', [[1300, 820], [2850, 300], [3150, 820]]), ...each('iceRockA', [[650, 700], [2000, 1000]]),
      // Our depot at the end of the road (one wall piece is 64 px: runs are laid 63 px apart).
      ...DEPOT.structures, { kind: 'crate', x: 3680, y: 460 },
    ],
    points: {
      fir: { x: 960, y: 640 }, ridgeTop: { x: 1950, y: 190 }, passHeavy: { x: 2300, y: 610 }, passMouth: { x: 2960, y: 400 },
      raidN: { x: 1200, y: 40 }, raidS: { x: 1500, y: 1060 }, raidSE: { x: 2600, y: 1060 }, raidNE: { x: 3100, y: 30 },
    },
    roads: { truck: ROAD },
  },
  start: at(0.3, 1.75), startHeading: 0,
  mixedClans: true,
  weather: { kind: 'blizzard', first: 35, every: 55, last: 14, sight: 200, wind: 30 },
  enemies: [
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'fir', hpMult: 0.44, sight: 400, leash: 380 },
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: 'ridgeTop', hpMult: 0.31, sight: 480 },
    { role: 'guard', clan: 'boars', tank: TANK.boarHeavy, at: 'passHeavy', hpMult: 0.22, sight: 400, leash: 240 },
    { role: 'guard', clan: 'crows', tank: TANK.laser, at: 'passMouth', hpMult: 0.28, sight: 460, leash: 220 },
    // Raiders under the blizzards, for the truck.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'raidN', when: 37, hpMult: 0.38 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'raidS', when: 39, hpMult: 0.38 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'raidSE', when: 92, hpMult: 0.38 },
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'raidNE', when: 94, hpMult: 0.38 },
  ],
  allies: DEPOT.allies,
  crates: [{ at: { x: 1000, y: 760 }, content: 'kit' }, { at: { x: 1950, y: 100 } }, { at: { x: 2600, y: 880 }, content: 'kit' }, { at: { x: 3100, y: 640 } }],
  objective: { kind: 'escort', road: 'truck', truckHp: 2300, speed: 32 },
  bonus: [{ kind: 'truckHp', min: 0.2 }, { kind: 'kills', n: 6 }],
  loot: LOOT_SNOW,
};
