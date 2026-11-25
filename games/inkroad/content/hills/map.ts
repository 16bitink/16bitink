import type { GateDef, RoadDef, Terrain } from '../../src/sim/types';

/** Seven Hills: two steep shores, a strait down the middle and two bridges. 60 x 38 cells. 'h' is steep: streets only, and slow. */
const COLS = 60;
const ROWS = 38;
export interface Hill { readonly name: string; readonly x: number; readonly y: number; readonly r: number }
/** Seven of them, counted twice by the Council. Each has a rock at its heart that nobody builds on. */
export const HILLS_AT: readonly Hill[] = [
  { name: 'Lantern Hill', x: 3, y: 4, r: 4 }, { name: 'Plane Hill', x: 20, y: 4, r: 4 }, { name: 'Goat Hill', x: 3, y: 27, r: 4 },
  { name: 'Cistern Hill', x: 19, y: 28, r: 3.5 }, { name: 'Compass Hill', x: 44, y: 4, r: 4 }, { name: 'Anchor Hill', x: 51, y: 27, r: 4.5 },
  { name: 'Market Hill', x: 42, y: 27, r: 3.5 },
];

const strait = (y: number): number => 30 + Math.round(1.6 * Math.sin(y * 0.22));
const STRAIT_HALF = 2;

function terrainAt(x: number, y: number): Terrain {
  const mid = strait(y);
  if (x >= mid - STRAIT_HALF && x <= mid + STRAIT_HALF) return '~';
  if (y >= 36 && x > 2 && x < 57) return '~';
  const hill = HILLS_AT.find((h) => Math.hypot(x - h.x, (y - h.y) * 1.1) <= h.r);
  if (!hill) return '.';
  return Math.hypot(x - hill.x, y - hill.y) < 0.8 ? '#' : 'h';
}

export const MAP: readonly string[] = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) => terrainAt(x, y)).join(''));

export const GATES: readonly GateDef[] = [
  { id: 'west', name: 'Olive Road', cell: [0, 16], weight: 1.5 },
  { id: 'east', name: 'Plain Road', cell: [59, 16], weight: 1.5 },
  { id: 'north', name: 'Lighthouse Road', cell: [16, 0], weight: 1.1 },
  { id: 'orchard', name: 'Orchard Road', cell: [48, 0], weight: 1.1 },
];

export const ROADS_DEF: readonly RoadDef[] = [
  { cells: [[0, 16], [3, 16]], type: 'highway', fixed: true },
  { cells: [[56, 16], [59, 16]], type: 'highway', fixed: true },
  { cells: [[16, 0], [16, 2]], type: 'highway', fixed: true },
  { cells: [[48, 0], [48, 2]], type: 'highway', fixed: true },
  // West shore: a grid of short blocks round the busy crossing.
  { cells: [[3, 16], [6, 16]], type: 'street' },
  { cells: [[6, 16], [16, 16]], type: 'street' },
  { cells: [[16, 16], [26, 16]], type: 'street' },
  { cells: [[16, 2], [16, 16]], type: 'street' },
  { cells: [[16, 16], [16, 32]], type: 'street' },
  { cells: [[6, 10], [25, 10]], type: 'street' },
  { cells: [[6, 22], [25, 22]], type: 'street' },
  { cells: [[8, 31], [24, 31]], type: 'street' },
  { cells: [[6, 10], [6, 31]], type: 'street' },
  { cells: [[24, 10], [24, 22]], type: 'street' },
  // The old bridge.
  { cells: [[26, 16], [34, 16]], type: 'street' },
  // East shore.
  { cells: [[34, 16], [48, 16]], type: 'street' },
  { cells: [[48, 16], [56, 16]], type: 'street' },
  { cells: [[48, 2], [48, 16]], type: 'street' },
  { cells: [[48, 16], [48, 32]], type: 'street' },
  { cells: [[36, 10], [55, 10]], type: 'street' },
  { cells: [[36, 22], [55, 22]], type: 'street' },
  { cells: [[36, 31], [54, 31]], type: 'street' },
  { cells: [[41, 10], [41, 22]], type: 'street' },
  // Over the hills: short and steep.
  { cells: [[16, 26], [21, 31]], type: 'street' },
  { cells: [[48, 24], [41, 31]], type: 'street' },
  // Year 2: the second bridge.
  { cells: [[24, 31], [36, 31]], type: 'avenue', opensYear: 2 },
  // Council roads, shown two years ahead.
  { cells: [[54, 10], [54, 31]], type: 'street', opensYear: 4 },
  { cells: [[3, 4], [16, 4]], type: 'street', opensYear: 5 },
  { cells: [[41, 4], [41, 10]], type: 'street', opensYear: 6 },
  { cells: [[24, 22], [24, 30]], type: 'street', opensYear: 7 },
  { cells: [[36, 22], [36, 31]], type: 'street', opensYear: 8 },
];
