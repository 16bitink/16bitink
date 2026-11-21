import { describe, expect, it } from 'vitest';
import { boilAt } from '../dev/promo/sprites';
import { DRIFT, pathAt, PERIOD } from '../dev/promo/gulphen/path';
import { GROW, groundAt, toScreen, viewAt } from '../dev/promo/gulpcaiman/camera';
import { caimanAt, SHORE_A } from '../dev/promo/gulpcaiman/caimanPose';
import {
  BITE_AT, CAIMAN_LEN, caimanBottom, caimanTop, freeGape, GULP_AT, headU, HEAVES, jawLen, jawsAt, KICK_AT, LOOP_S, lumpSize, NECK_W, onlyTailLeft, RIM_0, RIM_FULL, sideView, wrap,
} from '../dev/promo/gulpcaiman/story';
import { alarmAt, CAPTIONS, captionAlpha, CREDIT_TEXT, SCORE_TEXT, SOUNDS, splashesAt } from '../dev/promo/gulpcaiman/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

/** The snake's head on screen. */
const headOnScreen = (t: number): { x: number; y: number } => toScreen(viewAt(t), pathAt(headU(t)));

describe('promo short: the green anaconda and the young caiman (no voice, InkSnake)', () => {
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

  it('loops: the next caiman lies where frame 1 finds the first, on screen, in the same pose, as deep in the water', () => {
    const [c1, c0] = [caimanAt(END)!, caimanAt(0)!];
    const [p1, p0] = [toScreen(viewAt(END), c1), toScreen(viewAt(0), c0)];
    expect(p1.x).toBeCloseTo(p0.x, 1);
    expect(p1.y).toBeCloseTo(p0.y, 1);
    expect(c1.tilt).toBeCloseTo(c0.tilt, 3);
    expect(c1.neck).toBeCloseTo(c0.neck, 3);
    expect(c1.alarm).toBe(c0.alarm);
    for (const leg of ['foreNear', 'foreFar', 'hindNear', 'hindFar'] as const) expect(c1[leg], leg).toBeCloseTo(c0[leg], 1);
    expect(c1.hindBack).toBeCloseTo(c0.hindBack, 1);
    expect(c1.tailBase).toBeCloseTo(c0.tailBase, 1);
    expect(c1.tailTip).toBeCloseTo(c0.tailTip, 1);
    expect(c1.waterA).toBeCloseTo(SHORE_A, 1);
    expect(c0.waterA).toBe(SHORE_A);
    expect(c1.sink).toBeCloseTo(c0.sink, 3);
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

  it('says the three lines at their beats, one at a time, and scores the game’s 80', () => {
    expect(CAPTIONS.map((c) => c.text)).toEqual(['that’s a whole caiman', 'how did THAT fit', 'he had teeth though']);
    expect(CAPTIONS[0]!.to).toBeCloseTo(2.5, 6);
    expect(CAPTIONS[1]!.from).toBeGreaterThanOrEqual(GULP_AT);
    for (const t of FRAMES) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length, `at ${t}`).toBeLessThanOrEqual(1);
    expect(SCORE_TEXT).toBe('+80');
  });

  it('swallows the caiman head-first as the beats say: in the jaws, then only its tail, then gone', () => {
    expect(RIM_0).toBeGreaterThan(0);
    expect(jawsAt(0).tipTop).toBeGreaterThan(caimanTop(RIM_0) + 100);
    expect(headU(HEAVES[2] + 0.4)).toBeGreaterThan(headU(HEAVES[0]));
    expect(headU(BITE_AT)).toBeGreaterThan(headU(0));
    expect(onlyTailLeft(KICK_AT)).toBe(true);
    expect(onlyTailLeft(2)).toBe(false);
    expect(headU(GULP_AT + 0.2)).toBeCloseTo(RIM_FULL, 0);
    expect(RIM_FULL).toBeGreaterThan(CAIMAN_LEN);
    expect(caimanAt(5)).toBeNull();
    expect(lumpSize(GULP_AT + 1)).toBeGreaterThan(0.9);
    expect(freeGape(6.5)).toBe(0);
    expect(caimanTop(420) + caimanBottom(420)).toBeGreaterThan(NECK_W);
    expect(caimanTop(CAIMAN_LEN + 1)).toBe(0);
    expect(splashesAt(KICK_AT + 0.3).length).toBeGreaterThan(0);
    expect(splashesAt(0).length).toBe(0);
  });

  it('swims the next one in along the bank, then it climbs out a little', () => {
    const swim = caimanAt(9)!;
    expect(swim.sink).toBe(1);
    expect(swim.waterA).toBeLessThan(0);
    expect(caimanAt(END)!.sink).toBe(0);
  });

  it('uses the game’s own sound effects, on the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((s) => s.id === 'swallow' && s.t === GULP_AT)).toBe(true);
  });
});
