import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, grove, LOOT_FOREST, path, TANK, thicket } from './kit';

/**
 * Level 47, Old Rivals (Ace): Sly, Rook and Grim, the aces you beat in
 * chapters 1 to 3, have joined the Iron Hive, and all three must go down.
 * 4 × 2 screens of old forest, one home terrain each, so every counter is
 * needed at once: Sly (a Weasel Machinegun on fast Wheels) holds the long
 * forest trail in the middle, where Wheels run flat out; Rook (a Crow Mortar)
 * sits in a dense grove in the north-east, her shells flying over the trees
 * that hide her from you; Grim (a Weasel Hover Flamer) holds the mud and
 * pond in the south-east, where Hover is fast and his flames light the
 * undergrowth. A Hive escort stands by each. Every ace's wreck is intel.
 */
const TRAIL = [at(0.1, 1.5), at(0.6, 1.45), at(1.0, 1.1), at(1.5, 1.0), at(2.0, 1.0), at(2.4, 0.8), at(2.7, 0.9)];
const SLY = { x: 1500, y: 540 };
const ROOK = { x: 3250, y: 300 };
const GRIM = { x: 3250, y: 830 };
const OPEN: readonly (readonly [number, number, number])[] = [
  ...TRAIL.map((p) => [p.x, p.y, 95] as const), ...TRAIL.slice(1).map((p, i) => [(p.x + TRAIL[i]!.x) / 2, (p.y + TRAIL[i]!.y) / 2, 95] as const),
  [ROOK.x, ROOK.y, 150], [GRIM.x, GRIM.y, 260], [400, 800, 160], [1300, 350, 100],
];

export const LEVEL_47: LevelDef = {
  id: 'ch5-47', number: 47, name: 'Old Rivals', type: 'ace',
  briefing: 'Sly, Rook and Grim, the old aces, now fly the Hive’s colours, and the Brigade wants all three down. Sly’s fast Wheels own the long trail in the middle: do not trade shots in the open, use the trees. Rook’s Mortar sits in the dense grove in the north-east: her shells fly over the trees, so keep moving. Grim’s Hover Flamer holds the mud and the pond in the south-east, and his flames will light the undergrowth. Each has an escort. Destroy all three; each ace carries rare tech.',
  teaches: 'Every counter at once: a fast Wheels ace on the trail, a Mortar in the trees, a Hover Flamer on the mud',
  map: {
    cols: 4, rows: 2, base: 'forestFloor',
    terrain: [
      path('forestTrailH', TRAIL, 80),
      blob('clearing', 400, 800, 150), blob('clearing', 1300, 350, 90), blob('clearing', ROOK.x, ROOK.y, 140),
      blob('mud', GRIM.x, GRIM.y, 260), blob('swampWater', GRIM.x + 40, GRIM.y + 20, 110),
    ],
    structures: [
      // The old forest: dense round Rook's grove, light along Sly's trail.
      ...grove(500, 300, 380, 16, OPEN), ...grove(500, 1000, 280, 8, OPEN), ...grove(1500, 250, 360, 14, OPEN), ...grove(1500, 900, 360, 14, OPEN),
      ...grove(2400, 250, 330, 12, OPEN), ...grove(2400, 950, 330, 12, OPEN), ...grove(3250, 250, 330, 26, OPEN), ...grove(3700, 700, 200, 6, OPEN),
      ...thicket(2300, 600, 7), ...thicket(1000, 760, 6),
      // Sly's trail: stumps and logs to hide behind, a fallen log or two.
      ...each('stump', [[1380, 460], [1620, 620], [1800, 540], [1250, 690]]), ...each('logPile', [[1500, 700], [1900, 880]]),
      // Rook's grove: undergrowth round her clearing.
      ...each('undergrowth', [[3100, 200], [3400, 220], [3330, 420], [3080, 400]]),
      // Grim's mud: undergrowth and stumps on the banks.
      ...each('undergrowth', [[3020, 700], [3120, 1000], [3480, 760], [3470, 960]]), ...each('stump', [[3050, 860], [3400, 880]]),
    ],
    points: {
      sly: SLY, slyEsc: { x: 1750, y: 480 }, rook: ROOK, rookEsc: { x: 3050, y: 300 }, rookEsc2: { x: 3450, y: 380 },
      railN: { x: 2900, y: 150 }, slyEsc2: { x: 1250, y: 760 }, grim: GRIM, grimEsc: { x: 2900, y: 800 }, glade: { x: 1300, y: 350 }, east: { x: 3800, y: 540 },
    },
    roads: {},
  },
  start: at(0.2, 1.6), startHeading: 0,
  mixedClans: true,
  enemies: [
    { role: 'guard', clan: 'weasels', tank: 'machinegun5/light4/wheels4', at: 'sly', leash: 420, sight: 440, name: 'Sly', ace: true, hpMult: 0.86, kits: 0 },
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'slyEsc', hpMult: 0.37, sight: 380, leash: 250 },
    { role: 'guard', clan: 'crows', tank: TANK.crowMortar, at: 'rook', leash: 150, sight: 440, name: 'Rook', ace: true, hpMult: 0.86, kits: 0 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'rookEsc', hpMult: 0.3, sight: 380, leash: 200 },
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'rookEsc2', hpMult: 0.37, sight: 380, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: 'flamer5/medium4/hover4', at: 'grim', leash: 320, sight: 440, name: 'Grim', ace: true, hpMult: 0.86, kits: 0 },
    { role: 'guard', clan: 'hive', tank: TANK.logger, at: 'grimEsc', hpMult: 0.3, sight: 380, leash: 220 },
    { role: 'guard', clan: 'hive', tank: TANK.rail, at: 'railN', hpMult: 0.3, sight: 420, leash: 150 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'slyEsc2', hpMult: 0.3, sight: 380, leash: 220 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'east', when: 'alarm', hpMult: 0.37 },
  ],
  crates: [{ at: { x: 450, y: 760 }, content: 'kit' }, { at: { x: 1300, y: 330 } }, { at: { x: 2300, y: 700 }, content: 'kit' }, { at: { x: 2900, y: 500 } }, { at: { x: 3700, y: 560 } }],
  objective: { kind: 'ace' },
  bonus: [{ kind: 'time', under: 150 }, { kind: 'kills', n: 8 }],
  timeLimit: 540,
  loot: LOOT_FOREST,
};
