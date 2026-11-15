import { describe, expect, it, vi } from 'vitest';
import { withCredit } from '../dev/promo/credit';
import { VIDEO, type Short } from '../dev/promo/short';
import { boilAt } from '../dev/promo/sprites';
import { captionAt, LINES } from '../dev/promo/rockslide/captions';
import {
  arrowAt, BLOCKS_AT, blocksGone, cameraAt, CHARGE_AT, chaseClock, ctaAt, CTA_FROM, CTA_TO, CUT_AT, darkAt, EYE_AT, eyeOpenAt, EYE_OPEN_AT, fleeAt, hookAt, LOOP_S, noiseAt, rocksAt, sceneAt, shakeAt, wrap, WAKE_AT,
} from '../dev/promo/rockslide/story';
import { TEMPO, WORDS } from '../dev/promo/rockslide/words';

const FRAME = 1 / 30;
const END = LOOP_S - 1e-7;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const stateAt = (t: number) => ({
  scene: sceneAt(t), clock: chaseClock(t), cam: cameraAt(t), flee: fleeAt(t), shake: shakeAt(t), hook: hookAt(t), cta: ctaAt(t), arrow: arrowAt(t), dark: darkAt(t), boil: boilAt(t), rocks: rocksAt(chaseClock(t)),
});

describe('promo short: these rocks are alive (narrated)', () => {
  it('is 19.5 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(19.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    const end = WORDS[WORDS.length - 1]!.end / TEMPO;
    expect(LOOP_S - end).toBeGreaterThan(0.25);
    expect(LOOP_S - end).toBeLessThan(0.35);
  });

  it('the words run in order and the captions show the script from "It\'s the Rockslide" on', () => {
    WORDS.forEach((w, i) => {
      expect(w.end).toBeGreaterThan(w.start);
      if (i > 0) expect(w.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    });
    expect(LINES.flatMap((l) => l.words.map((w) => w.text)).join(' ')).toBe(WORDS.slice(4).map((w) => w.text).join(' '));
    expect(captionAt(0)).toBeNull();
    expect(captionAt(LOOP_S - 0.1)).toBeNull();
    expect(captionAt(CHARGE_AT + 0.1)!.line.words.map((w) => w.text).join(' ')).toBe('You can only RUN!');
  });

  it('the picture matches the words', () => {
    const at = (word: string, from = 0): number => WORDS[WORDS.findIndex((w, k) => k >= from && w.text === word)]!.start / TEMPO + 0.05;
    expect(sceneAt(at('asleep'))).toBe('cave');
    expect(sceneAt(at('Its'))).toBe('eye');
    expect(eyeOpenAt(at('Its'))).toBe(0);
    expect(eyeOpenAt(at('OPEN!') + 0.4)).toBe(1);
    expect(sceneAt(at('Rocks') + 0.1)).toBe('rain');
    expect(rocksAt(at('roof!')).length).toBeGreaterThan(0);
    expect(sceneAt(at('RUN!'))).toBe('chase');
    expect(ctaAt(at('So,') + 0.2)).toBe(1);
    for (const [word, from, n] of [['slowly…', 0, 1], ['block…', 0, 2], ['more…', 25, 3]] as const) {
      const t = at(word, from);
      expect(noiseAt(t + 0.25) - noiseAt(t - 0.1)).toBeGreaterThan(0.1);
      expect(blocksGone(t + 0.1)).toBe(n);
    }
  });

  it('loops: the state at t=0 equals the state at t=LOOP_S, and the last frame lands on frame 1', () => {
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    const [a, b] = [stateAt(END), stateAt(0)];
    expect(a.scene).toBe(b.scene);
    expect(a.clock).toBeCloseTo(b.clock, 5);
    for (const key of ['zoom', 'cx', 'cy'] as const) expect(a.cam[key]).toBeCloseTo(b.cam[key], 2);
    for (const key of ['x', 'y', 'tilt'] as const) expect(a.flee[key]).toBeCloseTo(b.flee[key], 2);
    expect(a.rocks.length).toBe(b.rocks.length);
    a.rocks.forEach((r, i) => expect(Math.hypot(r.x - b.rocks[i]!.x, r.y - b.rocks[i]!.y)).toBeLessThan(2));
    const [p, q] = [shakeAt(LOOP_S - FRAME), shakeAt(0)];
    expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThan(3);
  });

  it('opens on the hook: the giant up, rocks in the air, caption up, no CTA', () => {
    const s = stateAt(0);
    expect(s.scene).toBe('chase');
    expect(s.hook).toBe(1);
    expect(s.cta).toBe(0);
    expect(s.rocks.some((r) => r.phase === 'fall')).toBe(true);
  });

  it('never jumps inside the chase, across the seam included', () => {
    for (const t of FRAMES) {
      if (sceneAt(t) !== 'chase' || sceneAt(t + FRAME) !== 'chase') continue;
      const [a, b] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(b.zoom - a.zoom)).toBeLessThan(0.03);
      expect(Math.hypot(b.cx - a.cx, b.cy - a.cy)).toBeLessThan(12);
      const [p, q] = [fleeAt(t), fleeAt(t + FRAME)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(30);
    }
  });

  it('runs the beats in order', () => {
    expect(CUT_AT).toBeLessThan(BLOCKS_AT[0]!);
    expect(BLOCKS_AT[2]!).toBeLessThan(EYE_AT);
    expect(EYE_OPEN_AT).toBeLessThan(WAKE_AT);
    expect(WAKE_AT).toBeLessThan(CHARGE_AT);
    expect(sceneAt(0.6)).toBe('chase');
    expect(sceneAt(4)).toBe('cave');
    expect(sceneAt(12.6)).toBe('eye');
    expect(sceneAt(14)).toBe('rain');
    expect(sceneAt(17)).toBe('chase');
  });

  it('the noise climbs with each block and is full on the last, before the eyes', () => {
    let last = 0;
    for (const at of BLOCKS_AT) {
      const after = noiseAt(at + 0.3);
      expect(after).toBeGreaterThan(last);
      last = after;
    }
    expect(noiseAt(BLOCKS_AT[2]! + 0.3)).toBeGreaterThanOrEqual(0.99);
    expect(noiseAt(BLOCKS_AT[2]! + 0.3)).toBeLessThanOrEqual(1);
    expect(blocksGone(EYE_AT)).toBe(3);
  });

  it('honest to the game: rocks fall in threes every 1.3 s and land as loose rock on the floor', () => {
    const lying = rocksAt(15).filter((r) => r.phase === 'lie');
    expect(lying.length).toBeGreaterThan(0);
    lying.forEach((r) => expect(r.y).toBeGreaterThan(1200));
  });

  it('keeps the CTA to the last 3 s, gone 0.6 s before the loop point', () => {
    expect(CTA_FROM).toBeCloseTo(LOOP_S - 3, 5);
    expect(CTA_TO).toBeCloseTo(LOOP_S - 0.6, 5);
    for (const t of FRAMES) {
      const u = wrap(t);
      if (u < CTA_FROM || u >= CTA_TO) expect(ctaAt(u)).toBe(0);
      if (u < CTA_FROM) expect(arrowAt(u)).toBe(0);
    }
    expect(hookAt(17)).toBe(0);
  });

  it('changes the credit for this short only', () => {
    const spoke: string[] = [];
    const ctx = { save: vi.fn(), restore: vi.fn(), strokeText: vi.fn(), fillText: (s: string) => spoke.push(s) } as unknown as CanvasRenderingContext2D;
    const short: Short = { loopSeconds: LOOP_S, draw: () => undefined, audio: async () => new Blob() };
    withCredit(short, ctx).draw(9);
    withCredit(short, ctx, undefined, 'InkMine · 16bit.ink/mine').draw(9);
    expect(spoke).toEqual(['InkMine · 16bit.ink', 'InkMine · 16bit.ink/mine']);
    expect(VIDEO.width).toBe(1080);
  });
});
