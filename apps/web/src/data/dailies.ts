/**
 * The games that have a daily level, in the order the Daily page shows them.
 * Safe for the browser; the levels themselves live in games/daily.server.ts.
 * Keep the two in step (a test does).
 */
export interface DailyGame {
  readonly slug: string;
  /** One line for the home page and the Daily page's card. */
  readonly blurb: string;
  /** The first local date (YYYY-MM-DD) with a daily level: earlier days show no card for it. */
  readonly opens: string;
}

export const DAILY_GAMES: readonly DailyGame[] = [
  { slug: 'inkbrick', blurb: 'Break into today’s shell. Same level for everyone today.', opens: '2026-11-22' },
  { slug: 'inksnake', blurb: 'Today’s hunt: a new place, snake and rule every day.', opens: '2026-11-19' },
];

export const dailyGame = (slug: string): DailyGame | undefined => DAILY_GAMES.find((g) => g.slug === slug);
