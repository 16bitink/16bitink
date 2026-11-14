import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, grove, LOOT_FOREST, logBridge, path, TANK, thicket } from './kit';

/**
 * Level 44, Timber Bridges (Raid): a Hive column is rolling east down three
 * forest trails, and each trail crosses the river on a log bridge, 4 × 2
 * screens. Blow all three bridges (500 HP: any gun) before a column tank
 * reaches its trail's end: a blown bridge strands that tank on the bank. The
 * column doesn't wait and its three tanks start at different distances, so
 * the order matters: the north bridge's tank is nearest, but you start in the
 * south. Hive guards hold each bridge's east bank, and a Rail in the trees
 * covers the river's middle.
 */
const MAP = { w: 3840, h: 1080 } as const;
const BY = [250, 540, 830] as const;
const BX = [1900, 2050, 1850] as const;
const RIVER = [{ x: 1960, y: 0 }, { x: 1900, y: 250 }, { x: 2050, y: 540 }, { x: 1850, y: 830 }, { x: 1960, y: 1080 }];
const BR = BY.map((y, i) => logBridge(BX[i]!, y, 'x', `bridge${i + 1}`, 'target'));
/** One trail per bridge, west to east (the column's roads). */
const ROAD = BY.map((y, i) => [{ x: 60, y }, { x: BX[i]! - 500, y: y + (i === 0 ? 40 : i === 2 ? -40 : 0) }, { x: BX[i]!, y }, { x: BX[i]! + 600, y: y + (i === 1 ? 50 : 0) }, { x: 3700, y }]);
const OPEN: readonly (readonly [number, number, number])[] = [
  ...ROAD.flatMap((r) => r.flatMap((p, i) => (i ? [[p.x, p.y, 95] as const, [(p.x + r[i - 1]!.x) / 2, (p.y + r[i - 1]!.y) / 2, 95] as const, [(p.x * 3 + r[i - 1]!.x) / 4, (p.y * 3 + r[i - 1]!.y) / 4, 95] as const, [(p.x + r[i - 1]!.x * 3) / 4, (p.y + r[i - 1]!.y * 3) / 4, 95] as const] : []))),
  [250, 1000, 160], [2400, 380, 100], [2500, 700, 100],
];

export const LEVEL_44: LevelDef = {
  id: 'ch5-44', number: 44, name: 'Timber Bridges', type: 'raid',
  briefing: 'A Hive column is rolling east down three forest trails, and each trail crosses the river on a log bridge. Blow all three bridges before the column reaches the end of its trail: a blown bridge strands its tank on the bank. The column will not wait, and the nearest tank is not the nearest bridge to you, so work out which bridge goes first. Hive guards hold the east bank, and a Rail in the trees covers the river.',
  teaches: 'A race against a column; choose the bridge order; blow log bridges (any gun, 500 HP)',
  map: {
    cols: 4, rows: 2, base: 'forestFloor',
    terrain: [
      ...ROAD.map((r) => path('forestTrailH', r, 80)),
      blob('clearing', 250, 1000, 150), blob('clearing', 2400, 380, 90), blob('clearing', 2500, 700, 90),
      path('water', RIVER, 120),
      ...BR.map((b) => b.deck),
    ],
    structures: [
      ...grove(700, 400, 360, 16, OPEN, MAP), ...grove(700, 700, 300, 8, OPEN, MAP), ...grove(1300, 400, 400, 16, OPEN, MAP), ...grove(1300, 1000, 340, 12, OPEN, MAP),
      ...grove(2600, 150, 400, 14, OPEN, MAP), ...grove(2400, 540, 330, 10, OPEN, MAP), ...grove(2700, 1000, 360, 14, OPEN, MAP), ...grove(3400, 400, 360, 14, OPEN, MAP), ...grove(3400, 950, 300, 10, OPEN, MAP),
      ...thicket(1450, 680, 7, MAP), ...thicket(2300, 680, 6, MAP),
      ...BR.map((b) => b.span),
      // Undergrowth and logs on the east bank, where the guards wait.
      ...each('undergrowth', [[2200, 160], [2230, 400], [2230, 620], [2180, 940], [1600, 380], [1620, 720]]),
      ...each('stump', [[2150, 320], [2160, 760], [2300, 240]]), ...each('logPile', [[2150, 440], [2200, 880], [1700, 960]]),
      { kind: 'crate', x: 300, y: 940 },
    ],
    points: {
      gN: { x: 2200, y: 220 }, gM: { x: 2230, y: 600 }, gS: { x: 2190, y: 900 }, railM: { x: 2450, y: 540 },
      c1: { x: 500, y: 262 }, c2: { x: 300, y: 540 }, c3: { x: 70, y: 830 },
      westW: { x: 60, y: 120 }, eastN: { x: 3780, y: 400 },
    },
    roads: { col1: ROAD[0]!, col2: ROAD[1]!, col3: ROAD[2]! },
  },
  start: { x: 250, y: 1000 }, startHeading: 0,
  enemies: [
    // The column: one armed tank down each trail.
    { role: 'convoy', clan: 'hive', tank: TANK.gunner, at: 'c1', route: 'col1', hpMult: 0.4, speedMult: 0.22 },
    { role: 'convoy', clan: 'hive', tank: TANK.gunner, at: 'c2', route: 'col2', hpMult: 0.4, speedMult: 0.22 },
    { role: 'convoy', clan: 'hive', tank: TANK.gunner, at: 'c3', route: 'col3', hpMult: 0.4, speedMult: 0.22 },
    // The bridge guards on the east bank.
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'gN', hpMult: 0.4, sight: 400, leash: 240 },
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'gM', hpMult: 0.5, sight: 400, leash: 240 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'gS', hpMult: 0.4, sight: 400, leash: 240 },
    { role: 'turret', clan: 'hive', tank: TANK.rail, at: 'railM', hpMult: 0.4, sight: 420 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'eastN', when: 70, hpMult: 0.5 },
  ],
  crates: [{ at: { x: 400, y: 930 }, content: 'kit' }, { at: { x: 1600, y: 560 } }, { at: { x: 2400, y: 400 }, content: 'kit' }, { at: { x: 1400, y: 960 } }],
  objective: { kind: 'raid', tag: 'target', label: 'Log bridges', column: true },
  bonus: [{ kind: 'time', under: 120 }, { kind: 'kills', n: 8 }],
  timeLimit: 300,
  loot: LOOT_FOREST,
};
