import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import {
  bubbleAt, bubbleOpen, BUS_AT, captionAt, CAR_AT, carThud, CHECK_AT, couchBar, couchIn, COUCH_AT, CREDIT, CROCS2_AT, crocPlate, CUT, FEET_AT, feetLabel, FISH2_AT, FISH_AT,
  fishIn, fishPlate, glance, HOOK_LINES, hookAlpha, hookClock, hookPose, LAST_END, LINES, LOOP_S, placeLabel, rise, scared, sceneAt, SCIENTISTS_AT, scientistIn, SKULL_AT,
  SNACKS_AT, SOUNDS, stateAt, strikeAt, surface, sweptAt, TEETH_AT, teethPush, TEXT, tilt, weightLabel, WIPE_AT, WIPE_END, wipeAt, wrap,
} from '../dev/promo/titanoboa/story';
import { endOf, LINE_WORDS, startOf, WORDS } from '../dev/promo/titanoboa/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: Titanoboa, as long as a school bus (narrated, InkSnake)', () => {
  it('is 19.5 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(19.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('because');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('hook');
    expect(sceneAt(END)).toBe('hook');
  });

  it('runs the hook on its own clock through the loop point, so the snake never jumps', () => {
    expect(hookClock(END)).toBeCloseTo(0, 4);
    for (const t of FRAMES.filter((f) => f >= WIPE_AT || f < CUT.boa - FRAME)) {
      const [a, b] = [hookPose(t), hookPose(t + FRAME)];
      expect(Math.abs(b.gape - a.gape), `gape at ${t}`).toBeLessThan(0.04);
      expect(Math.abs(b.sway - a.sway), `sway at ${t}`).toBeLessThan(0.1);
    }
  });

  it('opens on the snake along the bus with the hook in full, and no number, label or credit', () => {
    expect(hookAlpha(0)).toBe(1);
    expect(LINES.slice(0, HOOK_LINES).flatMap((l) => l.words.map((w) => w.text)).join(' ')).toBe('This snake was as long as a school BUS!');
    for (const t of FRAMES.filter((f) => f < CUT.boa)) {
      for (const shown of [feetLabel(t), placeLabel(t), weightLabel(t), couchBar(t), creditAt(t, LOOP_S)]) expect(shown, `at ${t}`).toBe(0);
    }
    expect(hookPose(BUS_AT + 0.08).kick).toBeGreaterThan(0.8);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    const cuts = [CUT.boa, CUT.car, CUT.couch, CUT.think, CUT.strike, CUT.dig, CUT.which, CUT.swim, WIPE_AT, WIPE_END];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
    expect(sceneAt(startOf(9))).toBe('boa');
    expect(sceneAt(startOf(12))).toBe('car');
    expect(sceneAt(startOf(19))).toBe('couch');
    expect(sceneAt(SCIENTISTS_AT)).toBe('think');
    expect(sceneAt(SNACKS_AT)).toBe('strike');
    expect(sceneAt(startOf(30))).toBe('dig');
    expect(sceneAt(startOf(41))).toBe('which');
    expect(sceneAt(startOf(45))).toBe('swim');
    expect(sceneAt(LOOP_S - 0.01)).toBe('hook');
  });

  it('shows every noun as it is said', () => {
    expect(rise(FEET_AT + 0.35)).toBe(1);
    expect(feetLabel(FEET_AT + 0.4)).toBe(1);
    expect(placeLabel(CUT.boa + 0.8)).toBe(1);
    expect(weightLabel(CAR_AT)).toBe(1);
    expect(Math.abs(tilt(CAR_AT + 0.5))).toBeLessThan(0.02);
    expect(Math.abs(tilt(CUT.car + 0.3))).toBeGreaterThan(0.05);
    expect(carThud(CAR_AT + 0.05)).toBeGreaterThan(0.8);
    expect(couchIn(COUCH_AT)).toBeGreaterThan(0.8);
    expect(scientistIn(SCIENTISTS_AT + 0.2)).toBeGreaterThan(0.95);
    expect(sweptAt(SKULL_AT + 0.15)).toBe(1);
    expect(teethPush(TEETH_AT + 0.12)).toBe(1);
    expect(fishIn(FISH_AT + 0.2)).toBe(1);
    expect(fishIn(FISH_AT - 0.2)).toBe(0);
    expect(crocPlate(CROCS2_AT + 0.1)).toBeGreaterThan(0.9);
    expect(fishPlate(FISH2_AT + 0.1)).toBeGreaterThan(0.9);
    expect(fishPlate(CROCS2_AT + 0.1)).toBe(0);
  });

  it('keeps the meal a thought until "SNACKS!", then swallows it head first and shuts', () => {
    expect(bubbleAt(SCIENTISTS_AT + 0.65)).toBe(1);
    expect(bubbleOpen(SNACKS_AT - 0.4)).toBe(0);
    expect(bubbleOpen(CUT.strike + 0.02)).toBe(1);
    expect(strikeAt(SNACKS_AT - 0.2).near).toBe(0);
    const mid = strikeAt(SNACKS_AT + 0.25);
    expect(mid.gape).toBeGreaterThan(0.7);
    expect(mid.over).toBeGreaterThan(0.2);
    let last = 0;
    for (const t of FRAMES.filter((f) => f >= CUT.strike && f < CUT.dig)) {
      expect(strikeAt(t).over).toBeGreaterThanOrEqual(last);
      last = strikeAt(t).over;
    }
    expect(last).toBe(1);
    expect(strikeAt(CUT.dig - 0.02).gape).toBe(0);
  });

  it('looks from the croc to the fish, and the eyes rise before the swimmer backs away', () => {
    expect(glance(CROCS2_AT + 0.15)).toBe(-1);
    expect(glance(FISH2_AT + 0.15)).toBe(1);
    expect(surface(CUT.swim + 0.1)).toBe(0);
    expect(surface(CHECK_AT)).toBeGreaterThan(0.9);
    expect(scared(CHECK_AT)).toBe(1);
  });

  it('wipes to frame 1 with the passing body before the loop point', () => {
    expect(wipeAt(WIPE_AT)).toBeCloseTo(0, 9);
    expect(wipeAt(WIPE_END)).toBeCloseTo(1, 9);
    expect(wipeAt(END)).toBe(wipeAt(0));
    expect(WIPE_END).toBeLessThan(LOOP_S);
  });

  it('cuts the voice into lines that follow WORDS, highlighting the word being said', () => {
    expect(LINE_WORDS.reduce((s, n) => s + n, 0)).toBe(WORDS.length);
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (let i = HOOK_LINES + 1; i < LINES.length; i++) expect(LINES[i]!.from).toBeCloseTo(LINES[i - 1]!.to, 6);
    for (const w of WORDS.slice(LINE_WORDS[0]! + LINE_WORDS[1]!)) {
      const now = captionAt(w.start + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let i = 1; i < WORDS.length; i++) {
      expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
      expect(endOf(i)).toBeGreaterThan(startOf(i));
    }
    expect(endOf(WORDS.length - 1)).toBeLessThan(LOOP_S);
  });

  it('keeps every word between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    expect(top(TEXT.hook.y, TEXT.hook.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.hook.y + TEXT.hook.gap, TEXT.hook.size)).toBeLessThan(1250);
    for (const l of [TEXT.line, TEXT.feet, TEXT.place, TEXT.weight, TEXT.couch]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1250);
    }
  });

  it('gives every number in both units', () => {
    expect(TEXT.feet.text).toBe('42 ft (12.8 m)');
    expect(TEXT.weight.text).toBe('2,500 lb (1,135 kg)');
    expect(TEXT.couch.text).toMatch(/ft.*m\)/);
  });

  it('fades the credit in about 40% through and has it gone before the loop point', () => {
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    expect(creditAt(0.4 * LOOP_S - 0.01, LOOP_S)).toBe(0);
    expect(creditAt(0.5 * LOOP_S, LOOP_S)).toBeGreaterThan(0);
    for (const t of FRAMES.filter((f) => f >= LOOP_S - 0.6)) expect(creditAt(t, LOOP_S), `credit at ${t}`).toBe(0);
  });

  it('plays every sound inside the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
