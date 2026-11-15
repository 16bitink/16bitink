import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import {
  BITTEN_AT, captionAt, chewAt, COLLAPSES_AT, CREDIT, crossAt, CTA, CTA_AT, CTA_END, ctaAt, CUT, drainAt, duskAt, endOf, FACE_AT, FINISHES_AT, flinchAt,
  GRABS_AT, hitAt, HOOK_LINES, hookAlpha, hookClock, hookPose, IMMUNE_AT, immuneTag, IRIS_AT, irisAt, jawsAt, LAST_END, leftAt, LINE_WORDS, LINES,
  LOOP_S, LUNCH_AT, lungeAt, OVER_AT, puffAt, punchAt, RESISTANT_AT, resistantTag, sceneAt, shakeAt, SOUNDS, startOf, stateAt, strikeAt, TEXT, tipAt,
  UP_AT, upAt, wakeAt, WAKES_AT, wrap,
} from '../dev/promo/badger/story';
import { TEMPO, WORDS } from '../dev/promo/badger/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);
const text = (i: number): string => LINES[i]!.words.map((w) => w.text).join(' ');

describe('promo short: the honey badger bitten by a puff adder (narrated, InkSnake)', () => {
  it('is 19.5 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(19.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('Because');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('hook');
    expect(irisAt(0)).toBe(1);
    expect(irisAt(END)).toBe(1);
    expect(hookClock(END)).toBeCloseTo(0, 4);
  });

  it('runs frame 1 on its own clock through the loop point, so nothing jumps', () => {
    for (const t of FRAMES) {
      if (irisAt(t) <= 0 || irisAt(t + FRAME) <= 0) continue;
      expect(Math.abs(hookPose(t + FRAME).zoom - hookPose(t).zoom), `zoom at ${t}`).toBeLessThan(0.02);
      expect(Math.abs(hookPose(t + FRAME).tug - hookPose(t).tug), `tug at ${t}`).toBeLessThan(0.03);
      expect(Math.abs(hookPose(t + FRAME).sway - hookPose(t).sway), `sway at ${t}`).toBeLessThan(0.15);
    }
  });

  it('opens on the hook in full, whatever the sound, with no tags, call to action or credit', () => {
    expect(hookAlpha(0)).toBe(1);
    expect([text(0), text(1)]).toEqual(['This badger eats', 'VENOMOUS snakes!']);
    expect(ctaAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    const s = stateAt(0);
    for (const key of ['resistant', 'immune', 'cta', 'drain', 'dusk', 'hit']) expect(s[key], key).toBe(0);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    expect(sceneAt(startOf(5))).toBe('adder');
    expect(sceneAt(startOf(13))).toBe('grab');
    expect(sceneAt(startOf(24))).toBe('down');
    expect(sceneAt(startOf(28))).toBe('later');
    expect(sceneAt(startOf(33))).toBe('lunch');
    expect(sceneAt(startOf(37))).toBe('rest');
    const cuts = [CUT.adder, CUT.grab, CUT.down, CUT.later, CUT.lunch, CUT.rest, IRIS_AT];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
  });

  it('tells it in order: the puff, the grab, the bite in the face, the collapse, evening, the wake-up, lunch', () => {
    expect(puffAt(startOf(12) + 0.4)).toBeGreaterThan(0.9);
    expect(lungeAt(GRABS_AT + 0.1)).toBe(1);
    expect(jawsAt(GRABS_AT - 0.25)).toBeGreaterThan(0.9);
    expect(jawsAt(GRABS_AT + 0.1)).toBe(0);
    expect(strikeAt(BITTEN_AT - 0.4)).toBe(0);
    expect(strikeAt(BITTEN_AT + 0.05)).toBe(1);
    expect(hitAt(BITTEN_AT + 0.06)).toBeGreaterThan(0.8);
    expect(flinchAt(BITTEN_AT + 0.2)).toBe(1);
    expect(punchAt(FACE_AT + 0.1)).toBe(1);
    expect(tipAt(COLLAPSES_AT - 0.1)).toBe(0);
    expect(tipAt(COLLAPSES_AT + 0.4)).toBe(1);
    expect(drainAt(OVER_AT + 0.6)).toBe(1);
    expect(duskAt(WAKES_AT)).toBe(1);
    expect(wakeAt(WAKES_AT - 0.1)).toBe(0);
    expect(wakeAt(WAKES_AT)).toBe(1);
    expect(upAt(UP_AT - 0.1)).toBe(0);
    expect(upAt(UP_AT)).toBe(1);
    expect(Math.abs(shakeAt(UP_AT + 0.05))).toBeGreaterThan(0.5);
    expect(shakeAt(FINISHES_AT)).toBe(0);
    expect(leftAt(CUT.lunch + 0.05)).toBe(1);
    expect(leftAt(LUNCH_AT + 0.35)).toBe(0);
    expect(chewAt(CUT.rest + 0.1)).toBe(0);
    expect(resistantTag(RESISTANT_AT - 0.1)).toBe(0);
    expect(resistantTag(RESISTANT_AT + 0.3)).toBe(1);
    expect(immuneTag(IMMUNE_AT + 0.3)).toBe(1);
    expect(crossAt(IMMUNE_AT + 0.5)).toBe(1);
  });

  it('keeps the call to action to the last seconds, gone 0.6 s before the loop point', () => {
    for (const t of FRAMES.filter((f) => f < CTA_AT)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(LOOP_S - CTA_AT).toBeGreaterThan(2);
    expect(LOOP_S - CTA_AT).toBeLessThan(3.6);
    expect(CTA_END).toBe(LOOP_S - 0.6);
    expect(ctaAt((CTA_AT + CTA_END) / 2)).toBe(1);
    expect(creditAt((CTA_AT + CTA_END) / 2, LOOP_S, CREDIT.from)).toBeGreaterThan(0);
    for (const t of FRAMES.filter((f) => f >= CTA_END)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    expect(CTA.big.text).toBe('10 levels free');
    expect(CTA.small.text).toBe('tap the channel name');
    expect(IRIS_AT).toBeGreaterThanOrEqual(CTA_END - 0.05);
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

  it('never claims what the record does not', () => {
    const said = WORDS.map((w) => w.text.toLowerCase()).join(' ');
    expect(said).toContain('not immune');
    for (const word of ['blood', 'dead', 'died', 'antibod', 'receptor', 'cobra']) expect(said).not.toContain(word);
  });

  it('keeps every word, tag and the call to action between y 270 and 1250', () => {
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
