import type { DailyHost, DailyPlay } from '@16bitink/game-sdk';
import { describe, expect, it } from 'vitest';
import { christmasEve, sampleOn, winterFarmIce } from '../dev/daily/samples';
import { addToAlbum, parseAlbum } from '../src/daily/album';
import { checkFits, DailyClient } from '../src/daily/client';
import { countdown, longDate, monthGrid, msToMidnight, msUntil } from '../src/daily/dates';
import { eventTeaser, goalLine, placeName, standingLine, winterLine } from '../src/daily/text';
import { SNAKES } from '../src/logic/species';
import { SNAKE_FACTS } from '../src/daily/snakeFacts';

const TODAY = '2026-12-24';

function fakeHost(plays: DailyPlay[], payload: (date: string) => unknown = (d) => sampleOn(d, TODAY, 1)): DailyHost {
  return {
    today: () => TODAY,
    load: async (date) => payload(date),
    record: async (p) => {
      plays.push(p);
      return { players: 3, clearBetterThan: 50 };
    },
    history: async () => [],
    totalDays: async () => plays.length,
    challengeLink: (date, s) => `https://example.test/daily?d=${date}&s=${s}`,
    challenge: { date: TODAY, seconds: 61 },
  };
}

describe('the daily client', () => {
  it('loads and checks the day, with the challenge for that day', async () => {
    const c = new DailyClient(fakeHost([]));
    const s = await c.start(TODAY);
    expect(s.level.id).toBe('daily-2026-12-24');
    expect(s.level.event).toBe('christmasEve');
    expect(s.beat).toBe(61);
  });

  it("refuses a level that isn't that date's, or isn't valid", async () => {
    await expect(new DailyClient(fakeHost([], () => christmasEve('2026-12-23'))).level('2026-12-22')).rejects.toThrow();
    await expect(new DailyClient(fakeHost([], () => ({ id: 'daily-2026-12-21', snake: 'dragon' }))).level('2026-12-21')).rejects.toThrow();
  });

  it('refuses a hunt whose theme does not fit its date', async () => {
    const load = (date: string, make: (d: string) => unknown) => new DailyClient(fakeHost([], make)).level(date);
    // An event hunt on a plain day, a plain hunt on an event day, another event's hunt, a winter hunt in autumn.
    await expect(load('2026-12-23', (d) => ({ ...christmasEve(d), id: `daily-${d}` }))).rejects.toThrow(/christmasEve/);
    await expect(load('2026-12-31', (d) => { const { event: _e, ...rest } = christmasEve(d); return rest; })).rejects.toThrow(/missing/);
    await expect(load('2026-12-30', (d) => ({ ...christmasEve(d), event: 'newYearsEve' }))).rejects.toThrow(/newYearsEve/);
    await expect(load('2026-11-19', (d) => winterFarmIce(d))).rejects.toThrow(/winter/);
    await expect(load('2026-12-24', (d) => christmasEve(d))).resolves.toBeDefined();
  });

  it('checkFits: id, event and season', () => {
    const plain = { ...winterFarmIce('2026-12-10'), id: 'daily-2026-12-10' };
    expect(() => checkFits(plain, '2026-12-10')).not.toThrow();
    expect(() => checkFits(plain, '2026-12-11')).toThrow(/came as/);
    expect(() => checkFits({ ...plain, season: 'summer' }, '2026-12-10')).toThrow(/summer/);
  });

  it('serves samples stamped for their date: season is the date\'s, the event only on its own day', () => {
    expect(sampleOn('2026-12-23', '2026-12-24', 1)?.event).toBeUndefined();
    expect(sampleOn('2026-12-24', '2026-12-24', 1)?.event).toBe('christmasEve');
    expect(sampleOn('2026-11-19', '2026-11-19', 1)?.season).toBe('autumn');
  });

  it('records a play through the host only', async () => {
    const plays: DailyPlay[] = [];
    const c = new DailyClient(fakeHost(plays));
    expect(await c.record(TODAY, { won: true, seconds: 42.345, livesLost: 0 })).toEqual({ players: 3, clearBetterThan: 50 });
    expect(plays).toEqual([{ date: TODAY, result: 'win', seconds: 42.3, shells: 0 }]);
  });

  it('survives a host that fails', async () => {
    const host: DailyHost = { ...fakeHost([]), record: async () => Promise.reject(new Error('offline')), history: async () => Promise.reject(new Error('x')), totalDays: async () => Promise.reject(new Error('x')) };
    const c = new DailyClient(host);
    expect(await c.record(TODAY, { won: false, seconds: 9, livesLost: 3 })).toBeNull();
    expect(await c.history()).toEqual([]);
    expect(await c.totalDays(7)).toBe(7);
  });
});

describe('the snake album', () => {
  it('only grows, keeping the first date', () => {
    const a = addToAlbum({}, 'candycane', '2026-12-24', 'christmasEve');
    const b = addToAlbum(a, 'candycane', '2026-12-25');
    expect(b).toBe(a);
    const c = addToAlbum(b, 'candycane', '2026-12-20');
    expect(c.candycane).toEqual({ date: '2026-12-20', event: 'christmasEve' });
    expect(Object.keys(addToAlbum(c, 'corn', '2026-12-26'))).toHaveLength(2);
  });

  it('reads saved albums safely and round-trips through storage', () => {
    expect(parseAlbum({ corn: { date: 'soon' }, dragon: { date: '2026-01-01' }, krait: { date: '2026-01-01', event: 'party' } })).toEqual({ krait: { date: '2026-01-01' } });
  });

  it('has a fact for every snake', () => {
    for (const id of SNAKES) expect(SNAKE_FACTS[id].length).toBeGreaterThan(20);
  });
});

describe('the cards\' words', () => {
  it('words dates, countdowns and months', () => {
    expect(longDate('2026-12-24')).toBe('Thursday, December 24');
    expect(countdown(3_723_000)).toBe('1:02:03');
    expect(msToMidnight(new Date(2026, 11, 24, 23, 0, 0))).toBe(3_600_000);
    // The first hunt's countdown: to the player's own midnight that day, never below zero.
    expect(msUntil('2026-11-19', new Date(2026, 10, 18, 21, 30, 0))).toBe(9_000_000);
    expect(msUntil('2026-11-19', new Date(2026, 10, 19, 0, 0, 1))).toBe(0);
    const grid = monthGrid(2026, 11);
    expect(grid[0]!.slice(0, 2)).toEqual([null, '2026-12-01']);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
  });

  it('teases an event in the coming week', () => {
    expect(eventTeaser('2026-12-18')).toBe('Christmas Eve Hunt in 6 days: the candy cane corn snake');
    expect(eventTeaser('2026-12-23')).toBe('Christmas Eve Hunt tomorrow: the candy cane corn snake');
    expect(eventTeaser('2026-11-20')).toBeNull();
  });

  it('says what the day asks, and the winter aside', () => {
    const xmas = christmasEve(TODAY);
    expect(goalLine(xmas)).toBe('Eat 8 cookies, and grow');
    expect(winterLine(xmas)).toBe('Too cold to sleep in: the candy cane corn snake is out hunting in the snow.');
    expect(placeName('reef')).toBe('The Reef');
  });

  it('words the standing from untrusted numbers', () => {
    expect(standingLine({ players: 9, clearBetterThan: 140 }, true, true)).toContain('Faster than 100%');
    expect(standingLine({ players: 1, clearBetterThan: 50 }, false, true)).toBe('1 hunter so far');
    expect(standingLine(null, true, true)).toMatch(/connection/);
  });
});
