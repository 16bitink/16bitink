import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, drifts, each, LOOT_SNOW, path, ridge, TANK } from './kit';

/**
 * Level 36, Ermine (Ace): Ermine, the Weasels' Laser ace, holds the Winter
 * Yard at the east end of 4 × 2 screens: a frozen yard of log cabins, ice
 * rocks, snowdrift banks and pines. Her Laser is an instant beam (no shell to
 * dodge) that stops at the first wall on its line, so the only defence is
 * cover: hop from cabin to rock to drift, and shoot when she turns. Her aim
 * line shows 0.4 s before each beam and it shows only where she can see. Pines
 * and drifts burn under the beam, stone and cabins' brick footings don't; a
 * ridge cuts the yard from the approach. A mixed escort spots for her: a
 * Crow gunner, a Boar gunner and a Weasel skimmer.
 */
const E = { x: 3050, y: 540 };
const ROAD = [at(0.2, 1.7), at(0.9, 1.55), at(1.6, 1.3), at(2.2, 1.0), at(2.8, 0.8)];

export const LEVEL_36: LevelDef = {
  id: 'ch4-36', number: 36, name: 'Ermine', type: 'ace',
  briefing: 'Ermine, the Weasels’ Laser ace, holds the Winter Yard. Her beam never misses for travel time: it is there the instant she fires, and a flat field is a death trap. A thin red line shows just before each shot. Fight her from cover: cabins, ice rocks and drifts stop the beam (pines and drifts will burn), so move from one to the next and shoot when she turns. Destroy Ermine: an ace carries rare tech.',
  teaches: 'Dodging an instant beam by cover; the aim line is the warning; beams scorch wood and snow',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', ROAD, 80),
      // The yard: frozen dirt with a pond of ice in front of the cabins.
      blob('frozenDirt', E.x, E.y, 520), blob('ice', 2500, 560, 150), blob('ice', 450, 380, 140),
    ],
    structures: [
      // A ridge cuts the approach from the yard, with a gap on the road and one on the south.
      ...ridge(2080, 220, 3, true), ...ridge(2080, 740, 2, true),
      // The yard: cabins to hide behind (they hold a beam; the beam can't pierce wood).
      { kind: 'cabinLarge', x: 2650, y: 360 }, { kind: 'cabinLarge', x: 2700, y: 760 }, { kind: 'cabinSmall', x: 3300, y: 300 }, { kind: 'cabinSmall', x: 3350, y: 800 },
      { kind: 'cabinSmall', x: 3050, y: 540 },
      // Ice rocks: stone, the beam can't scorch them.
      ...each('iceRockB', [[2450, 440], [2900, 600], [3150, 440], [3500, 540], [2500, 900], [3000, 180]]), ...each('iceRockC', [[2850, 300], [3250, 700], [2400, 700]]),
      // Drifts: low cover, but they burn.
      ...drifts(2800, 480, 2), ...drifts(3180, 600, 2), ...drifts(3450, 380, 2, true),
      ...each('snowPine', [[2350, 300], [2400, 1000], [3600, 150], [3650, 950], [2950, 980], [3800, 540], [3100, 100]]),
      // The approach: pines, firs, a rest cabin, rocks.
      ...each('snowPine', [[300, 300], [600, 1000], [1000, 400], [1300, 950], [1600, 250], [1800, 900], [900, 760]]),
      ...each('firSmall', [[700, 600], [1150, 700], [1500, 600], [1850, 380]]), { kind: 'cabinSmall', x: 1400, y: 450 },
      ...each('iceRockA', [[500, 700], [1700, 620], [1000, 1000]]),
      { kind: 'crate', x: 350, y: 620 },
    ],
    points: {
      start: { x: 220, y: 720 },
      ermine: E, escortC: { x: 2750, y: 560 }, escortB: { x: 3150, y: 330 }, escortS: { x: 2300, y: 860 }, post: { x: 1500, y: 520 },
      skimN: { x: 2900, y: 40 }, skimS: { x: 3000, y: 1050 },
    },
    roads: {},
  },
  start: 'start', startHeading: 0,
  mixedClans: true,
  enemies: [
    { role: 'guard', clan: 'weasels', tank: TANK.laser, at: 'ermine', leash: 350, sight: 520, name: 'Ermine', ace: true, hpMult: 1.2, kits: 0 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'escortC', hpMult: 0.4, sight: 420, leash: 200 },
    { role: 'guard', clan: 'boars', tank: TANK.boarGunner, at: 'escortB', hpMult: 0.4, sight: 420, leash: 200 },
  ],
  crates: [{ at: { x: 1000, y: 700 }, content: 'kit' }, { at: { x: 1800, y: 500 } }, { at: { x: 2450, y: 880 }, content: 'kit' }, { at: { x: 3500, y: 700 } }],
  objective: { kind: 'ace' },
  bonus: [{ kind: 'time', under: 55 }, { kind: 'kills', n: 2 }],
  timeLimit: 420,
  loot: LOOT_SNOW,
};
