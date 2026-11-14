import type { LevelDef } from '../../../src/logic/level/types';
import { blob, depot, each, LOOT_SWAMP, patch, reedBed, row, TANK } from './kit';

/**
 * Level 21, Hover Trials (Breakout): the Brigade lends you a Hover drive for
 * the trial (`issue`), and you take it through the Mirefen lagoon to our
 * depot before the tide comes in (the timer). 4 × 2 screens. Two old stone
 * weirs cut the lagoon into three lanes of deep water (only Hover crosses
 * it): east along the top lane, round the first weir's east end, west along
 * the middle lane, round the second weir's west end, and east along the
 * bottom lane to the depot. A sluice in each weir is a short cut, if you can
 * break it (600 HP) under fire. Weasel skimmers (Hover too) patrol the lanes,
 * Cannon guards hold islands mid-lane, a Flamer waits in the reeds at each
 * turn and a mortar covers the east turn. Two fog banks drift down the lanes:
 * inside one you can't be seen, and no one sees through it. At 1:00 the tide
 * floods the north causeway (where the top lane's guard stands).
 */
const DEPOT = depot(3420, 900, 300, 220, ['cannon', 'machinegun']);
/** The weirs: stone wall pieces 60 apart; each has a sluice (id sluiceN / sluiceS) at SLUICE_X. */
const WEIR = { north: 360, south: 720 } as const;
const SLUICE_X = 1700;

export const LEVEL_21: LevelDef = {
  id: 'ch3-21', number: 21, name: 'Hover Trials', type: 'breakout',
  briefing: 'The Brigade has a new drive for you to try: Hover. It floats over deep water and mud, and drifts on every turn, so start turning early. Take it through the lagoon to our depot before the tide comes in. Two old weirs split the lagoon into three lanes: wind through them, or break a sluice for a short cut. Weasel skimmers patrol the water, Flamers hide in the reeds at the turns, and the fog banks hide anyone inside them.',
  teaches: 'Hover crosses deep water and drifts; fog banks hide; Flamers in the reeds; breakable short cuts',
  map: {
    cols: 4, rows: 2, base: 'marsh',
    terrain: [
      // Three lanes of deep water and the turning basins at their ends.
      patch('swampWater', 460, 50, 2900, 280), patch('swampWater', 3300, 50, 540, 640),
      patch('swampWater', 540, 395, 2800, 290), patch('swampWater', 60, 395, 480, 640),
      patch('swampWater', 540, 755, 2800, 280),
      // A causeway of shallows on the north shore; islands of firm marsh mid-lane and at the turns.
      patch('shallows', 460, 0, 2900, 50),
      blob('marsh', 1500, 190, 70), blob('marsh', 2300, 540, 80), blob('marsh', 2500, 900, 70),
      blob('marsh', 3720, 300, 100), blob('marsh', 130, 790, 100), blob('marsh', 3540, 230, 90), blob('marsh', 3720, 450, 60), blob('marsh', 200, 640, 60), blob('dirt', 3570, 900, 200),
    ],
    structures: [
      // The weirs: the north one from the west shore to the east basin, the south one from the west basin to the east shore.
      ...row('wallStone', 30, WEIR.north, 27, 60), { kind: 'sluiceDam', x: SLUICE_X, y: WEIR.north, id: 'sluiceN' }, ...row('wallStone', 1820, WEIR.north, 30, 60),
      ...row('wallStone', 330, WEIR.south, 22, 60), { kind: 'sluiceDam', x: SLUICE_X, y: WEIR.south, id: 'sluiceS' }, ...row('wallStone', 1820, WEIR.south, 34, 60),
      // Reeds: the Flamers' hides at the turns, and the islands.
      ...reedBed(3730, 290, 5), ...reedBed(130, 790, 5), ...reedBed(1500, 190, 3), ...reedBed(2300, 560, 3), ...reedBed(2500, 900, 3),
      // The guards' sandbags on their islands, facing the lane's approach.
      { kind: 'sandbagsV', x: 1440, y: 190 }, { kind: 'sandbagsV', x: 2370, y: 540 }, { kind: 'sandbagsV', x: 2440, y: 900 },
      // Dead trees and posts in the water.
      ...each('deadTree', [[900, 120], [1200, 260], [2000, 110], [2700, 250], [3100, 140], [900, 600], [1300, 470], [2000, 640], [2900, 470], [1000, 830], [1500, 980], [2000, 820], [2900, 990]]),
      ...each('cypress', [[200, 80], [3780, 760], [200, 1050], [3000, 1060]]),
      { kind: 'jetty', x: 420, y: 180 }, { kind: 'stiltHutSmall', x: 3560, y: 200 }, { kind: 'fishRack', x: 250, y: 300 },
      ...DEPOT.structures, { kind: 'crate', x: 3640, y: 840 },
    ],
    points: {
      start: { x: 220, y: 180 }, exit: { x: 3560, y: 900 },
      eastTurn: { x: 3740, y: 300 }, westTurn: { x: 120, y: 780 }, eastTurn2: { x: 3720, y: 450 }, westTurn2: { x: 200, y: 640 }, mortarIsle: { x: 3560, y: 280 },
      isleA: { x: 1500, y: 190 }, isleB: { x: 2300, y: 540 }, isleC: { x: 2500, y: 900 },
      waveN: { x: 3800, y: 60 }, waveW: { x: 80, y: 1000 },
    },
    roads: {
      laneA: [{ x: 800, y: 260 }, { x: 3000, y: 260 }],
      laneB: [{ x: 3000, y: 470 }, { x: 900, y: 470 }],
      laneC: [{ x: 900, y: 820 }, { x: 3000, y: 820 }],
    },
  },
  start: 'start', startHeading: 0,
  issue: [{ family: 'hover', mk: 1 }],
  weather: { kind: 'fog', banks: [{ x: 2100, y: 540, r: 160, dx: 500, period: 40 }, { x: 1500, y: 900, r: 160, dx: 500, period: 50 }] },
  floods: [{ at: 60, terrain: [patch('swampWater', 460, 0, 2900, 55)], text: 'The tide is coming in: the north causeway is under water!' }],
  enemies: [
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer2, at: { x: 3000, y: 260 }, route: 'laneA', hpMult: 0.8 },
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer2, at: { x: 900, y: 470 }, route: 'laneB', hpMult: 0.8 },
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer2, at: { x: 3000, y: 820 }, route: 'laneC', hpMult: 0.8 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner2, at: 'isleA', hpMult: 0.9, sight: 440, leash: 100 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner2, at: 'isleB', hpMult: 0.9, sight: 440, leash: 100 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner2, at: 'isleC', hpMult: 0.9, sight: 440, leash: 100 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'eastTurn', hpMult: 0.6, sight: 300, leash: 260 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamerHover, at: 'westTurn', hpMult: 0.7, sight: 300, leash: 320 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'eastTurn2', hpMult: 0.5, sight: 300, leash: 200 },
    { role: 'turret', clan: 'weasels', tank: TANK.mortar, at: 'mortarIsle', hpMult: 0.5, sight: 480 },
    // The alarm brings two more skimmers.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer2, at: 'waveN', when: 'alarm', hpMult: 0.8 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer2, at: 'waveW', when: 'alarm', hpMult: 0.8 },
    // Hover Flamers come hunting: one from the west at 0:20, one from the north-east at 0:30.
    { role: 'wave', clan: 'weasels', tank: TANK.flamerHover, at: 'waveW', when: 20, hpMult: 1 },
    { role: 'wave', clan: 'weasels', tank: TANK.flamerHover, at: 'waveN', when: 30, hpMult: 1 },
  ],
  allies: DEPOT.allies,
  crates: [{ at: { x: 1540, y: 150 }, content: 'kit' }, { at: { x: 3600, y: 300 } }, { at: { x: 2260, y: 500 }, content: 'kit' }, { at: { x: 150, y: 850 } }],
  objective: { kind: 'breakout', exit: 'exit', radius: 110, to: 'our depot' },
  bonus: [{ kind: 'time', under: 61 }, { kind: 'kills', n: 4 }],
  timeLimit: 70,
  loot: LOOT_SWAMP,
};
