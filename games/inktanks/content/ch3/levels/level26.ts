import type { LevelDef } from '../../../src/logic/level/types';
import { blob, each, LOOT_SWAMP, patch, path, reedBed, TANK } from './kit';

/**
 * Level 26, Mud Islands (Capture): three islands in the Mirefen lagoon, each
 * with a flagpole. Raise our flag on all three at once. 4 × 2 screens. The
 * lagoon is deep water (only Hover crosses it); the islands are linked by
 * causeways of shallows and mud that a ground drive can take (×0.8 speed) but
 * a Hover floats straight over, so the water is a short cut for the right
 * drive and the causeways are the road for everyone else. Weasel guards hold
 * each island (a Flamer in the reeds on two of them); then Hover skimmers
 * skim in over the water for whichever flag is ours, so you juggle three
 * poles across the water and never sit on one.
 */
const WEST_ROAD = [{ x: 300, y: 700 }, { x: 650, y: 560 }, { x: 800, y: 380 }, { x: 900, y: 300 }];
const MID_ROAD = [{ x: 900, y: 300 }, { x: 1300, y: 340 }, { x: 1600, y: 600 }, { x: 1750, y: 780 }, { x: 1900, y: 800 }];
const EAST_ROAD = [{ x: 1900, y: 800 }, { x: 2300, y: 860 }, { x: 2600, y: 640 }, { x: 2800, y: 420 }, { x: 3000, y: 330 }];
const SPUR = [{ x: 3000, y: 330 }, { x: 3250, y: 560 }, { x: 3450, y: 800 }];

export const LEVEL_26: LevelDef = {
  id: 'ch3-26', number: 26, name: 'Mud Islands', type: 'capture',
  briefing: 'Three islands command the lagoon, and the Weasels hold them. Raise our flag on all three at once. Between the islands lies deep water that only a Hover crosses, and mud causeways for everyone else: slow, but it gets you there. A flag runs up while you sit alone in its ring. Skimmers will skim in over the water for any flag that is ours, so never stay put.',
  teaches: 'Capture rings across water; causeways for ground drives and open water for Hover; skimmers retaking flags',
  map: {
    cols: 4, rows: 2, base: 'marsh',
    terrain: [
      patch('swampWater', 360, 0, 3480, 1080),
      path('shallows', WEST_ROAD, 90), path('shallows', MID_ROAD, 90), path('shallows', EAST_ROAD, 90), path('shallows', SPUR, 90),
      blob('mud', 1000, 560, 120), blob('mud', 2100, 560, 90), blob('mud', 2500, 260, 90),
      blob('marsh', 900, 300, 170), blob('marsh', 1900, 800, 190), blob('marsh', 3000, 330, 170),
      blob('marsh', 3450, 800, 110), blob('marsh', 1400, 340, 70), blob('marsh', 2450, 560, 70),
    ],
    structures: [
      // West island: a stilt hut by the flag, reeds on the shore.
      { kind: 'stiltHutLarge', x: 760, y: 220 }, ...reedBed(1020, 400, 5), { kind: 'sandbags', x: 1010, y: 250 },
      // Middle island: a fish rack, a hut, reeds, sandbags toward the causeways.
      { kind: 'stiltHutSmall', x: 2020, y: 700 }, { kind: 'fishRack', x: 1790, y: 910 }, ...reedBed(2050, 900, 4), { kind: 'sandbagsV', x: 1760, y: 740 },
      // East island: huts, a jetty, reeds.
      { kind: 'stiltHutLarge', x: 3140, y: 250 }, { kind: 'jetty', x: 3000, y: 450 }, ...reedBed(2870, 280, 4), { kind: 'sandbags', x: 3090, y: 420 },
      ...reedBed(1400, 340, 3), ...reedBed(3450, 800, 3), ...each('mooringPost', [[900, 440], [1900, 940], [3100, 440]]),
      ...each('deadTree', [[500, 300], [1200, 700], [1600, 200], [2200, 300], [2700, 900], [3300, 100], [3700, 600], [2000, 100], [1400, 980]]),
      ...each('cypress', [[200, 150], [200, 950], [3750, 250], [3750, 980], [800, 1000]]),
      { kind: 'crate', x: 250, y: 500 },
    ],
    points: {
      start: { x: 220, y: 720 },
      flagW: { x: 900, y: 300 }, flagM: { x: 1900, y: 800 }, flagE: { x: 3000, y: 330 },
      gW: { x: 960, y: 380 }, gM: { x: 1990, y: 760 }, gE: { x: 2920, y: 380 },
      flameW: { x: 1020, y: 400 }, flameE: { x: 2870, y: 290 }, mortarSpit: { x: 3450, y: 800 },
      raidN: { x: 1500, y: 40 }, raidS: { x: 2600, y: 1050 }, raidE: { x: 3780, y: 560 }, raidW: { x: 400, y: 1040 },
    },
    roads: {},
  },
  start: 'start', startHeading: 0,
  enemies: [
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gW', hpMult: 0.5, sight: 400, leash: 220 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gM', hpMult: 0.5, sight: 400, leash: 220 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner2, at: 'gE', hpMult: 0.5, sight: 400, leash: 220 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flameW', hpMult: 0.36, sight: 300, leash: 180 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flameE', hpMult: 0.36, sight: 300, leash: 180 },
    { role: 'turret', clan: 'weasels', tank: TANK.mortar, at: 'mortarSpit', hpMult: 0.36, sight: 480 },
    // Skimmers skim in over the water for any flag that is ours.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'raidN', when: 60, hpMult: 0.43 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'raidS', when: 80, hpMult: 0.43 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'raidE', when: 105, hpMult: 0.43 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer2, at: 'raidW', when: 'alarm', hpMult: 0.43 },
  ],
  crates: [{ at: { x: 1000, y: 560 }, content: 'kit' }, { at: { x: 2100, y: 560 } }, { at: { x: 2500, y: 260 }, content: 'kit' }, { at: { x: 1400, y: 340 } }, { at: { x: 3450, y: 760 } }],
  objective: { kind: 'capture', flags: ['flagW', 'flagM', 'flagE'], radius: 140, capture: 6, holdAll: 5 },
  bonus: [{ kind: 'time', under: 185 }, { kind: 'kills', n: 8 }],
  timeLimit: 420,
  loot: LOOT_SWAMP,
};
