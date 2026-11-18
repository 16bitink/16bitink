/** The bots' numbers per level (docs/inkbrick-design.md "Bots, lab and measurements"). */
import { Bot, type BotKind } from './bot';
import { CRUMBLE_SHARE } from './constants';
import { Sim } from './sim';
import type { MetricKey, Target } from './targets';
import { Aimer, aimWindow } from './trace';
import { cellIndex, insideMask, wallMask } from './grid';
import { STEP, type LevelDef } from './types';

export const CASCADE_WINDOW = 8;
/**
 * Cascade counts against at most this many inside bricks: one stone can't break 35% of a
 * 480-brick picture in 8 s, but 35% of 120 (42 bricks) is a real payoff anywhere.
 */
export const CASCADE_BUDGET = 120;
export const MAX_RUN_SECONDS = 360;

export interface RunResult {
  readonly bot: BotKind;
  readonly cleared: boolean;
  /** Elapsed seconds at the end. */
  readonly time: number;
  readonly heartsLost: number;
  /** -1: never broke in. */
  readonly breakInAt: number;
  /** Inside bricks (vault, behind the wall) broken within 8 s of the break-in, as a share of those left (at most CASCADE_BUDGET). */
  readonly cascade: number;
  readonly drought: number;
  /** Seconds from 95% broken to the clear (-1: not reached). */
  readonly hunt: number;
  readonly peakBalls: number;
  /** Share of the breakable bricks broken at the end. */
  readonly share: number;
  /** Rising Tide floods. */
  readonly floods: number;
  /** The daily's hidden pearl was found. */
  readonly pearlFound: boolean;
}

/** Breakable bricks with a cell inside (all breakable bricks when none is). */
export function insideBricks(level: LevelDef): readonly number[] {
  const inside = insideMask(wallMask(level));
  const breakable = level.bricks.map((b, i) => ({ b, i })).filter(({ b }) => b.kind !== 'stone' && b.kind !== 'gate');
  const ins = breakable.filter(({ b }) => {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (inside[cellIndex(x, y)]) return true;
    return false;
  });
  return (ins.length > 0 ? ins : breakable).map(({ i }) => i);
}

export function runBot(level: LevelDef, kind: BotKind, seed: number, aim: Aimer | null, maxSeconds = MAX_RUN_SECONDS): RunResult {
  const sim = new Sim(level);
  const bot = new Bot(kind, seed, aim);
  const s = sim.state;
  const ins = insideBricks(level);
  const aliveInside = () => ins.reduce((n, i) => n + (s.bricks[i]!.alive ? 1 : 0), 0);
  let lastActive = 0;
  let drought = 0;
  let leftAtBreakIn = -1;
  let cascade = 0;
  let huntFrom = -1;
  const maxSteps = Math.round(maxSeconds / STEP);
  for (let i = 0; i < maxSteps && (s.phase === 'aim' || s.phase === 'play'); i++) {
    sim.step(bot.input(s));
    // A thump on Brumm is progress too (boss levels have no bricks to break).
    if (sim.drainEvents().some((e) => e.type === 'bossHit') && s.elapsed > lastActive) lastActive = s.elapsed;
    if (s.phase === 'play') {
      const active = Math.max(s.lastBreakAt, s.lastNearAt);
      if (active > lastActive) lastActive = active;
      drought = Math.max(drought, s.elapsed - lastActive);
    } else lastActive = s.elapsed;
    if (s.breakIn && leftAtBreakIn < 0) leftAtBreakIn = aliveInside();
    if (leftAtBreakIn > 0 && s.elapsed - s.breakInAt <= CASCADE_WINDOW) cascade = Math.min(1, (leftAtBreakIn - aliveInside()) / Math.min(leftAtBreakIn, CASCADE_BUDGET));
    if (huntFrom < 0 && s.breakableLeft <= CRUMBLE_SHARE * s.breakableTotal) huntFrom = s.elapsed;
  }
  const cleared = s.phase === 'cleared';
  return {
    bot: kind, cleared, time: s.elapsed, heartsLost: s.heartsLost, breakInAt: s.breakInAt,
    cascade, drought, hunt: cleared && huntFrom >= 0 ? s.elapsed - huntFrom : -1, peakBalls: s.peakBalls,
    share: s.brokenShare, floods: s.floods, pearlFound: s.dailyPearlFound,
  };
}

export type Metrics = Readonly<Record<MetricKey, number | null>>;

export interface Measurement {
  readonly metrics: Metrics;
  readonly runs: readonly RunResult[];
}

function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function cv(xs: readonly number[]): number | null {
  if (xs.length < 2) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / xs.length);
  return mean > 0 ? sd / mean : null;
}

export interface MeasureOptions {
  readonly runs?: number;
  readonly bots?: readonly BotKind[];
  readonly seed?: number;
  readonly directions?: number;
  readonly maxSeconds?: number;
}

/** True when the level has an inside (a vault, behind a wall, or inside armour): its break-in is measured. */
export function hasInside(level: LevelDef): boolean {
  return insideMask(wallMask(level)).some((v) => v === 1);
}

/**
 * True when stone (not armour) makes the inside: only then is there a hole to aim at. An open
 * level's way in is breakable, so its aim window reads n/a (docs/inkbrick-design.md).
 */
export function hasStoneInside(level: LevelDef): boolean {
  return insideMask(wallMask(level, false)).some((v) => v === 1);
}

export function summarize(level: LevelDef, runs: readonly RunResult[], aim: number): Metrics {
  const of = (k: BotKind) => runs.filter((r) => r.bot === k);
  // A blocked hole (bricks in every shot's way) reads 0% and a MISS, not n/a.
  const hasHole = hasInside(level);
  const bi = (k: BotKind) => (hasHole ? median(of(k).filter((r) => r.breakInAt >= 0).map((r) => r.breakInAt)) : null);
  const decent = of('decent');
  const novice = of('novice');
  const boss = level.boss;
  const goal = level.goal ?? 'clear';
  // The clock only matters while the board has to be cleared; Few Stones is judged by the share.
  const timed = goal !== 'stones';
  const hunts = !boss && (goal === 'clear' || goal === 'tide');
  const skilled = of('skilled');
  return {
    aimWindow: hasHole && hasStoneInside(level) ? aim : null,
    breakInNovice: bi('novice'),
    breakInSkilled: bi('skilled'),
    // A boss level is won on hits, not bricks: no cascade and no last-brick hunt there.
    cascade: hasHole && !boss ? median(decent.filter((r) => r.breakInAt >= 0).map((r) => r.cascade)) : null,
    drought: median(decent.map((r) => r.drought)),
    clearSkilled: timed ? median(skilled.filter((r) => r.cleared).map((r) => r.time)) : null,
    noviceClear: novice.length ? novice.filter((r) => r.cleared).length / novice.length : null,
    hunt: hunts ? median(decent.filter((r) => r.hunt >= 0).map((r) => r.hunt)) : null,
    bossHits: boss ? boss.hits : null,
    luckCV: timed ? cv(decent.filter((r) => r.cleared).map((r) => r.time)) : null,
    shareSkilled: goal === 'stones' ? median(skilled.map((r) => r.share)) : null,
    floods: goal === 'tide' ? median(decent.map((r) => r.floods)) : null,
    pearlFound: level.dailyPearl && decent.length ? decent.filter((r) => r.pearlFound).length / decent.length : null,
    bricks: level.bricks.length,
    peakBalls: runs.reduce((m, r) => Math.max(m, r.peakBalls), 0),
  };
}

export function measureLevel(level: LevelDef, o: MeasureOptions = {}): Measurement {
  const runsPer = o.runs ?? 20;
  const bots = o.bots ?? (['novice', 'decent', 'skilled'] as const);
  const aim = aimWindow(level, o.directions);
  const table = hasInside(level) ? new Aimer(level) : null;
  const runs: RunResult[] = [];
  for (const kind of bots) {
    for (let i = 0; i < runsPer; i++) runs.push(runBot(level, kind, (o.seed ?? 1) * 1000 + i, table, o.maxSeconds));
  }
  return { metrics: summarize(level, runs, aim), runs };
}

export interface Verdict { readonly target: Target; readonly value: number | null; readonly pass: boolean | null }

export function judge(metrics: Metrics, targets: readonly Target[]): Verdict[] {
  return targets.map((t) => {
    const v = metrics[t.key];
    return { target: t, value: v, pass: v === null ? null : v >= t.lo - 1e-9 && v <= t.hi + 1e-9 };
  });
}

/** Distance from the targets, 0 = all met (for the generator); unmeasured counts as a miss. */
export function distance(verdicts: readonly Verdict[], weights: Partial<Record<MetricKey, number>> = {}): number {
  let d = 0;
  for (const v of verdicts) {
    const w = weights[v.target.key] ?? 1;
    if (v.value === null) {
      d += w;
      continue;
    }
    const span = Math.max(1e-6, v.target.hi - v.target.lo);
    const off = v.value < v.target.lo ? v.target.lo - v.value : v.value > v.target.hi ? v.value - v.target.hi : 0;
    d += w * Math.min(2, off / span);
  }
  return d;
}

export function formatValue(t: Target, v: number | null): string {
  if (v === null) return 'n/a';
  if (t.unit === '%') return `${(v * 100).toFixed(1)}%`;
  if (t.unit === 's') return `${v.toFixed(1)}s`;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
