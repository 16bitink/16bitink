import { describe, expect, it } from 'vitest';
import { STEP } from '../src/sim/constants';
import { angleDiff } from '../src/sim/geom';
import { addFlyover, addRoad, createNetwork, planFlyover, planRoad, removeRoad, setControl, setRoad, setSplit } from '../src/sim/network';
import { cycleOf } from '../src/sim/signals';
import { SIGNAL } from '../src/sim/tune';
import type { CarStore } from '../src/sim/store';
import { armTo, centre, createTraffic, cross, drive, gateFlows, gateNode, grid, land, type Flow } from './sim.helpers';
import type { Network, Traffic } from '../src/sim/trafficTypes';

const DIRS = ['N', 'E', 'S', 'W'] as const;
const mixed = (net: Network, perArm: number): Flow[] =>
  gateFlows(net, DIRS.flatMap((a, i) => DIRS.filter((b) => b !== a).map((b) => [a, b, b === DIRS[(i + 2) % 4] ? perArm / 2 : perArm / 4] as const)));

const gridFlows = (net: Network, perMin: number, count = 2): Flow[] => {
  const gates = net.junctions.filter((j) => j.gate).map((j) => j.id);
  return gates.flatMap((a, i) => Array.from({ length: count }, (_, k) => ({ from: { gate: a }, to: { gate: gates[(i + 3 + k * 4) % gates.length]! }, perMin })));
};

const hash = (t: Traffic): number => {
  let h = 17;
  for (let i = 0; i < t.cars.count; i++) if (t.cars.alive[i]) h = (Math.imul(h, 31) + Math.round(t.cars.x[i]! * 64) * 7 + Math.round(t.cars.y[i]! * 64) + t.cars.uid[i]!) | 0;
  return h;
};

/** Every track's queue is in order and nobody overlaps. */
function checkQueues(t: Traffic): number {
  const c = t.cars as CarStore;
  let worst = Infinity;
  for (let i = 0; i < c.count; i++) {
    if (!c.alive[i]) continue;
    const a = c.ahead[i]!;
    if (a < 0) continue;
    expect(c.track[a]).toBe(c.track[i]);
    worst = Math.min(worst, c.s[a]! - c.s[i]! - c.half[a]! - c.half[i]!);
  }
  return worst;
}

/** Follow every car and record the biggest jump beyond its speed, and the biggest turn of the wheel. */
function watcher(t: Traffic) {
  const last = new Map<number, { x: number; y: number; z: number; h: number; v: number }>();
  const worst = { jump: 0, turn: 0, z: 0, note: '' };
  const look = (): void => {
    const c = t.cars as CarStore;
    for (let i = 0; i < c.count; i++) {
      if (!c.alive[i]) continue;
      const p = last.get(c.uid[i]!);
      if (p) {
        const d = Math.hypot(c.x[i]! - p.x, c.y[i]! - p.y);
        const jump = d - Math.max(p.v, c.speed[i]!) * STEP;
        if (jump > worst.jump) { worst.jump = jump; worst.note = `${c.track[i]!.key} s${c.s[i]!.toFixed(1)} off${c.sliding(i).toFixed(1)} v${c.v[i]!.toFixed(1)}`; }
        worst.turn = Math.max(worst.turn, Math.abs(angleDiff(p.h, c.heading[i]!)));
        worst.z = Math.max(worst.z, Math.abs(c.z[i]! - p.z));
      }
      last.set(c.uid[i]!, { x: c.x[i]!, y: c.y[i]!, z: c.z[i]!, h: c.heading[i]!, v: c.speed[i]! });
    }
  };
  return { worst, look };
}

describe('cars', () => {
  it('same seed, same city', () => {
    const run = (): number => {
      const net = grid(3, 6, 'avenue', 'signal');
      const t = createTraffic(net, 7);
      drive(t, gridFlows(net, 12), 60, 3);
      return hash(t);
    };
    expect(run()).toBe(run());
  });

  it.each(['yield', 'roundabout', 'signal', 'smart'] as const)('%s: no overlaps on a lane, no teleports', (control) => {
    for (const type of ['street', 'avenue', 'boulevard'] as const) {
      const net = grid(2, 8, type, control);
      const t = createTraffic(net, 1);
      const w = watcher(t);
      let gap = Infinity;
      const r = drive(t, gridFlows(net, 10, 3), 90, 2, () => { w.look(); gap = Math.min(gap, checkQueues(t)); });
      expect(r.arrived).toBeGreaterThan(60);
      expect(gap).toBeGreaterThan(-0.01);
      expect(w.worst.jump, `${type} ${control} ${w.worst.note}`).toBeLessThan(2.2);
      expect(w.worst.turn, `${type} ${control}`).toBeLessThan(0.6);
    }
  });

  it('driveways: cars turn in and out without teleports', () => {
    const net = grid(2, 8, 'avenue', 'signal');
    const t = createTraffic(net, 1);
    const roads = net.roads.filter((r) => r.cells.length > 5);
    const at = (k: number) => ({ road: roads[k % roads.length]!.id, s: 120 + (k % 3) * 20 });
    const flows: Flow[] = Array.from({ length: 12 }, (_, k) => ({ from: at(k), to: at(k * 5 + 2), perMin: 6 }));
    const w = watcher(t);
    const r = drive(t, flows, 120, 4, () => w.look());
    expect(r.arrived).toBeGreaterThan(80);
    expect(r.gaveUp).toBe(0);
    expect(w.worst.jump, w.worst.note).toBeLessThan(2.2);
    expect(w.worst.turn).toBeLessThan(0.6);
  });

  it('a bend adds no delay, diagonal or square', () => {
    const run = (cells: [number, number][]): number => {
      const net = createNetwork(land(40, 40), [{ cells: cells.slice(0, 2), type: 'street' }, { cells: cells.slice(1), type: 'street' }], [{ id: 'A', cell: cells[0]! }, { id: 'B', cell: cells[cells.length - 1]! }]);
      const t = createTraffic(net, 1);
      const r = drive(t, gateFlows(net, [['A', 'B', 20], ['B', 'A', 20]]), 90);
      return r.seconds / r.arrived;
    };
    const straight = run([[1, 20], [12, 20], [24, 20]]);
    expect(run([[1, 20], [12, 20], [12, 31]])).toBeLessThan(straight * 1.06);
    expect(run([[1, 20], [12, 20], [20, 28]])).toBeLessThan(straight * 1.1);
  });
});

describe('junctions', () => {
  it('a lane discharges 0.5 to 0.7 cars a second of green and amber', () => {
    let net = cross(14, 'street', 'signal');
    net = setSplit(net, centre(net, 14), [0.5, 0.5]);
    const t = createTraffic(net, 1);
    const flows = gateFlows(net, [['S', 'N', 120]]);
    drive(t, flows, 60);
    const r = drive(t, flows, 120, 5);
    const perCycle = (r.arrived / 120) * cycleOf(2);
    const usable = cycleOf(2) / 2 - SIGNAL.red; // green and amber of one phase
    expect(perCycle / usable).toBeGreaterThan(0.5);
    expect(perCycle / usable).toBeLessThan(0.7);
  });

  it('a heavy movement starves the next roundabout entry', () => {
    const net = cross(12, 'street', 'roundabout');
    const wait = (heavy: number): number => {
      const t = createTraffic(net, 1);
      drive(t, gateFlows(net, [['W', 'E', heavy], ['S', 'N', 8]]), 120);
      return t.movements(centre(net, 12)).find((m) => m.fromRoad === armTo(net, 'S') && m.toRoad === armTo(net, 'N'))!.wait;
    };
    expect(wait(38)).toBeGreaterThan(10);
    expect(wait(6)).toBeLessThan(3);
  });

  it.each(['roundabout', 'signal'] as const)('%s: a flyover for the heavy left more than halves the wait', (control) => {
    const run = (fly: boolean): { wait: number; flown: boolean } => {
      let net = cross(12, 'avenue', control);
      const j = centre(net, 12);
      if (fly) net = addFlyover(net, planFlyover(net, j, armTo(net, 'S'), armTo(net, 'W'), 1));
      const t = createTraffic(net, 1);
      const w = watcher(t);
      drive(t, [...mixed(net, 12), ...gateFlows(net, [['S', 'W', 26]])], 120, 1, () => w.look());
      expect(w.worst.jump, w.worst.note).toBeLessThan(2.2);
      expect(w.worst.z).toBeLessThan(5);
      return { wait: t.junctionStats(j).wait, flown: t.movements(j).some((m) => m.flyover && m.cars > 20) };
    };
    const before = run(false), after = run(true);
    expect(after.flown).toBe(true);
    expect(after.wait).toBeLessThan(before.wait / 2);
  });

  it('a bigger road has priority at a yield', () => {
    const net = cross(12, 'avenue', 'yield', 'street');
    const t = createTraffic(net, 1);
    drive(t, gateFlows(net, [['N', 'S', 30], ['S', 'N', 30], ['W', 'E', 10]]), 120);
    const m = t.movements(centre(net, 12));
    const of = (a: string, b: string) => m.find((q) => q.fromRoad === armTo(net, a) && q.toRoad === armTo(net, b))!.wait;
    expect(of('N', 'S')).toBeLessThan(1.5);
    expect(of('W', 'E')).toBeGreaterThan(of('N', 'S') * 2);
  });
});

describe('never locks up', () => {
  it.each(['yield', 'roundabout', 'signal'] as const)('%s: a saturated 4 x 4 grid keeps moving for ten minutes', (control) => {
    const net = grid(4, 5, 'street', control);
    const t = createTraffic(net, 1);
    const flows = gridFlows(net, 14, 3);
    const perMinute: number[] = [];
    for (let m = 0; m < 10; m++) perMinute.push(drive(t, flows, 60, 10 + m).arrived);
    expect(Math.min(...perMinute)).toBeGreaterThan(8);
  }, 60000);

  it('roads come and go under traffic', () => {
    let net = grid(3, 6, 'avenue', 'signal');
    const t = createTraffic(net, 1);
    const flows = gridFlows(net, 10);
    const ok = (): void => {
      const c = t.cars as CarStore;
      for (let i = 0; i < c.count; i++) {
        if (!c.alive[i]) continue;
        const tr = c.track[i]!;
        expect(Number.isFinite(c.x[i]!) && Number.isFinite(c.y[i]!)).toBe(true);
        expect((t as Traffic).carsOn(tr.link >= 0 ? -1 : -2)).toEqual([]);
        if (tr.kind === 0) expect(net.links.some((l) => `L${l.id}:${tr.lane}` === tr.key)).toBe(true);
      }
      expect(checkQueues(t)).toBeGreaterThan(-0.01);
    };
    drive(t, flows, 40);
    for (let k = 0; k < 12; k++) {
      const inner = net.roads.filter((r) => !r.flyover && ![r.a, r.b].some((n) => net.junctions.find((j) => j.id === n)!.gate));
      if (k % 4 === 0) net = removeRoad(net, inner[k % inner.length]!.id);
      else if (k % 4 === 1) net = setControl(net, net.junctions.filter((j) => j.arms.length > 2)[k % 5]!.id, 'roundabout');
      else if (k % 4 === 2) net = setRoad(net, inner[(k * 3) % inner.length]!.id, { type: k % 8 === 2 ? 'boulevard' : 'street' });
      else {
        const j = net.junctions.find((n) => n.arms.length === 4 && !n.ramp)!;
        const p = planFlyover(net, j.id, j.arms[0]!, j.arms[1]!, 1);
        if (p.ok) net = addFlyover(net, p);
        const road = planRoad(net, [{ gx: 8, gy: 6 + (k % 3) * 2 }, { gx: 8, gy: 12 }], 'street');
        if (road.ok) net = addRoad(net, road);
      }
      t.setNetwork(net);
      ok();
      const r = drive(t, flows, 15, k, k % 5 === 0 ? ok : undefined);
      expect(r.arrived + r.spawned).toBeGreaterThan(0);
    }
  });

  it('a lost destination sends the car home', () => {
    const net = cross(6);
    const t = createTraffic(net, 1);
    const east = armTo(net, 'E');
    expect(t.spawn({ from: { gate: gateNode(net, 'W') }, to: { road: east, s: 200 }, kind: 'car', value: 1, tag: 9 })).toBeGreaterThan(0);
    drive(t, [], 2);
    t.setNetwork(removeRoad(net, east));
    expect(t.drainGaveUp().map((g) => g.tag).concat(t.active > 0 ? [9] : [])).toContain(9);
    const r = drive(t, [], 80);
    expect(t.active).toBe(0);
    expect(r.arrived + r.gaveUp).toBeLessThanOrEqual(1);
  });
});
