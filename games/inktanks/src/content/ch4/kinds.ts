import { rectShape } from '../../logic/geom';
import { withWorldShapes, type KindDef } from '../ch1/kinds';
import { CH3_ART_NAME, CH3_KINDS } from '../ch3/kinds';

/**
 * Structure kinds for chapter 4, Frostridge (snow, a frozen lake, the clans'
 * northern works): chapter 3's kinds (chapters 1–2 within them) plus the
 * snow's. Shapes are placeholders in native px, replaced by the world art's
 * footprints (and its cover / flattenable flags) where the art has the
 * structure, as in chapters 1–3. The snow art is in (Nov 14); HP is the art's.
 */
const SNOW_KINDS: Readonly<Record<string, KindDef>> = {
  // Trees: snowy pines (Tracks and Heavies flatten them, canopy fades), small firs that hide a tank like a bush.
  snowPine: { shape: { kind: 'circle', r: 6 }, material: 'tree', hp: 120, flattenable: true, colour: 0x3a5a44, height: 80 },
  firSmall: { shape: { kind: 'circle', r: 14 }, material: 'tree', hp: 30, flattenable: true, cover: true, colour: 0x3a6a4a, height: 40 },
  // Log cabins: roofs hide tanks under them.
  cabinSmall: { shape: rectShape(66, 50), material: 'wood', hp: 320, roof: true, colour: 0x7a5a3a, height: 50 },
  cabinLarge: { shape: rectShape(122, 62), material: 'wood', hp: 520, roof: true, colour: 0x6a4a30, height: 60 },
  /**
   * Snowdrifts: low cover any gun digs away (shots pass over them close up, as sandbags), 96 px runs.
   * Rescue (level 32): tag them for the objective and each hides a buried crew (state 1 dug into, 0 dug out).
   */
  snowdriftH: { shape: rectShape(96, 16), material: 'wood', hp: 120, low: true, colour: 0xe8eef2, height: 22 },
  snowdriftV: { shape: rectShape(16, 96), material: 'wood', hp: 120, low: true, colour: 0xe8eef2, height: 22 },
  /**
   * The avalanche's trigger (level 37): a lip of snow on a cliff that any gun brings down. Give it an id and list it as an
   * avalanche's `by` (LevelDef.avalanches). Art: the painted cornice (a 128 px run on a ridgeEdge, same origin).
   */
  cornice: { shape: rectShape(96, 16), material: 'wood', hp: 160, low: true, colour: 0xf4f8fa, height: 26 },
  iceRockA: { shape: { kind: 'circle', r: 14 }, material: 'rock', hp: 0, colour: 0xb8d0dc, height: 22 },
  iceRockB: { shape: { kind: 'circle', r: 20 }, material: 'rock', hp: 0, colour: 0xa8c4d4, height: 28 },
  iceRockC: { shape: { kind: 'circle', r: 10 }, material: 'rock', hp: 0, colour: 0xc4dce8, height: 16 },
  /** Ridge cliffs: 128 px runs (lay them 128 apart, as mesaEdge), the face to the south; a 44 px corner piece. Unbreakable. */
  ridgeEdge: { shape: rectShape(128, 44), material: 'rock', hp: 0, colour: 0x9aa4ac, height: 40 },
  ridgeEdgeV: { shape: rectShape(44, 128), material: 'rock', hp: 0, colour: 0x9aa4ac, height: 40 },
  ridgeCorner: { shape: rectShape(44, 44), material: 'rock', hp: 0, colour: 0x9aa4ac, height: 40 },
  frozenFenceH: { shape: rectShape(64, 3), material: 'wood', hp: 40, flattenable: true, low: true, colour: 0x8a7a6a, height: 16 },
  frozenFenceV: { shape: rectShape(3, 64), material: 'wood', hp: 40, flattenable: true, low: true, colour: 0x8a7a6a, height: 16 },
  /** Raid targets (level 33): the lab's generators. Any gun breaks them (the Laser too). */
  generator: { shape: rectShape(56, 42), material: 'fuel', hp: 400, colour: 0x6a7a84, height: 40 },
  labBuilding: { shape: rectShape(157, 97), material: 'brick', hp: 800, roof: true, colour: 0xc8ccd0, height: 60 },
  /** The signal courier's mast (level 38's chase) and the railway's signal box. */
  signalMast: { shape: rectShape(47, 31), material: 'metal', hp: 300, colour: 0x6a6a70, height: 110 },
  signalBox: { shape: rectShape(66, 37), material: 'wood', hp: 260, roof: true, colour: 0x7a5a3a, height: 44 },
  /** Rail track in the snow: ground pieces (64 px runs) under the train's line; they block nothing. */
  railSnowH: { shape: rectShape(64, 20), material: 'stone', hp: 0, deck: true, colour: 0x6a5a4a, height: 1 },
  railSnowV: { shape: rectShape(20, 64), material: 'stone', hp: 0, deck: true, colour: 0x6a5a4a, height: 1 },
};

/** Our snow kinds → the world manifest's structure names (all real art). */
export const CH4_ART_NAME: Readonly<Record<string, string>> = {
  ...CH3_ART_NAME,
  ...Object.fromEntries(Object.keys(SNOW_KINDS).map((k) => [k, k])),
  cornice: 'cornice',
};

/** Chapter 4's kinds: chapter 3's (unchanged) and the snow's. */
export const CH4_KINDS: Readonly<Record<string, KindDef>> = { ...CH3_KINDS, ...withWorldShapes(SNOW_KINDS, CH4_ART_NAME) };
