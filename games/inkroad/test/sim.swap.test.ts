/** Changing a jammed junction during the day: it must recover as if it had always been so. */
import { describe, expect, it } from 'vitest';
import { STEP } from '../src/sim/constants';
import { addFlyover, planFlyover, setControl, setSplit } from '../src/sim/network';
import { createRng } from '../src/sim/rng';
import { createTraffic } from '../src/sim/traffic';
import type { CarStore } from '../src/sim/store';
import type { Network } from '../src/sim/trafficTypes';
import type { Control } from '../src/sim/types';
import { crossroads } from '../dev/captable';

const ARMS = ['w', 'e', 'n', 's'] as const;
const gate = (net: Network, id: string): number => net.junctions.find((j) => j.gate === id)!.id;
const arm = (net: Network, id: string): number => net.junctions.find((j) => j.gate === id)!.arms[0]!;
const JAM = 40, SETTLE = 20, WATCH = 100, LONG = 60;

type Change = (net: Network, node: number) => Network;
interface Run { out: number; sentHome: number; ghosts: number; stuck: number }

/** Saturated or `rate` demand; the change comes at `at` seconds (0 = built so from the start). */
function run(first: Control, change: Change, at: number, seed: number, heavy: boolean): Run {
  const type = 'street';
  let { net, node } = crossroads(type, first);
  if (at === 0) net = change(net, node);
  const t = createTraffic(net, 1);
  const c = t.cars as CarStore;
  t.startDay();
  const rng = createRng(seed);
  const lists = new Map<string, string[]>(ARMS.map((a) => [a, []]));
  const result: Run = { out: 0, sentHome: 0, ghosts: 0, stuck: 0 };
  let due = 0;
  for (let k = 0; k < (JAM + SETTLE + WATCH) / STEP; k++) {
    if (at > 0 && k === at / STEP) {
      net = change(net, node);
      t.setNetwork(net);
      result.sentHome = t.drainGaveUp().length;
    }
    for (due += (heavy ? 1.4 : 2.6) * STEP; due >= 1; due--) {
      let a: string = rng.pick(ARMS);
      if (heavy && rng.chance(0.5)) a = 'w';
      let b: string = rng.pick(ARMS.filter((x) => x !== a));
      if (heavy && a === 'w' && rng.chance(0.6)) b = 'n';
      if (lists.get(a)!.length < 20) lists.get(a)!.push(b);
    }
    for (const [a, list] of lists) {
      if (list.length > 0 && t.spawn({ from: { gate: gate(net, a) }, to: { gate: gate(net, list[0]!) }, kind: 'car', value: 0.3, tag: 0 }) > 0) list.shift();
    }
    t.step();
    const done = t.drainArrivals();
    for (const a of done) t.remove(a.uid);
    t.drainGaveUp();
    if (k >= (JAM + SETTLE) / STEP) result.out += done.length / WATCH;
    for (let i = 0; i < c.count; i++) if (c.alive[i] && [3, 4].includes(c.track[i]!.kind) && !c.exitBy[i]) result.ghosts++;
  }
  return result;
}

const to = (control: Control): Change => (net, node) => setControl(net, node, control);
const CASES: [Control, Control][] = [
  ['yield', 'roundabout'], ['yield', 'signal'], ['yield', 'smart'], ['roundabout', 'signal'], ['signal', 'roundabout'], ['roundabout', 'yield'], ['signal', 'smart'],
];
const SEEDS = [3, 7, 8];
const mean = (list: number[]): number => list.reduce((p, q) => p + q, 0) / list.length;

describe('changing a jammed junction', () => {
  it.each(CASES)('%s to %s recovers to what it carries from the start', (first, control) => {
    const now = SEEDS.map((s) => run(first, to(control), JAM, s, false)), fresh = SEEDS.map((s) => run(first, to(control), 0, s, false));
    expect(now.every((r) => r.ghosts === 0)).toBe(true);
    expect(Math.max(...now.map((r) => r.sentHome))).toBeLessThanOrEqual(1);
    expect(mean(now.map((r) => r.out))).toBeGreaterThan(mean(fresh.map((r) => r.out)) * 0.9);
  });

  it.each(['yield', 'roundabout', 'signal'] as const)('a flyover opened in a %s jam', (first) => {
    const fly: Change = (net, node) => addFlyover(net, planFlyover(net, node, arm(net, 'w'), arm(net, 'n'), 1));
    const now = SEEDS.map((s) => run(first, fly, JAM, s, true)), fresh = SEEDS.map((s) => run(first, fly, 0, s, true));
    expect(Math.max(...now.map((r) => r.sentHome))).toBeLessThanOrEqual(1);
    expect(mean(now.map((r) => r.out))).toBeGreaterThan(mean(fresh.map((r) => r.out)) * 0.9);
  });

  it('a split moved in a jam', () => {
    const split: Change = (net, node) => setSplit(net, node, [0.6, 0.4]);
    const now = run('signal', split, JAM, 7, false), fresh = run('signal', split, 0, 7, false);
    expect(now.out).toBeGreaterThan(fresh.out * 0.9);
    expect(now.sentHome).toBe(0);
  });

  it('the grade turns green soon after the queue has gone', () => {
    let { net, node } = crossroads('street', 'yield');
    const t = createTraffic(net, 1);
    t.startDay();
    const rng = createRng(5);
    let green = -1, emptied = -1;
    const c = t.cars as CarStore;
    for (let k = 0; k < 140 / STEP; k++) {
      if (k === LONG / STEP) { expect(['D', 'E', 'F']).toContain(t.junctionStats(node).grade); net = setControl(net, node, 'roundabout'); t.setNetwork(net); }
      if (rng.chance((k < LONG / STEP ? 1.3 : 0.5) * STEP)) {
        const a = rng.pick(ARMS), b = rng.pick(ARMS.filter((x) => x !== a));
        t.spawn({ from: { gate: gate(net, a) }, to: { gate: gate(net, b) }, kind: 'car', value: 0.3, tag: 0 });
      }
      t.step();
      for (const a of t.drainArrivals()) t.remove(a.uid);
      let waiting = 0;
      for (let i = 0; i < c.count; i++) if (c.alive[i] && c.linkWait[i]! > 6) waiting++;
      if (k > LONG / STEP && emptied < 0 && waiting === 0) emptied = k;
      if (k > LONG / STEP && green < 0 && ['A', 'B'].includes(t.junctionStats(node).grade)) green = k;
    }
    expect(emptied).toBeGreaterThan(0);
    expect(green).toBeGreaterThan(0);
    expect((green - emptied) * STEP).toBeLessThan(11);
  });
});
