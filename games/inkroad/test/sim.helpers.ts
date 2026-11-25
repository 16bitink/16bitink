import { STEP } from '../src/sim/constants';
import { createRng, type Rng } from '../src/sim/rng';
import { createTraffic } from '../src/sim/traffic';
import type { Access, Traffic } from '../src/sim/trafficTypes';

import { createNetwork, junctionAt, roadAt, setControl } from '../src/sim/network';
import type { Control, RoadDef, RoadType } from '../src/sim/types';
import type { Network } from '../src/sim/trafficTypes';

export const land = (w: number, h: number): string[] => Array.from({ length: h }, () => '.'.repeat(w));

/** A cross: arms of `arm` cells around the centre, gates at all four ends. */
export function cross(arm: number, type: RoadType = 'street', control: Control = 'yield', type2: RoadType = type): Network {
  const c = arm + 1, size = arm * 2 + 3;
  const roads: RoadDef[] = [
    { cells: [[c, c - arm], [c, c + arm]], type },
    { cells: [[c - arm, c], [c + arm, c]], type: type2 },
  ];
  const net = createNetwork(land(size, size), roads, [
    { id: 'N', cell: [c, c - arm] }, { id: 'S', cell: [c, c + arm] }, { id: 'W', cell: [c - arm, c] }, { id: 'E', cell: [c + arm, c] },
  ]);
  return setControl(net, junctionAt(net, { gx: c, gy: c })!.id, control);
}

export const gateNode = (net: Network, id: string): number => {
  const j = net.junctions.find((n) => n.gate === id);
  if (!j) throw new Error(`no gate ${id}`);
  return j.id;
};

/** Road id of the arm towards a gate. */
export const armTo = (net: Network, id: string): number => {
  const arms = net.junctions.find((n) => n.gate === id)!.arms;
  return arms[0]!;
};

export const centre = (net: Network, arm: number): number => junctionAt(net, { gx: arm + 1, gy: arm + 1 })!.id;

/** n x n streets, `gap` cells apart, with a gate at the end of every road. */
export function grid(n: number, gap: number, type: RoadType = 'street', control: Control = 'yield'): Network {
  const size = (n + 1) * gap;
  const roads: RoadDef[] = [];
  const gates: { id: string; cell: [number, number] }[] = [];
  for (let i = 1; i <= n; i++) {
    roads.push({ cells: [[i * gap, 0], [i * gap, size]], type }, { cells: [[0, i * gap], [size, i * gap]], type });
    gates.push({ id: `N${i}`, cell: [i * gap, 0] }, { id: `S${i}`, cell: [i * gap, size] }, { id: `W${i}`, cell: [0, i * gap] }, { id: `E${i}`, cell: [size, i * gap] });
  }
  let net = createNetwork(land(size + 1, size + 1), roads, gates);
  for (const j of net.junctions) if (j.arms.length > 2) net = setControl(net, j.id, control);
  return net;
}

export { junctionAt, roadAt };

// ---------------------------------------------------------------- running traffic

export interface Flow { readonly from: Access; readonly to: Access; readonly perMin: number }
export interface Tally { spawned: number; held: number; arrived: number; gaveUp: number; seconds: number; waited: number }

/** Poisson demand for `seconds`; `each` runs after every step. */
export function drive(t: Traffic, flows: readonly Flow[], seconds: number, seed = 1, each?: (tick: number) => void): Tally {
  const rng: Rng = createRng(seed);
  const tally: Tally = { spawned: 0, held: 0, arrived: 0, gaveUp: 0, seconds: 0, waited: 0 };
  const queue = flows.map(() => 0);
  for (let k = 0; k < seconds / STEP; k++) {
    flows.forEach((f, i) => {
      if (rng.chance((f.perMin / 60) * STEP)) queue[i] = Math.min(30, queue[i]! + 1);
      if (queue[i]! > 0) {
        if (t.spawn({ from: f.from, to: f.to, kind: rng.chance(0.06) ? 'truck' : 'car', tint: rng.int(6), value: 1, tag: i }) > 0) { queue[i]!--; tally.spawned++; } else tally.held++;
      }
    });
    t.step();
    for (const a of t.drainArrivals()) { tally.arrived++; tally.seconds += a.seconds; tally.waited += a.waited; t.remove(a.uid); }
    tally.gaveUp += t.drainGaveUp().length;
    t.drainHonks();
    each?.(k);
  }
  return tally;
}

export const gateFlows = (net: Network, list: readonly (readonly [string, string, number])[]): Flow[] =>
  list.map(([a, b, perMin]) => ({ from: { gate: gateNode(net, a) }, to: { gate: gateNode(net, b) }, perMin }));

export { createTraffic };
