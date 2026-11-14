import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_SWAMP, patch, path, reedBed, row, TANK } from './kit';

/**
 * Level 30, The Ironclad (Fortress): the Weasels' paddle-wheel Ironclad
 * patrols a flooded quarry, 3 × 3 screens. It moves on deep water only, so
 * you fight it from the bank: its hull is armoured while its four turrets
 * stand (two Cannons, Rockets, an MG: the fortress's mounts). With the
 * turrets gone it charges; bait the charge into the bank, which stops it
 * like a wall and dazes it. Two fog banks drift over the lake (inside one
 * you can't be seen, and no one sees through it); a Flamer waits in the
 * reeds on each bank, and Weasel skimmers join when the alarm goes.
 */
const FX = 1440;
const FY = 700;

export const LEVEL_30: LevelDef = {
  id: 'ch3-30', number: 30, name: 'The Ironclad', type: 'fortress',
  briefing: 'The Weasels have armoured a paddle steamer: the Ironclad, patrolling the old quarry lake. It cannot leave the water, and you cannot enter it: fight from the bank. Break its turrets first (the hull is armoured while any stand): Cannons, Rockets and a Machinegun. With its guns gone it charges: watch the red lane, step aside and let it ram the bank. A dazed Ironclad takes extra damage. Fog drifts over the lake, and Flamers wait in the reeds.',
  teaches: 'The chapter boss on the water; fighting from the bank; baiting a charge into the shore',
  map: {
    cols: 3, rows: 3, base: 'marsh',
    terrain: [
      path('dirt', [at(1.5, 3), at(1.5, 2.2)], 90),
      patch('swampWater', FX - 440, FY - 300, 880, 600),
      blob('shallows', 500, 560, 150), blob('shallows', 2400, 1100, 160), blob('mud', 520, 1250, 150), blob('mud', 2400, 360, 150),
    ],
    structures: [
      // Reeds on the banks: the Flamers' hides.
      ...reedBed(FX - 560, FY - 160, 5), ...reedBed(FX + 560, FY + 150, 5), ...reedBed(FX - 300, FY + 400, 3), ...reedBed(FX + 280, FY - 400, 3),
      // Cover on the banks: sandbags facing the lake, mooring posts, a jetty and a stilt hut or two.
      ...each('sandbagsV', [[FX - 520, FY + 160], [FX + 520, FY - 160]]), ...each('sandbags', [[FX - 160, FY + 400], [FX + 160, FY - 400], [FX + 150, FY + 440], [FX - 150, FY - 440]]),
      { kind: 'jetty', x: FX - 500, y: FY + 40 }, { kind: 'stiltHutSmall', x: 560, y: 420 }, { kind: 'stiltHutLarge', x: 2300, y: 1000 }, { kind: 'stiltHutSmall', x: 2400, y: 400 },
      ...each('mooringPost', [[FX - 500, FY - 40], [FX - 500, FY + 100], [FX + 500, FY - 60]]),
      // Posts in the water the Ironclad steers round (low walls in the lake).
      ...each('cypress', [[300, 300], [2600, 300], [300, 1400], [2600, 1450], [1000, 1550], [2000, 1500], [700, 1000], [2200, 200]]),
      ...each('deadTree', [[FX - 250, FY - 100], [FX + 250, FY + 120]]),
      ...row('walkRailN', 1200, 1250, 2, 100),
    ],
    points: {
      flamerW: { x: FX - 560, y: FY - 160 }, flamerE: { x: FX + 560, y: FY + 150 }, mortarN: { x: FX, y: FY - 470 },
      waveW: { x: 80, y: 700 }, waveE: { x: 2800, y: 700 },
    },
    roads: {
      ring: [{ x: FX - 300, y: FY - 190 }, { x: FX + 300, y: FY - 190 }, { x: FX + 300, y: FY + 190 }, { x: FX - 300, y: FY + 190 }],
    },
  },
  start: at(1.5, 2.85), startHeading: -Math.PI / 2,
  weather: { kind: 'fog', banks: [{ x: FX, y: FY - 100, r: 170, dx: 300, period: 45 }, { x: FX, y: FY + 120, r: 170, dx: 300, period: 55 }] },
  enemies: [
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flamerW', hpMult: 0.6, sight: 300, leash: 260 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flamerE', hpMult: 0.6, sight: 300, leash: 260 },
    { role: 'turret', clan: 'weasels', tank: TANK.mortar, at: 'mortarN', hpMult: 0.5, sight: 480 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer2, at: 'waveW', when: 'alarm', hpMult: 0.8 },
    { role: 'wave', clan: 'weasels', tank: TANK.flamerHover, at: 'waveE', when: 70, hpMult: 0.8 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer2, at: 'waveE', when: 'alarm', hpMult: 0.8 },
  ],
  crates: [{ at: at(1.2, 2.6), content: { family: 'cannon', mk: 2 } }, { at: at(1.8, 2.6), content: 'kit' }, { at: at(0.4, 2.2) }, { at: at(2.6, 2.2) }, { at: at(0.3, 0.5), content: 'kit' }, { at: at(1.0, 1.9), content: 'kit' }, { at: at(2.0, 1.9), content: 'kit' }],
  objective: {
    kind: 'fortress',
    boss: {
      name: 'Ironclad', hp: 1500, speed: 22, road: 'ring', body: 'ironclad', clan: 'weasels', afloat: true, radius: 80, armour: 14,
      turrets: [{ gun: 'cannon', dx: 30, dy: -34, hp: 190 }, { gun: 'cannon', dx: 30, dy: 34, hp: 190 }, { gun: 'rockets', dx: -34, dy: 0, hp: 240 }, { gun: 'machinegun', dx: 58, dy: 0, hp: 160 }],
    },
  },
  bonus: [{ kind: 'time', under: 300 }, { kind: 'kills', n: 8 }],
  loot: LOOT_SWAMP,
};
