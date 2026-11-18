/**
 * Planning a day (docs/inksnake-daily.md "The dials", "Weekly rhythm"):
 * the event if there is one, else the season's pool and the weekday's
 * rhythm pick the place, the snake (a guest on Wednesdays, some
 * Saturdays), the goal and the rule of the day, and the layouts to try.
 * Limits: no place twice within 3 days, no rule twice within 7 (event days
 * keep theirs), no layout twice within 60 days nor a layout family within
 * 14; the 14-day memory decides between what's left.
 */
import { addDays, eventOn, seasonOf, type EventId, type Season } from '@16bitink/game-sdk';
import { createRng, type Rng } from '../logic/rng';
import type { SnakeId } from '../logic/species';
import { DAILY_RULES, RULE_INFO, type DailyRule, type TreatKind } from '../level/daily';
import type { Place } from '../level/types';
import { pickOne, SHAPES, TRANSFORMS } from './geometry';
import { layoutFamily, layoutKey, type LayoutChoice } from './layouts';
import { BLIZZARD_PLACES, boardsFor, GOLDEN_PLACES, guestsFor, isGiant, SEASON_PLACES, type PlaceBook, type PlaceInfo } from './places';

export type GoalKind = 'grow' | 'feast' | 'rush' | 'golden' | 'boss';

export interface DayPlan {
  readonly date: string;
  /** 0 = Sunday. */
  readonly weekday: number;
  readonly season: Season;
  readonly event: EventId | null;
  readonly place: Place;
  readonly snake: SnakeId;
  readonly guest: boolean;
  readonly goal: GoalKind;
  readonly rule: DailyRule;
  readonly treats: TreatKind | null;
  /** Layouts to try, best first; all are reserved against the 60-day limit. */
  readonly layouts: readonly LayoutChoice[];
}

/** What a day must keep: its teaser already promised place, snake and rule (a redo keeps its goal too). */
export interface KeepPlan {
  readonly place: Place;
  readonly snake: SnakeId;
  readonly rule: DailyRule;
  readonly goal?: GoalKind;
}

interface EventPlan { readonly place: Place; readonly snake: SnakeId; readonly rule: DailyRule; readonly treats: TreatKind | null; readonly goal: GoalKind }

/** docs/inksnake-daily.md "Events". Halloween's second day trades the night for fog. */
export const EVENT_PLANS: Readonly<Record<EventId, EventPlan>> = {
  christmasEve: { place: 'farm', snake: 'candycane', rule: 'ice', treats: 'cookie', goal: 'feast' },
  christmas: { place: 'barrens', snake: 'candycane', rule: 'night', treats: 'candycane', goal: 'feast' },
  boxingDay: { place: 'farm', snake: 'candycane', rule: 'plenty', treats: 'cookie', goal: 'feast' },
  newYearsEve: { place: 'farm', snake: 'rainbowboa', rule: 'night', treats: 'confetti', goal: 'feast' },
  newYear: { place: 'mountains', snake: 'rainbowboa', rule: 'goldRush', treats: 'confetti', goal: 'feast' },
  lunarNewYear: { place: 'mountains', snake: 'goldentree', rule: 'goldRush', treats: 'envelope', goal: 'feast' },
  valentines: { place: 'heath', snake: 'rosyboa', rule: 'looseKnots', treats: 'heart', goal: 'feast' },
  wildlifeDay: { place: 'farm', snake: 'corn', rule: 'plenty', treats: null, goal: 'grow' },
  stPatricks: { place: 'rainforest', snake: 'greenpython', rule: 'goldRush', treats: 'coin', goal: 'feast' },
  easter: { place: 'farm', snake: 'eggeater', rule: 'plenty', treats: 'paintedegg', goal: 'feast' },
  earthDay: { place: 'heath', snake: 'earthsnake', rule: 'lure', treats: null, goal: 'grow' },
  oceansDay: { place: 'reef', snake: 'yellowsea', rule: 'swarm', treats: null, goal: 'grow' },
  snakeDay: { place: 'farm', snake: 'corn', rule: 'rival', treats: null, goal: 'grow' },
  catDay: { place: 'farm', snake: 'corn', rule: 'lure', treats: null, goal: 'boss' },
  halloween: { place: 'farm', snake: 'blackhognose', rule: 'night', treats: 'candy', goal: 'feast' },
  diwali: { place: 'jungle', snake: 'cobra', rule: 'lure', treats: null, goal: 'grow' },
};

const RULE_DAYS = 7;
const PLACE_DAYS = 3;
const LAYOUT_DAYS = 60;
const FAMILY_DAYS = 14;
const MEMORY_DAYS = 14;
const PLAN_TRIES = 48;
/** Alternate layouts kept in the plan (tried in order when the first fails the bot). */
const ALTERNATES = 2;
const PATTERN_SHARE = 0.45;
const SATURDAY_GOLDEN = 0.55;
const SATURDAY_GUEST = 0.25;

/** Rules only some seasons have. */
const SEASON_ONLY: Partial<Record<DailyRule, readonly Season[]>> = { ice: ['winter'], blizzard: ['winter'], hotDay: ['summer'], swarm: ['summer', 'spring'] };
/** Rules a season leans to (twice as likely). Gold Rush is autumn's: elsewhere it's rare. */
const SEASON_TILT: Partial<Record<DailyRule, readonly Season[]>> = {
  plenty: ['autumn'], goldRush: ['autumn'], night: ['winter'], hunters: ['autumn'], fog: ['autumn', 'winter'], hotDay: ['summer'], swarm: ['summer', 'spring'],
};
/** Friday in winter: the cold's own hard rules. */
const WINTER_FRIDAY: readonly DailyRule[] = ['ice', 'blizzard', 'night'];

export function daySeed(date: string): number {
  let h = 2166136261;
  for (const c of `inksnake:${date}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h >>> 0;
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** The rule kinds a weekday asks for. */
function ruleKinds(wd: number, goal: GoalKind): readonly ('easy' | 'hard' | 'spectacle')[] {
  if (wd === 1) return ['easy'];
  if (wd === 5) return ['hard'];
  if (wd === 0) return ['spectacle'];
  if (wd === 6) return goal === 'golden' ? ['easy', 'hard'] : ['spectacle'];
  return ['easy', 'hard'];
}

/** Whether a rule can run with this place, snake, goal and season (the engine's known limits). */
export function ruleFits(rule: DailyRule, info: PlaceInfo, snake: SnakeId, goal: GoalKind, season: Season, wd: number): boolean {
  const only = SEASON_ONLY[rule];
  if (only && !only.includes(season)) return false;
  if (rule === 'ice' && snake === 'eggeater') return false;
  if (rule === 'blizzard' && !BLIZZARD_PLACES.includes(info.place)) return false;
  if (rule === 'stampede' && !info.lane) return false;
  if (rule === 'giants' && (snake !== info.home || goal === 'feast' || goal === 'golden' || !info.prey.some((p) => isGiant(snake, p.kind)))) return false;
  if (goal === 'golden' && (rule === 'night' || rule === 'fog' || rule === 'goldRush')) return false;
  if (rule === 'hunters' && info.enemies.length === 0) return false;
  if (wd === 5 && season === 'winter' && !WINTER_FRIDAY.includes(rule)) return false;
  // The slow cold rules stay off the short days (the bot's blizzard and ice times run past Tuesday's band).
  if ((rule === 'ice' || rule === 'blizzard') && (wd === 1 || wd === 2)) return false;
  return true;
}

function weightOf(rule: DailyRule, season: Season): number {
  if (SEASON_TILT[rule]?.includes(season)) return 2;
  return rule === 'goldRush' ? 0.5 : 1;
}

function weighted<T>(rng: Rng, items: readonly T[], w: (t: T) => number): T | null {
  const total = items.reduce((a, t) => a + w(t), 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const t of items) {
    r -= w(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1] ?? null;
}

const within = (plans: readonly DayPlan[], date: string, days: number): DayPlan[] => {
  const from = addDays(date, -days + 1);
  const to = addDays(date, days - 1);
  return plans.filter((p) => p.date !== date && p.date >= from && p.date <= to);
};

/**
 * The rule's 7-day window must still leave each strict weekday (Monday's
 * easy, Friday's hard, the weekend's spectacles) a rule of its kind.
 */
function leavesEnough(rule: DailyRule, date: string, known: readonly DayPlan[], season: Season): boolean {
  for (let d = 1; d < RULE_DAYS; d++) {
    const later = addDays(date, d);
    const wd = weekdayOf(later);
    if (eventOn(later)) continue;
    const kinds = wd === 1 ? ['easy'] : wd === 5 ? ['hard'] : wd === 0 ? ['spectacle'] : null;
    if (!kinds) continue;
    const taken = new Set([rule, ...within(known, later, RULE_DAYS).map((p) => p.rule)]);
    const open = DAILY_RULES.filter((r) => kinds.includes(RULE_INFO[r].kind) && !taken.has(r) && !(SEASON_ONLY[r] && !SEASON_ONLY[r]!.includes(season))
      && !(wd === 5 && season === 'winter' && !WINTER_FRIDAY.includes(r)));
    if (open.length === 0) return false;
  }
  return true;
}

/** Event days are known in advance: the days around them count them in their limits. */
export function eventPlanStub(date: string): DayPlan | null {
  const ev = eventOn(date);
  if (!ev) return null;
  const e = EVENT_PLANS[ev];
  return { date, weekday: weekdayOf(date), season: seasonOf(date), event: ev, place: e.place, snake: e.snake, guest: false, goal: e.goal, rule: e.rule, treats: e.treats, layouts: [] };
}

/** Layout choices for the place and snake, best first: none used within 60 days, no family within 14. */
function chooseLayouts(info: PlaceInfo, snake: SnakeId, boss: boolean, rng: Rng, history: readonly DayPlan[], date: string, variant: number): LayoutChoice[] {
  const recent = history.filter((p) => p.date >= addDays(date, -LAYOUT_DAYS));
  const usedKeys = new Set(recent.flatMap((p) => p.layouts.map(layoutKey)));
  const usedFamilies = new Set(history.filter((p) => p.date >= addDays(date, -FAMILY_DAYS)).flatMap((p) => p.layouts.slice(0, 1).map(layoutFamily)));
  const boards = boardsFor(info, snake, boss);
  const remixes: LayoutChoice[] = boards.flatMap((b) => TRANSFORMS.map((t) => ({ kind: 'remix', board: b.id, t }) as const));
  const patterns: LayoutChoice[] = boards.flatMap((b) => SHAPES.map((shape) => ({ kind: 'pattern', shape, source: b.id, t: pickOne(rng, TRANSFORMS), variant }) as const));
  const open = (c: LayoutChoice) => !usedKeys.has(layoutKey(c)) && !usedFamilies.has(layoutFamily(c));
  const out: LayoutChoice[] = [];
  const families = new Set<string>();
  for (let i = 0; i < 60 && out.length <= ALTERNATES; i++) {
    const pool = (rng() < PATTERN_SHARE ? patterns : remixes).filter((c) => open(c) && !families.has(layoutFamily(c)));
    const pick = pool.length ? pickOne(rng, pool) : null;
    if (!pick) continue;
    out.push(pick);
    families.add(layoutFamily(pick));
  }
  if (out.length === 0) out.push(...remixes.filter((c) => !usedKeys.has(layoutKey(c))).slice(0, 1));
  return out;
}

function proposal(date: string, rng: Rng, book: PlaceBook, history: readonly DayPlan[], ahead: readonly DayPlan[], keep: KeepPlan | undefined, variant: number, relax = false): DayPlan | null {
  const wd = weekdayOf(date);
  const season = seasonOf(date);
  const known = [...history, ...ahead];
  const ev = eventOn(date);
  if (ev) {
    const e = EVENT_PLANS[ev];
    return { date, weekday: wd, season, event: ev, place: e.place, snake: e.snake, guest: false, goal: e.goal, rule: e.rule, treats: e.treats, layouts: chooseLayouts(book[e.place], e.snake, e.goal === 'boss', rng, history, date, variant) };
  }
  // Place: the season's pool, not within 3 days, the least seen lately most likely.
  // Event days ahead can leave a small winter pool nothing (4 places, farm and mountains taken by New Year): then only the next days count.
  const near = new Set(within(known, date, PLACE_DAYS).map((p) => p.place));
  const nextTo = new Set(within(known, date, 2).map((p) => p.place));
  const strict = SEASON_PLACES[season].filter((p) => !near.has(p));
  const pool = strict.length ? strict : SEASON_PLACES[season].filter((p) => !nextTo.has(p));
  const seen = (p: Place) => history.slice(-MEMORY_DAYS).filter((h) => h.place === p).length;
  let goal: GoalKind = keep?.goal ?? (wd === 1 ? 'grow' : wd === 2 ? 'feast' : wd === 3 ? pickOne(rng, ['grow', 'rush'] as const) : wd === 4 ? 'rush'
    : wd === 5 ? pickOne(rng, ['grow', 'feast'] as const) : wd === 6 ? (rng() < SATURDAY_GOLDEN ? 'golden' : pickOne(rng, ['grow', 'feast'] as const)) : 'boss');
  const goldenOk = (p: Place) => goal !== 'golden' || GOLDEN_PLACES.includes(p);
  const place = keep?.place ?? weighted(rng, pool.filter(goldenOk), (p) => 1 / (1 + seen(p)) ** 2);
  if (!place) return null;
  if (goal === 'golden' && !GOLDEN_PLACES.includes(place)) goal = 'grow';
  const info = book[place];
  // Snake: home, or a guest that suits the place.
  const guests = guestsFor(info, season);
  const wantGuest = !keep && (wd === 3 || (wd === 6 && rng() < SATURDAY_GUEST)) && guests.length > 0;
  const snake: SnakeId = keep?.snake ?? (wantGuest ? pickOne(rng, guests) : info.home);
  // Rule: of the weekday's kind, fitting, not within 7 days, leaving the strict days theirs.
  const used = new Set(within(known, date, RULE_DAYS).map((p) => p.rule));
  const kinds = ruleKinds(wd, goal);
  const rules = DAILY_RULES.filter((r) => kinds.includes(RULE_INFO[r].kind) && !used.has(r) && ruleFits(r, info, snake, goal, season, wd) && (wd === 1 || wd === 5 || wd === 0 || leavesEnough(r, date, known, season)));
  // Never expected (the look-ahead keeps each kind stocked): the fitting rule of the kind used longest ago.
  const lastUsed = (r: DailyRule) => known.filter((p) => p.rule === r && p.date < date).map((p) => p.date).sort().pop() ?? '';
  const fallback = relax ? DAILY_RULES.filter((r) => kinds.includes(RULE_INFO[r].kind) && ruleFits(r, info, snake, goal, season, wd)).sort((a, b) => lastUsed(a).localeCompare(lastUsed(b)))[0] : undefined;
  const rule = keep?.rule ?? weighted(rng, rules, (r) => weightOf(r, season)) ?? fallback;
  if (!rule) return null;
  const layouts = chooseLayouts(info, snake, goal === 'boss', rng, history, date, variant);
  if (layouts.length === 0) return null;
  return { date, weekday: wd, season, event: null, place, snake, guest: snake !== info.home, goal, rule, treats: null, layouts };
}

/** How close a plan comes to the recent days (lower is fresher): shared dials, the last week counting double. */
export function staleness(p: DayPlan, recent: readonly DayPlan[]): number {
  let s = 0;
  recent.forEach((d, i) => {
    const same = (d.place === p.place ? 1 : 0) + (d.snake === p.snake ? 1 : 0) + (d.goal === p.goal ? 1 : 0) + (d.rule === p.rule ? 1.5 : 0);
    const w = i >= recent.length - 7 ? 1 : 0.5;
    s += w * same * same;
  });
  return s;
}

/**
 * The plan for `date`, given every plan before it (oldest first; the last 60
 * days matter) and the event days known ahead. `salt` gives a redo other choices.
 */
export function planDay(date: string, book: PlaceBook, history: readonly DayPlan[], salt = 0, keep?: KeepPlan): DayPlan {
  const rng = createRng((daySeed(date) + Math.imul(salt, 0x85ebca6b)) >>> 0);
  const variant = (daySeed(date) + salt) % 100_000;
  const ahead = Array.from({ length: RULE_DAYS - 1 }, (_, i) => eventPlanStub(addDays(date, i + 1))).filter((p): p is DayPlan => p !== null);
  const recent = history.slice(-MEMORY_DAYS);
  let best: DayPlan | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < PLAN_TRIES * 2 && !(best && i >= PLAN_TRIES); i++) {
    const p = proposal(date, rng, book, history, ahead, keep, variant, i >= PLAN_TRIES);
    if (!p) continue;
    const score = staleness(p, recent);
    if (score < bestScore) {
      best = p;
      bestScore = score;
    }
    if (p.event || keep) break;
  }
  if (!best) throw new Error(`no plan fits ${date}`);
  return best;
}
