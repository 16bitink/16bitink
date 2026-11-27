import type { CityDef, LotDef } from '../sim/types';
import { expandCells } from '../sim/netPlan';
import { blocksMeet, type Block } from './geometry';

/**
 * The layout rule of a city with front streets (docs/inkroad-build.md, "City layout: every gate on its street"):
 * every picture has its gate in the south wall, so a lot's road runs along its south edge, one cell out, built by the
 * Council no later than the lot; a block between two east-west streets holds one row; rows line up in whole plots.
 */
const PLOT = 2;
/** Lots farther apart than this along a row are a deliberate gap, not one row. */
const NEAR = 2 * PLOT;
/** The strip in front of a gate: the driveway row and the road's row. */
const STRIP = 2;
/** Terrain that turns a road into a bridge (no driveways). */
const WATER = '~';
/** Ground that parts two rows as a street does: walls, rock, water. */
const BARRIER = '#~';

interface Street { readonly year: number }
type Streets = ReadonlyMap<string, Street>;
const key = (x: number, y: number): string => `${x},${y}`;

/** Council road vertices that can carry a driveway, with the first year each is open. */
function councilStreets(def: CityDef): Streets {
  const out = new Map<string, Street>();
  for (const r of def.roads) {
    const cells = expandCells(r.cells.map(([gx, gy]) => ({ gx, gy })));
    if (r.type === 'highway' || cells.some((c) => def.map[c.gy]?.[c.gx] === WATER)) continue;
    const year = r.opensYear ?? 1;
    for (const c of cells) {
      const k = key(c.gx, c.gy);
      if ((out.get(k)?.year ?? Infinity) > year) out.set(k, { year });
    }
  }
  return out;
}

const frontRow = (l: Block): number => l.gy + l.h + 1;
/** The vertices along the frontage a street must pass: every gate (plot centres) and the kerb between them; the corners may be a street's end. */
const xsOf = (l: Block): readonly number[] => Array.from({ length: Math.max(1, l.w - 1) }, (_, i) => l.gx + 1 + i);

function frontProblem(l: LotDef, streets: Streets): string | null {
  const y = frontRow(l);
  const missing = xsOf(l).filter((x) => !streets.has(key(x, y)));
  if (missing.length > 0) return `${l.name}: no Council street along its south edge (row ${y}, x ${l.gx + 1} to ${l.gx + l.w - 1}; missing at x ${missing.join(' ')})`;
  const opens = Math.max(...xsOf(l).map((x) => streets.get(key(x, y))!.year));
  return opens > l.opensYear ? `${l.name}: its front street on row ${y} opens in year ${opens}, after the lot (year ${l.opensYear})` : null;
}

const overlapX = (a: Block, b: Block): boolean => a.gx < b.gx + b.w && b.gx < a.gx + a.w;
const overlapY = (a: Block, b: Block): boolean => a.gy < b.gy + b.h && b.gy < a.gy + a.h;

/** A street row strictly between two depths, over the shared stretch of two lots. */
function streetBetween(streets: Streets, a: Block, b: Block, top: number, bottom: number): boolean {
  const x = (Math.max(a.gx, b.gx) + Math.min(a.gx + a.w, b.gx + b.w)) / 2;
  for (let y = top + 1; y < bottom; y++) if (streets.has(key(Math.floor(x), y)) && streets.has(key(Math.ceil(x), y))) return true;
  return false;
}

function gateProblems(def: CityDef, l: LotDef, streets: Streets): string[] {
  const out: string[] = [];
  const strip: Block = { gx: l.gx, gy: l.gy + l.h, w: l.w, h: STRIP };
  for (const o of [...def.lots, ...(def.beaches ?? [])]) {
    if (o === l || !blocksMeet(o, strip)) continue;
    out.push(`${l.name}: ${o.name} stands in its south strip and blocks its gate`);
  }
  for (const o of def.lots) {
    if (o === l || !overlapX(o, l) || o.gy + o.h > l.gy) continue;
    if (!streetBetween(streets, o, l, o.gy + o.h, l.gy)) out.push(`${l.name}: ${o.name} stands behind it in the same block (stacked rows)`);
  }
  return out;
}

/** Beside-rows a street must run along to count as a cross street (a corner of a diagonal joint does not). */
const BESIDE = 2;
const besideRows = (l: Block): readonly number[] => Array.from({ length: l.h + 1 }, (_, i) => l.gy + i);
/** A north-south street at this column, running beside the rows a lot covers. */
const crossStreetAt = (streets: Streets, x: number, l: Block): boolean => besideRows(l).filter((y) => streets.has(key(x, y))).length >= BESIDE;
/** A cross street, a wall or water between two columns parts two rows. */
const partedAt = (def: CityDef, streets: Streets, x: number, l: Block): boolean =>
  crossStreetAt(streets, x, l) || besideRows(l).some((y) => BARRIER.includes(def.map[y]?.[x] ?? WATER));

function rowProblems(def: CityDef, l: LotDef, streets: Streets): string[] {
  const out: string[] = [];
  const east = l.gx + l.w;
  for (const o of def.lots) {
    if (o === l || !overlapY(o, l) || o.gx < east || o.gx - east > NEAR) continue;
    const gap = o.gx - east;
    if (Array.from({ length: gap + 1 }, (_, i) => east + i).some((x) => partedAt(def, streets, x, l) || partedAt(def, streets, x, o))) continue;
    if (o.gy + o.h !== l.gy + l.h) out.push(`${l.name} and ${o.name} share a row but not a south edge (rows ${l.gy + l.h} and ${o.gy + o.h}): staggered`);
    else if (gap > 0 && gap < PLOT) out.push(`${l.name} and ${o.name}: a sliver of sand ${gap} cell wide between them, less than a plot`);
  }
  for (const [x, side] of [[l.gx - PLOT, l.gx - 1], [east + PLOT, east + 1]] as const) {
    if (crossStreetAt(streets, x, l) && !crossStreetAt(streets, side, l)) out.push(`${l.name}: a sliver of sand between it and the street at x ${x}`);
  }
  return out;
}

/** Every layout problem of a city whose lots face their front streets; none for a city without them. */
export function layoutProblems(def: CityDef): readonly string[] {
  if (!def.frontStreets) return [];
  const streets = councilStreets(def);
  return def.lots.flatMap((l) => [frontProblem(l, streets), ...gateProblems(def, l, streets), ...rowProblems(def, l, streets)].filter((p): p is string => p !== null));
}
