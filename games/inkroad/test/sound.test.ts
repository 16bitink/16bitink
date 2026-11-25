import { describe, expect, it } from 'vitest';
import { BED_FULL_CARS, BED_MAX_GAIN, bedLevel, isSfx } from '../src/audio/sound';

describe('traffic bed', () => {
  it('is silent with no cars and caps at full', () => {
    expect(bedLevel(0).gain).toBe(0);
    expect(bedLevel(BED_FULL_CARS).gain).toBeCloseTo(BED_MAX_GAIN);
    expect(bedLevel(BED_FULL_CARS * 5).gain).toBeCloseTo(BED_MAX_GAIN);
    expect(bedLevel(-5).gain).toBe(0);
  });
  it('gets busier and brighter with cars', () => {
    expect(bedLevel(200).gain).toBeGreaterThan(bedLevel(50).gain);
    expect(bedLevel(200).cutoff).toBeGreaterThan(bedLevel(50).cutoff);
  });
  it('knows its sounds', () => {
    expect(isSfx('stamp')).toBe(true);
    expect(isSfx('nope')).toBe(false);
  });
});
