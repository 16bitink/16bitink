/**
 * What the generator knows about each place, read off its chapter's boards
 * (docs/inksnake-daily.md "The dials"): its home snake, its boards (levels
 * 1–9) and boss board (level 10), the solid and cover looks it paints, the
 * prey and enemies it casts, its lane enemy (for Stampede), and which
 * snakes may visit it as guests. The chapters are passed in (dev/gen.ts):
 * src/ never imports the paid chapters (test/paywall.test.ts).
 */
import type { Season } from '@16bitink/game-sdk';
import { CHAPTER_HINTS } from '../logic/chapters/index';
import { preySpec, type PreyKind } from '../logic/prey';
import { coilMaxOf, gapeOf, HOME_SNAKES, relativeOf, SNAKE_SPECS, venomMaxOf, type HomeSnakeId, type SnakeId } from '../logic/species';
import { PLACES, type CoverDef, type EnemyDef, type LevelDef, type Place, type PreyDef, type SolidDef, type ZoneKind } from '../level/types';

export interface PlaceInfo {
  readonly place: Place;
  readonly home: HomeSnakeId;
  /** Campaign levels 1–9: the remix bases and the zone sources of patterns. */
  readonly boards: readonly LevelDef[];
  /** Level 10: the boss's board. */
  readonly bossBoard: LevelDef;
  /** One of each solid the place paints (look and size), for patterns. */
  readonly solidKit: readonly SolidDef[];
  readonly coverKit: readonly CoverDef[];
  /** Every prey kind of the place's boards, at the most it ever had. */
  readonly prey: readonly PreyDef[];
  /** Every enemy kind of the place's boards (not the lane enemy), with a typical count and arrival. */
  readonly enemies: readonly EnemyDef[];
  /** Its lane enemy (herds, rockfall, fire), if any: Stampede's. */
  readonly lane?: string;
  /** The ability hints of its first board (the home snake's). */
  readonly hints: readonly string[];
}

export type PlaceBook = Readonly<Record<Place, PlaceInfo>>;

/** Lane enemies: a charge across the board every few seconds. */
const LANES: ReadonlySet<string> = new Set(['wildfire', 'dust-devil', 'wildebeest', 'rockfall']);
/** Enemies that only work with a part of the board (the hen's nests, the weavers', the caiman's wet holes). */
export const ENEMY_NEEDS: Readonly<Record<string, 'nests' | 'spots'>> = { hen: 'nests', weaver: 'nests', 'black-caiman': 'spots' };
/** Solids too big or too special to scatter about (the corn crib, the coop). */
const UNIQUE_LOOKS: ReadonlySet<string> = new Set(['crib', 'coop']);

/** The golden chase works where there's cover and land prey (docs/inksnake-daily.md "Engine notes"). */
export const GOLDEN_PLACES: readonly Place[] = ['farm', 'barrens', 'dunes', 'mountains', 'heath'];
/** Blizzard only where the bot keeps its pace (heath and dunes blizzards run 80–120 s). */
export const BLIZZARD_PLACES: readonly Place[] = ['farm', 'barrens', 'mountains'];

/** Season pools (northern hemisphere, meteorological). */
export const SEASON_PLACES: Readonly<Record<Season, readonly Place[]>> = {
  winter: ['farm', 'barrens', 'mountains', 'heath'],
  spring: ['farm', 'heath', 'barrens', 'savanna', 'rainforest', 'flooded'],
  summer: ['dunes', 'reef', 'savanna', 'jungle', 'rainforest', 'flooded', 'mountains'],
  autumn: ['farm', 'barrens', 'heath', 'mountains', 'jungle', 'dunes'],
};

/** Snakes from cold places only, in winter: corn, hognose and the horned viper (the adder needs its sun patches). */
const WINTER_GUESTS: readonly HomeSnakeId[] = ['corn', 'hognose', 'spidertail'];

/** What a snake needs on the board to be itself: the krait's water, the sidewinder's sand, the flying snake's trees, the adder's sun, the egg-eater's nests. */
export const SNAKE_NEEDS: Readonly<Partial<Record<HomeSnakeId, ZoneKind | 'nests'>>> = {
  krait: 'water', anaconda: 'water', sidewinder: 'sand', flying: 'tree', adder: 'sun', eggeater: 'nests',
};

/** Snakes that can't live on dry land boards (no water to swim in). */
const WATER_SNAKES: ReadonlySet<HomeSnakeId> = new Set(['krait', 'anaconda']);
/** Places that are mostly water or treetops: land snakes don't visit. */
const NO_LAND_GUESTS: ReadonlySet<Place> = new Set(['reef', 'flooded', 'rainforest']);

/** Whether `snake` can eat `kind` at its start width: whole, coiled or bitten to sleep, and on its diet. */
export function canEat(snake: SnakeId, kind: PreyKind): boolean {
  const spec = SNAKE_SPECS[snake];
  const size = preySpec(kind).size;
  if (spec.diet && !spec.diet.includes(kind)) return false;
  if (size <= gapeOf(spec.width, spec)) return true;
  if (spec.big === 'coil') return size <= coilMaxOf(spec.width);
  if (spec.big === 'venom') return size <= venomMaxOf(spec.width);
  return false;
}

/** A meal too big to swallow on the spot, that the snake can still take (by coil or venom): Giants' prey. */
export function isGiant(snake: SnakeId, kind: PreyKind): boolean {
  const spec = SNAKE_SPECS[snake];
  return canEat(snake, kind) && preySpec(kind).size > gapeOf(spec.width, spec);
}

function boardHas(level: LevelDef, need: ZoneKind | 'nests'): boolean {
  return need === 'nests' ? (level.nests?.length ?? 0) > 0 : (level.zones ?? []).some((z) => z.kind === need);
}

/** The boards of a place a snake can be itself on (all of them for snakes that need nothing). */
export function boardsFor(info: PlaceInfo, snake: SnakeId, boss = false): readonly LevelDef[] {
  // Guests need their ground; an event snake goes where its event is (the golden tree snake glides only where there are trees).
  const home = relativeOf(snake);
  const event = home !== snake;
  const need = home === info.home || event ? undefined : SNAKE_NEEDS[home];
  const list = boss ? [info.bossBoard] : info.boards;
  return need ? list.filter((b) => boardHas(b, need)) : list;
}

/** The guests that may visit `info` in `season`: they suit the place (water, sand, nests) and eat enough of its prey. */
export function guestsFor(info: PlaceInfo, season: Season): readonly HomeSnakeId[] {
  const pool = season === 'winter' ? WINTER_GUESTS : HOME_SNAKES;
  return pool.filter((s) => {
    if (s === info.home || s === 'flying' || s === 'adder') return false;
    if (s === 'eggeater' && (season === 'winter' || info.place !== 'farm')) return false;
    if (NO_LAND_GUESTS.has(info.place) && !WATER_SNAKES.has(s)) return false;
    if (boardsFor(info, s).length === 0) return false;
    const edible = info.prey.filter((p) => canEat(s, p.kind));
    return edible.length >= 2 || (edible.length === 1 && edible[0]!.count >= 4);
  });
}

/** Distinct by look and size. */
function distinct<T extends { readonly look: string }>(items: readonly T[], key: (t: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const t of items) if (!seen.has(key(t))) seen.set(key(t), t);
  return [...seen.values()];
}

function placeInfo(place: Place, home: HomeSnakeId, chapter: readonly LevelDef[]): PlaceInfo {
  const boards = chapter.slice(0, 9);
  const bossBoard = chapter[9] ?? chapter[chapter.length - 1]!;
  const solids = chapter.flatMap((l) => l.solids ?? []).filter((s) => !UNIQUE_LOOKS.has(s.look));
  const solidKit = distinct(solids, (s) => (s.kind === 'circle' ? `${s.look}:${s.r}` : `${s.look}:${s.w}x${s.h}`));
  const coverKit = distinct(chapter.flatMap((l) => l.cover ?? []), (c) => `${c.look}:${Math.round(c.r / 8)}`);
  const prey = new Map<PreyKind, number>();
  for (const l of boards) for (const p of l.prey) prey.set(p.kind, Math.max(prey.get(p.kind) ?? 0, p.count));
  const enemies = new Map<string, EnemyDef>();
  let lane: string | undefined;
  for (const l of boards) {
    for (const e of l.enemies ?? []) {
      if (LANES.has(e.kind)) lane = e.kind;
      else if (!enemies.has(e.kind)) enemies.set(e.kind, e);
    }
  }
  const hints = (chapter[0]?.teach ?? []).filter((t) => Object.prototype.hasOwnProperty.call(CHAPTER_HINTS, t));
  return {
    place, home, boards, bossBoard, solidKit, coverKit,
    prey: [...prey].map(([kind, count]) => ({ kind, count })),
    enemies: [...enemies.values()],
    ...(lane ? { lane } : {}),
    hints,
  };
}

/** The place book from the ten chapters, in PLACES order (chapter 1 is the farm). */
export function buildPlaces(chapters: readonly (readonly LevelDef[])[]): PlaceBook {
  if (chapters.length < PLACES.length) throw new Error(`need ${PLACES.length} chapters, got ${chapters.length}`);
  return Object.fromEntries(PLACES.map((p, i) => [p, placeInfo(p, HOME_SNAKES[i]!, chapters[i]!)])) as Record<Place, PlaceInfo>;
}
