import type { LevelDef } from '../../../src/logic/level/types';
import { blob, boardwalk, each, LOOT_SWAMP, patch, reedBed, row, TANK } from './kit';

/**
 * Level 22, Stilt Village (Assault): clear the Weasels out of their stilt
 * village, 3 × 2 screens. The village stands on a lagoon: boardwalks (narrow
 * 'bridge' strips over deep water) lead in from the west bank to a hub of
 * shallows, huts and reed beds. Everything here is close quarters: the
 * Weasels' Flamers (a 150 px cone, burning through armour) wait in the reeds
 * beside the boardwalks and the hub, and a lit reed bed burns whoever stands
 * in it, friend or foe. Large huts hide tanks under their roofs; the lagoon is
 * deep, so there is no driving round. Gunners on the huts cover the walks.
 */
const WALK_N = boardwalk(900, 330, 6);
const WALK_C = boardwalk(900, 570, 6);
const WALK_S = boardwalk(900, 810, 6);

export const LEVEL_22: LevelDef = {
  id: 'ch3-22', number: 22, name: 'Stilt Village', type: 'assault',
  briefing: 'The Weasels have built a village on stilts out in the lagoon, and from it they raid our road. Clear them out. The lagoon is deep: three boardwalks lead in, and nowhere else is dry. Their Flamers wait in the reeds beside the walks and burn whatever comes within a stone’s throw, armour or not, and a burning reed bed burns everyone in it. Keep your distance where you can, shoot the reeds from afar, and let a fire do your work.',
  teaches: 'Flamers up close: heat through armour, burning reeds, boardwalks over deep water',
  map: {
    cols: 3, rows: 2, base: 'marsh',
    terrain: [
      patch('swampWater', 900, 120, 1860, 840),
      patch('shallows', 840, 280, 140, 100), patch('shallows', 840, 520, 140, 100), patch('shallows', 840, 760, 140, 100),
      patch('shallows', 1420, 280, 860, 520), blob('shallows', 1950, 540, 330), blob('shallows', 1500, 330, 150), blob('shallows', 1500, 790, 150), blob('shallows', 1950, 250, 120), blob('shallows', 1950, 860, 120),
      blob('mud', 300, 260, 140), blob('mud', 300, 850, 140),
      WALK_N.deck, WALK_C.deck, WALK_S.deck,
    ],
    structures: [
      ...WALK_N.pieces, ...WALK_C.pieces, ...WALK_S.pieces,
      // The hub: huts round a square of shallows, with walkway rails for low cover.
      { kind: 'stiltHutLarge', x: 1850, y: 420 }, { kind: 'stiltHutLarge', x: 2080, y: 660 }, { kind: 'stiltHutSmall', x: 2120, y: 420 }, { kind: 'stiltHutSmall', x: 1820, y: 690 },
      { kind: 'stiltHutLarge', x: 1500, y: 260 }, { kind: 'stiltHutSmall', x: 1510, y: 860 }, { kind: 'stiltHutSmall', x: 1960, y: 200 }, { kind: 'stiltHutSmall', x: 1960, y: 880 },
      { kind: 'walkRailN', x: 1740, y: 430 }, { kind: 'walkRailS', x: 1740, y: 700 }, { kind: 'walkRailW', x: 2180, y: 540 },
      // Reed beds: the Flamers' hides beside the walks and in the hub.
      ...reedBed(1560, 480, 4), ...reedBed(1600, 640, 4), ...reedBed(1470, 720, 3), ...reedBed(1500, 400, 3), ...reedBed(1960, 540, 5), ...reedBed(1720, 330, 3), ...reedBed(1720, 790, 3),
      // The west bank: a few reeds, trees, a jetty and drying racks.
      ...reedBed(500, 330, 3), ...reedBed(520, 800, 3),
      ...each('cypress', [[120, 100], [620, 130], [140, 980], [640, 1000], [60, 540]]), ...each('deadTree', [[1150, 200], [1300, 160], [1200, 900], [1350, 940], [2400, 200], [2450, 940]]),
      ...row('mooringPost', 880, 420, 2, 0, 240), { kind: 'fishRack', x: 400, y: 540 }, { kind: 'fishRack', x: 420, y: 620 },
      // The east shore: stores for the village.
      { kind: 'stiltHutSmall', x: 2560, y: 380 }, { kind: 'stiltHutLarge', x: 2600, y: 700 },
    ],
    points: {
      start: { x: 200, y: 540 },
      flameA: { x: 1560, y: 480 }, flameB: { x: 1600, y: 640 }, flameC: { x: 1960, y: 540 }, flameD: { x: 1500, y: 400 },
      gunA: { x: 1500, y: 300 }, gunB: { x: 1540, y: 820 }, gunC: { x: 2130, y: 470 }, mortarIsle: { x: 2210, y: 560 },
      skim: { x: 2750, y: 540 }, eastBank: { x: 2700, y: 700 },
    },
    roads: { lagoon: [{ x: 1200, y: 190 }, { x: 2500, y: 190 }, { x: 2500, y: 900 }, { x: 1200, y: 900 }] },
  },
  start: 'start', startHeading: 0,
  enemies: [
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flameA', hpMult: 0.26, sight: 330, leash: 160 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flameB', hpMult: 0.26, sight: 330, leash: 160 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flameC', hpMult: 0.34, sight: 330, leash: 220 },
    { role: 'guard', clan: 'weasels', tank: TANK.flamer, at: 'flameD', hpMult: 0.29, sight: 330, leash: 160 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gunA', hpMult: 0.34, sight: 440, leash: 120 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner, at: 'gunB', hpMult: 0.34, sight: 440, leash: 120 },
    { role: 'guard', clan: 'weasels', tank: TANK.gunner2, at: 'gunC', hpMult: 0.34, sight: 440, leash: 120 },
    { role: 'turret', clan: 'weasels', tank: TANK.mortar, at: 'mortarIsle', hpMult: 0.29, sight: 520 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: { x: 1200, y: 190 }, when: 50, hpMult: 0.4 },
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'skim', when: 'alarm', hpMult: 0.4 },
  ],
  crates: [{ at: { x: 500, y: 450 }, content: 'kit' }, { at: { x: 600, y: 700 } }, { at: { x: 1700, y: 540 } }, { at: { x: 2200, y: 480 }, content: 'kit' }],
  objective: { kind: 'assault' },
  bonus: [{ kind: 'time', under: 160 }, { kind: 'intel', n: 50 }],
  loot: LOOT_SWAMP,
};
