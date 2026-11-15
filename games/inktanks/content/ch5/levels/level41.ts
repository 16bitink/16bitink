import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, grove, LOOT_FOREST, path, TANK, thicket } from './kit';

/**
 * Level 41, Into the Pines (Assault): clear the Iron Hive's logging camp at the
 * forest's edge, 3 × 2 screens of old forest. The old trees' canopies block
 * sight and shots (a shell aimed through one hits the tree), so the forest is a
 * maze of short sight lines; the trail is the fast lane (the forest floor
 * slows Wheels and Half-tracks), and young thickets close the gaps to all but
 * Tracks and Heavies. The camp sits in a logged clearing: a sawmill, log piles,
 * stumps and a watchtower. Two Hive Rail guns guard it from the trees beyond:
 * a Rail's slug goes through trees and walls, so cover doesn't save you from
 * one. Its charge line is the warning: get off the line. A Rail lies in a
 * crate by the old woodcutter's hut, for a player who wants to shoot back
 * through the trees.
 */
const TRAIL = [at(0, 1.42), at(0.6, 1.4), at(1.1, 1.3), at(1.55, 1.12), at(1.95, 0.98), at(2.3, 0.9), at(3, 0.55)];
const SIDE = [at(1.1, 1.3), at(1.25, 1.7), at(1.9, 1.85)];
const MAP = { w: 2880, h: 1080 } as const;
/** The logging camp's clearing. */
const CAMP = { x: 2080, y: 560, r: 330 } as const;
/** Keep the trees off the trails and the clearing (x, y, radius). */
const OPEN: readonly (readonly [number, number, number])[] = [
  ...TRAIL.map((p) => [p.x, p.y, 90] as const), ...SIDE.map((p) => [p.x, p.y, 80] as const),
  [CAMP.x, CAMP.y, CAMP.r + 30], [380, 900, 200], [900, 520, 110], [1250, 960, 90],
];

export const LEVEL_41: LevelDef = {
  id: 'ch5-41', number: 41, name: 'Into the Pines', type: 'assault',
  briefing: 'Deepwood. The Iron Hive, the clans’ old masters, is logging the old forest bare, and its camp is at the forest’s edge. Clear it. The old trees block sight and shots: a shell into a trunk’s branches is wasted, so find a line between them. The trail is fast; the forest floor slows you, and young thickets only let Tracks and Heavies through. The Hive has Rail guns: their slug goes through trees and walls, so when you see a Rail’s charge line, get off it.',
  teaches: 'Trees block sight and shots; the Rail shoots through them (its charge line is the warning); trails are fast lanes; thickets',
  map: {
    cols: 3, rows: 2, base: 'forestFloor',
    terrain: [
      path('forestTrailH', TRAIL, 70), path('forestTrail', SIDE, 60),
      blob('clearing', CAMP.x, CAMP.y, CAMP.r), blob('clearing', 380, 900, 170), blob('clearing', 900, 520, 90),
    ],
    structures: [
      // The old forest: groves north and south of the trail, round the camp, and beyond it.
      ...grove(500, 330, 380, 22, OPEN, MAP), ...grove(1250, 420, 360, 20, OPEN, MAP), ...grove(700, 1000, 300, 10, OPEN, MAP),
      ...grove(1700, 1000, 320, 12, OPEN, MAP), ...grove(2550, 300, 330, 14, OPEN, MAP), ...grove(2600, 900, 300, 12, OPEN, MAP), ...grove(1750, 200, 260, 10, OPEN, MAP),
      // Young thickets: gaps only Tracks and Heavies take.
      ...thicket(1500, 620, 9, MAP), ...thicket(1480, 960, 6, MAP), ...thicket(2400, 640, 7, MAP),
      // Undergrowth to hide in.
      ...each('undergrowth', [[1100, 560], [840, 860], [1640, 760], [1900, 900], [2330, 330], [600, 620]]),
      // The camp: the iron sawmill, log piles, stumps, the watchtower.
      { kind: 'sawmill', x: 2180, y: 470 }, ...each('logPile', [[1960, 420], [2000, 700], [2260, 650]]),
      ...each('stump', [[1880, 560], [2100, 360], [2300, 520], [1960, 820], [2200, 780]]), { kind: 'hiveTower', x: 2320, y: 760 },
      // The old woodcutter's hut by the trailhead.
      { kind: 'cabinSmall', x: 360, y: 980 }, ...each('stump', [[300, 860], [480, 840]]),
    ],
    points: {
      camp: { x: CAMP.x - 60, y: CAMP.y + 40 }, mill: { x: 2160, y: 590 }, piles: { x: 1960, y: 640 },
      railN: { x: 1950, y: 260 }, railS: { x: 2450, y: 860 }, thicket: { x: 1100, y: 600 }, glade: { x: 900, y: 520 },
      east: { x: 2860, y: 300 }, south: { x: 1900, y: 1060 },
    },
    roads: { trail: [at(0.75, 1.38), at(1.1, 1.3), at(1.55, 1.12)], side: SIDE },
  },
  start: at(0.12, 1.42), startHeading: 0,
  enemies: [
    // The forest: a drone in the undergrowth, a gunner up and down the trail.
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'thicket', hpMult: 0.37, sight: 360 },
    { role: 'patrol', clan: 'hive', tank: TANK.gunner, at: at(0.75, 1.38), route: 'trail', hpMult: 0.3 },
    { role: 'patrol', clan: 'hive', tank: TANK.drone, at: SIDE[0]!, route: 'side', hpMult: 0.37 },
    // The camp.
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: 'camp', hpMult: 0.3, leash: 300 },
    { role: 'guard', clan: 'hive', tank: TANK.heavy, at: 'mill', hpMult: 0.19, leash: 260 },
    { role: 'guard', clan: 'hive', tank: TANK.logger, at: 'piles', hpMult: 0.3, leash: 260 },
    // The Rails in the trees beyond: they shoot through the forest.
    { role: 'guard', clan: 'hive', tank: TANK.rail, at: 'railN', hpMult: 0.34, sight: 420, leash: 200 },
    { role: 'guard', clan: 'hive', tank: TANK.rail, at: 'railS', hpMult: 0.34, sight: 420, leash: 200 },
    // The alarm brings drones from the east.
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'east', when: 'alarm', hpMult: 0.37 },
  ],
  crates: [{ at: { x: 470, y: 960 }, content: { family: 'rail', mk: 3 } }, { at: { x: 900, y: 470 }, content: 'kit' }, { at: { x: 1640, y: 880 } }, { at: { x: 2480, y: 520 } }],
  objective: { kind: 'assault' },
  bonus: [{ kind: 'time', under: 125 }, { kind: 'kills', n: 9 }],
  loot: LOOT_FOREST,
};
