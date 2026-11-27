import { describe, expect, it } from 'vitest';
import { clockText, dateLine, levelNumber, minutes, monthName, num, opensMonth, pct, plain, plateNumber, seasonLine, signed, trend, worksText } from '../src/ui/format';

describe('format', () => {
  it('groups thousands and keeps the sign', () => {
    expect(num(0)).toBe('0');
    expect(num(999)).toBe('999');
    expect(num(12480)).toBe('12,480');
    expect(num(-1500)).toBe('-1,500');
    expect(num(-0.2)).toBe('0');
    expect(num(NaN)).toBe('0');
  });
  it('signs changes', () => {
    expect(signed(40)).toBe('+40');
    expect(signed(-12)).toBe('-12');
    expect(signed(0.3)).toBe('0');
    expect(signed(2500)).toBe('+2,500');
  });
  it('clamps shares and wraps hours', () => {
    expect(pct(0.634)).toBe('63%');
    expect(pct(2)).toBe('100%');
    expect(pct(-1)).toBe('0%');
    expect(clockText(7.5)).toBe('07:30');
    expect(clockText(25)).toBe('01:00');
    expect(clockText(-1)).toBe('23:00');
  });
  it('names dates and levels', () => {
    expect(seasonLine(3, 3)).toBe('Year 3, Winter');
    expect(seasonLine(1, 9)).toBe('Year 1, Winter');
    expect(dateLine(2, 2)).toBe('Year 2, May');
    expect(dateLine(2, 11)).toBe('Year 2, February');
    expect(monthName(12)).toBe('March');
    expect(levelNumber(1, 1)).toBe(1);
    expect(levelNumber(2, 3)).toBe(13);
    expect(levelNumber(5, 10)).toBe(50);
  });
  it('says what works give: whole months, and the month they are done in', () => {
    expect(worksText({ works: 3, closes: true, opens: 6 })).toBe('3 months of road works, road closed, open in September');
    expect(worksText({ works: 1, closes: false, opens: 10 })).toBe('1 month of road works by night, road open, done in January');
    expect(worksText({ works: 6 })).toBe('6 months of road works');
    // Begun in May (paydays behind: 2): the rest of May and three more. At May's review all of spring's are behind.
    expect(opensMonth({ phase: 'day', season: 0, month: 2 }, 4)).toBe('September');
    expect(opensMonth({ phase: 'review', season: 0, month: 2 }, 3)).toBe('September');
    expect(opensMonth({ phase: 'yearStart', season: 0, month: 0 }, 3)).toBe('June');
  });
  it('reads trends', () => {
    expect(trend(60, 50)).toBe('up');
    expect(trend(50, 60)).toBe('down');
    expect(trend(50.4, 50)).toBe('same');
  });
  it('shortens the plate as plates are won', () => {
    expect(plateNumber(0)).toHaveLength(5);
    expect(plateNumber(6)).toHaveLength(4);
    expect(plateNumber(30)).toHaveLength(1);
    expect(plateNumber(999)).toHaveLength(1);
    expect(plateNumber(-4)).toHaveLength(5);
  });
  it('formats minutes and strips dashes', () => {
    expect(minutes(65)).toBe('1:05');
    expect(minutes(-3)).toBe('0:00');
    expect(plain('a — b – c')).toBe('a - b - c');
  });
});
