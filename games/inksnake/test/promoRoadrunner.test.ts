import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import { ankleOf } from '../dev/promo/roadrunner/leg';
import { footAt, RUN, speedOf, STRUT } from '../dev/promo/roadrunner/poses';
import {
  AND_AT, captionAt, birdXAt, COYOTE_AT, coyoteLeadAt, CREDIT, CUT, dayAt, digestAt, EATS_AT, endOf, FAST_AT, GOOD_AT, grabDir, grabPose, HOOK_LINES, hookAlpha, hookClock,
  hookPose, LAST_END, LINE_WORDS, LINES, longPose, lookBackAt, LOOP_S, NO_AT, PUSH, pushAt, pushFade, sceneAt, SKID_AT, skidAt, SLAM_1, SLAM_2, SOUNDS, SPEED_SIZE, SPEEDS, speedsAt,
  startOf, stateAt, STEP_S, STRIKE_AT, strutPhase, SWALLOW_AT, TEXT, TWICE_AT, WALKS_AT, wrap,
} from '../dev/promo/roadrunner/story';
import { TEMPO, WORDS } from '../dev/promo/roadrunner/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);
const text = (i: number): string => LINES[i]!.words.map((w) => w.text).join(' ');

describe('promo short: the real roadrunner eats rattlesnakes (narrated, InkSnake)', () => {
  it('is 18 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(18);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('thing');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.03);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S, and the push hands over to the hook before it', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) expect(end[key], key).toBeCloseTo(start[key]!, 3);
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(sceneAt(0)).toBe('hook');
    expect(sceneAt(END)).toBe('hook');
    expect(hookClock(END)).toBeCloseTo(0, 4);
    expect(PUSH.done).toBeLessThan(LOOP_S);
    expect(sceneAt(PUSH.done - FRAME)).toBe('race');
    expect(pushAt(PUSH.done - 1e-6)).toBeCloseTo(1, 3);
    expect(pushFade(PUSH.done - 0.1)).toBe(1);
    expect(pushAt(PUSH.from)).toBe(0);
  });

  it('runs the hook on its own clock through the loop point, so nothing jumps', () => {
    for (const t of FRAMES.filter((f) => f < CUT.grab - FRAME || f >= LOOP_S - 1.2)) {
      const [a, b] = [hookPose(t), hookPose(t + FRAME)];
      expect(Math.abs(b.swing - a.swing), `swing at ${t}`).toBeLessThan(0.03);
      expect(Math.abs(b.zoom - a.zoom), `zoom at ${t}`).toBeLessThan(0.02);
      expect(Math.abs(b.gulp - a.gulp), `gulp at ${t}`).toBeLessThan(0.03);
    }
  });

  it('opens on the hook alone: the snake hanging full length, the rattle shaking, nothing written but the hook', () => {
    const h = hookPose(0);
    expect(h.gulp).toBe(0);
    expect(h.crest).toBeGreaterThan(0.8);
    expect(h.lid).toBe(0);
    expect(hookAlpha(0)).toBe(1);
    expect([text(0), text(1)]).toEqual(['The REAL roadrunner', 'eats rattlesnakes!']);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
    expect(speedsAt(0)).toBe(0);
    expect(hookPose(EATS_AT + 0.3).gulp).toBeGreaterThan(0.05);
  });

  it('cuts to each beat just before its first word, in story order', () => {
    expect(sceneAt(startOf(5))).toBe('grab');
    expect(sceneAt(startOf(13))).toBe('grab');
    expect(sceneAt(startOf(19))).toBe('long');
    expect(sceneAt(startOf(25))).toBe('strut');
    expect(sceneAt(startOf(37))).toBe('hour');
    expect(sceneAt(startOf(42))).toBe('race');
    const cuts = [CUT.grab, CUT.long, CUT.strut, CUT.hour, CUT.race, PUSH.from];
    for (let i = 1; i < cuts.length; i++) expect(cuts[i]!).toBeGreaterThan(cuts[i - 1]!);
  });

  it('tells it in order: the grab, the slams, the stuck gulp, the strut, the hour, the overtaking, the look back', () => {
    expect(grabPose(STRIKE_AT - 0.05).held).toBe(0);
    expect(grabPose(STRIKE_AT + 0.05).held).toBe(1);
    expect(grabDir(SLAM_1 - 0.15)).toBeLessThan(-2);
    expect(grabDir(SLAM_1)).toBeGreaterThan(0.3);
    expect(grabPose(AND_AT).impact).toBe(0);
    expect(grabPose(SLAM_1 + 0.04).impact).toBeGreaterThan(0.8);
    expect(grabPose(SLAM_2 + 0.04).impact).toBeGreaterThan(0.6);
    // Limp after the slam.
    expect(grabPose(SLAM_1).thrash).toBe(0);
    expect(longPose(SWALLOW_AT + 0.2).gulp).toBeGreaterThan(longPose(SWALLOW_AT + 0.6).gulp);
    expect(longPose(NO_AT + 0.3).lid).toBeGreaterThan(0.4);
    expect(longPose(NO_AT + 0.3).crest).toBeGreaterThan(0.9);
    expect(strutPhase(WALKS_AT)).toBeCloseTo(0, 9);
    expect(dayAt(CUT.hour)).toBe(0);
    expect(dayAt(CUT.race)).toBe(1);
    expect(digestAt(CUT.race)).toBeGreaterThan(0.2);
    // Behind the bird until "twice", past it and whole in frame on "FAST".
    expect(coyoteLeadAt(CUT.race)).toBeLessThan(-800);
    expect(coyoteLeadAt(COYOTE_AT)).toBeLessThan(-450);
    expect(coyoteLeadAt(TWICE_AT)).toBeLessThan(-350);
    expect(coyoteLeadAt(FAST_AT + 0.26)).toBeGreaterThan(300);
    expect(birdXAt(FAST_AT + 0.26)).toBeLessThan(birdXAt(TWICE_AT));
    // It looks back and brakes, and is left behind, off the frame, before the hook's drawing fades in.
    expect(skidAt(SKID_AT)).toBe(0);
    expect(skidAt(SKID_AT + 0.2)).toBe(1);
    expect(lookBackAt(SKID_AT + 0.1)).toBe(1);
    expect(lookBackAt(GOOD_AT + 0.1)).toBe(0);
    for (let u = SKID_AT + 0.02; u < PUSH.fade; u += FRAME) expect(coyoteLeadAt(u + FRAME), `slide at ${u}`).toBeLessThan(coyoteLeadAt(u));
    expect(birdXAt(PUSH.fade) + coyoteLeadAt(PUSH.fade) + 400).toBeLessThan(0);
  });

  it('plants each foot on the ground and bends the ankle backwards, strutting and running', () => {
    for (const g of [STRUT, RUN]) {
      const [a, b] = [footAt(g, 0.01), footAt(g, g.stance - 0.01)];
      expect(a.foot.y).toBe(g.ground);
      expect(b.foot.y).toBe(g.ground);
      // A planted foot moves back with the ground.
      const speed = (a.foot.x - b.foot.x) / ((g.stance - 0.02) * STEP_S);
      expect(speed).toBeCloseTo(speedOf(g, STEP_S), 3);
      for (let i = 0; i < 40; i++) {
        const f = footAt(g, i / 40).foot;
        const knee = { x: 120, y: 80 };
        const k = ankleOf(knee, f);
        expect((f.x - knee.x) * (k.y - knee.y) - (f.y - knee.y) * (k.x - knee.x), `phase ${i / 40}`).toBeGreaterThan(0);
        expect(f.y).toBeLessThanOrEqual(g.ground);
      }
    }
  });

  it('fades the credit in from 40%, gone 0.6 s before the loop point, and shows the speeds (both units) only in the coyote beat', () => {
    for (const t of FRAMES.filter((f) => f < 0.4 * LOOP_S || f >= LOOP_S - 0.6)) expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    expect(creditAt(10, LOOP_S, CREDIT.from)).toBeGreaterThan(0);
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    for (const s of SPEEDS) expect(s.text).toMatch(/\d+ mph \(\d+ km\/h\)/);
    for (const t of FRAMES.filter((f) => speedsAt(f) > 0)) {
      expect(sceneAt(t), `speeds at ${t}`).toBe('race');
      expect(t).toBeLessThan(GOOD_AT + 0.1);
    }
    expect(speedsAt(FAST_AT)).toBe(1);
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

  it('says what was checked, nothing gory, and nothing of the cartoon', () => {
    const said = WORDS.map((w) => w.text.toLowerCase()).join(' ');
    for (const claim of ['by the head', 'slams it on the ground', 'tail hanging out of its mouth', 'over an hour', 'twice as fast']) expect(said.replace(/[…!.,?]/g, '')).toContain(claim);
    for (const word of ['blood', 'dead', 'kill', 'acme', 'beep', 'wile', 'looney']) expect(said).not.toContain(word);
  });

  it('keeps every word between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    expect(top(TEXT.hook.y, TEXT.hook.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.hook.y + (HOOK_LINES - 1) * TEXT.hook.gap, TEXT.hook.size)).toBeLessThan(1250);
    expect(top(TEXT.line.y, TEXT.line.size)).toBeGreaterThan(270);
    for (const s of SPEEDS) {
      expect(top(s.y, SPEED_SIZE)).toBeGreaterThan(bottom(TEXT.line.y, TEXT.line.size) - 1);
      expect(bottom(s.y, SPEED_SIZE)).toBeLessThan(1250);
    }
  });

  it('plays every sound inside the loop, quietly under the voice', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.7);
    }
  });
});
