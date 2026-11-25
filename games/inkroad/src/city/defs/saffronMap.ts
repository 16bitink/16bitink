import type { BeachDef, GateDef, LotDef, RoadDef, Terrain } from '../../sim/types';

/** Saffron Bay's ground, roads and blocks. 56 x 38 cells; the busy crossroads is at (22, 18). */
export const COLS = 56;
export const ROWS = 38;
export const CREEK_WEST = 37;
export const CREEK_EAST = 40;

/** Sea depth (rows) at each column: a wavy beach. */
const seaDepth = (x: number): number => (x >= CREEK_WEST - 8 && x <= CREEK_EAST + 2 ? 3 : 2 + Math.round(1 + Math.sin(x * 0.55)));

/** Sand all along the sea (a thin strip by the port), and one stretch of the creek's west bank. */
const isBeach = (x: number, y: number): boolean =>
  y <= (x >= 29 && x <= CREEK_EAST + 2 ? 3 : 4) || (x >= CREEK_WEST - 3 && x < CREEK_WEST && y >= 29 && y <= 36);

function terrainAt(x: number, y: number): Terrain {
  if (y < seaDepth(x)) return '~';
  const bulge = y > 26 ? 1 : 0;
  if (x >= CREEK_WEST && x <= CREEK_EAST + (y % 9 === 4 ? 1 : 0) + bulge) return '~';
  if (x >= CREEK_EAST + 3 && x <= CREEK_EAST + 5 && y >= 33) return 'p';
  if (x >= 52 && y >= 31 && x + y >= 85) return '#';
  if (x <= 1 && y >= 22 && y <= 28) return '#';
  if (isBeach(x, y)) return 'b';
  return '.';
}

export const MAP: readonly string[] = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) => terrainAt(x, y)).join(''));

export const BEACHES: readonly BeachDef[] = [
  {
    id: 'pearl', name: 'Pearl Beach', gx: 6, gy: 3, w: 6, h: 2, decideYear: 3, share: 130,
    plots: [
      { name: 'Oyster House', kind: 'home', gx: 6, gy: 3, w: 2, h: 2 }, { name: 'Sandcastle House', kind: 'home', gx: 8, gy: 3, w: 2, h: 2 },
      { name: 'Parasol House', kind: 'home', gx: 10, gy: 3, w: 2, h: 2 },
    ],
  },
  {
    id: 'creek', name: 'Creek Beach', gx: 34, gy: 29, w: 2, h: 6, decideYear: 6, share: 220,
    plots: [
      { name: 'Driftwood House', kind: 'home', gx: 34, gy: 29, w: 2, h: 2 }, { name: 'Paddle House', kind: 'home', gx: 34, gy: 31, w: 2, h: 2 },
      { name: 'Mudskipper House', kind: 'home', gx: 34, gy: 33, w: 2, h: 2 },
    ],
  },
];

export const GATES: readonly GateDef[] = [
  { id: 'west', name: 'Dune Road', cell: [0, 18], weight: 1 },
  { id: 'south', name: 'South Road', cell: [22, 37], weight: 1.1 },
  { id: 'east', name: 'Far Shore Road', cell: [55, 18], weight: 0.8 },
  { id: 'north', name: 'Airfield Road', cell: [0, 6], weight: 1.2, opensYear: 4 },
];

export const ROADS_DEF: readonly RoadDef[] = [
  // The start: a cross of streets, four ways in.
  { cells: [[0, 18], [4, 18]], type: 'highway', fixed: true },
  { cells: [[4, 18], [22, 18]], type: 'street' },
  { cells: [[22, 18], [22, 8]], type: 'street' },
  { cells: [[14, 8], [30, 8]], type: 'street' },
  { cells: [[22, 18], [22, 33]], type: 'street' },
  { cells: [[22, 33], [22, 37]], type: 'highway', fixed: true },
  { cells: [[22, 18], [36, 18]], type: 'street' },
  { cells: [[36, 18], [41, 18]], type: 'street' },
  { cells: [[41, 18], [53, 18]], type: 'street' },
  { cells: [[53, 18], [55, 18]], type: 'highway', fixed: true },
  { cells: [[12, 24], [32, 24]], type: 'street' },
  { cells: [[12, 30], [22, 30]], type: 'street' },
  { cells: [[0, 6], [4, 6]], type: 'highway', fixed: true },
  // Year 4: the office district.
  { cells: [[4, 6], [7, 6], [8, 7], [8, 18]], type: 'avenue', opensYear: 4 },
  { cells: [[8, 8], [14, 8]], type: 'street', opensYear: 4 },
  // Year 5: the south east.
  { cells: [[32, 24], [33, 25], [33, 29], [32, 30], [22, 30]], type: 'street', opensYear: 5 },
  // Year 6: the port and the stadium.
  { cells: [[34, 8], [34, 18]], type: 'street', opensYear: 6 },
  // Year 7: the far shore.
  { cells: [[45, 8], [45, 30]], type: 'avenue', opensYear: 7 },
  { cells: [[45, 12], [54, 12]], type: 'street', opensYear: 7 },
  { cells: [[45, 24], [54, 24]], type: 'street', opensYear: 7 },
  // Year 8: the mall's road.
  { cells: [[12, 24], [10, 24], [10, 29]], type: 'street', opensYear: 8 },
  // Year 10: the fairground.
  { cells: [[10, 29], [10, 35]], type: 'street', opensYear: 10 },
];

type Row = readonly [name: string, kind: LotDef['kind'], gx: number, gy: number, w: number, h: number, year: number, district: string, level?: LotDef['level'], max?: LotDef['maxLevel']];

const ROWS_DEF: readonly Row[] = [
  // Year 1: villas, a market, a school.
  ['Palm Row', 'home', 17, 20, 4, 2, 1, 'Palm Town'],
  ['Date Court', 'home', 13, 21, 4, 2, 1, 'Palm Town'],
  ['Fig Lane', 'home', 24, 19, 4, 2, 1, 'Palm Town'],
  ['Lime Corner', 'home', 29, 21, 2, 2, 2, 'Palm Town'],
  ['Acacia Gardens', 'home', 17, 25, 4, 2, 2, 'Palm Town'],
  ['Saltbush Street', 'home', 13, 25, 4, 2, 3, 'Palm Town'],
  ['Henna Square', 'home', 26, 25, 2, 2, 4, 'Palm Town'],
  ['Dune View', 'home', 11, 15, 4, 2, 1, 'West Sands'],
  ['Lantern Street', 'home', 13, 19, 4, 2, 1, 'West Sands'],
  ['Pearl Villas', 'home', 24, 5, 4, 2, 1, 'Market'],
  ['Gull Villas', 'home', 17, 5, 4, 2, 1, 'Market'],
  ['Pepper Market', 'market', 23, 10, 4, 3, 1, 'Market', 1, 4],
  ['Ladder Shops', 'shops', 17, 15, 2, 2, 1, 'Market', 1, 3],
  ['Button Shops', 'shops', 24, 25, 2, 2, 1, 'Palm Town', 1, 3],
  ['Saffron School', 'school', 27, 14, 4, 3, 1, 'Palm Town', 1, 2],
  ['Kite Street', 'home', 15, 15, 2, 2, 1, 'West Sands'],
  ['Reed Court', 'home', 25, 15, 2, 2, 1, 'Palm Town'],
  ['Cedar Court', 'home', 23, 21, 4, 2, 1, 'Palm Town'],
  ['Stamp Office', 'office', 23, 13, 2, 2, 1, 'Market', 1, 2],
  ['Thimble Shops', 'shops', 19, 13, 2, 2, 1, 'Market', 1, 2],
  ['Little Park', 'park', 28, 19, 2, 2, 1, 'Palm Town', 1, 1],
  // Year 2: the market doubles.
  ['Carpet Market', 'market', 17, 10, 4, 3, 2, 'Market', 2, 4],
  ['Beach Shops', 'shops', 14, 5, 2, 2, 2, 'Market', 1, 3],
  ['Mint Row', 'home', 29, 25, 2, 2, 3, 'Palm Town'],
  ['Cumin Court', 'home', 17, 31, 4, 2, 5, 'Palm Town', 2],
  // Year 3
  ['Sandal Street', 'home', 12, 31, 4, 2, 6, 'Palm Town'],
  ['Pearl Shops', 'shops', 28, 5, 2, 2, 3, 'Market', 1, 3],
  ['Creek Villas', 'home', 30, 19, 4, 2, 1, 'Creekside'],
  // Year 4: offices.
  ['Blueprint Offices', 'office', 9, 9, 4, 4, 4, 'Office District', 2, 4],
  ['Paperclip Offices', 'office', 3, 9, 4, 4, 4, 'Office District', 1, 4],
  // Year 5: the south east.
  ['Stapler Offices', 'office', 3, 13, 4, 4, 5, 'Office District', 2, 4],
  ['Rosewater Flats', 'home', 24, 27, 4, 2, 5, 'South Gardens', 2],
  ['Almond Flats', 'home', 28, 31, 4, 2, 5, 'South Gardens', 2],
  ['Bay Hospital', 'hospital', 23, 31, 4, 3, 5, 'South Gardens', 1, 1],
  // Year 6: port and stadium.
  ['Anchor Port', 'port', 30, 4, 6, 3, 6, 'Port', 2, 3],
  ['Harbour Flats', 'home', 31, 8, 2, 4, 6, 'Port', 2],
  ['Crate Offices', 'office', 31, 12, 2, 2, 6, 'Port', 2, 4],
  ['Moonball Stadium', 'stadium', 3, 19, 6, 5, 6, 'West Sands', 1, 1],
  ['Ink Offices', 'office', 10, 5, 4, 2, 6, 'Office District', 2, 4],
  ['Ferry Flats', 'home', 34, 25, 2, 2, 6, 'Creekside', 2],
  // Year 7: the far shore.
  ['Heron Court', 'home', 46, 9, 4, 2, 7, 'Far Shore', 2],
  ['Egret Court', 'home', 50, 9, 4, 2, 7, 'Far Shore', 2],
  ['Wader Flats', 'home', 46, 13, 4, 2, 7, 'Far Shore', 2],
  ['Far Shore Offices', 'office', 46, 15, 4, 2, 6, 'Far Shore', 2, 4],
  ['Mangrove Shops', 'shops', 46, 19, 4, 2, 6, 'Far Shore', 2, 3],
  ['Tide Row', 'home', 46, 21, 4, 2, 7, 'Far Shore', 2],
  ['Shell Row', 'home', 50, 21, 4, 2, 7, 'Far Shore', 2],
  // Year 8: the mall.
  ['The Great Mall', 'mall', 3, 25, 6, 4, 8, 'West Sands', 2, 4],
  ['Breeze Towers', 'home', 50, 13, 4, 2, 9, 'Far Shore', 3],
  ['Sunbird Flats', 'home', 46, 25, 4, 2, 8, 'Far Shore', 1],
  ['Salt Flats', 'home', 28, 27, 4, 2, 8, 'South Gardens', 2],
  // Year 9
  ['Compass Offices', 'office', 50, 15, 4, 2, 9, 'Far Shore', 4, 4],
  ['Far Shore School', 'school', 46, 27, 4, 3, 9, 'Far Shore', 1, 2],
  ['Jasmine Flats', 'home', 42, 20, 2, 2, 9, 'Far Shore', 3],
  // Year 10
  ['Coral Towers', 'home', 51, 25, 4, 2, 9, 'Far Shore', 3],
  ['The Grand Fair', 'fair', 3, 30, 6, 5, 10, 'West Sands', 1, 1],
];

const DEFAULT_MAX = 4;
export const LOTS: readonly LotDef[] = ROWS_DEF.map(([name, kind, gx, gy, w, h, opensYear, district, level = 1, maxLevel = DEFAULT_MAX]) =>
  ({ name, kind, gx, gy, w, h, opensYear, level, maxLevel, district }));
