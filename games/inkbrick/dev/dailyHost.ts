import type { DailyDay, DailyHost, DailyPlay, DailyStanding } from '@16bitink/game-sdk';
import { inkbrickDaily } from '../content/daily';
import { localToday } from '../src/app/dates';
import { CH1_LEVELS } from '../src/level/ch1/index';

/**
 * A local DailyHost for the dev page, as the website's but without a
 * server: levels from content/daily.ts (or, while none is frozen for the
 * date, a chapter 1 level dressed as that day's daily), plays in
 * localStorage, a made-up standing. `?today=YYYY-MM-DD` fakes the date,
 * `?days=N` adds N days played from other games, `?beat=SECONDS` opens as a
 * challenge link. Until the frozen days carry them: `?tomorrow=rule.goal` adds a tomorrow
 * teaser (e.g. current.tide), `?pearl=1` hides a daily pearl.
 */
const PLAYS_KEY = 'inkbrick.dev.dailyPlays';

interface StoredPlay extends DailyPlay {
  readonly playedOn: string;
}

function readPlays(): StoredPlay[] {
  try {
    const x: unknown = JSON.parse(localStorage.getItem(PLAYS_KEY) ?? '[]');
    return Array.isArray(x) ? (x as StoredPlay[]) : [];
  } catch {
    return [];
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function devDailyHost(query: URLSearchParams, owned: boolean): DailyHost {
  const today = query.get('today') ?? localToday();
  const extraDays = Number(query.get('days') ?? 0) || 0;
  const beat = query.has('beat') ? Number(query.get('beat')) : null;
  const challengeDate = query.get('daily') ?? today;
  const [tRule, tGoal] = (query.get('tomorrow') ?? '').split('.');
  const dress = (level: Record<string, unknown>): Record<string, unknown> => ({
    ...level,
    ...(tRule && !level.tomorrow ? { tomorrow: { rule: tRule, goal: tGoal || 'clear' } } : {}),
    ...(query.get('pearl') === '1' && !level.dailyPearl ? { dailyPearl: { x: 33, y: 44 } } : {}),
  });
  return {
    today: () => today,
    load: async (date) => {
      if (date > today) throw new Error('future dates never load');
      if (date < today && !owned) throw new Error('past days need the full game');
      const frozen = inkbrickDaily(date);
      if (frozen) return JSON.parse(JSON.stringify(dress(frozen as unknown as Record<string, unknown>))) as unknown;
      const base = CH1_LEVELS[hash(date) % CH1_LEVELS.length]!;
      return JSON.parse(JSON.stringify(dress({ ...base, id: `daily-${date}`, number: 0, name: `${base.name} (dev stand-in)` }))) as unknown;
    },
    record: async (play): Promise<DailyStanding> => {
      const plays = readPlays().filter((p) => p.date !== play.date);
      localStorage.setItem(PLAYS_KEY, JSON.stringify([...plays, { ...play, playedOn: today }]));
      const h = hash(`${play.date}:${play.seconds}`);
      return { players: 40 + (h % 900), breakInBetterThan: play.breakIn !== undefined ? h % 100 : undefined, clearBetterThan: play.result === 'win' ? (h >>> 8) % 100 : undefined };
    },
    history: async (): Promise<readonly DailyDay[]> =>
      readPlays().sort((a, b) => a.date.localeCompare(b.date)).map((p) => ({ date: p.date, result: p.result, late: p.playedOn > p.date, seconds: p.seconds })),
    totalDays: async () => new Set(readPlays().map((p) => p.date)).size + extraDays,
    challengeLink: (date, seconds) => `${location.origin}${location.pathname}?daily=${date}&beat=${seconds}`,
    challenge: beat !== null && Number.isFinite(beat) ? { date: challengeDate, seconds: beat } : undefined,
  };
}
