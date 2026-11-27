import { describe, expect, it } from 'vitest';
import type { CarPark, ParkedCar, ParkingView, Road } from '../src/sim/types';


import { layoutPlace, makeGeo, streetLoose } from '../src/render/cars/parkingSlots';

const road = { id: 1, type: 'street', level: 0, oneWay: false, bridge: false, line: [{ x: 0, y: 200 }, { x: 400, y: 200 }] } as unknown as Road;
const geo = makeGeo({ roads: [road], lots: [], carParks: [{ id: 7, kind: 'lot', gx: 6, gy: 3, w: 3, h: 2, spaces: 20, used: 0, access: null } as unknown as CarPark], beaches: [] });
const car = (uid: number, extra: Partial<ParkedCar> = {}): ParkedCar => ({ uid, tint: 0, kind: 'car', ...extra });
const view = (v: Partial<ParkingView>): ParkingView => ({ key: 'k', kind: 'kerb', road: 1, spaces: 8, cars: [], ...v });


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
