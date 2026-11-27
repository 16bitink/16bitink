import { describe, expect, it } from 'vitest';
import {
  AT, beamAt, CAPTION_SIZE, CAPTION_Y, CREDIT, darknessAt, dayCrab, daySon, DEWY, dewySlide, EMERGERS, emergeAt, foragersClose, LOOP_S, PHRASE_LIST, said, shotsAt,
  SON_H, spokenAt, sunriseAt, torchSonIn, walker, waveAt, WRACK_CLOSE, WRACK_Y, wrackShown, CLOSE_SCALE, GAME_SURFACE,
} from '../dev/promo/crabnight/story';
import { footprintGlow, footprintsAt, GAME_CRAB_SCALE, gameCam, playerAt, toScreen, ZOOM } from '../dev/promo/crabnight/game';
import { TEMPO, WORDS } from '../dev/promo/crabnight/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const FRAME = 1 / 30;
const SCRIPT = "Ever since the Maldives, my son looks for hermit crabs wherever we go. Here's the trick. Look for shells that WALK. "
  + 'Check the seaweed line the waves leave behind… and come back after DARK. Most land hermit crabs come out at night. '
  + 'So the last beach in my game? A night beach, lit by glowing plankton.';
const TEXT_TOP = 270;
const TEXT_BOTTOM = 1250;

describe('promo short: how to find a hermit crab (Dewy and his son, narrated)', () => {
  it('lasts a whole number of video frames, line-boil cycles and 1.5 s beats, 18–19.5 s', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    expect(LOOP_S).toBeGreaterThanOrEqual(18);
    expect(LOOP_S).toBeLessThanOrEqual(19.5);
  });

  it('has the script word for word, in order, inside the loop, ending 0.3 s before the loop point', () => {
    expect(WORDS.map((w) => w.text).join(' ')).toBe(SCRIPT);
    WORDS.forEach((w, i) => {
      expect(w.end).toBeGreaterThan(w.start);
      if (i > 0) expect(w.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    });
    expect(WORDS[0]!.start).toBeGreaterThanOrEqual(0);
    expect(WORDS[WORDS.length - 1]!.end).toBeCloseTo(LOOP_S - 0.3, 1);
    expect(TEMPO).toBeGreaterThan(1);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the last frame is frame 1 again, nothing jumps', () => {
    const last = shotsAt(LOOP_S - 1e-6);
    expect(last.over).toBe('day');
    expect(last.u).toBeCloseTo(1, 4);
    expect(shotsAt(0)).toEqual({ under: 'day', over: null, u: 0 });
    const [a, b] = [daySon(LOOP_S - 1e-6), daySon(0)];
    expect(a.x).toBeCloseTo(b.x, 2);
    expect(a.lift).toBeCloseTo(b.lift, 1);
    expect(a.turned).toBe(b.turned);
    const [ca, cb] = [dayCrab(LOOP_S - 1e-6), dayCrab(0)];
    expect(ca.x).toBeCloseTo(cb.x, 2);
    expect(ca.out).toBe(cb.out);
    expect(sunriseAt(LOOP_S - 1e-6)).toBeCloseTo(0, 2);
    expect(spokenAt(LOOP_S - FRAME).words).toEqual(spokenAt(0).words);
  });

  it('frame 1 proves the title: the son big and searching, the crab right behind him in his footprints', () => {
    const son = daySon(0.3);
    const crab = dayCrab(0.3);
    expect(SON_H).toBeGreaterThan(1920 / 3);
    expect(son.turned).toBe(0);
    expect(crab.out).toBe(1);
    expect(crab.facing).toBe(1);
    expect(crab.x).toBeLessThan(son.x - 250);
    expect(crab.x).toBeGreaterThan(80);
    expect(shotsAt(0.3).under).toBe('day');
  });

  it('matches the picture to the words', () => {
    // "Here's the trick": the crab tucks in, then the son turns round to look.
    expect(dayCrab(said("Here's")).out).toBe(0);
    expect(daySon(said('trick.')).turned).toBe(1);
    // "Look for shells that WALK": still shells, then one stands up and walks.
    expect(shotsAt(said('shells')).under).toBe('close');
    expect(walker(said('shells')).out).toBe(0);
    expect(walker(said('WALK.') + 0.3).out).toBe(1);
    expect(walker(AT.shore).x).toBeGreaterThan(walker(said('WALK.')).x + 100);
    // The wave reaches the line on "line", and leaves the weed behind.
    expect(shotsAt(said('seaweed')).under).toBe('wrack');
    // Close and big: the walker's shell ~340 px, the foragers' ~270 px, both on screen along the line.
    expect(CLOSE_SCALE).toBeGreaterThanOrEqual(2.8);
    expect(walker(said('WALK.')).y).toBeGreaterThan(700);
    expect(walker(said('WALK.')).y).toBeLessThan(1100);
    expect(WRACK_CLOSE.crab).toBeGreaterThanOrEqual(2.3);
    for (const c of foragersClose(said('behind…'))) {
      expect(c.x).toBeGreaterThan(100);
      expect(c.x).toBeLessThan(1000);
    }
    expect(shotsAt(said('DARK.')).under).toBe('shore');
    expect(waveAt(said('line') + 0.05).front).toBeGreaterThan(WRACK_Y - 20);
    expect(wrackShown(said('behind…'))).toBeGreaterThan(0.9);
    expect(waveAt(said('and')).water).toBeLessThan(0.2);
    // Night by "DARK", the torch on for "Most", a crab coming up as each line lands.
    expect(darknessAt(said('Check'))).toBe(0);
    expect(darknessAt(said('DARK.') + 0.3)).toBe(1);
    expect(torchSonIn(said('Most'))).toBe(1);
    expect(beamAt(said('Most')).on).toBe(1);
    for (const e of EMERGERS) {
      expect(emergeAt(e, e.at).up).toBe(0);
      expect(emergeAt(e, e.at + 0.5).up).toBe(1);
      // In the torchlight as it comes up.
      const b = beamAt(e.at + 0.3);
      expect(Math.hypot(b.x - e.x, (b.y - e.y) * 2)).toBeLessThan(260);
    }
    // The game's last beach and Dewy, up as he says "my game", gone by "lit".
    expect(shotsAt(said('last')).under).toBe('game');
    expect(dewySlide(said('my', 1))).toBe(0);
    expect(dewySlide(said('lit'))).toBe(1);
    // Close on the strand for "glowing plankton": the crab big, the plankton bright under its last steps.
    const t = said('glowing');
    const cam = gameCam(t);
    expect(cam.z).toBeCloseTo(ZOOM, 3);
    expect(GAME_CRAB_SCALE * ZOOM).toBeGreaterThanOrEqual(3.2);
    const crab = toScreen(cam, playerAt(t));
    expect(crab.x).toBeGreaterThan(200);
    expect(crab.x).toBeLessThan(900);
    expect(crab.y).toBeGreaterThan(950);
    expect(crab.y).toBeLessThan(1100);
    const fresh = footprintsAt(t).filter((f) => footprintGlow(f.age) > 0.6);
    expect(fresh.length).toBeGreaterThanOrEqual(3);
    for (const f of fresh) expect(Math.abs(f.x - playerAt(t).x)).toBeLessThan(260);
  });

  it('never hides the crab behind Dewy while he is up', () => {
    const h = (1394 / 1134) * DEWY.width;
    for (let t = AT.game; t < AT.dewyOut + 0.5; t += FRAME) {
      if (dewySlide(t) >= 1) continue;
      const cam = gameCam(t);
      const feet = toScreen(cam, { x: playerAt(t).x, y: GAME_SURFACE + 14 });
      // The bust's top (ear tips), with the rise's overshoot and the talking bob.
      const top = DEWY.y + dewySlide(t) * h * 1.1 - h * 1.013;
      const left = DEWY.x - DEWY.width / 2;
      const crabRight = feet.x + 140 * cam.z;
      expect(top > feet.y || crabRight < left).toBe(true);
    }
  });

  it('shows the spoken line from frame 1, phrase by phrase, every word covered', () => {
    expect(PHRASE_LIST.flat().map((w) => w.text)).toEqual(WORDS.map((w) => w.text));
    expect(spokenAt(0.3).words.join(' ')).toBe('Ever since the Maldives,');
    for (const w of WORDS) {
      const s = spokenAt(w.start + 1e-3);
      expect(s.words[s.current]).toBe(w.text);
    }
  });

  it('keeps its words and credit between y 270 and 1250, and the credit off the hook', () => {
    expect(CAPTION_Y).toBeLessThanOrEqual(TEXT_BOTTOM);
    expect(CAPTION_Y - CAPTION_SIZE * 0.8).toBeGreaterThanOrEqual(TEXT_TOP);
    expect(CREDIT.y).toBeLessThanOrEqual(TEXT_BOTTOM);
    expect(CREDIT.text).toBe('InkCrab · 16bit.ink/crab');
    for (let t = 0; t < CREDIT.inAt * LOOP_S; t += FRAME) expect(creditAt(t, LOOP_S, CREDIT.inAt)).toBe(0);
    expect(creditAt(said('game?'), LOOP_S, CREDIT.inAt)).toBeGreaterThan(0.7);
    expect(creditAt(LOOP_S - 0.6, LOOP_S, CREDIT.inAt)).toBe(0);
  });
});
