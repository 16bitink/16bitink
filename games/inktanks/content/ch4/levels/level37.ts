import type { LevelDef } from '../../../src/logic/level/types';
import { at, avalanche, blob, drifts, each, LOOT_SNOW, path, ridge, TANK } from './kit';

/**
 * Level 37, Avalanche (Hold): hold the pass for 2 minutes, 3 × 2 screens of
 * snow. The mountain is on your side. Two ridge lines close the pass in the
 * middle of the map; the zone sits between them with a packed-snow track
 * through it and the cliffs either side (unbreakable: they block sight and
 * shots, so most of the fight comes down the two mouths, east and west). Above
 * each mouth a cornice hangs on the ridge lip: shoot it and the snow falls
 * across that mouth, burying whoever is under it (160 damage) and leaving a
 * bank of drifts that shuts the mouth until it is dug out. Waves come from
 * both sides in a rhythm: Weasel skimmers first, then Boar Heavies, then
 * Crow mortars on the ridge tops and a Laser by the east mouth. Nobody needs
 * the cornices to hold, but a player who times them buries a wave. Our gun
 * towers sit inside the zone and cover both mouths' ends.
 */
const ZX = 1440;
const ZY = 540;
/** The pass: ridge cliffs north and south of the zone. */
const PASS = { x0: 1060, north: 340, south: 740, n: 6 } as const;

export const LEVEL_37: LevelDef = {
  id: 'ch4-37', number: 37, name: 'Avalanche', type: 'hold',
  briefing: 'The clans want the pass, and we are going to hold it for 2 minutes. Cliffs close the pass on both sides; the enemy must come down its two mouths. Above each mouth a cornice of snow hangs on the ridge: shoot it down and the avalanche buries everyone beneath it and shuts the mouth with drifts. Time it when a wave is in the mouth. The clock only runs while you are in the ring, and the gun towers help.',
  teaches: 'Holding a pass; shoot the cornice to bury a wave under an avalanche',
  map: {
    cols: 3, rows: 2, base: 'snow',
    terrain: [
      path('snowTrackH', [at(0, 0.5), at(1.5, 0.5), at(3, 0.5)], 80),
      blob('frozenDirt', ZX, ZY, 250), blob('ice', 400, 220, 140), blob('ice', 2500, 880, 130), blob('frozenDirt', 2300, 240, 150),
    ],
    structures: [
      // The pass: two ridge lines with the zone between them.
      ...ridge(PASS.x0, PASS.north, PASS.n), ...ridge(PASS.x0, PASS.south, PASS.n),
      { kind: 'ridgeCorner', x: PASS.x0 - 86, y: PASS.north }, { kind: 'ridgeCorner', x: PASS.x0 + 128 * PASS.n - 40, y: PASS.north },
      { kind: 'ridgeCorner', x: PASS.x0 - 86, y: PASS.south }, { kind: 'ridgeCorner', x: PASS.x0 + 128 * PASS.n - 40, y: PASS.south },
      // The cornices: on the lip over each mouth, on the side you shoot from (inside the pass, by the ridge).
      { kind: 'cornice', x: 1150, y: 400, id: 'lipW' }, { kind: 'cornice', x: 1740, y: 400, id: 'lipE' },
      // Cover in the zone, and ridge-top mortar nests.
      ...drifts(1360, 470, 2), ...drifts(1360, 620, 2),
      ...each('iceRockB', [[1000, 520], [1900, 560]]),
      ...each('snowPine', [[300, 300], [450, 800], [700, 200], [800, 950], [2100, 160], [2250, 900], [2600, 300], [2700, 760], [1300, 120], [1600, 980]]),
      ...each('firSmall', [[600, 540], [850, 420], [2000, 620], [2400, 480], [2250, 700]]),
      { kind: 'cabinSmall', x: 500, y: 460 }, { kind: 'cabinLarge', x: 2450, y: 640 }, { kind: 'signalBox', x: 2100, y: 400 },
      ...each('iceRockA', [[700, 760], [2200, 330]]), ...each('iceRockC', [[780, 300], [2000, 780]]),
    ],
    points: {
      zone: { x: ZX, y: ZY }, east: { x: 2850, y: 540 }, northE: { x: 2700, y: 60 }, southE: { x: 2750, y: 1040 },
      west: { x: 40, y: 540 }, northW: { x: 200, y: 40 }, southW: { x: 160, y: 1040 },
      ridgeN: { x: 1500, y: 200 }, ridgeS: { x: 1400, y: 900 }, laserPost: { x: 2250, y: 540 },
    },
    roads: {},
  },
  start: { x: ZX - 80, y: ZY }, startHeading: 0,
  mixedClans: true,
  allies: [{ kind: 'tower', at: { x: ZX + 60, y: ZY - 160 }, gun: 'cannon' }, { kind: 'tower', at: { x: ZX - 60, y: ZY + 160 }, gun: 'machinegun' }],
  avalanches: [
    avalanche('lipW', 1010, 480, 3, true),
    avalanche('lipE', 1880, 480, 3, true),
  ],
  enemies: [
    // The Laser holds the east approach and the mortars take the ridge tops.
    { role: 'guard', clan: 'crows', tank: TANK.laser, at: 'laserPost', hpMult: 0.31, sight: 460, leash: 180 },
    // Rhythm: skimmers from both mouths, then Boar Heavies, then mortars and a mixed push.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'east', when: 6, hpMult: 0.38 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'west', when: 9, hpMult: 0.38 },
    { role: 'wave', clan: 'boars', tank: TANK.boarHeavy, at: 'east', when: 30, hpMult: 0.25 },
    { role: 'wave', clan: 'boars', tank: TANK.boarGunner, at: 'west', when: 34, hpMult: 0.33 },
    { role: 'wave', clan: 'crows', tank: TANK.scout, at: 'northE', when: 40, hpMult: 0.38 },
    { role: 'wave', clan: 'crows', tank: TANK.mortar, at: 'east', when: 60, hpMult: 0.31 },
    { role: 'wave', clan: 'crows', tank: TANK.mortar, at: 'west', when: 62, hpMult: 0.31 },
    { role: 'wave', clan: 'boars', tank: TANK.boarHeavy, at: 'west', when: 66, hpMult: 0.25 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'southE', when: 70, hpMult: 0.38 },
    { role: 'wave', clan: 'crows', tank: TANK.laser, at: 'northE', when: 80, hpMult: 0.25 },
    { role: 'wave', clan: 'boars', tank: TANK.boarRocket, at: 'east', when: 92, hpMult: 0.25 },
    { role: 'wave', clan: 'crows', tank: TANK.gunner, at: 'west', when: 96, hpMult: 0.31 },
  ],
  crates: [{ at: { x: ZX + 120, y: ZY + 20 }, content: 'kit' }, { at: { x: ZX - 150, y: ZY - 60 }, content: 'kit' }, { at: { x: 700, y: 560 } }, { at: { x: 2150, y: 480 } }, { at: { x: 1500, y: 960 } }],
  objective: { kind: 'hold', zone: 'zone', radius: 230, seconds: 120 },
  bonus: [{ kind: 'kills', n: 6 }, { kind: 'noDamage' } as never],
  loot: LOOT_SNOW,
};
