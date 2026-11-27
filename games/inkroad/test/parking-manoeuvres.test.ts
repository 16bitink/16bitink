import { describe, expect, it } from 'vitest';
import { STEP } from '../src/sim/constants';
import { createTraffic } from '../src/sim/traffic';
import type { Traffic } from '../src/sim/trafficTypes';
import type { ParkingView, Pt } from '../src/sim/types';
import type { Spot } from '../src/city/day';
import { pointAlong, polyLength } from '../src/city/geometry';
import { kerbSpaces, streetSpaces } from '../src/city/parking';
import { roadSlots } from '../src/city/slots';
import { stand, unstand } from '../src/city/stand';
import { PARK_IN, PARK_OUT } from '../src/city/tune';
import { armTo, cross, gateNode } from './sim.helpers';
import { cityAtYear, inner } from './city-helpers';

const W = 'W';
const steps = (seconds: number): number => Math.round(seconds / STEP);
const slotIndex = (t: Traffic, uid: number): number => {
  const c = t.cars;
  for (let i = 0; i < c.count; i++) if (c.alive[i] && c.uid[i] === uid) return i;
  return -1;
};
const line = (len: number): Pt[] => [{ x: 0, y: 0 }, { x: len, y: 0 }];

describe('parking manoeuvres in traffic', () => {
  it('a parking car holds its lane for PARK_IN and the car behind waits', () => {
    const net = cross(10);
    const t = createTraffic(net, 1);
    const road = armTo(net, W);
    const parker = t.spawn({ from: { road, s: 40 }, to: { road, s: 200 }, kind: 'car', value: 1, tag: 1 });
    let parked = false;
    for (let k = 0; k < steps(30) && !parked; k++) {
      t.step();
      for (const a of t.drainArrivals()) if (a.uid === parker) parked = t.park(a.uid, PARK_IN);
    }
    expect(parked).toBe(true);
    const at = t.poseOf(parker)!;
    expect(t.cars.state[slotIndex(t, parker)]).toBe(4);
    const behind = t.spawn({ from: { road, s: 150 }, to: { gate: gateNode(net, 'E') }, kind: 'car', value: 1, tag: 2 });
    expect(behind).toBeGreaterThan(0);
    for (let k = 0; k < steps(PARK_IN) - 2; k++) {
      t.step();
      const p = t.poseOf(parker)!;
      expect(Math.hypot(p.x - at.x, p.y - at.y)).toBeLessThan(0.01);
      const b = t.poseOf(behind)!;
      expect(Math.hypot(b.x - at.x, b.y - at.y)).toBeGreaterThan(8);
    }
    const waiting = t.poseOf(behind)!;
    for (let k = 0; k < steps(2); k++) t.step();
    expect(t.poseOf(parker)).toBeNull();
    const moved = t.poseOf(behind);
    expect(moved === null || Math.hypot(moved.x - waiting.x, moved.y - waiting.y) > 10).toBe(true);
  });

  it('a leaving car waits for a gap, then holds the lane before it drives off', () => {
    const net = cross(10);
    const t = createTraffic(net, 1);
    const road = armTo(net, W);
    const roadLine = net.roads.find((r) => r.id === road)!.line;
    const spot = pointAlong(roadLine, 200);
    const out = { from: { road, s: 200 }, to: { gate: gateNode(net, 'E') }, kind: 'car' as const, value: 1, tag: 3, hold: PARK_OUT };
    const coming = t.spawn({ from: { gate: gateNode(net, W) }, to: { gate: gateNode(net, 'E') }, kind: 'car', value: 1, tag: 4 });
    let refused = 0;
    let uid = -1;
    for (let k = 0; k < steps(40) && uid < 0; k++) {
      t.step();
      const c = t.poseOf(coming);
      const close = c !== null && Math.hypot(c.x - spot.x, c.y - spot.y) < 30;
      if (!close && refused === 0) continue;
      uid = t.spawn(out);
      if (uid < 0) refused += 1;
    }
    expect(refused).toBeGreaterThan(0);
    expect(uid).toBeGreaterThan(0);
    const start = t.poseOf(uid)!;
    for (let k = 0; k < steps(PARK_OUT) - 1; k++) {
      t.step();
      expect(t.cars.state[slotIndex(t, uid)]).toBe(4);
      const p = t.poseOf(uid)!;
      expect(Math.hypot(p.x - start.x, p.y - start.y)).toBeLessThan(0.01);
    }
    for (let k = 0; k < steps(3); k++) t.step();
    const p = t.poseOf(uid);
    expect(p === null || (t.cars.state[slotIndex(t, uid)] === 0 && Math.hypot(p.x - start.x, p.y - start.y) > 5)).toBe(true);
  });
});

describe('own spaces', () => {
  it('a small street has fewer slots per length than kerb bays, and none overlap', () => {
    for (const len of [120, 200, 320, 480, 800]) expect(streetSpaces(line(len))).toBeLessThan(kerbSpaces(line(len)));
    const v = cityAtYear(4);
    const c = inner(v);
    const road = c.net.roads.find((r) => r.level === 0 && polyLength(r.line) >= 240)!;
    for (const kind of ['kerb', 'street'] as const) {
      const spaces = kind === 'kerb' ? kerbSpaces(road.line) : streetSpaces(road.line);
      const spot = { key: `${kind}:x`, kind, id: road.id, spaces, used: 0, access: { road: road.id, s: 0 }, at: road.line[0]!, sum: 0, samples: 0, cars: [], ver: 0 } as Spot;
      const slots = roadSlots(c, spot);
      expect(slots).toHaveLength(spaces);
      for (const side of [-1, 1]) {
        const along = slots.filter((x) => x.side === side).map((x) => x.s).sort((a, b) => a - b);
        for (let i = 1; i < along.length; i++) expect(along[i]! - along[i - 1]!).toBeGreaterThanOrEqual(kind === 'kerb' ? 17 : 24);
      }
    }
  });

  it('a car keeps its slot while a neighbour leaves: nobody moves up', () => {
    const v = cityAtYear(4);
    const c = inner(v);
    const spot = [...c.day.spots.values()].find((s) => s.kind === 'street' && s.spaces >= 4 && s.cars.length === 0)!;
    expect(spot).toBeDefined();
    const cars = [0, 1, 2, 3].map((k) => stand(c, spot, { uid: 9000 + k, tint: k, kind: 'car' }, true));
    const before = cars.map((e) => ({ slot: e.slot, s: e.s, side: e.side }));
    expect(new Set(before.map((b) => b.slot)).size).toBe(4);
    unstand(c, cars[1]!);
    for (const k of [0, 2, 3]) expect({ slot: cars[k]!.slot, s: cars[k]!.s, side: cars[k]!.side }).toEqual(before[k]);
    const next = stand(c, spot, { uid: 9010, tint: 1, kind: 'car' }, true);
    expect(next.slot).toBe(before[1]!.slot);
  });
});

describe('the parked-car view through a day', () => {
  it('tells every move in the step parking changes, keeps slots, and holds lanes while cars turn', () => {
    const v = cityAtYear(5);
    const c = inner(v);
    let slotOf = new Map<string, number>();
    const listed = (p: readonly ParkingView[], key: string, uid: number): number | undefined =>
      p.find((x) => x.key === key)?.cars.find((k) => k.uid === uid)?.slot;
    const seen = { in: 0, out: 0, go: 0, held: 0, road: 0 };
    const outs = new Map<number, { at: number; edge: number; seconds: number }>();
    const lastIn = new Map<number, number>();
    for (let k = 0; k < steps(240) && v.phase === 'day'; k++) {
      v.advance(STEP);
      const parking = v.parking ?? [];
      for (const e of v.drainEvents()) {
        if (e.t === 'parkGo') {
          const was = outs.get(e.car);
          expect(was, `parkGo without out ${e.car}`).toBeDefined();
          expect(c.clock - was!.at).toBeGreaterThanOrEqual(was!.edge - STEP / 2);
          expect(e.seconds).toBe(was!.seconds);
          expect(listed(parking, e.key, e.car)).toBeUndefined();
          outs.delete(e.car);
          seen.go += 1;
          continue;
        }
        if (e.t !== 'park') continue;
        const slot = listed(parking, e.key, e.car);
        expect(e.move!).toBeGreaterThanOrEqual(e.seconds);
        if (e.dir === 'in') {
          seen.in += 1;
          // slot -1: into a building's entrance (a lorry, a taxi, a garage), never listed in a place.
          expect(slot).toBe(e.slot < 0 ? undefined : e.slot);
          if (e.seconds > 0) lastIn.set(e.car, c.clock + e.move!);
        } else {
          seen.out += 1;
          expect(slot).toBeUndefined();
          expect(c.clock).toBeGreaterThanOrEqual((lastIn.get(e.car) ?? -Infinity) - STEP / 2);
          // Out of a building's door (slot -1) or off the shoulder, a car joins the lane moving, as it always did: no hold.
          if (e.slot >= 0 && !e.key.startsWith('double')) expect(e.seconds).toBeGreaterThan(0);
          // The first step also hears what the pre-warm told (earlier clocks): no timing to check there.
          outs.set(e.car, { at: k === 0 ? -Infinity : c.clock, edge: e.move! - e.seconds, seconds: e.seconds });
        }
        if (e.key.startsWith('kerb:') || e.key.startsWith('street:')) seen.road += 1;
      }
      // A car waiting at the lane edge still owns its slot: nobody else stands in it.
      for (const spot of c.day.spots.values()) expect(new Set(spot.cars.map((x) => x.slot)).size).toBe(spot.cars.length);
      const now = new Map<string, number>();
      for (const p of parking) {
        expect(new Set(p.cars.map((x) => x.slot)).size).toBe(p.cars.length);
        if (p.slots !== undefined) for (const x of p.cars) expect(x.slot!).toBeLessThan(p.slots);
        for (const x of p.cars) {
          const id = `${p.key}#${x.uid}`;
          const was = slotOf.get(id);
          if (was !== undefined) expect(x.slot, `${id} ${p.kind} ${c.clock.toFixed(1)}`).toBe(was);
          now.set(id, x.slot!);
        }
      }
      slotOf = now;
      const cars = c.traffic.cars;
      for (let i = 0; i < cars.count; i++) if (cars.alive[i] && cars.state[i] === 4) seen.held += 1;
    }
    expect(seen.in).toBeGreaterThan(20);
    expect(seen.out).toBeGreaterThan(20);
    expect(seen.go).toBeGreaterThan(20);
    expect(seen.held).toBeGreaterThan(0);
  });
});
