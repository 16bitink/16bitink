import { describe, expect, it } from 'vitest';
import {
  AT, beachCrabAt, beachTime, buriedAt, CAPTION, CREDIT, CREDIT_Y, DIGS, digEffort, digsDone, dewyAt, gameCrabAt, glintAt, HOLE, kidAt, LINES, LOOP_S, puzzleAt, said, shotsAt,
  sonAt, spokenAt, squeezeAt, stateAt, treasureAt,
} from '../dev/promo/crabtreasure/story';
import { inVoice, LAUGH, TEMPO, WORDS } from '../dev/promo/crabtreasure/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';

const FRAME = 1 / 30;
const SCRIPT = 'My son loves two things. Hermit crabs… and digging for TREASURE! So what\'s treasure to a hermit crab? A BIGGER shell! '
  + 'It can\'t grow its own… so it has to FIND one. So I built him a game where you\'re the crab… digging for your next home. And it all started because…';
const TEXT_TOP = 270;
const TEXT_BOTTOM = 1250;
const CREDIT_IN = CREDIT.inAt;

const keys = (t: number): string[] => sonAt(beachTime(t)).map((l) => l.key);

describe('promo short: my son loves two things, so I made him a game (Dewy, narrated)', () => {
  it('lasts a whole number of video frames, line-boil cycles and 1.5 s beats, 18–19.5 s', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    expect(LOOP_S).toBeGreaterThanOrEqual(18);
    expect(LOOP_S).toBeLessThanOrEqual(19.5);
  });

  it('has the script word for word, in order, inside the loop and ending ~0.3 s before the loop point', () => {
    expect(WORDS.map((w) => w.text).join(' ')).toBe(SCRIPT);
    WORDS.forEach((w, i) => {
      expect(w.end).toBeGreaterThan(w.start);
      if (i > 0) expect(w.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end);
    });
    expect(inVoice(WORDS[0]!.start)).toBeGreaterThanOrEqual(0);
    expect(inVoice(WORDS[WORDS.length - 1]!.end)).toBeLessThan(LOOP_S);
    expect(inVoice(WORDS[WORDS.length - 1]!.end)).toBeCloseTo(LOOP_S - 0.3, 1);
    expect(TEMPO).toBeGreaterThanOrEqual(1);
    expect(TEMPO).toBeLessThanOrEqual(1.13);
    expect(LAUGH.start).toBeGreaterThan(said('home.'));
    expect(LAUGH.end).toBeLessThanOrEqual(said('And'));
  });

  it('loops: the state at t = 0 equals the state at t = LOOP_S', () => {
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    expect(shotsAt(0)).toEqual({ under: 'beach', over: null, how: 'fade', u: 0 });
  });

  it('flows into the loop point: the dissolve back lands on frame 1 before it, and nothing jumps', () => {
    expect(shotsAt(LOOP_S - 1e-6).under).toBe('beach');
    expect(shotsAt(LOOP_S - 1e-6).over).toBeNull();
    expect(shotsAt(AT.back + 0.3).over).toBe('beach');
    const [a, b] = [sonAt(beachTime(LOOP_S - 1e-4)), sonAt(beachTime(0))];
    expect(a.map((l) => l.key)).toEqual(b.map((l) => l.key));
    expect(a[0]!.x).toBeCloseTo(b[0]!.x, 3);
    expect(a[0]!.tilt).toBeCloseTo(b[0]!.tilt, 2);
    const [ca, cb] = [beachCrabAt(beachTime(LOOP_S - 1e-4)), beachCrabAt(beachTime(0))];
    expect(ca.mx).toBeCloseTo(cb.mx, 3);
    expect(ca.reach).toBeCloseTo(cb.reach, 2);
    expect(ca.shell).toBe('small');
    expect(dewyAt(LOOP_S - 0.5).shown).toBe(false);
    expect(kidAt(LOOP_S - 0.5).shown).toBe(false);
  });

  it('frame 1 proves the title: the son digging and the crab peeking out right by his hole, no Dewy, no game', () => {
    const t = 0.3;
    expect(keys(t)).toEqual(['dig']);
    expect(digEffort(beachTime(t))).toBe(1);
    const crab = beachCrabAt(t);
    expect(crab.reach).toBeGreaterThan(0.3);
    expect(crab.reach).toBeLessThan(0.6);
    expect(crab.facing).toBe(-1);
    expect(crab.mx - HOLE.x).toBeLessThan(320);
    expect(crab.mx - HOLE.x).toBeGreaterThan(150);
    expect(glintAt(t)).toBe(0);
    expect(puzzleAt(t)).toBe(0);
    expect(treasureAt(t).where).toBe('none');
    expect(dewyAt(t).shown).toBe(false);
    expect(creditAt(t, LOOP_S, CREDIT_IN)).toBe(0);
  });

  it('matches the picture to the words', () => {
    // "Hermit crabs…": legs out, scuttling; he scoots up nose to it.
    expect(beachCrabAt(said('crabs…')).reach).toBeGreaterThan(0.95);
    expect(beachCrabAt(said('crabs…')).walking).toBe(true);
    expect(keys(said('crabs…') + 0.2)).toEqual(['peek']);
    // "…digging for TREASURE!": digging again, the spade hits a glint.
    expect(keys(said('digging'))).toEqual(['dig']);
    expect(digEffort(said('digging'))).toBeGreaterThan(0.8);
    expect(glintAt(said('TREASURE!') + 0.15)).toBeGreaterThan(0.9);
    // "So what's treasure to a hermit crab?": it turns to the glint, puzzled.
    expect(beachCrabAt(said('crab?')).facing).toBe(-1);
    expect(beachCrabAt(said('crab?')).reach).toBeGreaterThan(0.95);
    expect(puzzleAt(said('crab?'))).toBeGreaterThan(0.9);
    // "A BIGGER shell!": up out of the sand, held high.
    expect(treasureAt(said('BIGGER')).where).toBe('hole');
    expect(treasureAt(said('shell!')).where).toBe('paw');
    expect(keys(said('shell!'))).toEqual(['trophy']);
    // "It can't grow its own…": crammed in its small shell.
    expect(squeezeAt(said('grow'))).toBeGreaterThan(0.9);
    expect(beachCrabAt(said('grow')).fill).toBeGreaterThan(1.2);
    // "…so it has to FIND one": set down by it, and it moves in.
    expect(treasureAt(said('so') + 0.6).where).toBe('down');
    const swap = beachCrabAt(said('FIND')).swap;
    expect(swap).not.toBeNull();
    expect(swap!).toBeGreaterThan(0.1);
    expect(swap!).toBeLessThan(0.6);
    expect(beachCrabAt(said('So', 2)).shell).toBe('big');
    // "So I built him a game…": the game, and Dewy (with his son and tablet) up from the bottom.
    expect(shotsAt(said('game')).under).toBe('game');
    expect(dewyAt(said('game')).shown).toBe(true);
    expect(dewyAt(said('game')).down).toBeLessThan(0.05);
    expect(kidAt(said('crab…')).shown).toBe(true);
    expect(dewyAt(said('one.')).shown).toBe(false);
    expect(gameCrabAt(said('crab…')).walking).toBe(true);
    // "…digging for your next home.": it digs down, uncovers a buried shell, moves in.
    expect(digsDone(said('digging', 2) - 0.05)).toBe(0);
    expect(digsDone(said('home.'))).toBe(DIGS.length);
    expect(buriedAt(said('digging', 2)).shown).toBe(0);
    expect(buriedAt(said('home.')).shown).toBe(1);
    expect(gameCrabAt(said('home.') + 0.4).swap).not.toBeNull();
    expect(gameCrabAt(LAUGH.end).shell).toBe('big');
    // "[laughs] And it all started because…": Dewy laughing, then gone as frame 1 comes back.
    expect(dewyAt(LAUGH.start).changeAt).toBeLessThanOrEqual(LAUGH.start);
    expect(dewyAt(said('started')).shown).toBe(true);
    expect(dewyAt(AT.backDone).shown).toBe(false);
  });

  it('shows the spoken line from frame 1, phrase by phrase, with every word covered', () => {
    expect(spokenAt(0).map((r) => r.words.join(' '))).toEqual(['My son loves two things.']);
    expect(spokenAt(0)[0]!.current).toBe(0);
    expect(LINES.flat().map((w) => w.text)).toEqual(WORDS.map((w) => w.text));
    for (const w of WORDS) {
      const rows = spokenAt(inVoice(w.start) + 1e-3);
      expect(rows.some((r) => r.current >= 0 && r.words[r.current] === w.text)).toBe(true);
    }
    expect(spokenAt(LOOP_S - FRAME).map((r) => r.words.join(' '))).toEqual(['And it all started because…']);
  });

  it('keeps its words (and the credit) between y 270 and 1250', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      for (const r of spokenAt(t)) {
        expect(r.y).toBeLessThanOrEqual(TEXT_BOTTOM);
        expect(r.y - r.size * 0.8).toBeGreaterThanOrEqual(TEXT_TOP);
      }
    }
    expect(CAPTION.y).toBeLessThan(CREDIT_Y);
    expect(CREDIT_Y).toBeLessThanOrEqual(TEXT_BOTTOM);
  });

  it('keeps the credit (with the short link) off the hook and gone before the loop point', () => {
    expect(CREDIT.text).toBe('InkCrab · 16bit.ink/crab');
    for (let t = 0; t < CREDIT_IN * LOOP_S; t += FRAME) expect(creditAt(t, LOOP_S, CREDIT_IN)).toBe(0);
    expect(creditAt(said('game'), LOOP_S, CREDIT_IN)).toBeGreaterThan(0.7);
    expect(creditAt(LOOP_S - 0.6, LOOP_S, CREDIT_IN)).toBe(0);
  });
});
