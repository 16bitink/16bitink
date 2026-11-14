import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, camp, each, LOOT_DESERT, path, row, TANK } from './kit';

/**
 * Level 12, Eyes on the Canyon (Recon): photograph three Crow camps without
 * being seen, 4 × 2 screens. The canyon's walls and the dune crests hide you
 * (they block sight both ways), the camps' guards sweep a cone ahead of them,
 * and a sandstorm every minute cuts everyone's sight to 180 px: the moment to
 * slip in. Being seen is not a fail: it raises the alarm and Crow
 * reinforcements roll in from the east.
 */
const CAMP_A = { x: 1250, y: 300 };
const CAMP_B = { x: 2250, y: 830 };
const CAMP_C = { x: 3250, y: 380 };

export const LEVEL_12: LevelDef = {
  id: 'ch2-12', number: 12, name: 'Eyes on the Canyon', type: 'recon',
  briefing: 'Three Crow camps sit along the canyon. Command wants them photographed, and wants the Crows not to know. Stay behind the canyon walls and dune crests, watch where the guards look, and drive up close when their backs are turned. A sandstorm rolls over every minute: nobody sees past a stone’s throw, so it is your cover. If you are seen, reinforcements come.',
  teaches: 'Stealth: sight cones, hiding behind walls and dune crests, using a sandstorm',
  map: {
    cols: 4, rows: 2, base: 'sand',
    terrain: [
      path('sandTrackH', [at(0.1, 1.5), at(1.0, 1.2), at(1.9, 1.5), at(2.8, 1.0), at(3.6, 0.9)], 70),
      blob('canyonRock', 700, 800, 220), blob('canyonRock', 2900, 800, 200), blob('packedSand', CAMP_A.x, CAMP_A.y, 190), blob('packedSand', CAMP_B.x, CAMP_B.y, 190), blob('packedSand', CAMP_C.x, CAMP_C.y, 190),
    ],
    structures: [
      // The canyon: two broken cliff lines you can hide behind.
      ...row('mesaWall', 560, 620, 5, 60), ...row('mesaWall', 1020, 640, 4, 60), ...row('mesaWall', 1500, 560, 5, 60),
      ...row('mesaWall', 1700, 1000, 6, 60), ...row('mesaWallV', 2000, 600, 3, 0, 60),
      ...row('mesaWall', 2650, 640, 3, 120), ...row('mesaWallV', 2900, 160, 2, 0, 120), ...row('mesaWall', 3150, 760, 2, 120),
      // Dune crests: cover to wait behind.
      { kind: 'duneV', x: 900, y: 420 }, { kind: 'dune', x: 1450, y: 760 }, { kind: 'duneV', x: 1900, y: 780 },
      { kind: 'dune', x: 2550, y: 560 }, { kind: 'duneV', x: 2750, y: 920 }, { kind: 'dune', x: 3250, y: 800 }, { kind: 'duneV', x: 3050, y: 250 },
      // The camps.
      ...camp(CAMP_A, 'w'), ...camp(CAMP_B, 'n'), ...camp(CAMP_C, 's'),
      { kind: 'oilDerrick', x: 1380, y: 170 }, { kind: 'oilDerrick', x: 3380, y: 230 },
      ...each('scrub', [[1100, 460], [1560, 420], [2100, 700], [2400, 1000], [3150, 540], [3450, 520], [400, 900], [1800, 300]]),
      ...each('cactus', [[300, 400], [800, 1000], [2000, 120], [2900, 1020], [3600, 1000], [3700, 200]]),
      ...each('boulder', [[600, 300], [1300, 900], [2500, 200], [3500, 800]]), { kind: 'adobeHut', x: 400, y: 1000 },
    ],
    points: {
      campA: CAMP_A, campB: CAMP_B, campC: CAMP_C,
      gA: { x: CAMP_A.x - 90, y: CAMP_A.y + 10 }, gB: { x: CAMP_B.x + 10, y: CAMP_B.y - 90 }, gC: { x: CAMP_C.x + 10, y: CAMP_C.y + 90 },
      pA: { x: 1500, y: 300 }, pB: { x: 2600, y: 900 }, pC: { x: 3100, y: 450 },
      reinf: { x: 3800, y: 540 },
    },
    roads: { rimA: [{ x: 1000, y: 260 }, { x: 1250, y: 460 }, { x: 1600, y: 300 }], rimB: [{ x: 2000, y: 880 }, { x: 2250, y: 1010 }, { x: 2650, y: 880 }], rimC: [{ x: 3000, y: 400 }, { x: 3350, y: 540 }, { x: 3600, y: 400 }] },
  },
  start: at(0.2, 1.6), startHeading: 0,
  weather: { kind: 'sandstorm', first: 35, every: 60, last: 18 },
  enemies: [
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'gA', hpMult: 0.55, sight: 340, leash: 200 },
    { role: 'guard', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: 'gB', hpMult: 0.55, sight: 340, leash: 200 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'gC', hpMult: 0.55, sight: 340, leash: 200 },
    { role: 'patrol', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: { x: 1000, y: 260 }, route: 'rimA', hpMult: 0.6 },
    { role: 'patrol', clan: 'crows', tank: 'machinegun1/light1/halftracks1', at: { x: 2000, y: 880 }, route: 'rimB', hpMult: 0.6 },
    { role: 'patrol', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: { x: 3000, y: 400 }, route: 'rimC', hpMult: 0.6 },
    // Reinforcements: the alarm calls them.
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'reinf', when: 'alarm', hpMult: 0.6 },
    { role: 'wave', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: 'reinf', when: 'alarm', hpMult: 0.6 },
  ],
  crates: [
    { at: { x: 700, y: 760 }, content: 'kit' }, { at: { x: 1800, y: 700 } }, { at: { x: 2600, y: 300 }, content: 'kit' }, { at: { x: 1500, y: 150 } }, { at: { x: 3500, y: 960 } },
  ],
  objective: { kind: 'recon', spots: ['campA', 'campB', 'campC'] },
  bonus: [{ kind: 'noAlarm' }, { kind: 'time', under: 110 }],
  loot: LOOT_DESERT,
};
