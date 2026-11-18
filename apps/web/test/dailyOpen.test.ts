import { describe, expect, it } from 'vitest';
import { DAILY_GAMES, type DailyGame } from '../src/data/dailies';
import { dailiesOpenSomewhere, isDailyOpen, pickDaily } from '../src/lib/dailyOpen';
import { DAILY_CONTENT } from '../src/games/daily.server';

const brick: DailyGame = { slug: 'inkbrick', blurb: '', opens: '2026-11-22' };
const snake: DailyGame = { slug: 'inksnake', blurb: '', opens: '2026-11-19' };
const allOut = (): boolean => true;

describe('isDailyOpen', () => {
  it('opens on its first local day, not before', () => {
    expect(isDailyOpen(snake, '2026-11-18')).toBe(false);
    expect(isDailyOpen(snake, '2026-11-19')).toBe(true);
    expect(isDailyOpen(snake, '2026-12-01')).toBe(true);
  });
});

describe('dailiesOpenSomewhere', () => {
  it('leaves out a daily whose game is not out yet', () => {
    const out = (slug: string): boolean => slug !== 'inkbrick';
    expect(dailiesOpenSomewhere([brick, snake], new Date('2026-11-25T12:00:00Z'), out)).toEqual([snake]);
  });

  it('keeps a daily once its first day has begun in the eastmost time zone', () => {
    // 10:00 UTC on Nov 18 is already Nov 19 in Kiribati (UTC+14).
    expect(dailiesOpenSomewhere([snake], new Date('2026-11-18T10:00:00Z'), allOut)).toEqual([snake]);
    expect(dailiesOpenSomewhere([snake], new Date('2026-11-18T09:59:00Z'), allOut)).toEqual([]);
  });
});

describe('pickDaily', () => {
  const first = (): number => 0;
  const last = (): number => 0.999;

  it('keeps the one already shown while it is open and unplayed', () => {
    expect(pickDaily(['inkbrick', 'inksnake'], 'inksnake', new Set(), first)).toBe('inksnake');
  });

  it('picks at random among the unplayed ones', () => {
    expect(pickDaily(['inkbrick', 'inksnake', 'inkfish'], undefined, new Set(['inkbrick']), first)).toBe('inksnake');
    expect(pickDaily(['inkbrick', 'inksnake', 'inkfish'], undefined, new Set(['inkbrick']), last)).toBe('inkfish');
  });

  it('swaps out the shown one once it has been played today', () => {
    expect(pickDaily(['inkbrick', 'inksnake'], 'inksnake', new Set(['inksnake']), first)).toBe('inkbrick');
  });

  it('swaps out a shown one that is not open here', () => {
    expect(pickDaily(['inkbrick'], 'inksnake', new Set(), first)).toBe('inkbrick');
  });

  it('shows none when every open daily is played', () => {
    expect(pickDaily(['inkbrick', 'inksnake'], 'inkbrick', new Set(['inkbrick', 'inksnake']), first)).toBeUndefined();
    expect(pickDaily([], undefined, new Set(), first)).toBeUndefined();
  });
});

describe('opening days', () => {
  it('match the first day each game has a daily level for', () => {
    for (const daily of DAILY_GAMES) {
      const source = DAILY_CONTENT[daily.slug];
      expect(source?.(daily.opens), `${daily.slug} on ${daily.opens}`).toBeTruthy();
    }
    // InkSnake's hunts start on Nov 19: an earlier day would promise a level that isn't there.
    expect(DAILY_CONTENT.inksnake?.('2026-11-18')).toBeNull();
  });
});
