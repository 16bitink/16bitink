import { pointInShape, pushOut, shapeBounds } from '../geom';
import { CELL, GROUNDS, isDeep, type Land, type StructureDef } from '../land';

/**
 * The coarse navigation grid, one cell per ground cell (CELL px). A cost of 0
 * blocks; sand and mud cost more. Solid structures block their cells (grown
 * by a tank's half-width); when one breaks, its cells reopen and `version`
 * goes up so cached flow fields are dropped.
 */
export interface NavGrid {
  readonly cols: number;
  readonly rows: number;
  readonly cost: Uint8Array;
  /** Cells each structure blocks, to reopen them when it breaks. */
  readonly blocks: Map<string, number[]>;
  /** A Hover grid: deep water is open (match.ts builds one only when a Hover tank needs it). */
  readonly floats: boolean;
  /** A Heavy hull's grid (chapter 4): thin ice is closed, it would give way. */
  readonly heavy: boolean;
  version: number;
}

const GROUND_COST: Readonly<Record<string, number>> = {
  grass: 2, grassDry: 2, dirt: 2, bridge: 2, sand: 3, mud: 3, water: 0, canyonRock: 2, packedSand: 2, sandTrack: 2, sandTrackH: 2,
  swampWater: 0, shallows: 3, marsh: 2,
  // Chapter 4: deep snow costs like sand (bots keep to the packed tracks); ice and thin ice like dirt (Heavies' grid closes thin ice).
  snow: 3, snowTrack: 2, snowTrackH: 2, frozenDirt: 2, ice: 2, thinIce: 2,
  // Chapter 5: the forest floor costs like deep snow (bots keep to the trails); trails and clearings like dirt.
  forestFloor: 3, forestTrail: 2, forestTrailH: 2, clearing: 2,
};
/** Deep water's cost on a Hover grid: a fast lane, like dirt. */
const FLOAT_COST = 2;

/** A cell's cost from its ground alone (no structures). */
function groundCost(nav: { readonly floats: boolean; readonly heavy: boolean }, gi: number): number {
  const g = GROUNDS[gi]!;
  if (nav.heavy && g === 'thinIce') return 0;
  return nav.floats && isDeep(g) ? FLOAT_COST : GROUND_COST[g]!;
}
/**
 * How much a solid's footprint is grown when marking cells: more than half a
 * cell, so a thin wall (the world art's are 4–14 px) blocks the cells on
 * both sides even when it lies on a cell boundary.
 */
const MARGIN = 22;

/** Blocks its cells: not cover, a crest, a deck, a log bridge or dormant; flattenable only if it's a young tree (chapter 5: only Tracks and Heavies get through, so the grid sends everyone round). */
export function solid(s: StructureDef): boolean {
  return !s.cover && (!s.flattenable || s.thicket === true) && !s.crest && !s.deck && !s.span && !s.dormant;
}

export function buildNav(l: Land, floats = false, heavy = false): NavGrid {
  const cols = l.gridCols;
  const rows = l.gridRows;
  const cost = new Uint8Array(cols * rows);
  for (let i = 0; i < cost.length; i++) cost[i] = groundCost({ floats, heavy }, l.ground[i]!);
  const nav: NavGrid = { cols, rows, cost, blocks: new Map(), floats, heavy, version: 0 };
  for (const s of l.structures) {
    if (!solid(s)) continue;
    const cells = cellsOf(nav, s);
    for (const i of cells) cost[i] = 0;
    nav.blocks.set(s.id, cells);
  }
  return nav;
}

/** The cells a solid structure covers (grown by MARGIN), as buildNav marks them. */
function cellsOf(nav: NavGrid, s: StructureDef): number[] {
  const b = shapeBounds(s.shape, s.x, s.y);
  const cells: number[] = [];
  for (let gy = Math.max(0, Math.floor((b.y0 - MARGIN) / CELL)); gy <= Math.min(nav.rows - 1, Math.floor((b.y1 + MARGIN) / CELL)); gy++) {
    for (let gx = Math.max(0, Math.floor((b.x0 - MARGIN) / CELL)); gx <= Math.min(nav.cols - 1, Math.floor((b.x1 + MARGIN) / CELL)); gx++) {
      const cx = (gx + 0.5) * CELL;
      const cy = (gy + 0.5) * CELL;
      if (pointInShape(s.shape, s.x, s.y, cx, cy) || pushOut(s.shape, s.x, s.y, cx, cy, MARGIN)) cells.push(gy * nav.cols + gx);
    }
  }
  return cells;
}

/** A structure appears (an avalanche's drifts, chapter 4): its cells close. */
export function block(nav: NavGrid, s: StructureDef): void {
  const cells = cellsOf(nav, s);
  for (const i of cells) nav.cost[i] = 0;
  nav.blocks.set(s.id, cells);
  nav.version++;
}

/** Reopens a broken structure's cells to the ground under them. */
export function unblock(nav: NavGrid, l: Land, id: string): void {
  const cells = nav.blocks.get(id);
  if (!cells) return;
  for (const i of cells) nav.cost[i] = groundCost(nav, l.ground[i]!);
  nav.blocks.delete(id);
  // Another solid may still cover some of those cells.
  for (const other of nav.blocks.values()) for (const i of other) nav.cost[i] = 0;
  nav.version++;
}

/** The ground under `cells` changed (a flood): their costs follow it, solids still block, cached fields drop. */
export function regrade(nav: NavGrid, l: Land, cells: readonly number[]): void {
  if (cells.length === 0) return;
  for (const i of cells) nav.cost[i] = groundCost(nav, l.ground[i]!);
  for (const other of nav.blocks.values()) for (const i of other) nav.cost[i] = 0;
  nav.version++;
}

export function passable(nav: NavGrid, x: number, y: number): boolean {
  const gx = Math.floor(x / CELL);
  const gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= nav.cols || gy >= nav.rows) return false;
  return nav.cost[gy * nav.cols + gx]! > 0;
}

/** Whether a straight drive from a to b stays on passable cells (sampled every half cell). */
export function clearLine(nav: NavGrid, ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(d / (CELL / 2)));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!passable(nav, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

/** The nearest passable cell centre to (x, y), searching rings outwards. */
export function nearestPassable(nav: NavGrid, x: number, y: number, maxRing = 12): { x: number; y: number } | null {
  const gx0 = Math.floor(x / CELL);
  const gy0 = Math.floor(y / CELL);
  for (let ring = 0; ring <= maxRing; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const gx = gx0 + dx;
        const gy = gy0 + dy;
        if (gx < 0 || gy < 0 || gx >= nav.cols || gy >= nav.rows) continue;
        if (nav.cost[gy * nav.cols + gx]! > 0) return { x: (gx + 0.5) * CELL, y: (gy + 0.5) * CELL };
      }
    }
  }
  return null;
}
