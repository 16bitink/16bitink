import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_DESERT, path, row, TANK } from './kit';

/**
 * Level 19, Crow Prison (Rescue): three Ink scouts sit in cages inside the
 * Crows' adobe prison compound, 4 × 2 screens of desert. Freed scouts follow
 * you in a line and can be hit; our pick-up truck waits at the start. The
 * twist is the alarm: post guards stand more than 420 px apart, so a quiet
 * approach (scrub, dune crests, the storm-free flank) lets you pick them off
 * one at a time. The first alarm brings a wave from the east road, and a
 * second from the north, and the freed scouts must still be driven home.
 */
const PX = 2900;
const PY = 540;

export const LEVEL_19: LevelDef = {
  id: 'ch2-19', number: 19, name: 'Crow Prison', type: 'rescue',
  briefing: 'The Crows keep three Ink scouts in cages inside their prison compound. Break the cages and bring the scouts back to our truck; they follow you, and they can be hit. The guards stand apart: take them one at a time and keep quiet. If the alarm goes up, the Crows send tanks from the east and north.',
  teaches: 'Stealth against the alarm; followers under fire',
  map: {
    cols: 4, rows: 2, base: 'sand',
    terrain: [path('sandTrackH', [at(0.3, 1.5), at(1.0, 1.4), at(1.8, 1.0), at(2.5, 0.9), at(3.0, 0.5)], 80), blob('packedSand', 1300, 300, 220), blob('packedSand', 2100, 860, 240), blob('packedSand', PX, PY, 330), blob('packedSand', 600, 700, 200)],
    structures: [
      // The prison: adobe walls, gate open to the west, a yard of three cages.
      ...row('adobeWall', PX - 220, PY - 230, 7, 60), ...row('adobeWall', PX - 220, PY + 230, 7, 60),
      ...row('adobeWallV', PX + 200, PY - 200, 7, 0, 60),
      ...row('adobeWallV', PX - 220, PY - 200, 2, 0, 60), ...row('adobeWallV', PX - 220, PY + 140, 1, 0, 60),
      { kind: 'cage', x: PX - 20, y: PY - 110, tag: 'cage' }, { kind: 'cage', x: PX + 80, y: PY + 40, tag: 'cage' }, { kind: 'cage', x: PX - 60, y: PY + 130, tag: 'cage' },
      { kind: 'oilTank', x: PX + 130, y: PY + 170 },
      // Stealth cover and dune crests that hide the approach.
      { kind: 'duneV', x: 1500, y: 700 }, { kind: 'duneV', x: 2150, y: 380 }, { kind: 'dune', x: 2500, y: 980 },
      ...each('scrub', [[1250, 420], [1600, 300], [1900, 800], [2300, 600], [2550, 760], [2700, 300], [2750, 880], [1000, 900]]),
      { kind: 'sandbags', x: 2050, y: 620 }, { kind: 'sandbags', x: 2500, y: 760 }, { kind: 'sandbagsV', x: 1800, y: 880 },
      ...each('cactus', [[500, 400], [800, 1000], [1400, 1020], [2400, 140], [3300, 200], [3300, 960], [2000, 140]]),
      ...each('boulder', [[900, 300], [1700, 560], [2350, 960], [3400, 540]]), { kind: 'adobeHouse', x: 3500, y: 900 }, { kind: 'oilDerrick', x: 1900, y: 220 },
      { kind: 'tent', x: PX - 60, y: PY - 320 }, { kind: 'tent', x: PX + 40, y: PY + 330 },
    ],
    points: { home: at(0.3, 1.55), yard: { x: PX - 60, y: PY + 10 }, gateW: { x: PX - 380, y: PY }, postN: { x: 2250, y: 250 }, postS: { x: 2400, y: 880 }, postMid: { x: 1750, y: 600 }, tower: { x: PX + 130, y: PY - 110 }, east: { x: 3800, y: 540 }, north: { x: 2800, y: 40 } },
    roads: { beat: [{ x: 1500, y: 950 }, { x: 2000, y: 960 }, { x: 2300, y: 780 }, { x: 1900, y: 700 }] },
  },
  start: at(0.45, 1.65), startHeading: -0.2,
  enemies: [
    // Post guards, over 420 px apart: one at a time is possible.
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'postMid', hpMult: 0.42, sight: 280 },
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'postN', hpMult: 0.42, sight: 280 },
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'postS', hpMult: 0.42, sight: 280 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'gateW', hpMult: 0.38, sight: 280 },
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: 'tower', hpMult: 0.25, sight: 300 },
    { role: 'patrol', clan: 'crows', tank: TANK.scout, at: { x: 1500, y: 950 }, route: 'beat', hpMult: 0.33 },
    // The alarm brings waves.
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'east', when: 'alarm', hpMult: 0.38 },
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'north', when: 'alarm', hpMult: 0.33 },
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'east', when: 'stage', hpMult: 0.33 },
  ],
  crates: [{ at: { x: 1300, y: 300 }, content: 'kit' }, { at: { x: 2100, y: 880 }, content: 'kit' }, { at: { x: 700, y: 700 } }, { at: { x: 1600, y: 180 } }, { at: { x: 2750, y: 300 } }],
  objective: { kind: 'rescue', tag: 'cage', home: 'home', crewHp: 240 },
  bonus: [{ kind: 'noAlarm' }, { kind: 'kills', n: 5 }],
  loot: LOOT_DESERT,
};
