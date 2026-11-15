import type { LevelDef } from '../../../src/logic/level/types';
import { blob, drifts, each, LOOT_SNOW, patch, path, ridge, TANK } from './kit';

/**
 * Level 33, Laser Lab (Raid): the clans' research lab sits in a wide white
 * snowfield, 4 × 2 screens. Destroy its three generators (any gun breaks
 * one, 400 HP). The twist is the Lasers: three Crow Laser tanks stand off
 * across the open snow with sight lines a thousand pixels long, and a Laser's
 * beam is instant, with only a 0.4 s aim line to warn you. There is no
 * fighting them in the open: you cross a field from cover to cover (cabins,
 * ice rocks, the lab itself, ridge ends) and break the aim line. One generator
 * stands in the open south yard, one in the lab's north yard behind a ridge
 * and one inside the lab's court. A Boar gunner and a Weasel skimmer guard the
 * lab itself, and the alarm sends a Heavy from the east. Laser crates lie in
 * the cabins: take one and turn the beam on them.
 */
const LAB = { x: 2500, y: 540 };

export const LEVEL_33: LevelDef = {
  id: 'ch4-33', number: 33, name: 'Laser Lab', type: 'raid',
  briefing: 'The clans have built a lab in the snowfield and powered it with three generators. Break all three. Three Crow Lasers watch the open ground: their beam is instant and it reaches far, with only a thin aim line to warn you. Do not cross a field in the open. Go from cabin to rock to wall, break the aim line, and strike when a Laser looks away. A Laser crate waits in the cabins: take it, and the beam is yours.',
  teaches: 'Laser sight lines across open snow; cover to cover; the Laser crate',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', [{ x: 120, y: 560 }, { x: 900, y: 600 }, { x: 1700, y: 560 }, { x: 2300, y: 540 }], 80),
      path('snowTrackH', [{ x: 1700, y: 560 }, { x: 2000, y: 900 }, { x: 2700, y: 920 }], 70),
      blob('frozenDirt', LAB.x, LAB.y, 340), blob('frozenDirt', 2700, 930, 150), blob('frozenDirt', 2400, 160, 150),
      patch('ice', 800, 780, 500, 240), patch('ice', 3000, 300, 400, 300),
    ],
    structures: [
      // The lab: a brick building with its court to the east, a ridge shielding the north yard.
      { kind: 'labBuilding', x: LAB.x, y: LAB.y }, { kind: 'generator', x: LAB.x + 190, y: LAB.y + 10, tag: 'target' },
      ...ridge(2200, 330, 3), { kind: 'ridgeCorner', x: 2150, y: 330 }, { kind: 'generator', x: 2400, y: 220, tag: 'target' },
      { kind: 'generator', x: 2700, y: 930, tag: 'target' }, ...drifts(2560, 840, 2), ...each('iceRockB', [[2820, 840], [2600, 1020]]),
      ...each('cementWall', [[LAB.x + 270, LAB.y - 70], [LAB.x + 270, LAB.y + 70]]),
      // Cover across the field, from the west: cabins, ice rocks and drifts the Lasers' lines break on.
      { kind: 'cabinLarge', x: 700, y: 400 }, { kind: 'cabinSmall', x: 600, y: 760 }, ...each('iceRockA', [[1000, 520], [1050, 900]]), ...drifts(1100, 640, 2),
      { kind: 'cabinSmall', x: 1450, y: 330 }, { kind: 'cabinLarge', x: 1500, y: 760 }, ...each('iceRockB', [[1650, 560], [1800, 200], [1850, 960]]), ...drifts(1750, 700, 2),
      { kind: 'cabinSmall', x: 2000, y: 600 }, { kind: 'signalBox', x: 2050, y: 820 }, ...each('iceRockC', [[2000, 460], [2150, 1000]]),
      // The east: the Lasers' hills.
      ...each('iceRockA', [[3000, 560], [3300, 300], [3300, 900]]), { kind: 'cabinLarge', x: 3150, y: 640 }, { kind: 'cabinSmall', x: 2900, y: 150 }, ...drifts(3050, 760, 2),
      ...each('snowPine', [[250, 300], [350, 840], [500, 1000], [400, 160], [1250, 150], [1300, 1000], [2300, 760], [2800, 500], [3550, 600], [3600, 160], [3700, 960], [3750, 400]]),
      ...each('firSmall', [[900, 300], [1250, 520], [1900, 400], [2450, 900], [3200, 460], [3500, 800]]),
      { kind: 'frozenFenceH', x: 350, y: 640 }, { kind: 'frozenFenceH', x: 414, y: 640 },
    ],
    points: {
      start: { x: 220, y: 560 },
      laserW: { x: 1550, y: 560 }, laserN: { x: 2750, y: 180 }, laserS: { x: 3050, y: 860 },
      labGuard: { x: 2500, y: 760 }, courtGuard: { x: 2950, y: 540 },
      waveE: { x: 3800, y: 540 }, waveN: { x: 1900, y: 30 }, waveSW: { x: 900, y: 1060 },
    },
    roads: { beat: [{ x: 2000, y: 720 }, { x: 2400, y: 900 }, { x: 2900, y: 820 }, { x: 2400, y: 760 }] },
  },
  start: 'start', startHeading: 0,
  mixedClans: true,
  enemies: [
    // The Lasers: long sight, a short leash (they hold their lane).
    { role: 'guard', clan: 'crows', tank: TANK.laser, at: 'laserW', hpMult: 0.31, sight: 520, leash: 140 },
    { role: 'guard', clan: 'crows', tank: TANK.laser, at: 'laserN', hpMult: 0.31, sight: 520, leash: 140 },
    { role: 'guard', clan: 'crows', tank: TANK.laser, at: 'laserS', hpMult: 0.31, sight: 520, leash: 140 },
    { role: 'guard', clan: 'boars', tank: TANK.boarGunner, at: 'labGuard', hpMult: 0.33, sight: 400, leash: 260 },
    { role: 'guard', clan: 'weasels', tank: TANK.skimmer, at: 'courtGuard', hpMult: 0.38, sight: 400, leash: 300 },
    { role: 'patrol', clan: 'crows', tank: TANK.scout, at: { x: 2000, y: 720 }, route: 'beat', hpMult: 0.38 },
    { role: 'wave', clan: 'boars', tank: TANK.boarHeavy, at: 'waveE', when: 'alarm', hpMult: 0.25 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'waveN', when: 'alarm', hpMult: 0.38 },
    { role: 'wave', clan: 'crows', tank: TANK.mortar, at: 'waveSW', when: 120, hpMult: 0.31 },
  ],
  crates: [
    { at: { x: 700, y: 480 }, content: { family: 'laser', mk: 4 } }, { at: { x: 1500, y: 840 }, content: 'kit' }, { at: { x: 2050, y: 680 }, content: { family: 'laser', mk: 4 } },
    { at: { x: 3150, y: 560 } }, { at: { x: 1450, y: 250 } },
  ],
  objective: { kind: 'raid', tag: 'target', label: 'Lab generators' },
  bonus: [{ kind: 'time', under: 180 }, { kind: 'kills', n: 9 }],
  loot: LOOT_SNOW,
};
