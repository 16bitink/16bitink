import { describe, expect, it } from 'vitest';
import { createCity } from '../src/city/city';
import { PAID_CITIES } from '../content/paid';
import { STEP } from '../src/sim/constants';
import type { CityView, ParkingView } from '../src/sim/types';
import { bodiesOverlap, bodyAt, type Body } from '../src/render/cars/carSize';
import { layoutPlace, makeGeo, type ParkingGeo } from '../src/render/cars/parkingSlots';
import { cityAtYear, inner } from './city-helpers';

/**
 * One source of truth for spaces: every car the city lists in a place is drawn, in its own space, and no two parked
 * bodies overlap (a van or lorry over its two slots included). Checked through a whole season, every few seconds.
 */
function harbourAt(year: number): CityView {
  const v = createCity(PAID_CITIES[0]!, 3);
  const c = inner(v);
  c.money = 9000;
  while (v.year < year) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
  v.apply({ t: 'next' });
  return v;
}

const CASES: readonly { readonly name: string; readonly make: () => CityView }[] = [
  ...[1, 3, 6, 10].map((y) => ({ name: `Saffron Bay year ${y}`, make: () => cityAtYear(y) })),
  ...[1, 5].map((y) => ({ name: `Old Harbour year ${y}`, make: () => harbourAt(y) })),
];
/** Seconds between two looks at the parking list. */
const LOOK_EVERY = 4;
/** Parked bodies may touch by this much (paint, not metal). */
const TOUCH = 0.05;
/** Kinds the renderer lays out (multi-storey and underground show none, double stand in the lane). */
const DRAWN: ReadonlySet<ParkingView['kind']> = new Set(['home', 'private', 'park', 'sand', 'kerb', 'street']);

interface Tally { undrawn: number; overlaps: number; listed: number; first: string[]; byKind: Record<string, number> }

function check(v: ParkingView, geo: ParkingGeo, t: Tally): void {
  if (!DRAWN.has(v.kind)) return;
  const park = v.park === undefined ? undefined : geo.parks.get(v.park);
  if (park && park.kind !== 'lot' && park.kind !== 'ride') return;
  const slots = layoutPlace(v, geo);
  const bodies: Body[] = [];
  v.cars.forEach((car, i) => {
    t.listed++;
    const s = slots[i];
    if (!s) { t.undrawn++; t.byKind[v.kind] = (t.byKind[v.kind] ?? 0) + 1; if (t.first.length < 8) t.first.push(`${v.key} slot ${car.slot} of ${v.slots ?? v.spaces} undrawn (${car.kind})`); return; }
    bodies.push(bodyAt(car.kind, s.x, s.y, s.a));
  });
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    if (!bodiesOverlap(bodies[i]!, bodies[j]!, TOUCH)) continue;
    t.overlaps++;
    if (t.first.length < 8) t.first.push(`${v.key}: ${i} over ${j}`);
  }
}

/** Kinds and their spaces, for the report. */
export function capacityOf(v: CityView): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of inner(v).day.spots.values()) out[s.kind] = (out[s.kind] ?? 0) + s.spaces;
  return out;
}

describe('every listed car is drawn, in its own space', () => {
  for (const k of CASES) {
    it(`${k.name}`, () => {
      const v = k.make();
      const t: Tally = { undrawn: 0, overlaps: 0, listed: 0, first: [], byKind: {} };
      let next = 0;
      while (v.phase === 'day') {
        v.advance(STEP);
        v.drainEvents();
        if (inner(v).clock < next) continue;
        next = inner(v).clock + LOOK_EVERY;
        const geo = makeGeo(v);
        for (const p of v.parking ?? []) check(p, geo, t);
      }
      if (process.env.PARK_LOG) console.log(k.name, JSON.stringify(capacityOf(v)), t);
      expect(t.listed).toBeGreaterThan(100);
      expect({ undrawn: t.undrawn, overlaps: t.overlaps, first: t.first }).toEqual({ undrawn: 0, overlaps: 0, first: [] });
    }, 120_000);
  }
});
