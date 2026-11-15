import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_DESERT, path, row, TANK, CEMENT_STEP } from './kit';

/**
 * Level 18, Oil Town Siege (Hold): hold the town square for 100 s, 3 × 2
 * screens of sand. Four waves come in over the dunes from the east and the
 * north; the third and fourth bring mortars that shell the square from 400 px
 * out (the red rings land where you stand: a parked tank is hit). The square
 * is ringed by our white cement walls with two gun towers on its east side;
 * they wake when you're near and cover the gaps. The clock only runs while
 * you're in the ring, so holding means moving inside it: drive out of each
 * landing ring, shoot the mortars when they show, and use the cement as cover.
 */
const SX = 1500;
const SY = 540;

export const LEVEL_18: LevelDef = {
  id: 'ch2-18', number: 18, name: 'Oil Town Siege', type: 'hold',
  briefing: 'The Crows have come for the oil town. Hold the square for 100 seconds: they attack in four waves, and from the third their mortars shell the square from outside the walls. Standing still gets you hit, so keep moving inside the ring. Our cement walls and the two gun towers help you hold.',
  teaches: 'Holding ground under shellfire: keep moving inside the zone',
  map: {
    cols: 3, rows: 2, base: 'sand',
    terrain: [
      path('sandTrackH', [at(0, 0.5), at(1.0, 0.5), at(1.5, 0.5), at(2.0, 0.5), at(3, 0.5)], 80), path('sandTrack', [at(1.5, 0), at(1.5, 2)], 70),
      blob('packedSand', SX, SY, 260), blob('packedSand', 500, 850, 220), blob('packedSand', 2500, 900, 200),
    ],
    structures: [
      // The square's cement walls: north and south runs with gaps for the roads, a short east wall either side of the road.
      ...row('cementWall', SX - 250, SY - 230, 3, CEMENT_STEP), ...row('cementWall', SX + 60, SY - 230, 3, CEMENT_STEP),
      ...row('cementWall', SX - 250, SY + 230, 3, CEMENT_STEP), ...row('cementWall', SX + 60, SY + 230, 3, CEMENT_STEP),
      ...row('cementWallV', SX + 260, SY - 170, 2, 0, CEMENT_STEP), ...row('cementWallV', SX + 260, SY + 110, 2, 0, CEMENT_STEP),
      // The town: derricks, tanks and adobe houses beyond the walls, and a well in the square.
      { kind: 'oilTank', x: SX - 80, y: SY - 90 }, { kind: 'oilTank', x: SX + 90, y: SY + 100 }, { kind: 'well', x: SX, y: SY },
      { kind: 'adobeHouse', x: 800, y: 300 }, { kind: 'adobeHouse', x: 2200, y: 800 }, { kind: 'adobeHut', x: 700, y: 760 }, { kind: 'adobeHut', x: 2300, y: 250 },
      ...each('oilDerrick', [[1000, 850], [1950, 250], [2650, 560]]),
      { kind: 'sandbags', x: SX - 340, y: SY - 40 }, { kind: 'sandbags', x: SX - 340, y: SY + 60 }, { kind: 'sandbags', x: SX, y: SY + 330 }, { kind: 'sandbags', x: SX, y: SY - 330 },
      // Dune crests screen the approaches.
      { kind: 'duneV', x: 2100, y: 400 }, { kind: 'duneV', x: 2250, y: 700 }, { kind: 'dune', x: 1350, y: 140 }, { kind: 'dune', x: 1700, y: 960 },
      ...each('scrub', [[1100, 160], [1900, 120], [2000, 980], [1100, 980], [600, 500]]),
      ...each('cactus', [[300, 300], [300, 900], [2700, 200], [2800, 950], [1000, 480]]),
      ...each('boulder', [[900, 1000], [2400, 480], [1300, 780]]),
    ],
    points: { square: { x: SX, y: SY }, east: { x: 2850, y: 560 }, north: { x: 1500, y: 40 }, northE: { x: 2300, y: 60 }, far: { x: 2750, y: 960 }, west: { x: 40, y: 560 } },
    roads: {},
  },
  start: at(0.5, 1.0), startHeading: 0,
  allies: [{ kind: 'tower', at: { x: SX + 300, y: SY - 70 }, gun: 'cannon' }, { kind: 'tower', at: { x: SX + 300, y: SY + 10 + 70 }, gun: 'machinegun' }],
  enemies: [
    // Wave 1: raiders from the east. Wave 2: a pincer from the north. Waves 3 and 4: mortars shell the square from outside the walls, gunners push in.
    { role: 'wave', clan: 'crows', tank: 'machinegun2/light2/wheels3', at: 'east', when: 4, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'east', when: 8, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'north', when: 26, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'northE', when: 28, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: 'machinegun2/light2/wheels3', at: 'north', when: 30, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.mortar, at: 'east', when: 46, hpMult: 0.5 },
    { role: 'wave', clan: 'crows', tank: TANK.mortar, at: 'far', when: 48, hpMult: 0.5 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'east', when: 52, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.mortar2, at: 'north', when: 66, hpMult: 0.5 },
    { role: 'wave', clan: 'crows', tank: TANK.mortar, at: 'northE', when: 68, hpMult: 0.5 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner2, at: 'far', when: 70, hpMult: 0.58 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'east', when: 72, hpMult: 0.58 },
  ],
  crates: [{ at: { x: SX - 150, y: SY + 150 }, content: 'kit' }, { at: { x: SX + 150, y: SY - 150 }, content: 'kit' }, { at: { x: 800, y: 560 } }, { at: { x: 2300, y: 560 } }, { at: { x: 500, y: 300 } }],
  objective: { kind: 'hold', zone: 'square', radius: 240, seconds: 100 },
  bonus: [{ kind: 'intel', n: 30 }, { kind: 'kills', n: 5 }],
  loot: LOOT_DESERT,
};
