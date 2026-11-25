import type { BeachDef, GateDef, LotDef, RoadDef, Terrain } from '../../src/sim/types';

/** Twin Isles: two round islands, a bridge, later a tunnel, and hardly a spare cell. 56 x 36 cells. */
const COLS = 56;
const ROWS = 36;
interface Isle { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number }
const WEST: Isle = { x: 13.5, y: 17.5, rx: 11.2, ry: 15.2 };
const EAST: Isle = { x: 42.3, y: 17.5, rx: 11.2, ry: 15.2 };
/** Gardens the islanders would rather drown than lose: [gx, gy, w, h]. */
const GARDENS: readonly (readonly [number, number, number, number])[] = [
  [8, 30, 3, 2], [17, 30, 3, 2], [3, 21, 1, 2], [37, 31, 2, 1], [44, 30, 3, 1], [51, 21, 1, 2], [32, 19, 0, 3],
];

const onIsle = (i: Isle, x: number, y: number): boolean => ((x - i.x) / i.rx) ** 4 + ((y - i.y) / i.ry) ** 4 <= 1;
const inGarden = (x: number, y: number): boolean => GARDENS.some(([gx, gy, w, h]) => x >= gx && x <= gx + w && y >= gy && y <= gy + h);

/** Sand on the south shores (the ferry causeway goes through a gap), and a wide corner of it in the south east. */
const isBeach = (x: number, y: number): boolean => (y >= 31 && (x < 41 || x > 43)) || (x >= 49 && y >= 26);

function terrainAt(x: number, y: number): Terrain {
  if (!onIsle(WEST, x, y) && !onIsle(EAST, x, y)) return '~';
  if (inGarden(x, y)) return 'p';
  return isBeach(x, y) ? 'b' : '.';
}

export const MAP: readonly string[] = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) => terrainAt(x, y)).join(''));

export const BEACHES: readonly BeachDef[] = [
  {
    id: 'lagoon', name: 'Lagoon Beach', gx: 49, gy: 26, w: 2, h: 4, decideYear: 5, share: 260, pull: 1.3,
    plots: [{ name: 'Snorkel House', kind: 'home', gx: 49, gy: 26, w: 2, h: 2 }, { name: 'Lilo House', kind: 'home', gx: 49, gy: 28, w: 2, h: 2 }],
  },
];

export const GATES: readonly GateDef[] = [
  { id: 'west', name: 'Long Causeway', cell: [0, 14], weight: 1.4 },
  { id: 'north', name: 'Reef Road', cell: [14, 0], weight: 1.1 },
  { id: 'south', name: 'Ferry Causeway', cell: [42, 35], weight: 1.2 },
  { id: 'east', name: 'Airfield Causeway', cell: [55, 14], weight: 2.8, opensYear: 4 },
];

export const ROADS_DEF: readonly RoadDef[] = [
  // Causeways.
  { cells: [[0, 14], [4, 14]], type: 'highway', fixed: true },
  { cells: [[14, 0], [14, 4]], type: 'highway', fixed: true },
  { cells: [[42, 32], [42, 35]], type: 'highway', fixed: true },
  { cells: [[52, 14], [55, 14]], type: 'highway', fixed: true },
  // West isle.
  { cells: [[4, 14], [14, 14]], type: 'street' },
  { cells: [[14, 14], [23, 14]], type: 'street' },
  { cells: [[14, 4], [14, 14]], type: 'street' },
  { cells: [[14, 14], [14, 30]], type: 'street' },
  { cells: [[7, 7], [21, 7]], type: 'street' },
  { cells: [[7, 24], [23, 24]], type: 'street' },
  // The bridge.
  { cells: [[23, 14], [33, 14]], type: 'street' },
  // East isle.
  { cells: [[33, 14], [42, 14]], type: 'street' },
  { cells: [[42, 14], [52, 14]], type: 'street' },
  { cells: [[42, 5], [42, 14]], type: 'street' },
  { cells: [[42, 14], [42, 32]], type: 'street' },
  { cells: [[36, 7], [49, 7]], type: 'street' },
  { cells: [[34, 24], [49, 24]], type: 'street' },
  // Year 5: the tunnel.
  { cells: [[23, 24], [34, 24]], type: 'avenue', opensYear: 5, tunnel: true },
  // Years 6 and 7: the side roads.
  { cells: [[7, 7], [7, 24]], type: 'street', opensYear: 6 },
  { cells: [[49, 7], [49, 24]], type: 'street', opensYear: 7 },
  // Year 8: the inner roads.
  { cells: [[21, 7], [21, 24]], type: 'street', opensYear: 8 },
  { cells: [[36, 7], [36, 24]], type: 'street', opensYear: 9 },
];

type Row = readonly [name: string, kind: LotDef['kind'], gx: number, gy: number, w: number, h: number, year: number, district: string, level?: LotDef['level'], max?: LotDef['maxLevel']];

const ROWS_DEF: readonly Row[] = [
  // Year 1, west: homes round the market. East: the first offices.
  ['Lantern Market', 'market', 16, 10, 4, 3, 1, 'Lantern Side', 1, 4],
  ['Orchid Row', 'home', 8, 11, 4, 2, 1, 'Lantern Side'],
  ['Rain Tree Row', 'home', 8, 8, 4, 2, 1, 'Lantern Side'],
  ['Mango Court', 'home', 16, 8, 4, 2, 1, 'Lantern Side'],
  ['Cinnamon Court', 'home', 9, 4, 4, 2, 1, 'Lantern Side'],
  ['Noodle Shops', 'shops', 16, 4, 2, 2, 1, 'Lantern Side', 1, 3],
  ['Cocoa Row', 'home', 8, 17, 4, 2, 1, 'Tea Side'],
  ['Teapot Street', 'home', 8, 19, 4, 2, 1, 'Tea Side'],
  ['Kettle Street', 'home', 16, 17, 4, 2, 1, 'Tea Side'],
  ['Isle School', 'school', 16, 20, 4, 3, 1, 'Tea Side', 1, 2],
  ['Biscuit Lane', 'home', 8, 25, 4, 2, 1, 'Tea Side'],
  ['Saucer Lane', 'home', 16, 25, 4, 2, 1, 'Tea Side'],
  ['Umbrella Shops', 'shops', 9, 21, 2, 2, 1, 'Tea Side', 1, 3],
  ['Folded Offices', 'office', 37, 11, 4, 2, 1, 'Glass Side', 2, 4],
  ['Abacus Offices', 'office', 44, 11, 4, 2, 1, 'Glass Side', 1, 4],
  ['Mirror Row', 'home', 37, 8, 4, 2, 1, 'Glass Side'],
  ['Crane Row', 'home', 44, 17, 4, 2, 1, 'Glass Side'],
  ['Glass Shops', 'shops', 38, 16, 2, 2, 1, 'Glass Side', 1, 3],
  ['Cloud Row', 'home', 44, 25, 4, 2, 1, 'Palm Point'],
  ['Pebble Row', 'home', 37, 25, 4, 2, 1, 'Palm Point'],
  // Year 2
  ['Silk Market', 'market', 37, 20, 4, 3, 2, 'Glass Side', 1, 4],
  ['Lotus Court', 'home', 16, 27, 4, 2, 2, 'Tea Side'],
  ['Tide Court', 'home', 44, 21, 4, 2, 2, 'Glass Side'],
  // Year 3
  ['Anemone Flats', 'home', 44, 27, 4, 2, 3, 'Palm Point', 2],
  ['Banyan Flats', 'home', 8, 27, 4, 2, 3, 'Tea Side', 2],
  ['Ladle Shops', 'shops', 22, 21, 2, 2, 3, 'Tea Side', 1, 3],
  // Year 4
  ['Star Offices', 'office', 46, 8, 2, 2, 3, 'Glass Side', 4, 4],
  ['Isle Hospital', 'hospital', 37, 3, 4, 3, 4, 'Glass Side', 1, 1],
  // Year 5: round the tunnel mouths.
  ['Pelican Offices', 'office', 44, 3, 4, 2, 5, 'Glass Side', 3, 4],
  ['Papaya Flats', 'home', 22, 25, 2, 2, 5, 'Tea Side', 2],
  // Year 6: the west side road.
  ['Reed Flats', 'home', 4, 8, 2, 4, 6, 'Lantern Side', 3],
  ['Clove Flats', 'home', 4, 16, 2, 4, 6, 'Tea Side', 3],
  ['Suitcase Offices', 'office', 44, 19, 4, 2, 6, 'Airfield Side', 3, 4],
  // Year 7: the airfield side and the waterfront.
  ['Runway Flats', 'home', 50, 8, 2, 4, 7, 'Airfield Side', 4],
  ['Windsock Flats', 'home', 50, 16, 2, 4, 7, 'Airfield Side', 4],
  ['Pearl Port', 'port', 34, 27, 6, 3, 7, 'Palm Point', 1, 3],
  // Year 8
  ['Comet Offices', 'office', 22, 16, 2, 4, 8, 'Bridge End', 4, 4],
  ['Ginger Flats', 'home', 22, 8, 2, 4, 8, 'Bridge End', 4],
  // Year 9
  ['Harbour Glass', 'office', 33, 16, 2, 4, 9, 'Bridge End', 4, 4],
  ['Moon Flats', 'home', 33, 8, 2, 4, 9, 'Bridge End', 4],
];

const DEFAULT_MAX = 4;
/** The islands build homes up to the height of a rain tree and stop. */
const HOME_MAX = 3;
export const LOTS: readonly LotDef[] = ROWS_DEF.map(([name, kind, gx, gy, w, h, opensYear, district, level = 1, maxLevel = kind === 'home' ? HOME_MAX : DEFAULT_MAX]) =>
  ({ name, kind, gx, gy, w, h, opensYear, level, maxLevel, district }));
