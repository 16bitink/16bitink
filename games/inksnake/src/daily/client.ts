import { eventOn, seasonOf, type DailyDay, type DailyHost, type DailyStanding } from '@16bitink/game-sdk';
import { dailyId } from '../level/daily';
import type { LevelDef } from '../level/types';
import { parseLevel } from '../level/validate';

/**
 * The daily as the game uses it, over the host's DailyHost: never the
 * network itself. A day's level is checked (untrusted JSON) and must be
 * that date's; plays are recorded through the host, and every call that
 * can fail is caught here, so a missing connection never breaks a card.
 */

/** A daily about to be played: its date, its level and the challenge's time to beat. */
export interface DailyStart {
  readonly date: string;
  readonly level: LevelDef;
  readonly beat: number | null;
}

/** How a daily ended. */
export interface DailyOutcome {
  readonly won: boolean;
  readonly seconds: number;
  readonly lostBy?: string;
  readonly livesLost: number;
}

/** Throws unless `level` is the hunt for `date`: its id, event and season must all fit the date (a Christmas hunt never shows on another day). */
export function checkFits(level: LevelDef, date: string): void {
  if (level.id !== dailyId(date)) throw new Error(`the daily for ${date} came as ${level.id}`);
  const event = eventOn(date);
  if (level.event !== undefined && level.event !== event) throw new Error(`the daily for ${date} is the ${level.event} hunt`);
  if (event !== null && level.event !== event) throw new Error(`the daily for ${date} is missing its ${event} event`);
  if (level.season !== undefined && level.season !== seasonOf(date)) throw new Error(`the daily for ${date} is a ${level.season} hunt`);
}

const levels = new Map<string, LevelDef>();

export class DailyClient {
  constructor(private readonly host: DailyHost) {}

  today(): string {
    return this.host.today();
  }

  get challenge(): { readonly date: string; readonly seconds: number } | undefined {
    return this.host.challenge;
  }

  /** The level for `date` (cached for the session). Rejects with a reason a card can show. */
  async level(date: string): Promise<LevelDef> {
    const had = levels.get(date);
    if (had) return had;
    const level = parseLevel(await this.host.load(date));
    checkFits(level, date);
    levels.set(date, level);
    return level;
  }

  /** The level for `date` with the challenge's time if the link was for that day. */
  async start(date: string): Promise<DailyStart> {
    const level = await this.level(date);
    const ch = this.host.challenge;
    return { date, level, beat: ch && ch.date === date ? ch.seconds : null };
  }

  /** Saves a play; the standing, or null offline. */
  async record(date: string, o: DailyOutcome): Promise<DailyStanding | null> {
    try {
      return await this.host.record({ date, result: o.won ? 'win' : 'lose', seconds: Math.round(o.seconds * 10) / 10, shells: 0 });
    } catch (err) {
      console.warn('[inksnake] could not record the daily', err);
      return null;
    }
  }

  async history(): Promise<readonly DailyDay[]> {
    try {
      return await this.host.history();
    } catch (err) {
      console.warn('[inksnake] could not read the daily history', err);
      return [];
    }
  }

  async totalDays(fallback: number): Promise<number> {
    try {
      return await this.host.totalDays();
    } catch (err) {
      console.warn('[inksnake] could not count days played', err);
      return fallback;
    }
  }

  challengeLink(date: string, seconds: number): string {
    return this.host.challengeLink(date, Math.round(seconds));
  }
}
