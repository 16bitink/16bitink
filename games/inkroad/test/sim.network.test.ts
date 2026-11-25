import { describe, expect, it } from 'vitest';
import {
  addFlyover, addRoad, createNetwork, junctionAt, nearestAccess, planFlyover, planRoad, removeRoad, roadAt, roundaboutFits, setControl,
  setJunctionWorks, setRoad, setSplit, signalPhases,
} from '../src/sim/network';
import { lineLength } from '../src/sim/geom';
import { armTo, centre, cross, grid, land } from './sim.helpers';

const c = (gx: number, gy: number) => ({ gx, gy });

describe('network', () => {
  it('crosses two roads into four arms, clockwise from north', () => {
    const net = cross(5);
    const j = junctionAt(net, c(6, 6))!;
    expect(j.arms).toEqual([armTo(net, 'N'), armTo(net, 'E'), armTo(net, 'S'), armTo(net, 'W')]);
    expect(net.links.length).toBe(8);
    expect(signalPhases(net, j.id).length).toBe(2);
    expect(j.split).toEqual([0.5, 0.5]);
  });

  it('keeps ids and objects of what it does not touch', () => {
    const net = grid(2, 5);
    const plan = planRoad(net, [c(2, 2), c(2, 5)], 'street');
    expect(plan.ok).toBe(true);
    const next = addRoad(net, plan);
    expect(next.version).toBe(net.version + 1);
    for (const r of net.roads) if (!plan.splits.includes(r.id)) expect(next.roads.find((q) => q.id === r.id)).toBe(r);
    expect(new Set(next.roads.map((r) => r.id)).size).toBe(next.roads.length);
    expect(new Set([...next.roads.map((r) => r.id), ...next.junctions.map((j) => j.id)]).size).toBe(next.roads.length + next.junctions.length);
  });

  it('removing the road heals the split', () => {
    const net = grid(2, 5);
    const next = addRoad(net, planRoad(net, [c(2, 2), c(2, 5)], 'street'));
    const road = roadAt(next, c(2, 3))!;
    const back = removeRoad(next, road.id);
    expect(back.roads.length).toBe(net.roads.length);
    expect(junctionAt(back, c(2, 5))).toBeUndefined();
  });

  it('refuses bad roads with a reason', () => {
    const map = land(20, 12).map((r, y) => (y === 6 ? `~~~~${r.slice(4, 12)}~#ph....` : r));
    const net = createNetwork(map, [{ cells: [[1, 1], [10, 1]], type: 'street' }], []);
    const why = (cells: [number, number][], type: 'street' | 'avenue' = 'street', blocked = false) =>
      planRoad(net, cells.map(([x, y]) => c(x, y)), type, { blocked: () => blocked }).why;
    expect(why([[2, 1], [5, 1]])).toMatch(/already/);
    expect(why([[13, 5], [13, 6]])).toMatch(/Rock/);
    expect(why([[14, 5], [14, 6]])).toMatch(/park/);
    expect(why([[15, 5], [15, 7]], 'avenue')).toMatch(/street/);
    expect(why([[15, 5], [15, 7]])).toBeUndefined();
    expect(why([[2, 5], [2, 6]])).toMatch(/both ends/);
    expect(why([[1, 5], [2, 6], [2, 7]])).toMatch(/straight/);
    expect(why([[2, 5], [2, 8]])).toBeUndefined();
    expect(why([[6, 3], [9, 3], [8, 4]])).toMatch(/sharp/);
    expect(why([[6, 3], [30, 3]])).toMatch(/off the map/);
    expect(why([[6, 3], [9, 3]], 'street', true)).toMatch(/building/);
    expect(why([[6, 3], [8, 3], [8, 4], [7, 4], [7, 3], [6, 3]])).toBeTruthy();
    expect(planRoad(net, [c(2, 5), c(2, 8)], 'street').cellsOnWater).toBe(1);
  });

  it('one-way, types, splits and works', () => {
    let net = cross(5, 'avenue', 'signal');
    const n = armTo(net, 'N');
    net = setRoad(net, n, { oneWay: true, dir: -1 });
    const r = net.roads.find((q) => q.id === n)!;
    expect(r.links).toEqual([n * 2 + 1]);
    expect(net.links.find((l) => l.id === n * 2 + 1)!.lanes).toBe(4);
    net = setRoad(net, n, { works: 2, oneWay: false });
    expect(net.links.find((l) => l.id === n * 2)!.freeSpeed).toBeLessThan(80);
    const j = centre(net, 5);
    net = setSplit(net, j, [3, 1]);
    expect(net.junctions.find((q) => q.id === j)!.split).toEqual([0.75, 0.25]);
    expect(setJunctionWorks(net, j, 1).junctions.find((q) => q.id === j)!.works).toBe(1);
    expect(roundaboutFits(net, j).ok).toBe(true);
  });

  it('finds driveways and roads', () => {
    const net = cross(6);
    const a = nearestAccess(net, { gx: 8, gy: 3, w: 2, h: 2 })!;
    expect([armTo(net, 'N'), armTo(net, 'E')]).toContain(a.road);
    expect(nearestAccess(net, { gx: 12, gy: 12, w: 1, h: 1 })).toBeNull();
  });
});

describe('flyover', () => {
  it.each([['S', 'W'], ['S', 'N'], ['S', 'E']] as const)('%s to %s lays ramps', (from, to) => {
    const net = cross(6, 'avenue', 'roundabout');
    const j = centre(net, 6);
    const plan = planFlyover(net, j, armTo(net, from), armTo(net, to), 1);
    expect(plan.ok).toBe(true);
    const next = addFlyover(net, plan);
    expect(next.roads.length).toBe(net.roads.length + 3);
    const fly = next.roads.find((r) => r.flyover)!;
    const node = next.junctions.find((n) => n.id === j)!;
    expect(node.arms).toContain(fly.flyover!.fromRoad);
    expect(node.arms).toContain(fly.flyover!.toRoad);
    expect(next.junctions.filter((n) => n.ramp).length).toBe(2);
    let worst = 0;
    for (let i = 2; i < fly.line.length; i++) {
      const [p, q, r] = [fly.line[i - 2]!, fly.line[i - 1]!, fly.line[i]!];
      const d = Math.atan2(r.y - q.y, r.x - q.x) - Math.atan2(q.y - p.y, q.x - p.x);
      worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(d), Math.cos(d))));
    }
    expect(worst).toBeLessThan(0.45);
    expect(lineLength(fly.line)).toBeGreaterThan(160);
    expect(planFlyover(next, j, fly.flyover!.fromRoad, fly.flyover!.toRoad, 1).why).toMatch(/already/);
    const third = next.junctions.find((n) => n.id === j)!.arms.find((a) => a !== fly.flyover!.fromRoad && a !== fly.flyover!.toRoad)!;
    expect(planFlyover(next, j, fly.flyover!.fromRoad, third, 1).why).toMatch(/already has a ramp/);
    expect(planFlyover(next, j, third, fly.flyover!.toRoad, 1).why).toMatch(/already has a ramp/);
    const back = removeRoad(next, fly.id);
    expect(back.roads.length).toBe(net.roads.length);
    expect(back.junctions.length).toBe(net.junctions.length);
  });

  it('works on diagonal and bent arms, and refuses short ones', () => {
    const net = createNetwork(land(30, 30), [
      { cells: [[4, 4], [24, 24]], type: 'street' },
      { cells: [[14, 14], [14, 11], [18, 7], [18, 3]], type: 'street' },
      { cells: [[14, 14], [11, 17], [6, 17]], type: 'avenue' },
      { cells: [[14, 14], [16, 14]], type: 'street' },
    ], []);
    const j = junctionAt(net, c(14, 14))!;
    for (const a of j.arms) for (const b of j.arms) {
      if (a === b) continue;
      const short = [a, b].includes(roadAt(net, c(15.5, 14))!.id);
      const plan = planFlyover(net, j.id, a, b, -1);
      expect(plan.ok).toBe(!short);
      if (short) expect(plan.why).toMatch(/too short/);
    }
  });

  it('goes when its approach goes', () => {
    const net = cross(6);
    const j = centre(net, 6);
    const next = addFlyover(net, planFlyover(net, j, armTo(net, 'S'), armTo(net, 'W'), 1));
    const fly = next.roads.find((r) => r.flyover)!;
    const back = removeRoad(next, fly.flyover!.fromRoad);
    expect(back.roads.some((r) => r.flyover)).toBe(false);
    expect(back.junctions.some((n) => n.ramp)).toBe(false);
  });
});

describe('controls', () => {
  it('ramps never take a control', () => {
    const net = cross(6);
    const next = addFlyover(net, planFlyover(net, centre(net, 6), armTo(net, 'S'), armTo(net, 'W'), 1));
    const ramp = next.junctions.find((n) => n.ramp)!;
    expect(setControl(next, ramp.id, 'signal')).toBe(next);
  });
});
