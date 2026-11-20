import { describe, expect, it } from 'vitest';
import { isPhone, minTextPx, PHONE_MEDIA, TEXT_MIN, TOUCH } from '../src/phone';

describe('phone sizes', () => {
  it('a phone is a short side under 500 css px, held either way', () => {
    expect(isPhone({ width: 844, height: 390 })).toBe(true);
    expect(isPhone({ width: 390, height: 844 })).toBe(true);
    expect(isPhone({ width: 1024, height: 768 })).toBe(false);
  });

  it('targets follow Apple and WCAG (44), Material (48 and 8 apart)', () => {
    expect(TOUCH).toEqual({ min: 44, comfy: 48, gap: 8 });
  });

  it('a 12 px pixel font reads at 24 px body and 18 px captions on a phone', () => {
    expect(minTextPx('body', 12)).toBe(24);
    expect(minTextPx('small', 12)).toBe(18);
    expect(minTextPx('body')).toBe(TEXT_MIN.body);
    // A tiny pixel font never drops under the plain-text floor.
    expect(minTextPx('small', 8)).toBe(TEXT_MIN.small);
  });

  it('the media query matches the same short side', () => {
    expect(PHONE_MEDIA).toContain('max-height: 499px');
    expect(PHONE_MEDIA).toContain('max-width: 499px');
  });
});
