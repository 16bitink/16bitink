import type { LevelDef, StructPlace } from '../../../src/logic/level/types';
import type { Pt } from '../../../src/logic/vec';
import { blob, each, LOOT_SWAMP, patch, reedBed, TANK } from './kit';

/**
 * Level 24, Reed Watch (Recon): photograph three Weasel positions without
 * being seen, 4 × 2 screens. The fen is thick with reed beds (cover like a
 * bush: inside one you are hidden) and three fog banks drift over the camps'
 * approaches (hidden inside, and no sight line crosses them). Guards watch
 * their camps and patrols walk the tracks between. Reeds hide you but they
 * burn: a Flamer guard lights a bed you are sitting in. Being seen is not a
 * fail: it raises the alarm and Weasel reinforcements come in from the east.
 */
const CAMP_A: Pt = { x: 1150, y: 300 };
const CAMP_B: Pt = { x: 2150, y: 800 };
const CAMP_C: Pt = { x: 3200, y: 350 };

/** A Weasel post: two stilt huts, a crate and sandbags with a gap towards `open`. */
function post(c: Pt, open: 'n' | 's' | 'e' | 'w'): StructPlace[] {
  const bag = (dx: number, dy: number, v: boolean): StructPlace => ({ kind: v ? 'sandbagsV' : 'sandbags', x: c.x + dx, y: c.y + dy });
  return [
    { kind: 'stiltHutSmall', x: c.x - 110, y: c.y - 50 }, { kind: 'stiltHutSmall', x: c.x + 110, y: c.y + 50 }, { kind: 'crate', x: c.x + 10, y: c.y + 100 },
    ...(open !== 'n' ? [bag(0, -130, false)] : []), ...(open !== 's' ? [bag(0, 150, false)] : []),
    ...(open !== 'w' ? [bag(-150, 20, true)] : []), ...(open !== 'e' ? [bag(150, 20, true)] : []),
  ];
}

export const LEVEL_24: LevelDef = {
  id: 'ch3-24', number: 24, name: 'Reed Watch', type: 'recon',
  briefing: 'Three Weasel positions sit out in the fen, and Command wants them photographed without the Weasels knowing. The reeds hide you like a bush, and the fog banks drifting over the fen hide anyone inside them, from both sides. Creep from reed bed to reed bed, wait for a guard to look away, and slip up close. But reeds burn: a Flamer who finds you will light the bed you are sitting in. If you are seen, reinforcements come.',
  teaches: 'Stealth in the reeds and fog banks; reeds burn',
  map: {
    cols: 4, rows: 2, base: 'marsh',
    terrain: [
      // A muddy track the patrols walk, ponds of deep water, and firm ground at the posts.
      patch('shallows', 250, 880, 700, 60), patch('shallows', 900, 540, 60, 380), patch('shallows', 900, 540, 900, 60), patch('shallows', 2400, 560, 700, 60), patch('shallows', 3000, 200, 60, 400),
      blob('swampWater', 1650, 330, 130), blob('swampWater', 1700, 900, 150), blob('swampWater', 2750, 850, 160), blob('swampWater', 2700, 280, 120), blob('swampWater', 600, 300, 110),
      blob('mud', 500, 650, 110), blob('mud', 1450, 640, 120), blob('mud', 3500, 760, 130),
      blob('dirt', CAMP_A.x, CAMP_A.y, 140), blob('dirt', CAMP_B.x, CAMP_B.y, 140), blob('dirt', CAMP_C.x, CAMP_C.y, 140),
    ],
    structures: [
      ...post(CAMP_A, 's'), ...post(CAMP_B, 'n'), ...post(CAMP_C, 's'),
      // Reed beds: cover to creep along, in rows that give a path to each post and gaps between.
      ...reedBed(450, 800, 6), ...reedBed(700, 640, 6), ...reedBed(820, 420, 6), ...reedBed(950, 220, 5), ...reedBed(1400, 440, 7), ...reedBed(1420, 160, 5),
      ...reedBed(1250, 800, 6), ...reedBed(1850, 560, 8), ...reedBed(1900, 270, 6), ...reedBed(1950, 980, 5), ...reedBed(2450, 700, 6), ...reedBed(2400, 380, 6),
      ...reedBed(2900, 620, 7), ...reedBed(3000, 230, 6), ...reedBed(3450, 540, 7), ...reedBed(3550, 200, 5), ...reedBed(3300, 900, 6), ...reedBed(2300, 980, 5),
      // Low cover, posts and wrecks.
      { kind: 'walkRailW', x: 1000, y: 560 }, { kind: 'walkRailW', x: 1060, y: 560 }, { kind: 'walkRailW', x: 2500, y: 580 }, { kind: 'walkRailW', x: 2560, y: 580 },
      ...each('mooringPost', [[1600, 450], [2060, 640], [3100, 520]]),
      ...each('deadTree', [[300, 400], [1100, 700], [1550, 800], [2000, 460], [2650, 480], [3050, 760], [3700, 400], [3700, 900], [700, 980], [2800, 1000]]),
      ...each('cypress', [[100, 200], [100, 1000], [1700, 100], [2600, 100], [3750, 120], [3780, 1000]]),
      { kind: 'fishRack', x: 350, y: 720 }, { kind: 'jetty', x: 1620, y: 420 },
    ],
    points: {
      start: { x: 180, y: 880 },
      campA: CAMP_A, campB: CAMP_B, campC: CAMP_C,
      gA: { x: CAMP_A.x - 60, y: CAMP_A.y + 80 }, gB: { x: CAMP_B.x + 20, y: CAMP_B.y - 100 }, gC: { x: CAMP_C.x + 20, y: CAMP_C.y + 110 },
      fB: { x: CAMP_B.x - 130, y: CAMP_B.y - 20 },
      reinf: { x: 3800, y: 540 },
    },
    roads: {
      trackA: [{ x: 900, y: 540 }, { x: 1700, y: 600 }, { x: 900, y: 600 }],
      trackB: [{ x: 2400, y: 560 }, { x: 3000, y: 600 }, { x: 3000, y: 200 }, { x: 2400, y: 600 }],
      trackC: [{ x: 300, y: 880 }, { x: 900, y: 880 }],
    },
  },
  start: 'start', startHeading: 0,
  weather: { kind: 'fog', banks: [{ x: 1150, y: 450, r: 170, dx: 350, period: 45 }, { x: 2150, y: 600, r: 170, dy: 250, period: 40 }, { x: 3200, y: 520, r: 170, dx: 300, period: 50 }] },
  enemies: [
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gA', hpMult: 0.8, sight: 380, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.skimmer, at: 'gB', hpMult: 0.8, sight: 380, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gC', hpMult: 0.8, sight: 380, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'fB', hpMult: 0.5, sight: 300, leash: 120 },
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer, at: { x: 900, y: 540 }, route: 'trackA', hpMult: 0.5 },
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer, at: { x: 2400, y: 560 }, route: 'trackB', hpMult: 0.6 },
    // Reinforcements: the alarm calls them.
    { role: 'wave', clan: 'weasels', tank: TANK.gunner, at: 'reinf', when: 'alarm', hpMult: 0.6 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'reinf', when: 'alarm', hpMult: 0.6 },
  ],
  crates: [{ at: { x: 400, y: 700 }, content: 'kit' }, { at: { x: 1500, y: 700 } }, { at: { x: 2300, y: 300 }, content: 'kit' }, { at: { x: 3500, y: 780 } }],
  objective: { kind: 'recon', spots: ['campA', 'campB', 'campC'] },
  bonus: [{ kind: 'noAlarm' }, { kind: 'time', under: 90 }],
  loot: LOOT_SWAMP,
};
