import type { LevelDef } from '../../../src/logic/level/types';
import { blob, drifts, each, LOOT_SNOW, patch, path, railLine, ridge, TANK } from './kit';

/**
 * Level 40, The Rail-Gun Train (Fortress): the clans' armoured train shuttles
 * along one rail line through a snowy arena, 4 × 2 screens. It moves only
 * along the line, end to end and back; its hull is armoured while its four
 * turrets stand (cannon, machinegun, rockets, and the rail gun at the tail).
 * Fight it from beside the track: ice rocks, drifts and cabins give cover. With
 * the turrets gone it charges down the line at anyone close to the track:
 * stay clear of the line, and a charge into the buffers at either end dazes
 * it. A blizzard sweeps through mid-fight; clan escorts join on the alarm.
 */
const LINE_Y = 540;
const LINE_X0 = 700;
const LINE_X1 = 3150;

export const LEVEL_40: LevelDef = {
  id: 'ch4-40', number: 40, name: 'The Rail-Gun Train', type: 'fortress',
  briefing: 'The three clans have bolted their guns to a train: the Rail-Gun Train, shuttling up and down one rail line. It cannot leave the rails, and its hull is armoured while any turret stands: a cannon, a machinegun, rockets and the long rail gun at the tail. Fight from the cover beside the track. With its guns gone it charges down the line at anyone near the rails: keep clear, and let it hit the buffers. A blizzard blows through the fight.',
  teaches: 'The chapter boss on rails; cover beside the track; baiting a charge into the buffers',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', [{ x: 120, y: 900 }, { x: 500, y: 880 }, { x: 600, y: 760 }], 80),
      patch('frozenDirt', LINE_X0 - 120, LINE_Y - 60, LINE_X1 - LINE_X0 + 240, 120),
      blob('ice', 1500, 880, 160), blob('ice', 2500, 200, 140),
    ],
    structures: [
      // The rail line: a line with buffers at both ends.
      ...railLine([{ x: LINE_X0, y: LINE_Y }, { x: LINE_X1, y: LINE_Y }]),
      // Cliffs along the north and south edges; the arena between.
      ...ridge(900, 60, 6), ...ridge(2200, 1000, 6),
      // Cover beside the track: ice rocks, drifts, cabins, fir.
      ...each('iceRockB', [[900, 400], [1300, 700], [1800, 380], [2200, 730], [2600, 400], [3000, 700]]), ...each('iceRockC', [[1100, 760], [1600, 320], [2000, 700], [2850, 380]]),
      ...drifts(1000, 330, 2), ...drifts(1400, 760, 2), ...drifts(1900, 290, 2), ...drifts(2300, 800, 2), ...drifts(2700, 300, 2), ...drifts(3000, 800, 2),
      { kind: 'cabinLarge', x: 1500, y: 360 }, { kind: 'cabinSmall', x: 2450, y: 740 }, { kind: 'signalBox', x: 2100, y: 400 }, { kind: 'cabinSmall', x: 800, y: 700 },
      ...each('snowPine', [[300, 300], [500, 150], [1200, 220], [1700, 900], [2400, 940], [3300, 200], [3500, 440], [3600, 860], [3350, 960], [300, 700], [150, 450]]),
      ...each('firSmall', [[700, 420], [1250, 940], [2150, 220], [2900, 560], [3250, 600], [450, 980]]),
    ],
    points: {
      start: { x: 200, y: 900 }, gN: { x: 1900, y: 220 }, gS: { x: 1500, y: 860 }, reinfE: { x: 3800, y: 900 }, reinfW: { x: 100, y: 120 },
    },
    roads: { line: [{ x: LINE_X0, y: LINE_Y }, { x: LINE_X1, y: LINE_Y }] },
  },
  start: 'start', startHeading: 0,
  mixedClans: true,
  weather: { kind: 'blizzard', first: 50, every: 60, last: 14, sight: 220, wind: 30 },
  enemies: [
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'reinfE', when: 120, hpMult: 0.31 },
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'reinfW', when: 150, hpMult: 0.31 },
  ],
  crates: [{ at: { x: 400, y: 800 }, content: { family: 'cannon', mk: 5 } }, { at: { x: 600, y: 880 }, content: 'kit' }, { at: { x: 1200, y: 900 } }, { at: { x: 2300, y: 250 }, content: 'kit' }, { at: { x: 3000, y: 900 }, content: 'kit' }, { at: { x: 1700, y: 160 } }],
  objective: {
    kind: 'fortress',
    boss: {
      name: 'Rail-Gun Train', hp: 950, speed: 26, road: 'line', body: 'railTrain', clan: 'boars', rail: true, length: 125, radius: 60, armour: 14,
      turrets: [
        { gun: 'cannon', dx: 76, dy: 0, hp: 90 }, { gun: 'machinegun', dx: 21, dy: 0, hp: 90 },
        { gun: 'rockets', dx: -24, dy: 0, hp: 90 }, { gun: 'cannon', dx: -78, dy: 0, hp: 110, art: 'fortressRail' },
      ],
    },
  },
  bonus: [{ kind: 'time', under: 300 }, { kind: 'kills', n: 3 }],
  loot: LOOT_SNOW,
};
