import { lotRect } from '../../city/geometry';
import { halfWidth } from '../../sim/roadGeom';
import type { CarPark, CityView, Junction, Lot, Pt, Road, TransitLine } from '../../sim/types';
import { nearestOnLine } from '../../render/geom';
import { deckZ } from '../../render/deckHeight';
import { RISE, TILT } from '../../render/projection';

/** What is under a tap. `slack` (plan px) grows small things to a finger's size. */
const MIN_ARMS = 3;

export function pickJunction(city: CityView, p: Pt, slack: number, all = false): Junction | null {
  let best: Junction | null = null;
  let d = Infinity;
  for (const j of city.junctions) {
    if (j.ramp || (!all && j.arms.length < MIN_ARMS)) continue;
    const k = Math.hypot(j.x - p.x, j.y - p.y) - j.radius;
    if (k < slack && k < d) { d = k; best = j; }
  }
  return best;
}

/** Decks first: they lie on top, shifted up by their height. */
export function pickRoad(city: CityView, p: Pt, slack: number, ground = false): Road | null {
  let best: Road | null = null;
  let d = Infinity;
  for (const r of city.roads) {
    if (ground && r.flyover) continue;
    const near = nearestOnLine(r.line, p);
    let k = near.d;
    let lead = 0;
    if (r.flyover && r.level === 1) {
      const lifted = nearestOnLine(r.line, { x: p.x, y: p.y + (deckZ(r, near.s) * RISE) / TILT });
      k = lifted.d;
      lead = 4;
    }
    k -= halfWidth(r) + lead;
    if (k < slack && k < d) { d = k; best = r; }
  }
  return best;
}

const inside = (b: { gx: number; gy: number; w: number; h: number }, p: Pt): boolean => {
  const r = lotRect(b);
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
};

export const pickPark = (city: CityView, p: Pt): CarPark | null => city.carParks.find((c) => inside(c, p)) ?? null;
export const pickLot = (city: CityView, p: Pt): Lot | null => city.lots.find((l) => l.level > 0 && inside(l, p)) ?? null;

/** A beach's index in city.beaches, or -1. */
export const pickBeach = (city: CityView, p: Pt): number => city.beaches.findIndex((b) => inside(b.rect, p));

export function pickLine(city: CityView, p: Pt, slack: number): TransitLine | null {
  for (const l of city.lines) if (l.path.length > 1 && nearestOnLine(l.path, p).d < slack) return l;
  return null;
}
