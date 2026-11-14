import type { LevelDef } from '../../../src/logic/level/types';
import { blob, each, LOOT_SWAMP, patch, path, reedBed, row, TANK } from './kit';

/**
 * Level 28, Sunken Prototype (Salvage): a prototype went down in the Mirefen
 * and sank in a bog at the east end of 4 × 2 screens; the cargo helicopter
 * will take it from a pad in the south-west corner. Two ways back, both bad:
 * the old dirt track round the north edge (dry, fast, long, and guarded: a
 * Flamer in reeds, Cannons at a hut), or straight home across the middle,
 * through the shallows that slow a tank down, with the prototype's weight on
 * top (carrying slows you to 80%, shallows to 80% again). A deep channel in
 * the south keeps the ground tanks out of the south, but skimmers patrol it.
 * Lifting the prototype calls every guard to you, and waves close in from the
 * east and south: the longer you wade, the more of them arrive.
 */
const WRECK = { x: 3260, y: 540 };
const PAD = { x: 330, y: 860 };

export const LEVEL_28: LevelDef = {
  id: 'ch3-28', number: 28, name: 'Sunken Prototype', type: 'salvage',
  briefing: 'A prototype went down in the bog at the east end of the Mirefen and sank in the mud. Drive in, pick it out, and take it to the pad in the south-west: the cargo helicopter will come when you have it. Carrying it slows you, and slows you more in the shallows, and every Weasel in the marsh will come for it. The old dirt track round the north is dry and fast but guarded; the shallows across the middle are shorter but wet. Skimmers patrol the deep channel in the south.',
  teaches: 'Carrying slows you more in water: choose the dry road or the wet shortcut while enemies converge',
  map: {
    cols: 4, rows: 2, base: 'marsh',
    terrain: [
      // The dry road: from the start along the north edge to the bog.
      path('dirt', [{ x: 120, y: 200 }, { x: 1100, y: 130 }, { x: 2100, y: 160 }, { x: 3000, y: 150 }, { x: 3300, y: 380 }], 80),
      // The shallows across the middle, and the pads of firm marsh in it.
      patch('shallows', 1050, 300, 2000, 480),
      blob('marsh', 1500, 520, 90), blob('marsh', 2100, 640, 80), blob('marsh', 2500, 420, 80), blob('marsh', 1800, 380, 60),
      // The deep channel in the south (Hover only) and a pool mid-way.
      patch('swampWater', 1100, 840, 1900, 130), blob('swampWater', 2000, 520, 55),
      // The bog the prototype sank in: mud ringed by shallows.
      blob('shallows', WRECK.x, WRECK.y, 230), blob('mud', WRECK.x, WRECK.y, 120), blob('marsh', 3600, 300, 100), blob('marsh', 3650, 800, 120),
      blob('dirt', PAD.x, PAD.y, 140),
    ],
    structures: [
      // The north road's hides: a Flamer's reeds and a hut with sandbags.
      ...reedBed(2250, 240, 5), ...reedBed(1250, 230, 3), ...reedBed(3050, 260, 3),
      { kind: 'stiltHutLarge', x: 1700, y: 220 }, { kind: 'sandbags', x: 1560, y: 280 }, { kind: 'sandbagsV', x: 1850, y: 140 },
      // In the shallows: reeds to hide in (and burn), walls of an old causeway.
      ...reedBed(1500, 520, 3), ...reedBed(2500, 430, 3), ...reedBed(2100, 650, 2),
      ...row('wallStone', 1300, 600, 4, 60), ...row('wallStone', 2250, 330, 3, 60),
      // The bog: sunken wreckage and a few hulks.
      { kind: 'deadTree', x: 3120, y: 450 }, { kind: 'deadTree', x: 3390, y: 620 }, { kind: 'deadTree', x: 3330, y: 440 }, { kind: 'mooringPost', x: 3180, y: 650 },
      { kind: 'stiltHutSmall', x: 3640, y: 280 }, ...reedBed(3640, 800, 4),
      // The pad: a fish rack and a jetty at the edge, nothing in the way.
      { kind: 'fishRack', x: 200, y: 1000 }, { kind: 'jetty', x: 620, y: 960 },
      ...each('cypress', [[100, 500], [500, 560], [800, 1000], [3780, 520], [3000, 1040], [700, 380]]),
      ...each('deadTree', [[900, 750], [1200, 150], [2600, 1010], [800, 560]]),
    ],
    points: {
      wreck: WRECK, pad: PAD, hutG: { x: 1700, y: 320 }, flamerN: { x: 2250, y: 240 }, bogG1: { x: 3300, y: 330 }, bogG2: { x: 3400, y: 750 }, mortarIsle: { x: 2500, y: 420 },
      midG: { x: 1500, y: 560 }, eastW: { x: 3800, y: 540 }, southW: { x: 2000, y: 1040 }, northW: { x: 2500, y: 20 }, westW: { x: 60, y: 600 },
    },
    roads: {
      channel: [{ x: 1200, y: 905 }, { x: 2900, y: 905 }],
    },
  },
  start: { x: 220, y: 240 }, startHeading: 0,
  enemies: [
    // The dry road's guards.
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'hutG', hpMult: 0.6, sight: 400, leash: 260 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flamerN', hpMult: 0.6, sight: 300, leash: 260 },
    // The bog's guards, and a mortar on the island over the shallows.
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'bogG1', hpMult: 0.6, sight: 400, leash: 240 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'bogG2', hpMult: 0.6, sight: 400, leash: 240 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'midG', hpMult: 0.6, sight: 400, leash: 260 },
    { role: 'turret', clan: 'weasels', tank: TANK.mortar, at: 'mortarIsle', hpMult: 0.5, sight: 480 },
    // A skimmer in the channel all the time.
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer2, at: { x: 2900, y: 905 }, route: 'channel', hpMult: 0.8 },
    // They converge once you lift it.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'eastW', when: 'stage', hpMult: 0.7 },
    { role: 'wave', clan: 'weasels', tank: TANK.flamerHover, at: 'southW', when: 'stage', hpMult: 0.9 },
    { role: 'wave', clan: 'weasels', tank: TANK.gunner, at: 'northW', when: 'stage', hpMult: 0.6 },
  ],
  crates: [
    { at: { x: 700, y: 400 }, content: 'kit' }, { at: { x: 2000, y: 130 } }, { at: { x: 2700, y: 600 }, content: 'kit' }, { at: { x: 1500, y: 500 } },
    { at: { x: 3640, y: 700 } }, { at: { x: 400, y: 700 } },
  ],
  objective: { kind: 'salvage', at: 'wreck', pickup: 'pad' },
  bonus: [{ kind: 'kills', n: 10 }, { kind: 'time', under: 222 }],
  loot: LOOT_SWAMP,
};
