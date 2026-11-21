import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import { ankleOf } from '../dev/promo/secretary/bird';
import {
  BLINK_AT, blinkLidAt, captionAt, crestAt, CREDIT, CTA, CTA_AT, CTA_END, ctaAt, CUT, endOf, FIVE_AT, HOOK_LINES, hookAlpha, hookClock,
  hookPose, KICK_AT, KICK_KNEE, KICKING_AT, kickFoot, kickPose, LAST_END, lashLidAt, LASHES_AT, legArrowAt, LEGS_AT, LINE_WORDS, LINES, LOOP_S, miniAt,
  MS_AT, msLabelAt, FIFTEEN_AT, pressAt, sceneAt, SECRETARY_AT, sightAt, SO_AT, SOUNDS, startOf, stateAt, TARGET, tenseAt, TEXT, TIMED_AT,
  timedPose, watchAt, WEIGHT_AT, wrap,
} from '../dev/promo/secretary/story';
import { TEMPO, WORDS } from '../dev/promo/secretary/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);
const text = (i: number): string => LINES[i]!.words.map((w) => w.text).join(' ');

describe('promo short: the secretary bird kicking snakes (narrated, InkSnake)', () => {
  it('is 19.5 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(19.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('because');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.03);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('hook');
    expect(sceneAt(END)).toBe('hook');
    expect(hookClock(END)).toBeCloseTo(0, 4);
  });

  it('runs the hook shot on its own clock through the loop point, so nothing jumps', () => {
    for (const t of FRAMES) {
      if (sceneAt(t) !== 'hook' || sceneAt(t + FRAME) !== 'hook' || Math.abs(t - (KICKING_AT - 0.14)) < 0.2) continue;
      const [a, b] = [hookPose(t), hookPose(t + FRAME)];
      expect(Math.abs(b.raise - a.raise), `raise at ${t}`).toBeLessThan(0.02);
      expect(Math.abs(b.zoom - a.zoom), `zoom at ${t}`).toBeLessThan(0.02);
      expect(Math.abs(b.sway - a.sway), `sway at ${t}`).toBeLessThan(0.15);
    }
  });

  it('opens mid-kick: the foot raised high over the snake, nothing written but the hook, no call to action or credit', () => {
    const h = hookPose(0);
    expect(h.stomp).toBe(0);
    expect(h.raise).toBeGreaterThan(0.8);
    expect(kickFoot(h.raise, h.stomp).y).toBeLessThan(TARGET.y - 20);
    expect(hookAlpha(0)).toBe(1);
    expect([text(0), text(1)]).toEqual(['This bird hunts snakes…', 'by KICKING them!']);
    expect(ctaAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    expect(sightAt(0)).toBe(0);
    expect(tenseAt(0)).toBe(0);
    expect(msLabelAt(0)).toBe(0);
  });

  it('bends the leg backwards at the ankle, standing or kicking', () => {
    for (const [knee, foot] of [[{ x: 9, y: 11 }, { x: 8, y: 66 }], [KICK_KNEE, kickFoot(1, 0)], [KICK_KNEE, kickFoot(1, 1)], [{ x: 3, y: 10 }, { x: -6, y: 66 }]] as const) {
      const a = ankleOf(knee, foot);
      const cross = (foot.x - knee.x) * (a.y - knee.y) - (foot.y - knee.y) * (a.x - knee.x);
      expect(cross, `foot ${foot.x},${foot.y}`).toBeGreaterThan(0);
      expect(Math.hypot(a.x - knee.x, a.y - knee.y)).toBeCloseTo(30, 0);
    }
    // In the kick the tarsus drives down and forward from the ankle onto the snake.
    const before = ankleOf(KICK_KNEE, kickFoot(1, 0));
    const strike = kickFoot(1, 1);
    expect(strike.x).toBeGreaterThan(ankleOf(KICK_KNEE, strike).x);
    expect(strike.y).toBeGreaterThan(ankleOf(KICK_KNEE, strike).y);
    expect(kickFoot(1, 0).y).toBeGreaterThanOrEqual(before.y - 2);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    expect(sceneAt(startOf(7))).toBe('meet');
    expect(sceneAt(startOf(13))).toBe('face');
    expect(sceneAt(startOf(15))).toBe('kick');
    expect(sceneAt(startOf(25))).toBe('timed');
    expect(sceneAt(startOf(30))).toBe('blink');
    expect(sceneAt(startOf(37))).toBe('hook');
    const cuts = [CUT.meet, CUT.face, CUT.kick, CUT.timed, CUT.blink, CUT.aim];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
  });

  it('tells it in order: the stomp, the crest, the legs, the lashes, five birds, the stopwatch, the blink, the aim', () => {
    expect(hookPose(KICKING_AT - 0.2).stomp).toBe(0);
    expect(hookPose(KICKING_AT + 0.02).stomp).toBe(1);
    expect(hookPose(KICKING_AT + 0.05).impact).toBeGreaterThan(0.8);
    expect(crestAt(SECRETARY_AT - 0.2)).toBeLessThan(0.3);
    expect(crestAt(SECRETARY_AT + 0.3)).toBe(1);
    expect(legArrowAt(LEGS_AT + 0.35)).toBe(1);
    expect(lashLidAt(LASHES_AT + 0.04)).toBeGreaterThan(0.8);
    expect(kickPose(KICK_AT - 0.2).stomp).toBe(0);
    expect(kickPose(KICK_AT + 0.02).stomp).toBe(1);
    expect(miniAt(FIVE_AT - 0.1, 0)).toBe(0);
    for (let i = 0; i < 5; i++) expect(miniAt(startOf(19 + i) + 0.15, i), `bird ${i}`).toBe(1);
    expect(miniAt(startOf(22), 4)).toBe(0);
    expect(pressAt(WEIGHT_AT)).toBeGreaterThan(0.9);
    expect(timedPose(TIMED_AT - 0.2).stomp).toBe(0);
    expect(timedPose(TIMED_AT + 0.01).stomp).toBe(1);
    expect(watchAt(MS_AT + 0.5)).toBe(watchAt(MS_AT));
    expect(watchAt(MS_AT - 0.3)).toBeLessThan(watchAt(MS_AT));
    expect(msLabelAt(FIFTEEN_AT - 0.1)).toBe(0);
    expect(msLabelAt(FIFTEEN_AT + 0.2)).toBe(1);
    expect(blinkLidAt(BLINK_AT - 0.1)).toBe(0);
    expect(blinkLidAt(BLINK_AT + 0.07)).toBe(1);
    expect(blinkLidAt(BLINK_AT + 0.3)).toBe(0);
    expect(sightAt(startOf(42))).toBeGreaterThan(0.8);
    expect(sightAt(SO_AT)).toBe(0);
    expect(tenseAt(startOf(41))).toBe(1);
  });

  it('keeps the call to action to the last seconds and the credit from 40% in, both gone 0.6 s before the loop point', () => {
    for (const t of FRAMES.filter((f) => f < CTA_AT)) expect(ctaAt(t), `cta at ${t}`).toBe(0);
    for (const t of FRAMES.filter((f) => f < 0.4 * LOOP_S)) expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    expect(LOOP_S - CTA_AT).toBeGreaterThan(2);
    expect(LOOP_S - CTA_AT).toBeLessThan(3.6);
    expect(CTA_END).toBe(LOOP_S - 0.6);
    expect(ctaAt((CTA_AT + CTA_END) / 2)).toBe(1);
    expect(creditAt(10, LOOP_S, CREDIT.from)).toBeGreaterThan(0);
    for (const t of FRAMES.filter((f) => f >= CTA_END)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    expect(CTA.big.text).toBe('10 levels free');
    expect(CTA.small.text).toBe('tap the channel name');
  });

  it('cuts the voice into phrases that follow WORDS, highlighting the word being said', () => {
    expect(LINE_WORDS.reduce((s, n) => s + n, 0)).toBe(WORDS.length);
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (let i = HOOK_LINES + 1; i < LINES.length; i++) expect(LINES[i]!.from).toBeCloseTo(LINES[i - 1]!.to, 6);
    for (const w of WORDS.slice(LINE_WORDS.slice(0, HOOK_LINES).reduce((s, n) => s + n, 0))) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    expect(startOf(0)).toBeGreaterThanOrEqual(0);
    expect(endOf(WORDS.length - 1)).toBeLessThan(LOOP_S);
  });

  it('says only what the study found, and nothing gory', () => {
    const said = WORDS.map((w) => w.text.toLowerCase()).join(' ');
    for (const claim of ['five times its own body weight', 'fifteen milliseconds', 'ten times faster than a blink', "can't fix a miss"]) expect(said).toContain(claim);
    for (const word of ['blood', 'dead', 'kill', 'venom', 'cobra', 'mamba', 'adder']) expect(said).not.toContain(word);
  });

  it('keeps every word and the call to action between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    expect(top(TEXT.hook.y, TEXT.hook.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.hook.y + (HOOK_LINES - 1) * TEXT.hook.gap, TEXT.hook.size)).toBeLessThan(1250);
    expect(top(TEXT.line.y, TEXT.line.size)).toBeGreaterThan(270);
    for (const l of [CTA.big, CTA.small]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1250);
    }
    expect(CTA.arrow.from.y).toBeGreaterThan(CTA.small.y);
  });

  it('plays every sound inside the loop, quietly under the voice', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.7);
    }
  });
});
