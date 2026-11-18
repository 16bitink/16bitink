import type { KeyValueStore } from '@16bitink/game-sdk';
import { isBetterPlay, mergeDays, type GameDay } from '../daily';
import { isDailyDate } from '../dailyDates';

/** This browser's played days, kept so the calendar works signed out and plays survive going offline. */
export const DAILY_KEY = '16bitink:daily:v1';

/** A played day as kept in the browser; `synced` once the server has it. */
export interface LocalDay extends GameDay {
  readonly breakIn?: number;
  readonly shells: number;
  readonly synced: boolean;
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function parseDay(v: unknown): LocalDay | null {
  if (typeof v !== 'object' || v === null) return null;
  const d = v as Record<string, unknown>;
  if (typeof d.game !== 'string' || !/^[a-z0-9-]{1,40}$/.test(d.game) || !isDailyDate(d.date)) return null;
  if ((d.result !== 'win' && d.result !== 'lose') || !num(d.seconds) || typeof d.late !== 'boolean') return null;
  return {
    game: d.game,
    date: d.date,
    result: d.result,
    late: d.late,
    seconds: d.seconds,
    ...(num(d.breakIn) ? { breakIn: d.breakIn } : {}),
    shells: num(d.shells) ? d.shells : 0,
    synced: d.synced === true,
  };
}

/** Every day saved in the browser; anything unreadable is left out. */
export function readLocalDays(store: KeyValueStore | undefined): readonly LocalDay[] {
  try {
    const raw = store?.getItem(DAILY_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.flatMap((v) => parseDay(v) ?? []) : [];
  } catch {
    return [];
  }
}

function writeLocalDays(store: KeyValueStore | undefined, days: readonly LocalDay[]): void {
  try {
    store?.setItem(DAILY_KEY, JSON.stringify(days));
  } catch {
    // Storage full or blocked: the play still goes to the server.
  }
}

/** The better of two plays of one day; unsynced unless the server already has exactly this. */
function keepBest(kept: LocalDay, play: LocalDay): LocalDay {
  const better = isBetterPlay(play, kept);
  const late = kept.late && play.late;
  return { ...(better ? play : kept), late, synced: !better && kept.synced && late === kept.late };
}

/** Keeps `play` for its game and date unless a better play is already kept. Returns the day list now stored. */
export function saveLocalDay(store: KeyValueStore | undefined, play: LocalDay): readonly LocalDay[] {
  const days = readLocalDays(store);
  const kept = days.find((d) => d.game === play.game && d.date === play.date);
  const rest = days.filter((d) => d !== kept);
  const next = kept ? keepBest(kept, play) : play;
  const all = [...rest, next].sort((a, b) => a.date.localeCompare(b.date) || a.game.localeCompare(b.game));
  writeLocalDays(store, all);
  return all;
}

/** Marks a day as known to the server. */
export function markSynced(store: KeyValueStore | undefined, game: string, date: string): void {
  writeLocalDays(store, readLocalDays(store).map((d) => (d.game === game && d.date === date ? { ...d, synced: true } : d)));
}

/** The browser's days and the server's, merged (the better play of a date wins), oldest first. */
export const combineDays = (local: readonly GameDay[], server: readonly GameDay[]): readonly GameDay[] => mergeDays(local, server);
