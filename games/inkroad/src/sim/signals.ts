/** Traffic lights: fixed cycles by the player's split, or smart ones that follow the queues. */
import { SIGNAL } from './tune';
import { STEP } from './constants';
import type { NodeRt } from './world';
import type { Sim } from './sim';

export const cycleOf = (phases: number): number => Math.max(2, phases) * SIGNAL.perPhase;

/** Green seconds of each phase for a fixed signal. */
export function greens(n: NodeRt): number[] {
  const p = n.phases.length;
  const green = cycleOf(p) - p * (SIGNAL.amber + SIGNAL.red);
  return n.phases.map((_, i) => Math.max(SIGNAL.minGreen, green * (n.j.split[i] ?? 1 / p)));
}

/** Cars wanting to come through on a phase, the nearest SIGNAL.smartSense px of its lanes. */
function demand(sim: Sim, n: NodeRt, phase: number): number {
  const c = sim.cars;
  let sum = 0;
  for (const l of n.phases[phase]!) {
    for (const t of l.lanes) {
      for (let q = t.head; q >= 0; q = c.behind[q]!) {
        if (t.len - c.s[q]! > SIGNAL.smartSense) break;
        sum++;
      }
    }
  }
  return sum;
}

/** Is a car of this phase about to use the green? */
function flowing(sim: Sim, n: NodeRt, phase: number): boolean {
  const c = sim.cars;
  for (const l of n.phases[phase]!) {
    for (const t of l.lanes) {
      const q = t.head;
      if (q >= 0 && t.len - c.s[q]! < Math.max(24, c.v[q]! * SIGNAL.smartGap + c.len[q]!)) return true;
    }
  }
  return false;
}

/** A phase whose first car has been forgotten too long, or -1. */
function starving(sim: Sim, n: NodeRt): number {
  const c = sim.cars;
  return n.phases.findIndex((ls, p) => p !== n.phase && ls.some((l) => l.lanes.some((t) => t.head >= 0 && c.linkWait[t.head]! > SIGNAL.smartStarve)));
}

/** The phase to change to, or -1 to stay. */
function smartNext(sim: Sim, n: NodeRt): number {
  if (n.lightFor < SIGNAL.smartMin) return -1;
  const own = demand(sim, n, n.phase);
  let best = -1, bestD = 0;
  for (let k = 1; k < n.phases.length; k++) {
    const p = (n.phase + k) % n.phases.length;
    const d = demand(sim, n, p);
    if (d > bestD) { best = p; bestD = d; }
  }
  if (best < 0) return -1;
  const starved = starving(sim, n);
  if (starved >= 0) return starved;
  if (n.phases.length > 2 && n.lightFor > SIGNAL.smartMax) return (n.phase + 1) % n.phases.length;
  if (!flowing(sim, n, n.phase) || n.lightFor > SIGNAL.smartMax) return best;
  return bestD > own * 2.5 + 3 ? best : -1;
}

export function stepSignals(sim: Sim): void {
  for (const n of sim.world.nodes) {
    if (n.kind !== 'signal' || n.phases.length < 2) continue;
    n.lightFor += STEP;
    const smart = n.j.control === 'smart';
    if (n.light === 0) {
      const next = smart ? smartNext(sim, n) : n.lightFor >= greens(n)[n.phase]! - 1e-9 ? (n.phase + 1) % n.phases.length : -1;
      if (next >= 0) { n.nextPhase = next; n.light = 1; n.lightFor = 0; }
    } else if (n.light === 1) {
      if (n.lightFor >= (smart ? SIGNAL.smartAmber : SIGNAL.amber)) { n.light = 2; n.lightFor = 0; }
    } else if (n.lightFor >= (smart ? SIGNAL.smartRed : SIGNAL.red)) {
      n.light = 0;
      n.lightFor = 0;
      n.phase = n.nextPhase;
    }
  }
}
