import { rectShape } from '../../logic/geom';
import { withWorldShapes, type KindDef } from '../ch1/kinds';
import { CH4_ART_NAME, CH4_KINDS } from '../ch4/kinds';

/**
 * Structure kinds for chapter 5, Deepwood (an old forest and the Iron Hive's
 * logging works): chapter 4's kinds (chapters 1–3 within them) plus the
 * forest's. Shapes are placeholders in native px, replaced by the world art's
 * footprints (and its cover / flattenable flags) where the art has them, as in
 * chapters 1–4. The forest art is in (Nov 14); HP is the art's.
 *
 * Trees (decided Nov 14): an old tree's trunk (the art's footprint, r 8–10)
 * is all that blocks driving, but its `canopy` (a circle round the trunk)
 * blocks sight and shots, and the shot hits the tree. The canopy radius is
 * just inside where a tank touching the trunk sits (trunk + 0.85 × a Light
 * hull's radius), so no tank stands under one: a forest is a maze of sight
 * lines, not a field of roofs. Young trees are `thicket`s: Tracks and Heavy
 * hulls flatten them, every other drive goes round (the nav grid closes them).
 * Every tree burns (a Flamer or a level's forest fire, match/forestFire.ts).
 */
export const CANOPY = { oldTree: 28, oldFir: 25, young: 15 } as const;

const FOREST_KINDS: Readonly<Record<string, KindDef>> = {
  oldTree: { shape: { kind: 'circle', r: 10 }, material: 'tree', hp: 420, canopy: CANOPY.oldTree, burns: true, colour: 0x3c5a2c, height: 88 },
  oldFir: { shape: { kind: 'circle', r: 8 }, material: 'tree', hp: 420, canopy: CANOPY.oldFir, burns: true, colour: 0x2c4a30, height: 94 },
  youngTree: { shape: { kind: 'circle', r: 3 }, material: 'tree', hp: 60, flattenable: true, thicket: true, canopy: CANOPY.young, burns: true, colour: 0x6a8a3c, height: 51 },
  youngSpruce: { shape: { kind: 'circle', r: 3 }, material: 'tree', hp: 60, flattenable: true, thicket: true, canopy: CANOPY.young, burns: true, colour: 0x3a6a3c, height: 57 },
  /** Felled trunks: low cover any gun saws through (160 HP); state 0 is sawn and pushed apart (level 45's road). */
  fallenLog: { shape: rectShape(90, 14), material: 'wood', hp: 160, low: true, colour: 0x6a4a2c, height: 20 },
  fallenLogV: { shape: rectShape(14, 90), material: 'wood', hp: 160, low: true, colour: 0x6a4a2c, height: 20 },
  stump: { shape: { kind: 'circle', r: 8 }, material: 'rock', hp: 0, low: true, colour: 0x6a5034, height: 9 },
  /** Ferns and brambles: hide a tank like a bush; Tracks and Heavies flatten them; they burn like reeds. */
  undergrowth: { shape: { kind: 'circle', r: 26 }, material: 'tree', hp: 30, cover: true, flattenable: true, burns: true, colour: 0x4a6a2c, height: 19 },
  /** The Hive's iron sawmill shed (roof hides tanks under it); a brick-breaker's job. */
  sawmill: { shape: rectShape(117, 61), material: 'metal', hp: 600, roof: true, colour: 0x4a4440, height: 43 },
  logPile: { shape: rectShape(64, 30), material: 'wood', hp: 220, colour: 0x7a5a34, height: 26 },
  /** The Hive's watchtower (state 0 toppled); iron legs, so a brick-breaker's job. */
  hiveTower: { shape: rectShape(26, 22), material: 'metal', hp: 420, colour: 0x3a3634, height: 84 },
  /**
   * Log bridges (level 44): lay one on a 'bridge' strip across a river (logBridge spans east–west, logBridgeV
   * north–south). Driven over; low cover for shots; broken, the bridge strip under it turns to water (match/spans.ts).
   */
  logBridge: { shape: rectShape(170, 56), material: 'wood', hp: 500, low: true, span: true, colour: 0x7a5a34, height: 5 },
  logBridgeV: { shape: rectShape(56, 170), material: 'wood', hp: 500, low: true, span: true, colour: 0x7a5a34, height: 5 },
};

/** Our forest kinds → the world manifest's structure names (all real art). */
export const CH5_ART_NAME: Readonly<Record<string, string>> = {
  ...CH4_ART_NAME,
  ...Object.fromEntries(Object.keys(FOREST_KINDS).map((k) => [k, k])),
};

/** Undergrowth hides by our circle (its art footprint, 40 × 20, is too small to sit a tank in), as reeds do. */
const NO_ART_SHAPE: ReadonlySet<string> = new Set(['undergrowth']);
const shapeArt: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(CH5_ART_NAME).filter(([k]) => !NO_ART_SHAPE.has(k)));

/** Chapter 5's kinds: chapter 4's (unchanged) and the forest's. */
export const CH5_KINDS: Readonly<Record<string, KindDef>> = { ...CH4_KINDS, ...withWorldShapes(FOREST_KINDS, shapeArt) };
