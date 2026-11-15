import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_DESERT, patch, path, row, TANK } from './kit';

/**
 * Level 20, The Sand Crawler (Fortress): the Crows' land crawler circles
 * the floor of a canyon arena, 3 × 3 screens. Its hull is armoured while
 * its five turrets stand (two Mortars that shell over the cliffs, two
 * Cannons, a Machinegun). With the turrets gone it charges (phase 2); bait
 * the charge into the unbreakable mesa walls and shoot while it's dazed.
 * A sandstorm rolls over mid-fight (at 1:10, again at 2:30), and Crow
 * raiders arrive under each storm; a Mortar crate by the start.
 */
const FX = 1440;
const FY = 720;

export const LEVEL_20: LevelDef = {
  id: 'ch2-20', number: 20, name: 'The Sand Crawler', type: 'fortress',
  briefing: 'The Crows’ Sand Crawler rolls round a canyon floor. Break its turrets first: two Mortars shell you over the cliffs, so stay moving or get close under their minimum range. The hull is armoured while any turret stands. With its guns gone it charges: watch the red lane, step aside, and let it hit the cliffs. A dazed crawler takes extra damage. A sandstorm will roll over the canyon.',
  teaches: 'The chapter boss; baiting a charge into the cliffs',
  map: {
    cols: 3, rows: 3, base: 'sand',
    terrain: [patch('packedSand', FX - 620, FY - 400, 1240, 800), path('sandTrack', [at(1.5, 3), at(1.5, 1.6)], 90), blob('packedSand', 500, 600, 160), blob('packedSand', 2300, 1300, 180)],
    structures: [
      // Canyon cliffs (unbreakable, 64 px pieces laid 60 apart); the south end has a wide open mouth.
      ...row('mesaWall', FX - 590, FY - 420, 20, 60), ...row('mesaWall', FX - 590, FY + 420, 8, 60), ...row('mesaWall', FX + 130, FY + 420, 8, 60),
      ...row('mesaWallV', FX - 620, FY - 390, 14, 0, 60), ...row('mesaWallV', FX + 620, FY - 390, 14, 0, 60),
      ...each('mesaRock', [[FX - 620, FY - 420], [FX + 620, FY - 420], [FX - 620, FY + 420], [FX + 620, FY + 420]]),
      // Pillars inside to dodge behind.
      ...each('boulder', [[FX - 200, FY - 60], [FX + 220, FY + 100]]),
      // Outside: cover on the approach.
      ...each('scrub', [[900, 1400], [2000, 1400], [700, 1100], [2200, 1100], [1440, 1500]]),
      ...each('cactus', [[300, 300], [2600, 300], [300, 1400], [2600, 1450], [1000, 1550]]),
      { kind: 'sandbags', x: 1100, y: 1250 }, { kind: 'sandbags', x: 1800, y: 1250 }, { kind: 'duneV', x: 650, y: 1250 }, { kind: 'duneV', x: 2250, y: 1250 },
    ],
    points: { gateL: { x: FX - 220, y: FY + 540 }, gateR: { x: FX + 220, y: FY + 540 }, rimW: { x: FX - 620, y: FY + 540 }, rimE: { x: FX + 620, y: FY + 540 }, stormN: { x: 700, y: 60 }, stormE: { x: 2800, y: 400 } },
    roads: {
      outside: [{ x: 300, y: 1250 }, { x: 300, y: 300 }, { x: 2600, y: 300 }, { x: 2600, y: 1250 }, { x: 300, y: 1250 }],
      ring: [{ x: FX - 330, y: FY - 230 }, { x: FX + 330, y: FY - 230 }, { x: FX + 330, y: FY + 230 }, { x: FX - 330, y: FY + 230 }],
    },
  },
  start: at(1.5, 2.85), startHeading: -Math.PI / 2,
  weather: { kind: 'sandstorm', first: 70, every: 80, last: 14 },
  enemies: [
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'stormE', when: 73, hpMult: 0.42 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'stormN', when: 76, hpMult: 0.42 },
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'stormE', when: 80, hpMult: 0.42 },
  ],
  crates: [{ at: at(1.2, 2.6), content: { family: 'mortar', mk: 2 } }, { at: at(1.8, 2.6), content: 'kit' }, { at: at(0.4, 2.2) }, { at: at(2.6, 2.2) }, { at: at(0.3, 0.5), content: 'kit' }, { at: at(1.0, 1.9), content: 'kit' }, { at: at(2.0, 1.9), content: 'kit' }],
  objective: {
    kind: 'fortress',
    boss: {
      name: 'Sand Crawler', hp: 1300, speed: 22, road: 'ring', body: 'sandCrawler', clan: 'crows', radius: 88, armour: 14,
      turrets: [
        { gun: 'mortar', dx: -40, dy: -40, hp: 130 }, { gun: 'mortar', dx: -40, dy: 40, hp: 150 },
        { gun: 'cannon', dx: 30, dy: -42, hp: 130 }, { gun: 'cannon', dx: 30, dy: 42, hp: 130 },
        { gun: 'machinegun', dx: 70, dy: 0, hp: 140 },
      ],
    },
  },
  bonus: [{ kind: 'noKit' }, { kind: 'time', under: 240 }],
  loot: LOOT_DESERT,
};
