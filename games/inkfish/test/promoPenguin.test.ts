import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { dot, norm, sub, unplace } from '../dev/promo/penguin/geo';
import { BILL_L, POSE0, rigsOf, SPINE_SPOTS, spinesOf, surfacesOf, THROAT_Z } from '../dev/promo/penguin/model';
import { captionAt, HOOK_ROWS, HOOK_TO, hookAt, LINES, SOUNDS, TEXT } from '../dev/promo/penguin/script';
import {
  AT, BOIL_STEPS, CUTS, fishZAt, glowAt, hookPose, LOOP_S, sceneAt, sceneFrom, shakeAt, viewAt, wrap,
} from '../dev/promo/penguin/story';
import { LOOP_S as WORDS_LOOP, TEMPO, WORDS } from '../dev/promo/penguin/words';
import { BOIL_FPS } from '../src/art/textures';

const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

describe('promo short: never look inside a penguin\'s mouth (narrated)', () => {
  it('loops on a whole number of 1.5 s beats, frames and line-boil steps', () => {
    expect(LOOP_S).toBe(WORDS_LOOP);
    expect(LOOP_S).toBe(18);
    expect(LOOP_S % 1.5).toBe(0);
    expect(Number.isInteger(LOOP_S * 30)).toBe(true);
    expect(BOIL_STEPS).toBe(LOOP_S * BOIL_FPS);
    expect(Number.isInteger(BOIL_STEPS)).toBe(true);
  });

  it('loops seamlessly: every state at the loop point equals frame 1, and the last beat runs into it', () => {
    expect(wrap(LOOP_S)).toBe(0);
    expect(sceneAt(LOOP_S)).toEqual(sceneAt(0));
    expect(viewAt(LOOP_S).pose).toEqual(viewAt(0).pose);
    expect(viewAt(LOOP_S).cam).toEqual(viewAt(0).cam);
    expect(shakeAt(LOOP_S)).toEqual(shakeAt(0));
    expect(captionAt(LOOP_S)).toEqual(captionAt(0));
    expect(hookAt(LOOP_S)).toBe(hookAt(0));
    expect(creditAt(0, LOOP_S)).toBeCloseTo(creditAt(LOOP_S, LOOP_S), 6);
    expect(sceneAt(0).name).toBe('hook');
    expect(sceneAt(LOOP_S - 1e-6).name).toBe('trust');
    // The last frame has the bill snapping open and the camera on the hook's shot.
    const last = viewAt(LOOP_S - FRAME);
    const first = viewAt(0);
    expect(Math.abs(last.pose.open - first.pose.open)).toBeLessThan(0.12);
    expect(Math.hypot(last.cam.eye.x - first.cam.eye.x, last.cam.eye.y - first.cam.eye.y, last.cam.eye.z - first.cam.eye.z)).toBeLessThan(1);
    expect(last.dark).toBeGreaterThan(0.9);
  });

  it('opens on the hook: the bill wide open towards the camera, the hook line up', () => {
    for (const t of [0, 0.3, 1, 1.9]) {
      const v = viewAt(t);
      expect(v.scene.name, `t=${t}`).toBe('hook');
      expect(v.pose.open, `t=${t}`).toBeGreaterThan(1);
      // The camera is out in front of the bill, looking back into the mouth.
      const eye = unplace(v.rigs.bill, v.cam.eye);
      expect(eye.z, `t=${t}`).toBeGreaterThan(BILL_L);
      expect(hookAt(t), `t=${t}`).not.toBeNull();
      expect(captionAt(t), `t=${t}`).toBeNull();
    }
    expect(HOOK_ROWS.flat().map((w) => w.text).join(' ')).toBe('NEVER look inside a penguin\'s mouth!');
  });

  it('has no teeth: the bill is smooth keratin, the spines grow inside, on the tongue and the palate only', () => {
    const names = surfacesOf(hookPose(0)).map((s) => s.name);
    expect(names.some((n) => /teeth|tooth/i.test(n))).toBe(false);
    expect(SPINE_SPOTS.length).toBeGreaterThan(120);
    expect(new Set(SPINE_SPOTS.map((s) => s.where))).toEqual(new Set(['tongue', 'palate']));
    // Off the cutting edges (phi ±π/2 is the edge).
    for (const s of SPINE_SPOTS) expect(Math.abs(s.phi)).toBeLessThan(1.25);
  });

  it('points every spine back, down the throat', () => {
    for (const open of [0.3, 1]) {
      const rigs = rigsOf({ ...POSE0, open });
      for (const s of spinesOf(rigs)) {
        const jaw = s.where === 'tongue' ? rigs.lower : rigs.upper;
        // Along the jaw, towards its joint (bill frame -z).
        expect(dot(norm(sub(s.tip, s.base)), jaw.m.z)).toBeLessThan(-0.7);
      }
    }
  });

  it('cuts to each beat on its words', () => {
    const on = (t: number): string => sceneAt(t).name;
    expect(on(AT.cute)).toBe('cute');
    expect(on(AT.waddling)).toBe('cute');
    expect(on(AT.opens)).toBe('open');
    expect(on(AT.spikes)).toBe('spikes');
    expect(on(AT.teeth)).toBe('noteeth');
    expect(on(AT.any)).toBe('noteeth');
    expect(on(AT.fingernails)).toBe('nails');
    expect(on(AT.throat)).toBe('throat');
    expect(on(AT.fish)).toBe('fish');
    expect(on(AT.way)).toBe('fish');
    expect(on(AT.trust)).toBe('trust');
    for (let i = 1; i < CUTS.length; i++) expect(CUTS[i]!.from).toBeGreaterThan(CUTS[i - 1]!.from);
    // The bill opens on "opens up", shut and smug by "have any".
    expect(viewAt(sceneFrom('open') + 0.05).pose.open).toBeLessThan(0.05);
    expect(viewAt(AT.upEnd + 0.1).pose.open).toBeGreaterThan(0.5);
    expect(viewAt(AT.any).pose.open).toBeLessThan(0.05);
    // A light runs down the spines on "ALL pointing down the throat…".
    const spines = spinesOf(viewAt(AT.pointing).rigs);
    expect(Math.max(...spines.map(glowAt(AT.pointing)))).toBeGreaterThan(0.5);
    expect(Math.max(...spines.map(glowAt(AT.fish)))).toBe(0);
  });

  it('sends the fish one way: head first in, a small try at backing out, then gone down the throat', () => {
    expect(fishZAt(sceneFrom('fish') + 0.05)).toBeGreaterThan(BILL_L - 1);
    expect(fishZAt(AT.fish + 0.3)).toBeLessThan(1.5);
    const back = Math.max(...FRAMES.filter((t) => t > AT.one - 0.2 && t < AT.way).map(fishZAt)) - fishZAt(AT.one - 0.2);
    expect(back).toBeGreaterThan(0.3);
    expect(back).toBeLessThan(1.2);
    // It never gets back out past where it started, and it's gone by the end of "way.".
    for (const t of FRAMES.filter((x) => sceneAt(x).name === 'fish')) expect(fishZAt(t)).toBeLessThanOrEqual(BILL_L - 0.6 + 1e-9);
    expect(fishZAt(AT.wayEnd)).toBeLessThan(THROAT_Z - 3);
  });

  it('times the words inside the loop, ending at least 0.2 s before it', () => {
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end - 1e-6);
    for (const w of WORDS) expect(w.end).toBeGreaterThan(w.start);
    expect(WORDS[0]!.start).toBeGreaterThanOrEqual(0);
    expect(WORDS[WORDS.length - 1]!.end / TEMPO).toBeLessThanOrEqual(LOOP_S - 0.2);
    expect(WORDS.map((w) => w.text).join(' ')).toBe(
      'NEVER look inside a penguin\'s mouth! So cute, right? Fluffy… waddling… then it opens up… and it\'s full of SPIKES! '
        + 'Not teeth. Penguins don\'t have any. Spines, made like your fingernails, ALL pointing down the throat… '
        + 'so a slippery fish only goes ONE way. So, trust me:',
    );
  });

  it('captions in phrases, text on every frame, and every text between y 270 and 1250', () => {
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.from).toBeGreaterThanOrEqual(HOOK_TO);
      expect(l.to).toBeLessThanOrEqual(LOOP_S);
      expect(l.to).toBeGreaterThan(l.from);
    }
    expect(LINES.filter((l) => l.words.length > 1).length).toBeGreaterThan(LINES.length / 2);
    for (const t of FRAMES) expect(hookAt(t) !== null || captionAt(t) !== null, `t=${t}`).toBe(true);
    for (const { y, size } of Object.values(TEXT)) {
      expect(y - size * 0.8).toBeGreaterThanOrEqual(270);
      expect(y + size * 0.25).toBeLessThanOrEqual(1250);
    }
  });

  it('keeps the effects quiet and inside the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThanOrEqual(0.45);
    }
  });
});
