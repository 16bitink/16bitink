/**
 * Planning the day from the calendar: the weekly rhythm (Monday warm-up ... Saturday the hard one,
 * Sunday the spectacle), the featured piece, and novelty against the last 14 days (no layout more
 * than twice in 7 days, no twist repeated within 7 days, far enough from every recent day).
 */
import { hashString, mulberry32, pick, type Rng } from '../sim/rng';
import { available, featured, weekday, type Layout, type Twist } from './calendar';
import { PICTURES } from './pictures';

export type Size = 'short' | 'normal' | 'big';
export type Density = 'light' | 'normal' | 'dense';

export interface DayPlan {
  readonly date: string;
  readonly weekday: number;
  readonly layout: Layout;
  readonly twist: Twist;
  readonly picture: string | null;
  /** Hole width in cells (2-4): the main dial. */
  readonly holeW: number;
  readonly size: Size;
  readonly density: Density;
}

/** Saturday is 3 too: with the 16 px stone a 2-cell hole falls under the 2% aim floor. */
const HOLE_BY_WEEKDAY: readonly number[] = [4, 4, 4, 3, 3, 3, 3];
/**
 * Picture is out of the rhythm (round 3): a picture of 1 x 1 bricks behind one wall clears in
 * 30-50 s with novices at 92-100% whatever its toughness; it stays a campaign layout (ch2).
 */
const MIDWEEK: readonly Layout[] = ['vault', 'wall', 'hourglass', 'guarded', 'maze', 'fuse', 'nested'];
const MONDAY: readonly Layout[] = ['vault', 'wall', 'hourglass'];
const TWISTS: readonly Twist[] = ['ice', 'floe', 'keyGate', 'whirlpool', 'dark'];
const TWIST_FITS: Readonly<Record<Twist, readonly Layout[] | 'any'>> = {
  none: 'any', ice: 'any', floe: 'any', dark: 'any', shutter: ['guarded'], spinner: ['guarded'],
  keyGate: ['vault', 'nested'], whirlpool: ['vault', 'wall', 'picture'],
};
const PLAN_TRIES = 40;
const NOVELTY_DAYS = 14;
const MIN_NOVELTY = 1.5;

export function daySeed(date: string): number {
  return hashString(`inkbrick:${date}`);
}

function fits(twist: Twist, layout: Layout): boolean {
  const f = TWIST_FITS[twist];
  return f === 'any' || f.includes(layout);
}

function proposal(date: string, rng: Rng): DayPlan {
  const wd = weekday(date);
  const pool = (wd === 1 ? MONDAY : MIDWEEK).filter((l) => available(l, date));
  const layout: Layout = wd === 0 ? 'core' : pick(rng, pool);
  const feat = featured(date);
  let twist: Twist = 'none';
  if (layout === 'guarded') twist = available('spinner', date) && (feat === 'spinner' || rng() < 0.5) ? 'spinner' : 'shutter';
  else if (feat && feat !== 'nested' && feat !== 'spinner' && fits(feat as Twist, layout) && rng() < 0.5) twist = feat as Twist;
  else if (wd !== 1 && rng() < 0.55) {
    const options = TWISTS.filter((t) => available(t, date) && fits(t, layout));
    if (options.length > 0) twist = pick(rng, options);
  }
  return {
    date, weekday: wd, layout, twist,
    picture: layout === 'picture' ? pick(rng, PICTURES).id : null,
    holeW: HOLE_BY_WEEKDAY[wd]!,
    size: wd === 1 ? 'short' : wd === 0 || wd === 6 ? 'big' : pick(rng, ['normal', 'normal', 'big'] as const),
    density: pick(rng, wd === 0 ? (['normal', 'dense'] as const) : (['light', 'normal', 'normal', 'dense'] as const)),
  };
}

/** How different two days look (layout counts most). */
export function novelty(a: DayPlan, b: DayPlan): number {
  return (a.layout !== b.layout ? 2 : 0) + (a.twist !== b.twist ? 1 : 0) + (a.picture !== b.picture ? 0.5 : 0)
    + Math.abs(a.holeW - b.holeW) * 0.5 + (a.size !== b.size ? 0.5 : 0) + (a.density !== b.density ? 0.5 : 0);
}

function breaksRules(p: DayPlan, recent: readonly DayPlan[]): boolean {
  const week = recent.slice(-6);
  if (p.layout !== 'core' && week.filter((d) => d.layout === p.layout).length >= 2) return true;
  if (p.twist !== 'none' && week.some((d) => d.twist === p.twist)) return true;
  if (p.picture && recent.some((d) => d.picture === p.picture)) return true;
  return false;
}

/** The plan for one date given the days before it (oldest first; only the last 14 matter). */
export function planDay(date: string, history: readonly DayPlan[], salt = 0): DayPlan {
  const rng = mulberry32((daySeed(date) + Math.imul(salt, 0x85ebca6b)) >>> 0);
  const recent = history.slice(-NOVELTY_DAYS);
  let best: DayPlan | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < PLAN_TRIES; i++) {
    const p = proposal(date, rng);
    if (breaksRules(p, recent)) continue;
    const near = recent.length ? Math.min(...recent.map((d) => novelty(p, d))) : 99;
    const score = near >= MIN_NOVELTY ? 100 + near * 0.01 : near;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
    if (near >= MIN_NOVELTY) break;
  }
  return best ?? proposal(date, rng);
}

export function planDays(dates: readonly string[], before: readonly DayPlan[] = []): DayPlan[] {
  const out: DayPlan[] = [];
  for (const d of dates) out.push(planDay(d, [...before, ...out]));
  return out;
}
