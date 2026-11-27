import { describe, expect, it } from 'vitest';
import type { CarPark, ParkedCar, ParkingView, Road } from '../src/sim/types';
import { pathPose, turnBy, type Pose, type Step } from '../src/render/cars/manoeuvrePath';
import { halfWidth } from '../src/sim/roadGeom';
import { CAR_HALF_W, layoutPlace, makeGeo, streetLoose, type Mode } from '../src/render/cars/parkingSlots';

const road = { id: 1, type: 'street', level: 0, oneWay: false, bridge: false, line: [{ x: 0, y: 200 }, { x: 400, y: 200 }] } as unknown as Road;
const geo = makeGeo({ roads: [road], lots: [], carParks: [{ id: 7, kind: 'lot', gx: 6, gy: 3, w: 3, h: 2, spaces: 20, used: 0, access: null } as unknown as CarPark], beaches: [] });
const car = (uid: number, extra: Partial<ParkedCar> = {}): ParkedCar => ({ uid, tint: 0, kind: 'car', ...extra });
const view = (v: Partial<ParkingView>): ParkingView => ({ key: 'k', kind: 'kerb', road: 1, spaces: 8, cars: [], ...v });
const step = (): Step => ({ x: 0, y: 0, a: 0, alpha: 1, blink: 0 });

describe('slots by index', () => {
  it('a car stands where its own slot is, whoever else is in the list', () => {
    const mine = car(5, { slot: 3, s: 100, side: -1 });
    const alone = layoutPlace(view({ cars: [mine] }), geo)[0]!;
    const crowd = layoutPlace(view({ cars: [car(1, { slot: 0, s: 60, side: 1 }), car(2, { slot: 2, s: 80, side: 1 }), mine] }), geo)[2]!;
    expect(crowd).toEqual(alone);
    const gone = layoutPlace(view({ cars: [car(1, { slot: 0, s: 60, side: 1 }), mine] }), geo)[1]!;
    expect(gone).toEqual(alone);
  });

  it('a car park car keeps its bay when others leave', () => {
    const a = car(1, { slot: 4 });
    const withOthers = layoutPlace(view({ kind: 'park', road: undefined, park: 7, cars: [car(2, { slot: 0 }), car(3, { slot: 1 }), a] }), geo)[2]!;
    const alone = layoutPlace(view({ kind: 'park', road: undefined, park: 7, cars: [a] }), geo)[0]!;
    expect(withOthers).toEqual(alone);
  });

  it('street cars stand askew and off the line, each its own way; kerb cars do not', () => {
    const list = Array.from({ length: 6 }, (_, k) => car(k + 1, { slot: k * 2, s: 60 + k * 40, side: 1 as const }));
    const kerb = layoutPlace(view({ cars: list }), geo).map((s) => s!);
    const street = layoutPlace(view({ kind: 'street', cars: list }), geo).map((s) => s!);
    expect(new Set(kerb.map((s) => s.y)).size).toBe(1);
    expect(new Set(street.map((s) => s.y.toFixed(3))).size).toBeGreaterThan(3);
    expect(Math.max(...street.map((s) => Math.abs(s.a)))).toBeGreaterThan(0.2);
    expect(streetLoose(1, 4)).toEqual(streetLoose(1, 4));
  });
});

const L: Pose = { x: 100, y: 207, a: 0 };
const kerb: Pose = { x: 130, y: 213, a: 0 };
const bay: Pose = { x: 130, y: 240, a: Math.PI / 2 };
const park: Pose = { x: 130, y: 250, a: Math.PI / 2 };

describe('manoeuvre paths', () => {
  const cases: [Mode, Pose][] = [['parallel', kerb], ['bay', bay], ['enter', park]];
  it.each(cases)('%s: starts at the lane pose, ends at the slot pose, never jumps', (mode, to) => {
    const s = step();
    pathPose(mode, L, to, 0, s);
    expect([s.x, s.y]).toEqual([L.x, L.y]);
    expect(Math.abs(turnBy(L.a, s.a))).toBeLessThan(1e-6);
    pathPose(mode, L, to, 1, s);
    expect(s.x).toBeCloseTo(to.x, 6); expect(s.y).toBeCloseTo(to.y, 6);
    expect(Math.abs(turnBy(to.a, s.a))).toBeLessThan(1e-6);
    let px = L.x, py = L.y, pa = L.a;
    for (let i = 1; i <= 60; i++) {
      pathPose(mode, L, to, i / 60, s);
      expect(Math.hypot(s.x - px, s.y - py)).toBeLessThan(8);
      expect(Math.abs(turnBy(pa, s.a))).toBeLessThan(0.5);
      px = s.x; py = s.y; pa = s.a;
    }
  });

  it('parallel parking pulls past the space before reversing in', () => {
    const s = step();
    let far = 0;
    for (let i = 0; i <= 40; i++) { pathPose('parallel', L, kerb, i / 40, s); far = Math.max(far, s.x); }
    expect(far).toBeGreaterThan(kerb.x + 4);
  });

  it('only a car park mouth fades the car', () => {
    const s = step();
    expect(pathPose('enter', L, park, 1, s).alpha).toBeCloseTo(0, 6);
    expect(pathPose('bay', L, bay, 1, s).alpha).toBe(1);
  });
});

describe('the lane is only entered while it is held', () => {
  const HOLD = 0.5;
  const HALF_LEN = 7;
  const roads: [string, Partial<Road>][] = [['street', { type: 'street' }], ['avenue', { type: 'avenue' }], ['one-way', { type: 'street', oneWay: true }]];
  const kinds = ['kerb', 'street'] as const;
  const cases = roads.flatMap(([n, r]) => kinds.flatMap((k) => ([1, -1] as const).map((side) => [n, k, side, r] as const)));
  it.each(cases)('%s road, %s place, side %s: the whole body is off the paved width after the hold', (_n, kind, side, r) => {
    const rd = { ...road, ...r } as Road;
    const g = makeGeo({ roads: [rd], lots: [], carParks: [], beaches: [] });
    const half = halfWidth(rd);
    for (let slot = 0; slot < 12; slot++) {
      const mine = side === 1 ? slot * 2 : slot * 2 + 1;
      const pose = layoutPlace(view({ kind, cars: [car(1, { slot: mine, s: 80 + slot * 20, side })] }), g)[0]!;
      const lane = { x: pose.x - 6, y: 200 + side * (half - 5), a: side === 1 ? 0 : Math.PI };
      const s = step();
      for (let i = 0; i <= 80; i++) {
        const u = i / 80;
        pathPose('parallel', lane, pose, u, s, HOLD);
        if (u <= HOLD) continue;
        let near = Infinity;
        for (const [cx, cy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
          const wx = s.x + Math.cos(s.a) * HALF_LEN * cx - Math.sin(s.a) * CAR_HALF_W * cy;
          const wy = s.y + Math.sin(s.a) * HALF_LEN * cx + Math.cos(s.a) * CAR_HALF_W * cy;
          near = Math.min(near, side * (wy - 200));
        }
        expect(near, `slot ${mine} u ${u} a ${s.a - pose.a}`).toBeGreaterThanOrEqual(half - 0.05);
      }
      pathPose('parallel', lane, pose, 1, s, HOLD);
      expect(s.y).toBeCloseTo(pose.y, 6);
    }
  });
});
