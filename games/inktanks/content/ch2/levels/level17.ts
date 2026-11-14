import type { LevelDef } from '../../../src/logic/level/types';
import { at, blob, each, LOOT_DESERT, path, row, TANK } from './kit';

/**
 * Level 17, Rook's Mesa (Ace): Rook, a Crow ace with a Mk III Mortar, holds a
 * cliff-ringed mesa at the east end of 4 × 2 screens of sand. Her shells reach
 * 520 px, so the open flats are hers; but a mortar can't fire at anything
 * closer than 200 px. The ring's west side is open and the approach is cut into
 * three cover lanes by dune crests (they block sight, not shots) and scrub:
 * north, middle and south. Crow guards on the flats spot for her. Close the
 * distance behind the crests and finish her under the minimum range. A Mortar
 * of ours lies by the old pump for lobbing back.
 */
const RX = 3120;
const RY = 540;

export const LEVEL_17: LevelDef = {
  id: 'ch2-17', number: 17, name: 'Rook’s Mesa', type: 'ace',
  briefing: 'Rook, the Crows’ ace, sits on a mesa with a Mk III Mortar and shells everything that crosses the flats. A mortar cannot hit what is too close: get under her minimum range. Dune crests and scrub make three lanes up to the mesa. Her spotters give you away, so deal with them or keep the crests between you. Destroy Rook: an ace carries rare tech.',
  teaches: 'Getting under a mortar’s minimum range: close the distance through cover',
  map: {
    cols: 4, rows: 2, base: 'sand',
    terrain: [
      path('sandTrackH', [at(0.15, 1.5), at(1.0, 1.4), at(2.0, 1.1), at(2.7, 0.95), at(3.2, 0.9)], 80),
      blob('canyonRock', 900, 300, 220), blob('canyonRock', 1900, 900, 200), blob('packedSand', RX, RY, 260), blob('canyonRock', 2400, 250, 180),
    ],
    structures: [
      // The mesa: a ring of cliff, open on the west (the way up) and with a notch in the south wall.
      ...row('mesaWall', RX - 120, RY - 220, 6, 60), ...row('mesaWall', RX - 120, RY + 220, 3, 60), ...row('mesaWall', RX + 140, RY + 220, 2, 60),
      ...row('mesaWallV', RX + 280, RY - 190, 7, 0, 60),
      ...row('mesaWallV', RX - 130, RY - 190, 2, 0, 60), ...row('mesaWallV', RX - 130, RY + 130, 2, 0, 60),
      ...each('mesaRock', [[RX + 120, RY - 120], [RX + 190, RY + 100]]),
      // Three lanes: dune crests across the flats cut sight lines (the north lane has scrub, the south crests).
      { kind: 'duneV', x: 2150, y: 780 }, { kind: 'duneV', x: 2450, y: 330 }, { kind: 'duneV', x: 2620, y: 760 }, { kind: 'duneV', x: 2420, y: 560 },
      { kind: 'dune', x: 2760, y: 940 }, { kind: 'dune', x: 2820, y: 150 }, { kind: 'dune', x: 2340, y: 980 },
      ...each('scrub', [[2000, 330], [2200, 250], [2380, 160], [2600, 200], [2760, 300], [2850, 420], [2700, 640], [2900, 830], [2570, 900], [2200, 640]]),
      // Sandbags the guards fight from, and ours at the start.
      { kind: 'sandbags', x: 2250, y: 460 }, { kind: 'sandbags', x: 2300, y: 840 }, { kind: 'sandbagsV', x: 1500, y: 700 }, { kind: 'sandbags', x: 1450, y: 300 },
      { kind: 'oilDerrick', x: 1100, y: 640 }, { kind: 'oilTank', x: 1180, y: 740 },
      ...each('cactus', [[300, 300], [600, 900], [1300, 960], [1700, 150], [1800, 600], [3500, 200], [3500, 950]]),
      ...each('boulder', [[500, 600], [1700, 960], [3450, 500], [2050, 150]]),
      { kind: 'adobeHut', x: 400, y: 1000 }, { kind: 'adobeHouse', x: 3600, y: 800 },
    ],
    points: {
      rook: { x: RX, y: RY }, spotN: { x: 2350, y: 420 }, spotS: { x: 2400, y: 880 }, spotM: { x: 2700, y: 560 }, derrick: { x: 1180, y: 660 }, pump: { x: 1650, y: 620 },
    },
    roads: {},
  },
  start: at(0.2, 1.5), startHeading: 0,
  enemies: [
    { role: 'guard', clan: 'crows', tank: 'mortar3/medium2/halftracks1', at: 'rook', leash: 140, name: 'Rook', ace: true, hpMult: 1.2, sight: 520 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'spotN', hpMult: 0.6, sight: 380, leash: 260 },
    { role: 'guard', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: 'spotS', hpMult: 0.6, sight: 380, leash: 260 },
    { role: 'guard', clan: 'crows', tank: TANK.gunner, at: 'spotM', hpMult: 0.6, sight: 380, leash: 260 },
    { role: 'guard', clan: 'crows', tank: 'machinegun1/light1/wheels2', at: 'derrick', hpMult: 0.5, sight: 380, leash: 260 },
  ],
  crates: [
    { at: 'pump', content: { family: 'mortar', mk: 1 } },
    { at: { x: 800, y: 300 }, content: 'kit' }, { at: { x: 2000, y: 960 }, content: 'kit' },
    { at: { x: 2200, y: 150 } }, { at: { x: 3500, y: 880 } }, { at: { x: 1400, y: 960 } },
  ],
  objective: { kind: 'ace' },
  bonus: [{ kind: 'intel', n: 62 }, { kind: 'time', under: 135 }],
  loot: LOOT_DESERT,
};
