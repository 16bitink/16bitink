import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_DESERT, path, row, TANK } from './kit';

/**
 * Level 13, Pipeline (Raid): blow four valves on the Crow pipeline in three
 * minutes, 4 × 2 screens. The pipeline runs east along the canyon road with a
 * valve at each pumping station. Mortar nests cover the stations and shell
 * the road between them: keep moving, the red rings are coming. The clock does
 * the rest.
 */
const VALVES: ReadonlyArray<readonly [number, number]> = [[1000, 700], [1900, 380], [2700, 850], [3500, 500]];

export const LEVEL_13: LevelDef = {
  id: 'ch2-13', number: 13, name: 'Pipeline', type: 'raid',
  briefing: 'The Crows’ pipeline feeds their whole war. Blow four valves along it and the oil stops, but you have three minutes before their reserves come up. Mortar nests cover the valves and shell the road between them: never sit still, and drive out of the red rings.',
  teaches: 'Racing the clock; moving under mortar fire; picking a route between the nests',
  map: {
    cols: 4, rows: 2, base: 'sand',
    terrain: [
      path('sandTrackH', [at(0.1, 1.6), at(1.0, 1.3), at(1.9, 0.7), at(2.8, 1.6), at(3.6, 0.9)], 70),
      blob('packedSand', 600, 400, 200), blob('packedSand', 2300, 950, 220), blob('packedSand', 1000, 700, 140), blob('packedSand', 1900, 380, 140), blob('packedSand', 2700, 850, 140), blob('packedSand', 3500, 500, 140),
    ],
    structures: [
      // The pipeline's valves (raid targets) with a derrick or tank by each.
      ...VALVES.map(([x, y], i) => ({ kind: 'valve', x, y, id: `valve${i}`, tag: 'target' })),
      { kind: 'oilTank', x: 1080, y: 640 }, { kind: 'oilDerrick', x: 1840, y: 300 }, { kind: 'oilTank', x: 2780, y: 910 }, { kind: 'oilDerrick', x: 3580, y: 430 },
      // Sandbag nests round each station.
      { kind: 'sandbags', x: 1000, y: 560 }, { kind: 'sandbagsV', x: 1140, y: 760 }, { kind: 'sandbags', x: 1900, y: 540 }, { kind: 'sandbagsV', x: 1760, y: 400 },
      { kind: 'sandbags', x: 2700, y: 710 }, { kind: 'sandbagsV', x: 2560, y: 860 }, { kind: 'sandbags', x: 3500, y: 640 }, { kind: 'sandbagsV', x: 3360, y: 500 },
      // Cliffs that break up the road between stations (shots from mortars still fly over).
      ...row('mesaWall', 1250, 880, 4, 60), ...row('mesaWall', 2250, 560, 4, 60), ...row('mesaWallV', 3100, 640, 4, 0, 60),
      ...each('scrub', [[700, 900], [1500, 500], [2100, 900], [2400, 300], [3000, 300], [3250, 950], [3800, 700]]),
      ...each('cactus', [[300, 300], [800, 200], [1500, 1000], [2000, 150], [2900, 120], [3700, 1000]]),
      ...each('boulder', [[500, 700], [1400, 200], [2500, 700], [3250, 350]]), { kind: 'adobeHut', x: 400, y: 950 },
    ],
    points: { n1: { x: 1000, y: 700 }, n2: { x: 1900, y: 380 }, n3: { x: 2700, y: 850 }, n4: { x: 3500, y: 500 }, mortarMid1: { x: 1500, y: 700 }, mortarMid2: { x: 2300, y: 650 }, mortarMid3: { x: 3150, y: 740 }, g1: { x: 1000, y: 620 }, g3: { x: 2700, y: 770 } },
    roads: { line: [{ x: 1300, y: 500 }, { x: 1900, y: 600 }, { x: 2400, y: 500 }, { x: 2800, y: 700 }] },
  },
  start: at(0.2, 1.6), startHeading: 0,
  enemies: [
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: 'n1', hpMult: 0.5, sight: 460 },
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: 'n3', hpMult: 0.5, sight: 460 },
    { role: 'guard', clan: 'crows', tank: TANK.mortar, at: 'mortarMid1', hpMult: 0.4, sight: 460, leash: 100 },
    { role: 'guard', clan: 'crows', tank: TANK.mortar, at: 'mortarMid2', hpMult: 0.4, sight: 460, leash: 100 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'g1', hpMult: 0.6, leash: 260 },
    { role: 'guard', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: 'n2', hpMult: 0.6, leash: 260 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'g3', hpMult: 0.6, leash: 260 },
    { role: 'guard', clan: 'crows', tank: 'machinegun1/light1/halftracks1', at: 'n4', hpMult: 0.6, leash: 260 },
    { role: 'patrol', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: { x: 1300, y: 500 }, route: 'line', hpMult: 0.6 },
  ],
  crates: [
    { at: { x: 600, y: 700 }, content: 'kit' }, { at: { x: 1500, y: 950 } }, { at: { x: 2300, y: 200 }, content: 'kit' }, { at: { x: 3200, y: 960 } }, { at: { x: 3700, y: 250 } },
  ],
  objective: { kind: 'raid', tag: 'target', label: 'Pipeline valves' },
  timeLimit: 180,
  bonus: [{ kind: 'time', under: 160 }, { kind: 'kills', n: 9 }],
  loot: LOOT_DESERT,
};
