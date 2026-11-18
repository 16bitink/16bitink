/**
 * One day's level: compose N candidates from the plan, reject most with the cheap checks, let the
 * bots play the closest few, and keep the one nearest the day's targets.
 */
import { distance, judge, measureLevel, type Metrics } from '../sim/measure';
import { DAILY_NOVICE_AIM, dailyTargets } from '../sim/targets';
import type { LevelDef } from '../sim/types';
import { AIM_FLOOR, cheapCheck } from './checks';
import { compose } from './compose';
import type { DayPlan } from './plan';

export interface GenOptions {
  /** Candidates composed per round (default 200). */
  readonly candidates?: number;
  /** Stop composing once this many candidates passed the cheap checks (default 24). */
  readonly enough?: number;
  /** Survivors the bots screen (default 6). */
  readonly finalists?: number;
  /** Runs per bot per finalist in the screen (default 4). */
  readonly runs?: number;
  /** Screened finalists played again (default 2), with this many runs per bot (default 12). */
  readonly verify?: number;
  readonly verifyRuns?: number;
  /** Extra rounds of fresh candidates while the best still misses more than MISS_OK targets (default 2). */
  readonly rounds?: number;
  /** A redo's number: a vetoed day gets other candidates. */
  readonly salt?: number;
}

export interface DailyEntry {
  readonly date: string;
  readonly plan: DayPlan;
  readonly level: LevelDef;
  readonly metrics: Metrics;
  readonly score: number;
  readonly candidate: number;
  readonly survivors: number;
  readonly salt: number;
}

const WEIGHTS = { aimWindow: 2, noviceClear: 2, clearSkilled: 1.5, cascade: 1.5 } as const;
const PAR_SLACK = 1.3;
const PAR_ROUND = 5;
const PAR_DEFAULT = 90;
const GEN_MAX_SECONDS = 240;
/** A day that misses at most this many targets is good enough to stop looking. */
const MISS_OK = 1;
/** Pull toward the weekday's novice clear rate (the rhythm), on top of the band. */
const NOVICE_PULL = 3;
const DISTANCE_SHARE = 0.3;
/** Rounds use salts far from any redo's (a redo adds 1). */
const ROUND_SALT = 1000;

function withPar(level: LevelDef, metrics: Metrics): LevelDef {
  const t = metrics.clearSkilled;
  const par = t === null ? PAR_DEFAULT : Math.max(30, Math.round((t * PAR_SLACK) / PAR_ROUND) * PAR_ROUND);
  return { ...level, par };
}

const MAX_HOLE = 4;

/** How far a measured candidate is from the day: misses first, then distance and the novice pull. */
export function dayScore(metrics: Metrics, weekday: number, level?: LevelDef): number {
  const verdicts = judge(metrics, dailyTargets(weekday, level));
  const misses = verdicts.filter((v) => v.pass === false || v.pass === null).length;
  const nc = metrics.noviceClear;
  const pull = nc === null ? 1 : Math.abs(nc - (DAILY_NOVICE_AIM[weekday] ?? 0.7));
  return misses + DISTANCE_SHARE * distance(verdicts, WEIGHTS) + NOVICE_PULL * pull;
}

function missCount(metrics: Metrics, weekday: number, level: LevelDef): number {
  return judge(metrics, dailyTargets(weekday, level)).filter((v) => v.pass === false).length;
}

/** Nothing passed the cheap checks (the 2% aim floor is hard): widen the hole a cell and try again. */
export function generateDay(plan: DayPlan, o: GenOptions = {}): DailyEntry {
  let best: DailyEntry | null = null;
  for (let p = plan; ; p = { ...p, holeW: p.holeW + 1 }) {
    for (let round = 0; round <= (o.rounds ?? 1); round++) {
      const entry = generateWith(p, o, (o.salt ?? 0) + round * ROUND_SALT);
      if (entry && (!best || entry.score < best.score)) best = entry;
      if (best && missCount(best.metrics, plan.weekday, best.level) <= MISS_OK) return best;
      if (!entry) break;
    }
    if (!best && p.holeW >= MAX_HOLE) best = generateWith(p, o, o.salt ?? 0, true);
    if (best || p.holeW >= MAX_HOLE) {
      if (!best) throw new Error(`no candidate for ${plan.date} passed the cheap checks, even with a ${MAX_HOLE}-cell hole`);
      return best;
    }
  }
}

interface Played { readonly k: number; readonly level: LevelDef; readonly metrics: Metrics; readonly score: number }

function play(level: LevelDef, k: number, runs: number, weekday: number): Played {
  const m = measureLevel(level, { runs, seed: k + 1, maxSeconds: GEN_MAX_SECONDS });
  return { k, level, metrics: m.metrics, score: dayScore(m.metrics, weekday, level) };
}

/** `relaxed`: the last resort, any aim window over the design's 2% floor. */
function generateWith(plan: DayPlan, o: GenOptions, salt: number, relaxed = false): DailyEntry | null {
  const targets = dailyTargets(plan.weekday);
  const aimT = targets.find((t) => t.key === 'aimWindow')!;
  const mid = (aimT.lo + aimT.hi) / 2;
  const survivors: { k: number; level: LevelDef; aim: number }[] = [];
  const n = o.candidates ?? 200;
  const enough = o.enough ?? 24;
  for (let k = 0; k < n && survivors.length < enough; k++) {
    const level = compose(plan, k, salt);
    const c = relaxed ? cheapCheck(level, AIM_FLOOR, 1, false) : cheapCheck(level, aimT.lo, aimT.hi);
    if (c.ok) survivors.push({ k, level, aim: c.aim });
  }
  if (survivors.length === 0) return null;
  const finalists = [...survivors].sort((a, b) => Math.abs(a.aim - mid) - Math.abs(b.aim - mid)).slice(0, o.finalists ?? 6);
  const screened = finalists.map((f) => play(f.level, f.k, o.runs ?? 4, plan.weekday)).sort((a, b) => a.score - b.score);
  const verified = screened.slice(0, o.verify ?? 2).map((f) => play(f.level, f.k + 7919, o.verifyRuns ?? 10, plan.weekday)).sort((a, b) => a.score - b.score);
  const best = verified[0]!;
  return { date: plan.date, plan, level: withPar(best.level, best.metrics), metrics: best.metrics, score: best.score, candidate: best.k, survivors: survivors.length, salt };
}
