import { describe, expect, it } from 'vitest';
import {
  afterHeron, AT, billPoint, cheerAt, closeHeron, closeRat, CROWD, depthAt, GONE_D, HOOK_ROWS, LINES, LOOP_S, lumpAt, pondHeron, pondRat, ROW_HIGH, ROW_LOW, said,
  shotsAt, spokenAt, stateAt, swimAt, UP_A, WATER_Y,
} from '../dev/promo/heronrat/story';
import { inVoice, TEMPO, WORDS } from '../dev/promo/heronrat/words';
import { CREDIT } from '../dev/promo/heronrat/render';
import { RAT_LEN } from '../dev/promo/heronrat/art/rat';
import { GAPE_MAX } from '../dev/promo/heronrat/art/heron';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const FRAME = 1 / 30;
const SCRIPT = 'This bird swallowed a New York RAT… whole! Central Park, 2021. A great blue heron snatches a rat from the pond… dunks it… and down it goes! '
  + 'Head first… tail LAST. People actually CHEERED! Even the birder who filmed it had never seen that before, because';
const TEXT_TOP = 270;
const TEXT_BOTTOM = 1250;

describe('promo short: this bird swallowed a New York rat whole (narrated)', () => {
  it('lasts a whole number of video frames, line-boil cycles and 1.5 s beats', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
  });

  it('has the script word for word, in order, ending 0.3 s before the loop point', () => {
    expect(WORDS.map((w) => w.text).join(' ')).toBe(SCRIPT);
    WORDS.forEach((w, i) => {
      expect(w.end).toBeGreaterThan(w.start);
      if (i > 0) expect(w.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    });
    expect(inVoice(WORDS[0]!.start)).toBeGreaterThanOrEqual(0);
    expect(inVoice(WORDS[WORDS.length - 1]!.end)).toBeCloseTo(LOOP_S - 0.3, 1);
    expect(TEMPO).toBeGreaterThan(1.03);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(stateAt(0).shots.under.id).toBe('hook');
    expect(stateAt(0).shots.over).toBeNull();
  });

  it('flows into the loop point: the last dissolve lands on frame 1, nothing jumps', () => {
    const last = shotsAt(LOOP_S - 1e-6);
    expect(last.over?.id).toBe('hook');
    expect(last.how).toBe('fade');
    expect(last.u).toBeCloseTo(1, 4);
    const [a, b] = [closeHeron(-1e-6), closeHeron(0)];
    expect(a.head.x).toBeCloseTo(b.head.x, 3);
    expect(a.head.a).toBeCloseTo(b.head.a, 3);
    expect(depthAt(-1e-6)).toBeCloseTo(depthAt(0), 3);
    const [ra, rb] = [closeRat(-1e-6, a)!, closeRat(0, b)!];
    expect(ra.at.x).toBeCloseTo(rb.at.x, 2);
    expect(ra.at.y).toBeCloseTo(rb.at.y, 2);
  });

  it('frame 1 proves the title: the bill raised, the rat big and going in head first, its tail out', () => {
    const heron = closeHeron(0.3);
    const rat = closeRat(0.3, heron)!;
    expect(heron.head.a).toBeLessThan(-0.7);
    expect(heron.head.gape).toBeGreaterThan(0.3);
    expect(rat.clip).toBe('gape');
    // In the mouth: snout back down the throat, on the line halfway between the open mandibles; the throat bulging.
    expect(rat.angle).toBeCloseTo(heron.head.a + (GAPE_MAX * heron.head.gape) / 2 + Math.PI, 9);
    expect(heron.head.throat).toBeGreaterThan(0.5);
    const d = depthAt(0.3);
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(80);
    // Its tail hangs down by gravity.
    expect(rat.pose.taut).toBe(0);
    expect(rat.pose.wet).toBeGreaterThan(0);
    expect(rat.k * RAT_LEN).toBeGreaterThan(400);
  });

  it('matches the picture to the words', () => {
    expect(shotsAt(said('Central')).under.id).toBe('pond');
    // The rat swims in, the bill reaches it on "snatches", lifts it on "rat", dunks it on "dunks".
    expect(pondRat(said('Park,'), pondHeron(said('Park,'))).clip).toBe('water');
    const strike = pondHeron(AT.strike + 0.12);
    const tip = billPoint(strike, 1);
    expect(Math.hypot(tip.x - swimAt(AT.strike).x, tip.y - swimAt(AT.strike).y)).toBeLessThan(60);
    const lifted = pondHeron(said('pond…'));
    expect(pondRat(said('pond…'), lifted).at.y).toBeLessThan(WATER_Y - 100);
    const dunked = pondHeron(AT.dunk + 0.2);
    expect(pondRat(AT.dunk + 0.2, dunked).at.y).toBeGreaterThan(WATER_Y - 30);
    // Close in for "down it goes": tossed head first, swallowed head, then body, then tail last.
    expect(shotsAt(said('down')).under.id).toBe('gulp');
    expect(closeHeron(AT.toss + 0.4).head.a).toBeCloseTo(UP_A, 1);
    expect(depthAt(said('Head'))).toBeLessThan(depthAt(said('tail')));
    const tail = closeRat(said('tail') + 0.2, closeHeron(said('tail') + 0.2))!;
    expect(tail.pose.taut).toBeGreaterThan(0);
    expect(tail.pose.taut).toBeLessThan(0.4);
    expect(closeRat(said('LAST.') + 0.4, closeHeron(said('LAST.') + 0.4))).toBeNull();
    expect(depthAt(said('LAST.') + 0.4)).toBeGreaterThanOrEqual(GONE_D - 1);
    // The lump goes down the neck after it.
    expect(lumpAt(said('People')).size).toBeGreaterThan(0.5);
    expect(lumpAt(said('birder')).at).toBeGreaterThan(lumpAt(said('People')).at);
    expect(afterHeron(said('birder'), 0, 0, 1).lump.size).toBeGreaterThan(0.5);
    // People with their phones, arms up on "CHEERED!"; then the birder's phone.
    expect(shotsAt(said('People')).under.id).toBe('crowd');
    for (const c of CROWD) {
      expect(cheerAt(said('People'), c.delay)).toBe(0);
      expect(cheerAt(said('CHEERED!') + 0.35, c.delay)).toBeGreaterThan(0.8);
    }
    expect(shotsAt(said('birder')).under.id).toBe('birder');
  });

  it('shows the spoken line from frame 1, word by word, with every word covered', () => {
    expect(spokenAt(0).map((r) => r.words.join(' '))).toEqual(['This bird swallowed', 'a New York RAT… whole!']);
    expect(spokenAt(0)[0]!.current).toBe(0);
    expect(LINES.flat().map((w) => w.text)).toEqual(WORDS.map((w) => w.text));
    for (const w of WORDS) {
      const rows = spokenAt(inVoice(w.start) + 1e-3);
      expect(rows.some((r) => r.current >= 0 && r.words[r.current] === w.text)).toBe(true);
    }
    expect(spokenAt(LOOP_S - FRAME).map((r) => r.words.join(' '))).toEqual(['because']);
  });

  it('keeps its words between y 270 and 1250', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      for (const r of spokenAt(t)) {
        expect(r.y).toBeLessThanOrEqual(TEXT_BOTTOM);
        expect(r.y - r.size * 0.8).toBeGreaterThanOrEqual(TEXT_TOP);
      }
    }
    for (const r of [...HOOK_ROWS, ROW_LOW, ROW_HIGH]) expect(r.y).toBeLessThanOrEqual(TEXT_BOTTOM);
  });

  it('keeps the credit (with the short link) off the hook and gone before the loop point', () => {
    expect(CREDIT.text).toBe('InkCrab · 16bit.ink/crab');
    expect(CREDIT.inAt).toBeGreaterThan(0.4);
    expect(CREDIT.inAt).toBeLessThan(0.55);
    for (let t = 0; t < CREDIT.inAt * LOOP_S; t += FRAME) expect(creditAt(t, LOOP_S, CREDIT.inAt)).toBe(0);
    expect(creditAt(said('Head'), LOOP_S, CREDIT.inAt)).toBeGreaterThan(0.7);
    expect(creditAt(LOOP_S - 0.6, LOOP_S, CREDIT.inAt)).toBe(0);
    expect(creditAt(0, LOOP_S, CREDIT.inAt)).toBe(0);
  });
});
