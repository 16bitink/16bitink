import type { GateDef, LotDef, RoadDef, Terrain } from '../../src/sim/types';

/**
 * Cross Rivers: two rivers meet in the middle, and an old freeway runs straight through everybody's garden. 60 x 38 cells.
 * Blocks are 6 cells square (streets every 6), so every plot has a street at its door; the freeway is touched only at x = 18 and x = 43.
 */
const COLS = 60;
const ROWS = 38;
const FREEWAY_Y = 22;

/** The long river runs east to west across the top; the short one comes down from it. */
const longRiver = (x: number): number => 11 + Math.round(1.2 * Math.sin(x * 0.2));
const shortRiver = (y: number): number => 36 + Math.round(1.3 * Math.sin(y * 0.25));

function terrainAt(x: number, y: number): Terrain {
  const r = longRiver(x);
  if (y >= r && y <= r + 1) return '~';
  const s = shortRiver(y);
  return y > r && x >= s && x <= s + 2 ? '~' : '.';
}

export const MAP: readonly string[] = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) => terrainAt(x, y)).join(''));

export const GATES: readonly GateDef[] = [
  { id: 'west', name: 'Prairie Road', cell: [0, 22], weight: 1.6 },
  { id: 'east', name: 'Lake Road', cell: [59, 22], weight: 1.6 },
  { id: 'north', name: 'Mill Road', cell: [18, 0], weight: 2.6 },
  { id: 'south', name: 'Corn Road', cell: [18, 37], weight: 2.6 },
];

type Cell = readonly [number, number];
type Def = RoadDef;
const hw = (a: Cell, b: Cell, extra: Partial<Def> = {}): Def => ({ cells: [a, b], type: 'highway', ...extra });
const st = (a: Cell, b: Cell, extra: Partial<Def> = {}): Def => ({ cells: [a, b], type: 'street', ...extra });

/** A vertical street over the long river, split at the banks. */
function overLongRiver(x: number, top: number, bottom: number, wear: number): readonly Def[] {
  const r = longRiver(x);
  return [st([x, top], [x, r - 1]), st([x, r - 1], [x, r + 2], { condition: wear }), st([x, r + 2], [x, bottom])];
}

/** A horizontal street over the short river, split at the banks. */
function overShortRiver(y: number, left: number, right: number, extra: Partial<Def> = {}): readonly Def[] {
  const s = shortRiver(y);
  return [st([left, y], [s - 1, y], extra), st([s - 1, y], [s + 3, y], extra), st([s + 3, y], [right, y], extra)];
}

/** `condition` is how worn a piece is at the start (1 new). Gate stubs are fixed; every other highway cell is the freeway that may go. */
export const ROADS_DEF: readonly RoadDef[] = [
  hw([0, 22], [3, 22], { fixed: true, condition: 0.90 }),
  hw([56, 22], [59, 22], { fixed: true, condition: 0.90 }),
  hw([18, 0], [18, 2], { fixed: true, condition: 0.90 }),
  hw([18, 34], [18, 37], { fixed: true, condition: 0.90 }),
  // The freeway, in pieces: only two places to get on besides the gates.
  hw([3, FREEWAY_Y], [9, FREEWAY_Y], { condition: 0.62 }),
  hw([9, FREEWAY_Y], [18, FREEWAY_Y], { condition: 0.60 }),
  hw([18, FREEWAY_Y], [31, FREEWAY_Y], { condition: 0.58 }),
  hw([31, FREEWAY_Y], [43, FREEWAY_Y], { condition: 0.46 }),
  hw([43, FREEWAY_Y], [56, FREEWAY_Y], { condition: 0.60 }),
  // North bank.
  st([18, 2], [18, longRiver(18) - 1], { condition: 0.86 }),
  st([6, 6], [18, 6], { condition: 0.86 }), st([18, 6], [43, 6], { condition: 0.86 }), st([43, 6], [54, 6], { condition: 0.86 }),
  // The two old bridges over the long river.
  ...overLongRiver(18, 2, 16, 0.4).slice(1),
  ...overLongRiver(43, 6, 16, 0.46),
  // West blocks: streets every 6 cells, none of them touching the freeway.
  st([6, 16], [30, 16], { condition: 0.86 }), st([6, 28], [30, 28], { condition: 0.86 }), st([6, 34], [30, 34], { condition: 0.86 }),
  st([18, 16], [18, 22], { condition: 0.86 }), st([18, 22], [18, 34], { condition: 0.86 }),
  ...[6, 12, 24, 30].flatMap((x) => [st([x, 16], [x, 21], { condition: 0.86 }), st([x, 23], [x, 34], { condition: 0.86 })]),
  // East blocks.
  st([43, 16], [55, 16], { condition: 0.86 }), st([43, 28], [55, 28], { condition: 0.86 }),
  st([43, 16], [43, 22], { condition: 0.86 }), st([43, 22], [43, 33], { condition: 0.86 }),
  st([49, 16], [49, 21], { condition: 0.86 }), st([49, 23], [49, 28], { condition: 0.86 }),
  st([55, 16], [55, 21], { condition: 0.86 }), st([55, 23], [55, 28], { condition: 0.86 }),
  // Council roads: a second way over the short river (year 6), and a third (year 8).
  ...overShortRiver(16, 30, 43, { opensYear: 6 }),
  ...overShortRiver(28, 30, 43, { opensYear: 8 }),
];

type Row = readonly [name: string, kind: LotDef['kind'], gx: number, gy: number, w: number, h: number, year: number, district: string, level?: LotDef['level'], max?: LotDef['maxLevel']];

const ROWS_DEF: readonly Row[] = [
  // Year 1, north of the freeway: homes, the offices in the middle, more homes.
  ['Porch Street', 'home', 7, 17, 2, 2, 1, 'Forks'],
  ['Stoop Street', 'home', 9, 17, 2, 2, 1, 'Forks'],
  ['Swing Street', 'home', 7, 19, 2, 2, 1, 'Forks'],
  ['Hammock Shops', 'shops', 9, 19, 2, 2, 1, 'Forks', 1, 2],
  ['Pine Nook', 'home', 13, 17, 2, 2, 1, 'Forks'],
  ['Oak Nook', 'home', 15, 17, 2, 2, 1, 'Forks'],
  ['Fir Nook', 'home', 13, 19, 2, 2, 1, 'Forks'],
  ['Ash Nook', 'home', 15, 19, 2, 2, 1, 'Forks'],
  ['Gasket Row', 'home', 19, 17, 2, 2, 1, 'Mill Row'],
  ['Rivet Row', 'home', 21, 17, 2, 2, 1, 'Mill Row'],
  ['Hinge Row', 'home', 19, 19, 2, 2, 1, 'Mill Row'],
  ['Cog Row', 'home', 21, 19, 2, 2, 1, 'Mill Row'],
  ['Rocker Row', 'home', 25, 17, 2, 2, 1, 'Mill Row'],
  ['Swivel Row', 'home', 27, 17, 2, 2, 1, 'Mill Row'],
  ['Mailbox Row', 'home', 25, 19, 2, 2, 1, 'Mill Row'],
  ['Birdbath Shops', 'shops', 27, 19, 2, 2, 1, 'Mill Row', 1, 2],
  // Year 1, south of the freeway.
  ['Lantern Shops', 'shops', 9, 23, 2, 2, 1, 'Southside', 1, 2],
  ['Quoit Row', 'home', 9, 25, 2, 2, 1, 'Southside'],
  ['Willow Offices', 'office', 13, 23, 2, 2, 1, 'Southside', 2, 4],
  ['Elm Offices', 'office', 15, 23, 2, 2, 1, 'Southside', 2, 4],
  ['Corner Shops', 'shops', 13, 25, 2, 2, 1, 'Southside', 1, 2],
  ['Dime Shops', 'shops', 15, 25, 2, 2, 1, 'Southside', 1, 2],
  ['Bean Market', 'market', 19, 24, 4, 3, 1, 'Southside', 1, 4],
  // Year 1, the edges.
  ['Barn Street', 'home', 7, 1, 4, 4, 1, 'North Bank'],
  ['Silo Street', 'home', 7, 7, 4, 2, 1, 'North Bank'],
  ['Spoke Offices', 'office', 19, 7, 4, 2, 1, 'North Bank', 2, 4],
  ['Cider Row', 'home', 44, 17, 4, 2, 1, 'East Fork'],
  ['Wicker Row', 'home', 44, 19, 4, 2, 1, 'East Fork'],
  ['Pancake Shops', 'shops', 50, 17, 2, 2, 1, 'East Fork', 1, 2],
  ['Syrup Shops', 'shops', 52, 17, 2, 2, 1, 'East Fork', 1, 2],
  ['Pickle Offices', 'office', 44, 23, 4, 2, 1, 'East Fork', 1, 4],
  ['Acorn Row', 'home', 44, 25, 4, 2, 1, 'East Fork'],
  ['Maple Row', 'home', 7, 29, 4, 2, 1, 'Southside'],
  // Year 2
  ['Thistle Row', 'home', 50, 19, 4, 2, 3, 'East Fork'],
  ['Rivers School', 'school', 13, 29, 4, 3, 2, 'Southside', 1, 2],
  ['Plank Row', 'home', 7, 31, 4, 2, 1, 'Southside'],
  // Year 3: the Council pays for bridges, and the north bank fills in.
  ['Hatch Row', 'home', 13, 1, 4, 4, 1, 'North Bank'],
  ['Loom Row', 'home', 13, 7, 4, 2, 1, 'North Bank'],
  ['Spindle Row', 'home', 19, 29, 4, 2, 1, 'Southside'],
  // Year 4
  ['Kiln Offices', 'office', 25, 7, 4, 2, 4, 'North Bank', 2, 4],
  ['Brick Shops', 'shops', 25, 3, 2, 2, 4, 'North Bank', 1, 2],
  ['Rivers Hospital', 'hospital', 37, 2, 4, 3, 4, 'North Bank', 1, 1],
  // Year 5: the yellow bus lines.
  ['Quilt Row', 'home', 19, 31, 4, 2, 1, 'Southside'],
  ['Thimble Row', 'home', 25, 29, 4, 2, 2, 'Southside'],
  ['Barley Row', 'home', 25, 31, 4, 2, 3, 'Southside'],
  // Year 6: the stadium and the second bridge.
  ['Cornfield Stadium', 'stadium', 46, 29, 6, 5, 6, 'East Fork', 1, 3],
  ['Weir Shops', 'shops', 40, 17, 2, 2, 6, 'East Fork', 1, 2],
  ['Sluice Row', 'home', 40, 19, 2, 2, 6, 'East Fork'],
  // Year 7
  ['Dock Row', 'home', 44, 1, 4, 4, 5, 'Lake Side'],
  ['Loft Row', 'home', 44, 7, 4, 2, 5, 'Lake Side'],
  // Year 8: the third bridge.
  ['Bobbin Row', 'home', 50, 7, 4, 2, 7, 'Lake Side'],
  ['Cleat Row', 'home', 50, 1, 4, 4, 7, 'Lake Side'],
  ['Ferry Shops', 'shops', 40, 29, 2, 2, 8, 'Southside', 1, 2],
  ['Tug Row', 'home', 40, 31, 2, 2, 8, 'Southside'],
  // Year 9: the old mill becomes offices.
  ['Mill Offices', 'office', 31, 7, 4, 2, 9, 'North Bank', 3, 4],
  ['Mill Shops', 'shops', 31, 3, 2, 2, 9, 'North Bank', 1, 2],
  ['Yard Row', 'home', 37, 7, 4, 2, 9, 'North Bank'],
  // Year 10
  ['Weir Offices', 'office', 40, 23, 2, 2, 10, 'East Fork', 2, 4],
];

const DEFAULT_MAX = 3;
/** Old homes stay low (the freeway keeps their windows shut); homes built later may grow one storey more. */
const OLD_HOME_MAX = 2;
const NEW_HOME_MAX = 3;
const ageLimit = (kind: LotDef['kind'], year: number): LotDef['maxLevel'] => (kind !== 'home' ? DEFAULT_MAX : year <= 1 ? OLD_HOME_MAX : NEW_HOME_MAX);
/** Home lots that fill the depth between two roads: the plots stand in the north two rows, the south two are their front garden. */
const GARDENS: ReadonlySet<string> = new Set(['Barn Street', 'Hatch Row', 'Dock Row', 'Cleat Row']);
export const LOTS: readonly LotDef[] = ROWS_DEF.map(([name, kind, gx, gy, w, h, opensYear, district, level = 1, maxLevel = ageLimit(kind, opensYear)]) =>
  ({ name, kind, gx, gy, w, h, opensYear, level, maxLevel, district, ...(GARDENS.has(name) ? { garden: true } : {}) }));
