import { addDays, eventOn, seasonOf } from '@16bitink/game-sdk';
import { describe, expect, it } from 'vitest';
import { inksnakeDaily, inksnakeDailyDates } from '../content/daily';
import { DAILY_MONTHS } from '../content/daily/index';
import { SEASON_PLACES } from '../src/gen/places';
import { dailyDate } from '../src/level/daily';
import { parseLevel } from '../src/level/validate';

/** Every frozen day (content/daily/*.json) as the game will get it from the server. */
const MONTHS = DAILY_MONTHS as readonly { readonly days: Readonly<Record<string, { readonly date: string; readonly level: unknown }>> }[];
const DAYS = MONTHS.flatMap((m) => Object.entries(m.days));

describe('frozen dailies', () => {
  it('has days frozen, served by date', () => {
    expect(DAYS.length).toBeGreaterThan(0);
    expect(inksnakeDailyDates()).toEqual(DAYS.map(([d]) => d).sort());
    expect(inksnakeDaily('1999-01-01')).toBeNull();
  });

  it('every day passes the validator unchanged, its id its date', () => {
    for (const [date, e] of DAYS) {
      expect(e.date).toBe(date);
      const level = parseLevel(JSON.parse(JSON.stringify(e.level)));
      expect(dailyDate(level.id), date).toBe(date);
      expect(level, date).toEqual(e.level);
      expect(inksnakeDaily(date)).toBe(e.level);
    }
  });

  it('keeps each day in its season\'s places, on its event, and its teaser\'s promise', () => {
    const all = new Map(DAYS.map(([d, e]) => [d, parseLevel(e.level)]));
    for (const [date, level] of all) {
      expect(SEASON_PLACES[seasonOf(date)], date).toContain(level.place);
      expect(level.event ?? null, date).toBe(eventOn(date));
      expect(level.tomorrow, date).toBeDefined();
      const next = all.get(addDays(date, 1));
      if (next) expect(level.tomorrow, date).toEqual({ place: next.place, snake: next.snake, rule: next.rule, ...(next.event ? { event: next.event } : {}) });
    }
  });
});
