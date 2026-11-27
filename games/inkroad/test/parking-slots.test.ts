import { describe, expect, it } from 'vitest';
import { lotRect } from '../src/city/geometry';
import { halfWidth } from '../src/sim/roadGeom';
import type { BeachView, CarPark, Lot, ParkedCar, ParkingView, Road } from '../src/sim/types';
import { facingEdge, layoutPlace, makeGeo, kerbOffset, JUNCTION_CLEAR } from '../src/render/cars/parkingSlots';

const road = { id: 1, type: 'street', level: 0, oneWay: false, bridge: false, line: [{ x: 0, y: 200 }, { x: 400, y: 200 }] } as unknown as Road;
const lot = { id: 5, kind: 'home', gx: 3, gy: 1, w: 2, h: 2, access: { road: 1, s: 160 } } as unknown as Lot;
const park = { id: 7, kind: 'lot', gx: 6, gy: 3, w: 3, h: 2, spaces: 20, used: 5, access: null } as unknown as CarPark;
const beach = { id: 'pearl', rect: { gx: 0, gy: 6, w: 6, h: 2 }, state: 'public' } as unknown as BeachView;
const geo = makeGeo({ roads: [road], lots: [lot], carParks: [park], beaches: [beach] });
const cars = (n: number, extra: Partial<ParkedCar> = {}): ParkedCar[] => Array.from({ length: n }, (_, i) => ({ uid: i + 1, tint: i, kind: 'car', ...extra }));
const view = (v: Partial<ParkingView>): ParkingView => ({ key: 'k', kind: 'home', spaces: 9, cars: cars(3), ...v });
const real = <T>(a: readonly (T | null)[]): T[] => a.filter((x): x is T => x !== null);

describe('parking slots', () => {
  it('home cars stand outside the lot on the edge facing its road, none on the footprint', () => {
    const r = lotRect(lot);
    const slots = real(layoutPlace(view({ lot: 5 }), geo));
    expect(slots).toHaveLength(3);
    for (const s of slots) {
      expect(s.y).toBeGreaterThan(r.y + r.h);
      expect(s.y - (r.y + r.h)).toBeLessThan(20);
      expect(s.x).toBeGreaterThan(r.x);
      expect(s.x).toBeLessThan(r.x + r.w);
    }
    expect(facingEdge(r, { x: 100, y: 0 }).ny).toBe(-1);
  });

  it('shows only as many cars as fit', () => {
    const slots = layoutPlace(view({ lot: 5, cars: cars(30) }), geo);
    expect(slots.filter(Boolean).length).toBeLessThan(30);
    expect(slots.filter(Boolean).length).toBeGreaterThan(3);
  });

  it('kerb cars stand outside the paved width on both sides, apart, clear of the ends', () => {
    const list = cars(8).map((c, i) => ({ ...c, s: 60 + i * 20, side: (i % 2 ? -1 : 1) as -1 | 1 }));
    const slots = real(layoutPlace(view({ kind: 'kerb', road: 1, cars: list }), geo));
    expect(slots).toHaveLength(8);
    const off = slots.map((s) => s.y - 200);
    for (const o of off) expect(Math.abs(o)).toBeGreaterThanOrEqual(halfWidth(road) + 1);
    expect(off.some((o) => o > 0)).toBe(true);
    expect(off.some((o) => o < 0)).toBe(true);
    for (const s of slots) { expect(s.x).toBeGreaterThanOrEqual(JUNCTION_CLEAR); expect(s.x).toBeLessThanOrEqual(400 - JUNCTION_CLEAR); }
    const keys = new Set(slots.map((s) => `${Math.round(s.x)}:${Math.sign(s.y - 200)}`));
    expect(keys.size).toBe(8);
    expect(Math.abs(off[0]!)).toBeCloseTo(kerbOffset(road), 5);
  });

  it('street cars are slightly askew, kerb cars are not', () => {
    const k = real(layoutPlace(view({ kind: 'kerb', road: 1, cars: cars(4, { side: 1 }) }), geo));
    const st = real(layoutPlace(view({ kind: 'street', road: 1, cars: cars(4, { side: 1 }) }), geo));
    for (const s of k) expect(s.a).toBeCloseTo(0, 6);
    expect(st.some((s) => Math.abs(s.a) > 0.01)).toBe(true);
  });

  it('double-parked cars stand in the outer lane', () => {
    const [s] = real(layoutPlace(view({ kind: 'double', road: 1, cars: cars(1, { s: 200, side: 1 }) }), geo));
    expect(s!.y - 200).toBeGreaterThan(0);
    expect(s!.y - 200).toBeLessThan(halfWidth(road));
  });

  it('car parks give bays inside the park; multi-storey gives none', () => {
    const r = lotRect(park);
    for (const s of real(layoutPlace(view({ kind: 'park', park: 7 }), geo))) {
      expect(s.x).toBeGreaterThan(r.x); expect(s.x).toBeLessThan(r.x + r.w);
      expect(s.y).toBeGreaterThan(r.y); expect(s.y).toBeLessThan(r.y + r.h);
    }
    const multi = makeGeo({ roads: [road], lots: [], carParks: [{ ...park, kind: 'multi' }], beaches: [] });
    expect(real(layoutPlace(view({ kind: 'park', park: 7 }), multi))).toHaveLength(0);
  });

  it('sand cars stay on the beach near the road', () => {
    const slots = real(layoutPlace(view({ kind: 'sand', beach: 'pearl', cars: cars(7) }), geo));
    expect(slots).toHaveLength(7);
    for (const s of slots) { expect(s.x).toBeGreaterThan(0); expect(s.x).toBeLessThan(240); expect(s.y).toBeGreaterThan(240); expect(s.y).toBeLessThan(320); }
  });

  it('unknown places give nothing and do not throw', () => {
    expect(real(layoutPlace(view({ lot: 99 }), geo))).toHaveLength(0);
    expect(real(layoutPlace(view({ kind: 'kerb', road: 99 }), geo))).toHaveLength(0);
  });
});
