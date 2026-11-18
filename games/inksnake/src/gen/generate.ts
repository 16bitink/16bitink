/**
 * One day's level (docs/inksnake-daily.md "Generator"): compose candidates
 * on the plan's layouts, drop those failing the cheap checks, let the bot
 * play the rest on three seeds (it must win at least two), tune the target
 * length until its mean win time lands in the weekday's band, and keep the
 * best. Par and a rush's clock come from the bot's times. The bot is passed
 * in (dev/gen.ts uses test/bot.ts): src/ stays free of test code.
 */
import { createRng } from '../logic/rng';
import { parseLevel } from '../level/validate';
import type { LevelDef } from '../level/types';
import { cheapCheck } from './checks';
import { compose, RUSH_PLACEHOLDER, type Candidate } from './compose';
import { clamp } from './geometry';
import { buildLayout, layoutKey } from './layouts';
import { daySeed, type DayPlan } from './plan';
import type { PlaceBook } from './places';

export interface BotResult { readonly won: boolean; readonly time: number; readonly cause?: string }
export type BotPlay = (level: LevelDef, limit: number, seed: number) => BotResult;

/**
 * Bot win-time bands (mean of its wins, s), from the engine notes'
 * measurements (level 1 of each place: 11–45 s plain, up to 80 s with a
 * hard rule). Monday shortest; Friday and Sunday longest; event days no
 * harder than a Wednesday.
 */
export const BANDS: Readonly<Record<number, readonly [number, number]>> = {
  1: [10, 28], 2: [14, 40], 3: [14, 45], 4: [14, 45], 5: [18, 62], 6: [16, 55], 0: [20, 80],
};
export const EVENT_BAND: readonly [number, number] = [12, 45];

export function bandOf(plan: Pick<DayPlan, 'weekday' | 'event'>): readonly [number, number] {
  return plan.event ? EVENT_BAND : BANDS[plan.weekday]!;
}

export interface GenOptions {
  /** Candidates composed per layout (default 40). */
  readonly candidates?: number;
  /** Stop composing a layout once this many passed the cheap checks (default 8). */
  readonly enough?: number;
  readonly salt?: number;
}

export interface Stats {
  readonly composed: number;
  readonly cheapFailed: number;
  readonly botFailed: number;
  readonly bandMissed: number;
  readonly played: number;
  readonly layoutsTried: number;
}

export interface DailyEntry {
  readonly date: string;
  readonly plan: DayPlan;
  readonly layout: string;
  readonly level: LevelDef;
  readonly bot: { readonly wins: number; readonly times: readonly number[]; readonly mean: number; readonly causes: readonly string[] };
  readonly band: readonly [number, number];
  /** Won 2 of 3 and in the band. */
  readonly ok: boolean;
  readonly stats: Stats;
  readonly salt: number;
}

const SEEDS = [0, 1, 2] as const;
const BOT_LIMIT = 300;
const TUNES = 3;
const PAR_SLACK = 1.6;
const RUSH_SLACK = 1.9;
const MIN_RUSH = 30;
const BOSS_HP = [2, 6] as const;

/** JSON with sorted keys, to compare values whatever their key order. */
function canonical(v: unknown): string {
  return JSON.stringify(v, (_, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
}

const round5 = (v: number): number => Math.round(v / 5) * 5;

interface Played {
  readonly level: LevelDef;
  readonly wins: number;
  readonly times: readonly number[];
  readonly mean: number;
  readonly causes: readonly string[];
  readonly score: number;
  readonly ok: boolean;
}

function play(level: LevelDef, bot: BotPlay, band: readonly [number, number]): Played {
  const runs = SEEDS.map((s) => bot(level, BOT_LIMIT, s));
  const won = runs.filter((r) => r.won);
  const times = won.map((r) => Math.round(r.time * 10) / 10);
  const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : BOT_LIMIT;
  const [lo, hi] = band;
  const mid = (lo + hi) / 2;
  const half = (hi - lo) / 2;
  const off = mean < lo ? (lo - mean) / half : mean > hi ? (mean - hi) / half : 0;
  const score = off * 2 + Math.abs(mean - mid) / half * 0.4 + (SEEDS.length - won.length) * 0.6;
  return { level, wins: won.length, times, mean, causes: runs.filter((r) => !r.won).map((r) => r.cause ?? 'timeout'), score, ok: won.length >= 2 && off === 0 };
}

/** A candidate with its growth scaled (the start length stays). */
function withGrowth(c: Candidate, growth: number): LevelDef {
  return { ...c.level, target: c.level.length + Math.round(growth * c.growthScale) };
}

/**
 * Plays a candidate, then scales its growth towards the band's middle. A
 * boss day's fight sets its time instead: one strike more or less on the
 * boss (2–6).
 */
function tune(c: Candidate, bot: BotPlay, band: readonly [number, number], isBoss: boolean): { best: Played; plays: number } {
  let growth = c.growth;
  let level = c.level;
  let best = play(level, bot, band);
  let plays = 1;
  const mid = (band[0] + band[1]) / 2;
  for (let i = 0; i < TUNES && !best.ok && best.wins >= 1; i++) {
    if (isBoss) {
      const hp = level.boss?.hp ?? 3;
      const next = best.mean < band[0] ? hp + 1 : hp - 1;
      if (!level.boss || next < BOSS_HP[0] || next > BOSS_HP[1]) break;
      level = { ...level, boss: { ...level.boss, hp: next } };
    } else {
      growth = Math.max(90, Math.round(growth * clamp(mid / best.mean, 0.45, 2.2)));
      level = withGrowth(c, growth);
    }
    const next = play(level, bot, band);
    plays++;
    if (next.score < best.score) best = next;
  }
  return { best, plays };
}

/** Par and a rush's clock from the bot's times; the final check that the validator keeps every field. */
function finish(p: Played): LevelDef {
  const slow = Math.max(...p.times, p.mean);
  const par = clamp(round5(p.mean * PAR_SLACK), 20, 600);
  let level: LevelDef = { ...p.level, par };
  if (level.goal?.kind === 'rush') {
    const seconds = clamp(round5(Math.max(slow * RUSH_SLACK, MIN_RUSH)), MIN_RUSH, RUSH_PLACEHOLDER);
    level = { ...level, goal: { kind: 'rush', seconds }, par: Math.min(par, seconds - 5) };
  }
  const json = JSON.parse(JSON.stringify(level)) as LevelDef;
  const parsed = parseLevel(json);
  const lost = Object.keys(json).filter((k) => canonical((json as unknown as Record<string, unknown>)[k]) !== canonical((parsed as unknown as Record<string, unknown>)[k]));
  if (lost.length) throw new Error(`${level.id}: the validator changes ${lost.join(', ')}`);
  return json;
}

export function generateDay(plan: DayPlan, book: PlaceBook, bot: BotPlay, o: GenOptions = {}): DailyEntry {
  const info = book[plan.place];
  const band = bandOf(plan);
  const salt = o.salt ?? 0;
  const n = o.candidates ?? 40;
  const enough = o.enough ?? 8;
  let best: { p: Played; layout: string } | null = null;
  const st = { composed: 0, cheapFailed: 0, botFailed: 0, bandMissed: 0, played: 0, layoutsTried: 0 };
  for (const [li, choice] of plan.layouts.entries()) {
    st.layoutsTried++;
    let survivors = 0;
    for (let k = 0; k < n && survivors < enough; k++) {
      const rng = createRng((daySeed(plan.date) ^ Math.imul(k + 1, 0x9e3779b1) ^ Math.imul(li + 1, 0x85ebca6b) ^ Math.imul(salt, 0xc2b2ae35)) >>> 0);
      st.composed++;
      const layout = buildLayout(info, choice, rng);
      const c = compose(plan, info, book, layout, rng);
      if (!cheapCheck(c.level, choice.kind === 'pattern').ok) {
        st.cheapFailed++;
        continue;
      }
      survivors++;
      const { best: p, plays } = tune(c, bot, band, plan.goal === 'boss');
      st.played += plays;
      if (p.wins < 2) st.botFailed++;
      else if (!p.ok) st.bandMissed++;
      if (!best || p.score < best.p.score) best = { p, layout: layoutKey(choice) };
    }
    // A layout that gave a good day is enough; the alternates are for layouts that can't.
    if (best?.p.ok) break;
  }
  if (!best) throw new Error(`${plan.date}: no candidate passed the cheap checks on ${plan.layouts.length} layouts`);
  const p = best.p;
  return {
    date: plan.date, plan, layout: best.layout, level: finish(p),
    bot: { wins: p.wins, times: p.times, mean: Math.round(p.mean * 10) / 10, causes: p.causes },
    band, ok: p.ok, stats: st, salt,
  };
}
