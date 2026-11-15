import type { Material } from './damage';
import { distToSegment, segmentHits, type Bounds, type Shape } from './geom';
import type { Pt } from './vec';

/**
 * A level's map: a few screens of ground patches and structures, with named
 * points and roads for the level's start, enemies and objective. Built once
 * per level from its layout (src/logic/level/load.ts).
 */
export const SCREEN = { w: 960, h: 540 } as const;
/** The ground and navigation grid's cell, native px. */
export const CELL = 40;

/**
 * Chapter 2's grounds are appended (existing indexes must not move):
 * canyonRock (drives like dirt), packedSand and sandTrack (north–south ruts) /
 * sandTrackH (east–west ruts): roads, with no sand penalty.
 */
/**
 * Chapter 3's are appended after them: swampWater (deep, like water: only
 * Hover crosses it), shallows (wet ground: drives like mud) and marsh (firm
 * swamp grass, like grass).
 */
/**
 * Chapter 4's after those: snow (deep: Wheels ×0.75, Half-tracks ×0.9),
 * snowTrack (north–south) / snowTrackH (east–west) packed-snow roads and
 * frozenDirt (drive like dirt), ice (low grip: every drive slides) and thinIce
 * (ice that gives way under Heavy hulls, match/ice.ts).
 */
/**
 * Chapter 5's after those: forestFloor (roots and ferns under the old trees:
 * Wheels ×0.85, Half-tracks ×0.93, nav cost 3, so bots keep to the trails),
 * forestTrail (north–south) / forestTrailH (east–west), the fast lanes (no
 * forest penalty), and clearing (open logged ground, drives like dirt).
 */
export type Ground =
  | 'grass' | 'grassDry' | 'dirt' | 'sand' | 'mud' | 'water' | 'bridge' | 'canyonRock' | 'packedSand' | 'sandTrack' | 'sandTrackH' | 'swampWater' | 'shallows' | 'marsh'
  | 'snow' | 'snowTrack' | 'snowTrackH' | 'frozenDirt' | 'ice' | 'thinIce'
  | 'forestFloor' | 'forestTrail' | 'forestTrailH' | 'clearing';
export const GROUNDS: readonly Ground[] = [
  'grass', 'grassDry', 'dirt', 'sand', 'mud', 'water', 'bridge', 'canyonRock', 'packedSand', 'sandTrack', 'sandTrackH', 'swampWater', 'shallows', 'marsh',
  'snow', 'snowTrack', 'snowTrackH', 'frozenDirt', 'ice', 'thinIce',
  'forestFloor', 'forestTrail', 'forestTrailH', 'clearing',
];

/** Deep water: stops every drive but Hover (design doc "Chapter 3: Mirefen"). */
export const isDeep = (g: Ground): boolean => g === 'water' || g === 'swampWater';
/** Grounds that slow like mud (×0.8 for all but Tracks and Hover). */
export const isMuddy = (g: Ground): boolean => g === 'mud' || g === 'shallows';
/** Ice (chapter 4): every drive slides on it; thin ice also breaks under Heavy hulls. */
export const isIcy = (g: Ground): boolean => g === 'ice' || g === 'thinIce';

export type PatchShape =
  | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  | { readonly kind: 'circle'; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: 'path'; readonly pts: readonly Pt[]; readonly width: number };

export interface TerrainPatch {
  readonly ground: Ground;
  readonly shape: PatchShape;
}

export interface StructureDef {
  readonly id: string;
  /** The world art key (structures/<kind>-<state>.png). */
  readonly kind: string;
  /** Ground origin, world native px. */
  readonly x: number;
  readonly y: number;
  readonly shape: Shape;
  readonly material: Material;
  /** 0: can't be destroyed. */
  readonly hp: number;
  /** Tracks and heavy hulls drive through it (fences, small trees). */
  readonly flattenable?: boolean;
  /** Hides a tank that isn't firing (bushes, tall crops); doesn't block. */
  readonly cover?: boolean;
  /** Has a roof that hides tanks under it. */
  readonly roof?: boolean;
  /** Low cover (sandbags, fences, crates, hay): shots pass over it in their first 50 px; it never blocks sight. */
  readonly low?: boolean;
  /** Mission tag: 'target' (raid), 'cage' (rescue)… */
  readonly tag?: string;
  /** A dune crest (chapter 2): blocks sight both ways, but shots fly over it and tanks drive over it. */
  readonly crest?: boolean;
  /** An allied gun tower's base: blocks driving, but shots and sight pass it (its gun stands above the fight). */
  readonly perch?: boolean;
  /** A deck laid on the ground (boardwalks, jetties, chapter 3): drawn under tanks, blocks nothing. */
  readonly deck?: boolean;
  /** Catches fire (reeds, chapter 3): a Flamer sets it alight; it spreads, burns tanks in it, then burns out (match/flame.ts). */
  readonly burns?: boolean;
  /** Not there yet (chapter 4): an avalanche's drift, which falls when the structure with this id (its cornice) breaks (match/avalanche.ts). */
  readonly dormant?: string;
  /**
   * A tree's canopy (chapter 5), radius px round its origin: it blocks sight and
   * shots (the shot hits the tree) while the trunk (`shape`) is all that blocks
   * driving. A line that starts under the canopy isn't stopped by it (you see and
   * shoot out from under the branches); one that ends under it is.
   */
  readonly canopy?: number;
  /** A young tree (chapter 5): Tracks and Heavy hulls flatten it, every other drive goes round (solid in the nav grid). */
  readonly thicket?: boolean;
  /**
   * A span (chapter 5's log bridges): drawn on the ground and driven over, low
   * cover for shots (hit past their first LOW_PASS px, never by a shot fired from
   * on it); when it breaks, the 'bridge' ground under it turns to water (match/spans.ts).
   */
  readonly span?: boolean;
}

/**
 * Whether the line a→b is stopped by this structure: by its canopy when it has
 * one (a circle round the trunk; not when a starts under it), else its footprint.
 */
export function lineCrosses(s: StructureDef, ax: number, ay: number, bx: number, by: number): boolean {
  const r = s.canopy;
  if (!r) return segmentHits(s.shape, s.x, s.y, ax, ay, bx, by);
  if ((ax - s.x) ** 2 + (ay - s.y) ** 2 < r * r) return false;
  return distToSegment(s.x, s.y, ax, ay, bx, by) <= r;
}

/** Whether a structure's footprint (or canopy) is under (x, y). */
export function underCanopy(s: StructureDef, x: number, y: number): boolean {
  return s.canopy !== undefined && (x - s.x) ** 2 + (y - s.y) ** 2 < s.canopy * s.canopy;
}

export interface LandDef {
  readonly id: string;
  readonly name: string;
  /** Size in screens (960 × 540 each). */
  readonly cols: number;
  readonly rows: number;
  readonly base: Ground;
  /** Painted in order: later patches cover earlier ones. */
  readonly terrain: readonly TerrainPatch[];
  readonly structures: readonly StructureDef[];
  readonly roads: Readonly<Record<string, readonly Pt[]>>;
  readonly points: Readonly<Record<string, Pt>>;
}

export interface Land {
  readonly def: LandDef;
  readonly width: number;
  readonly height: number;
  /** Screens. */
  readonly area: number;
  readonly bounds: Bounds;
  readonly gridCols: number;
  readonly gridRows: number;
  /** Ground index (into GROUNDS) per grid cell. */
  readonly ground: Uint8Array;
  readonly structures: readonly StructureDef[];
}

export function inPatch(p: PatchShape, x: number, y: number): boolean {
  switch (p.kind) {
    case 'rect':
      return x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h;
    case 'circle':
      return (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r;
    case 'path':
      for (let i = 1; i < p.pts.length; i++) {
        const a = p.pts[i - 1]!;
        const b = p.pts[i]!;
        if (distToSegment(x, y, a.x, a.y, b.x, b.y) <= p.width / 2) return true;
      }
      return false;
  }
}

export function buildLand(def: LandDef): Land {
  const width = def.cols * SCREEN.w;
  const height = def.rows * SCREEN.h;
  const gridCols = Math.ceil(width / CELL);
  const gridRows = Math.ceil(height / CELL);
  const ground = new Uint8Array(gridCols * gridRows).fill(GROUNDS.indexOf(def.base));
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const x = (gx + 0.5) * CELL;
      const y = (gy + 0.5) * CELL;
      for (const p of def.terrain) if (inPatch(p.shape, x, y)) ground[gy * gridCols + gx] = GROUNDS.indexOf(p.ground);
    }
  }
  return {
    def, width, height, area: def.cols * def.rows, bounds: { x0: 0, y0: 0, x1: width, y1: height },
    gridCols, gridRows, ground, structures: def.structures,
  };
}

export function cellIndex(l: Land, x: number, y: number): number {
  const gx = Math.floor(x / CELL);
  const gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= l.gridCols || gy >= l.gridRows) return -1;
  return gy * l.gridCols + gx;
}

export function groundAt(l: Land, x: number, y: number): Ground {
  const i = cellIndex(l, x, y);
  return i < 0 ? 'water' : GROUNDS[l.ground[i]!]!;
}

/** On the map, and dry (or, for a drive that `floats`, any ground). */
export function isDrivable(l: Land, x: number, y: number, floats = false): boolean {
  const i = cellIndex(l, x, y);
  if (i < 0) return false;
  return floats || !isDeep(GROUNDS[l.ground[i]!]!);
}

/** Deep water at (x, y): what only Hover, barges and the Ironclad move on. Off the map is not water. */
export function isWaterAt(l: Land, x: number, y: number): boolean {
  const i = cellIndex(l, x, y);
  return i >= 0 && isDeep(GROUNDS[l.ground[i]!]!);
}
