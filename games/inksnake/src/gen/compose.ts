/**
 * A candidate level from the day's plan and a layout: the cast (prey,
 * enemies, boss, treats), the goal, the start and target lengths, the data
 * rules written into the fields (docs/inksnake-daily.md "Rules of the
 * day"), the name and the hints. Par and a rush's clock are set after the
 * bot has played it (generate.ts).
 */
import { EVENTS } from '@16bitink/game-sdk';
import { goldenKind } from '../logic/daily/golden';
import type { Rng } from '../logic/rng';
import { preySpec, type PreyKind } from '../logic/prey';
import { relativeOf } from '../logic/species';
import { dailyId } from '../level/daily';
import { type SolidDef, type EnemyDef, type GoalDef, type LevelDef, type PreyDef } from '../level/types';
import { between, pickOne, round } from './geometry';
import { freeCover, type Layout } from './layouts';
import { canEat, ENEMY_NEEDS, isGiant, type PlaceInfo } from './places';
import type { DayPlan } from './plan';

/** Each weekday's share of the base board's growth (Monday short); the bot then tunes it into the band. */
const GROWTH_BY_WEEKDAY: readonly number[] = [1, 0.75, 0.9, 0.95, 1, 1, 1];
const MIN_GROWTH = 110;
const MAX_PREY_COUNT = 12;
const MAX_ENEMY_COUNT = 4;
/** A rush's clock before the bot has set it: long enough never to end a bot run. */
export const RUSH_PLACEHOLDER = 300;

export interface Candidate {
  readonly level: LevelDef;
  /** Target length minus start length, before the rules' multipliers. */
  readonly growth: number;
  /** The rules' multiplier on growth (Plenty ×1.3, Swarm ×1.2). */
  readonly growthScale: number;
}

const limit = (n: number, max: number): number => Math.max(1, Math.min(max, Math.round(n)));

/** The prey: the base board's, or a fresh mix from the place's kinds; only what the snake eats, eggs only where there are nests. */
function castPrey(plan: DayPlan, info: PlaceInfo, layout: Layout, rng: Rng): PreyDef[] {
  const nests = (layout.nests?.length ?? 0) > 0;
  const okKind = (k: PreyKind) => canEat(plan.snake, k) && (nests || !/egg/.test(k));
  if (plan.goal === 'boss') return layout.base.prey.filter((p) => okKind(p.kind)).map((p) => ({ ...p }));
  const fromBase = layout.base.prey.filter((p) => okKind(p.kind));
  if (rng() < 0.5 && fromBase.length > 0 && fromBase.reduce((a, p) => a + p.count, 0) >= 4) return fromBase.map((p) => ({ ...p }));
  const pool = info.prey.filter((p) => okKind(p.kind));
  if (pool.length === 0) return fromBase;
  const n = Math.min(pool.length, 1 + Math.floor(rng() * 3));
  const kinds = [...pool].sort(() => rng() - 0.5).slice(0, n);
  const total = 5 + Math.floor(rng() * 3);
  // The small ones come more often: big meals are one or two at a time.
  return kinds.map((p, i) => {
    const big = preySpec(p.kind).size > 20;
    const share = i === 0 ? total - (n - 1) * 2 : 2;
    return { kind: p.kind, count: limit(big ? Math.min(2, share) : share, Math.max(p.count, 2)) };
  });
}

/** The enemies: none to two kinds of the place's, fewer on Monday, none on boss days; only those the board can hold. */
function castEnemies(plan: DayPlan, info: PlaceInfo, layout: Layout, rng: Rng): EnemyDef[] {
  if (plan.goal === 'boss' || plan.event) return [];
  const has = (need: 'nests' | 'spots') => ((need === 'nests' ? layout.nests : layout.spots)?.length ?? 0) > 0;
  const pool = info.enemies.filter((e) => !ENEMY_NEEDS[e.kind] || has(ENEMY_NEEDS[e.kind]!));
  if (pool.length === 0) return [];
  const n = plan.weekday === 1 ? (rng() < 0.5 ? 1 : 0) : rng() < 0.35 ? 2 : 1;
  return [...pool].sort(() => rng() - 0.5).slice(0, Math.min(n, pool.length)).map((e) => ({
    kind: e.kind, ...(e.count ? { count: e.count } : {}), from: round(between(rng, 3, 9)),
  }));
}

/** The feast's food: a kind on the board with at least two at a time (a treat on event days). */
function feastFood(prey: PreyDef[], info: PlaceInfo, rng: Rng): { food: PreyKind; prey: PreyDef[] } {
  const campaign = [...info.boards].map((b) => b.goal).find((g): g is Extract<GoalDef, { kind: 'feast' }> => g?.kind === 'feast')?.food;
  const onBoard = prey.map((p) => p.kind);
  const food = (campaign && onBoard.includes(campaign as PreyKind) && rng() < 0.6 ? campaign : pickOne(rng, onBoard)) as PreyKind;
  return { food, prey: prey.map((p) => (p.kind === food ? { ...p, count: Math.max(p.count, 2) } : p)) };
}

/** The data rules, written into the level's fields. */
function applyRule(level: LevelDef, plan: DayPlan, info: PlaceInfo, rng: Rng): { level: LevelDef; growthScale: number } {
  switch (plan.rule) {
    case 'plenty':
      return { level: { ...level, prey: level.prey.map((p) => ({ ...p, count: limit(p.count * 2, MAX_PREY_COUNT) })) }, growthScale: 1.3 };
    case 'night':
      return { level: { ...level, dark: true }, growthScale: 1 };
    case 'oneLife':
      return { level: { ...level, lives: 1 }, growthScale: 1 };
    case 'hunters': {
      const enemies: readonly EnemyDef[] = level.enemies?.length ? level.enemies : info.enemies.filter((e) => !ENEMY_NEEDS[e.kind]).slice(0, 1).map((e) => ({ kind: e.kind, from: 6 }));
      return { level: { ...level, enemies: enemies.map((e) => ({ ...e, count: limit((e.count ?? 1) * 2, MAX_ENEMY_COUNT), from: Math.round((e.from ?? 6) / 2) })) }, growthScale: 1 };
    }
    case 'longTail':
      return { level: { ...level, length: level.length * 2 }, growthScale: 1 };
    case 'giants': {
      const giants = info.prey.filter((p) => isGiant(plan.snake, p.kind));
      return { level: { ...level, prey: giants.map((p, i) => ({ kind: p.kind, count: i === 0 ? 3 : 2 })) }, growthScale: 1 };
    }
    case 'swarm': {
      const smallest = [...level.prey].sort((a, b) => preySpec(a.kind).size - preySpec(b.kind).size)[0]!;
      return { level: { ...level, prey: level.prey.map((p) => (p === smallest ? { ...p, count: limit(p.count * 4, MAX_PREY_COUNT) } : p)) }, growthScale: 1.2 };
    }
    case 'stampede':
      return { level: { ...level, enemies: [...(level.enemies ?? []), { kind: info.lane!, count: 2, from: round(between(rng, 3, 5)) }] }, growthScale: 1 };
    default:
      return { level, growthScale: 1 };
  }
}

const PLACE_WORDS: Readonly<Record<string, readonly string[]>> = {
  farm: ['Farmyard', 'Barnyard', 'Cornfield', 'Paddock', 'Hayloft'],
  barrens: ['Pinewoods', 'Pine Barrens', 'Sandy Pines', 'Blueberry Bog'],
  dunes: ['Dunes', 'Sand Sea', 'Creosote Flats', 'Desert'],
  savanna: ['Savanna', 'Acacia Plain', 'Tall Grass', 'Weaver Trees'],
  rainforest: ['Canopy', 'Treetops', 'Fig Crowns', 'High Branches'],
  reef: ['Reef', 'Lagoon', 'Coral Garden', 'Sand Cays'],
  mountains: ['Crags', 'Mountainside', 'High Pass', 'Scree'],
  heath: ['Heath', 'Heather Moor', 'Gorse Hill', 'Stone Walls'],
  jungle: ['Jungle', 'Bamboo Grove', 'Old Ruins', 'Forest Floor'],
  flooded: ['Black Water', 'Flooded Forest', 'Drowned Trees', 'Islands'],
};

const RULE_WORDS: Readonly<Record<string, readonly string[]>> = {
  plenty: ['Plenty in the', 'Harvest in the'], lure: ['Sweet Tooth in the', 'Treats in the'], looseKnots: ['Loose Knots in the', 'Tangles in the'],
  goldRush: ['Gold Rush in the', 'Golden'], night: ['Night in the', 'Moonlit'], oneLife: ['One Bite in the', 'Careful in the'],
  hunters: ['Hunters in the', 'Hunting Season,'], longTail: ['Long Tail in the', 'Long Way Round,'], ice: ['Ice in the', 'Frozen'],
  blizzard: ['Blizzard in the', 'Windswept'], fog: ['Fog in the', 'Misty'], hotDay: ['Heat in the', 'Scorching'],
  giants: ['Giants in the', 'Big Meals,'], swarm: ['Swarm in the', 'Busy'], stampede: ['Stampede in the', 'Thunder in the'],
  rival: ['Rival in the', 'Two Snakes,'],
};

function nameOf(plan: DayPlan, level: LevelDef, rng: Rng): string {
  if (plan.event) return EVENTS[plan.event].name;
  if (plan.goal === 'golden') {
    const kind = goldenKind(level);
    return `The Golden ${kind.split('-').map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ')}`.slice(0, 40);
  }
  const where = pickOne(rng, PLACE_WORDS[plan.place] ?? ['Wilds']);
  const lead = pickOne(rng, RULE_WORDS[plan.rule] ?? ['A Day in the']);
  const name = `${lead} ${where}`;
  return name.length <= 40 ? name : where;
}

/** The hints a newcomer needs: the snake's own ability (its home chapter's first hints), and the goal's. */
function teachOf(plan: DayPlan, book: Readonly<Record<string, PlaceInfo>>, dark: boolean): string[] {
  const home = Object.values(book).find((i) => i.home === relativeOf(plan.snake)) ?? book[plan.place]!;
  const goal = plan.goal === 'feast' ? ['feast'] : plan.goal === 'rush' ? ['rush'] : plan.goal === 'boss' ? ['boss'] : [];
  return [...new Set([...home.hints, ...goal, ...(dark ? ['dark'] : [])])];
}

/** Christmas days wrap some of the solids as presents (painted in any place). */
const PRESENT_EVENTS: ReadonlySet<string> = new Set(['christmasEve', 'christmas', 'boxingDay']);

function presents(solids: readonly SolidDef[], rng: Rng): SolidDef[] {
  return solids.map((s, i) => {
    if (i % 2 === 1 && rng() < 0.8) return s;
    if (s.kind === 'circle') return { ...s, look: 'present', r: Math.max(14, Math.min(28, s.r)) };
    const w = Math.min(s.w, 70);
    const h = Math.min(s.h, 50);
    return { kind: 'rect', look: 'present', x: round(s.x + (s.w - w) / 2), y: round(s.y + (s.h - h) / 2), w: Math.max(w, 30), h: Math.max(h, 30) };
  });
}

/** One candidate: deterministic in the plan, the layout and the rng. */
export function compose(plan: DayPlan, info: PlaceInfo, book: Readonly<Record<string, PlaceInfo>>, layout: Layout, rng: Rng): Candidate {
  let prey = castPrey(plan, info, layout, rng);
  const enemies = castEnemies(plan, info, layout, rng);
  const base = layout.base;
  let goal: GoalDef | undefined;
  const treats = plan.treats ? { kind: plan.treats, count: 3 + Math.floor(rng() * 2) } : undefined;
  if (plan.goal === 'feast' && treats) goal = { kind: 'feast', food: treats.kind, count: 6 + Math.floor(rng() * 3) };
  else if (plan.goal === 'feast') {
    const f = feastFood(prey, info, rng);
    prey = f.prey;
    goal = { kind: 'feast', food: f.food, count: 4 + Math.floor(rng() * 3) };
  } else if (plan.goal === 'rush') goal = { kind: 'rush', seconds: RUSH_PLACEHOLDER };
  else if (plan.goal === 'golden') goal = { kind: 'golden', count: 3 };
  else if (plan.goal === 'boss') goal = { kind: 'boss' };
  // The golden prey hides in cover: at least three clumps.
  const cover = plan.goal === 'golden' && layout.cover.length < 3
    ? [...layout.cover, ...freeCover(info.coverKit, layout.solids, [layout.start], 3 - layout.cover.length, rng, layout.cover)]
    : layout.cover;
  const growth = Math.max(MIN_GROWTH, round((base.target - base.length) * GROWTH_BY_WEEKDAY[plan.weekday]! * between(rng, 0.92, 1.08)));
  const draft: LevelDef = {
    id: dailyId(plan.date), name: 'Today', snake: plan.snake, start: layout.start, heading: Number(layout.heading.toFixed(3)),
    length: base.length, target: base.length + growth, par: 60,
    prey,
    ...(enemies.length ? { enemies } : {}),
    solids: plan.event && PRESENT_EVENTS.has(plan.event) ? presents(layout.solids, rng) : layout.solids,
    cover,
    ...(layout.zones ? { zones: layout.zones } : {}),
    ...(layout.spots?.length ? { spots: layout.spots } : {}),
    ...(layout.nests?.length ? { nests: layout.nests } : {}),
    ...(goal ? { goal } : {}),
    ...(plan.goal === 'boss' && info.bossBoard.boss ? { boss: info.bossBoard.boss } : {}),
    place: plan.place, season: plan.season, rule: plan.rule,
    ...(plan.event ? { event: plan.event } : {}),
    ...(treats ? { treats } : {}),
  };
  const ruled = applyRule(draft, plan, info, rng);
  const level = ruled.level;
  const target = level.length + round(growth * ruled.growthScale);
  const named = { ...level, target, name: nameOf(plan, level, rng), teach: teachOf(plan, book, level.dark === true) };
  return { level: named, growth, growthScale: ruled.growthScale };
}
