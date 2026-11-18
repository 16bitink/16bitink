import type { EventId, KeyValueStore } from '@16bitink/game-sdk';
import { EVENT_IDS } from '@16bitink/game-sdk';
import { SNAKES, type SnakeId } from '../logic/species';

/**
 * The snake album: one card per snake hunted with in a daily, with the date
 * first played (and the event, for event snakes). It only grows: merging two
 * copies keeps every snake and the earlier date. Kept in the synced progress save (older versions kept it in the browser only).
 */
export interface AlbumCard {
  readonly date: string;
  readonly event?: EventId;
}

export type Album = Readonly<Partial<Record<SnakeId, AlbumCard>>>;

const LEGACY_KEY = 'inksnake.album.v1';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Untrusted saved data to an album: anything malformed is dropped. */
export function parseAlbum(raw: unknown): Album {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Partial<Record<SnakeId, AlbumCard>> = {};
  for (const id of SNAKES) {
    const c = (raw as Record<string, unknown>)[id];
    if (typeof c !== 'object' || c === null) continue;
    const { date, event } = c as Record<string, unknown>;
    if (typeof date !== 'string' || !DATE.test(date)) continue;
    const ev = typeof event === 'string' && (EVENT_IDS as readonly string[]).includes(event) ? (event as EventId) : undefined;
    out[id] = { date, ...(ev ? { event: ev } : {}) };
  }
  return out;
}

/** The album with `snake` added on `date` (kept as it is if the snake was met before). */
export function addToAlbum(album: Album, snake: SnakeId, date: string, event?: EventId): Album {
  const had = album[snake];
  if (had && had.date <= date) return album;
  return { ...album, [snake]: { date, ...(event ? { event } : had?.event ? { event: had.event } : {}) } };
}

/** Two albums combined: every snake from either, the earlier first-played date winning. */
export function mergeAlbum(a: Album, b: Album): Album {
  return SNAKES.reduce<Album>((acc, id) => {
    const x = a[id];
    const y = b[id];
    const win = x && y ? (y.date < x.date ? y : x) : (x ?? y);
    if (!win) return acc;
    const event = win.event ?? (x && y ? (win === x ? y.event : x.event) : undefined);
    return { ...acc, [id]: { date: win.date, ...(event ? { event } : {}) } };
  }, {});
}

/** Whether `a` already holds everything in `b` (so saving `b` over `a` adds nothing). */
export function coversAlbum(a: Album, b: Album): boolean {
  return SNAKES.every((id) => !b[id] || (a[id] !== undefined && a[id]!.date <= b[id]!.date && (a[id]!.event !== undefined || b[id]!.event === undefined)));
}

/** The album an older version kept in this browser only (migrated into the account save, never written again). */
export function loadLegacyAlbum(store: KeyValueStore | undefined): Album {
  try {
    const raw = store?.getItem(LEGACY_KEY);
    return raw ? parseAlbum(JSON.parse(raw)) : {};
  } catch (err) {
    console.warn('[inksnake] could not read the old snake album', err);
    return {};
  }
}
