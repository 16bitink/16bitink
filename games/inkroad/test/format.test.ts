import { describe, expect, it } from 'vitest';
import { clockText, dateLine, levelNumber, minutes, num, pct, plain, plateNumber, signed, trend } from '../src/ui/format';

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
    expect(dateLine(3, 3)).toBe('Year 3, Winter');
    expect(dateLine(1, 9)).toBe('Year 1, Winter');
    expect(levelNumber(1, 1)).toBe(1);
    expect(levelNumber(2, 3)).toBe(13);
    expect(levelNumber(5, 10)).toBe(50);
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
