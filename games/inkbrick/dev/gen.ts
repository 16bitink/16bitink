/** The generator's pure side for dev/gen.mjs: planning with the frozen history, and the day lines. */
import { addDays, dateRange } from '../src/gen/calendar';
import { generateDay, type DailyEntry, type GenOptions } from '../src/gen/generate';
import { planDay, type DayPlan } from '../src/gen/plan';
import { asciiBoard } from '../src/sim/ascii';
import { formatValue, judge, measureLevel } from '../src/sim/measure';
import { dailyTargets } from '../src/sim/targets';
import type { LevelDef } from '../src/sim/types';
import { weekday } from '../src/gen/calendar';
export { levelSource, propose } from '../src/gen/propose';

export { generateDay, dateRange };

const HISTORY_DAYS = 14;

/** Plans for `dates` in order; earlier days come from `frozen` when present (oldest first). */
export function planDates(dates: readonly string[], frozen: Readonly<Record<string, DailyEntry>>, salts: Readonly<Record<string, number>> = {}): DayPlan[] {
  if (dates.length === 0) return [];
  const first = dates[0]!;
  const history: DayPlan[] = [];
  for (let i = HISTORY_DAYS; i >= 1; i--) {
    const d = addDays(first, -i);
    const f = frozen[d];
    history.push(f ? f.plan : planDay(d, history));
  }
  const out: DayPlan[] = [];
  for (const d of dates) {
    const plan = planDay(d, [...history, ...out], salts[d] ?? 0);
    out.push(plan);
  }
  return out;
}

export function dayLine(e: DailyEntry, seconds: number): string {
  const m = e.metrics;
  const pct = (v: number | null) => (v === null ? '  n/a' : `${(v * 100).toFixed(1)}%`.padStart(6));
  const sec = (v: number | null) => (v === null ? ' n/a' : `${v.toFixed(0)}s`.padStart(4));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][e.plan.weekday];
  return `${e.date} ${wd} ${e.plan.layout.padEnd(9)} ${e.plan.twist.padEnd(9)} hole ${e.plan.holeW} · aim ${pct(m.aimWindow)} · novice ${pct(m.noviceClear)} · clear ${sec(m.clearSkilled)} · cascade ${pct(m.cascade)} · ${m.bricks} bricks · score ${e.score.toFixed(2)} · ${e.survivors} passed · ${seconds.toFixed(1)}s "${e.level.name}"`;
}

export function board(e: DailyEntry): string {
  return asciiBoard(e.level);
}

export type { DailyEntry, GenOptions, DayPlan };

export interface DayReport { readonly date: string; readonly layout: string; readonly pass: number; readonly of: number; readonly misses: readonly string[] }

/** A frozen day measured as the lab does (20 runs per bot) against its weekday's targets. */
export function measureDay(date: string, level: LevelDef, runs = 20): DayReport {
  const m = measureLevel(level, { runs });
  const verdicts = judge(m.metrics, dailyTargets(weekday(date))).filter((v) => v.pass !== null);
  const misses = verdicts.filter((v) => !v.pass).map((v) => `${v.target.label} ${formatValue(v.target, v.value)}`);
  return { date, layout: level.layout ?? '?', pass: verdicts.length - misses.length, of: verdicts.length, misses };
}

export function reportTable(rows: readonly DayReport[]): string {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const all = sorted.filter((r) => r.pass === r.of).length;
  const nine = sorted.filter((r) => r.pass >= 9).length;
  const worst = [...sorted].sort((a, b) => a.pass - a.of - (b.pass - b.of) || a.date.localeCompare(b.date)).slice(0, 5);
  const byLayout = new Map<string, number[]>();
  for (const r of sorted) byLayout.set(r.layout, [...(byLayout.get(r.layout) ?? []), r.pass]);
  return [
    ...sorted.map((r) => `${r.date} ${r.layout.padEnd(9)} ${r.pass}/${r.of}${r.misses.length ? `  MISS ${r.misses.join(', ')}` : ''}`),
    '',
    `days ${sorted.length} · all targets ${all} · >= 9/11 ${nine} · below 8/11 ${sorted.filter((r) => r.pass < 8).length}`,
    `by layout: ${[...byLayout].map(([l, ps]) => `${l} ${(ps.reduce((a, b) => a + b, 0) / ps.length).toFixed(1)} (${ps.length})`).join(' · ')}`,
    'worst 5:',
    ...worst.map((r) => `  ${r.date} ${r.layout} ${r.pass}/${r.of}: ${r.misses.join(', ')}`),
  ].join('\n');
}
