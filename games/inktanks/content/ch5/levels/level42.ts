import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, depot, each, grove, LOOT_FOREST, path, TANK, thicket } from './kit';

/**
 * Level 42, Wildfire (Breakout): a lightning fire is running through the old
 * forest and the Hive has cut the trail; get out to our forest outpost before
 * it closes the way, 4 × 2 screens. The fire starts behind the start and
 * runs tree to tree (about 50 px/s), and two more blazes catch ahead, north and
 * south of the trail, so the way east is only open for a while. A burning tree
 * hurts anything under its canopy, and a trail is the fast lane (the forest
 * floor slows Wheels and Half-tracks). The Hive's gunners and a Rail hold the
 * trail; they have to run too, and bots go round a blaze. The trail ends in our
 * cement outpost, whose gun towers cover the landing.
 */
const TRAIL = [at(0.12, 1.2), at(0.6, 1.5), at(1.0, 1.0), at(1.4, 0.35), at(1.9, 0.5), at(2.1, 1.0), at(2.5, 1.65), at(2.95, 1.3), at(3.3, 1.0), at(3.55, 1.0)];
const FORT = depot(3420, 540, 320, 260, ['cannon', 'machinegun']);
/** Keep the trees off the trail and the clearings (x, y, radius). */
const OPEN: readonly (readonly [number, number, number])[] = [
  ...TRAIL.map((p) => [p.x, p.y, 46] as const), ...TRAIL.slice(1).map((p, i) => [(p.x + TRAIL[i]!.x) / 2, (p.y + TRAIL[i]!.y) / 2, 46] as const),
  [3560, 540, 250], [240, 650, 100],
];

export const LEVEL_42: LevelDef = {
  id: 'ch5-42', number: 42, name: 'Wildfire', type: 'breakout',
  briefing: 'Deepwood is burning. Lightning lit the old forest behind you and the Hive has cut the trail east; our outpost is at the far end of it. Get there before the fire closes the way. Fire runs from tree to tree, and more will catch ahead of you: a burning tree hurts anything under its branches, so keep to the trail and keep moving. The forest floor is slow and the trail is fast. The Hive has to run too, but its gunners and a Rail hold the trail, and their slug goes through trees.',
  teaches: 'Racing a spreading fire; trails are fast lanes; burning trees hurt; the Rail through the trees',
  map: {
    cols: 4, rows: 2, base: 'forestFloor',
    terrain: [path('forestTrailH', TRAIL, 70), blob('clearing', 3560, 540, 240), blob('clearing', 240, 650, 90), blob('clearing', 1500, 640, 90)],
    structures: [
      // The old forest, close to the trail on both sides so a fire beside it can burn you.
      ...grove(500, 330, 420, 65, OPEN), ...grove(500, 900, 380, 38, OPEN), ...grove(1300, 330, 430, 68, OPEN), ...grove(1500, 940, 380, 46, OPEN),
      ...grove(2300, 300, 420, 65, OPEN), ...grove(2300, 940, 400, 57, OPEN), ...grove(3100, 280, 380, 53, OPEN), ...grove(3100, 900, 380, 53, OPEN),
      ...thicket(900, 780, 8), ...thicket(2000, 640, 7), ...thicket(2800, 640, 7),
      // Undergrowth beside the trail: it burns like reeds and hides a drone.
      ...each('undergrowth', [[700, 520], [1100, 720], [1700, 900], [2200, 800], [2600, 620], [3000, 740]]),
      ...each('stump', [[1320, 760], [2080, 880], [2700, 840]]),
      ...FORT.structures, { kind: 'crate', x: 3680, y: 460 },
    ],
    points: {
      exit: { x: 3600, y: 540 }, fire0: { x: 260, y: 520 }, fireN: { x: 1500, y: 250 }, fireS: { x: 2450, y: 960 },
      railNest: { x: 2300, y: 250 }, east: { x: 3800, y: 120 },
    },
    roads: { trail2: [TRAIL[5]!, TRAIL[6]!, TRAIL[7]!] },
  },
  start: at(0.2, 1.2), startHeading: 0,
  fire: { start: ['fire0', 'fireN', 'fireS'], at: 0, every: 1.5, spread: 170, burn: 24, damage: 29, text: 'The forest is on fire! Get out along the trail.' },
  enemies: [
    // The Hive's gunners hold the trail's bends: they have to be got past, or through.
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: { x: TRAIL[2]!.x + 150, y: TRAIL[2]!.y }, hpMult: 0.5, sight: 440, leash: 300 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: { x: TRAIL[3]!.x + 120, y: TRAIL[3]!.y }, hpMult: 0.4, sight: 440, leash: 300 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner, at: { x: TRAIL[6]!.x - 40, y: TRAIL[6]!.y }, hpMult: 0.4, sight: 440, leash: 300 },
    { role: 'guard', clan: 'hive', tank: TANK.heavy, at: { x: TRAIL[7]!.x + 120, y: TRAIL[7]!.y }, hpMult: 0.25, sight: 440, leash: 300 },
    { role: 'patrol', clan: 'hive', tank: TANK.drone, at: TRAIL[5]!, route: 'trail2', hpMult: 0.5 },
    { role: 'turret', clan: 'hive', tank: TANK.rail, at: 'railNest', hpMult: 0.35, sight: 420 },
  ],
  allies: FORT.allies,
  crates: [{ at: { x: 700, y: 640 }, content: 'kit' }, { at: { x: 1700, y: 760 } }, { at: { x: 2500, y: 520 }, content: 'kit' }, { at: { x: 3200, y: 820 } }],
  objective: { kind: 'breakout', exit: 'exit', radius: 120, to: 'our outpost' },
  bonus: [{ kind: 'time', under: 34 }, { kind: 'kills', n: 1 }],
  timeLimit: 150,
  loot: LOOT_FOREST,
};
