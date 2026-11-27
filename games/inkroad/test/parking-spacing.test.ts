import { describe, expect, it } from 'vitest';
import { bodiesOverlap, bodyAt, PARKED_KINDS, type Body } from '../src/render/cars/carSize';
import { pathPose, type Pose, type Step } from '../src/render/cars/manoeuvrePath';
import { BAY } from '../src/render/ground/roadExtras';
import { layoutPlace, makeGeo, placeLayout, type Mode, type Slot } from '../src/render/cars/parkingSlots';
import { spanSlots } from '../src/sim/slotGeometry';
import type { BeachView, CarPark, Lot, ParkedCar, ParkingView, Road } from '../src/sim/types';

const road = { id: 1, type: 'street', level: 0, oneWay: false, bridge: false, line: [{ x: 0, y: 400 }, { x: 800, y: 400 }] } as unknown as Road;
const lots = [[2, 2], [4, 3], [3, 4], [6, 2]].map(([w, h], i) => ({ id: i + 1, kind: 'home', gx: 3, gy: 1, w, h, access: { road: 1, s: 160 } }) as unknown as Lot);
const parks = [[3, 2], [5, 2], [4, 3], [6, 1]].map(([w, h], i) => ({ id: i + 11, kind: 'lot', gx: 6, gy: 3, w, h, spaces: 40, used: 0, access: { road: 1, s: 250 + i * 37 } }) as unknown as CarPark);
const beaches = [[6, 2], [4, 3], [8, 4]].map(([w, h], i) => ({ id: `b${i}`, rect: { gx: 0, gy: 12, w, h }, state: 'public' }) as unknown as BeachView);
const geo = makeGeo({ roads: [road], lots, carParks: parks, beaches });
const MANY = 60;
const mix = (kind: ParkedCar['kind'] | 'mixed', i: number): ParkedCar['kind'] => (kind === 'mixed' ? PARKED_KINDS[(i * 3) % PARKED_KINDS.length]! : kind);

interface Place { readonly name: string; readonly view: Omit<ParkingView, 'cars' | 'key' | 'spaces'>; readonly mode: Mode }
const places: Place[] = [
  ...lots.flatMap((l) => [{ name: `home ${l.w}x${l.h}`, view: { kind: 'home' as const, lot: l.id }, mode: 'bay' as const }, { name: `private ${l.w}x${l.h}`, view: { kind: 'private' as const, lot: l.id }, mode: 'parallel' as const }]),
  ...parks.map((p) => ({ name: `park ${p.w}x${p.h}`, view: { kind: 'park' as const, park: p.id }, mode: 'bay' as const })),
  ...beaches.map((b) => ({ name: `sand ${b.rect.w}x${b.rect.h}`, view: { kind: 'sand' as const, beach: b.id }, mode: 'bay' as const })),
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
    // Lorries never use a car park (no room in the aisle to turn): they stand in front strips and at the kerb.
    expect(s.length).toBeGreaterThan(p.view.kind === 'park' && kind === 'truck' ? -1 : 1);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect(bodiesOverlap(s[i]!.body, s[j]!.body), `${i} and ${j}`).toBe(false);
  });
});

/** The lane pose a car comes from: out of the slot's nose on the road side (a car park's gate), `off` along the road, heading along it. */
function lanePose(p: Place, s: Slot, off: number, dir: 1 | -1): Pose {
  // Forecourt slots lie along the edge: the car comes from the road (south of the lot), heading along it.
  if (p.view.kind === 'private') return { x: s.x + off * dir, y: s.y + 26, a: dir < 0 ? Math.PI : 0 };
  const g = s.via?.[0];
  if (g) return { x: g.x + off * dir, y: g.y + 26, a: dir < 0 ? Math.PI : 0 };
  const side = p.view.kind === 'park' ? -1 : 1;
  const ax = Math.cos(s.a) * side, ay = Math.sin(s.a) * side;
  const tx = -ay, ty = ax;
  return { x: s.x + ax * 26 + tx * off * dir, y: s.y + ay * 26 + ty * off * dir, a: Math.atan2(ty, tx) * 1 + (dir < 0 ? Math.PI : 0) };
}

describe('after the lane share a bay car stays in its own column (a car park car in the aisle)', () => {
  const rows = places.filter((p) => p.view.kind === 'home' || p.view.kind === 'private' || p.view.kind === 'park');
  const cases = rows.flatMap((p) => ([0.3, 0.5, 0.7] as const).map((h) => [p.name, h, p] as const));
  it.each(cases)('%s, hold %s', (_n, h, p) => {
    const s = stand(p, 'mixed');
    const step: Step = { x: 0, y: 0, a: 0, alpha: 1, blink: 0 };
    s.slice(0, 12).forEach((me, i) => {
      for (const [off, dir] of [[14, 1], [14, -1], [40, 1]] as const) {
        const from = lanePose(p, me.slot, off, dir);
        for (let f = 0; f <= 30; f++) {
          const u = h + ((1 - h) * f) / 30;
          pathPose(me.slot.via ? 'aisle' : p.mode, from, me.slot, u, step, h, me.slot.via);
          const moving = bodyAt(me.k, step.x, step.y, step.a);
          s.forEach((other, j) => {
            // Car parks: both rows (a far bay is reached by the aisle, never across the near row).
            if (j === i) return;
            expect(bodiesOverlap(moving, other.body), `slot ${i} over ${j} at u ${u.toFixed(2)}`).toBe(false);
          });
        }
      }
    });
  });
});

describe('kerb parking after the hold stays inside its own length', () => {
  it.each(['car', 'taxi'] as const)('%s between kerb bays', (kind) => {
    const step: Step = { x: 0, y: 0, a: 0, alpha: 1, blink: 0 };
    const list: ParkedCar[] = [0, 1, 2].map((k) => ({ uid: k + 1, tint: 0, kind, slot: k * 2, s: 100 + k * BAY, side: 1 as const }));
    const [a, b, c] = layoutPlace({ key: 'k', kind: 'kerb', road: 1, spaces: 6, cars: list }, geo).map((s) => s!);
    for (const h of [0.3, 0.5, 0.7]) {
      const lane = { x: b!.x - 8, y: 400 + 4, a: 0 };
      for (let f = 0; f <= 30; f++) {
        pathPose('parallel', lane, b!, h + ((1 - h) * f) / 30, step, h);
        const moving = bodyAt(kind, step.x, step.y, step.a);
        for (const n of [a!, c!]) expect(bodiesOverlap(moving, bodyAt(kind, n.x, n.y, n.a))).toBe(false);
      }
    }
  });
});
