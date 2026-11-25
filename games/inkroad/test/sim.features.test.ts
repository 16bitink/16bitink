import { describe, expect, it } from 'vitest';
import { STEP, VEHICLES } from '../src/sim/constants';
import { addFlyover, addRoad, createNetwork, planFlyover, planRoad, setControl, setRoad } from '../src/sim/network';
import { deckZ } from '../src/sim/roadGeom';
import type { CarStore } from '../src/sim/store';
import { armTo, centre, createTraffic, cross, drive, gateFlows, gateNode, grid, land } from './sim.helpers';

const gate = (net: Parameters<typeof gateNode>[0], id: string) => ({ gate: gateNode(net, id) });
const run = (t: ReturnType<typeof createTraffic>, seconds: number, each?: () => void): void => {
  for (let k = 0; k < seconds / STEP; k++) { t.step(); each?.(); }
};

describe('trips', () => {
  it('estimates are close to the truth on empty roads, and say when there is no way', () => {
    const net = cross(8);
    const t = createTraffic(net, 1);
    const est = t.estimate(gate(net, 'W'), gate(net, 'N'), 1);
    expect(est.reachable).toBe(true);
    expect(est.viaRoads).toEqual([armTo(net, 'W'), armTo(net, 'N')]);
    const r = drive(t, gateFlows(net, [['W', 'N', 20]]), 60);
    expect(Math.abs(r.seconds / r.arrived - est.seconds)).toBeLessThan(4);
    const cut = createNetwork(land(20, 20), [{ cells: [[0, 2], [10, 2]], type: 'street' }, { cells: [[0, 8], [10, 8]], type: 'street' }], [{ id: 'A', cell: [0, 2] }, { id: 'B', cell: [0, 8] }]);
    const u = createTraffic(cut, 1);
    expect(u.estimate(gate(cut, 'A'), gate(cut, 'B'), 1).reachable).toBe(false);
    expect(u.spawn({ from: gate(cut, 'A'), to: gate(cut, 'B'), kind: 'car', value: 1, tag: 0 })).toBe(-1);
  });

  it('arrives once, then can be sent on to look for a space, then taken off', () => {
    const net = cross(8);
    const t = createTraffic(net, 1);
    const uid = t.spawn({ from: gate(net, 'W'), to: { road: armTo(net, 'E'), s: 150 }, kind: 'car', value: 1, tag: 42 });
    let first = 0;
    for (let k = 0; k < 400 && first === 0; k++) { t.step(); first = t.drainArrivals().length; }
    expect(first).toBe(1);
    expect(t.redirect(uid, { road: armTo(net, 'N'), s: 120 })).toBe(true);
    const slot = [...t.cars.uid].indexOf(uid);
    expect(t.cars.state[slot]).toBe(1);
    let again = 0;
    for (let k = 0; k < 600 && again === 0; k++) { t.step(); again = t.drainArrivals().filter((a) => a.uid === uid && a.tag === 42).length; }
    expect(again).toBe(1);
    expect(t.routeOf(uid)!.tag).toBe(42);
    t.remove(uid);
    expect(t.active).toBe(0);
    expect(t.routeOf(uid)).toBeNull();
    expect(t.redirect(uid, gate(net, 'N'))).toBe(false);
  });

  it('a car nobody claims has parked by the next step', () => {
    const net = cross(5);
    const t = createTraffic(net, 1);
    t.spawn({ from: gate(net, 'W'), to: { road: armTo(net, 'W'), s: 100 }, kind: 'taxi', value: 1, tag: 1 });
    run(t, 20);
    expect(t.active).toBe(0);
  });
});

describe('choices', () => {
  const loop = () => createNetwork(land(30, 20), [
    { cells: [[0, 8], [4, 8]], type: 'street' }, { cells: [[4, 8], [20, 8]], type: 'street' }, { cells: [[20, 8], [24, 8]], type: 'street' },
    { cells: [[4, 8], [4, 12], [20, 12], [20, 8]], type: 'street' },
  ], [{ id: 'A', cell: [0, 8] }, { id: 'B', cell: [24, 8] }]);

  it('a toll sends those who would rather not pay round the other way', () => {
    let net = loop();
    const direct = net.roads.find((r) => r.cells.length === 17)!;
    net = setRoad(net, direct.id, { toll: true });
    const t = createTraffic(net, 1);
    t.setConditions({ tollNow: 10, speed: 1, trucksAllowed: true });
    expect(t.estimate(gate(net, 'A'), gate(net, 'B'), 0.2).viaRoads).not.toContain(direct.id);
    const rich = t.estimate(gate(net, 'A'), gate(net, 'B'), 50);
    expect(rich.viaRoads).toContain(direct.id);
    expect(rich.toll).toBe(10);
    t.spawn({ from: gate(net, 'A'), to: gate(net, 'B'), kind: 'car', value: 50, tag: 0 });
    const paid: number[] = [];
    run(t, 60, () => { for (const a of t.drainArrivals()) paid.push(a.tolls); });
    expect(paid).toEqual([10]);
  });

  it('trucks keep off banned roads, and stay home when told to', () => {
    let net = loop();
    const direct = net.roads.find((r) => r.cells.length === 17)!;
    net = setRoad(net, direct.id, { truckBan: true });
    const t = createTraffic(net, 1);
    t.spawn({ from: gate(net, 'A'), to: gate(net, 'B'), kind: 'truck', value: 1, tag: 0 });
    let seen = 0;
    run(t, 60, () => { seen += t.carsOn(direct.id).length; });
    expect(seen).toBe(0);
    t.setConditions({ tollNow: 0, speed: 1, trucksAllowed: false });
    expect(t.spawn({ from: gate(net, 'A'), to: gate(net, 'B'), kind: 'truck', value: 1, tag: 0 })).toBe(-1);
  });

  it('drivers move to the quieter way when one is slow', () => {
    let net = loop();
    const direct = net.roads.find((r) => r.cells.length === 17)!;
    net = setRoad(net, direct.id, { works: 2 });
    const t = createTraffic(net, 1);
    drive(t, gateFlows(net, [['A', 'B', 40]]), 100);
    expect(t.roadStats(net.roads.find((r) => r.id !== direct.id && r.cells.length > 10)!.id).flow).toBeGreaterThan(0.5);
  });
});

describe('lanes', () => {
  it('buses have the bus lane to themselves', () => {
    let net = cross(10, 'avenue', 'signal');
    for (const r of net.roads) net = setRoad(net, r.id, { busLane: true });
    const t = createTraffic(net, 1);
    const c = t.cars as CarStore;
    const stop = (id: string) => ({ road: armTo(net, id), s: 160 });
    const id = t.addService({ stops: [stop('N'), stop('S')], kind: 'bus', dwell: 2, vehicles: 3, tag: 5 });
    let carsIn = 0, busesIn = 0;
    drive(t, gateFlows(net, [['N', 'S', 20], ['W', 'E', 20], ['S', 'E', 8], ['E', 'N', 8]]), 120, 1, () => {
      for (let i = 0; i < c.count; i++) {
        const k = c.track[i];
        if (!c.alive[i] || k?.kind !== 0 || k.lane !== 1) continue;
        if (VEHICLES[c.kind[i]!] === 'bus') busesIn++; else carsIn++;
      }
    });
    expect(carsIn).toBe(0);
    expect(busesIn).toBeGreaterThan(100);
    expect(t.serviceLap(id)).toBeGreaterThan(10);
    t.removeService(id);
    expect([...Array(c.count).keys()].some((i) => c.alive[i] && VEHICLES[c.kind[i]!] === 'bus')).toBe(false);
  });

  it('a breakdown on an avenue is driven round; on a street it holds the queue, then clears', () => {
    const passed = (type: 'street' | 'avenue'): number[] => {
      const net = cross(10, type);
      const t = createTraffic(net, 1);
      expect(t.block({ road: armTo(net, 'W'), s: 200 }, 30, 3)).toBeGreaterThan(0);
      const flows = gateFlows(net, [['W', 'E', 20]]);
      return [drive(t, flows, 28).arrived, drive(t, flows, 40).arrived];
    };
    expect(passed('street')[0]).toBe(0);
    expect(passed('street')[1]).toBeGreaterThan(4);
    expect(passed('avenue')[0]).toBeGreaterThan(1);
  });

  it('a service survives the night and a rebuilt network', () => {
    let net = cross(10, 'street', 'yield');
    const t = createTraffic(net, 1);
    t.addService({ stops: [{ road: armTo(net, 'N'), s: 160 }, { road: armTo(net, 'E'), s: 160 }, { road: armTo(net, 'S'), s: 160 }], kind: 'tram', dwell: 1.5, vehicles: 2, tag: 5 });
    t.startDay();
    run(t, 40);
    expect(t.active).toBe(2);
    net = setControl(net, centre(net, 10), 'roundabout');
    t.setNetwork(net);
    run(t, 40);
    expect(t.active).toBe(2);
    t.endDay();
    expect(t.active).toBe(0);
    t.startDay();
    run(t, 20);
    expect(t.active).toBe(2);
  });
});

describe('what the player reads', () => {
  it('movements, shares, arrows and grades; yesterday is kept for the night', () => {
    const net = cross(10, 'street', 'signal');
    const t = createTraffic(net, 1);
    const j = centre(net, 10);
    t.startDay();
    drive(t, gateFlows(net, [['W', 'E', 14], ['S', 'W', 12], ['N', 'S', 14]]), 100);
    const m = t.movements(j);
    expect(m.length).toBe(12);
    expect(m.reduce((s, q) => s + q.share, 0)).toBeCloseTo(1, 3);
    expect(m.every((q) => q.arrow.length > 4)).toBe(true);
    const live = t.junctionStats(j);
    expect(live.cars).toBeGreaterThan(30);
    t.endDay();
    expect(t.active).toBe(0);
    const night = t.junctionStats(j);
    expect(night.cars).toBe(live.cars);
    expect(night.wait).toBeGreaterThan(0.5);
    expect(t.roadStats(armTo(net, 'W')).flow).toBeGreaterThan(1);
    expect(t.roadStats(-5)).toEqual({ flow: 0, speedRatio: 1, queue: 0 });
  });

  it('a hopeless jam is graded F and drivers honk, then give up', () => {
    const net = cross(10, 'street', 'yield');
    const t = createTraffic(net, 1);
    const flows = gateFlows(net, [['W', 'E', 40], ['S', 'N', 40], ['N', 'W', 40], ['E', 'S', 40]]);
    for (let k = 0; k < 60 / STEP; k++) {
      for (const f of flows) t.spawn({ from: f.from, to: f.to, kind: 'car', value: 1, tag: 0 });
      t.step();
      for (const a of t.drainArrivals()) t.remove(a.uid);
    }
    expect(['E', 'F']).toContain(t.junctionStats(centre(net, 10)).grade);
    expect(Math.max(...t.cars.anger)).toBeGreaterThan(0.4);
    expect(t.drainHonks().length).toBeGreaterThan(0);
  });

  it('cars on a deck are as high as the deck', () => {
    let net = cross(8, 'avenue', 'signal');
    net = addFlyover(net, planFlyover(net, centre(net, 8), armTo(net, 'S'), armTo(net, 'N'), 1));
    const fly = net.roads.find((r) => r.flyover)!;
    const t = createTraffic(net, 1);
    const c = t.cars as CarStore;
    let top = 0, off = 0;
    drive(t, gateFlows(net, [['S', 'N', 30]]), 40, 1, () => {
      for (let i = 0; i < c.count; i++) {
        const k = c.track[i];
        if (!c.alive[i] || !k?.key.startsWith(`L${fly.id * 2}:`)) continue;
        top = Math.max(top, c.z[i]!);
        off = Math.max(off, Math.abs(c.z[i]! - deckZ(fly, 14 + c.s[i]!)));
      }
    });
    expect(top).toBeGreaterThan(24);
    expect(off).toBeLessThan(1.5);
  });
});

describe('odd networks', () => {
  it('dead ends turn round, one-way streets flow one way, new roads are used', () => {
    let net = createNetwork(land(24, 24), [{ cells: [[0, 10], [18, 10]], type: 'street' }, { cells: [[10, 10], [10, 16]], type: 'street' }], [{ id: 'A', cell: [0, 10] }]);
    const t = createTraffic(net, 1);
    const dead = net.roads.find((r) => r.cells.some((c) => c.gy === 16))!;
    const r = drive(t, [{ from: { gate: gateNode(net, 'A') }, to: { road: dead.id, s: 100 }, perMin: 10 }, { from: { road: dead.id, s: 100 }, to: { gate: gateNode(net, 'A') }, perMin: 10 }], 90);
    expect(r.gaveUp).toBe(0);
    expect(r.arrived).toBeGreaterThan(15);
    net = setRoad(net, dead.id, { oneWay: true, dir: -1 });
    net = addRoad(net, planRoad(net, [{ gx: 10, gy: 16 }, { gx: 4, gy: 16 }, { gx: 4, gy: 10 }], 'street'));
    t.setNetwork(net);
    const est = t.estimate({ gate: gateNode(net, 'A') }, { road: dead.id, s: 100 }, 1);
    expect(est.reachable).toBe(true);
    expect(est.viaRoads!.length).toBeGreaterThan(2);
  });

  it('every way in and out of a busy mixed city works', () => {
    let net = grid(3, 6, 'avenue', 'roundabout');
    net = setRoad(net, net.roads[4]!.id, { type: 'highway' });
    net = setRoad(net, net.roads[7]!.id, { type: 'boulevard', kerb: true });
    const t = createTraffic(net, 3);
    const gates = net.junctions.filter((j) => j.gate).map((j) => j.id);
    const r = drive(t, gates.map((a, i) => ({ from: { gate: a }, to: { road: net.roads[(i * 5 + 1) % net.roads.length]!.id, s: 110 }, perMin: 8 })), 120);
    expect(r.arrived).toBeGreaterThan(90);
    expect(r.gaveUp).toBeLessThan(r.spawned * 0.05);
  });
});
