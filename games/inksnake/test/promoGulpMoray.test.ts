import { describe, expect, it } from 'vitest';
import { boilAt } from '../dev/promo/sprites';
import { DRIFT, holeAt, HOLE_S, pathAt, PERIOD, railAt } from '../dev/promo/gulpmoray/rail';
import {
  BITE_AT, EEL_D, EEL_LEN, eelAt, eelBottom, eelNose, eelTop, freeGape, GROW, groundAt, GULP_AT, headU, HEAVES, jawsAt, LOOP_S, lumpSize, mealRim, NECK_W, onlyTailLeft, RIM_0, sideView,
  toScreen, viewAt, wrap,
} from '../dev/promo/gulpmoray/story';
import { alarmAt, bubblesAt, CAPTIONS, captionAlpha, CREDIT_TEXT, SCORE_TEXT, SOUNDS } from '../dev/promo/gulpmoray/words';
import { REEF_PREY } from '../src/logic/chapters/reefPrey';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

/** The krait's head on screen. */
const headOnScreen = (t: number): { x: number; y: number } => toScreen(viewAt(t), pathAt(headU(t)));
/** The moray's nose on screen. */
const noseOnScreen = (t: number): { x: number; y: number } => {
  const e = eelAt(t)!;
  return toScreen(viewAt(t), railAt(e.nose, e.k));
};

describe('promo short: the banded sea krait and the moray (no voice, InkSnake)', () => {
  it('is 12 s, a multiple of 1.5 s, so the line boil loops too', () => {
    expect(LOOP_S).toBe(12);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
  });

  it('loops: the last frame runs into frame 1 on screen', () => {
    const [a, b] = [headOnScreen(END), headOnScreen(0)];
    expect(a.x).toBeCloseTo(b.x, 1);
    expect(a.y).toBeCloseTo(b.y, 1);
    expect(viewAt(END).zoom).toBeCloseTo(viewAt(0).zoom, 4);
    expect(headU(END) - PERIOD).toBeCloseTo(headU(0), 1);
    const [j1, j2] = [jawsAt(END), jawsAt(0)];
    for (const key of ['tipTop', 'tipBottom', 'hingeTop', 'hingeBottom', 'reach'] as const) expect(j1[key], key).toBeCloseTo(j2[key], 0);
    expect(sideView(END)).toBe(1);
    expect(sideView(0)).toBe(1);
    expect(alarmAt(END)).toBeCloseTo(alarmAt(0), 3);
    expect(lumpSize(END)).toBe(0);
  });

  it('loops: the next moray lies where frame 1 finds the first, on screen, in the same pose', () => {
    const [e1, e0] = [eelAt(END)!, eelAt(0)!];
    expect(e1.k).toBe(1);
    expect(e0.k).toBe(0);
    const [p1, p0] = [noseOnScreen(END), noseOnScreen(0)];
    expect(p1.x).toBeCloseTo(p0.x, 1);
    expect(p1.y).toBeCloseTo(p0.y, 1);
    expect(e1.nose).toBeCloseTo(e0.nose, 3);
    expect(e1.sway).toBeCloseTo(0, 3);
    expect(e0.sway).toBe(0);
    expect(e1.alarm).toBe(e0.alarm);
    const [h1, h0] = [toScreen(viewAt(END), holeAt(1)), toScreen(viewAt(0), holeAt(0))];
    expect(h1.x).toBeCloseTo(h0.x, 1);
    expect(h1.y).toBeCloseTo(h0.y, 1);
  });

  it('loops: the ground ends as it starts, the bigger copy faded right in', () => {
    const [[a0], [, b1]] = [groundAt(0), groundAt(END)];
    expect(a0.alpha).toBe(1);
    expect(b1.alpha).toBeCloseTo(1, 6);
    expect(groundAt(0)[1].alpha).toBe(0);
    expect(b1.zoom).toBeCloseTo(a0.zoom, 3);
    expect(b1.x).toBeCloseTo(a0.x, 0);
    expect(b1.y).toBeCloseTo(a0.y, 0);
    expect(GROW).toBeGreaterThan(1);
  });

  it('never jumps: the head, the moray and the camera move on smoothly, round the seam too', () => {
    for (const t of FRAMES) {
      const next = wrap(t + FRAME);
      const [a, b] = [headOnScreen(t), headOnScreen(next)];
      expect(Math.hypot(b.x - a.x, b.y - a.y), `head at ${t}`).toBeLessThan(90);
      expect(Math.abs(Math.log(viewAt(next).zoom / viewAt(t).zoom)), `zoom at ${t}`).toBeLessThan(0.1);
      expect(Math.abs(jawsAt(next).tipTop - jawsAt(t).tipTop), `gape at ${t}`).toBeLessThan(60);
      expect(Math.abs(jawsAt(next).reach - jawsAt(t).reach), `reach at ${t}`).toBeLessThan(50);
      const [e0, e1] = [eelAt(t), eelAt(next)];
      if (e0 && e1 && e0.k === e1.k) {
        const [n0, n1] = [noseOnScreen(t), noseOnScreen(next)];
        expect(Math.hypot(n1.x - n0.x, n1.y - n0.y), `nose at ${t}`).toBeLessThan(90);
      }
    }
  });

  it('crawls forward only: the path and the holes repeat, moved by one drift', () => {
    const [a, b] = [pathAt(300), pathAt(300 + PERIOD)];
    expect(b.x - a.x).toBeCloseTo(DRIFT.x, 3);
    expect(b.y - a.y).toBeCloseTo(DRIFT.y, 3);
    expect(holeAt(1).x - holeAt(0).x).toBeCloseTo(DRIFT.x, 3);
    for (const t of FRAMES.slice(1)) expect(headU(t) + 12).toBeGreaterThan(headU(t - FRAME));
  });

  it('has no caption on frame 1; the first starts at 0.15 s or later', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, 0), c.text).toBe(0);
    expect(Math.min(...CAPTIONS.map((c) => c.from))).toBeGreaterThanOrEqual(0.15);
    for (const c of CAPTIONS) expect(captionAlpha(c, END), c.text).toBe(0);
  });

  it('keeps every line of text inside the clear area, y 270..1250', () => {
    for (const c of CAPTIONS) {
      expect(c.y - c.size * 0.8, c.text).toBeGreaterThanOrEqual(270);
      expect(c.y + c.size * 0.3, c.text).toBeLessThanOrEqual(1250);
    }
    expect(CREDIT_TEXT.y).toBeLessThanOrEqual(1250);
    expect(CREDIT_TEXT.text).toBe('InkSnake · 16bit.ink');
  });

  it('says the three lines at their beats, one at a time', () => {
    expect(CAPTIONS.map((c) => c.text)).toEqual(['that’s a whole eel', 'how did THAT fit', 'wait he’s wider than me']);
    expect(CAPTIONS[0]!.to).toBeCloseTo(2.5, 6);
    expect(CAPTIONS[1]!.from).toBeGreaterThanOrEqual(GULP_AT);
    for (const t of FRAMES) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length, `at ${t}`).toBeLessThanOrEqual(1);
  });

  it('scores the game’s points for a moray', () => {
    expect(SCORE_TEXT).toBe(`+${REEF_PREY.moray!.points}`);
  });

  it('swallows the moray as the beats say: its head in the jaws, pulled from its hole, then only its tail, then gone', () => {
    expect(RIM_0).toBeGreaterThan(0);
    expect(eelNose(0)).toBeCloseTo(0, 6);
    expect(jawsAt(0).tipTop).toBeGreaterThan(EEL_D);
    expect(mealRim(HEAVES[2] + 0.4)).toBeGreaterThan(mealRim(HEAVES[0]));
    expect(mealRim(BITE_AT)).toBeGreaterThan(mealRim(0));
    // Its tail still in the hole until the third heave, out after it.
    expect(EEL_LEN - mealRim(HEAVES[1] + 0.4)).toBeGreaterThan(HOLE_S - headU(HEAVES[1] + 0.4));
    expect(EEL_LEN - mealRim(HEAVES[2] + 0.4)).toBeLessThan(HOLE_S - headU(HEAVES[2] + 0.4));
    expect(onlyTailLeft(4.25)).toBe(true);
    expect(onlyTailLeft(2)).toBe(false);
    expect(eelAt(5)).toBeNull();
    expect(lumpSize(GULP_AT + 1)).toBeGreaterThan(0.9);
    expect(freeGape(6.5)).toBe(0);
    // Wider than the krait, and long.
    expect(eelTop(EEL_LEN * 0.3) + eelBottom(EEL_LEN * 0.3)).toBeGreaterThan(1.5 * NECK_W);
    expect(eelTop(EEL_LEN + 1)).toBe(0);
    expect(bubblesAt(HEAVES[1] + 0.3).length).toBeGreaterThan(2);
    expect(bubblesAt(0).length).toBe(0);
  });

  it('uses the game’s own sound effects, on the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((s) => s.id === 'swallow' && s.t === GULP_AT)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'strike')).toBe(true);
  });
});
