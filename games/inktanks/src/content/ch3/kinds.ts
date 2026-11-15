import { rectShape } from '../../logic/geom';
import { withWorldShapes, type KindDef } from '../ch1/kinds';
import { CH2_ART_NAME, CH2_KINDS } from '../ch2/kinds';

/**
 * Structure kinds for chapter 3, Mirefen (swamp and stilt villages): chapter
 * 2's kinds (chapter 1's within them) plus the swamp's. Shapes are
 * placeholders in native px, replaced by the world art's footprints (and its
 * cover / flattenable flags) wherever the art has the structure, as in
 * chapters 1 and 2. The swamp art is in (Nov 14); HP is the art's suggestion.
 */
const SWAMP_KINDS: Readonly<Record<string, KindDef>> = {
  // The stilt village: huts on legs over the water's edge, their roofs hide tanks under them.
  stiltHutSmall: { shape: rectShape(60, 50), material: 'wood', hp: 300, roof: true, colour: 0x7a6040, height: 48 },
  stiltHutLarge: { shape: rectShape(104, 64), material: 'wood', hp: 480, roof: true, colour: 0x6a5034, height: 53 },
  /** The dam (raid and flood target, level 25): 136 px across a channel. Any gun breaks timber. */
  sluiceDam: { shape: rectShape(136, 22), material: 'wood', hp: 600, colour: 0x6a5a44, height: 47 },
  /** Reeds hide a tank like a bush; Tracks and Heavies flatten them; a Flamer sets them alight and fire spreads clump to clump. */
  reeds: { shape: { kind: 'circle', r: 26 }, material: 'tree', hp: 20, cover: true, flattenable: true, burns: true, colour: 0x8a9a4a, height: 25 },
  deadTree: { shape: { kind: 'circle', r: 6 }, material: 'rock', hp: 0, colour: 0x5a4a3a, height: 53 },
  cypress: { shape: { kind: 'circle', r: 6 }, material: 'tree', hp: 180, colour: 0x3a5a34, height: 77 },
  /** Decks on the ground (drawn under tanks, block nothing): lay them over a 'bridge' patch, which is what you drive on. */
  boardwalk: { shape: rectShape(128, 36), material: 'wood', hp: 0, deck: true, colour: 0x8a6a44, height: 1 },
  boardwalkV: { shape: rectShape(36, 128), material: 'wood', hp: 0, deck: true, colour: 0x8a6a44, height: 1 },
  jetty: { shape: rectShape(88, 64), material: 'wood', hp: 0, deck: true, colour: 0x8a6a44, height: 1 },
  /** Boardwalk rails: low cover (shots pass over them close up), 128 px runs. */
  walkRailN: { shape: rectShape(128, 4), material: 'wood', hp: 60, low: true, colour: 0x7a5a36, height: 15 },
  walkRailS: { shape: rectShape(128, 4), material: 'wood', hp: 60, low: true, colour: 0x7a5a36, height: 15 },
  walkRailE: { shape: rectShape(4, 128), material: 'wood', hp: 60, low: true, colour: 0x7a5a36, height: 15 },
  walkRailW: { shape: rectShape(4, 128), material: 'wood', hp: 60, low: true, colour: 0x7a5a36, height: 15 },
  mooringPost: { shape: { kind: 'circle', r: 6 }, material: 'rock', hp: 0, colour: 0x5a4a3a, height: 22 },
  fishRack: { shape: rectShape(44, 18), material: 'wood', hp: 30, flattenable: true, colour: 0x8a7050, height: 22 },
  /** The lock's gates (level 29): stone and iron across a channel, 136 px; indestructible and solid (no barge, Hover or shot passes). */
  lockGate: { shape: rectShape(136, 28), material: 'stone', hp: 0, colour: 0x6a6a64, height: 40 },
};

/**
 * Our swamp kinds → the world manifest's structure names (all real art now).
 * The ch3 levels may also use chapter 1 and 2 kinds (sandbags, crates,
 * cementWall, the depot's towers) as they are.
 */
export const CH3_ART_NAME: Readonly<Record<string, string>> = {
  ...CH2_ART_NAME,
  stiltHutSmall: 'stiltHutSmall', stiltHutLarge: 'stiltHutLarge', sluiceDam: 'sluiceDam', reeds: 'reeds', deadTree: 'deadTree', cypress: 'cypress',
  boardwalk: 'boardwalk', boardwalkV: 'boardwalkV', jetty: 'jetty', walkRailN: 'walkRailN', walkRailS: 'walkRailS', walkRailE: 'walkRailE', walkRailW: 'walkRailW',
  mooringPost: 'mooringPost', fishRack: 'fishRack', lockGate: 'lockGate',
};

/** Reeds hide by our circle (a bush's art footprint is a 32 × 16 box: too small to sit a tank in), as dunes keep theirs. */
const NO_ART_SHAPE: ReadonlySet<string> = new Set(['reeds']);
const shapeArt: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(CH3_ART_NAME).filter(([k]) => !NO_ART_SHAPE.has(k)));

/** Chapter 3's kinds: chapter 2's (unchanged) and the swamp's. */
export const CH3_KINDS: Readonly<Record<string, KindDef>> = { ...CH2_KINDS, ...withWorldShapes(SWAMP_KINDS, shapeArt) };
