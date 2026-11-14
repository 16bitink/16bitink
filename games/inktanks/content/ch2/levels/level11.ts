import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_DESERT, path, row, TANK } from './kit';

/**
 * Level 11, Sand in the Tracks (Assault): the Crow camp on the oil town's
 * edge, 3 × 2 screens of sand. Two mortars sit in a walled yard and lob over
 * its walls at anything their gate guards and the derrick guard can see (a
 * spotter): the red rings on the ground are their shells coming down. Three
 * ways in: the open road over the flats (Wheels slow on sand), the scrub line
 * along the north, or a Mortar from the crate by the old pump to lob back
 * over the walls. A patrol scout crosses the flats.
 */
const YX = 2150;
const YY = 560;

export const LEVEL_11: LevelDef = {
  id: 'ch2-11', number: 11, name: 'Sand in the Tracks', type: 'assault',
  briefing: 'The Crows have dug in at the oil town’s edge. Two mortars in their walled yard lob shells over the walls at anything their guards can see: watch for the red rings and drive out of them. A Mortar of ours lies by the old pump if you want to lob back. Clear the camp.',
  teaches: 'Mortars: lobbed over walls, the landing ring, the minimum range; sand slows Wheels',
  map: {
    cols: 3, rows: 2, base: 'sand',
    terrain: [
      path('sandTrackH', [at(0, 1.5), at(0.9, 1.42), at(1.7, 1.12), at(2.25, 1.05)], 80),
      blob('packedSand', 1300, 300, 240), blob('packedSand', 600, 260, 180), blob('packedSand', YX + 200, YY, 260),
    ],
    structures: [
      // The yard: adobe walls laid 60 apart, open on the west (the gate) and a gap in the south-east.
      ...row('adobeWall', YX, YY - 200, 8, 60), ...row('adobeWall', YX, YY + 200, 5, 60),
      ...row('adobeWallV', YX + 460, YY - 170, 6, 0, 60),
      ...row('adobeWallV', YX - 20, YY - 170, 2, 0, 60), ...row('adobeWallV', YX - 20, YY + 110, 2, 0, 60),
      { kind: 'adobeHouse', x: YX + 300, y: YY - 90 }, { kind: 'tent', x: YX + 180, y: YY + 110 }, { kind: 'oilTank', x: YX + 380, y: YY + 120 },
      // The gate's sandbags (the guards fight from them) and ours, 250 px out.
      { kind: 'sandbagsV', x: YX - 110, y: YY - 40 }, { kind: 'sandbagsV', x: YX - 110, y: YY + 40 },
      { kind: 'sandbags', x: YX - 380, y: YY - 140 }, { kind: 'sandbags', x: YX - 380, y: YY + 170 },
      // The derricks north of the road, the old pump by the crate.
      ...each('oilDerrick', [[1500, 360], [1640, 300]]), { kind: 'oilTank', x: 1560, y: 440 }, { kind: 'oilDerrick', x: 820, y: 560 },
      // The scrub line along the north: the covered approach.
      ...each('scrub', [[1100, 250], [1280, 320], [1460, 200], [1760, 240], [1950, 300], [700, 300]]),
      // Rocks and cactus break up the flats.
      ...each('mesaRock', [[1200, 760], [1820, 900], [400, 520]]), ...each('boulder', [[1000, 980], [2500, 950], [2700, 250]]),
      ...each('cactus', [[300, 300], [1350, 900], [2000, 1000], [2750, 700], [1700, 760]]),
      { kind: 'adobeHut', x: 2700, y: 900 }, { kind: 'adobeHouse', x: 2650, y: 180 },
    ],
    points: { gateN: { x: YX - 60, y: YY - 60 }, gateS: { x: YX - 60, y: YY + 60 }, mortarA: { x: YX + 150, y: YY - 60 }, mortarB: { x: YX + 220, y: YY + 40 }, pumps: { x: 1580, y: 380 } },
    roads: { flats: [{ x: 1100, y: 600 }, { x: 1500, y: 640 }, { x: 1800, y: 820 }, { x: 1300, y: 900 }] },
  },
  start: at(0.2, 1.5), startHeading: 0,
  enemies: [
    { role: 'patrol', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: { x: 1100, y: 600 }, route: 'flats', hpMult: 0.7 },
    { role: 'guard', clan: 'crows', tank: 'machinegun1/light1/wheels1', at: 'pumps', hpMult: 0.5 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'gateN', hpMult: 0.6, leash: 220 },
    { role: 'guard', clan: 'crows', tank: 'machinegun1/light1/halftracks1', at: 'gateS', hpMult: 0.5, leash: 220 },
    { role: 'guard', clan: 'crows', tank: TANK.mortar, at: 'mortarA', hpMult: 0.4, leash: 120 },
    { role: 'guard', clan: 'crows', tank: TANK.mortar, at: 'mortarB', hpMult: 0.4, leash: 120 },
  ],
  crates: [
    { at: { x: 900, y: 480 }, content: { family: 'mortar', mk: 1 } },
    { at: { x: 1600, y: 940 }, content: 'kit' },
    { at: { x: 600, y: 200 } }, { at: { x: 2650, y: 980 } }, { at: { x: 1950, y: 200 } },
  ],
  objective: { kind: 'assault' },
  bonus: [{ kind: 'intel', n: 20 }, { kind: 'time', under: 100 }],
  loot: LOOT_DESERT,
};
