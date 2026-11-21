import { describe, expect, it } from 'vitest';
import { boilAt } from '../dev/promo/sprites';
import { DRIFT, pathAt, PERIOD } from '../dev/promo/gulphen/path';
import { leavesAt, onlyTailLeft, pythonAt, pythonSpine } from '../dev/promo/gulppython/meal';
import { PY_LEN, pyHalf } from '../dev/promo/gulppython/profile';
import {
  alarmAt, BITE_AT, CAPTIONS, captionAlpha, CREDIT_TEXT, freeGape, GROW, groundAt, GULP_AT, headU, HEAVES, jawsAt, LOOP_S, lumpSize, mealRim, NECK_W, RIM_0, RIM_FULL,
  pyPlaceAt, SCORE_TEXT, SOUNDS, sideView, swell, toScreen, viewAt, wrap,
} from '../dev/promo/gulppython/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

const headOnScreen = (t: number): { x: number; y: number } => toScreen(viewAt(t), pathAt(headU(t)));

describe('promo short: the king cobra and the rock python (no voice, InkSnake)', () => {
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

  it('loops: the next python lies where frame 1 finds the python, on screen, in the same pose', () => {
    const [p1, p0] = [pythonAt(END)!, pythonAt(0)!];
    expect(p1.tipU - PERIOD).toBeCloseTo(p0.tipU, 1);
    expect(p1.rim).toBeCloseTo(p0.rim, 1);
    expect(p1.lift).toBeCloseTo(p0.lift, 1);
    expect(p1.eye).toBe(p0.eye);
    expect(p1.eye).toBe('wide');
    const [s1, s0] = [pythonSpine(p1), pythonSpine(p0)];
    for (const a of [0, 400, 1000]) {
      const [q1, q0] = [s1.find((q) => q.a >= a)!, s0.find((q) => q.a >= a)!];
      const [o1, o0] = [toScreen(viewAt(END), q1), toScreen(viewAt(0), q0)];
      expect(o1.x, `x at ${a}`).toBeCloseTo(o0.x, 0);
      expect(o1.y, `y at ${a}`).toBeCloseTo(o0.y, 0);
    }
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

  it('never jumps: the head, the camera and the python move on smoothly, round the seam too', () => {
    for (const t of FRAMES) {
      const next = wrap(t + FRAME);
      const [a, b] = [headOnScreen(t), headOnScreen(next)];
      expect(Math.hypot(b.x - a.x, b.y - a.y), `head at ${t}`).toBeLessThan(90);
      expect(Math.abs(Math.log(viewAt(next).zoom / viewAt(t).zoom)), `zoom at ${t}`).toBeLessThan(0.1);
      expect(Math.abs(jawsAt(next).tipTop - jawsAt(t).tipTop), `gape at ${t}`).toBeLessThan(60);
      expect(Math.abs(jawsAt(next).reach - jawsAt(t).reach), `reach at ${t}`).toBeLessThan(50);
      const [p, q] = [pythonAt(t), pythonAt(next)];
      if (p && q && next > t) expect(Math.abs(q.rim - p.rim), `python at ${t}`).toBeLessThan(60);
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

  it('says the three lines at their beats, one at a time, and scores the game’s 80 for a rock python', () => {
    expect(CAPTIONS.map((c) => c.text)).toEqual(['that’s a whole python', 'how did THAT fit', 'snakes eat snakes?!']);
    expect(CAPTIONS[0]!.to).toBeCloseTo(2.5, 6);
    expect(CAPTIONS[1]!.from).toBeGreaterThanOrEqual(GULP_AT);
    for (const t of FRAMES) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length, `at ${t}`).toBeLessThanOrEqual(1);
    expect(SCORE_TEXT).toBe('+80');
  });

  it('swallows the python as the beats say: head in the jaws, hauled in, only the tail, then gone', () => {
    expect(mealRim(0)).toBe(RIM_0);
    expect(jawsAt(0).tipTop).toBeGreaterThan(pyHalf(RIM_0));
    expect(headU(BITE_AT)).toBeGreaterThan(headU(0));
    for (const h of HEAVES) expect(mealRim(h + 0.5)).toBeGreaterThan(mealRim(h - 0.05) + 100);
    expect(onlyTailLeft(4.3)).toBe(true);
    expect(onlyTailLeft(2)).toBe(false);
    expect(pythonAt(4.3)!.curl).toBeGreaterThan(0.5);
    expect(pythonAt(5)).toBeNull();
    expect(mealRim(GULP_AT + 0.3)).toBe(RIM_FULL);
    expect(RIM_FULL).toBeGreaterThan(PY_LEN);
    expect(lumpSize(GULP_AT + 1)).toBeGreaterThan(0.9);
    expect(freeGape(6.5)).toBe(0);
    expect(pythonAt(2)!.eye).toBe('asleep');
    expect(pythonAt(9)!.eye).toBe('dozy');
  });

  it('makes a long lump, half again the cobra’s depth', () => {
    const deep = Array.from({ length: PY_LEN }, (_, a) => pyHalf(a)).filter((h) => h > NECK_W / 2);
    expect(Math.max(...deep) * 2).toBeGreaterThan(1.45 * NECK_W);
    expect(deep.length).toBeGreaterThan(900);
    expect(leavesAt(HEAVES[1] + 0.3).length).toBeGreaterThan(1);
    expect(leavesAt(GULP_AT + 2).length).toBeGreaterThanOrEqual(1);
    expect(leavesAt(0).length).toBe(0);
  });

  it('never lets a leaf drift over a caption', () => {
    for (const t of FRAMES) {
      for (const c of CAPTIONS.filter((k) => captionAlpha(k, t) > 0)) {
        for (const f of leavesAt(t).filter((l) => l.alpha > 0.02)) {
          const q = toScreen(viewAt(t), f);
          const r = 45 * f.size * viewAt(t).zoom;
          const clear = q.y - r > c.y + c.size * 0.35 || q.y + r < c.y - c.size * 0.85;
          expect(clear, `leaf at ${t.toFixed(2)} s, y ${q.y.toFixed(0)}`).toBe(true);
        }
      }
    }
  });

  it('shows the swallowed python as a lump about 1.4 times the neck, tapering at both ends', () => {
    const t = 5.3;
    const depth = (d: number): number => swell(pyPlaceAt(mealRim(t), d), lumpSize(t)) / (NECK_W / 2);
    const ds = Array.from({ length: 400 }, (_, i) => i * 5);
    const peak = Math.max(...ds.map(depth));
    expect(peak).toBeGreaterThan(1.3);
    expect(peak).toBeLessThan(1.55);
    expect(depth(250)).toBeLessThan(1.1);
    expect(depth(1600)).toBeLessThan(1.05);
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
