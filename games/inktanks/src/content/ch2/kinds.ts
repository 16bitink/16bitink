import { rectShape } from '../../logic/geom';
import { ART_NAME, KINDS, withWorldShapes, type KindDef } from '../ch1/kinds';

/**
 * Structure kinds for chapter 2, Dust Flats (desert, canyons, an oil town):
 * chapter 1's kinds plus the desert's. Placeholder shapes in native px,
 * replaced by the world art's footprints where the art exists (as chapter 1's).
 * The art kinds (adobeSmall, adobeLarge, canyonRockA/B/C, mesaEdge, crowTent)
 * carry the manifest's HP; the older names keep the HP the levels were tuned on.
 */
const DESERT_KINDS: Readonly<Record<string, KindDef>> = {
  // The oil town.
  adobeHouse: { shape: rectShape(120, 80), material: 'brick', hp: 220, roof: true, colour: 0xc89a68, height: 60 },
  adobeHut: { shape: rectShape(100, 90), material: 'brick', hp: 180, roof: true, colour: 0xb88a5c, height: 56 },
  adobeWall: { shape: rectShape(64, 10), material: 'brick', hp: 360, colour: 0xc0905c, height: 26 },
  adobeWallV: { shape: rectShape(10, 64), material: 'brick', hp: 360, colour: 0xc0905c, height: 26 },
  oilDerrick: { shape: rectShape(40, 40), material: 'metal', hp: 160, colour: 0x5a5048, height: 110 },
  oilTank: { shape: rectShape(50, 40), material: 'fuel', hp: 90, colour: 0x8a3a2a, height: 30 },
  /** Raid targets (level 13): pipeline valves. */
  valve: { shape: rectShape(50, 40), material: 'fuel', hp: 80, colour: 0x9a6a3a, height: 24 },
  /** A Crow camp's tent (recon camps). */
  tent: { shape: rectShape(70, 50), material: 'wood', hp: 60, roof: true, colour: 0x8a7a5a, height: 36 },
  /** The courier's base gate (chase); the objective opens it. */
  crowGate: { shape: rectShape(120, 30), material: 'brick', hp: 300, colour: 0x6a5a4a, height: 50 },
  /** A well (capture flags stand by them in level 15). */
  well: { shape: { kind: 'circle', r: 20 }, material: 'stone', hp: 0, colour: 0x9a9284, height: 22 },
  /** Desert art kinds, placeable directly (HP from the art manifest). */
  adobeSmall: { shape: rectShape(68, 58), material: 'brick', hp: 320, roof: true, colour: 0xb88a5c, height: 25 },
  adobeLarge: { shape: rectShape(112, 78), material: 'brick', hp: 520, roof: true, colour: 0xc89a68, height: 46 },
  crowTent: { shape: rectShape(50, 30), material: 'wood', hp: 80, colour: 0x8a7a5a, height: 38 },
  mesaEdgeV: { shape: rectShape(44, 128), material: 'stone', hp: 0, colour: 0xa8744c, height: 45 },
  /** A cliff corner / end cap (44 x 44): caps the joints and ends of mesaEdge / mesaEdgeV runs. */
  mesaCorner: { shape: rectShape(44, 44), material: 'stone', hp: 0, colour: 0xa8744c, height: 45 },
  /** Pipeline runs (64 px, indestructible): lay them 64 apart; a valve carries its own 64 px section. */
  pipeH: { shape: rectShape(64, 11), material: 'metal', hp: 0, colour: 0x6a5a4a, height: 14 },
  pipeV: { shape: rectShape(11, 64), material: 'metal', hp: 0, colour: 0x6a5a4a, height: 14 },
  /** One 128 px run of cliff edge: lay them 128 apart (ends join side by side). */
  mesaEdge: { shape: rectShape(128, 44), material: 'stone', hp: 0, colour: 0xa8744c, height: 45 },
  canyonRockA: { shape: { kind: 'circle', r: 16 }, material: 'rock', hp: 0, colour: 0xa08060, height: 14 },
  canyonRockB: { shape: { kind: 'circle', r: 24 }, material: 'rock', hp: 0, colour: 0x98704c, height: 23 },
  canyonRockC: { shape: { kind: 'circle', r: 34 }, material: 'rock', hp: 0, colour: 0x98704c, height: 36 },
  // Canyons and flats.
  mesaWall: { shape: rectShape(120, 22), material: 'stone', hp: 0, colour: 0xa8744c, height: 40 },
  mesaWallV: { shape: rectShape(22, 120), material: 'stone', hp: 0, colour: 0xa8744c, height: 40 },
  boulder: { shape: { kind: 'circle', r: 22 }, material: 'rock', hp: 0, colour: 0xa08060, height: 24 },
  mesaRock: { shape: { kind: 'circle', r: 32 }, material: 'rock', hp: 0, colour: 0x98704c, height: 34 },
  pebble: { shape: { kind: 'circle', r: 15 }, material: 'rock', hp: 0, colour: 0xb09070, height: 16 },
  cactus: { shape: { kind: 'circle', r: 10 }, material: 'tree', hp: 30, flattenable: true, colour: 0x5a8a3c, height: 50 },
  palm: { shape: { kind: 'circle', r: 14 }, material: 'tree', hp: 110, flattenable: true, colour: 0x4a7a34, height: 90 },
  /** Dry scrub: hides a tank that isn't firing, like a bush. */
  scrub: { shape: { kind: 'circle', r: 28 }, material: 'tree', hp: 0, cover: true, colour: 0x9a9a54, height: 18 },
  /** A dune crest: blocks sight both ways, but shots fly over it and tanks drive over it. */
  dune: { shape: rectShape(200, 60), material: 'rock', hp: 0, crest: true, colour: 0xe0c088, height: 22 },
  duneV: { shape: rectShape(60, 200), material: 'rock', hp: 0, crest: true, colour: 0xe0c088, height: 22 },
};

/**
 * Our desert kinds → the world manifest's structure names. Only adobeWall(V)'s
 * footprints are ours (see NO_ART_SHAPE for the dunes); scrub, mesa and pipes use the art's.
 */
export const CH2_ART_NAME: Readonly<Record<string, string>> = {
  ...ART_NAME,
  adobeHouse: 'adobeLarge', adobeHut: 'adobeSmall', adobeWall: 'adobeWallH', adobeWallV: 'adobeWallV',
  adobeSmall: 'adobeSmall', adobeLarge: 'adobeLarge', dune: 'dune', duneV: 'duneV',
  oilDerrick: 'oilDerrick', oilTank: 'oilTank', valve: 'valve', pipeH: 'pipeH', pipeV: 'pipeV', tent: 'crowTent', crowTent: 'crowTent', crowGate: 'crowGate',
  well: 'well', mesaWall: 'mesaEdge', mesaEdge: 'mesaEdge', mesaWallV: 'mesaEdgeV', mesaEdgeV: 'mesaEdgeV', mesaCorner: 'mesaCorner',
  boulder: 'canyonRockB', mesaRock: 'canyonRockC', pebble: 'canyonRockA',
  canyonRockA: 'canyonRockA', canyonRockB: 'canyonRockB', canyonRockC: 'canyonRockC',
  cactus: 'cactus', palm: 'palm', scrub: 'scrub',
};

/** Dunes block sight only: their engine shapes stay; the art's footprints (112 x 32 boxes) must not become walls. */
const NO_ART_SHAPE: ReadonlySet<string> = new Set(['dune', 'duneV']);
const shapeArt: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(CH2_ART_NAME).filter(([k]) => !NO_ART_SHAPE.has(k)));

/** Chapter 2's kinds: chapter 1's (unchanged) and the desert's. */
export const CH2_KINDS: Readonly<Record<string, KindDef>> = { ...KINDS, ...withWorldShapes(DESERT_KINDS, shapeArt) };
