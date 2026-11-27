import { describe, expect, it } from 'vitest';
import {
  AT, CAPTION_ROWS, CAPTION_ROWS_HIGH, CREDIT, hookCam, dewyExit, dewyOn, GOLD_BASE, LOOP_S, RINGS, said, seaplaneAt, shellAt, shotsAt, sonOnBeach, sonPeek, spokenAt, stateAt, worldCam,
} from '../dev/promo/crabmaldives/story';
import { TEMPO, WORDS } from '../dev/promo/crabmaldives/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const SCRIPT = 'This is where my son and I saw our first hermit crab. The Maldives! A little shell… with LEGS. He was hooked. '
  + 'So when I made him a hermit crab game… level one HAD to be this beach. Seaplane, water villas, palm trees… the place it all began.';
const TEXT_TOP = 270;
const TEXT_BOTTOM = 1250;

/** Every number rounded, so periodic motion compares equal across the loop point. */
const rounded = (v: unknown): unknown => {
  if (typeof v === 'number') return Math.round(v * 1e6) / 1e6;
  if (Array.isArray(v)) return v.map(rounded);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rounded(x)]));
  return v;
};

describe('promo short: my son found his first hermit crab here (Dewy, narrated)', () => {
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
    expect(WORDS[WORDS.length - 1]!.end).toBeLessThan(LOOP_S);
    expect(WORDS[WORDS.length - 1]!.end).toBeCloseTo(LOOP_S - 0.3, 1);
    expect(TEMPO).toBeGreaterThanOrEqual(1);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the picture at t = 0 equals the picture at t = LOOP_S, and nothing jumps just before it', () => {
    expect(rounded(stateAt(LOOP_S))).toEqual(rounded(stateAt(0)));
    expect(stateAt(0).shots).toEqual({ under: 'beach', over: null, u: 0 });
    const [a, b] = [sonOnBeach(LOOP_S - 1 / 30, hookCam(LOOP_S - 1 / 30))!, sonOnBeach(0, worldCam(0))!];
    expect(Math.abs(a.x - b.x)).toBeLessThan(1);
    expect(Math.abs(a.y - b.y)).toBeLessThan(3);
    expect(Math.abs(a.height - b.height)).toBeLessThan(1);
    expect(Math.abs(worldCam(LOOP_S - 1 / 30).gold - worldCam(0).gold)).toBeLessThan(0.02);
    expect(worldCam(0).gold).toBeCloseTo(GOLD_BASE, 6);
  });

  it('frame 1 proves the title: the son big with his crab on the painted beach, no Dewy, no game, no credit', () => {
    const s = stateAt(0.3);
    expect(s.son?.key).toBe('hold-crab');
    // At least a third of the frame tall (the drawing is about 0.8 as wide as tall).
    expect(s.son!.height).toBeGreaterThan(1920 / 2);
    expect(s.cam.game).toBe(0);
    expect(s.dewy).toBe(false);
    expect(creditAt(0.3, LOOP_S)).toBe(0);
  });

  it('matches the picture to the words', () => {
    // "The Maldives!": in on the lagoon (the son slid aside) as the seaplane glides in low across it.
    expect(worldCam(said('Maldives!')).s).toBeGreaterThan(worldCam(0).s);
    expect(sonOnBeach(said('Maldives!') + 0.3, worldCam(said('Maldives!') + 0.3))!.x).toBeLessThan(0);
    const plane = seaplaneAt(said('Maldives!'), worldCam(said('Maldives!')))!;
    expect(plane.x).toBeGreaterThan(300);
    expect(plane.x).toBeLessThan(1080);
    // "A little shell…": a still shell, no legs; "with LEGS.": out and walking.
    expect(shotsAt(said('shell…')).under).toBe('shell');
    expect(shellAt(said('shell…')).out).toBe(0);
    expect(shellAt(said('LEGS.') + 0.3).out).toBeGreaterThan(0.8);
    expect(shellAt(said('LEGS.') + 0.5).walking).toBe(true);
    // "He was hooked.": the son nose to his crab; Dewy only on his "I made" lines.
    expect(shotsAt(said('hooked.')).under).toBe('peek');
    expect(sonPeek(said('hooked.')).key).toBe('peek');
    expect(dewyOn(said('hooked.'))).toBe(false);
    expect(dewyOn(said('made'))).toBe(true);
    // "level one…": the beach is the game; "Seaplane, water villas, palm trees": a ring on each as it's named.
    expect(shotsAt(said('level')).under).toBe('beach');
    expect(worldCam(said('one')).game).toBeGreaterThan(0.5);
    expect(worldCam(said('beach.')).game).toBe(1);
    expect(RINGS.map((r) => r.at)).toEqual([said('Seaplane,'), said('water'), said('palm')]);
    expect(seaplaneAt(said('Seaplane,'), worldCam(said('Seaplane,')))).not.toBeNull();
    // "the place it all began.": golden, Dewy gone, the son back.
    expect(worldCam(said('place')).gold).toBeGreaterThan(0.6);
    expect(dewyOn(said('all'))).toBe(false);
    expect(dewyExit(said('place'))).toBeGreaterThan(0);
    expect(shotsAt(said('began.')).under).toBe('hook');
    expect(sonOnBeach(said('began.'), hookCam(said('began.')))?.key).toBe('hold-crab');
  });

  it('keeps every caption and the credit inside the safe band', () => {
    for (const r of [...CAPTION_ROWS, ...CAPTION_ROWS_HIGH]) {
      expect(r.y - r.size).toBeGreaterThan(TEXT_TOP - 40);
      expect(r.y).toBeLessThan(TEXT_BOTTOM);
    }
    expect(CREDIT.y - CREDIT.size * 0.8).toBeGreaterThan(TEXT_TOP);
    expect(CREDIT.low.y).toBeLessThan(TEXT_BOTTOM);
    for (let t = 0; t < LOOP_S; t += 0.1) {
      for (const row of spokenAt(t)) {
        expect(row.words.length).toBeGreaterThan(0);
        expect(row.y).toBeLessThan(TEXT_BOTTOM);
      }
    }
    // Phrase captions: the first line shows whole from frame 1.
    expect(spokenAt(0).map((r) => r.words.join(' '))).toEqual(['This is where my son and I', 'saw our first hermit crab.']);
    expect(creditAt(LOOP_S - 0.5, LOOP_S)).toBe(0);
    expect(AT.dewyIn).toBeLessThan(said('So'));
  });
});
