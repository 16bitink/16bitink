import { describe, expect, it } from 'vitest';
import { FPS_LONG } from '../dev/promo/descent/frame';
import { EXTRAS, GHOST_LABEL_W, GHOST_LABEL_X, GHOSTS, STANDS, TAG_MAX_W, TAG_ROW, TAG_ROWS, TAG_X, TAGS } from '../dev/promo/sharksize/facts';
import { STEPS, YOU_M, youOf } from '../dev/promo/sharksize/ladder';
import { BEATS_BY_BLOCK, END_HOLD_S, said, sectionEnd, sectionStart, T, VIDEO_S } from '../dev/promo/sharksize/timeline';
import { SECTIONS, VOICE_S, WORDS } from '../dev/promo/sharksize/words';

const W = 1920;
const H = 1080;


const IMPERIAL = /\d\s*(FT|IN|LB|MI|MPH|TONS)\b|\bFT\b|\d+ FT \d+ IN/;
const METRIC = /\d\s*(M|CM|KG|KM|KM\/H|LITRES)\b|\bLITRES\b/;

/** Every number string the data puts on screen. */
function screenStrings(): string[] {
  return [
    ...TAGS.flatMap((tg) => [tg.text, tg.sub ?? '']),
    ...GHOSTS.flatMap((g) => [g.label, g.shrink?.label ?? '']),
    ...STEPS.flatMap((s) => [s.size, s.basis]),
  ].filter((s) => s.length > 0);
}

describe('long-form: shark size comparison… but every shark is real', () => {
  it('has its narration in order, one block after another, and ends 5 s after the last word', () => {
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.start);
    for (let i = 1; i < SECTIONS.length; i++) expect(SECTIONS[i]!.start).toBeGreaterThan(SECTIONS[i - 1]!.end);
    expect(SECTIONS).toHaveLength(12);
    expect(VIDEO_S).toBeGreaterThan(VOICE_S);
    expect(Math.abs(VIDEO_S * FPS_LONG - Math.round(VIDEO_S * FPS_LONG))).toBeLessThan(1e-6);
    expect(VIDEO_S - WORDS[WORDS.length - 1]!.end).toBeCloseTo(END_HOLD_S, 0);
    expect(() => said('a word nobody says')).toThrow();
  });

  it('times every beat inside the block that says it', () => {
    expect(BEATS_BY_BLOCK).toHaveLength(12);
    for (const [b, beats] of BEATS_BY_BLOCK.entries()) {
      for (const [k, t] of Object.entries(beats)) {
        expect(t, k).toBeGreaterThanOrEqual(sectionStart(b) - 0.05);
        expect(t, k).toBeLessThanOrEqual(sectionEnd(b) + 0.05);
      }
    }
  });

  it('climbs the ladder smallest to biggest, each step and meal in its own block', () => {
    const stepBlock = [0, 1, 2, 2, 3, 5, 5, 6, 7, 8, 9, 10];
    const mealBlock = [1, 1, 2, 2, 3, 5, 5, 6, 7, 8, 9, 11];
    expect(STEPS).toHaveLength(12);
    STEPS.forEach((s, i) => {
      if (i) {
        expect(s.length, s.id).toBeGreaterThan(STEPS[i - 1]!.length);
        expect(s.from, s.id).toBeGreaterThan(STEPS[i - 1]!.from + 5);
      }
      expect(s.from + 0.3, s.id).toBeGreaterThanOrEqual(sectionStart(stepBlock[i]!) - 0.4);
      expect(s.from, s.id).toBeLessThanOrEqual(sectionEnd(stepBlock[i]!));
      expect(s.meal.at, s.id).toBeGreaterThan(s.from);
      expect(s.meal.at, s.id).toBeGreaterThanOrEqual(sectionStart(mealBlock[i]!));
      expect(s.meal.at, s.id).toBeLessThanOrEqual(sectionEnd(mealBlock[i]!) + 1);
    });
    expect(youOf(YOU_M)).toBe('1');
    expect(youOf(0.2)).toBe('0.11');
    expect(youOf(18.8)).toBe('10.7');
  });

  it('stamps every claimed size, and keeps the ghosts, extras and poses inside their windows', () => {
    for (const g of GHOSTS) {
      expect(g.until, g.label).toBeGreaterThan(g.from);
      expect(g.stampAt, g.label).toBeGreaterThanOrEqual(g.from);
      expect(g.stampAt, g.label).toBeLessThan(g.until);
      if (g.shrink) {
        expect(g.shrink.at, g.label).toBeGreaterThan(g.stampAt);
        expect(g.shrink.at, g.label).toBeLessThan(g.until);
        expect(g.shrink.length, g.label).toBeLessThan(g.length);
      }
      if (g.cross !== undefined) expect(g.cross, g.label).toBeLessThan(g.until);
    }
    expect(GHOSTS.filter((g) => g.shark === 'megalodon').every((g) => g.stamp === 'ESTIMATED')).toBe(true);
    for (const e of [...EXTRAS, ...STANDS]) expect(e.until).toBeGreaterThan(e.from);
    TAGS.forEach((tg) => {
      expect(tg.until, tg.text).toBeGreaterThan(tg.at);
      if (tg.cross !== undefined) {
        expect(tg.cross, tg.text).toBeGreaterThanOrEqual(tg.at);
        expect(tg.cross, tg.text).toBeLessThan(tg.until);
      }
      // A number on screen carries a stamp, unless it's crossed out or the hud's own line (YOU, the menu).
      if (/\d/.test(tg.text) && tg.cross === undefined && !/^(YOU|60 FT)/.test(tg.text)) expect(tg.stamp, tg.text).toBeDefined();
    });
  });

  it('shows every length and weight in both US and metric units', () => {
    for (const s of screenStrings()) {
      expect(IMPERIAL.test(s), `${s}: US units without metric`).toBe(METRIC.test(s));
    }
  });

  it('keeps the text inside the frame', () => {
    expect(TAG_X - TAG_MAX_W / 2).toBeGreaterThanOrEqual(0);
    expect(TAG_X + TAG_MAX_W / 2).toBeLessThanOrEqual(W);
    for (const y of TAG_ROWS) {
      expect(y).toBeGreaterThan(30);
      expect(y + 80).toBeLessThan(H);
    }
    TAGS.forEach((tg, i) => expect(TAG_ROW[i], `no free row for "${tg.text}"`).toBeGreaterThanOrEqual(0));
    expect(GHOST_LABEL_X[0] - GHOST_LABEL_W / 2).toBeGreaterThanOrEqual(0);
    expect(GHOST_LABEL_X[1] + GHOST_LABEL_W / 2).toBeLessThanOrEqual(W);
    // Caveat 700 runs about 0.45 em a character: the long lines must fit their boxes at full size or close to it.
    for (const tg of TAGS) expect(tg.text.length * 50 * 0.45, tg.text).toBeLessThan(TAG_MAX_W * 1.25);
  });

  it('changes something on screen at least every 15 s', () => {
    const busy: readonly (readonly [number, number])[] = [
      [T.amazon - 0.9, T.saltier], // the river maps
      [T.game - 0.2, T.fastest4 + 0.2], // the game card
      [T.lenses - 0.4, T.waiting], // the age line
      [T.every11 - 0.3, VIDEO_S], // the line-up, the game card, the end card
    ];
    const events = [
      0,
      // The cold open's fins, stamps and locked cards; the panels (panels.ts); the twist's stream and card.
      T.you0, T.twelve0, T.thirty0, T.source0, T.survive, T.this0,
      T.cookieBite, T.time2, T.saltier, T.howFast, T.bunch, T.second, T.numberOne, T.scared, T.plankton, T.sardines,
      ...STEPS.flatMap((s) => [s.from, s.meal.at]),
      ...TAGS.flatMap((tg) => [tg.at, tg.until]),
      ...GHOSTS.flatMap((g) => [g.from, g.stampAt, g.shrink?.at ?? g.from]),
      ...EXTRAS.map((e) => e.from),
      ...busy.flatMap(([a, b]) => [a, b]),
    ].filter((t) => !busy.some(([a, b]) => t > a && t < b)).sort((a, b) => a - b);
    for (let i = 1; i < events.length; i++) {
      const [a, b] = [events[i - 1]!, events[i]!];
      // A cut-in animates all through (checked on the contact sheets): only the stage's own stretches count.
      if (busy.some(([x, y]) => a >= x - 1e-9 && b <= y + 1e-9)) continue;
      expect(b - a, `quiet after ${a.toFixed(1)} s`).toBeLessThanOrEqual(15);
    }
  });
});
