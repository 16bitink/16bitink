import type { LevelDef } from '../../../src/logic/level/types';
import type { Pt } from '../../../src/logic/vec';
import { blob, each, LOOT_SWAMP, patch, path, reedBed, row, TANK } from './kit';

/**
 * Level 29, Last Lock (Ambush, enemy `vessel: 'barge'`): a Weasel barge
 * convoy sails the river west to east for the lock at the far end, 4 × 2
 * screens. Sink every barge before it passes the lock. The river is deep
 * water (you drive the south bank; you can't cross it), so you pick where
 * to hit them from: the open reach, the bend by the reeds, or the stone
 * bank at the lock. They don't wait. The armed barge rides last and shoots
 * back; the north bank's guns shell the south bank across the water, a
 * Flamer lies in the reeds at the bend, and skimmers come down the river
 * when the alarm goes. The lock is at the east end: the river widens into a
 * basin and leaves north through a cement-walled channel, closed by the
 * lock's gates (`lockGate`: stone and iron, indestructible, solid). A barge
 * that reaches the gates is in the lock and gone. A gun on each side.
 */
const RIVER: readonly Pt[] = [{ x: 0, y: 520 }, { x: 600, y: 500 }, { x: 1300, y: 600 }, { x: 2000, y: 520 }, { x: 2700, y: 560 }, { x: 3300, y: 540 }, { x: 3500, y: 540 }];
/** The lock: the gates across the channel north out of the basin (the art's gate spans 136 px east–west). */
const LOCK = { x: 3570, gateY: 250, basin: { x: 3440, y: 420, h: 240 }, channel: { x: 3510, w: 120 } } as const;
const ROUTE: readonly Pt[] = [{ x: 60, y: 520 }, { x: 600, y: 500 }, { x: 1300, y: 600 }, { x: 2000, y: 520 }, { x: 2700, y: 560 }, { x: 3300, y: 540 }, { x: LOCK.x, y: 540 }, { x: LOCK.x, y: LOCK.gateY + 70 }];
const BANK: readonly Pt[] = [{ x: 150, y: 860 }, { x: 800, y: 840 }, { x: 1500, y: 900 }, { x: 2200, y: 830 }, { x: 2900, y: 880 }, { x: 3500, y: 840 }];

export const LEVEL_29: LevelDef = {
  id: 'ch3-29', number: 29, name: 'Last Lock', type: 'ambush',
  briefing: 'The Weasels are floating their supply barges downriver to the last lock. Once they pass it, they are gone. Sink every barge before it does. They will not wait for you, and you cannot cross the river: pick your spot on the south bank and hit them as they come. The last barge is armed. Guns on the far bank will shell you across the water, and a Flamer hides in the reeds at the bend.',
  teaches: 'Intercept moving targets on water; pick a spot on the bank; timing',
  map: {
    cols: 4, rows: 2, base: 'marsh',
    terrain: [
      path('dirt', BANK, 80), blob('shallows', 1100, 880, 150), blob('shallows', 2600, 940, 140), blob('mud', 1800, 260, 160),
      path('swampWater', RIVER, 240), blob('dirt', 3500, 860, 180),
      // The lock basin (to the map's east edge) and the channel north out of it.
      patch('swampWater', LOCK.basin.x, LOCK.basin.y, 3840 - LOCK.basin.x, LOCK.basin.h), patch('swampWater', LOCK.channel.x, 0, LOCK.channel.w, LOCK.basin.y + 10),
    ],
    structures: [
      // South bank: reeds at the bend (a Flamer's hide), sandbag posts, a fish rack.
      ...reedBed(1350, 780, 5), ...reedBed(500, 760, 3), ...reedBed(2300, 760, 4),
      { kind: 'sandbags', x: 1000, y: 780 }, { kind: 'sandbags', x: 2650, y: 780 }, { kind: 'fishRack', x: 300, y: 740 }, { kind: 'jetty', x: 2000, y: 700 },
      // North bank: stilt huts and reeds; guns shoot across.
      { kind: 'stiltHutLarge', x: 1700, y: 260 }, ...each('stiltHutSmall', [[1500, 330], [2300, 300], [900, 300]]),
      ...reedBed(700, 330, 4), ...reedBed(2900, 320, 4), { kind: 'sandbags', x: 1900, y: 380 }, { kind: 'sandbags', x: 1200, y: 380 },
      // The lock: cement walls along the basin's south bank and both sides of the channel, and the gates across it.
      ...row('cementWall', 3500, 690, 5, 63), ...row('cementWallV', LOCK.channel.x - 22, 120, 4, 0, 63), ...row('cementWallV', LOCK.channel.x + LOCK.channel.w + 22, 120, 4, 0, 63),
      { kind: 'lockGate', x: LOCK.x, y: LOCK.gateY, id: 'lockGate' },
      ...each('cypress', [[200, 980], [800, 1020], [1700, 1030], [2500, 1020], [3100, 1000], [400, 140], [1300, 140], [2600, 140], [3300, 200]]),
      ...each('deadTree', [[1100, 1000], [2000, 990], [2900, 760], [600, 960]]),
      ...each('mooringPost', [[1980, 640], [2040, 640], [3440, 420], [3440, 670]]),
    ],
    points: {
      flamerS: { x: 1350, y: 780 }, gunN: { x: 1500, y: 330 }, gunN2: { x: 2300, y: 340 }, mortarN: { x: 1700, y: 200 },
      lockN: { x: 3760, y: 330 }, lockS: { x: 3560, y: 760 }, riverW: { x: 150, y: 540 }, riverE: { x: 3700, y: 540 },
      b1: { x: 700, y: 505 }, b2: { x: 520, y: 500 }, b3: { x: 360, y: 510 }, b4: { x: 200, y: 515 }, b5: { x: 80, y: 520 },
    },
    roads: { river: ROUTE },
  },
  start: { x: 1100, y: 940 }, startHeading: 0,
  enemies: [
    // The convoy: four unarmed barges and an armed one at the back.
    { role: 'convoy', clan: 'weasels', tank: TANK.gunner, at: 'b1', route: 'river', truck: true, vessel: 'barge', hpMult: 0.6, speedMult: 0.2 },
    { role: 'convoy', clan: 'weasels', tank: TANK.gunner, at: 'b2', route: 'river', truck: true, vessel: 'barge', hpMult: 0.6, speedMult: 0.2 },
    { role: 'convoy', clan: 'weasels', tank: TANK.gunner, at: 'b3', route: 'river', truck: true, vessel: 'barge', hpMult: 0.6, speedMult: 0.2 },
    { role: 'convoy', clan: 'weasels', tank: TANK.gunner, at: 'b4', route: 'river', truck: true, vessel: 'barge', hpMult: 0.6, speedMult: 0.2 },
    { role: 'convoy', clan: 'weasels', tank: TANK.gunner2, at: 'b5', route: 'river', vessel: 'barge', hpMult: 0.7, speedMult: 0.2 },
    // Far bank, shelling across the river.
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gunN', hpMult: 0.6, sight: 440, leash: 120 },
    { role: 'guard', clan: 'weasels', tank: 'machinegun2/light1/halftracks1', at: 'gunN2', hpMult: 0.7, sight: 440, leash: 120 },
    { role: 'turret', clan: 'weasels', tank: TANK.mortar, at: 'mortarN', hpMult: 0.5, sight: 480 },
    // South bank: a Flamer in the reeds at the bend.
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flamerS', hpMult: 0.6, sight: 260, leash: 260 },
    // The lock's guards.
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'lockN', hpMult: 0.6, sight: 420, leash: 100 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'lockS', hpMult: 0.6, sight: 420, leash: 200 },
    // Skimmers come for you when the alarm goes.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'riverE', when: 'alarm', hpMult: 0.7 },
  ],
  crates: [{ at: { x: 700, y: 940 }, content: 'kit' }, { at: { x: 1800, y: 960 } }, { at: { x: 2500, y: 900 }, content: 'kit' }, { at: { x: 3300, y: 960 } }],
  objective: { kind: 'ambush' },
  bonus: [{ kind: 'kills', n: 5 }, { kind: 'time', under: 120 }],
  loot: LOOT_SWAMP,
};
