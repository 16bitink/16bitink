import { describe, expect, it } from 'vitest';
import { addDays, classifyDate, isDailyDate, localDate, mayServe, todayWindow } from '../src/lib/dailyDates';

const at = (iso: string): number => Date.parse(iso);

describe('isDailyDate', () => {
  it('accepts real calendar dates only', () => {
    expect(isDailyDate('2026-11-22')).toBe(true);
    expect(isDailyDate('2028-02-29')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '22-11-2026', '', 'today', 20261122, null, undefined]) expect(isDailyDate(bad)).toBe(false);
  });
});

describe('todayWindow', () => {
  it('runs from UTC-12 to UTC+14', () => {
    expect(todayWindow(at('2026-11-22T12:00:00Z'))).toEqual({ min: '2026-11-22', max: '2026-11-23' });
  });
  it('reaches back a day for the westmost zone until 12:00 UTC', () => {
    expect(todayWindow(at('2026-11-22T11:59:59Z')).min).toBe('2026-11-21');
    expect(todayWindow(at('2026-11-22T12:00:00Z')).min).toBe('2026-11-22');
  });
  it('reaches forward a day for the eastmost zone from 10:00 UTC', () => {
    expect(todayWindow(at('2026-11-22T09:59:59Z')).max).toBe('2026-11-22');
    expect(todayWindow(at('2026-11-22T10:00:00Z')).max).toBe('2026-11-23');
  });
});

describe('classifyDate', () => {
  const now = at('2026-11-22T15:00:00Z');
  it('calls the dates within the window today', () => {
    expect(classifyDate('2026-11-22', now)).toBe('today');
    expect(classifyDate('2026-11-23', now)).toBe('today');
  });
  it('calls earlier dates past and later ones future', () => {
    expect(classifyDate('2026-11-21', now)).toBe('past');
    expect(classifyDate('2026-11-24', now)).toBe('future');
  });
  it('rejects nonsense and dates before any daily existed', () => {
    expect(classifyDate('2026-02-31', now)).toBe('invalid');
    expect(classifyDate('2025-12-31', now)).toBe('invalid');
    expect(classifyDate(undefined, now)).toBe('invalid');
  });
});

describe('mayServe (the entitlement rule)', () => {
  it('serves today to everyone', () => {
    expect(mayServe('today', false)).toBe(true);
    expect(mayServe('today', true)).toBe(true);
  });
  it('serves past dates to owners only', () => {
    expect(mayServe('past', false)).toBe(false);
    expect(mayServe('past', true)).toBe(true);
  });
  it('never serves the future, not even to owners', () => {
    expect(mayServe('future', true)).toBe(false);
    expect(mayServe('invalid', true)).toBe(false);
  });
});

describe('addDays / localDate', () => {
  it('moves across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('writes the local calendar date', () => {
    expect(localDate(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
  });
});
