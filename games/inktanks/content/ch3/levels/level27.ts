import type { LevelDef } from '../../../src/logic/level/types';
import { blob, each, LOOT_SWAMP, patch, path, reedBed, row, TANK } from './kit';

/**
 * Level 27, Grim (Ace): Grim, the Weasels' Hover ace, holds the Black Water, a
 * walled lagoon at the east end of 4 × 2 screens. His Flamer is a short-range
 * weapon and his Hover is fast, so the fight is a duel at 100 px: nobody
 * outruns him, and in the open he cooks a tank in seconds. The ground is the
 * answer. Old stone walls cut the lagoon into pens, deep channels run between
 * them (he floats through, you drive round), and reed beds hide the approach
 * (they burn: so keep out of them when he is near). A wall between you stops
 * his flame, so fight him from behind one. Machinegun and Flamer hit Hover
 * hard: a Machinegun lies in a crate on the way in. Weasel skimmers and
 * Cannon guards spot for him.
 */
const GX = 3000;
const GY = 540;

export const LEVEL_27: LevelDef = {
  id: 'ch3-27', number: 27, name: 'Grim', type: 'ace',
  briefing: 'Grim, the Weasels’ Hover ace, lurks in the Black Water with a Flamer. He is fast and he fights at arm’s length: out in the open he will cook you in seconds, and you can’t outrun him. Fight him round the old walls: a wall stops his flame. He floats across the channels where you can’t, and the reeds burn, so don’t hide in them when he’s near. A Machinegun in a crate on the way hits a Hover hard. Destroy Grim: an ace carries rare tech.',
  teaches: 'Fighting a fast flamer from behind walls; Machinegun and Flamer hit Hover hard; reeds burn',
  map: {
    cols: 4, rows: 2, base: 'marsh',
    terrain: [
      path('dirt', [{ x: 80, y: 700 }, { x: 800, y: 620 }, { x: 1500, y: 760 }, { x: 2100, y: 600 }], 80),
      blob('shallows', 900, 900, 160), blob('shallows', 1700, 300, 150), blob('mud', 1250, 450, 140),
      // The Black Water: a lagoon with two deep channels running north-south and a cross channel.
      patch('swampWater', 2300, 60, 1400, 980),
      patch('marsh', 2400, 150, 300, 200), patch('marsh', 2400, 740, 300, 200), patch('marsh', 2900, 150, 280, 220), patch('marsh', 2900, 700, 280, 220), patch('marsh', 3400, 150, 220, 260), patch('marsh', 3400, 660, 220, 260),
      blob('shallows', 2650, 540, 90), blob('shallows', 3250, 540, 90), blob('marsh', 3000, 540, 120), patch('shallows', 2300, 480, 1100, 120),
    ],
    structures: [
      // The pens' walls (60 apart: solid). Gaps of two pieces are the doors you can use.
      ...row('wallStone', 2380, 140, 6, 60), ...row('wallStone', 2380, 380, 6, 60), ...row('wallStone', 2380, 700, 6, 60), ...row('wallStone', 2380, 940, 6, 60),
      ...row('wallStoneV', 2380, 200, 3, 0, 60), ...row('wallStoneV', 2380, 760, 3, 0, 60),
      ...row('wallStone', 2880, 140, 5, 60), ...row('wallStone', 2880, 380, 5, 60), ...row('wallStone', 2880, 700, 5, 60), ...row('wallStone', 2880, 940, 5, 60),
      ...row('wallStoneV', 2880, 200, 3, 0, 60), ...row('wallStoneV', 2880, 760, 3, 0, 60),
      ...row('wallStone', 3380, 140, 4, 60), ...row('wallStone', 3380, 400, 4, 60), ...row('wallStone', 3380, 680, 4, 60), ...row('wallStone', 3380, 940, 4, 60),
      // Reed beds in the pens and on the shore: a Flamer's gift and a trap.
      ...reedBed(2540, 260, 4), ...reedBed(2540, 830, 4), ...reedBed(3020, 270, 4), ...reedBed(3020, 810, 4), ...reedBed(3500, 280, 3), ...reedBed(3500, 780, 3),
      ...reedBed(2150, 400, 4), ...reedBed(2150, 850, 4), ...reedBed(1300, 300, 3),
      // Sandbags and huts on the way in.
      { kind: 'sandbags', x: 1900, y: 540 }, { kind: 'sandbagsV', x: 2100, y: 780 }, { kind: 'sandbagsV', x: 2100, y: 330 }, { kind: 'stiltHutSmall', x: 1500, y: 280 }, { kind: 'fishRack', x: 600, y: 900 },
      ...each('deadTree', [[1100, 150], [1400, 950], [2250, 540], [3650, 540], [1800, 880]]),
      ...each('cypress', [[200, 150], [300, 1000], [3780, 100], [3780, 1000], [700, 300]]),
      { kind: 'jetty', x: 2330, y: 540 },
    ],
    points: {
      grim: { x: GX, y: GY }, causeway: { x: 2500, y: 540 }, spotW: { x: 2150, y: 600 }, spotN: { x: 2600, y: 260 }, spotS: { x: 2600, y: 830 }, hutG: { x: 1560, y: 340 }, bagG: { x: 1900, y: 600 },
      skimN: { x: 3100, y: 80 }, skimS: { x: 3100, y: 1010 },
    },
    roads: {},
  },
  start: { x: 220, y: 700 }, startHeading: 0,
  enemies: [
    { role: 'guard', clan: 'weasels', tank: 'flamer4/light4/hover4', at: 'grim', leash: 900, sight: 620, name: 'Grim', ace: true, hpMult: 3.75 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'spotW', hpMult: 0.43, sight: 400, leash: 200 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'skimN', when: 'alarm', hpMult: 0.43 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'skimS', when: 'alarm', hpMult: 0.43 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'hutG', hpMult: 0.43, sight: 400, leash: 200 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamerHover, at: 'causeway', hpMult: 1.5, sight: 400, leash: 300 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'bagG', hpMult: 0.43, sight: 400, leash: 200 },
  ],
  crates: [
    { at: { x: 1600, y: 800 }, content: { family: 'machinegun', mk: 4 } }, { at: { x: 700, y: 560 }, content: 'kit' }, { at: { x: 1950, y: 900 }, content: 'kit' },
    { at: { x: 1200, y: 200 } }, { at: { x: 2650, y: 330 } }, { at: { x: 3700, y: 900 } },
  ],
  objective: { kind: 'ace' },
  bonus: [{ kind: 'time', under: 230 }, { kind: 'time', under: 205 }],
  loot: LOOT_SWAMP,
};
