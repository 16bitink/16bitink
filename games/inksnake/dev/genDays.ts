/**
 * The generator's pure side for dev/gen.mjs (the CLI) (docs/inksnake-daily.md
 * "Generator"): the place book from every chapter, plans that follow the
 * frozen days (and keep what yesterday's teaser promised), each day's
 * tomorrow teaser, the day lines and the variety audit.
 */
import { addDays, eventOn, seasonOf } from '@16bitink/game-sdk';
import { INKSNAKE_PAID_CHAPTERS } from '../content/paid';
import { CHAPTER_1 } from '../src/level/chapter1';
import { generateDay as generateWith, type DailyEntry, type GenOptions } from '../src/gen/generate';
import { planDay, type DayPlan, type KeepPlan } from '../src/gen/plan';
import { buildPlaces, SEASON_PLACES } from '../src/gen/places';
import type { TomorrowDef } from '../src/level/daily';
import { playLevel } from '../test/bot';

export const BOOK = buildPlaces([CHAPTER_1, ...INKSNAKE_PAID_CHAPTERS]);
const HISTORY_DAYS = 60;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type { DailyEntry, DayPlan };

export function dateRange(from: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

export function generateDay(plan: DayPlan, o: GenOptions = {}): DailyEntry {
  return generateWith(plan, BOOK, playLevel, o);
}

/** What a day must keep: a redo keeps its own place, snake, rule and goal; any day keeps what the day before promised (a forced day, `fresh`, is planned afresh). */
function keepFor(date: string, frozen: Readonly<Record<string, DailyEntry>>, redo: boolean, fresh: boolean): KeepPlan | undefined {
  if (fresh) return undefined;
  const own = frozen[date];
  if (redo && own) return { place: own.plan.place, snake: own.plan.snake, rule: own.plan.rule, goal: own.plan.goal };
  const promised: TomorrowDef | undefined = frozen[addDays(date, -1)]?.level.tomorrow;
  return promised && !eventOn(date) ? { place: promised.place, snake: promised.snake, rule: promised.rule } : undefined;
}

/**
 * Plans for `dates` (any order), each after the 60 days before it: frozen
 * days where frozen, else planned here in date order. `redo` dates keep
 * their frozen dials, with their salt.
 */
export function planDates(
  dates: readonly string[], frozen: Readonly<Record<string, DailyEntry>>, salts: Readonly<Record<string, number>> = {}, redo: ReadonlySet<string> = new Set(), fresh = false,
): DayPlan[] {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const want = new Set(sorted);
  const known = new Map<string, DayPlan>();
  const history = (d: string): DayPlan[] => {
    const out: DayPlan[] = [];
    for (let i = HISTORY_DAYS; i >= 1; i--) {
      const p = known.get(addDays(d, -i));
      if (p) out.push(p);
    }
    return out;
  };
  // Frozen days that stay, up to 60 days after: a redo's layouts must not repeat theirs either.
  const laterFrozen = (d: string): DayPlan[] => Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(d, i + 1)).filter((x) => !want.has(x) && frozen[x]).map((x) => frozen[x]!.plan);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const out: DayPlan[] = [];
  for (let d = addDays(first, -HISTORY_DAYS); d <= last; d = addDays(d, 1)) {
    const f = frozen[d];
    if (f && !want.has(d)) {
      known.set(d, f.plan);
      continue;
    }
    // A gap between frozen days is planned as it will be; days before the first wanted one without a frozen day are none.
    if (!want.has(d) && d < first) continue;
    const plan = planDay(d, BOOK, history(d), salts[d] ?? 0, keepFor(d, frozen, redo.has(d), fresh && want.has(d)), laterFrozen(d));
    known.set(d, plan);
    if (want.has(d)) out.push(plan);
  }
  return out;
}

/** Every day's `tomorrow` teaser from the next day: frozen, or planned now as it will be. */
export function withTomorrow(all: Readonly<Record<string, DailyEntry>>): Record<string, DailyEntry> {
  const out: Record<string, DailyEntry> = {};
  for (const d of Object.keys(all).sort()) {
    const next = addDays(d, 1);
    const f = all[next];
    const src = f ? { place: f.level.place!, snake: f.level.snake, rule: f.level.rule!, event: f.level.event } : (() => {
      const p = planDates([next], all)[0]!;
      return { place: p.place, snake: p.snake, rule: p.rule, event: p.event ?? undefined };
    })();
    const tomorrow: TomorrowDef = { place: src.place, snake: src.snake, rule: src.rule, ...(src.event ? { event: src.event } : {}) };
    out[d] = { ...all[d]!, level: { ...all[d]!.level, tomorrow } };
  }
  return out;
}

export function dayLine(e: DailyEntry, seconds: number): string {
  const p = e.plan;
  const s = e.stats;
  const times = e.bot.times.map((t) => `${Math.round(t)}`).join('/');
  return `${e.date} ${DAYS[p.weekday]} ${p.season.padEnd(6)} ${p.place.padEnd(10)} ${p.snake.padEnd(11)} ${p.goal.padEnd(6)} ${p.rule.padEnd(10)} ${(p.event ?? '').padEnd(12)} `
    + `${e.layout.padEnd(34)} bot ${e.bot.wins}/3 ${times.padEnd(11)} mean ${e.bot.mean.toFixed(0).padStart(3)}s band ${e.band[0]}-${e.band[1]} ${e.ok ? 'ok ' : 'MISS'} `
    + `L${e.level.length}->${e.level.target} par ${e.level.par} · ${s.composed} made, ${s.cheapFailed} cheap-failed, ${s.botFailed} bot-lost, ${s.bandMissed} off-band · ${seconds.toFixed(1)}s "${e.level.name}"`;
}

/** The variety audit (docs/inksnake-daily.md "Generator notes"). */
export function audit(all: Readonly<Record<string, DailyEntry>>): string {
  const es = Object.values(all).sort((a, b) => a.date.localeCompare(b.date));
  const weeks = new Map<string, DailyEntry[]>();
  for (const e of es) {
    const monday = addDays(e.date, -((e.plan.weekday + 6) % 7));
    weeks.set(monday, [...(weeks.get(monday) ?? []), e]);
  }
  const distinct = (list: readonly DailyEntry[], f: (e: DailyEntry) => string) => new Set(list.map(f)).size;
  const lines = ['| week of | days | places | snakes | goals | rules | layouts | guests | bands met |', '|---|---|---|---|---|---|---|---|---|'];
  for (const [w, list] of weeks) {
    lines.push(`| ${w} | ${list.length} | ${distinct(list, (e) => e.plan.place)} | ${distinct(list, (e) => e.plan.snake)} | ${distinct(list, (e) => e.plan.goal)} | ${distinct(list, (e) => e.plan.rule)} | ${distinct(list, (e) => e.layout.split(':').slice(0, 3).join(':'))} | ${list.filter((e) => e.plan.guest).length} | ${list.filter((e) => e.ok).length}/${list.length} |`);
  }
  const gap = (f: (e: DailyEntry) => string) => gapOf(es, f);
  const count = (f: (e: DailyEntry) => string) => {
    const m = new Map<string, number>();
    for (const e of es) m.set(f(e), (m.get(f(e)) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  };
  const wrongSeason = es.filter((e) => !SEASON_PLACES[seasonOf(e.date)].includes(e.plan.place));
  const wrongEvent = es.filter((e) => (eventOn(e.date) ?? null) !== (e.level.event ?? null));
  const promises = es.filter((e) => {
    const t = all[addDays(e.date, -1)]?.level.tomorrow;
    return t && (t.place !== e.plan.place || t.snake !== e.plan.snake || t.rule !== e.plan.rule);
  });
  return [
    ...lines, '',
    `shortest repeat: place ${gap((e) => e.plan.place)} · rule ${gap((e) => e.plan.rule)} · rule (not event days) ${gapOf(es.filter((e) => !e.plan.event), (e) => e.plan.rule)} · layout ${gap((e) => e.layout)} · layout family ${gap((e) => e.layout.split(':').slice(0, 3).join(':'))}`,
    `places: ${count((e) => e.plan.place)}`,
    `snakes: ${count((e) => e.plan.snake)}`,
    `goals: ${count((e) => e.plan.goal)}`,
    `rules: ${count((e) => e.plan.rule)}`,
    `layout kinds: ${count((e) => e.layout.split(':')[0]!)} · shapes: ${count((e) => (e.layout.startsWith('pattern') ? e.layout.split(':')[2]! : 'remix'))}`,
    `bands met: ${es.filter((e) => e.ok).length}/${es.length}${es.some((e) => !e.ok) ? ` (missed: ${es.filter((e) => !e.ok).map((e) => `${e.date} ${e.bot.wins}/3 ${e.bot.mean}s`).join(', ')})` : ''}`,
    `out-of-season places: ${wrongSeason.length} · event mismatches: ${wrongEvent.length} · broken teaser promises: ${promises.length}`,
    `rejections: ${rates(es)}`,
  ].join('\n');
}

function gapOf(es: readonly DailyEntry[], f: (e: DailyEntry) => string): string {
  let worst = { d: Infinity, v: '', at: '' };
  const last = new Map<string, string>();
  for (const e of es) {
    const v = f(e);
    const prev = last.get(v);
    if (prev) {
      const d = Math.round((Date.parse(e.date) - Date.parse(prev)) / 86_400_000);
      if (d < worst.d) worst = { d, v, at: e.date };
    }
    last.set(v, e.date);
  }
  return worst.d === Infinity ? 'never repeats' : `${worst.d} days (${worst.v}, ${worst.at})`;
}

function rates(es: readonly DailyEntry[]): string {
  const sum = (f: (e: DailyEntry) => number) => es.reduce((a, e) => a + f(e), 0);
  const made = sum((e) => e.stats.composed);
  const cheap = sum((e) => e.stats.cheapFailed);
  const botted = made - cheap;
  const lost = sum((e) => e.stats.botFailed);
  const off = sum((e) => e.stats.bandMissed);
  const pct = (a: number, b: number) => `${b ? Math.round((a / b) * 100) : 0}%`;
  return `${made} composed · ${pct(cheap, made)} failed the cheap checks · of ${botted} the bot played, ${pct(lost, botted)} lost 2+ seeds, ${pct(off, botted)} missed the band after tuning · ${sum((e) => e.stats.played)} bot plays (3 seeds each) · alternates used on ${es.filter((e) => e.stats.layoutsTried > 1).length} days`;
}
