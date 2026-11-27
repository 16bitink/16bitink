import { STICK_MIN, TOUCH } from '@16bitink/game-sdk';
import { describe, expect, it } from 'vitest';
import { boardLayout, STICK_STRIP, TOP_STRIP } from '../src/render/layout';
import { followOrigin, isTap, STICK, stickValue } from '../src/ui/stick';
import { BOARD_H, BOARD_W } from '../src/sim/types';

describe('stick maths', () => {
  it('reads nothing in the dead zone and full speed at the end of its travel', () => {
    expect(stickValue(0, STICK.travel)).toBe(0);
    expect(stickValue(STICK.travel * 0.05, STICK.travel)).toBe(0);
    expect(stickValue(STICK.travel, STICK.travel)).toBe(1);
    expect(stickValue(-STICK.travel * 3, STICK.travel)).toBe(-1);
  });

  it('rises smoothly, slow near the centre for fine aiming', () => {
    const half = stickValue(STICK.travel / 2, STICK.travel);
    expect(half).toBeGreaterThan(0.2);
    expect(half).toBeLessThan(0.5);
    expect(stickValue(-STICK.travel / 2, STICK.travel)).toBeCloseTo(-half);
    expect(stickValue(STICK.travel * 0.75, STICK.travel)).toBeGreaterThan(half);
  });

  it('drags its centre along when the thumb runs past the travel, so turning back reverses at once', () => {
    expect(followOrigin(100, 130, 60)).toBe(100);
    expect(followOrigin(100, 200, 60)).toBe(140);
    expect(followOrigin(100, 10, 60)).toBe(70);
  });

  it('counts a short, still touch as a tap', () => {
    expect(isTap(120, 4)).toBe(true);
    expect(isTap(120, 30)).toBe(false);
    expect(isTap(600, 2)).toBe(false);
  });

  it('is big enough for a thumb', () => {
    expect(STICK.knob).toBeGreaterThanOrEqual(TOUCH.comfy);
    expect(STICK.travel * 2 + STICK.knob).toBeGreaterThanOrEqual(STICK_MIN.base);
    expect(STICK_STRIP).toBeGreaterThanOrEqual(STICK.height + TOUCH.gap * 2);
  });
});

describe('board layout with the stick', () => {
  it('keeps a strip under the board for the thumb on a phone held upright', () => {
    const l = boardLayout(390, 763, STICK_STRIP);
    expect(l.mode).toBe('top');
    expect(l.y).toBeGreaterThanOrEqual(TOP_STRIP);
    expect(l.pad).not.toBeNull();
    expect(l.pad!.y).toBeCloseTo(l.y + l.h);
    expect(l.pad!.h).toBeGreaterThanOrEqual(STICK_STRIP);
    expect(l.pad!.y + l.pad!.h).toBeCloseTo(763);
    expect(l.h).toBeCloseTo((l.w / BOARD_W) * BOARD_H);
  });

  it('gives the board as much room as before when there is no stick (mouse, keys)', () => {
    const l = boardLayout(390, 844);
    expect(l.pad).toBeNull();
    expect(l.w).toBeCloseTo(390);
  });

  it('puts the stick low in the right band of a wide screen', () => {
    const l = boardLayout(844, 390, STICK_STRIP);
    expect(l.mode).toBe('side');
    expect(l.pad!.x).toBeCloseTo(l.x + l.w);
    expect(l.pad!.y + l.pad!.h).toBeCloseTo(390);
    expect(l.pad!.h).toBeGreaterThanOrEqual(STICK_STRIP);
  });
});
