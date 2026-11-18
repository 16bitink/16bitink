/**
 * Planning the day from the calendar: a day is layout x goal x rule (docs/inkbrick-design.md
 * "Daily: a day is layout x goal x rule"). The weekly rhythm (Monday warm-up with an easy rule ...
 * Saturday the hard one with a hard rule, Sunday the spectacle with a spectacle rule), the featured
 * pieces, goals (clear most days; rescue, pearls and tide 1-2 times in any 7 days each; never Few
 * Stones), no rule within 7 days, at most 2 centre-box days in 7, and novelty against the last
 * 14 days (no layout more than twice in 7 days, no twist repeated within 7 days).
 */
import { hashString, mulberry32, pick, type Rng } from '../sim/rng';
import { RULE_CLASS, RULE_KINDS, type GoalKind, type RuleClass, type RuleKind } from '../sim/types';
import { addDays, available, CENTRE_BOXES, featuredAll, weekday, type Layout, type Twist } from './calendar';
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
  readonly goal: GoalKind;
  /** Every daily has one; campaign proposals may have none. */
  readonly rule: RuleKind | null;
  /** current: which way the sea pulls. */
  readonly ruleDir: 1 | -1;
}

/** Saturday is 3 too: with the 16 px stone a 2-cell hole falls under the 2% aim floor. */
const HOLE_BY_WEEKDAY: readonly number[] = [4, 4, 4, 3, 3, 3, 3];
/**
 * Picture is out of the rhythm (round 3): a picture of 1 x 1 bricks behind one wall clears in
 * 30-50 s with novices at 92-100% whatever its toughness; it stays a campaign layout (ch2).
 */
const MIDWEEK: readonly Layout[] = ['vault', 'wall', 'hourglass', 'guarded', 'maze', 'fuse', 'nested', 'layers', 'open', 'layers', 'open'];
const MONDAY: readonly Layout[] = ['vault', 'wall', 'hourglass', 'layers', 'open'];
const TWISTS: readonly Twist[] = ['ice', 'floe', 'keyGate', 'whirlpool', 'dark', 'bumper', 'lever', 'hidden', 'crab'];
/** The floors' gaps of a `layers` day: trap doors, flip walls, a spinner, a whirlpool, or plain. */
const LAYER_GAPS: readonly Twist[] = ['shutter', 'lever', 'spinner', 'whirlpool', 'none'];
const OPEN_TWISTS: readonly Twist[] = ['ice', 'bumper', 'hidden', 'crab'];
const TWIST_FITS: Readonly<Record<Twist, readonly Layout[] | 'any'>> = {
  none: 'any', ice: 'any', floe: 'any', dark: 'any', shutter: ['guarded', 'layers'], spinner: ['guarded', 'layers'],
  keyGate: ['vault', 'nested'], whirlpool: ['vault', 'wall', 'picture', 'layers', 'open'],
  bumper: 'any', lever: ['vault', 'nested', 'layers'], hidden: 'any', crab: 'any',
};
/** Goals other than clear, each 1-2 times in any 7 days (Few Stones is never a daily: dailies are ranked by time). */
const SPECIAL_GOALS: readonly GoalKind[] = ['rescue', 'pearls', 'tide'];
/** After this many days without it, a special goal may come up early (and must at 6). */
const GOAL_EARLY_DAYS = 4;
const GOAL_EARLY_CHANCE = 0.45;
const RULE_DAYS = 7;
/**
 * Rising Tide only where the lowest bricks face the raft: on layers, vaults and nested or guarded
 * boxes the field sinks bricks that sit behind a stone floor, and floods come whatever the player
 * does (a layers tide day flooded even the skilled bot 1.9 times a run).
 */
export const TIDE_LAYOUTS: readonly Layout[] = ['wall', 'hourglass', 'fuse', 'maze', 'core', 'open', 'picture'];
const BOX_DAYS_MAX = 2;
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

/** The rule kind a weekday asks for (0 = Sunday): Monday easy, Saturday hard, Sunday a spectacle, else any. */
export function ruleClassFor(wd: number): RuleClass | 'any' {
  return wd === 1 ? 'easy' : wd === 6 ? 'hard' : wd === 0 ? 'spectacle' : 'any';
}

function daysSince(recent: readonly DayPlan[], goal: GoalKind): number {
  for (let i = recent.length - 1; i >= 0; i--) if (recent[i]!.goal === goal) return recent.length - i;
  return 99;
}

/**
 * The day's goal: a special goal unseen for 6 days must come today (so each comes at least once
 * in any 7 days); one unseen for 4-5 days may come early; none may come a third time in 7 days.
 */
export function chooseGoal(rng: Rng, recent: readonly DayPlan[]): GoalKind {
  const week = recent.slice(-6);
  const open = SPECIAL_GOALS.filter((g) => week.filter((d) => d.goal === g).length < 2 && week[week.length - 1]?.goal !== g);
  const since = (g: GoalKind) => daysSince(recent, g);
  const due = open.filter((g) => since(g) >= 6).sort((a, b) => since(b) - since(a));
  if (due.length > 0) return due[0]!;
  const early = open.filter((g) => since(g) >= GOAL_EARLY_DAYS).sort((a, b) => since(b) - since(a));
  if (early.length > 0 && rng() < GOAL_EARLY_CHANCE) return early[0]!;
  return 'clear';
}

/** Rules that don't fight the goal or the twist (one heart and a flood; fog on a dark day). */
function ruleFits(rule: RuleKind, goal: GoalKind, twist: Twist): boolean {
  if (rule === 'oneHeart' && goal === 'tide') return false;
  if (rule === 'fog' && twist === 'dark') return false;
  return true;
}

/** Rules used in the RULE_DAYS days before `date` (from the plans known). */
function rulesBefore(date: string, known: readonly DayPlan[]): Set<RuleKind> {
  const from = addDays(date, -RULE_DAYS);
  return new Set(known.filter((d) => d.date >= from && d.date < date).flatMap((d) => (d.rule ? [d.rule] : [])));
}

/**
 * The day's rule: of the weekday's kind, not used within 7 days, and (Tuesday-Friday) not the last
 * one of its kind that the coming Monday, Saturday or Sunday would need.
 */
export function chooseRule(rng: Rng, date: string, recent: readonly DayPlan[], goal: GoalKind, twist: Twist): RuleKind {
  const cls = ruleClassFor(weekday(date));
  const used = rulesBefore(date, recent);
  const ofClass = RULE_KINDS.filter((r) => cls === 'any' || RULE_CLASS[r] === cls);
  const leavesEnough = (r: RuleKind): boolean => {
    if (cls !== 'any') return true;
    for (let d = 1; d <= RULE_DAYS; d++) {
      const later = addDays(date, d);
      const need = ruleClassFor(weekday(later));
      if (need === 'any' || RULE_CLASS[r] !== need) continue;
      const taken = rulesBefore(later, [...recent, { date, rule: r } as DayPlan]);
      if (RULE_KINDS.every((k) => RULE_CLASS[k] !== need || taken.has(k))) return false;
    }
    return true;
  };
  const pool = ofClass.filter((r) => !used.has(r) && ruleFits(r, goal, twist) && leavesEnough(r));
  if (pool.length > 0) return pick(rng, pool);
  // Never expected (the look-ahead keeps every kind stocked): the least recently used fitting rule of the kind.
  const order: (RuleKind | null)[] = [...recent].reverse().map((d) => d.rule);
  return [...ofClass].filter((r) => ruleFits(r, goal, twist)).sort((a, b) => (order.indexOf(b) === -1 ? 99 : order.indexOf(b)) - (order.indexOf(a) === -1 ? 99 : order.indexOf(a)))[0]!;
}

function chooseTwist(rng: Rng, date: string, layout: Layout, wd: number): Twist {
  const ok = (t: Twist) => available(t, date) && fits(t, layout);
  if (layout === 'guarded') return available('spinner', date) && (featuredAll(date).includes('spinner') || rng() < 0.5) ? 'spinner' : 'shutter';
  if (layout === 'layers') {
    const feat = LAYER_GAPS.filter((t) => featuredAll(date).includes(t) && ok(t));
    if (feat.length > 0 && rng() < 0.6) return pick(rng, feat);
    return pick(rng, LAYER_GAPS.filter((t) => t === 'none' || ok(t)));
  }
  const feat = featuredAll(date).filter((t): t is Twist => t !== 'nested' && t !== 'spinner' && TWISTS.includes(t as Twist) && ok(t as Twist));
  if (feat.length > 0 && rng() < 0.6) return pick(rng, feat);
  // Open days carry the no-stone pieces.
  const noStone = OPEN_TWISTS.filter(ok);
  if (layout === 'open' && noStone.length > 0 && rng() < 0.7) return pick(rng, noStone);
  if (wd !== 1 && rng() < 0.55) {
    const options = TWISTS.filter(ok);
    if (options.length > 0) return pick(rng, options);
  }
  return 'none';
}

function proposal(date: string, rng: Rng, recent: readonly DayPlan[], keep?: KeepPlan): DayPlan {
  const wd = weekday(date);
  const pool = (wd === 1 ? MONDAY : MIDWEEK).filter((l) => available(l, date));
  const allowed = pool.filter((l) => (keep?.goal !== 'tide' || TIDE_LAYOUTS.includes(l)) && !(keep?.noBoxes && CENTRE_BOXES.includes(l)) && l !== keep?.avoid);
  const picked: Layout = wd === 0 ? 'core' : pick(rng, allowed.length > 0 ? allowed : pool);
  const layout = keep?.layout ?? picked;
  const drawn = chooseTwist(rng, date, layout, wd);
  const twist = keep?.twist ?? drawn;
  const goal = keep?.goal ?? chooseGoal(rng, recent);
  const rule = keep?.rule ?? chooseRule(rng, date, recent, goal, twist);
  return {
    date, weekday: wd, layout, twist,
    picture: layout === 'picture' ? pick(rng, PICTURES).id : null,
    holeW: HOLE_BY_WEEKDAY[wd]!,
    size: wd === 1 ? 'short' : wd === 0 || wd === 6 ? 'big' : pick(rng, ['normal', 'normal', 'big'] as const),
    density: pick(rng, wd === 0 ? (['normal', 'dense'] as const) : (['light', 'normal', 'normal', 'dense'] as const)),
    goal, rule, ruleDir: rng() < 0.5 ? 1 : -1,
  };
}

/** How different two days look (layout counts most). */
export function novelty(a: DayPlan, b: DayPlan): number {
  return (a.layout !== b.layout ? 2 : 0) + (a.twist !== b.twist ? 1 : 0) + (a.picture !== b.picture ? 0.5 : 0)
    + Math.abs(a.holeW - b.holeW) * 0.5 + (a.size !== b.size ? 0.5 : 0) + (a.density !== b.density ? 0.5 : 0)
    + (a.goal !== b.goal ? 1 : 0);
}

function breaksRules(p: DayPlan, recent: readonly DayPlan[]): boolean {
  const week = recent.slice(-6);
  if (p.layout !== 'core' && week.filter((d) => d.layout === p.layout).length >= 2) return true;
  if (p.twist !== 'none' && week.some((d) => d.twist === p.twist)) return true;
  if (p.picture && recent.some((d) => d.picture === p.picture)) return true;
  if (CENTRE_BOXES.includes(p.layout) && week.filter((d) => CENTRE_BOXES.includes(d.layout)).length >= BOX_DAYS_MAX) return true;
  if (p.rule && !ruleFits(p.rule, p.goal, p.twist)) return true;
  if (p.goal === 'tide' && !TIDE_LAYOUTS.includes(p.layout)) return true;
  return false;
}

/**
 * A redo keeps the day's goal and rule (yesterday's teaser already promised them), and its layout
 * and twist when given (so the week's rules, like the box limit, still hold against later days).
 */
export interface KeepPlan {
  readonly goal: GoalKind; readonly rule: RuleKind; readonly ruleDir?: 1 | -1; readonly layout?: Layout; readonly twist?: Twist;
  /** A redo that must change its layout: no centre box (the days after it are frozen; the box limit must still hold). */
  readonly noBoxes?: boolean;
  /** A redo that must change its layout: not this one again. */
  readonly avoid?: Layout;
}

/** The plan for one date given the days before it (oldest first; only the last 14 matter). */
export function planDay(date: string, history: readonly DayPlan[], salt = 0, keep?: KeepPlan): DayPlan {
  const rng = mulberry32((daySeed(date) + Math.imul(salt, 0x85ebca6b)) >>> 0);
  const recent = history.slice(-NOVELTY_DAYS);
  let best: DayPlan | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < PLAN_TRIES; i++) {
    const p0 = proposal(date, rng, recent, keep);
    const p = keep?.ruleDir ? { ...p0, ruleDir: keep.ruleDir } : p0;
    if (breaksRules(p, recent)) continue;
    const near = recent.length ? Math.min(...recent.map((d) => novelty(p, d))) : 99;
    const score = near >= MIN_NOVELTY ? 100 + near * 0.01 : near;
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
    if (near >= MIN_NOVELTY) break;
  }
  return best ?? proposal(date, rng, recent, keep);
}

export function planDays(dates: readonly string[], before: readonly DayPlan[] = []): DayPlan[] {
  const out: DayPlan[] = [];
  for (const d of dates) out.push(planDay(d, [...before, ...out]));
  return out;
}
