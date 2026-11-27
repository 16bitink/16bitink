/**
 * `node dev/moves.mjs [--json]`: plays the motion test's three seasons (Saffron Bay years 3 and 6, Old Harbour year 4)
 * and reports every parking move the city told the view: seconds by move kind (median, p90) and the lane time the
 * moves took per season (the lane held while the body is in it, plus waits for a gap). Phase C rebalances with this
 * (docs/inkroad-vehicle-model.md "Phase B").
 */
import { createCity } from '../src/city/city';
import { PAID_CITIES } from '../content/paid';
import { STEP } from '../src/sim/constants';
import type { CityEvent, CityView } from '../src/sim/types';
import { cityAtYear, inner } from '../test/city-helpers';
import { MOVE_LOG, type MoveRecord } from '../src/sim/moveLog';

type Park = Extract<CityEvent, { t: 'park' }>;

function harbourAt(year: number): CityView {
  const v = createCity(PAID_CITIES[0]!, 3);
  const c = inner(v);
  c.money = 9000;
  while (v.year < year) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
  v.apply({ t: 'next' });
  return v;
}

const CASES: readonly { readonly name: string; readonly make: () => CityView }[] = [
  { name: 'Saffron Bay year 3', make: () => cityAtYear(3) },
  { name: 'Saffron Bay year 6', make: () => cityAtYear(6) },
  { name: 'Old Harbour year 4', make: () => harbourAt(4) },
];

const kindOfKey = (e: Park): string => (e.slot < 0 ? 'door' : e.key.split(':')[0]!);

function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
}

interface Row { n: number; move: number[]; lane: number[] }

function season(v: CityView): { events: Park[]; moves: MoveRecord[]; ms: number; steps: number } {
  const events: Park[] = [];
  MOVE_LOG.length = 0;
  const t0 = performance.now();
  let steps = 0;
  while (v.phase === 'day') {
    v.advance(STEP);
    steps++;
    for (const e of v.drainEvents()) if (e.t === 'park') events.push(e);
  }
  return { events, moves: [...MOVE_LOG], ms: performance.now() - t0, steps };
}

export function main(args: readonly string[]): string {
  const out: Record<string, unknown> = {};
  const lines: string[] = [];
  for (const k of CASES) {
    const v = k.make();
    const { events, moves, ms, steps } = season(v);
    const rows = new Map<string, Row>();
    let lane = 0;
    for (const e of events) {
      const key = `${kindOfKey(e)} ${e.dir}`;
      const r = rows.get(key) ?? rows.set(key, { n: 0, move: [], lane: [] }).get(key)!;
      r.n++;
      r.move.push(e.move ?? e.seconds);
      r.lane.push(e.seconds);
      lane += e.seconds;
    }
    let turnLane = 0;
    for (const m of moves) if (m.what === 'turn') turnLane += m.lane;
    const table = [...rows.entries()].sort().map(([key, r]) => ({ key, n: r.n, moveMedian: quantile(r.move, 0.5), moveP90: quantile(r.move, 0.9), laneMedian: quantile(r.lane, 0.5), laneP90: quantile(r.lane, 0.9) }));
    out[k.name] = { table, laneSeconds: lane, turnLaneSeconds: turnLane, moves: moves.length, unplanned: moves.filter((m) => !m.fits).length, msPerStep: ms / steps, cars: v.cars.count };
    const unfit = new Map<string, number>();
    for (const m of moves) if (!m.fits) { const why = `${m.what} ${m.kind} ${(/\((\w+ \w+ \w+)/.exec(m.word ?? '') ?? [])[1] ?? 'unfinished'}`; unfit.set(why, (unfit.get(why) ?? 0) + 1); }
    lines.push(`  unfit: ${[...unfit.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${n} ${w}`).join(', ')}`);
    const planMs = moves.map((m) => m.ms);
    lines.push(`  planning: ${moves.length} moves, median ${quantile(planMs, 0.5).toFixed(1)} ms, p90 ${quantile(planMs, 0.9).toFixed(1)} ms, max ${Math.max(0, ...planMs).toFixed(0)} ms`);
    lines.push(`${k.name}: ${events.length} park events, lane held ${lane.toFixed(0)} s (+ ${turnLane.toFixed(0)} s turning round), ${(ms / steps).toFixed(2)} ms/step`);
    for (const r of table) lines.push(`  ${r.key.padEnd(12)} ${String(r.n).padStart(5)}  move ${r.moveMedian.toFixed(1)} / ${r.moveP90.toFixed(1)}  lane ${r.laneMedian.toFixed(1)} / ${r.laneP90.toFixed(1)}`);
  }
  return args.includes('--json') ? JSON.stringify(out, null, 1) : lines.join('\n');
}
