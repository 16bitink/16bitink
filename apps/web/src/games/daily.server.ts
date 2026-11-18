/**
 * Server-side registry of daily levels, served by /api/daily/[game]. SERVER-ONLY:
 * never import from client code (the frozen levels would reach every browser).
 *
 * To add a game with a daily: add its package, one line here, and its slug to data/dailies.ts.
 */
import { inkbrickDaily } from '@16bitink/inkbrick/daily';
import { inksnakeDaily } from '@16bitink/inksnake/daily';

/** A game's daily for a local date (YYYY-MM-DD), or null when none is made for it. */
export type DailyLevelSource = (date: string) => unknown;

export const DAILY_CONTENT: Readonly<Record<string, DailyLevelSource>> = {
  inkbrick: inkbrickDaily,
  inksnake: inksnakeDaily,
};
