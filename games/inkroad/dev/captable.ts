/** Junction capacities: one crossroads, four arms, steady demand. Used by the bench and by test/sim.capacity.test.ts. */
import { STEP } from '../src/sim/constants';
import { addFlyover, createNetwork, junctionAt, planFlyover, setControl, setSplit, signalPhases } from '../src/sim/network';
import { createRng } from '../src/sim/rng';
import { createTraffic } from '../src/sim/traffic';
import type { Network } from '../src/sim/trafficTypes';
import type { Control, RoadType } from '../src/sim/types';

export interface CapOptions { readonly uneven?: boolean; readonly split?: number; readonly flyover?: boolean; readonly seconds?: number; readonly warm?: number; readonly seed?: number }
export interface CapResult { readonly out: number; readonly wait: number; readonly trip: number; readonly lost: number }

const SIZE = 30, MID = 15;
const ARMS = ['w', 'e', 'n', 's'] as const;

export function crossroads(type: RoadType, control: Control): { net: Network; node: number } {
  const net = createNetwork(Array.from({ length: SIZE }, () => '.'.repeat(SIZE)), [{ cells: [[0, MID], [SIZE - 1, MID]], type }, { cells: [[MID, 0], [MID, SIZE - 1]], type }],
    [{ id: 'w', cell: [0, MID] }, { id: 'e', cell: [SIZE - 1, MID] }, { id: 'n', cell: [MID, 0] }, { id: 's', cell: [MID, SIZE - 1] }]);
  const node = junctionAt(net, { gx: MID, gy: MID })!.id;
  return { net: setControl(net, node, control), node };
}

const gate = (net: Network, id: string): number => net.junctions.find((j) => j.gate === id)!.id;
const arm = (net: Network, id: string): number => net.junctions.find((j) => j.gate === id)!.arms[0]!;

function dress(type: RoadType, control: Control, o: CapOptions): { net: Network; node: number } {
  let { net, node } = crossroads(type, control);
  if (o.split !== undefined) {
    const west = arm(net, 'w');
    net = setSplit(net, node, signalPhases(net, node).map((p) => (p.includes(west) ? o.split! : 1 - o.split!)));
  }
  if (o.flyover) net = addFlyover(net, planFlyover(net, node, arm(net, 'w'), arm(net, 'n'), 1));
  return { net, node };
}

/** Offered `rate` cars a second; each arm keeps a waiting list, so full arms stay full. */
export function measure(type: RoadType, control: Control, rate: number, o: CapOptions = {}): CapResult {
  const { net, node } = dress(type, control, o);
  const t = createTraffic(net, 1);
  const rng = createRng(o.seed ?? 7);
  const warm = o.warm ?? 40, seconds = o.seconds ?? 160;
  const lists = new Map<string, string[]>(ARMS.map((a) => [a, []]));
  let out = 0, trip = 0, lost = 0, due = 0;
  for (let k = 0; k < (warm + seconds) / STEP; k++) {
    if (k === warm / STEP) { out = trip = lost = 0; }
    due += rate * STEP;
    for (; due >= 1; due--) {
      let a: string = rng.pick(ARMS);
      if (o.uneven && rng.chance(0.5)) a = 'w';
      let b: string = rng.pick(ARMS.filter((x) => x !== a));
      if (o.uneven && a === 'w' && rng.chance(0.6)) b = 'n';
      const list = lists.get(a)!;
      if (list.length < 20) list.push(b);
    }
    for (const [a, list] of lists) {
      if (list.length > 0 && t.spawn({ from: { gate: gate(net, a) }, to: { gate: gate(net, list[0]!) }, kind: 'car', value: 0.3, tag: 0 }) > 0) list.shift();
    }
    t.step();
    for (const a of t.drainArrivals()) { out++; trip += a.seconds; t.remove(a.uid); }
    lost += t.drainGaveUp().length;
  }
  return { out: out / seconds, wait: t.junctionStats(node).wait, trip: out > 0 ? trip / out : 0, lost };
}

const SATURATED = 2.6, UNEVEN = 1.4, CALM = 0.7;
export function table(type: RoadType): string {
  const k = type === 'street' ? 1 : 1.7;
  return (['yield', 'roundabout', 'signal', 'smart'] as const).map((c) => {
    const even = measure(type, c, SATURATED * k), uneven = measure(type, c, UNEVEN * k, { uneven: true });
    const split = c === 'signal' ? [0.6, 0.68, 0.75].map((s) => measure(type, c, UNEVEN * k, { uneven: true, split: s }).out.toFixed(2)).join('/') : '-';
    const calm = measure(type, c, CALM), calmU = measure(type, c, CALM, { uneven: true });
    const fly = measure(type, c, UNEVEN * k, { uneven: true, flyover: true });
    return `${type} ${c.padEnd(10)} even ${even.out.toFixed(2)} uneven ${uneven.out.toFixed(2)} (wait ${uneven.wait.toFixed(0)}) split ${split} | at 0.7: wait ${calm.wait.toFixed(1)} trip ${calm.trip.toFixed(1)}, uneven ${calmU.wait.toFixed(1)} | flyover ${fly.out.toFixed(2)} wait ${fly.wait.toFixed(1)} | lost ${even.lost}`;
  }).join('\n');
}
