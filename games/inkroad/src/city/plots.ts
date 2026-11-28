import type { CellRect, Lot, Terrain } from '../sim/types';
import type { Block } from './geometry';
import { builtArea, blocksMeet, centreOf, distPt, lotRect, vertexInBlock } from './geometry';
import { earn } from './money';
import { blockAccess, wideFrontageReach } from './net';
import { CELL } from '../sim/constants';
import type { City } from './state';
import { emit } from './state';
import { defCells, DROPPED, holdsGround, isDue } from './standing';
import { PARKS } from './tune';
import { meetsRoadReserve } from './validateRoadRoom';
import { frontageRows } from './validateLayout';

/**
 * The Master Plan's plots. Two years before it opens a plot is drawn on the
 * map and keeps its ground. Before that it keeps nothing: if the player's road
 * or car park is there when it would be drawn, it moves to the nearest free
 * place, or shrinks, or is dropped and its people squeeze in next door.
 */
const MAX_MOVE = 16; // cells
const SMALL = 2;
/** One neighbour grows a step for each of these cells of a dropped plot. */
const CELLS_PER_STEP = 8;

const vertices = (b: Block): { gx: number; gy: number }[] => {
  const out: { gx: number; gy: number }[] = [];
  for (let gy = b.gy; gy <= b.gy + b.h; gy++) for (let gx = b.gx; gx <= b.gx + b.w; gx++) out.push({ gx, gy });
  return out;
};

/** Does a road or a car park of the player's (or another plot) stand on this one? */
function taken(c: City, l: Lot): boolean {
  if (c.net.roads.some((r) => !r.flyover && r.cells.some((x) => vertexInBlock(l, x)))) return true;
  if (c.parks.some((p) => blocksMeet(p, l))) return true;
  return c.lots.some((o) => o.id !== l.id && o.id < l.id && holdsGround(o, c.year) && blocksMeet(o, l)) || c.lots.some((o) => o.id !== l.id && o.level > 0 && o.kind !== 'beach' && blocksMeet(o, l));
}

interface Ground { readonly roads: ReadonlySet<string>; readonly blocks: readonly Block[]; readonly letters: ReadonlySet<Terrain> }
const key = (x: { readonly gx: number; readonly gy: number }): string => `${x.gx},${x.gy}`;

/** What a moved plot must keep clear of: everything built, everything drawn, everything still to come. */
function groundFor(c: City, l: Lot): Ground {
  const roads = new Set<string>();
  for (const r of c.net.roads) if (!r.flyover) for (const x of r.cells) roads.add(key(x));
  for (const r of c.def.roads) if ((r.opensYear ?? 1) > c.year) for (const x of defCells(r)) roads.add(key(x));
  const letters = new Set<Terrain>(vertices(l).map((x) => c.net.terrain[x.gy]?.[x.gx] ?? '.').filter((t) => t === '.' || t === 'h'));
  const plots = c.lots.filter((o) => o.id !== l.id && o.opensYear !== DROPPED);
  return { roads, blocks: [...plots, ...c.parks, ...(c.def.beaches ?? [])], letters: letters.add('.') };
}

function fits(c: City, g: Ground, b: Block, year: number): boolean {
  if (b.gx < 1 || b.gy < 1 || b.gx + b.w > c.net.width - 2 || b.gy + b.h > c.net.height - 2) return false;
  if (g.blocks.some((o) => blocksMeet(o, b))) return false;
  if (meetsRoadReserve(c.def, lotRect(b))) return false;
  if (vertices(b).some((x) => !g.letters.has(c.net.terrain[x.gy]?.[x.gx] ?? '~') || g.roads.has(key(x)))) return false;
  if (!c.def.frontStreets) return blockAccess(c.net, b) !== null;
  return blockAccess(c.net, b, wideFrontageReach(c), true) !== null || councilFront(c, b, year);
}

/** A Council street of the lot's year or before will run along the site's south edge, past every gate. */
function councilFront(c: City, b: Block, year: number): boolean {
  const cells = new Set(c.def.roads.filter((r) => (r.opensYear ?? 1) <= year && r.type !== 'highway').flatMap((r) => [...defCells(r)]).map(key));
  return frontageRows(c.def, b).some((gy) =>
    Array.from({ length: b.w - 1 }, (_, i) => b.gx + i + 1).every((gx) => cells.has(key({ gx, gy }))));
}

/** The nearest free place of this size with a road beside it. */
function nearestSite(c: City, l: Lot, w: number, h: number): CellRect | null {
  const g = groundFor(c, l);
  const from = centreOf(l);
  const all: { readonly b: Block; readonly d: number }[] = [];
  for (let gy = 1; gy < c.net.height - 1; gy++) {
    for (let gx = 1; gx < c.net.width - 1; gx++) {
      const b = { gx, gy, w, h };
      const d = distPt(from, centreOf(b)) / CELL;
      if (d <= MAX_MOVE) all.push({ b, d });
    }
  }
  all.sort((p, q) => p.d - q.d || p.b.gy - q.b.gy || p.b.gx - q.b.gx);
  return all.find((x) => fits(c, g, x.b, l.opensYear))?.b ?? null;
}

function place(c: City, l: Lot): Lot {
  const same = nearestSite(c, l, l.w, l.h);
  if (same) return { ...l, ...same };
  const small = l.w > SMALL || l.h > SMALL ? nearestSite(c, l, Math.min(l.w, SMALL), Math.min(l.h, SMALL)) : null;
  if (!small) return { ...l, opensYear: DROPPED };
  const { garden: _g, ...plain } = l; // a shrunk garden lot is a plain 2-deep lot
  return { ...plain, ...small };
}

/** January: plots that come within two years find their ground. */
export function settlePlots(c: City): void {
  for (const was of c.lots) {
    if (was.kind === 'beach' || !isDue(was, c.year) || !taken(c, was)) continue;
    const now = place(c, was);
    c.lots = c.lots.map((l) => (l.id === was.id ? now : l));
    emit(c, { t: 'toast', who: 'sulo', text: now.opensYear === DROPPED
      ? `No ground is left for ${was.name}. Its people will squeeze in with the neighbours.`
      : now.w < was.w || now.h < was.h ? `You were there first. ${was.name} will be smaller, and a little hurt.` : `You were there first. We rubbed out ${was.name} and drew it nearby.` });
  }
}

/** The plots that found no ground: in their year, the nearest blocks of the same kind grow instead. */
export function squeezeIn(c: City): void {
  for (const lost of c.lots) {
    if (lost.opensYear !== DROPPED || c.def.lots[lost.id]?.opensYear !== c.year) continue;
    const at = centreOf(lost);
    const near = c.lots.filter((l) => l.level > 0 && l.level < 4 && l.kind === lost.kind)
      .sort((a, b) => distPt(at, centreOf(a)) - distPt(at, centreOf(b)) || a.id - b.id)
      .slice(0, Math.max(1, Math.round(builtArea(lost) / CELLS_PER_STEP)));
    const ids = new Set(near.map((l) => l.id));
    c.lots = c.lots.map((l) => (ids.has(l.id) ? { ...l, level: (l.level + 1) as Lot['level'] } : l));
  }
}

/** The Council buys the car parks its new roads run through, at the full price. */
export function clearForRoads(c: City): void {
  const cells = c.def.roads.filter((r) => (r.opensYear ?? 1) === c.year && c.year > 1).flatMap((r) => [...defCells(r)]);
  const bought = c.parks.filter((p) => cells.some((x) => vertexInBlock(p, x)));
  if (bought.length === 0) return;
  c.parks = c.parks.filter((p) => !bought.includes(p));
  const coins = bought.reduce((n, p) => n + PARKS[p.kind].cost, 0);
  earn(c, 'grant', coins);
  emit(c, { t: 'toast', who: 'sulo', text: `The Council's new road runs through ${bought.length === 1 ? 'your car park' : 'your car parks'}. It bought the ground for ${coins}.` });
}
