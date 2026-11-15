import type { LevelDef, StructPlace } from '../../../src/logic/level/types';
import { blob, each, LOOT_SWAMP, patch, path, reedBed, row, TANK } from './kit';

/**
 * Level 25, Break the Dams (Raid): three sluice dams hold the Mirefen water,
 * and each one you break floods or drains part of the map. 4 × 2 screens.
 * A deep mere fills the middle (ground drives can't cross it) between two
 * roads: the north road (y 230) and the south road (y 860), both running from
 * our west bank to the east bank.
 *  - Dam 1 (south weir, west): breaking it floods the south road round it
 *    (x 900-1500) and drains the west mere into mud.
 *  - Dam 2 (north weir, middle): breaking it floods the north road (x 1700-2400)
 *    and drains the whole east mere into mud: a new way across.
 *  - Dam 3 (the east pond's weir): the pond drains into mud.
 * Break dam 1 first and you must take the north road (then dam 2's flood cuts
 * that, but the drained mere carries you on); break dam 2 first and the mere's
 * east is yours, but you may no longer drive the north road back. A tank in
 * new deep water is washed to dry land. Weasel guards hold each dam, a Flamer
 * waits in the reeds, a mortar on the mere's island shells the roads, and
 * skimmers patrol the mere (they cross mud as well as water).
 */
const WEIR_W = 110;
const WEIR_GAP = 120;

/** A stone weir along y from x0 to x1 with a sluice dam (`id`) at damX. */
function weir(y: number, x0: number, x1: number, damX: number, id: string): StructPlace[] {
  const left = Math.floor((damX - WEIR_W - x0) / 60) + 1;
  const start = damX + WEIR_GAP;
  const right = Math.floor((x1 - start) / 60) + 1;
  return [...row('wallStone', x0, y, left, 60), { kind: 'sluiceDam', x: damX, y, id, tag: 'target' }, ...row('wallStone', start, y, right, 60)];
}

export const LEVEL_25: LevelDef = {
  id: 'ch3-25', number: 25, name: 'Break the Dams', type: 'raid',
  briefing: 'Three sluice dams hold the Weasels’ water, and their supply lines run along it. Break all three. Every dam you break floods or drains part of the marsh: the first dam’s water drowns the south road, the second’s drowns the north road but drains the mere into mud you can cross. Think about which road you will need next. Any gun breaks a dam, even across the water.',
  teaches: 'Breaking dams; floods and drains rewrite the routes; choose the order',
  map: {
    cols: 4, rows: 2, base: 'marsh',
    terrain: [
      path('dirt', [{ x: 100, y: 230 }, { x: 3700, y: 230 }], 80), path('dirt', [{ x: 100, y: 860 }, { x: 3700, y: 860 }], 80), path('dirt', [{ x: 300, y: 230 }, { x: 300, y: 860 }], 70),
      patch('swampWater', 800, 362, 2200, 336), patch('swampWater', 3000, 300, 600, 240),
      blob('marsh', 2400, 530, 80), blob('dirt', 1150, 800, 130), blob('dirt', 2050, 270, 130), blob('dirt', 3300, 640, 130),
    ],
    structures: [
      ...weir(340, 830, 2970, 2050, 'dam2'),
      ...weir(720, 830, 2970, 1200, 'dam1'),
      ...weir(560, 3030, 3570, 3300, 'dam3'),
      // Reeds: the Flamers' hides by each road, and the island.
      ...reedBed(1650, 280, 4), ...reedBed(900, 840, 4), ...reedBed(2900, 800, 4), ...reedBed(2400, 540, 3),
      // Guards' cover by the dams.
      { kind: 'sandbags', x: 1150, y: 790 }, { kind: 'sandbags', x: 2200, y: 290 }, { kind: 'sandbags', x: 3300, y: 650 },
      { kind: 'stiltHutSmall', x: 1000, y: 780 }, { kind: 'stiltHutLarge', x: 2300, y: 270 }, { kind: 'stiltHutSmall', x: 3450, y: 660 },
      { kind: 'fishRack', x: 420, y: 560 }, { kind: 'crate', x: 3700, y: 560 },
      ...each('cypress', [[200, 120], [200, 980], [1400, 1020], [2700, 1020], [3750, 140], [3750, 960], [1000, 120]]),
      ...each('deadTree', [[600, 400], [600, 700], [1700, 960], [2500, 960], [3100, 130], [3600, 230]]),
      ...each('mooringPost', [[790, 560], [3010, 560]]),
    ],
    points: {
      start: { x: 220, y: 540 },
      g1: { x: 1150, y: 800 }, g2: { x: 2050, y: 270 }, g3: { x: 3300, y: 650 },
      flame1: { x: 900, y: 840 }, flame2: { x: 1650, y: 280 }, flame3: { x: 2900, y: 800 },
      isle: { x: 2400, y: 530 }, waveE: { x: 3700, y: 540 }, waveW: { x: 100, y: 540 },
    },
    roads: { mere: [{ x: 900, y: 530 }, { x: 2900, y: 530 }] },
  },
  start: 'start', startHeading: 0,
  enemies: [
    { role: 'guard', clan: 'weasels', tank: TANK.gunner2, at: 'g1', hpMult: 0.57, sight: 420, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner2, at: 'g2', hpMult: 0.57, sight: 420, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner2, at: 'g3', hpMult: 0.57, sight: 420, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flame1', hpMult: 0.36, sight: 300, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flame2', hpMult: 0.36, sight: 300, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flame3', hpMult: 0.36, sight: 300, leash: 200 },
    { role: 'turret', clan: 'weasels', tank: TANK.mortar, at: 'isle', hpMult: 0.36, sight: 480 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'waveE', when: 'alarm', hpMult: 0.5 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'waveE', when: 100, hpMult: 0.5 },
  ],
  crates: [{ at: { x: 700, y: 300 }, content: 'kit' }, { at: { x: 1500, y: 780 } }, { at: { x: 2500, y: 800 }, content: 'kit' }, { at: { x: 3600, y: 400 } }],
  floods: [
    { by: 'dam1', terrain: [patch('swampWater', 900, 790, 600, 140), patch('mud', 800, 362, 900, 336)], text: 'Dam 1 is breached! The south road floods and the west mere drains.' },
    { by: 'dam2', terrain: [patch('swampWater', 1700, 160, 700, 140), patch('mud', 1700, 362, 1300, 336)], text: 'Dam 2 is breached! The north road floods and the east mere drains.' },
    { by: 'dam3', terrain: [patch('mud', 3000, 300, 600, 240)], text: 'Dam 3 is breached! The pond drains.' },
  ],
  objective: { kind: 'raid', tag: 'target', label: 'Sluice dams' },
  bonus: [{ kind: 'time', under: 215 }, { kind: 'swaps', n: 1 }],
  timeLimit: 300,
  loot: LOOT_SWAMP,
};
