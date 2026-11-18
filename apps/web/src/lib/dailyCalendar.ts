import type { GameDay } from './daily';

/** One square of the month grid. */
export interface CalendarCell {
  /** YYYY-MM-DD, or null for the blank squares before the 1st and after the last day. */
  readonly date: string | null;
  readonly day: number | null;
  /** The games played that day, in catalog order given by `order`. */
  readonly games: readonly { readonly game: string; readonly late: boolean }[];
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Month names, for the grid's heading. */
export const MONTHS: readonly string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The first and last dates of a month are `monthKey(y, m)-01` and so on; this is its `YYYY-MM`. */
export const monthKey = (year: number, month: number): string => `${year}-${pad(month + 1)}`;

/** `month` is 0-11. Weeks start on Monday. */
export function monthGrid(year: number, month: number, days: readonly GameDay[], order: readonly string[]): readonly (readonly CalendarCell[])[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const key = monthKey(year, month);
  const rank = (g: string): number => (order.includes(g) ? order.indexOf(g) : order.length);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ date: null, day: null, games: [] });
  for (let d = 1; d <= length; d++) {
    const date = `${key}-${pad(d)}`;
    const games = days
      .filter((x) => x.date === date)
      .sort((a, b) => rank(a.game) - rank(b.game))
      .map((x) => ({ game: x.game, late: x.late }));
    cells.push({ date, day: d, games });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null, games: [] });
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
