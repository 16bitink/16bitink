import type { LotDef } from '../../src/sim/types';
import { HILLS_AT } from './map';

/** [kind, gx, gy, w, h, year, level, maxLevel]: names and districts are given out below. */
type Spec = readonly [kind: LotDef['kind'], gx: number, gy: number, w: number, h: number, year: number, level?: LotDef['level'], max?: LotDef['maxLevel']];

const WEST_CORE: readonly Spec[] = [
  // Year 1, the busy crossing: block after block of small lots, nothing but lots.
  ['market', 17, 11, 4, 3, 1, 1, 4],
  ['shops', 21, 11, 2, 2, 1, 1, 3], ['shops', 21, 13, 2, 2, 1, 1, 3],
  ['home', 7, 11, 2, 2, 1], ['home', 9, 11, 2, 2, 1], ['shops', 11, 11, 2, 2, 1, 1, 3], ['home', 13, 11, 2, 2, 1],
  ['home', 7, 13, 2, 2, 1], ['shops', 9, 13, 2, 2, 1, 1, 3], ['home', 11, 13, 2, 2, 1], ['home', 13, 13, 2, 2, 1],
  ['school', 17, 17, 4, 3, 1, 1, 2], ['shops', 21, 17, 2, 2, 1, 1, 3], ['shops', 21, 19, 2, 2, 1, 1, 3],
  ['home', 7, 17, 2, 2, 1], ['home', 9, 17, 2, 2, 1], ['home', 11, 17, 2, 2, 1], ['shops', 13, 17, 2, 2, 1, 1, 3],
  ['home', 7, 19, 2, 2, 1], ['shops', 9, 19, 2, 2, 1, 1, 3], ['home', 11, 19, 2, 2, 1], ['home', 13, 19, 2, 2, 1],
  ['home', 1, 11, 4, 2, 1], ['home', 1, 13, 4, 2, 1], ['home', 1, 17, 4, 2, 1], ['home', 1, 19, 4, 2, 1],
  ['home', 7, 7, 4, 2, 1], ['shops', 11, 7, 2, 2, 1, 1, 3], ['shops', 18, 7, 2, 2, 1, 1, 3],
  ['home', 7, 23, 4, 2, 1], ['home', 11, 23, 4, 2, 1], ['home', 7, 33, 4, 2, 1], ['home', 12, 33, 4, 2, 1],
];

const EAST_CORE: readonly Spec[] = [
  ['shops', 36, 11, 2, 2, 1, 1, 3], ['shops', 38, 11, 2, 2, 1, 1, 3], ['office', 36, 13, 4, 2, 1, 2, 4],
  ['office', 42, 11, 4, 2, 1, 2, 4], ['office', 42, 13, 4, 2, 1, 1, 4], ['office', 49, 11, 4, 2, 1, 1, 4], ['home', 49, 13, 4, 2, 1],
  ['school', 36, 17, 4, 3, 1, 1, 2],
  ['home', 42, 17, 4, 2, 1], ['home', 42, 19, 4, 2, 1], ['home', 49, 17, 4, 2, 1], ['home', 49, 19, 4, 2, 1],
  ['home', 42, 7, 4, 2, 1], ['home', 43, 33, 4, 2, 1], ['home', 49, 23, 4, 2, 1], ['home', 42, 23, 4, 2, 1],
];

/** Each year's blocks: 8 to 20 home cells early, more later. */
const LATER: readonly Spec[] = [
  // Year 2: both ends of the second bridge.
  ['office', 49, 33, 4, 2, 2, 1, 4], 
  // Year 3: the minibuses find riders on both slopes.
  ['home', 7, 25, 4, 2, 3], ['shops', 13, 7, 2, 2, 3, 1, 3], ['home', 24, 33, 4, 2, 3],
  // Year 4: the hospital on the new shore and the east side road.
  ['hospital', 36, 4, 4, 3, 4, 1, 1], ['home', 55, 11, 2, 2, 4], ['home', 55, 13, 2, 2, 4], ['home', 55, 17, 2, 2, 4], ['home', 55, 19, 2, 2, 4], ['shops', 55, 23, 2, 2, 4, 1, 3],
  // Year 5: the market on the hill with no room for a car park, and the north street.
  ['market', 37, 24, 4, 3, 5, 1, 4], ['home', 4, 5, 4, 2, 5], ['home', 8, 5, 4, 2, 5], ['shops', 12, 5, 2, 2, 5, 1, 3], ['office', 55, 25, 2, 2, 5, 1, 4],
  // Year 6: the school hill and its streets.
  ['school', 7, 27, 4, 3, 6, 1, 2], ['home', 11, 27, 4, 2, 6], ['home', 1, 23, 4, 2, 6], ['office', 55, 27, 2, 4, 6, 1, 4],
  // Year 7: the port, and flats where the toll will bite.
  ['port', 37, 32, 6, 3, 7, 1, 3], ['home', 18, 23, 4, 2, 7, 2], ['home', 18, 25, 4, 2, 7, 2],
  // Year 8: the stadium on the plain.
  ['stadium', 50, 3, 6, 5, 8, 1, 1], ['home', 37, 28, 4, 2, 8, 2], ['home', 45, 28, 2, 2, 8],
  // Year 9: the long stairs.
  ['home', 1, 29, 4, 2, 9, 2], ['shops', 49, 28, 2, 2, 9, 1, 3],
  // Year 10: the last flats.
  ['home', 53, 33, 4, 2, 10, 2],
];

const POOLS: Readonly<Record<string, readonly string[]>> = {
  home: ['Fig Terrace', 'Stair Street', 'Button Terrace', 'Goat Terrace', 'Tulip Terrace', 'Plum Terrace', 'Quince Terrace', 'Walnut Terrace', 'Balcony Street', 'Lemon Terrace', 'Landing Row',
    'Apricot Steps', 'Almond Steps', 'Mulberry Row', 'Thyme Row', 'Cumin Court', 'Sage Court', 'Clove Court', 'Anise Court', 'Fennel Court', 'Basil Steps', 'Poppy Steps', 'Iris Steps',
    'Lilac Row', 'Hazel Row', 'Maple Row', 'Cedar Row', 'Pine Row', 'Birch Court', 'Elm Court', 'Chestnut Steps', 'Cherry Steps', 'Pear Court', 'Lime Court', 'Mint Court', 'Dill Row',
    'Jasmine Terrace', 'Violet Terrace', 'Daisy Terrace', 'Rose Terrace', 'Laurel Steps', 'Bay Steps', 'Sorrel Row', 'Medlar Row', 'Peach Court', 'Olive Court', 'Pistachio Row', 'Cress Row',
    'Rowan Terrace', 'Aster Terrace', 'Ivy Steps', 'Wren Steps', 'Heron Court', 'Swift Court', 'Finch Row', 'Tern Row', 'Lark Terrace', 'Pigeon Terrace', 'Gull Steps', 'Stork Steps'],
  shops: ['Sesame Shops', 'Ferry Shops', 'Copper Shops', 'Lamp Shops', 'Rug Shops', 'Kettle Shops', 'Honey Shops', 'Stair Shops', 'Date Shops', 'Candle Shops', 'Pepper Shops', 'Tea Shops',
    'Bread Shops', 'Ribbon Shops', 'Cheese Shops', 'Button Shops', 'Spice Shops', 'Bell Shops', 'Nut Shops', 'Bazaar Shops', 'Soap Shops', 'Quill Shops', 'Net Shops', 'Thread Shops'],
  office: ['Compass Offices', 'Anchor Offices', 'Rope Offices', 'Chart Offices', 'Ledger Offices', 'Stamp Offices', 'Harbour Offices', 'Tide Offices', 'Knot Offices', 'Sail Offices',
    'Cog Offices', 'Quay Offices', 'Pulley Offices', 'Ink Offices', 'Abacus Offices', 'Seal Offices'],
  market: ['Cat Market', 'Hilltop Market'], school: ['Hill School', 'Stair School', 'Goat School'], hospital: ['Seven Hills Hospital'], stadium: ['Moonball Stadium'], port: ['Brass Port'],
};

const HILL_DIST = (gx: number, gy: number, w: number, h: number): string => {
  const cx = gx + w / 2; const cy = gy + h / 2;
  return [...HILLS_AT].sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0]!.name;
};

const used: Record<string, number> = {};
export const LOTS: readonly LotDef[] = [...WEST_CORE, ...EAST_CORE, ...LATER].map(([kind, gx, gy, w, h, opensYear, level = 1, maxLevel = 4]) => {
  const pool = POOLS[kind] ?? [];
  const i = used[kind] ?? 0;
  used[kind] = i + 1;
  return { name: pool[i] ?? `${kind} ${i}`, kind, gx, gy, w, h, opensYear, level, maxLevel, district: HILL_DIST(gx, gy, w, h) };
});
