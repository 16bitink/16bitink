import type { TreatKind } from '../../level/daily';
import type { LevelDef } from '../../level/types';
import { keepIn } from '../preyMoves';
import { preySpec } from '../prey';
import { catchable, type Prey, type PreyKind, type PreySpec, type PreyWorld } from '../preyTypes';
import type { Rng } from '../rng';
import type { Snake } from '../snake';
import { dist, pt, type Pt } from '../vec';
import { goldenKind, goldenSpec, hideInCover } from './golden';
import { BLIZZARD, GOLD_RUSH, GOLDEN, HOT_DAY, ICE, LURE, TREAT } from './params';
import { Treats, type Treat } from './treats';

/** What the daily's rules happen to say, for the views and sounds (merged into the world's events). */
export type DailyEvent =
  | { readonly type: 'treat'; readonly kind: TreatKind; readonly x: number; readonly y: number }
  | { readonly type: 'golden'; readonly x: number; readonly y: number; readonly caught: number; readonly count: number }
  | { readonly type: 'goldenDone'; readonly x: number; readonly y: number }
  | { readonly type: 'gust'; readonly angle: number };

/** What the world lends the daily's rules. */
export interface DailyCtx {
  readonly level: LevelDef;
  readonly snake: Snake;
  readonly prey: readonly Prey[];
  readonly rng: Rng;
  readonly pw: PreyWorld;
  /** A new prey of `kind` somewhere free at least `away` px from the head, or null. */
  spawn(kind: PreyKind, away: number): Prey | null;
  emit(e: DailyEvent): void;
  /** A treat is eaten: it counts towards a feast on it. */
  ate(kind: TreatKind): void;
}

/**
 * A daily's engine rules (see params.ts and docs/inksnake-daily.md): the
 * rule of the day, the treats and the golden goal. Made only for levels
 * that have one of them, so campaign levels run exactly as before.
 */
export class DailyRun {
  readonly treats: Treats | null;
  /** The blizzard's push now, px/s (zero without one). */
  wind: Pt = pt(0, 0);
  /** The golden goal's catches so far, of `goldenCount` (0 of 0 without one). */
  caught = 0;
  readonly goldenCount: number;
  readonly goldenKind: PreyKind | null;
  private windAngle = 0;
  private windFrom = 0;
  private windEase = 1;
  private windLeft = 0;
  private arrivals = 0;
  private goldenWait = -1;
  private readonly specs = new Map<PreyKind, PreySpec>();
  private readonly before = new Map<number, Pt>();

  constructor(private readonly c: DailyCtx) {
    const l = c.level;
    this.treats = l.treats ? new Treats(l.treats.kind, l.treats.count, c.rng) : null;
    this.goldenCount = l.goal?.kind === 'golden' ? l.goal.count : 0;
    this.goldenKind = this.goldenCount ? goldenKind(l) : null;
    const s = c.snake;
    if (l.rule === 'ice') {
      s.turnRule = ICE.turn;
      s.carry = ICE.carry;
    }
    if (l.rule === 'hotDay') s.speedRule = HOT_DAY;
    if (l.rule === 'blizzard') this.turnWind(true);
  }

  /** Whether `level` needs a DailyRun at all. */
  static wanted(level: LevelDef): boolean {
    return level.rule !== undefined || level.treats !== undefined || level.goal?.kind === 'golden';
  }

  get looseKnots(): boolean {
    return this.c.level.rule === 'looseKnots';
  }

  get goldenDone(): boolean {
    return this.caught >= this.goldenCount;
  }

  /** The level's first frame: treats and the first golden prey laid out. */
  start(): void {
    this.treats?.fill(this.c.pw, true);
    if (this.goldenKind) this.spawnGolden();
  }

  /** Before the snake moves: the wind. */
  beforeSnake(dt: number): void {
    if (this.c.level.rule !== 'blizzard') return;
    this.windLeft -= dt;
    if (this.windLeft <= 0) this.turnWind(false);
    this.windEase = Math.min(1, this.windEase + dt / BLIZZARD.ease);
    const e = this.windEase * this.windEase * (3 - 2 * this.windEase);
    const a = this.windFrom + angleDiff(this.windFrom, this.windAngle) * e;
    this.wind = pt(Math.cos(a) * BLIZZARD.push, Math.sin(a) * BLIZZARD.push);
    this.c.snake.push = this.wind;
  }

  private turnWind(first: boolean): void {
    const rng = this.c.rng;
    this.windFrom = first ? rng() * Math.PI * 2 : this.windAngle;
    // A new direction well away from the last: across the board, not a small veer.
    this.windAngle = first ? this.windFrom : this.windFrom + (Math.PI * 0.5 + rng() * Math.PI) * (rng() < 0.5 ? 1 : -1);
    this.windEase = first ? 1 : 0;
    this.windLeft = BLIZZARD.every[0] + rng() * (BLIZZARD.every[1] - BLIZZARD.every[0]);
    if (!first) this.c.emit({ type: 'gust', angle: this.windAngle });
  }

  /** How fast a prey animal lives this frame (a hot day, a golden one). */
  preyTime(p: Prey): number {
    const hot = this.c.level.rule === 'hotDay' ? HOT_DAY : 1;
    return hot * (p.gold === 'rush' ? GOLD_RUSH.quick : p.gold === 'goal' ? GOLDEN.quick : 1);
  }

  /** The spec a prey animal lives by this frame (a golden one sees further). */
  preySpec(p: Prey, spec: PreySpec): PreySpec {
    if (p.gold !== 'goal') return spec;
    let s = this.specs.get(p.kind);
    if (!s) {
      s = goldenSpec(spec);
      this.specs.set(p.kind, s);
    }
    return s;
  }

  /** Before prey step: where each golden one was (it may sit tight in cover). */
  beforePrey(): void {
    this.before.clear();
    for (const p of this.c.prey) if (p.gold === 'goal') this.before.set(p.id, pt(p.x, p.y));
  }

  /** After prey step: the lure, golden prey making for cover, treats picked up, the next golden prey. */
  afterPrey(dt: number): void {
    const c = this.c;
    const head = c.snake.head;
    for (const p of c.prey) {
      const was = this.before.get(p.id);
      if (was && p.gold === 'goal') hideInCover(p, was, c.level, head);
    }
    if (c.level.rule === 'lure') this.lure(dt);
    if (this.treats) {
      for (const t of this.treats.step(c.pw, head, c.snake.width * 0.6, dt)) this.takeTreat(t);
    }
    if (this.goldenWait >= 0) {
      this.goldenWait -= dt;
      if (this.goldenWait < 0) this.spawnGolden();
    }
  }

  private lure(dt: number): void {
    const c = this.c;
    const h = c.snake.head;
    const pull = (o: { x: number; y: number }): boolean => {
      const d = dist(o, h);
      if (d >= LURE.reach || d < 1) return false;
      const k = Math.min(d, LURE.speed * dt) / d;
      o.x += (h.x - o.x) * k;
      o.y += (h.y - o.y) * k;
      return true;
    };
    for (const p of c.prey) {
      if (!catchable(p) || p.mode === 'sleep' || p.alt > 0.05 || p.frozen) continue;
      if (pull(p)) keepIn(p, preySpec(p.kind).size / 2, c.pw, preySpec(p.kind));
    }
    for (const t of this.treats?.list ?? []) pull(t);
  }

  private takeTreat(t: Treat): void {
    this.c.snake.grow(TREAT.growth);
    this.c.ate(t.kind);
    this.c.emit({ type: 'treat', kind: t.kind, x: t.x, y: t.y });
  }

  /** A prey animal has just arrived: on a gold rush, every few is golden. */
  arrived(p: Prey): void {
    if (this.c.level.rule !== 'goldRush' || p.gold) return;
    this.arrivals += 1;
    if (this.arrivals % GOLD_RUSH.every === 0) p.gold = 'rush';
  }

  /** How much more a meal grows (and scores): a gold rush's golden meals. */
  mealScale(p: Prey): { readonly growth: number; readonly points: number } {
    if (p.gold === 'rush') return { growth: GOLD_RUSH.growth, points: GOLD_RUSH.points };
    if (p.gold === 'goal') return { growth: 1, points: 1 + GOLDEN.points / Math.max(1, preySpec(p.kind).points) };
    return { growth: 1, points: 1 };
  }

  /** A meal went down (or was taken by a hunter, `eaten` false): a golden catch counts, and the next one is sent. */
  gone(p: Prey, eaten: boolean): void {
    if (p.gold !== 'goal') return;
    if (eaten) {
      this.caught += 1;
      this.c.emit({ type: 'golden', x: p.x, y: p.y, caught: this.caught, count: this.goldenCount });
      if (this.goldenDone) {
        this.c.emit({ type: 'goldenDone', x: p.x, y: p.y });
        return;
      }
    }
    this.goldenWait = GOLDEN.next;
  }

  private spawnGolden(): void {
    if (!this.goldenKind || this.goldenDone) return;
    const p = this.c.spawn(this.goldenKind, GOLDEN.away);
    if (p) p.gold = 'goal';
    else this.goldenWait = 0.5;
  }

  /** The goal's share for the meter: a golden goal's catches. */
  get goldenProgress(): number {
    return this.goldenCount ? Math.min(1, this.caught / this.goldenCount) : 1;
  }
}

/** The shorter way round from angle a to b. */
function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
