import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, eventOn, EVENT_IDS, EVENTS, isDate, missingMovingDates, nextEvent, seasonOf } from '../src/calendar';

const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('the shared calendar', () => {
  it('reads dates strictly', () => {
    expect(isDate('2027-02-28')).toBe(true);
    expect(isDate('2027-02-29')).toBe(false);
    expect(isDate('2027-2-28')).toBe(false);
    expect(isDate(20270228)).toBe(false);
    expect(() => seasonOf('nope')).toThrow();
  });

  it('counts days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(daysBetween('2026-12-24', '2027-01-01')).toBe(8);
  });

  it('gives meteorological northern seasons', () => {
    expect(seasonOf('2026-12-01')).toBe('winter');
    expect(seasonOf('2027-02-28')).toBe('winter');
    expect(seasonOf('2027-03-01')).toBe('spring');
    expect(seasonOf('2027-06-01')).toBe('summer');
    expect(seasonOf('2027-09-01')).toBe('autumn');
    expect(seasonOf('2026-11-30')).toBe('autumn');
  });

  it('knows the fixed and moving events', () => {
    expect(eventOn('2026-12-24')).toBe('christmasEve');
    expect(eventOn('2026-12-25')).toBe('christmas');
    expect(eventOn('2026-12-26')).toBe('boxingDay');
    expect(eventOn('2026-12-31')).toBe('newYearsEve');
    expect(eventOn('2027-01-01')).toBe('newYear');
    expect(eventOn('2027-02-06')).toBe('lunarNewYear');
    expect(eventOn('2028-01-26')).toBe('lunarNewYear');
    expect(eventOn('2027-03-28')).toBe('easter');
    expect(eventOn('2028-04-16')).toBe('easter');
    expect(eventOn('2027-10-29')).toBe('diwali');
    expect(eventOn('2027-10-30')).toBe('halloween');
    expect(eventOn('2027-10-31')).toBe('halloween');
    expect(eventOn('2027-02-14')).toBe('valentines');
    expect(eventOn('2027-07-16')).toBe('snakeDay');
    expect(eventOn('2027-05-05')).toBeNull();
    expect(eventOn('2028-03-28')).toBeNull();
  });

  it('names every event', () => {
    for (const id of EVENT_IDS) expect(EVENTS[id].name.length).toBeGreaterThan(2);
  });

  it('finds the next event within a window', () => {
    expect(nextEvent('2026-12-18', 7)).toEqual({ id: 'christmasEve', date: '2026-12-24', inDays: 6 });
    expect(nextEvent('2026-12-24', 7)?.inDays).toBe(0);
    expect(nextEvent('2026-11-20', 7)).toBeNull();
  });

  it('has every moving date at least 90 days ahead of today', () => {
    expect(missingMovingDates(localToday(), 90)).toEqual([]);
  });

  it('spots a moving date missing inside a window', () => {
    expect(missingMovingDates('2028-09-20', 60)).toEqual(['diwali 2028']);
    expect(missingMovingDates('2026-11-18', 90)).toEqual([]);
  });
});
