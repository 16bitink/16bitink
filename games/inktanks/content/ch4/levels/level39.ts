import type { LevelDef, StructPlace } from '../../../src/logic/level/types';
import type { Pt } from '../../../src/logic/vec';
import { blob, drifts, each, LOOT_SNOW, patch, path, railLine, ridge, TANK } from './kit';

/**
 * Level 39, Tracking the Train (Recon): photograph the three depots where the
 * rail-gun train stops, 4 × 2 screens of snow. A main rail line runs west to
 * east with a spur to each depot (signal box, cabins, a stack of crates). The
 * clans' guards watch the depots and a patrol walks the line; a blizzard
 * sweeps the line every so often (nobody sees past 200 px: slip in under it).
 * Being seen is not a fail: it raises the alarm and clan reinforcements come
 * in from the east. Sets up level 40.
 */
const DEPOT_A: Pt = { x: 1100, y: 280 };
const DEPOT_B: Pt = { x: 2000, y: 820 };
const DEPOT_C: Pt = { x: 3050, y: 300 };
const MAIN_Y = 560;

/** A rail depot: a signal box, two cabins and a crate by a spur. */
function yard(c: Pt, flip: boolean): StructPlace[] {
  const s = flip ? -1 : 1;
  return [
    { kind: 'signalBox', x: c.x - 60, y: c.y + s * 20 }, { kind: 'cabinSmall', x: c.x + 120, y: c.y - s * 40 },
    { kind: 'cabinLarge', x: c.x - 200, y: c.y - s * 60 }, { kind: 'crate', x: c.x + 40, y: c.y - s * 90 },
  ];
}

export const LEVEL_39: LevelDef = {
  id: 'ch4-39', number: 39, name: 'Tracking the Train', type: 'recon',
  briefing: 'The clans have a train with guns on it, and it rolls out along one rail line. Command wants its three depots photographed before we meet it. Slip close to each depot without being seen: pines, cabins and snowdrifts break the line of sight, and when a blizzard sweeps the line nobody sees past a stone’s throw. If you are seen, reinforcements come up the line.',
  teaches: 'Stealth along the railway; slipping past in a blizzard; the train’s depots (level 40)',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', [{ x: 120, y: 900 }, { x: 700, y: 880 }, { x: 800, y: MAIN_Y }], 80),
      blob('frozenDirt', DEPOT_A.x, DEPOT_A.y, 150), blob('frozenDirt', DEPOT_B.x, DEPOT_B.y, 150), blob('frozenDirt', DEPOT_C.x, DEPOT_C.y, 150),
      patch('ice', 1450, 700, 300, 200), blob('ice', 2600, 880, 120),
    ],
    structures: [
      // The main line and a spur to each depot.
      ...railLine([{ x: 500, y: MAIN_Y }, { x: 3600, y: MAIN_Y }]),
      ...railLine([{ x: DEPOT_A.x, y: MAIN_Y }, { x: DEPOT_A.x, y: DEPOT_A.y + 40 }]),
      ...railLine([{ x: DEPOT_B.x, y: MAIN_Y }, { x: DEPOT_B.x, y: DEPOT_B.y - 40 }]),
      ...railLine([{ x: DEPOT_C.x, y: MAIN_Y }, { x: DEPOT_C.x, y: DEPOT_C.y + 40 }]),
      ...yard(DEPOT_A, false), ...yard(DEPOT_B, true), ...yard(DEPOT_C, false),
      // Cover to creep along: ridges, drifts, pines and firs.
      ...ridge(1400, 120, 3), ...ridge(2400, 960, 3), ...ridge(2500, 120, 2),
      ...drifts(700, 400, 2), ...drifts(1500, 640, 2), ...drifts(1700, 420, 2), ...drifts(2350, 700, 2), ...drifts(2800, 460, 2), ...drifts(3300, 700, 2),
      ...each('snowPine', [[300, 300], [500, 200], [900, 120], [1250, 480], [1300, 900], [1700, 960], [2150, 480], [2250, 300], [2700, 640], [2900, 150], [3350, 480], [3500, 220], [3600, 900], [3250, 960], [600, 700]]),
      ...each('firSmall', [[950, 760], [1600, 540], [1850, 700], [2250, 640], [2650, 400], [3150, 560], [3450, 820], [450, 980]]),
      ...each('iceRockB', [[1000, 960], [2100, 130], [2950, 840], [3700, 400]]), ...each('iceRockA', [[400, 520], [1900, 300], [3200, 120]]),
      { kind: 'frozenFenceH', x: 1100, y: 600 }, { kind: 'frozenFenceH', x: 1164, y: 600 },
    ],
    points: {
      start: { x: 200, y: 900 },
      depotA: DEPOT_A, depotB: DEPOT_B, depotC: DEPOT_C,
      gA: { x: DEPOT_A.x - 140, y: DEPOT_A.y + 90 }, gB: { x: DEPOT_B.x + 150, y: DEPOT_B.y - 90 }, gC: { x: DEPOT_C.x - 120, y: DEPOT_C.y + 100 },
      sA: { x: DEPOT_A.x + 200, y: DEPOT_A.y + 10 }, reinf: { x: 3800, y: MAIN_Y },
    },
    roads: {
      lineW: [{ x: 700, y: MAIN_Y - 40 }, { x: 1800, y: MAIN_Y - 40 }],
      lineE: [{ x: 3500, y: MAIN_Y + 40 }, { x: 2400, y: MAIN_Y + 40 }],
    },
  },
  start: 'start', startHeading: 0,
  mixedClans: true,
  weather: { kind: 'blizzard', first: 35, every: 55, last: 16, sight: 200, wind: 30 },
  enemies: [
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'gA', hpMult: 0.44, sight: 240, leash: 120 },
    { role: 'guard', clan: 'boars', tank: TANK.boarGunner, at: 'gB', hpMult: 0.4, sight: 240, leash: 120 },
    { role: 'guard', clan: 'weasels', tank: TANK.skimmer, at: 'gC', hpMult: 0.44, sight: 240, leash: 120 },
    { role: 'patrol', clan: 'boars', tank: TANK.boarGunner, at: { x: 700, y: MAIN_Y - 40 }, route: 'lineW', hpMult: 0.4 },
    { role: 'wave', clan: 'boars', tank: TANK.boarGunner, at: 'reinf', when: 'alarm', hpMult: 0.4 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'reinf', when: 'alarm', hpMult: 0.38 },
  ],
  crates: [{ at: { x: 500, y: 760 }, content: 'kit' }, { at: { x: 1500, y: 780 } }, { at: { x: 2300, y: 400 }, content: 'kit' }, { at: { x: 3400, y: 760 } }],
  objective: { kind: 'recon', spots: ['depotA', 'depotB', 'depotC'] },
  bonus: [{ kind: 'noAlarm' }, { kind: 'time', under: 120 }],
  loot: LOOT_SNOW,
};
