import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, camp, each, LOOT_DESERT, path, row, TANK } from './kit';

/**
 * Level 15, The Wells (Capture): three wells across the flats, each with a
 * flagpole. Raise our flag on all three at once. A well takes 6 s alone in its
 * ring; the Crows hold each one with a guard, then send raiders at whichever
 * flag is ours, so you juggle three poles and never sit on one. Dune crests and
 * scrub give the approaches; the middle well sits in a walled yard.
 */
const ROAD = [at(0.2, 1.0), at(0.9, 0.7), at(1.6, 1.3), at(2.3, 0.9), at(3.0, 0.7), at(3.6, 1.0)];

export const LEVEL_15: LevelDef = {
  id: 'ch2-15', number: 15, name: 'The Wells', type: 'capture',
  briefing: 'Three wells water the whole flats, and the Crows hold them. Raise our flag on all three at once. A flag runs up while you sit alone in its ring; the Crows will drive to retake any well that is ours, so don’t stay put. Find the flank where the guards can’t see you.',
  teaches: 'Capture rings, juggling three flagpoles, Crows retaking what you took',
  map: {
    cols: 4, rows: 2, base: 'sand',
    terrain: [path('sandTrackH', ROAD, 80), blob('packedSand', 900, 300, 200), blob('packedSand', 1900, 820, 220), blob('packedSand', 3000, 330, 200), blob('packedSand', 1900, 800, 140)],
    structures: [
      { kind: 'well', x: 900, y: 300 }, { kind: 'well', x: 1900, y: 820 }, { kind: 'well', x: 3000, y: 330 },
      // West well: derrick and scrub.
      { kind: 'oilDerrick', x: 780, y: 200 }, ...each('scrub', [[1040, 420], [700, 420], [1100, 220]]),
      // Middle well: a low walled yard, open west and east.
      ...row('adobeWall', 1730, 700, 4, 60), ...row('adobeWall', 1730, 960, 4, 60),
      { kind: 'adobeHut', x: 2120, y: 700 }, { kind: 'sandbagsV', x: 1650, y: 830 },
      // East well: camp and derrick.
      ...camp({ x: 3150, y: 560 }, 'w'), { kind: 'oilDerrick', x: 3100, y: 210 },
      // Dune crests that hide the approach and the raiders' flank.
      { kind: 'duneV', x: 1300, y: 420 }, { kind: 'duneV', x: 1400, y: 900 }, { kind: 'duneV', x: 2450, y: 480 }, { kind: 'dune', x: 2500, y: 1000 }, { kind: 'dune', x: 600, y: 800 },
      ...each('boulder', [[1500, 200], [2300, 200], [2800, 900], [400, 280], [2400, 760]]),
      ...each('cactus', [[300, 800], [1200, 700], [2200, 560], [3500, 300], [3500, 900], [2700, 640]]),
      ...each('scrub', [[1600, 560], [2650, 300], [2000, 400], [3300, 800]]),
      { kind: 'sandbags', x: 2150, y: 440 }, { kind: 'sandbags', x: 1000, y: 640 },
    ],
    points: {
      wellW: { x: 900, y: 300 }, wellM: { x: 1900, y: 820 }, wellE: { x: 3000, y: 330 },
      raidW: { x: 100, y: 120 }, raidN: { x: 1900, y: 40 }, raidS: { x: 2700, y: 1060 }, raidE: { x: 3780, y: 560 },
      postW: { x: 960, y: 380 }, postM: { x: 1980, y: 760 }, postE: { x: 3060, y: 400 },
    },
    roads: { flank: ROAD },
  },
  start: at(0.25, 1.4), startHeading: 0,
  enemies: [
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'postW', hpMult: 0.42, sight: 380, leash: 240 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'postM', hpMult: 0.42, sight: 380, leash: 240 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'postE', hpMult: 0.42, sight: 380, leash: 240 },
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: { x: 3250, y: 220 }, hpMult: 0.33, sight: 460 },
    // Raiders come for any well that is ours.
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'raidW', when: 55, hpMult: 0.42 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'raidN', when: 75, hpMult: 0.33 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'raidS', when: 95, hpMult: 0.33 },
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'raidE', when: 120, hpMult: 0.33 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'raidW', when: 'alarm', hpMult: 0.42 },
  ],
  crates: [{ at: { x: 600, y: 700 }, content: 'kit' }, { at: { x: 1500, y: 560 } }, { at: { x: 2500, y: 700 }, content: { family: 'mortar', mk: 2 } }, { at: { x: 2800, y: 150 } }, { at: { x: 3500, y: 700 }, content: 'kit' }],
  objective: { kind: 'capture', flags: ['wellW', 'wellM', 'wellE'], radius: 140, capture: 6, holdAll: 5 },
  bonus: [{ kind: 'time', under: 190 }, { kind: 'kills', n: 9 }],
  loot: LOOT_DESERT,
};
