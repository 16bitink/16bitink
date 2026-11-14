import type { LevelDef } from '../../../src/logic/level/types';
import type { Pt } from '../../../src/logic/vec';
import { blob, each, LOOT_SWAMP, patch, path, quay, reedBed, row, TANK } from './kit';

/**
 * Level 23, The Barge (Escort, `vessel: 'barge'`): get the supply barge up
 * the river to our quay. 4 × 2 screens: the river runs west to east through
 * the middle (deep water: the barge floats on it, ground drives can't cross
 * it); you drive the south bank's track beside the barge, which only moves
 * while you're within 480 px. Weasels hold both banks: on the south bank a
 * Flamer in the reeds and Cannon guards behind sandbags, in your way; on the
 * north bank a stilt village whose guns and a mortar shoot across the water
 * at the barge (you shoot back across it, or hurry it past). Skimmers come
 * down the river for the barge twice. The road ends in our cement quay, where
 * a gun tower on each bank opens up as you arrive.
 */
const QUAY = quay(3300, 540, 300, 220, ['cannon', 'machinegun']);
const RIVER: readonly Pt[] = [{ x: 0, y: 560 }, { x: 700, y: 520 }, { x: 1400, y: 600 }, { x: 2100, y: 520 }, { x: 2800, y: 580 }, { x: 3320, y: 540 }];
const ROAD: readonly Pt[] = [{ x: 140, y: 555 }, { x: 700, y: 520 }, { x: 1400, y: 600 }, { x: 2100, y: 520 }, { x: 2800, y: 580 }, { x: 3200, y: 545 }, QUAY.berth];
const TRACK: readonly Pt[] = [{ x: 100, y: 820 }, { x: 700, y: 790 }, { x: 1400, y: 860 }, { x: 2100, y: 790 }, { x: 2800, y: 850 }, { x: 3250, y: 820 }];

export const LEVEL_23: LevelDef = {
  id: 'ch3-23', number: 23, name: 'The Barge', type: 'escort',
  briefing: 'Our quay upriver is short of fuel and shells. Bring the supply barge in: it only moves while you stay close, and you can’t cross the river, so keep to the south bank. The Weasels hold both banks: clear your side, and shoot back across the water at the guns on theirs. Skimmers will come down the river for the barge. Our quay’s gun towers cover the last stretch.',
  teaches: 'Escort a barge; enemies on both banks; fight across water',
  map: {
    cols: 4, rows: 2, base: 'marsh',
    terrain: [
      path('dirt', TRACK, 80), blob('shallows', 1000, 900, 160), blob('shallows', 2500, 960, 150), blob('mud', 1800, 300, 180),
      path('swampWater', RIVER, 250), QUAY.basin, patch('swampWater', 3600, 450, 240, 220),
      blob('dirt', 1300, 260, 200), blob('dirt', 3520, 860, 160),
    ],
    structures: [
      // South bank: reeds (the Flamer's ambush), sandbag posts on the track.
      ...reedBed(1000, 760, 5), ...reedBed(2500, 780, 5), ...reedBed(400, 760, 3),
      { kind: 'sandbags', x: 1800, y: 760 }, { kind: 'sandbags', x: 2950, y: 760 }, { kind: 'fishRack', x: 600, y: 720 },
      // North bank: the Weasels' stilt village and its jetty, reeds on the shore.
      { kind: 'stiltHutLarge', x: 1300, y: 260 }, ...each('stiltHutSmall', [[1180, 360], [1450, 380], [2250, 300]]), { kind: 'jetty', x: 1320, y: 420 },
      ...reedBed(800, 340, 4), ...reedBed(2000, 340, 4), ...reedBed(2700, 330, 4),
      { kind: 'sandbags', x: 2050, y: 420 }, { kind: 'sandbags', x: 1700, y: 420 },
      // Trees and posts all round.
      ...each('cypress', [[200, 200], [500, 1000], [1500, 1020], [2300, 1040], [3000, 160], [600, 120], [2700, 1020]]),
      ...each('deadTree', [[900, 160], [1900, 120], [2600, 140], [3100, 1000], [1200, 1000]]),
      ...each('mooringPost', [[1260, 430], [1380, 430], [3260, 440], [3260, 640]]),
      // Our quay.
      ...QUAY.structures, ...row('cementWall', 3500, 900, 3, 63), { kind: 'crate', x: 3560, y: 820 },
    ],
    points: {
      flamerS: { x: 1000, y: 760 }, gunS: { x: 1800, y: 820 }, gunS2: { x: 2950, y: 820 },
      gunN: { x: 1700, y: 360 }, gunN2: { x: 2050, y: 360 }, mortarN: { x: 1300, y: 180 }, scoutN: { x: 2700, y: 300 },
      riverW: { x: 600, y: 520 }, riverE: { x: 3000, y: 560 },
    },
    roads: { barge: ROAD },
  },
  start: { x: 220, y: 800 }, startHeading: 0,
  enemies: [
    // South bank: in your way.
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flamerS', hpMult: 0.6, sight: 280, leash: 300 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gunS', hpMult: 0.6, sight: 400, leash: 320 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gunS2', hpMult: 0.6, sight: 400, leash: 320 },
    // North bank: shooting across the river.
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gunN', hpMult: 0.6, sight: 440, leash: 120 },
    { role: 'guard', clan: 'weasels', tank: 'machinegun2/light1/halftracks1', at: 'gunN2', hpMult: 0.7, sight: 440, leash: 120 },
    { role: 'turret', clan: 'weasels', tank: TANK.mortar, at: 'mortarN', hpMult: 0.5, sight: 480 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'scoutN', hpMult: 0.6, sight: 440, leash: 120 },
    // Skimmers down the river for the barge.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'riverE', when: 35, hpMult: 0.7 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'riverE', when: 75, hpMult: 0.7 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'riverW', when: 80, hpMult: 0.7 },
  ],
  allies: QUAY.allies,
  crates: [{ at: { x: 700, y: 900 }, content: 'kit' }, { at: { x: 2100, y: 920 } }, { at: { x: 2700, y: 900 }, content: 'kit' }, { at: { x: 1400, y: 960 } }],
  objective: { kind: 'escort', road: 'barge', truckHp: 1400, speed: 30, vessel: 'barge' },
  bonus: [{ kind: 'truckHp', min: 0.2, vessel: 'barge' }, { kind: 'kills', n: 4 }],
  loot: LOOT_SWAMP,
};
