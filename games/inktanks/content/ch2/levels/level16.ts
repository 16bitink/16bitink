import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_DESERT, path, row, TANK } from './kit';

/**
 * Level 16, Dune Runner (Chase): a courier in a light, fast tank runs the long
 * sand track to its base gate across the dunes. The road winds in big loops
 * (packed sand: no slowing); the straight line cuts across soft sand, where Wheels
 * slow and slide. Dune crests, scrub and mesas decide the line; Half-tracks
 * and Tracks hold their speed on the sand shortcut, Wheels are fast only on
 * the road. A couple of Crow guards sit beside the cut to slow you down.
 */
const ROAD = [at(0.5, 2.7), at(0.69, 2.8), at(0.88, 1.98), at(1.07, 2.8), at(1.26, 1.81), at(1.45, 2.8), at(1.64, 1.64), at(1.83, 2.66), at(2.02, 1.47), at(2.21, 2.49), at(2.4, 1.3), at(2.59, 2.32), at(2.78, 1.13), at(2.97, 2.15), at(3.16, 0.96), at(3.35, 1.98), at(3.54, 0.79), at(3.73, 1.81), at(3.92, 0.62), at(4.11, 1.64), at(4.3, 1.5)];
const BASE = { x: 4450, y: 810 };

export const LEVEL_16: LevelDef = {
  id: 'ch2-16', number: 16, name: 'Dune Runner', type: 'chase',
  briefing: 'The Crow courier is carrying our convoy routes home, and it is fast. Catch it before the base gate swings open. The road winds round the dunes and the courier keeps to it; the straight line is soft sand. Wheels slide there, so choose your drive: do you cut the corner or follow the road?',
  teaches: 'Chase; cut corners across the dunes; the drive decides your line',
  map: {
    cols: 5, rows: 3, base: 'sand',
    terrain: [path('packedSand', ROAD, 90), blob('packedSand', 2100, 700, 220), blob('packedSand', 3400, 1100, 240), blob('packedSand', 4500, 810, 240), blob('packedSand', 400, 1500, 160)],
    structures: [
      // Rock bluffs between the road's loops: the shortcut threads the gaps, over sand.
      ...row('mesaWallV', 1150, 800, 4, 0, 60), ...row('mesaWallV', 2000, 700, 4, 0, 60), ...row('mesaWallV', 2750, 900, 4, 0, 60), ...row('mesaWallV', 3500, 700, 4, 0, 60),
      ...row('mesaWall', 1500, 1150, 3, 60), ...row('mesaWall', 3000, 1100, 3, 60),
      // Dune crests across the shortcut: block sight (shots fly over), tanks cross them.
      { kind: 'duneV', x: 1500, y: 1500 }, { kind: 'duneV', x: 2400, y: 1250 }, { kind: 'dune', x: 1800, y: 900 }, { kind: 'duneV', x: 3300, y: 1400 }, { kind: 'dune', x: 3700, y: 1000 }, { kind: 'dune', x: 2600, y: 700 }, { kind: 'duneV', x: 800, y: 1100 },
      ...each('scrub', [[900, 1400], [1300, 450], [2200, 1500], [2550, 300], [3100, 700], [3300, 220], [3900, 1400], [1700, 1300]]),
      ...each('boulder', [[1900, 1500], [2650, 1000], [4100, 400]]),
      ...each('cactus', [[300, 400], [500, 250], [1100, 150], [1800, 150], [2300, 120], [3500, 1500], [3000, 1540], [4300, 1500], [200, 1100]]),
      // A boulder slalom in the soft sand of the shortcut: sliding Wheels have to brake for it.
      ...each('boulder', [[1300, 1000], [1600, 1250], [1950, 1050], [2550, 1200], [2850, 1450], [3450, 1300], [3750, 1100]]),
      { kind: 'oilDerrick', x: 2450, y: 330 }, { kind: 'adobeHut', x: 400, y: 1500 }, { kind: 'adobeHut', x: 3700, y: 400 },
      // The base gate: the road ends inside it.
      { kind: 'crowGate', x: 4320, y: 810, id: 'gate' },
      ...row('adobeWall', 4290, 630, 3, 60), ...row('adobeWall', 4290, 990, 3, 60),
      { kind: 'oilTank', x: 4560, y: 680 }, { kind: 'tent', x: 4560, y: 960 },
    ],
    points: { base: BASE, guardA: { x: 1750, y: 1000 }, guardB: { x: 2600, y: 1050 }, guardC: { x: 3250, y: 1000 }, guardD: { x: 3750, y: 1300 } },
    roads: { courier: [...ROAD.slice(6), BASE] },
  },
  start: at(0.1, 2.85), startHeading: 0,
  enemies: [
    { role: 'runner', clan: 'crows', tank: 'machinegun2/light2/wheels3', at: ROAD[6]!, route: 'courier', name: 'Courier', speedMult: 1.55, hpMult: 0.67 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'guardA', hpMult: 0.42, sight: 400, leash: 300 },
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'guardB', hpMult: 0.5, sight: 400, leash: 300 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'guardC', hpMult: 0.42, sight: 400, leash: 300 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'guardD', hpMult: 0.42, sight: 400, leash: 300 },
  ],
  crates: [{ at: { x: 700, y: 1500 }, content: 'kit' }, { at: { x: 1700, y: 1450 } }, { at: { x: 2100, y: 220 }, content: { family: 'rockets', mk: 2 } }, { at: { x: 3200, y: 1500 }, content: 'kit' }],
  objective: { kind: 'chase', base: 'base', gate: 'gate' },
  bonus: [{ kind: 'time', under: 40 }, { kind: 'time', under: 32 }],
  loot: LOOT_DESERT,
};
