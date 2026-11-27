import { describe, expect, it } from 'vitest';
import {
  AT, BURIED, camAt, chamberAt, closeClock, closeCrab, CREDIT, dampAt, dewyShowing, DIG_ROT, digDepthAt, dugTiles, fillAt, gameCrabAt, LINES, LOOP_S, moveAt,
  NEW_HOME, nightAt, OWN_SHELL, said, settleAt, shotsAt, skinAt, sonDigAt, sonTrophyAt, spokenAt,
} from '../dev/promo/crabdig/story';
import { inVoice, TEMPO, WORDS } from '../dev/promo/crabdig/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS } from '../dev/promo/sprites';
import { BOIL } from '../src/art/palette';
import { SHELLS } from '../src/logic/shells';

const FRAME = 1 / 30;
const SCRIPT = 'Land hermit crabs DIG. To grow, a land hermit crab often buries itself in damp sand… sheds its old skin… and stays hidden for WEEKS. '
  + 'My son loves digging for treasure… so in the game I made him, you dig too. Tunnels, buried shells… and the treasure every crab wants: a BIGGER home!';
const TEXT_TOP = 270;
const TEXT_BOTTOM = 1250;

describe('promo short: land hermit crabs bury themselves to grow (Dewy, narrated)', () => {
  it('lasts a whole number of video frames, line-boil cycles and 1.5 s beats', () => {
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
    expect(inVoice(WORDS[0]!.start)).toBeGreaterThanOrEqual(0);
    expect(inVoice(WORDS[WORDS.length - 1]!.end)).toBeCloseTo(LOOP_S - 0.3, 1);
    expect(TEMPO).toBeGreaterThan(1);
    expect(TEMPO).toBeLessThan(1.13);
  });

  it('loops: the last dissolve lands on frame 1 and nothing jumps', () => {
    expect(shotsAt(0)).toEqual({ under: 'close', over: null, u: 0, how: 'wash' });
    const last = shotsAt(LOOP_S - 1e-6);
    expect(last.over).toBe('close');
    expect(last.u).toBeCloseTo(1, 4);
    const [a, b] = [closeClock(LOOP_S - 1e-6), closeClock(0)];
    expect(a).toBeCloseTo(b, 4);
    expect(closeCrab(a).at.x).toBeCloseTo(closeCrab(b).at.x, 2);
    expect(closeCrab(a).at.y).toBeCloseTo(closeCrab(b).at.y, 2);
    expect(closeCrab(a).rot).toBeCloseTo(closeCrab(b).rot, 4);
    expect(camAt(a)).toEqual(camAt(b));
    expect(digDepthAt(a)).toBeCloseTo(digDepthAt(b), 2);
    // The crab digs on smoothly through the seam: no step from frame to frame.
    for (let t = AT.back - LOOP_S; t < 2.3; t += FRAME) expect(Math.abs(digDepthAt(t + FRAME) - digDepthAt(t))).toBeLessThan(4);
  });

  it('frame 1 proves the title: the crab big, head down, digging, nothing else', () => {
    const crab = closeCrab(0.3);
    expect(crab.dig).toBe(1);
    expect(crab.rot).toBeCloseTo(DIG_ROT, 6);
    expect(crab.at.y).toBeGreaterThan(300);
    expect(camAt(0.3).zoom).toBe(1);
    expect(nightAt(0.3)).toBe(0);
    expect(skinAt(0.3)).toBeNull();
    expect(sonDigAt(0.3)).toBeNull();
    expect(dewyShowing(0.3)).toBe(false);
    expect(creditAt(0.3, LOOP_S, CREDIT.inAt)).toBe(0);
  });

  it('matches the picture to the words', () => {
    // It buries itself: settles in the chamber, the tunnel fills in over it, the sand goes damp.
    expect(chamberAt(said('buries'))).toBeGreaterThan(0.9);
    expect(settleAt(said('itself'))).toBeGreaterThan(0.8);
    expect(fillAt(said('sheds'))).toBeGreaterThan(digDepthAt(2.6) + 80);
    expect(dampAt(said('sand…'))).toBeGreaterThan(0.6);
    // The old skin comes off on "sheds", and is off beside it by "skin".
    expect(skinAt(said('sheds') - 0.05)).toBeNull();
    expect(skinAt(said('skin…'))!.alpha).toBeGreaterThan(0.9);
    // Days and nights race past on "hidden for WEEKS", while the crab stays put.
    let darkest = 0;
    for (let t = said('and'); t < said('WEEKS.') + 0.4; t += FRAME) darkest = Math.max(darkest, nightAt(t));
    expect(darkest).toBeGreaterThan(0.95);
    expect(closeCrab(said('and')).at).toEqual(closeCrab(said('WEEKS.')).at);
    // The son digs on "My son"; the game washes in on "so"; Dewy is up only for his lines.
    expect(sonDigAt(said('son'))!.key).toBe('dig');
    expect(shotsAt(said('game')).under).toBe('game');
    expect(dewyShowing(said('made'))).toBe(true);
    expect(dewyShowing(said('BIGGER'))).toBe(false);
    expect(dewyShowing(said('son'))).toBe(false);
    // You dig: the crab is down a tunnel by "too." and it branches on "Tunnels".
    expect(gameCrabAt(said('too.')).y).toBeGreaterThan(2);
    expect(dugTiles(said('shells…')).size).toBeGreaterThan(dugTiles(said('Tunnels,')).size);
    // Each buried shell glints as "buried shells" is said.
    for (const b of BURIED) {
      expect(b.glint).toBeGreaterThanOrEqual(said('buried'));
      expect(b.glint).toBeLessThan(said('shells…') + 0.5);
    }
    // A BIGGER home: the new shell is bigger than its own, it moves in on "BIGGER", and the son cheers.
    expect(SHELLS[NEW_HOME.kind].maxSize).toBeGreaterThanOrEqual(NEW_HOME.size);
    expect(NEW_HOME.size).toBeGreaterThan(OWN_SHELL.size + 1);
    expect(moveAt(said('BIGGER') - 0.5)).toBe(0);
    expect(moveAt(said('home!'))).toBeGreaterThan(0.5);
    expect(sonTrophyAt(said('BIGGER'))!.key).toBe('trophy');
  });

  it('shows the spoken line from frame 1, phrase by phrase, with every word covered', () => {
    expect(spokenAt(0).map((r) => r.words.join(' '))).toEqual(['Land hermit crabs DIG.']);
    expect(LINES.flatMap((l) => l.rows.flat()).map((w) => w.text)).toEqual(WORDS.map((w) => w.text));
    for (const w of WORDS) {
      const rows = spokenAt(inVoice(w.start) + 1e-3);
      expect(rows.some((r) => r.current >= 0 && r.words[r.current] === w.text)).toBe(true);
    }
    expect(spokenAt(LOOP_S - FRAME).map((r) => r.words.join(' '))).toEqual(['and the treasure every crab wants:', 'a BIGGER home!']);
  });

  it('keeps its words between y 270 and 1250', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      for (const r of spokenAt(t)) {
        expect(r.y).toBeLessThanOrEqual(TEXT_BOTTOM);
        expect(r.y - r.size * 0.8).toBeGreaterThanOrEqual(TEXT_TOP);
      }
    }
  });

  it('keeps the credit (with the short link) off the hook and gone before the loop point', () => {
    expect(CREDIT.text).toBe('InkCrab · 16bit.ink/crab');
    for (let t = 0; t < CREDIT.inAt * LOOP_S; t += FRAME) expect(creditAt(t, LOOP_S, CREDIT.inAt)).toBe(0);
    expect(CREDIT.inAt * LOOP_S).toBeGreaterThan(said('son') + 1);
    expect(creditAt(said('Tunnels,'), LOOP_S, CREDIT.inAt)).toBeGreaterThan(0.7);
    expect(creditAt(LOOP_S - 0.6, LOOP_S, CREDIT.inAt)).toBe(0);
  });
});
