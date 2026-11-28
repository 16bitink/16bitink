import { describe, expect, it } from 'vitest';
import { bodiesOverlap, bodyAt, PARKED_KINDS, type Body } from '../src/render/cars/carSize';


import { layoutPlace, makeGeo, placeLayout, type Slot } from '../src/render/cars/parkingSlots';
import { spanSlots } from '../src/sim/slotGeometry';
import type { BeachView, CarPark, Lot, ParkedCar, ParkingView, Road } from '../src/sim/types';

const road = { id: 1, type: 'street', level: 0, oneWay: false, bridge: false, line: [{ x: 0, y: 400 }, { x: 800, y: 400 }] } as unknown as Road;
const lots = [[2, 2], [4, 3], [3, 4], [6, 2]].map(([w, h], i) => ({ id: i + 1, kind: 'home', gx: 3, gy: 1, w, h, access: { road: 1, s: 160 } }) as unknown as Lot);
const parks = [[3, 2], [5, 2], [4, 3], [6, 1]].map(([w, h], i) => ({ id: i + 11, kind: 'lot', gx: 6, gy: 3, w, h, spaces: 40, used: 0, access: { road: 1, s: 250 + i * 37 } }) as unknown as CarPark);
const beaches = [[6, 2], [4, 3], [8, 4]].map(([w, h], i) => ({ id: `b${i}`, rect: { gx: 0, gy: 12, w, h }, state: 'public' }) as unknown as BeachView);
const geo = makeGeo({ roads: [road], lots, carParks: parks, beaches });
const MANY = 60;
const mix = (kind: ParkedCar['kind'] | 'mixed', i: number): ParkedCar['kind'] => (kind === 'mixed' ? PARKED_KINDS[(i * 3) % PARKED_KINDS.length]! : kind);

interface Place { readonly name: string; readonly view: Omit<ParkingView, 'cars' | 'key' | 'spaces'> }
const places: Place[] = [
  ...lots.flatMap((l) => [{ name: `home ${l.w}x${l.h}`, view: { kind: 'home' as const, lot: l.id }}, { name: `private ${l.w}x${l.h}`, view: { kind: 'private' as const, lot: l.id }}]),
  ...parks.map((p) => ({ name: `park ${p.w}x${p.h}`, view: { kind: 'park' as const, park: p.id }})),
  ...beaches.map((b) => ({ name: `sand ${b.rect.w}x${b.rect.h}`, view: { kind: 'sand' as const, beach: b.id }})),
];
const kinds = [...PARKED_KINDS, 'mixed'] as const;
/** Fill a place as the city does: each car in the first slot it fits (a van or lorry with its neighbour), spans listed. */
function fill(p: Place, kind: ParkedCar['kind'] | 'mixed'): ParkedCar[] {
  const base = { key: 'k', spaces: MANY, cars: [], ...p.view } as ParkingView;
  const l = placeLayout(base, geo);
  if (!l) return [];
  const taken = new Set<number>();
  const out: ParkedCar[] = [];
  for (let i = 0; i < MANY; i++) {
    const k = mix(kind, i);
    for (let slot = 0; slot < l.poses.length; slot++) {
      const span = spanSlots(l, slot, k);
      if (!span || span.some((x) => taken.has(x))) continue;
      span.forEach((x) => taken.add(x));
      out.push({ uid: i + 1, tint: 0, kind: k, slot, ...(span.length > 1 ? { span } : {}) });
      break;
    }
  }
  return out;
}
const stand = (p: Place, kind: ParkedCar['kind'] | 'mixed'): { slot: Slot; body: Body; k: ParkedCar['kind'] }[] => {
  const list = fill(p, kind);
  const slots = layoutPlace({ key: 'k', spaces: MANY, cars: list, ...p.view } as ParkingView, geo);
  expect(slots.every((s) => s !== null), 'every listed car is drawn').toBe(true);
  return slots.flatMap((s, i) => (s ? [{ slot: s, k: list[i]!.kind, body: bodyAt(list[i]!.kind, s.x, s.y, s.a) }] : []));
};

describe('parked bodies never overlap, whatever the kinds', () => {
  const cases = places.flatMap((p) => kinds.map((k) => [p.name, k, p] as const));
  it.each(cases)('%s with %s', (_n, kind, p) => {
    const s = stand(p, kind);
    // Lorries never use a car park or a beach's track (no room in the aisle to turn): they stand in front strips and at the kerb.
    expect(s.length).toBeGreaterThan((p.view.kind === 'park' || p.view.kind === 'sand') && kind === 'truck' ? -1 : 1);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect(bodiesOverlap(s[i]!.body, s[j]!.body), `${i} and ${j}`).toBe(false);
  });
});
