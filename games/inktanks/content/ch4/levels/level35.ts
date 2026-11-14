import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, drifts, each, LOOT_SNOW, path, ridge, TANK } from './kit';

/**
 * Level 35, Ridge Line (Capture): three ridge tops along the Frostridge, each
 * with a flagpole. Raise our flag on all three at once. 4 × 2 screens. Each
 * top is a patch of high ground (`heights`): whoever stands on one sees and
 * shoots 1.2× as far, so the Crows' guards up there out-range you the moment
 * you climb, and the clans retake tops from below. A top is ringed with
 * unbreakable ridge cliffs and open on one side: the ramp. The snow between is
 * deep, so the packed-snow road along the valley is the way, and the fight is
 * for the heights: take a top and hold it, and from there you out-range anyone
 * coming up the ramp.
 */
const ROAD = [at(0.2, 1.7), at(0.8, 1.55), at(1.4, 1.4), at(2.0, 1.55), at(2.6, 1.4), at(3.2, 1.4)];
const TOPS = { W: { x: 880, y: 320 }, M: { x: 1950, y: 700 }, E: { x: 3000, y: 330 } } as const;
const HEIGHT_R = 210;

export const LEVEL_35: LevelDef = {
  id: 'ch4-35', number: 35, name: 'Ridge Line', type: 'capture',
  briefing: 'Three ridge tops command the Frostridge, and the clans hold them. Raise our flag on all three at once. A flag runs up while you sit alone in its ring; the clans will climb back for any top that is ours. The tops are high ground: up there you see and shoot 1.2× as far, and so do they. Each is walled by cliffs with one ramp up: take the ramp, hold the top, and the climbers come to you.',
  teaches: 'High ground sees and shoots further; ramps into cliff-ringed tops; juggling three flags',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', ROAD, 80),
      blob('frozenDirt', TOPS.W.x, TOPS.W.y, 230), blob('frozenDirt', TOPS.M.x, TOPS.M.y, 230), blob('frozenDirt', TOPS.E.x, TOPS.E.y, 230),
      blob('ice', 1400, 260, 120), blob('ice', 2500, 880, 130),
    ],
    structures: [
      // West top: north and west cliffs; the ramp climbs from the south-east.
      ...ridge(TOPS.W.x - 190, TOPS.W.y - 190, 3), ...ridge(TOPS.W.x - 230, TOPS.W.y - 120, 2, true), { kind: 'ridgeCorner', x: TOPS.W.x - 230, y: TOPS.W.y - 190 },
      // Middle top: cliffs north and south; the ramp climbs from the west or east (a corridor).
      ...ridge(TOPS.M.x - 190, TOPS.M.y - 200, 3), ...ridge(TOPS.M.x - 190, TOPS.M.y + 200, 3),
      // East top: north, east cliffs; the ramp from the south-west.
      ...ridge(TOPS.E.x - 190, TOPS.E.y - 190, 3), ...ridge(TOPS.E.x + 230, TOPS.E.y - 120, 2, true), { kind: 'ridgeCorner', x: TOPS.E.x + 230, y: TOPS.E.y - 190 },
      // Cover on the tops and at the ramps.
      ...each('iceRockB', [[TOPS.W.x + 90, TOPS.W.y + 60], [TOPS.M.x - 70, TOPS.M.y - 60], [TOPS.E.x - 100, TOPS.E.y + 70]]),
      ...drifts(TOPS.W.x + 60, TOPS.W.y + 210, 2), ...drifts(TOPS.M.x - 270, TOPS.M.y + 60, 2, true), ...drifts(TOPS.E.x - 260, TOPS.E.y + 200, 2),
      { kind: 'cabinSmall', x: TOPS.M.x + 120, y: TOPS.M.y + 80 }, { kind: 'cabinSmall', x: TOPS.E.x + 110, y: TOPS.E.y + 90 },
      // The valley: pines, firs, rocks, a cabin.
      ...each('snowPine', [[300, 300], [500, 960], [1100, 620], [1500, 980], [1650, 380], [2300, 300], [2400, 1000], [2750, 640], [3400, 800], [3600, 200], [3300, 1000]]),
      ...each('firSmall', [[650, 650], [1250, 860], [1700, 560], [2700, 560], [3200, 600], [1200, 120]]),
      { kind: 'cabinLarge', x: 3500, y: 560 }, { kind: 'cabinSmall', x: 600, y: 1000 },
      ...each('iceRockA', [[1000, 900], [2200, 1000], [2900, 900], [450, 520]]),
      { kind: 'crate', x: 300, y: 600 },
    ],
    points: {
      start: { x: 220, y: 720 },
      flagW: { x: TOPS.W.x, y: TOPS.W.y }, flagM: { x: TOPS.M.x, y: TOPS.M.y }, flagE: { x: TOPS.E.x, y: TOPS.E.y },
      gW: { x: TOPS.W.x - 60, y: TOPS.W.y - 40 }, gM: { x: TOPS.M.x + 120, y: TOPS.M.y - 80 }, gE: { x: TOPS.E.x + 120, y: TOPS.E.y - 40 },
      laserE: { x: TOPS.E.x + 160, y: TOPS.E.y + 40 }, mortarW: { x: TOPS.W.x + 120, y: TOPS.W.y - 100 },
      raidN: { x: 1500, y: 40 }, raidS: { x: 2700, y: 1050 }, raidE: { x: 3780, y: 560 }, raidW: { x: 400, y: 1040 },
    },
    roads: {},
  },
  start: 'start', startHeading: 0,
  mixedClans: true,
  heights: [
    { x: TOPS.W.x, y: TOPS.W.y, r: HEIGHT_R }, { x: TOPS.M.x, y: TOPS.M.y, r: HEIGHT_R }, { x: TOPS.E.x, y: TOPS.E.y, r: HEIGHT_R },
  ],
  enemies: [
    { role: 'guard', clan: 'boars', tank: TANK.boarGunner, at: 'gW', hpMult: 0.45, sight: 440, leash: 220 },
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: 'mortarW', hpMult: 0.35, sight: 480 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'gM', hpMult: 0.45, sight: 440, leash: 220 },
    { role: 'guard', clan: 'boars', tank: TANK.boarGunner, at: 'gE', hpMult: 0.45, sight: 440, leash: 220 },
    { role: 'guard', clan: 'crows', tank: TANK.laser, at: 'laserE', hpMult: 0.45, sight: 500, leash: 160 },
    // Climbers retake any top that is ours.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'raidN', when: 60, hpMult: 0.6 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'raidS', when: 80, hpMult: 0.4 },    { role: 'wave', clan: 'boars', tank: TANK.boarGunner, at: 'raidE', when: 105, hpMult: 0.6 },
  ],
  crates: [{ at: { x: 1100, y: 620 }, content: 'kit' }, { at: { x: 1700, y: 380 } }, { at: { x: 2750, y: 640 }, content: 'kit' }, { at: { x: 3400, y: 800 } }],
  objective: { kind: 'capture', flags: ['flagW', 'flagM', 'flagE'], radius: 140, capture: 6, holdAll: 5 },
  bonus: [{ kind: 'time', under: 175 }, { kind: 'kills', n: 8 }],
  timeLimit: 420,
  loot: LOOT_SNOW,
};
