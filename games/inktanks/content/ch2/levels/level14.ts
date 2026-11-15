import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, depot, each, LOOT_DESERT, path, row, TANK } from './kit';

/**
 * Level 14, Water Truck (Escort): get the water truck across the flats to
 * our depot, 4 × 2 screens of sand. The truck drives only while you're near.
 * A sandstorm rolls over mid-route (at 0:40, again at 1:40): nobody sees past
 * 180 px, and Crow raiders come for the truck under each one. Dune crests hide
 * an ambush either side of the road; a Crow mortar on the mesa shells the
 * road's middle (silence it from the mesa's back, under its minimum range, or
 * hurry the truck past). The road ends inside our white-cement depot, where
 * two gun towers open up once you're in sight of them.
 */
const ROAD = [at(0.15, 1.5), at(0.8, 1.45), at(1.4, 1.2), at(2.0, 1.15), at(2.6, 1.3), at(3.2, 1.05), at(3.8, 1.0)];
const DEPOT = depot(3480, 540, 300, 260, ['cannon', 'machinegun']);

export const LEVEL_14: LevelDef = {
  id: 'ch2-14', number: 14, name: 'Water Truck', type: 'escort',
  briefing: 'Our depot across the flats is out of water. Bring the water truck in; it only drives while you stay close. A sandstorm is coming: when it rolls over you’ll see only a stone’s throw, and the Crows will use it. A mortar on the mesa covers the road. The depot’s gun towers cover you at the end.',
  teaches: 'Escort through a sandstorm; dune crests hide tanks; under a mortar’s minimum range',
  map: {
    cols: 4, rows: 2, base: 'sand',
    terrain: [path('sandTrackH', ROAD, 80), blob('packedSand', 900, 300, 220), blob('packedSand', 2900, 820, 200), blob('packedSand', 3700, 540, 240), blob('packedSand', 1900, 300, 200)],
    structures: [
      // Dune crests either side of the road (they block sight, not shots): the ambushers wait behind them.
      { kind: 'duneV', x: 1180, y: 900 }, { kind: 'duneV', x: 1420, y: 420 }, { kind: 'duneV', x: 2300, y: 960 }, { kind: 'duneV', x: 2280, y: 400 },
      // The mesa: a ring of cliff with the mortar on top, its back open to the north.
      ...row('mesaWall', 1720, 460, 4, 60), ...row('mesaWallV', 1700, 230, 4, 0, 60), ...row('mesaWallV', 1980, 230, 4, 0, 60),
      ...each('mesaRock', [[1760, 200], [1940, 200]]),
      // Cover along the way.
      ...each('scrub', [[700, 600], [1050, 1000], [2050, 900], [2700, 600], [3050, 760], [900, 260]]),
      { kind: 'sandbags', x: 1400, y: 760 }, { kind: 'sandbags', x: 2650, y: 840 }, { kind: 'sandbagsV', x: 3200, y: 820 },
      ...each('cactus', [[300, 300], [600, 1000], [1300, 120], [2200, 1040], [2600, 160], [3300, 300], [3300, 980]]),
      ...each('boulder', [[500, 700], [1100, 560], [2750, 1000], [3100, 160]]), { kind: 'adobeHut', x: 400, y: 1000 }, { kind: 'oilDerrick', x: 2950, y: 300 },
      // Our depot at the end of the road (one wall piece is 64 px: runs are laid 63 px apart).
      ...DEPOT.structures, { kind: 'oilTank', x: 3720, y: 470 }, { kind: 'crate', x: 3740, y: 620 },
    ],
    points: { mesa: { x: 1840, y: 330 }, duneW: { x: 1300, y: 900 }, duneN: { x: 1540, y: 420 }, duneE: { x: 2420, y: 980 }, duneNE: { x: 2400, y: 420 }, stormN: { x: 1500, y: 40 }, stormS: { x: 2000, y: 1070 }, stormE: { x: 3300, y: 1070 }, stormNE: { x: 3000, y: 30 }, derrick: { x: 2950, y: 380 } },
    roads: { truck: ROAD },
  },
  start: at(0.3, 1.7), startHeading: 0,
  weather: { kind: 'sandstorm', first: 40, every: 60, last: 14 },
  enemies: [
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: 'mesa', hpMult: 0.42, sight: 480 },
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: 'derrick', hpMult: 0.42, sight: 480 },
    { role: 'guard', clan: 'crows', tank: 'machinegun2/light2/wheels3', at: 'duneW', hpMult: 0.67, sight: 420, leash: 420 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'duneN', hpMult: 0.58, sight: 420, leash: 420 },
    { role: 'guard', clan: 'crows', tank: 'machinegun2/light2/halftracks2', at: 'duneE', hpMult: 0.67, sight: 420, leash: 420 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'duneNE', hpMult: 0.58, sight: 420, leash: 420 },
    // Raiders under the storms, for the truck.
    { role: 'wave', clan: 'crows', tank: 'machinegun2/light2/wheels3', at: 'stormN', when: 43, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'stormS', when: 45, hpMult: 0.5 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'stormN', when: 50, hpMult: 0.5 },
    { role: 'wave', clan: 'crows', tank: 'machinegun2/light2/wheels3', at: 'stormE', when: 102, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'stormNE', when: 104, hpMult: 0.5 },
  ],
  allies: DEPOT.allies,
  crates: [{ at: { x: 900, y: 300 }, content: 'kit' }, { at: { x: 1840, y: 120 } }, { at: { x: 2700, y: 580 } }, { at: { x: 600, y: 1000 } }, { at: { x: 3200, y: 200 }, content: 'kit' }],
  objective: { kind: 'escort', road: 'truck', truckHp: 1450, speed: 32 },
  bonus: [{ kind: 'truckHp', min: 0.25 }, { kind: 'kills', n: 4 }],
  loot: LOOT_DESERT,
};
