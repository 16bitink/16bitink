import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, grove, LOOT_FOREST, path, row, TANK, thicket } from './kit';

/**
 * Level 48, Hive Cells (Rescue): the Iron Hive keeps clan prisoners in cells
 * of log and iron at its camp in the east of 4 × 2 screens of old forest, and
 * the crews' truck waits at the start. Break each cell (shoot the cage: 60 HP)
 * to free the crew, and the clan's tank drives out of it and fights on your
 * side: a Boar Heavy (Tusk), a Weasel skimmer (Wisp) and a Crow Mortar
 * (Quill). They follow you, enemies shoot at them, and losing one doesn't end
 * the level, but the crews on foot do follow you to the truck and a crew
 * stays down while an enemy is near. Each cell is guarded differently and
 * the first alarm calls the Hive's drones, so use your new friends.
 */
const HOME = { x: 260, y: 880 };
const TRAIL = [HOME, at(0.9, 1.5), at(1.5, 1.2), at(2.1, 1.0), at(2.6, 0.8), at(3.0, 0.5)];
const OPEN: readonly (readonly [number, number, number])[] = [
  ...TRAIL.map((p) => [p.x, p.y, 95] as const), ...TRAIL.slice(1).map((p, i) => [(p.x + TRAIL[i]!.x) / 2, (p.y + TRAIL[i]!.y) / 2, 95] as const),
  [2900, 540, 420], [HOME.x, HOME.y, 150], [1300, 300, 110],
];

export const LEVEL_48: LevelDef = {
  id: 'ch5-48', number: 48, name: 'Hive Cells', type: 'rescue',
  briefing: 'The Iron Hive keeps clan prisoners in cells of log and iron in its camp deep in Deepwood. Shoot each cage open: the crew follows you home to our truck, and the clan’s tank drives out and fights at your side (the Boar Heavy, the Weasel skimmer, the Crow Mortar). They will follow you and take fire, but losing one does not end the mission. Crews stay down while an enemy is near, so clear the guards first. The first alarm brings the Hive’s drones.',
  teaches: 'Freeing prisoners; the clans join you; crews hide while enemies are near',
  map: {
    cols: 4, rows: 2, base: 'forestFloor',
    terrain: [
      path('forestTrailH', TRAIL, 80),
      blob('clearing', HOME.x, HOME.y, 140), blob('clearing', 2900, 540, 400), blob('clearing', 1300, 300, 90),
    ],
    structures: [
      // The old forest on the way.
      ...grove(500, 300, 380, 16, OPEN), ...grove(700, 1000, 300, 10, OPEN), ...grove(1500, 250, 360, 14, OPEN), ...grove(1500, 950, 360, 14, OPEN),
      ...grove(2200, 1000, 300, 10, OPEN), ...grove(2300, 220, 260, 8, OPEN), ...grove(3600, 200, 260, 8, OPEN), ...grove(3600, 900, 260, 8, OPEN),
      ...thicket(1000, 700, 7), ...thicket(1900, 700, 7),
      // The camp: a palisade of log piles round the cells, gaps at the west and south, towers at the corners.
      ...row('logPile', 2540, 250, 4, 120), ...row('logPile', 2540, 830, 3, 120), ...row('logPile', 3320, 250, 3, 120, 0), ...row('logPile', 3380, 650, 3, 0, 110),
      { kind: 'hiveTower', x: 2520, y: 250 }, { kind: 'hiveTower', x: 3320, y: 850 },
      // The cells: a cage in each, a sawmill and stumps between.
      { kind: 'cage', x: 2760, y: 330, id: 'cellA', tag: 'cage' }, { kind: 'cage', x: 2900, y: 760, id: 'cellB', tag: 'cage' }, { kind: 'cage', x: 3250, y: 470, id: 'cellC', tag: 'cage' },
      { kind: 'sawmill', x: 3050, y: 560 }, ...each('stump', [[2700, 560], [3140, 350], [3150, 740], [2750, 900]]),
      ...each('undergrowth', [[1300, 500], [1750, 450], [2200, 520], [2150, 820]]),
      { kind: 'crate', x: 300, y: 760 },
    ],
    points: {
      home: HOME, guardA: { x: 2650, y: 420 }, guardB: { x: 2800, y: 680 }, guardC: { x: 3150, y: 450 }, gate: { x: 2480, y: 560 },
      mill: { x: 3050, y: 600 }, railS: { x: 2550, y: 960 }, railNest: { x: 3600, y: 560 }, post: { x: 1750, y: 520 }, east: { x: 3800, y: 200 }, south: { x: 2800, y: 1060 },
    },
    roads: { beat: [{ x: 1500, y: 900 }, { x: 1900, y: 800 }, { x: 2200, y: 650 }, { x: 1800, y: 600 }] },
  },
  start: { x: 360, y: 840 }, startHeading: 0,
  mixedClans: true,
  friends: [
    { at: { x: 2760, y: 330 }, tank: TANK.boarHeavy, clan: 'boars', name: 'Tusk', join: 'cellA' },
    { at: { x: 2900, y: 760 }, tank: TANK.skimmer, clan: 'weasels', name: 'Wisp', join: 'cellB' },
    { at: { x: 3250, y: 470 }, tank: TANK.crowMortar, clan: 'crows', name: 'Quill', join: 'cellC' },
  ],
  enemies: [
    { role: 'guard', clan: 'hive', tank: TANK.drone, at: 'post', hpMult: 0.5, sight: 380, leash: 260 },
    { role: 'patrol', clan: 'hive', tank: TANK.gunner, at: { x: 1500, y: 900 }, route: 'beat', hpMult: 0.4 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner3, at: 'gate', hpMult: 0.45, sight: 400, leash: 220 },
    { role: 'guard', clan: 'hive', tank: TANK.gunner3, at: 'guardA', hpMult: 0.5, sight: 380, leash: 200 },
    { role: 'guard', clan: 'hive', tank: TANK.logger, at: 'guardB', hpMult: 0.45, sight: 380, leash: 200 },
    { role: 'guard', clan: 'hive', tank: TANK.heavy, at: 'guardC', hpMult: 0.3, sight: 380, leash: 220 },
    { role: 'turret', clan: 'hive', tank: TANK.rail, at: 'railNest', hpMult: 0.4, sight: 420 },
    { role: 'turret', clan: 'hive', tank: TANK.rail, at: 'railS', hpMult: 0.25, sight: 420 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner, at: 'east', when: 'alarm', hpMult: 0.5 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'east', when: 'alarm', hpMult: 0.5 },
    { role: 'wave', clan: 'hive', tank: TANK.gunner, at: 'south', when: 'stage', hpMult: 0.4 },
    { role: 'wave', clan: 'hive', tank: TANK.drone, at: 'east', when: 'stage', hpMult: 0.5 },
  ],
  crates: [{ at: { x: 400, y: 760 }, content: 'kit' }, { at: { x: 1300, y: 330 } }, { at: { x: 2200, y: 560 }, content: 'kit' }, { at: { x: 2900, y: 960 } }, { at: { x: 3700, y: 400 } }],
  objective: { kind: 'rescue', tag: 'cage', home: 'home' },
  bonus: [{ kind: 'time', under: 230 }, { kind: 'kills', n: 10 }],
  loot: LOOT_FOREST,
};
