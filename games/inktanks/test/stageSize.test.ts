import { describe, expect, it } from 'vitest';
import { PHONE_WORLD_CSS_MIN } from '@16bitink/game-sdk';
import { stageSize } from '../src/app/stageSize';

describe('the stage on a phone is zoomed in (owner playtest, 2026-11-20)', () => {
  it('laptops keep the ~540 px tall view', () => {
    const s = stageSize(1600, 900, 1);
    expect(s.height).toBe(450);
    expect(stageSize(1920, 1080, 1).height).toBe(540);
  });

  for (const [name, w, h, dpr] of [
    ['iPhone 14 on its side', 844, 390, 3],
    ['iPhone SE on its side', 667, 375, 2],
    ['Pixel 7 on its side', 915, 412, 2.625],
    ['a small Android on its side', 780, 360, 2],
  ] as const) {
    it(`${name}: an art px is at least ${PHONE_WORLD_CSS_MIN} css px, in whole device px`, () => {
      const s = stageSize(w, h, dpr);
      // Phaser's zoom is CSS px per art px.
      const perPx = s.zoom;
      expect(perPx).toBeGreaterThanOrEqual(PHONE_WORLD_CSS_MIN);
      expect(Number.isInteger(Math.round(perPx * dpr * 1e6) / 1e6)).toBe(true);
      // Still enough of the field to fight in: over 340 art px tall.
      expect(s.height).toBeGreaterThan(340);
    });
  }
});
