import { describe, expect, it } from 'vitest';
import { boilAt } from '../dev/promo/sprites';
import { DRIFT, pathAt, PERIOD } from '../dev/promo/gulptoad/path';
import { GROW, groundAt, toScreen, viewAt } from '../dev/promo/gulptoad/camera';
import { SAND } from '../dev/promo/gulptoad/ground';
import { airPuffs, alarmAt, biggerAt, CAPTIONS, captionAlpha, CREDIT_TEXT, pffftAt, SCORE_TEXT, SOUNDS } from '../dev/promo/gulptoad/words';
import { ballHalf, freeGape, jawLen, jawsAt, swellBottom, swellTop, toadTop } from '../dev/promo/gulptoad/jaws';
import {
  BALL_A, BALL_R, ballEnd, BITE_AT, GULP_AT, headU, HEAVES, LOOP_S, lumpSize, mealRim, NECK_W, NEXT_TOAD_AT, onlyFeetLeft, PFFFT_AT, puffAt, RIM_0, sideView, toadAt, wrap,
} from '../dev/promo/gulptoad/story';
import { BARRENS_RULES } from '../src/logic/chapters/barrens';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

/** The snake's head on screen. */
const headOnScreen = (t: number): { x: number; y: number } => toScreen(viewAt(t), pathAt(headU(t)));

describe('promo short: the eastern hognose and the puffed-up toad (no voice, InkSnake)', () => {
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
    expect(jawLen(END)).toBeCloseTo(jawLen(0), 3);
    const [j1, j2] = [jawsAt(END), jawsAt(0)];
    for (const key of ['tipTop', 'tipBottom', 'hingeTop', 'hingeBottom', 'reach'] as const) expect(j1[key], key).toBeCloseTo(j2[key], 0);
    expect(sideView(END)).toBe(1);
    expect(sideView(0)).toBe(1);
    expect(alarmAt(END)).toBeCloseTo(alarmAt(0), 3);
    expect(lumpSize(END)).toBe(0);
  });

  it('loops: the next toad stands where frame 1 finds the first, on screen, in the same pose', () => {
    const [c1, c0] = [toadAt(END)!, toadAt(0)!];
    const [p1, p0] = [toScreen(viewAt(END), c1), toScreen(viewAt(0), c0)];
    expect(p1.x).toBeCloseTo(p0.x, 1);
    expect(p1.y).toBeCloseTo(p0.y, 1);
    expect(c1.tilt).toBeCloseTo(c0.tilt, 3);
    expect(c1.neck).toBeCloseTo(c0.neck, 3);
    expect(c1.alarm).toBe(c0.alarm);
    expect(c1.puff).toBeCloseTo(c0.puff, 2);
    for (const k of ['armNear', 'armFar', 'legNear', 'legFar', 'kickNear', 'kickFar', 'air', 'shadow'] as const) expect(c1[k], k).toBeCloseTo(c0[k], 1);
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

  it('never shows the end of the sand, which is neither mirrored nor repeated', () => {
    for (const t of FRAMES) {
      const layers = groundAt(t);
      layers.forEach((g, i) => {
        if (g.alpha < 0.04 || (i === 0 && layers[1].alpha > 0.96)) return;
        expect(-g.x / g.zoom, `left at ${t}`).toBeGreaterThan(SAND.x);
        expect((1080 - g.x) / g.zoom, `right at ${t}`).toBeLessThan(SAND.x + SAND.w);
        expect(-g.y / g.zoom, `top at ${t}`).toBeGreaterThan(SAND.y);
        expect((1920 - g.y) / g.zoom, `bottom at ${t}`).toBeLessThan(SAND.y + SAND.h);
      });
    }
  });

  it('never jumps: the head and camera move on smoothly, frame to frame, round the seam too', () => {
    for (const t of FRAMES) {
      const next = wrap(t + FRAME);
      const [a, b] = [headOnScreen(t), headOnScreen(next)];
      expect(Math.hypot(b.x - a.x, b.y - a.y), `head at ${t}`).toBeLessThan(90);
      expect(Math.abs(Math.log(viewAt(next).zoom / viewAt(t).zoom)), `zoom at ${t}`).toBeLessThan(0.1);
      expect(Math.abs(jawsAt(next).tipTop - jawsAt(t).tipTop), `gape at ${t}`).toBeLessThan(60);
      expect(Math.abs(jawsAt(next).reach - jawsAt(t).reach), `reach at ${t}`).toBeLessThan(50);
      expect(Math.abs(jawLen(next) - jawLen(t)), `jaw length at ${t}`).toBeLessThan(15);
    }
  });

  it('crawls forward only: the path repeats, moved by one drift', () => {
    const [a, b] = [pathAt(300), pathAt(300 + PERIOD)];
    expect(b.x - a.x).toBeCloseTo(DRIFT.x, 3);
    expect(b.y - a.y).toBeCloseTo(DRIFT.y, 3);
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

  it('says the three lines at their beats, one at a time, and scores the game’s 12', () => {
    expect(CAPTIONS.map((c) => c.text)).toEqual(['that’s a whole toad', 'how did THAT fit', 'he puffed up and everything']);
    expect(CAPTIONS[0]!.to).toBeCloseTo(2.5, 6);
    expect(CAPTIONS[1]!.from).toBeGreaterThanOrEqual(GULP_AT);
    for (const t of FRAMES) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length, `at ${t}`).toBeLessThanOrEqual(1);
    expect(SCORE_TEXT).toBe(`+${BARRENS_RULES.prey!.toad!.points}`);
  });

  it('swallows the toad as the beats say: in the jaws, then only its feet, then gone', () => {
    expect(RIM_0).toBeGreaterThan(0);
    expect(jawsAt(0).tipTop).toBeGreaterThan(toadTop(RIM_0, 1) + 100);
    expect(headU(BITE_AT)).toBeGreaterThan(headU(0));
    expect(headU(HEAVES[2] + 0.4)).toBeGreaterThan(headU(HEAVES[0]));
    expect(onlyFeetLeft(4.25)).toBe(true);
    expect(onlyFeetLeft(2)).toBe(false);
    expect(toadAt(5)).toBeNull();
    expect(freeGape(6.5)).toBe(0);
  });

  it('puffs the toad up bigger before every heave, so the jaws must stretch wider', () => {
    const sizes = [0.5, ...HEAVES].map((t) => puffAt(t));
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]!, `heave ${i}`).toBeGreaterThan(sizes[i - 1]! + 0.05);
    expect(jawsAt(HEAVES[1] + 0.3).tipTop).toBeGreaterThan(jawsAt(HEAVES[0] - 0.4).tipTop);
    expect(ballEnd(4)).toBeGreaterThan(ballEnd(0));
    // The next one hops in limp, then blows itself up to frame 1's size.
    expect(puffAt(NEXT_TOAD_AT)).toBeLessThan(0.7);
    expect(puffAt(END)).toBeCloseTo(1, 2);
  });

  it('leaves a perfectly round lump, which shrinks at the "pffft" and is gone before the strike', () => {
    const t = GULP_AT + 1.2;
    const r = BALL_R * puffAt(t);
    for (const a of [-0.8, -0.4, 0, 0.4, 0.8]) {
      const [top, bottom] = [swellTop(BALL_A + a * r, t), swellBottom(BALL_A + a * r, t)];
      expect(top).toBe(bottom);
      expect(Math.abs(top - Math.sqrt(1 - a * a) * r)).toBeLessThan(14);
    }
    expect(2 * ballHalf(BALL_A, puffAt(t))).toBeGreaterThan(3 * NECK_W);
    expect(mealRim(t) - BALL_A - r).toBeGreaterThan(330);
    expect(lumpSize(PFFFT_AT - 0.1)).toBeGreaterThan(0.95);
    expect(lumpSize(PFFFT_AT + 0.6)).toBeLessThan(0.75);
    expect(airPuffs(PFFFT_AT + 0.3).length).toBeGreaterThan(2);
    expect(airPuffs(PFFFT_AT - 0.1).length).toBe(0);
    expect(pffftAt(PFFFT_AT + 0.3)!.alpha).toBe(1);
    expect(biggerAt(PFFFT_AT)).toBeNull();
    expect(lumpSize(END)).toBe(0);
  });

  it('uses the game’s own sound effects, on the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((s) => s.id === 'swallow' && s.t === GULP_AT)).toBe(true);
  });
});
