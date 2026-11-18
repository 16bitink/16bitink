import type { DailyDay, DailyHost, DailyPlay, DailyStanding, KeyValueStore } from '@16bitink/game-sdk';
import { challengeUrl, parseChallenge, totalDaysPlayed, type GameDay } from '../daily';
import { localDate } from '../dailyDates';
import { currentVisitorId } from './analytics';
import { combineDays, markSynced, readLocalDays, saveLocalDay, type LocalDay } from './dailyStore';

interface Envelope<T> {
  readonly success?: boolean;
  readonly data?: T;
  readonly error?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body?.success || body.data === undefined) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body.data;
}

const postPlay = (game: string, day: LocalDay): Promise<DailyStanding> =>
  request<DailyStanding>(`/api/daily/${encodeURIComponent(game)}/play`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      date: day.date,
      result: day.result,
      seconds: day.seconds,
      breakIn: day.breakIn,
      shells: day.shells,
      late: day.late,
      visitor: currentVisitorId(),
    }),
  });

/**
 * This player's days across every game: the server's (the account's when signed in, plus this
 * browser's visitor id) merged with the ones kept in this browser. Falls back to the browser's alone offline.
 */
export async function loadAllDays(store: KeyValueStore | undefined): Promise<readonly GameDay[]> {
  const local = readLocalDays(store);
  try {
    await uploadUnsynced(store, local);
    const server = await request<{ days: GameDay[] }>(`/api/daily/history?visitor=${encodeURIComponent(currentVisitorId())}`);
    return combineDays(readLocalDays(store), server.days);
  } catch (err) {
    console.warn('[16bit.ink] could not load the daily history', err);
    return local;
  }
}

/** Sends plays the server hasn't got (made offline, or before signing in, which moves them to the account). */
async function uploadUnsynced(store: KeyValueStore | undefined, local: readonly LocalDay[]): Promise<void> {
  for (const day of local.filter((d) => !d.synced)) {
    try {
      await postPlay(day.game, day);
      markSynced(store, day.game, day.date);
    } catch {
      return; // Offline or refused: the next visit tries again.
    }
  }
}

/** The daily as a game's host sees it (see DailyHost in game-sdk). */
export function createDailyHost(game: string, store: KeyValueStore | undefined, location: Pick<Location, 'origin' | 'search'>): DailyHost {
  const today = (): string => localDate(new Date());
  let cached: Promise<readonly GameDay[]> | null = null;
  const days = (): Promise<readonly GameDay[]> => (cached ??= loadAllDays(store));
  return {
    today,
    load: (date) => request<unknown>(`/api/daily/${encodeURIComponent(game)}?date=${encodeURIComponent(date)}`),
    async record(play: DailyPlay): Promise<DailyStanding | null> {
      const day: LocalDay = {
        game,
        date: play.date,
        result: play.result,
        late: play.date !== today(),
        seconds: play.seconds,
        ...(play.breakIn === undefined ? {} : { breakIn: play.breakIn }),
        shells: play.shells,
        synced: false,
      };
      saveLocalDay(store, day);
      cached = null;
      try {
        const kept = readLocalDays(store).find((d) => d.game === game && d.date === play.date) ?? day;
        const standing = await postPlay(game, kept);
        markSynced(store, game, play.date);
        return standing;
      } catch (err) {
        console.warn('[16bit.ink] could not save the daily play to the server', err);
        return null;
      }
    },
    async history(): Promise<readonly DailyDay[]> {
      return (await days()).filter((d) => d.game === game).map(({ date, result, late, seconds }) => ({ date, result, late, seconds }));
    },
    async totalDays(): Promise<number> {
      return totalDaysPlayed(await days());
    },
    challengeLink: (date, seconds) => challengeUrl(location.origin, game, date, seconds),
    challenge: parseChallenge(location.search),
  };
}
