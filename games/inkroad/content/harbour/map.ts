import type { GateDef, LotDef, RoadDef, Terrain } from '../../src/sim/types';

/** Old Harbour: a walled quarter of stone (streets only) between two newer sides and the sea. 56 x 38 cells. */
const COLS = 56;
const ROWS = 38;
/** The walls; the road gaps are (28, 9), (15, 19) and (41, 19). */
export const WALL = { west: 15, east: 41, north: 9, south: 26 } as const;
const GAPS: readonly (readonly [number, number])[] = [[28, 9], [15, 19], [41, 19]];

const isGap = (x: number, y: number): boolean => GAPS.some(([gx, gy]) => gx === x && gy === y);

function seaFrom(x: number): number {
  if (x >= 16 && x <= 28) return 27;
  if (x >= 29 && x <= 37) return 31;
  if (x >= 38 && x <= 41) return 28;
  return 31 + Math.round(1 + Math.sin(x * 0.7));
}

function terrainAt(x: number, y: number): Terrain {
  if (y >= seaFrom(x)) return '~';
  const onSide = (x === WALL.west || x === WALL.east) && y >= WALL.north && y <= WALL.south;
  const onTop = y === WALL.north && x >= WALL.west && x <= WALL.east;
  if ((onSide || onTop) && !isGap(x, y)) return '#';
  if (x >= WALL.west && x <= WALL.east && y >= WALL.north) return 'h';
  if (x <= 4 && y <= 4 && x + y <= 6) return '#';
  if (x >= 44 && x <= 46 && y >= 1 && y <= 3) return 'p';
  return '.';
}

export const MAP: readonly string[] = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) => terrainAt(x, y)).join(''));

export const GATES: readonly GateDef[] = [
  { id: 'west', name: 'Moor Road', cell: [0, 19], weight: 2 },
  { id: 'east', name: 'Heath Road', cell: [55, 19], weight: 2 },
  { id: 'north', name: 'Forest Road', cell: [28, 0], weight: 1.7 },
];

export const ROADS_DEF: readonly RoadDef[] = [
  // Ways in.
  { cells: [[0, 19], [2, 19]], type: 'highway', fixed: true },
  { cells: [[53, 19], [55, 19]], type: 'highway', fixed: true },
  { cells: [[28, 0], [28, 2]], type: 'highway', fixed: true },
  // The long street through the old quarter; the wall gates are pieces of their own (the charge is paid there).
  { cells: [[2, 19], [8, 19]], type: 'street' },
  { cells: [[8, 19], [14, 19]], type: 'street' },
  { cells: [[14, 19], [17, 19]], type: 'street' },
  { cells: [[17, 19], [39, 19]], type: 'street' },
  { cells: [[39, 19], [42, 19]], type: 'street' },
  { cells: [[42, 19], [48, 19]], type: 'street' },
  { cells: [[48, 19], [53, 19]], type: 'street' },
  { cells: [[28, 2], [28, 7]], type: 'street' },
  { cells: [[28, 7], [28, 10]], type: 'street' },
  { cells: [[28, 10], [28, 25]], type: 'street' },
  // Lanes inside the walls. The two side lanes, (20, 14) to (20, 25) and (36, 14) to (36, 25), are the player's to find again.
  { cells: [[20, 14], [36, 14]], type: 'street' },
  { cells: [[18, 25], [38, 25]], type: 'street' },
  // The sides.
  { cells: [[8, 7], [8, 29]], type: 'street' },
  { cells: [[48, 7], [48, 28]], type: 'street' },
  { cells: [[2, 12], [14, 12]], type: 'street' },
  { cells: [[8, 7], [28, 7]], type: 'street' },
  { cells: [[28, 7], [48, 7]], type: 'street', opensYear: 3 },
  { cells: [[2, 25], [14, 25]], type: 'street', opensYear: 4 },
  { cells: [[42, 28], [53, 28]], type: 'street', opensYear: 7 },
];

type Row = readonly [name: string, kind: LotDef['kind'], gx: number, gy: number, w: number, h: number, year: number, district: string, level?: LotDef['level'], max?: LotDef['maxLevel']];

const ROWS_DEF: readonly Row[] = [
  ['Herring Market', 'market', 21, 15, 4, 3, 1, 'Old Quarter', 1, 4],
  ['Bell Shops', 'shops', 25, 15, 2, 2, 1, 'Old Quarter', 1, 2],
  ['Old Weigh House', 'landmark', 29, 15, 4, 3, 1, 'Old Quarter', 1, 1],
  ['Candle Shops', 'shops', 33, 15, 2, 2, 1, 'Old Quarter', 1, 2],
  ['Ropemakers Row', 'home', 21, 20, 6, 4, 1, 'Old Quarter', 1, 3],
  ['Captains Row', 'home', 29, 20, 6, 4, 1, 'Old Quarter', 1, 3],
  ['Tin Lane', 'home', 17, 15, 2, 2, 1, 'Old Quarter', 2, 3],
  ['Cork Lane', 'home', 17, 20, 2, 4, 1, 'Old Quarter', 1, 3],
  ['Anchor Lane', 'home', 37, 20, 2, 4, 1, 'Old Quarter', 1, 3],
  ['Weavers Green', 'home', 9, 16, 4, 2, 1, 'Weavers Side', 1],
  ['Loom Street', 'home', 9, 20, 4, 2, 1, 'Weavers Side', 1],
  ['Flax Street', 'home', 3, 16, 4, 2, 1, 'Weavers Side', 1],
  ['Barrel Street', 'home', 43, 16, 4, 2, 1, 'Ropewalk', 1],
  ['Tar Street', 'home', 49, 20, 4, 2, 1, 'Ropewalk', 1],
  ['Harbour School', 'school', 43, 20, 4, 3, 1, 'Ropewalk', 1, 2],
  ['Upper Gables', 'home', 21, 11, 6, 2, 2, 'Old Quarter', 1, 3],
  ['Gull Lane', 'home', 37, 15, 2, 2, 2, 'Old Quarter', 2, 3],
  ['Shuttle Street', 'home', 3, 20, 4, 2, 1, 'Weavers Side', 1],
  ['Lower Gables', 'home', 29, 11, 6, 2, 3, 'Old Quarter', 1, 3],
  ['Thimble Street', 'home', 9, 13, 4, 2, 3, 'Weavers Side', 1],
  ['Mast Street', 'home', 49, 16, 4, 2, 3, 'Ropewalk', 2],
  ['Chart Offices', 'office', 30, 3, 4, 2, 4, 'North Gate', 2, 4],
  ['Ledger Offices', 'office', 9, 9, 4, 2, 4, 'Weavers Side', 2, 4],
  ['Wool Street', 'home', 9, 22, 4, 2, 3, 'Weavers Side', 2],
  ['Stone Quay', 'port', 30, 26, 6, 3, 4, 'Old Quarter', 1, 2],
  ['North Hospital', 'hospital', 43, 11, 4, 3, 5, 'Ropewalk', 1, 1],
  ['Bobbin Street', 'home', 3, 22, 4, 2, 4, 'Weavers Side', 1],
  ['Button Street', 'home', 3, 13, 4, 2, 3, 'Weavers Side', 1],
  ['Lantern Offices', 'office', 22, 3, 4, 2, 6, 'North Gate', 3, 3],
  ['Spindle Flats', 'home', 9, 26, 4, 2, 6, 'Weavers Side', 3],
  ['Sail Flats', 'home', 43, 24, 4, 2, 5, 'Ropewalk', 2],
  ['Rudder Flats', 'home', 49, 24, 4, 2, 7, 'Ropewalk', 1],
  ['Quill Offices', 'office', 3, 9, 4, 2, 7, 'Weavers Side', 1, 3],
  ['Compass House', 'office', 34, 3, 4, 2, 8, 'North Gate', 3, 3],
  ['Cooper Offices', 'office', 49, 9, 4, 2, 8, 'Ropewalk', 2, 4],
  ['Gate Flats', 'home', 16, 3, 4, 2, 9, 'North Gate', 1],
  ['Foghorn Arena', 'stadium', 9, 1, 6, 5, 9, 'Weavers Side', 1, 1],
];

const DEFAULT_MAX = 4;
export const LOTS: readonly LotDef[] = ROWS_DEF.map(([name, kind, gx, gy, w, h, opensYear, district, level = 1, maxLevel = DEFAULT_MAX]) =>
  ({ name, kind, gx, gy, w, h, opensYear, level, maxLevel, district }));
