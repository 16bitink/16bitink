import type { DailyDay, DailyPlay, DailyStanding } from '@16bitink/game-sdk';
import { isDailyDate } from './dailyDates';

/** A daily run longer than this is not a real one. */
export const MAX_DAILY_SECONDS = 4 * 3600;
const MAX_SHELLS = 10_000;
const VISITOR = /^[A-Za-z0-9_-]{8,64}$/;

/** What the play endpoint accepts: the game's play, plus the browser's own facts. */
export interface DailyPlayInput extends DailyPlay {
  /** Played after its date (the browser knows its own midnight). */
  readonly late: boolean;
  /** The browser's analytics visitor id: the player when nobody is signed in. */
  readonly visitor?: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const seconds = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_DAILY_SECONDS;

/** An untrusted request body as a play, or null when anything is off. */
export function parseDailyPlay(text: string): DailyPlayInput | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw)) return null;
  const { date, result, breakIn, shells, late, visitor } = raw;
  if (!isDailyDate(date) || (result !== 'win' && result !== 'lose') || !seconds(raw.seconds)) return null;
  if (breakIn !== undefined && !seconds(breakIn)) return null;
  if (typeof shells !== 'number' || !Number.isInteger(shells) || shells < 0 || shells > MAX_SHELLS) return null;
  if (late !== undefined && typeof late !== 'boolean') return null;
  if (visitor !== undefined && (typeof visitor !== 'string' || !VISITOR.test(visitor))) return null;
  return {
    date,
    result,
    seconds: raw.seconds,
    ...(breakIn === undefined ? {} : { breakIn }),
    shells,
    late: late === true,
    ...(visitor === undefined ? {} : { visitor }),
  };
}

/** The stored facts about one play that decide which of two is better. */
export interface PlayResult {
  readonly result: 'win' | 'lose';
  readonly seconds: number;
  readonly breakIn?: number;
}

/** Whether `next` should replace `kept`: a win beats a loss, faster beats slower, an earlier break-in beats a later one. */
export function isBetterPlay(next: PlayResult, kept: PlayResult): boolean {
  if (next.result !== kept.result) return next.result === 'win';
  if (next.result === 'win') return next.seconds < kept.seconds;
  if (next.breakIn === undefined) return false;
  return kept.breakIn === undefined || next.breakIn < kept.breakIn;
}

/**
 * The share (whole percent) of the other players this one beat, or undefined
 * when there is nobody else to compare with. `slower` counts others behind
 * them, `total` everyone compared, the player included.
 */
export function percentBetter(slower: number, total: number): number | undefined {
  const others = total - 1;
  if (!Number.isFinite(slower) || !Number.isFinite(total) || others < 1) return undefined;
  return Math.round((100 * Math.min(Math.max(slower, 0), others)) / others);
}

/** The counts the percentiles come from, all for one game and date (the player's own play included). */
export interface StandingCounts {
  readonly players: number;
  /** Plays that reported a break-in time. */
  readonly withBreakIn: number;
  /** Of them, those slower than this play's break-in. */
  readonly slowerBreakIn: number;
  /** Winning plays. */
  readonly wins: number;
  /** Of them, those slower than this play. */
  readonly slowerWins: number;
}

export function toStanding(play: PlayResult, counts: StandingCounts): DailyStanding {
  const breakIn = play.breakIn === undefined ? undefined : percentBetter(counts.slowerBreakIn, counts.withBreakIn);
  const clear = play.result === 'win' ? percentBetter(counts.slowerWins, counts.wins) : undefined;
  return {
    players: counts.players,
    ...(breakIn === undefined ? {} : { breakInBetterThan: breakIn }),
    ...(clear === undefined ? {} : { clearBetterThan: clear }),
  };
}

/** One played day of one game. */
export interface GameDay extends DailyDay {
  readonly game: string;
}

/** Days played, total: each calendar date counts once, however many games' dailies were played on it. */
export const totalDaysPlayed = (days: readonly { readonly date: string }[]): number => new Set(days.map((d) => d.date)).size;

/** Merges two lists of played days (same game and date: the better play wins), oldest first. */
export function mergeDays(a: readonly GameDay[], b: readonly GameDay[]): readonly GameDay[] {
  const byKey = new Map<string, GameDay>();
  for (const day of [...a, ...b]) {
    const key = `${day.game}:${day.date}`;
    const kept = byKey.get(key);
    if (!kept) byKey.set(key, day);
    else byKey.set(key, { ...(isBetterPlay(day, kept) ? day : kept), late: kept.late && day.late });
  }
  return [...byKey.values()].sort((x, y) => x.date.localeCompare(y.date) || x.game.localeCompare(y.game));
}

/** Milestones in days played; each earns a stamp. */
export const MILESTONES: readonly number[] = [3, 7, 14, 30, 50, 100];

export interface MilestoneState {
  readonly days: number;
  readonly earned: boolean;
}

/** Every milestone with whether the player has reached it, and the next one to look forward to (if any). */
export function milestoneStates(total: number): { readonly states: readonly MilestoneState[]; readonly next: number | null } {
  const states = MILESTONES.map((days) => ({ days, earned: total >= days }));
  return { states, next: MILESTONES.find((m) => m > total) ?? null };
}

/** The query a challenge link carries: `challenge=<date>:<seconds>`. */
export const CHALLENGE_PARAM = 'challenge';
const CHALLENGE = /^(\d{4}-\d{2}-\d{2}):(\d{1,5}(?:\.\d{1,3})?)$/;

/** The challenge in a page's query string (`?challenge=2026-11-22:48.5`), or undefined when absent or not valid. */
export function parseChallenge(search: string): { readonly date: string; readonly seconds: number } | undefined {
  const value = new URLSearchParams(search).get(CHALLENGE_PARAM);
  const m = value === null ? null : CHALLENGE.exec(value);
  if (!m) return undefined;
  const date = m[1] as string;
  const secs = Number(m[2]);
  return isDailyDate(date) && secs > 0 && secs <= MAX_DAILY_SECONDS ? { date, seconds: secs } : undefined;
}

/** The link to a game's play page that opens `date` with `seconds` to beat. */
export function challengeUrl(origin: string, game: string, date: string, seconds: number): string {
  const rounded = Math.round(seconds * 100) / 100;
  return `${origin}/play/${encodeURIComponent(game)}?${CHALLENGE_PARAM}=${date}:${rounded}`;
}
