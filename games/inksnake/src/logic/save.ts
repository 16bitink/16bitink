import type { KeyValueStore } from '@16bitink/game-sdk';
import { coversAlbum, loadLegacyAlbum, mergeAlbum, parseAlbum, type Album } from '../daily/album';
import { coversStamps, mergeStamps, parseStamps, type Stamps } from '../daily/milestones';

/** Best result in one level. */
export interface LevelRecord {
  /** Ink blots earned, 1..3. */
  readonly blots: number;
  /** Fastest finish, seconds. */
  readonly bestTime: number;
}

/** Saved progress, keyed by level id (ids are permanent). */
export interface Progress {
  readonly levels: Readonly<Record<string, LevelRecord>>;
  /** The snake album of the daily hunts (only grows). Absent: none yet. */
  readonly album?: Album;
  /** Day milestones reached: days played → the date it was reached. Absent: none yet. */
  readonly stamps?: Stamps;
}

/** Progress with the daily parts attached only when they hold something. */
const withDaily = (levels: Progress['levels'], album: Album, stamps: Stamps): Progress => ({
  levels,
  ...(Object.keys(album).length ? { album } : {}),
  ...(Object.keys(stamps).length ? { stamps } : {}),
});

export const EMPTY_PROGRESS: Progress = { levels: {} };
const KEY = 'inksnake.progress.v1';
export const MAX_BLOTS = 3;
/** Most levels an untrusted save can hold. */
const MAX_LEVELS = 500;

/**
 * Ink blots for a finished level: one for clearing it, one for beating
 * the par time, one for losing no lives (as InkCrab).
 */
export function blotsFor(time: number, parTime: number, livesLost: number): number {
  return 1 + (time <= parTime ? 1 : 0) + (livesLost === 0 ? 1 : 0);
}

const isRecord = (v: unknown): v is LevelRecord => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return Number.isInteger(r.blots) && (r.blots as number) >= 1 && (r.blots as number) <= MAX_BLOTS
    && typeof r.bestTime === 'number' && Number.isFinite(r.bestTime) && r.bestTime >= 0;
};

/** Untrusted saved data to progress: anything malformed is dropped, never thrown. */
export function parseProgress(raw: unknown): Progress {
  if (typeof raw !== 'object' || raw === null) return EMPTY_PROGRESS;
  const { levels, album, stamps } = raw as { levels?: unknown; album?: unknown; stamps?: unknown };
  const daily = [parseAlbum(album), parseStamps(stamps)] as const;
  if (typeof levels !== 'object' || levels === null) return withDaily({}, ...daily);
  const kept = Object.entries(levels as Record<string, unknown>).filter(([id, r]) => /^[a-z0-9-]{1,64}$/.test(id) && !(id in Object.prototype) && isRecord(r)).slice(0, MAX_LEVELS);
  return withDaily(Object.fromEntries(kept) as Record<string, LevelRecord>, ...daily);
}

/** Keeps the better of the old and new results for a level. */
export function recordResult(p: Progress, id: string, blots: number, time: number): Progress {
  const old = p.levels[id];
  const next: LevelRecord = old
    ? { blots: Math.max(old.blots, blots), bestTime: Math.min(old.bestTime, time) }
    : { blots, bestTime: time };
  return { ...p, levels: { ...p.levels, [id]: next } };
}

/**
 * Two copies of progress combined (this device and another): every level
 * either finished, with the most blots and the fastest time, and everything
 * either met. Progress only grows, so merging never loses any.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const levels = Object.entries(b.levels).reduce((acc, [id, r]) => {
    const prev = acc[id];
    return { ...acc, [id]: prev ? { blots: Math.max(prev.blots, r.blots), bestTime: Math.min(prev.bestTime, r.bestTime) } : r };
  }, a.levels);
  return withDaily(levels, mergeAlbum(a.album ?? {}, b.album ?? {}), mergeStamps(a.stamps ?? {}, b.stamps ?? {}));
}

/** Whether `a` already holds everything in `b` (so saving `b` over `a` would add nothing). */
export function coversProgress(a: Progress, b: Progress): boolean {
  return coversAlbum(a.album ?? {}, b.album ?? {}) && coversStamps(a.stamps ?? {}, b.stamps ?? {}) && Object.entries(b.levels).every(([id, r]) => {
    const mine = a.levels[id];
    return mine !== undefined && mine.blots >= r.blots && mine.bestTime <= r.bestTime;
  });
}

/** The first level is always open; each next one opens once the one before it is finished. */
export function isUnlocked(p: Progress, order: readonly string[], id: string): boolean {
  const i = order.indexOf(id);
  if (i < 0) return false;
  return i === 0 || p.levels[order[i - 1]!] !== undefined;
}

/** Where the game opens: a new player goes straight into the first level (no level id: the Game scene's first), everyone else to the map. */
export type FirstScreen = { readonly scene: 'Game'; readonly data: { readonly levelId?: string } } | { readonly scene: 'Menu' };

/**
 * A player who hasn't finished a level yet has nothing to choose on the map
 * but the first one, and first-time players who met the map instead often
 * left there, so they start in the level.
 */
export function firstScreen(p: Progress): FirstScreen {
  return Object.keys(p.levels).length === 0 ? { scene: 'Game', data: {} } : { scene: 'Menu' };
}

export function loadProgress(store: KeyValueStore | undefined): Progress {
  try {
    const raw = store?.getItem(KEY);
    const p = raw ? parseProgress(JSON.parse(raw)) : EMPTY_PROGRESS;
    // An album from before it was synced is folded in here, then travels with the save.
    const old = loadLegacyAlbum(store);
    return Object.keys(old).length ? mergeProgress(p, withDaily({}, old, {})) : p;
  } catch (err) {
    console.warn('[inksnake] could not read saved progress', err);
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(store: KeyValueStore | undefined, p: Progress): void {
  try {
    store?.setItem(KEY, JSON.stringify(p));
  } catch (err) {
    console.warn('[inksnake] could not save progress', err);
  }
}

/** A chapter's totals: blots earned of those possible, and the sum of best times of its finished levels. */
export interface ChapterTally {
  readonly blots: number;
  readonly maxBlots: number;
  readonly finished: number;
  readonly time: number;
}

export function chapterTally(p: Progress, ids: readonly string[]): ChapterTally {
  const records = ids.map((id) => p.levels[id]).filter((r): r is LevelRecord => r !== undefined);
  return {
    blots: records.reduce((n, r) => n + r.blots, 0),
    maxBlots: ids.length * MAX_BLOTS,
    finished: records.length,
    time: records.reduce((n, r) => n + r.bestTime, 0),
  };
}
