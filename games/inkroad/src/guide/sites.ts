import { CELL } from '../sim/constants';
import type { CarParkKind, Cell, CityView, Command, Lot, Pt, Quote, Road, TransitMode } from '../sim/types';
import { dist, fullLots, mid, roadsNear, stopNear } from './places';

/** Where a thing could go: the city is asked for prices, the best that is allowed and can be paid wins. */
const REACH = 6; // cells round a place
const FAR_COST = 5; // coins a cell of walking is worth
const SIZE: Readonly<Record<CarParkKind, readonly [number, number]>> = { lot: [3, 2], multi: [2, 2], under: [2, 2], ride: [4, 3] };
const MIN_SPREAD = 7 * CELL;

export interface Site { readonly cmd: Command & { readonly t: 'carPark' }; readonly quote: Quote; readonly at: Pt }

export function parkSite(city: CityView, near: Pt, kind: CarParkKind, budget = city.money): Site | null {
  if (!city.parkKinds.includes(kind) || !city.tools.includes('parking')) return null;
  const [w, h] = SIZE[kind];
  const c: Cell = { gx: Math.round(near.x / CELL - w / 2), gy: Math.round(near.y / CELL - h / 2) };
  let best: Site | null = null;
  let score = Infinity;
  for (let dx = -REACH; dx <= REACH; dx++) {
    for (let dy = -REACH; dy <= REACH; dy++) {
      const cmd = { t: 'carPark', kind, at: { gx: c.gx + dx, gy: c.gy + dy } } as const;
      const quote = city.quote(cmd);
      if (!quote.ok || quote.cost > budget) continue;
      const s = quote.cost + (Math.abs(dx) + Math.abs(dy)) * FAR_COST;
      if (s >= score) continue;
      score = s;
      best = { cmd, quote, at: mid({ ...cmd.at, w, h }) };
    }
  }
  return best;
}

/** Kerb bays on the nearest street that may have them. */
export function kerbRoad(city: CityView, near: Pt, budget = city.money): { readonly road: Road; readonly quote: Quote } | null {
  if (!city.tools.includes('kerb')) return null;
  for (const road of roadsNear(city, near, 4)) {
    const quote = city.quote({ t: 'kerb', road: road.id, on: true });
    if (quote.ok && quote.cost <= budget) return { road, quote };
  }
  return null;
}

/** The fullest place that a car park could help. */
export function needsParking(city: CityView, kind: CarParkKind): { readonly lot: Lot; readonly site: Site } | null {
  for (const lot of fullLots(city).slice(0, 4)) {
    const site = parkSite(city, mid(lot), kind);
    if (site) return { lot, site };
  }
  return null;
}

const size = (l: Lot): number => l.w * l.h * l.level;

/** A line worth drawing: from the biggest homes far out, by the busiest shops, to the biggest offices. */
export function lineIdea(city: CityView, mode: TransitMode, budget = city.money): { readonly stops: readonly Cell[]; readonly quote: Quote; readonly names: readonly string[] } | null {
  const open = city.lots.filter((l) => l.level > 0 && l.access);
  const top = (kinds: readonly Lot['kind'][]): readonly Lot[] => open.filter((l) => kinds.includes(l.kind)).sort((a, b) => size(b) - size(a) || a.id - b.id);
  const work = top(['office', 'port', 'fair'])[0] ?? top(['market', 'mall'])[0];
  if (!work) return null;
  const shop = top(['market', 'mall']).find((l) => l.id !== work.id);
  for (const home of top(['home']).filter((l) => dist(mid(l), mid(work)) > MIN_SPREAD).slice(0, 8)) {
    const lots = [home, ...(shop ? [shop] : []), work];
    const stops = lots.flatMap((l) => stopNear(city, mid(l)) ?? []);
    if (stops.length < lots.length) continue;
    const quote = city.quote({ t: 'line', mode, stops });
    if (quote.ok && quote.cost <= budget) return { stops, quote, names: lots.map((l) => l.name) };
  }
  return null;
}

/** A value worked out now and then, not every frame: it keeps while the city's shape and purse stay the same. */
export function remember<T>(fn: (city: CityView) => T, holdMs = 0): (city: CityView) => T {
  const kept = new WeakMap<CityView, { key: string; value: T }>();
  return (city) => {
    const key = `${city.version}|${Math.floor(city.money)}|${city.carParks.length}|${city.lines.length}|${holdMs > 0 ? Math.floor((city.clock * 1000) / holdMs) : 0}|${city.year}:${city.season}:${city.phase}`;
    const was = kept.get(city);
    if (was?.key === key) return was.value;
    const value = fn(city);
    kept.set(city, { key, value });
    return value;
  };
}
