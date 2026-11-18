/**
 * Cell grids: each layer (the still bricks, then one per floe) maps a cell to the brick on it,
 * so a ball only looks at the 2 x 2 cells under it. Also the "inside" map that defines a
 * break-in: cells a big probe (INSIDE_PROBE cells square) can't reach from the raft's area.
 */
import { BRICK_ROW_MAX, INSIDE_PROBE } from './constants';
import { COLS, ROWS, type BrickDef, type LevelDef } from './types';

export const NO_BRICK = -1;

export interface Layer {
  readonly grid: Int32Array;
  /** Offset in px (a floe's slide). */
  ox: number;
  oy: number;
}

export function cellIndex(cx: number, cy: number): number {
  return cy * COLS + cx;
}

export function forEachCell(b: BrickDef, fn: (cx: number, cy: number) => void): void {
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) fn(x, y);
}

/**
 * Rising Tide's border wall: stone standing along a side edge (touching column 0 or 35, at least
 * as tall as wide). It stays put while the rest of the field sinks.
 */
export function isBorderWall(b: BrickDef): boolean {
  return b.kind === 'stone' && b.floe === undefined && (b.x === 0 || b.x + b.w === COLS) && b.h >= b.w;
}

/**
 * Layer 0 = still bricks, layer i + 1 = floe i; on a Rising Tide level one more layer holds every
 * still brick but the border wall (it sinks). Returns the layers and each brick's layer.
 */
export function buildLayers(level: LevelDef): { layers: Layer[]; layerOf: Int32Array } {
  const floes = level.floes ?? [];
  const layers: Layer[] = [{ grid: new Int32Array(COLS * ROWS).fill(NO_BRICK), ox: 0, oy: 0 }];
  for (let i = 0; i < floes.length; i++) layers.push({ grid: new Int32Array(COLS * ROWS).fill(NO_BRICK), ox: 0, oy: 0 });
  const tide = level.goal === 'tide';
  if (tide) layers.push({ grid: new Int32Array(COLS * ROWS).fill(NO_BRICK), ox: 0, oy: 0 });
  const layerOf = new Int32Array(level.bricks.length);
  level.bricks.forEach((b, i) => {
    let li = b.floe === undefined ? 0 : floes.findIndex((f) => f.id === b.floe) + 1;
    if (tide && li === 0 && !isBorderWall(b)) li = floes.length + 1;
    layerOf[i] = li;
    const layer = layers[li]!;
    forEachCell(b, (cx, cy) => {
      layer.grid[cellIndex(cx, cy)] = i;
    });
  });
  return { layers, layerOf };
}

/**
 * Still walls for the inside map: stone, gates and levers not on a floe, armour bricks as they
 * start (an open level's inside is what its armour encloses at the start, so breaching it doesn't
 * move the goalposts), plus shutters and flip walls (shut). `armour: false` leaves armour out.
 */
export function wallMask(level: LevelDef, armour = true): Uint8Array {
  const mask = new Uint8Array(COLS * ROWS);
  for (const b of level.bricks) {
    const wall = b.kind === 'stone' || b.kind === 'gate' || b.kind === 'lever' || (armour && b.armour === true);
    if (wall && b.floe === undefined) forEachCell(b, (x, y) => (mask[cellIndex(x, y)] = 1));
  }
  for (const s of level.shutters ?? []) forEachCell({ ...s, kind: 'stone' }, (x, y) => (mask[cellIndex(x, y)] = 1));
  for (const f of level.flips ?? []) forEachCell({ x: f.x, y: f.y, w: f.w, h: f.h, kind: 'stone' }, (x, y) => (mask[cellIndex(x, y)] = 1));
  return mask;
}

function probeFits(mask: Uint8Array, px: number, py: number): boolean {
  if (px < 0 || py < 0 || px + INSIDE_PROBE > COLS || py + INSIDE_PROBE > ROWS) return false;
  for (let y = py; y < py + INSIDE_PROBE; y++) for (let x = px; x < px + INSIDE_PROBE; x++) if (mask[cellIndex(x, y)]) return false;
  return true;
}

/** 1 = inside (enclosed by walls, or behind a wall); empty when the level has no hole. */
export function insideMask(walls: Uint8Array): Uint8Array {
  const reach = new Uint8Array(COLS * ROWS);
  const stack: number[] = [];
  for (let px = 0; px + INSIDE_PROBE <= COLS; px++) {
    const py = ROWS - INSIDE_PROBE;
    if (probeFits(walls, px, py)) {
      reach[cellIndex(px, py)] = 1;
      stack.push(cellIndex(px, py));
    }
  }
  while (stack.length > 0) {
    const c = stack.pop()!;
    const px = c % COLS;
    const py = (c - px) / COLS;
    const next: readonly (readonly [number, number])[] = [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]];
    for (const [nx, ny] of next) {
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const ni = cellIndex(nx, ny);
      if (!reach[ni] && probeFits(walls, nx, ny)) {
        reach[ni] = 1;
        stack.push(ni);
      }
    }
  }
  const outside = new Uint8Array(COLS * ROWS);
  for (let c = 0; c < reach.length; c++) {
    if (!reach[c]) continue;
    const px = c % COLS;
    const py = (c - px) / COLS;
    for (let y = py; y < py + INSIDE_PROBE; y++) for (let x = px; x < px + INSIDE_PROBE; x++) outside[cellIndex(x, y)] = 1;
  }
  const inside = new Uint8Array(COLS * ROWS);
  for (let c = 0; c < inside.length; c++) {
    const cy = Math.floor(c / COLS);
    if (!outside[c] && !walls[c] && cy <= BRICK_ROW_MAX) inside[c] = 1;
  }
  return inside;
}

/** The mask grown by r cells (8-neighbour), minus walls: "near the hole". */
export function grow(mask: Uint8Array, r: number, walls: Uint8Array): Uint8Array {
  const out = new Uint8Array(COLS * ROWS);
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (!mask[cellIndex(cx, cy)]) continue;
      for (let y = Math.max(0, cy - r); y <= Math.min(ROWS - 1, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(COLS - 1, cx + r); x++) if (!walls[cellIndex(x, y)]) out[cellIndex(x, y)] = 1;
      }
    }
  }
  return out;
}

export function countCells(mask: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i]!;
  return n;
}
