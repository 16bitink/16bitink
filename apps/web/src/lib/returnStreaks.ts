/**
 * Return streaks for the admin stats: how many days in a row players come back.
 * Admin-only by design: players never see a streak (they get days played, which only go up).
 * Days are calendar dates, YYYY-MM-DD.
 */

/** One player's days with a play of one game. */
export interface PlayerDays {
  readonly player: string;
  readonly game: string;
  readonly days: readonly string[];
}

/** The row that joins every game: a player's days with a play of any of them. */
export const ALL_GAMES = '*';

/** Players sorted by their longest run: `min` days up to the next bucket. */
export const RUN_BUCKETS: readonly { readonly min: number; readonly label: string }[] = [
  { min: 1, label: '1 day' },
  { min: 2, label: '2 days' },
  { min: 3, label: '3–6 days' },
  { min: 7, label: '7–13 days' },
  { min: 14, label: '14+ days' },
];

export interface StreakRow {
  /** A game's slug, or ALL_GAMES. */
  readonly game: string;
  readonly players: number;
  /** Players with a play on two or more days. */
  readonly cameBack: number;
  /** The longest run of back-to-back days any player has. */
  readonly longest: number;
  /** Players per RUN_BUCKETS entry, by their longest run. */
  readonly buckets: readonly number[];
  /** Players on a run of 2+ days that reaches today or yesterday (today isn't over). */
  readonly going: number;
}

const DAY_MS = 86_400_000;
const dayNumber = (date: string): number => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const dayNumbers = (days: readonly string[]): number[] => [...new Set(days.map(dayNumber))].sort((a, b) => a - b);

/** The longest stretch of back-to-back days. */
export function longestRun(days: readonly string[]): number {
  let best = 0;
  let run = 0;
  let prev = Number.NaN;
  for (const n of dayNumbers(days)) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  return best;
}

/** The run that reaches `today` or yesterday, else 0. */
export function currentRun(days: readonly string[], today: string): number {
  const nums = dayNumbers(days);
  const last = nums.at(-1);
  if (last === undefined || dayNumber(today) - last > 1) return 0;
  let run = 1;
  for (let i = nums.length - 1; i > 0 && nums[i - 1] === nums[i]! - 1; i--) run++;
  return run;
}

const bucketOf = (run: number): number => RUN_BUCKETS.findLastIndex((b) => run >= b.min);

function rowFor(game: string, players: readonly (readonly string[])[], today: string): StreakRow {
  const buckets = RUN_BUCKETS.map(() => 0);
  let longest = 0;
  let cameBack = 0;
  let going = 0;
  for (const days of players) {
    const run = longestRun(days);
    longest = Math.max(longest, run);
    if (new Set(days).size > 1) cameBack++;
    if (currentRun(days, today) > 1) going++;
    const i = bucketOf(run);
    if (i >= 0) buckets[i] = buckets[i]! + 1;
  }
  return { game, players: players.length, cameBack, longest, buckets, going };
}

/** Days per player, joined across `rows`. */
function byPlayer(rows: readonly PlayerDays[]): (readonly string[])[] {
  const days = new Map<string, string[]>();
  for (const r of rows) days.set(r.player, [...(days.get(r.player) ?? []), ...r.days]);
  return [...days.values()];
}

/** A row for all games together, then one per game, most players first. */
export function streakRows(rows: readonly PlayerDays[], today: string): readonly StreakRow[] {
  if (rows.length === 0) return [];
  const games = [...new Set(rows.map((r) => r.game))];
  const perGame = games
    .map((game) => rowFor(game, byPlayer(rows.filter((r) => r.game === game)), today))
    .sort((a, b) => b.players - a.players || a.game.localeCompare(b.game));
  return [rowFor(ALL_GAMES, byPlayer(rows), today), ...perGame];
}
