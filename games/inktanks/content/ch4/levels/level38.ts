import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_SNOW, patch, path, TANK } from './kit';

/**
 * Level 38, Signal Run (Chase): a Weasel courier carries the clans' signal
 * codes to the mast base at the far end of the frozen lake, 4 × 2 screens.
 * It keeps to the packed-snow track, which winds in long S-bends round the
 * lake's rocks. The straight line across the ice is shorter, but every drive
 * slides there (a Wheels tank hardest) and the lake is strewn with ice rocks:
 * cut a corner at speed and you skid into one. Shoot early and brake early.
 * Crow and Boar guards sit beside the cuts. The track ends inside the base,
 * behind a gate of signal mast that swings open when the courier is close.
 */
const ROAD = [{ x: 420, y: 780 }, { x: 760, y: 180 }, { x: 1120, y: 180 }, { x: 1180, y: 900 }, { x: 1540, y: 900 }, { x: 1600, y: 180 }, { x: 1960, y: 180 }, { x: 2020, y: 900 }, { x: 2380, y: 900 }, { x: 2440, y: 180 }, { x: 2800, y: 180 }, { x: 2860, y: 900 }, { x: 3200, y: 880 }, { x: 3300, y: 560 }, { x: 3520, y: 560 }];
const BASE = { x: 3640, y: 560 };

export const LEVEL_38: LevelDef = {
  id: 'ch4-38', number: 38, name: 'Signal Run', type: 'chase',
  briefing: 'The Weasel courier is running the clans’ signal codes to its mast base, and it is fast. Catch it before the gate opens. It keeps to the packed-snow track, which winds round the lake; the straight line is ice, where every tank slides. Cut a corner at speed and you will skid into the rocks, so brake early. Guards sit beside the shortcuts.',
  teaches: 'Chase; skidding at speed on ice; packed-snow tracks are the safe lines',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', ROAD, 80),
      // The lake: ice across the middle, the track winding round it.
      patch('ice', 600, 120, 2700, 840), blob('ice', 1900, 600, 260), blob('frozenDirt', 3640, 560, 240), blob('frozenDirt', 300, 900, 170),
    ],
    structures: [
      // Ice rocks strewn across the shortcut: slide into one and you stop dead.
      ...each('iceRockB', [[900, 700], [1200, 500], [1450, 800], [1750, 400], [1950, 700], [2200, 500], [2450, 800], [2750, 450], [3000, 650]]),
      ...each('iceRockC', [[1050, 380], [1600, 620], [2050, 330], [2350, 640], [2900, 790]]), ...each('iceRockA', [[800, 500], [1350, 330], [2650, 640]]),
      // Pines, firs and huts round the lake.
      ...each('snowPine', [[200, 300], [500, 150], [700, 1000], [1300, 1000], [1800, 960], [2300, 1000], [3000, 960], [3300, 150], [2100, 100], [150, 650]]),
      ...each('firSmall', [[400, 700], [1100, 120], [2500, 150], [3200, 900], [1000, 1040]]),
      { kind: 'cabinSmall', x: 300, y: 900 }, { kind: 'cabinLarge', x: 2000, y: 130 }, { kind: 'signalBox', x: 3100, y: 950 },
      // The base: a signal-mast gate where the track ends, masts behind it, huts.
      { kind: 'signalMast', x: 3500, y: 560, id: 'gate' },
      ...each('signalMast', [[3640, 440], [3640, 680]]), { kind: 'signalBox', x: 3760, y: 560 }, ...each('snowPine', [[3800, 200], [3800, 920]]),
    ],
    points: {
      base: BASE, cutA: { x: 1350, y: 650 }, cutB: { x: 2150, y: 650 }, cutC: { x: 2900, y: 780 }, north: { x: 2300, y: 260 },
    },
    roads: { courier: [...ROAD.slice(1), BASE] },
  },
  start: at(0.1, 1.5), startHeading: 0,
  mixedClans: true,
  enemies: [
    { role: 'runner', clan: 'weasels', tank: 'machinegun5/light4/wheels5', at: ROAD[1]!, route: 'courier', name: 'Courier', speedMult: 2.5, hpMult: 0.5 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'cutA', hpMult: 0.31, sight: 400, leash: 300 },
    { role: 'guard', clan: 'boars', tank: TANK.boarGunner, at: 'cutB', hpMult: 0.33, sight: 400, leash: 260 },
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'cutC', hpMult: 0.38, sight: 400, leash: 300 },
    { role: 'guard', clan: 'weasels', tank: TANK.skimmer, at: 'north', hpMult: 0.38, sight: 400, leash: 300 },
  ],
  crates: [{ at: { x: 700, y: 900 }, content: 'kit' }, { at: { x: 1700, y: 960 } }, { at: { x: 2500, y: 300 }, content: 'kit' }, { at: { x: 3100, y: 560 } }],
  objective: { kind: 'chase', base: 'base', gate: 'gate' },
  bonus: [{ kind: 'time', under: 36 }, { kind: 'time', under: 26 }],
  loot: LOOT_SNOW,
};
