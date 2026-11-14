import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, drifts, each, LOOT_SNOW, patch, path, ridge, TANK } from './kit';

/**
 * Level 32, Snowed In (Rescue): three crews are buried in snowdrifts out in
 * the hills, 4 × 2 screens of deep snow. Dig each drift out (any gun; 120 HP,
 * so it takes a few seconds of fire) and the crew follows you to the
 * pick-up truck at the start. The twist is time under pressure: every dig
 * keeps you parked in the open, and the clans have seen the smoke. The first
 * dig brings Weasel skimmers from the north-east, the second a Crow scout
 * and a Boar Heavy, and a Laser stands off over the far crew. A freed crew
 * stays down while an enemy is near, so clear the guards before you bring them home.
 */
const HOME = { x: 260, y: 880 };

export const LEVEL_32: LevelDef = {
  id: 'ch4-32', number: 32, name: 'Snowed In', type: 'rescue',
  briefing: 'Three of our crews are buried in snowdrifts out in the hills, and the clans are closing in. Shoot each crew’s drift to dig them out; it takes a few seconds, and you will be parked in the open while you do it. Freed crews follow you to our truck, but they keep down while an enemy is near. Digging is loud: raiders come every time. Dig, then deal with them, then go on.',
  teaches: 'Digging out under pressure; crews follow and hide; raiders drawn by the work',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', [HOME, at(0.9, 1.5), at(1.6, 1.2), at(2.3, 0.95), at(3.0, 0.7), at(3.5, 0.45)], 80),
      path('snowTrackH', [at(1.6, 1.2), at(2.0, 1.7), at(2.8, 1.75)], 70),
      blob('frozenDirt', 1000, 300, 200), blob('frozenDirt', 2300, 900, 220), blob('frozenDirt', 3300, 700, 200),
      patch('ice', 1500, 380, 500, 220),
    ],
    structures: [
      // The crews: one drift each, buried in a nook.
      { kind: 'snowdriftH', x: 1000, y: 300, tag: 'drift' }, { kind: 'snowdriftH', x: 2300, y: 940, tag: 'drift' }, { kind: 'snowdriftV', x: 3300, y: 700, tag: 'drift' },
      // Crew 1's nook: cabin and drifts. Crew 2: cliff behind. Crew 3: cabins and the Laser's drifts.
      { kind: 'cabinLarge', x: 920, y: 200 }, ...drifts(880, 380, 2), ...each('firSmall', [[1120, 260], [1100, 420]]),
      ...ridge(2000, 1030, 3), ...drifts(2150, 840, 2), { kind: 'cabinSmall', x: 2480, y: 880 },
      { kind: 'cabinLarge', x: 3180, y: 600 }, { kind: 'cabinSmall', x: 3420, y: 780 }, ...drifts(3080, 480, 2),
      // The way between: pines, firs, rocks, a frozen fence by the start.
      ...each('snowPine', [[400, 500], [600, 300], [700, 1000], [1300, 800], [1500, 120], [1700, 1000], [2700, 300], [2900, 960], [3000, 160], [3700, 800], [3750, 460]]),
      ...each('firSmall', [[500, 700], [1200, 600], [1450, 700], [1900, 460], [2600, 560], [2800, 700], [3550, 560]]),
      ...each('iceRockB', [[1700, 480], [1850, 300], [2450, 380]]), ...each('iceRockA', [[700, 640], [1600, 880], [2650, 1000]]),
      { kind: 'frozenFenceH', x: 480, y: 880 }, { kind: 'frozenFenceH', x: 544, y: 880 },
      { kind: 'signalBox', x: 330, y: 760 },
    ],
    points: {
      home: HOME,
      guard1: { x: 1260, y: 330 }, guard2: { x: 2480, y: 760 }, guard3: { x: 3000, y: 780 }, laserNest: { x: 3450, y: 480 },
      rNE: { x: 3000, y: 40 }, rN: { x: 1500, y: 30 }, rE: { x: 3800, y: 1000 }, rS: { x: 2000, y: 1060 },
    },
    roads: { beat: [{ x: 1700, y: 700 }, { x: 2100, y: 620 }, { x: 2500, y: 540 }, { x: 2100, y: 440 }] },
  },
  start: { x: 360, y: 840 }, startHeading: 0,
  mixedClans: true,
  enemies: [
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'guard1', hpMult: 0.6, sight: 420, leash: 300 },
    { role: 'guard', clan: 'boars', tank: TANK.boarGunner, at: 'guard2', hpMult: 0.5, sight: 400, leash: 260 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'guard3', hpMult: 0.5, sight: 360, leash: 240 },
    { role: 'guard', clan: 'crows', tank: TANK.laser, at: 'laserNest', hpMult: 0.5, sight: 460, leash: 160 },
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer, at: { x: 1700, y: 700 }, route: 'beat', hpMult: 0.6 },
    // Raiders: each dig draws them (the stage), and the clock does too.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'rNE', when: 'stage', hpMult: 0.6 },
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'rN', when: 'stage', hpMult: 0.6 },
    { role: 'wave', clan: 'boars', tank: TANK.boarGunner, at: 'rE', when: 70, hpMult: 0.45 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'rS', when: 100, hpMult: 0.6 },
  ],
  crates: [{ at: { x: 800, y: 700 }, content: 'kit' }, { at: { x: 1700, y: 300 } }, { at: { x: 2400, y: 520 }, content: 'kit' }, { at: { x: 3100, y: 300 } }, { at: { x: 3000, y: 960 }, content: { family: 'laser', mk: 1 } }],
  objective: { kind: 'rescue', tag: 'drift', home: 'home' },
  bonus: [{ kind: 'time', under: 200 }, { kind: 'kills', n: 9 }],
  loot: LOOT_SNOW,
};
