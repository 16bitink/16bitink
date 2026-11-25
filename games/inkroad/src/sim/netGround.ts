/** What the ground says to a new road: terrain, beaches, buildings. Every refusal names what is there. */
import type { Cell, CellRect, RoadType, Terrain } from './types';
import type { Network } from './trafficTypes';

export interface Refusal { readonly why: string; readonly at: CellRect }
/** What stands at a vertex: a named refusal, or true for "something". */
export type Blocked = (c: Cell) => Refusal | boolean | null;

/** A bridge may cross this much sand on its way to the water, cells. */
export const BEACH_RUN = 2;

/** The square of one vertex. */
export const vertexRect = (c: Cell): CellRect => ({ gx: c.gx - 0.5, gy: c.gy - 0.5, w: 1, h: 1 });
export const refuse = (why: string, c: Cell): Refusal => ({ why, at: vertexRect(c) });

export function terrainAt(net: Pick<Network, 'terrain' | 'width' | 'height'>, c: Cell): Terrain | null {
  return net.terrain[c.gy]?.[c.gx] ?? null;
}

export function checkGround(net: Network, cells: readonly Cell[], type: RoadType, blocked: Blocked): Refusal | null {
  for (const c of cells) {
    const t = terrainAt(net, c);
    if (t === null) return refuse('That is off the map', c);
    if (t === '#') return refuse('Rock and old walls: no road fits here', c);
    if (t === 'p') return refuse('The park is protected', c);
    if (t === 'h' && type !== 'street') return refuse('Old quarter: only a street fits here', c);
    const hit = blocked(c);
    if (hit) return hit === true ? refuse('A building is in the way', c) : hit;
  }
  return checkBeach(net, cells);
}

const dirOf = (a: Cell, b: Cell): string => `${b.gx - a.gx},${b.gy - a.gy}`;
const same = (a: Cell, b: Cell): boolean => a.gx === b.gx && a.gy === b.gy;

/** Straight through the run, its neighbours on both sides included. */
function straight(cells: readonly Cell[], from: number, to: number): boolean {
  const a = Math.max(1, from), b = Math.min(cells.length - 1, to + 1);
  for (let i = a + 1; i <= b; i++) if (dirOf(cells[i - 1]!, cells[i]!) !== dirOf(cells[i - 2]!, cells[i - 1]!)) return false;
  return true;
}

/** Sand is protected, but a bridge has to land somewhere: a short straight run onto water or onto a highway that is here already. */
export function checkBeach(net: Network, cells: readonly Cell[]): Refusal | null {
  const sandy = (c: Cell | undefined): boolean => c !== undefined && terrainAt(net, c) === 'b';
  const onFixed = (c: Cell): boolean => net.roads.some((r) => r.fixed && !r.flyover && r.cells.some((x) => same(x, c)));
  for (let i = 0; i < cells.length; i++) {
    if (!sandy(cells[i])) continue;
    let end = i;
    while (sandy(cells[end + 1])) end += 1;
    const before = cells[i - 1], after = cells[end + 1];
    const wet = [before, after].some((c) => c !== undefined && terrainAt(net, c) === '~');
    const joins = cells.slice(i, end + 1).some(onFixed);
    if ((!wet && !joins) || end - i + 1 > BEACH_RUN || !straight(cells, i, end)) return refuse('The beach is protected', cells[i]!);
    i = end;
  }
  return null;
}

export function checkWater(net: Network, cells: readonly Cell[]): Refusal | null {
  const wet = cells.map((c) => terrainAt(net, c) === '~');
  const last = cells.length - 1;
  if (wet[0] || wet[last]) return refuse('Water: a bridge needs land at both ends', cells[wet[0] ? 0 : last]!);
  for (let i = 1; i < last; i++) {
    if (wet[i] && dirOf(cells[i - 1]!, cells[i]!) !== dirOf(cells[i]!, cells[i + 1]!)) return refuse('Water: bridges must be straight', cells[i]!);
  }
  return null;
}
