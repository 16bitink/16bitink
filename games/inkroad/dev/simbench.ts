/** Traffic bench and junction capacities: `node dev/simbench.mjs [bench|cap|all]`. */
import { STEP } from '../src/sim/constants';
import { createTraffic, drive, grid } from '../test/sim.helpers';
import { table } from './captable';

const pct = (list: number[], p: number): number => [...list].sort((a, b) => a - b)[Math.floor(list.length * p)] ?? 0;

function bench(): string {
  const net = grid(6, 6, 'avenue', 'signal');
  const gates = net.junctions.filter((j) => j.gate).map((j) => j.id);
  const t = createTraffic(net, 1);
  const flows = gates.flatMap((a, i) => [3, 7, 11].map((k) => ({ from: { gate: a }, to: { gate: gates[(i + k) % gates.length]! }, perMin: 14 })));
  drive(t, flows, 60);
  const times: number[] = [];
  let cars = 0;
  for (let k = 0; k < 600; k++) {
    drive(t, flows, STEP / 2, k);
    const t0 = performance.now();
    t.step();
    times.push(performance.now() - t0);
    cars += t.active;
    for (const a of t.drainArrivals()) t.remove(a.uid);
  }
  return `bench: ${(cars / 600).toFixed(0)} cars, step mean ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)} ms, p95 ${pct(times, 0.95).toFixed(2)}, max ${Math.max(...times).toFixed(2)}`;
}

export function main(what: string): string {
  const out: string[] = [];
  if (what !== 'cap') out.push(bench());
  if (what !== 'bench') out.push(table('street'), table('avenue'));
  return out.join('\n');
}
