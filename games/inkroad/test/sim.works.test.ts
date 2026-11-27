import { describe, expect, it } from 'vitest';
import { createTraffic } from '../src/sim/traffic';
import { addRoad, nearestAccess, planRoad, roadAt, setRoad } from '../src/sim/network';
import type { Access, Network } from '../src/sim/trafficTypes';
import { drive, grid, type Flow } from './sim.helpers';

/** Road works close a road to cars (docs/inkroad-build.md "Road works close the road"). */
const gate = (net: Network, id: string): Access => ({ gate: net.junctions.find((j) => j.gate === id)!.id });

/** A 3 x 3 grid of streets 8 cells apart; the dug road is the middle row's piece between the first two crossings. */
const city = (): { net: Network; dug: number } => {
  const net = grid(3, 8);
  return { net, dug: roadAt(net, { gx: 12, gy: 16 })!.id };
};

const THROUGH = (net: Network): Flow[] => [
  { from: gate(net, 'W2'), to: gate(net, 'E2'), perMin: 24 },
  { from: gate(net, 'E2'), to: gate(net, 'W2'), perMin: 24 },
  { from: gate(net, 'N1'), to: gate(net, 'E2'), perMin: 12 },
];

describe('road works close the road', () => {
  it('no car enters a road under works: trips go round and still arrive; when it opens, cars use it again', () => {
    const { net, dug } = city();
    const t = createTraffic(net, 1);
    expect(t.estimate(gate(net, 'W2'), gate(net, 'E2'), 1).viaRoads).toContain(dug);
    drive(t, THROUGH(net), 60);
    expect(t.carsOn(dug).length).toBeGreaterThan(0);

    const closed = setRoad(net, dug, { works: 1 });
    t.setNetwork(closed);
    const round = t.estimate(gate(closed, 'W2'), gate(closed, 'E2'), 1);
    expect(round.reachable).toBe(true);
    expect(round.viaRoads).not.toContain(dug);
    // Cars already on it when the works start drive off it; after that nobody is ever on it.
    let lastOn = 0;
    const day = drive(t, THROUGH(closed), 240, 2, (k) => { if (t.carsOn(dug).length > 0) lastOn = k; });
    const after = drive(t, [], 60, 2, () => { if (t.carsOn(dug).length > 0) lastOn = 9999; });
    expect(lastOn * 0.1).toBeLessThan(20);
    expect(day.arrived + after.arrived).toBeGreaterThan(day.spawned * 0.95);
    expect(day.gaveUp + after.gaveUp).toBe(0);

    const open = setRoad(closed, dug, { works: 0 });
    t.setNetwork(open);
    let seen = 0;
    drive(t, THROUGH(open), 60, 3, () => { seen = Math.max(seen, t.carsOn(dug).length); });
    expect(seen).toBeGreaterThan(0);
  });

  it('a block whose only road is closed is cut off by car; with another road in reach it uses that one', () => {
    const { net, dug } = city();
    // Just north of the dug road, halfway between two side streets 8 cells apart: only the dug road is in reach.
    const alone = { gx: 11, gy: 14, w: 2, h: 1 };
    // On the corner of the dug road and the second side street: both in reach.
    const corner = { gx: 13, gy: 14, w: 2, h: 1 };
    expect(nearestAccess(net, alone)!.road).toBe(dug);
    expect(nearestAccess(net, corner)!.road).toBe(dug);
    const closed = setRoad(net, dug, { works: 1 });
    // The drawn driveway stays where it is; asked for an open road, only the corner block has one.
    const cut = nearestAccess(closed, alone)!;
    expect(cut.road).toBe(dug);
    expect(nearestAccess(closed, alone, undefined, false, true)).toBeNull();
    const other = nearestAccess(closed, corner, undefined, false, true);
    expect(other).not.toBeNull();
    expect(other!.road).not.toBe(dug);

    const t = createTraffic(closed, 1);
    expect(t.estimate(cut, gate(closed, 'E2'), 1).reachable).toBe(false);
    expect(t.estimate(gate(closed, 'E2'), cut, 1).reachable).toBe(false);
    expect(t.spawn({ from: cut, to: gate(closed, 'E2'), kind: 'car', value: 1, tag: 0 })).toBe(-1);
    expect(t.estimate(other!, gate(closed, 'E2'), 1).reachable).toBe(true);
    // When the works end the block's road takes cars again.
    expect(createTraffic(net, 1).estimate(cut, gate(net, 'E2'), 1).reachable).toBe(true);
  });

  it('night works leave the road open by day', () => {
    const { net, dug } = city();
    const night = setRoad(net, dug, { works: 1, nightWorks: true });
    const t = createTraffic(night, 1);
    expect(t.estimate(gate(night, 'W2'), gate(night, 'E2'), 1).viaRoads).toContain(dug);
  });

  it('buses skip a stop on a road under works and drive round it', () => {
    const { net, dug } = city();
    const closed = setRoad(net, dug, { works: 1 });
    const t = createTraffic(closed, 1);
    const north = roadAt(closed, { gx: 12, gy: 8 })!.id, south = roadAt(closed, { gx: 12, gy: 24 })!.id;
    t.addService({ stops: [{ road: north, s: 60 }, { road: dug, s: 60 }, { road: south, s: 60 }], kind: 'bus', dwell: 1, vehicles: 2, tag: 9 });
    t.startDay();
    let on = 0;
    drive(t, [], 120, 1, () => { on += t.carsOn(dug).length; });
    expect(on).toBe(0);
    expect(t.active).toBe(2);
  });

  it('a road split by a new road while dug keeps the works on both pieces (each counts down to open)', () => {
    const { net, dug } = city();
    const dugNet = setRoad(net, dug, { works: 1 });
    const split = addRoad(dugNet, planRoad(dugNet, [{ gx: 12, gy: 16 }, { gx: 12, gy: 20 }], 'street'));
    const pieces = split.roads.filter((r) => r.cells.some((x) => x.gy === 16 && x.gx > 8 && x.gx < 16) && r.cells.every((x) => x.gy === 16));
    expect(pieces.length).toBe(2);
    expect(pieces.every((r) => r.works === 1)).toBe(true);
    const open = pieces.reduce((n, r) => setRoad(n, r.id, { works: r.works - 1 }), split);
    expect(open.roads.every((r) => r.works === 0)).toBe(true);
  });
});
