/** The generator's pure side for dev/gen.mjs: planning with the frozen history, and the day lines. */
import { addDays, dateRange } from '../src/gen/calendar';
import { generateDay, type DailyEntry, type GenOptions } from '../src/gen/generate';
import { planDay, TIDE_LAYOUTS, type DayPlan, type KeepPlan } from '../src/gen/plan';
import { asciiBoard } from '../src/sim/ascii';
import { formatValue, judge, measureLevel } from '../src/sim/measure';
import { dailyTargets } from '../src/sim/targets';
import type { LevelDef } from '../src/sim/types';
import { weekday } from '../src/gen/calendar';
export { levelSource, propose } from '../src/gen/propose';

export { generateDay, dateRange };

const HISTORY_DAYS = 14;

/**
 * Plans for `dates` in order; earlier days come from `frozen` when present (oldest first). A redo
 * (`keep`) keeps its day's goal and rule: yesterday's teaser already promised them.
 */
export function planDates(
  dates: readonly string[], frozen: Readonly<Record<string, DailyEntry>>, salts: Readonly<Record<string, number>> = {},
  keep: Readonly<Record<string, KeepPlan>> = {},
): DayPlan[] {
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
    const plan = planDay(d, [...history, ...out], salts[d] ?? 0, keep[d]);
    out.push(plan);
  }
  return out;
}

/** What a frozen day's redo must keep. */
export function keepOf(e: DailyEntry | undefined): KeepPlan | undefined {
  if (!e?.plan.rule) return undefined;
  const base = { goal: e.plan.goal, rule: e.plan.rule, ruleDir: e.plan.ruleDir };
  // A layout the goal no longer allows (a tide day on layers) is planned again, never as a centre box.
  if (e.plan.goal === 'tide' && !TIDE_LAYOUTS.includes(e.plan.layout)) return { ...base, noBoxes: true };
  return { ...base, layout: e.plan.layout, twist: e.plan.twist };
}

/** Every day's level gets `tomorrow: { rule, goal }` from the next day's plan (frozen, or planned now as it will be). */
export function withTomorrow(all: Readonly<Record<string, DailyEntry>>): Record<string, DailyEntry> {
  const out: Record<string, DailyEntry> = {};
  const dates = Object.keys(all).sort();
  for (const d of dates) {
    const next = addDays(d, 1);
    const frozen = all[next];
    const plan = frozen?.plan ?? planDates([next], all)[0]!;
    // The goal the next level really has (a day whose friend found no room fell back to clear).
    const goal = frozen ? frozen.level.goal ?? 'clear' : plan.goal;
    const rule = frozen?.level.rule ?? plan.rule;
    const e = all[d]!;
    out[d] = rule ? { ...e, level: { ...e.level, tomorrow: { rule, goal } } } : e;
  }
  return out;
}

export function dayLine(e: DailyEntry, seconds: number): string {
  const m = e.metrics;
  const pct = (v: number | null) => (v === null ? '  n/a' : `${(v * 100).toFixed(1)}%`.padStart(6));
  const sec = (v: number | null) => (v === null ? ' n/a' : `${v.toFixed(0)}s`.padStart(4));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][e.plan.weekday];
  return `${e.date} ${wd} ${e.plan.layout.padEnd(9)} ${e.plan.twist.padEnd(9)} ${e.plan.goal.padEnd(6)} ${String(e.plan.rule).padEnd(9)} hole ${e.plan.holeW} · aim ${pct(m.aimWindow)} · novice ${pct(m.noviceClear)} · clear ${sec(m.clearSkilled)} · cascade ${pct(m.cascade)} · ${m.bricks} bricks · score ${e.score.toFixed(2)} · ${e.survivors} passed · ${seconds.toFixed(1)}s "${e.level.name}"`;
}

export function board(e: DailyEntry): string {
  return asciiBoard(e.level);
}

export type { DailyEntry, GenOptions, DayPlan };

export interface DayReport {
  readonly date: string; readonly layout: string; readonly goal: string; readonly rule: string;
  readonly pass: number; readonly of: number; readonly misses: readonly string[];
  /** How far each miss is outside its band, in the target's units (e.g. "novice clears -8 pts"). */
  readonly by: readonly string[];
}

function missBy(lo: number, hi: number, v: number, unit: string): string {
  const off = v < lo ? v - lo : v - hi;
  return unit === '%' ? `${off > 0 ? '+' : ''}${(off * 100).toFixed(1)} pts` : `${off > 0 ? '+' : ''}${off.toFixed(1)}${unit}`;
}

/** A frozen day measured as the lab does (20 runs per bot) against its weekday's and goal's targets. */
export function measureDay(date: string, level: LevelDef, runs = 20): DayReport {
  const m = measureLevel(level, { runs });
  const verdicts = judge(m.metrics, dailyTargets(weekday(date), level)).filter((v) => v.pass !== null);
  const missed = verdicts.filter((v) => !v.pass);
  return {
    date, layout: level.layout ?? '?', goal: level.goal ?? 'clear', rule: level.rule ?? 'none',
    pass: verdicts.length - missed.length, of: verdicts.length,
    misses: missed.map((v) => `${v.target.label} ${formatValue(v.target, v.value)}`),
    by: missed.map((v) => `${v.target.label} ${missBy(v.target.lo, v.target.hi, v.value!, v.target.unit)}`),
  };
}

function groupLine(name: string, rows: readonly DayReport[], key: (r: DayReport) => string): string {
  const groups = new Map<string, DayReport[]>();
  for (const r of rows) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
  return `${name}: ${[...groups].sort(([a], [b]) => a.localeCompare(b)).map(([g, rs]) => `${g} ${rs.filter((r) => r.pass < r.of).length}/${rs.length} miss (${rs.reduce((n, r) => n + r.of - r.pass, 0)} targets)`).join(' · ')}`;
}

export function reportTable(rows: readonly DayReport[]): string {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const all = sorted.filter((r) => r.pass === r.of).length;
  const nine = sorted.filter((r) => r.pass >= 9).length;
  const worst = [...sorted].sort((a, b) => a.pass - a.of - (b.pass - b.of) || a.date.localeCompare(b.date)).slice(0, 5);
  const byLayout = new Map<string, number[]>();
  for (const r of sorted) byLayout.set(r.layout, [...(byLayout.get(r.layout) ?? []), r.pass]);
  const byTarget = new Map<string, number>();
  for (const r of sorted) for (const m of r.misses) byTarget.set(m.replace(/ [-\d.]+(%|s)?$/, ''), (byTarget.get(m.replace(/ [-\d.]+(%|s)?$/, '')) ?? 0) + 1);
  return [
    ...sorted.map((r) => `${r.date} ${r.layout.padEnd(9)} ${r.goal.padEnd(6)} ${r.rule.padEnd(9)} ${r.pass}/${r.of}${r.by.length ? `  MISS ${r.by.join(', ')}` : ''}`),
    '',
    `days ${sorted.length} · all targets ${all} · >= 9 passed ${nine} · below 8 passed ${sorted.filter((r) => r.pass < 8).length} · days missing any ${sorted.filter((r) => r.pass < r.of).length}`,
    `by layout: ${[...byLayout].map(([l, ps]) => `${l} ${(ps.reduce((a, b) => a + b, 0) / ps.length).toFixed(1)} (${ps.length})`).join(' · ')}`,
    groupLine('by goal', sorted, (r) => r.goal),
    groupLine('by rule', sorted, (r) => r.rule),
    `misses by target: ${[...byTarget].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' · ')}`,
    'worst 5:',
    ...worst.map((r) => `  ${r.date} ${r.layout} ${r.pass}/${r.of}: ${r.misses.join(', ')}`),
  ].join('\n');
}
