import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { boilAt } from '../dev/promo/sprites';
import { rollAt, stageAt, stateAt } from '../dev/promo/hognose/stage';
import {
  AT, captionAt, CREDIT, CTA, CTA_AT, CTA_END, ctaAt, CUT, endOf, HOOK_LINES, hookAlpha, LAST_END, LINE_WORDS, LINES, LOOP_S, RETURN, SOUNDS, startOf, TEXT, wrap,
} from '../dev/promo/hognose/story';
import { TEMPO, WORDS } from '../dev/promo/hognose/words';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);
const text = (i: number): string => LINES[i]!.words.map((w) => w.text).join(' ');

describe('promo short: the hognose that fakes its own death (narrated, InkSnake)', () => {
  it('is 21 s, a multiple of 1.5 s, and the voice ends about 0.3 s before the loop point', () => {
    expect(LOOP_S).toBe(21);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
    expect(WORDS[WORDS.length - 1]!.text).toBe('how');
    expect(LOOP_S - LAST_END).toBeCloseTo(0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    const [start, end] = [stateAt(0), stateAt(END)];
    expect(Object.keys(end)).toEqual(Object.keys(start));
    for (const key of Object.keys(start)) {
      if (typeof start[key] === 'string') expect(end[key], key).toBe(start[key]);
      else expect(end[key] as number, key).toBeCloseTo(start[key] as number, 2);
    }
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
  });

  it('opens on frame 1 whatever the sound: low on the sand, belly-up, mouth open, tongue out, the fox over it, the hook in full', () => {
    const s = stageAt(0);
    expect(s.view).toBe('low');
    expect(s.snake.headRoll).toBe(1);
    expect(s.snake.roll).toBe(1);
    expect(s.snake.mouth).toBe('open');
    expect(s.snake.tongue).toBeGreaterThan(0.9);
    expect(s.snake.dead).toBe(1);
    expect(s.fox.pose).toBe('crouch');
    expect(s.fx.stink).toBeGreaterThan(0);
    expect(s.fx.stink).toBeLessThan(0.9);
    expect(hookAlpha(0)).toBe(1);
    expect([text(0), text(1)]).toEqual(['This snake fakes', 'its own DEATH!']);
    expect(ctaAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.from)).toBe(0);
  });

  it('tells it in order: the fox arrives, the bluff, the roll, the stink, the nudge, rolled back, the leaving, the peek, the return', () => {
    const order = [CUT.arrive, AT.fox, AT.bluff, AT.neck, AT.hiss, AT.notBuying, AT.rolls, AT.tongue, AT.stinks, AT.flip, AT.backOver, AT.rollsAgain, AT.back, AT.drama, AT.peeks, AT.clear, RETURN];
    for (let i = 1; i < order.length; i++) expect(order[i]!).toBeGreaterThan(order[i - 1]!);
    expect(stageAt(AT.neck + 0.6).snake.hood).toBeGreaterThan(0.9);
    expect(stageAt(AT.neck - 0.3).snake.hood).toBe(0);
    expect(stageAt(AT.hiss + 0.1).fx.hiss).toBe(1);
    // It hisses with its mouth shut; only playing dead opens it.
    expect(stageAt(AT.hiss + 0.1).snake.mouth).toBe('shut');
    expect(stageAt(AT.neck + 0.7).snake.mouth).toBe('shut');
    expect(stageAt(AT.shows).snake.roll).toBe(0);
    expect(stageAt(AT.tongue + 0.5).snake.roll).toBe(1);
    expect(stageAt(AT.tongue + 0.5).snake.tongue).toBe(1);
    expect(stageAt(AT.stinks + 0.5).fx.stink).toBe(1);
    expect(rollAt(AT.flip)).toBe(1);
    expect(rollAt(AT.backOver + 0.6)).toBe(0);
    expect(rollAt(AT.back + 0.2)).toBe(1);
    // It peeks first (the head turns up and lifts while the body lies belly up), then rolls right side up.
    expect(rollAt(AT.peeks + 0.4)).toBe(1);
    expect(stageAt(AT.peeks + 0.4).snake.headRoll).toBe(0);
    expect(stageAt(AT.peeks + 0.4).snake.lift).toBeGreaterThan(0.5);
    expect(stageAt(AT.peeks + 0.4).snake.mouth).toBe('shut');
    expect(rollAt(AT.clear)).toBe(0);
    expect(stageAt(AT.stinks + 0.1).fox.pose).toBe('startle');
    expect(stageAt(AT.stinks + 0.1).fx.bangFox).toBeGreaterThan(0.5);
  });

  it('shows the arrival and the bluff from above, every death beat low on the sand', () => {
    for (const t of [AT.fox, AT.neck, AT.hiss, AT.notBuying]) expect(stageAt(t).view, `at ${t}`).toBe('top');
    for (const t of [0.3, AT.rolls, AT.tongue, AT.stinks, AT.flip, AT.back, AT.peeks, RETURN + 0.5]) expect(stageAt(t).view, `at ${t}`).toBe('low');
    expect(CUT.low).toBeLessThan(startOf(23));
    expect(CUT.low).toBeGreaterThan(endOf(22));
  });

  it('turns over smoothly: the roll and the body never jump from one frame to the next, except at the two cuts', () => {
    for (const t of FRAMES) {
      const next = t + FRAME;
      if ((t < CUT.arrive && next >= CUT.arrive - 0.05) || (t < CUT.low && next >= CUT.low - 0.05) || next >= LOOP_S) continue;
      expect(Math.abs(rollAt(next) - rollAt(t)), `roll at ${t}`).toBeLessThan(0.4);
      const [a, b] = [stageAt(t), stageAt(next)];
      expect(Math.abs(b.snake.dead - a.snake.dead), `dead at ${t}`).toBeLessThan(0.2);
      expect(Math.abs(b.snake.hood - a.snake.hood), `hood at ${t}`).toBeLessThan(0.2);
      // From above in board units, low in screen px.
      expect(Math.hypot(b.fox.x - a.fox.x, b.fox.y - a.fox.y), `fox at ${t}`).toBeLessThan(a.view === 'top' ? 12 : 90);
      expect(Math.abs(b.snake.headRoll - a.snake.headRoll), `head at ${t}`).toBeLessThan(0.4);
    }
  });

  it('keeps the camera still across the loop seam and cuts only twice', () => {
    for (const t of [0, 1, 2]) expect(stageAt(t).cam).toEqual(stageAt(END).cam);
    const jumps = FRAMES.filter((t) => t + FRAME < LOOP_S && Math.abs(stageAt(t + FRAME).cam.s - stageAt(t).cam.s) > 0.5);
    expect(jumps.length).toBeLessThanOrEqual(2);
  });

  it('keeps the call to action to the last seconds, gone before the fox comes back', () => {
    for (const t of FRAMES.filter((f) => f < CTA_AT)) {
      expect(ctaAt(t), `cta at ${t}`).toBe(0);
      expect(creditAt(t, LOOP_S, CREDIT.from), `credit at ${t}`).toBe(0);
    }
    expect(LOOP_S - CTA_AT).toBeGreaterThan(2.5);
    expect(LOOP_S - CTA_AT).toBeLessThan(3.6);
    expect(CTA_END).toBeLessThan(RETURN);
    expect(ctaAt((CTA_AT + CTA_END) / 2)).toBe(1);
    expect(creditAt((CTA_AT + CTA_END) / 2, LOOP_S, CREDIT.from)).toBeGreaterThan(0);
    for (const t of FRAMES.filter((f) => f >= CTA_END)) expect(ctaAt(t), `cta at ${t}`).toBe(0);
    expect(CREDIT.text).toBe('InkSnake · 16bit.ink/snake');
    expect(CTA.big.text).toBe('10 levels free');
    expect(CTA.small.text).toBe('tap the channel name');
    expect(CTA.arrow.from.y).toBeGreaterThan(CTA.small.y);
  });

  it('cuts the voice into lines that follow WORDS, highlighting the word being said', () => {
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

  it('never says what a hognose short must not: no blood, no bite, no hand', () => {
    const said = WORDS.map((w) => w.text.toLowerCase()).join(' ');
    for (const word of ['blood', 'bite', 'hand', 'venom', 'poison', 'killed']) expect(said).not.toContain(word);
  });

  it('keeps every word and the call to action between y 270 and 1250', () => {
    const top = (baseline: number, size: number): number => baseline - size * 0.8;
    const bottom = (baseline: number, size: number): number => baseline + size * 0.3;
    expect(top(TEXT.hook.y, TEXT.hook.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.hook.y + (HOOK_LINES - 1) * TEXT.hook.gap, TEXT.hook.size)).toBeLessThan(1250);
    expect(top(TEXT.line.y, TEXT.line.size)).toBeGreaterThan(270);
    expect(bottom(TEXT.line.y, TEXT.line.size)).toBeLessThan(1250);
    for (const l of [CTA.big, CTA.small]) {
      expect(top(l.y, l.size)).toBeGreaterThan(270);
      expect(bottom(l.y, l.size)).toBeLessThan(1250);
    }
  });

  it('plays every sound inside the loop, quietly under the voice', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.7);
    }
    expect(SOUNDS.some((s) => s.id === 'strike' && Math.abs(s.t - AT.hiss) < 0.3)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'bump' && Math.abs(s.t - AT.back) < 0.3)).toBe(true);
  });
});
