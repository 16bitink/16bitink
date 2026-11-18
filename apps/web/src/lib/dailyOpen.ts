import type { DailyGame } from '../data/dailies';
import { todayWindow } from './dailyDates';

/**
 * Which dailies a page may show. A daily opens at each player's own midnight, so the server
 * keeps every daily open somewhere on Earth and the browser drops the ones not open locally yet.
 */

/** Whether `daily` has a level on the local date `today` (YYYY-MM-DD). */
export const isDailyOpen = (daily: DailyGame, today: string): boolean => today >= daily.opens;

/** The dailies whose game is out and whose first day has begun in some time zone. */
export function dailiesOpenSomewhere(dailies: readonly DailyGame[], now: Date, gameIsOut: (slug: string) => boolean): readonly DailyGame[] {
  const { max } = todayWindow(now.getTime());
  return dailies.filter((d) => gameIsOut(d.slug) && isDailyOpen(d, max));
}

/**
 * The one daily to offer: `current` while it is still open and unplayed (no swap under the
 * player's eyes), else a random open one not played today, else none.
 */
export function pickDaily(open: readonly string[], current: string | undefined, playedToday: ReadonlySet<string>, random: () => number): string | undefined {
  const fresh = open.filter((slug) => !playedToday.has(slug));
  if (current && fresh.includes(current)) return current;
  if (fresh.length === 0) return undefined;
  return fresh[Math.min(fresh.length - 1, Math.floor(random() * fresh.length))];
}
