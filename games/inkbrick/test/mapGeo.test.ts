import { describe, expect, it } from 'vitest';
import type { Gate } from '../src/level/index';
import { coastCrop, nextLevel, trailPath } from '../src/ui/mapGeo';

const levels = Array.from({ length: 10 }, (_, i) => i + 1);

describe('portrait map', () => {
  it('marks only the first open, uncleared level as next', () => {
    const cleared = new Set([1, 2]);
    const d = {
      gate: (n: number): Gate => (n <= 3 ? 'play' : 'locked'),
      shells: (n: number) => (cleared.has(n) ? ([true, false, false] as const) : undefined),
    };
    expect(nextLevel(levels, d)).toBe(3);
  });

  it('has no next level when every open one is cleared or the rest are paid', () => {
    const d = {
      gate: (n: number): Gate => (n === 1 ? 'play' : 'paywall'),
      shells: (n: number) => (n === 1 ? ([true, true, true] as const) : undefined),
    };
    expect(nextLevel(levels, d)).toBeNull();
  });

  it('slides the coast so each place sits on screen, never past the painting edges', () => {
    const w = 390;
    const h = 844;
    const iw = (1920 * h) / 1080;
    for (let ch = 0; ch < 5; ch++) {
      const { pos } = coastCrop(ch, w, h);
      const x = parseFloat(pos);
      expect(x).toBeLessThanOrEqual(0);
      expect(x).toBeGreaterThanOrEqual(w - iw - 0.01);
    }
    expect(parseFloat(coastCrop(2, w, h).pos)).toBeLessThan(parseFloat(coastCrop(1, w, h).pos));
  });

  it('draws a trail from the first node to the last', () => {
    const d = trailPath(0, 9);
    expect(d.startsWith('M')).toBe(true);
    expect(d).toContain('Q');
    expect(trailPath(0, 0)).toBe('');
  });
});
