import { describe, expect, it } from 'vitest';
import { hangingEel } from '../dev/promo/monkseal/art/seal';
import { EEL_W, NOSTRIL } from '../dev/promo/monkseal/art/sealFace';
import { resample } from '../dev/promo/monkseal/art/eel';
import { LEVELS } from '../dev/promo/monkseal/audio';
import { toHead } from '../dev/promo/monkseal/scenes';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/monkseal/script';
import {
  BOIL_STEPS, boilAt, BULGE, BUT_AT, CATCH_AT, DART, EEL2_AT, EXIT_AT, exitAt, FINE_AT, fineAt, FOUR_AT, GULP_AT, hideAt, HIDING_AT, hookAt, LOOP_S, NOBODY_AT, ONE_AT, OUT_PX, POP_AT, pullAt, PULL1_AT, PULL2_AT, PULL3_AT,
  questionAt, ROW, rowAt, rowUp, said, SCENE_IDS, sceneAlpha, SNEEZE_AT, sneezeAge, STARTS, SWALLOWED_AT, TEENAGE_AT, THREE_AT, TREND_AT, trendAt, WHY_AT, wrap, WRONG_AT,
} from '../dev/promo/monkseal/story';
import { TEMPO, WORDS } from '../dev/promo/monkseal/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;

describe('promo short: this seal has an eel up its nose (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [hookAt(0), hookAt(END)];
    for (const k of ['x', 'y', 'scale', 'tilt', 'breath'] as const) expect(b[k], k).toBeCloseTo(a[k]!, 3);
    for (const k of ['lid', 'smile', 'gaze', 'gazeY'] as const) expect(b.face[k], k).toBeCloseTo(a.face[k]!, 3);
    a.eel!.spine.forEach((p, i) => {
      expect(b.eel!.spine[i]!.x).toBeCloseTo(p.x, 2);
      expect(b.eel!.spine[i]!.y).toBeCloseTo(p.y, 2);
    });
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    expect(questionAt(0)).toBe(0);
    expect(questionAt(END)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
  });

  it('never jumps: the hook, the pull and the scene fades move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      if (sceneAlpha('hook', a) > 0 && sceneAlpha('hook', b) > 0) {
        const [ha, hb] = [hookAt(a), hookAt(b)];
        expect(Math.hypot(hb.x - ha.x, hb.y - ha.y), `hook t=${t}`).toBeLessThan(20);
        expect(Math.abs(hb.scale - ha.scale), `hook scale t=${t}`).toBeLessThan(0.06);
        const [ta, tb] = [ha.eel!.spine[26]!, hb.eel!.spine[26]!];
        expect(Math.hypot(tb.x - ta.x, tb.y - ta.y), `eel t=${t}`).toBeLessThan(18);
      }
      if (b > a && sceneAlpha('pull', a) > 0 && sceneAlpha('pull', b) > 0 && (a < POP_AT - FRAME || a > POP_AT)) {
        const [pa, pb] = [pullAt(a), pullAt(b)];
        expect(pb.out, `out t=${t}`).toBeGreaterThanOrEqual(pa.out - 1e-6);
        expect(Math.hypot(pb.handA.x - pa.handA.x, pb.handA.y - pa.handA.y), `hands t=${t}`).toBeLessThan(60);
      }
      for (const id of SCENE_IDS) expect(sceneAlpha(id, b) - sceneAlpha(id, a), id).toBeLessThan(0.4);
    }
  });

  it('opens on the hook: one deadpan face filling the frame, the eel hanging out of its nostril past the chin', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const h = hookAt(0.3);
    // The head is 394 units wide: more than 85% of the frame.
    expect(394 * h.scale).toBeGreaterThan(0.85 * 1080);
    expect(h.face.lid).toBeGreaterThan(0.3);
    expect(h.face.stretch).toBe(1);
    const spine = h.eel!.spine;
    // It starts inside the stretched nostril (the rim is drawn over its root) and hangs below the chin (y 180).
    expect(Math.abs(spine[0]!.x - NOSTRIL.x)).toBeLessThan(12);
    expect(spine[0]!.y).toBeLessThan(NOSTRIL.y);
    expect(spine[spine.length - 1]!.y).toBeGreaterThan(250);
    expect(EEL_W).toBeGreaterThan(40);
    // About as long as the head (340 units tall).
    const all = resample(spine, 40);
    expect(all[40]!.s).toBeGreaterThan(280);
    expect(all[40]!.s).toBeLessThan(440);
    expect(questionAt(0.3)).toBe(0);
    for (let t = 0; t < 1; t += FRAME) expect(creditAt(t, LOOP_S)).toBe(0);
  });

  it('comes back to frame 1 for the seam', () => {
    expect(sceneAlpha('hook', STARTS.hook - 0.01)).toBe(0);
    expect(sceneAlpha('hook', LOOP_S - 0.1)).toBe(1);
    expect(hookAt(STARTS.hook + 0.1).scale).toBeLessThan(hookAt(0.3).scale);
    expect(BUT_AT).toBeGreaterThan(STARTS.hook);
  });

  it('puts every noun on screen as it is said', () => {
    // "three or four times": the eel seal, then the others, one by one, each with an eel.
    expect(rowUp(1, said('seen'))).toBe(0);
    expect(rowUp(1, THREE_AT + 0.02)).toBe(1);
    expect(rowUp(3, FOUR_AT - 0.2)).toBe(0);
    expect(rowUp(3, FOUR_AT + 0.05)).toBe(1);
    expect(ROW.length).toBe(4);
    for (const s of rowAt(said('times.'))) {
      expect(s.eel).toBeDefined();
      expect(s.face.stretch).toBe(1);
    }
    // "They catch the seal": a hand on each side.
    expect(sceneAlpha('pull', CATCH_AT)).toBe(1);
    expect(pullAt(said('seal,')).hold).toBe(1);
    // "pull… and pull… and PULL!": more eel each time, then the head pops out.
    expect(pullAt(PULL1_AT - 0.1).out).toBeCloseTo(OUT_PX[0], 3);
    expect(pullAt(PULL2_AT - 0.1).out).toBeCloseTo(OUT_PX[1], 3);
    expect(pullAt(PULL3_AT - 0.1).out).toBeCloseTo(OUT_PX[2], 3);
    expect(pullAt(POP_AT - 0.01).eelHead).toBe(false);
    expect(pullAt(POP_AT + 0.02).eelHead).toBe(true);
    expect(POP_AT).toBeLessThan(STARTS.fine - 0.4);
    expect(pullAt(POP_AT + 0.4).seal.face.stretch).toBeLessThan(0.1);
    // "Totally fine.": smiling, eyes closed, no eel; then the sneeze.
    expect(fineAt(FINE_AT).face.happy).toBeGreaterThan(0.95);
    expect(fineAt(FINE_AT).face.smile).toBeGreaterThan(0.8);
    expect(fineAt(FINE_AT).eel).toBeUndefined();
    expect(fineAt(SNEEZE_AT + 0.1).face.open).toBeGreaterThan(0.5);
    expect(sneezeAge(SNEEZE_AT + 0.1)).toBeCloseTo(0.1, 5);
    expect(SNEEZE_AT).toBeLessThan(STARTS.hide - 0.2);
    // "hiding…": the eel in its crevice, then up the nose.
    expect(hideAt(EEL2_AT + 0.1).headOut).toBe(true);
    expect(hideAt(EEL2_AT + 0.1).eel[0]!.y).toBeGreaterThan(1000);
    expect(hideAt(DART.to).headOut).toBe(false);
    expect(DART.from).toBeLessThan(HIDING_AT);
    expect(DART.to).toBeLessThan(STARTS.exit + 0.02);
    // "swallowed… the WRONG exit!": in by the mouth, out by the nose.
    expect(exitAt(said('got')).headIn).toBe(false);
    expect(exitAt(SWALLOWED_AT + 0.1).headIn).toBe(true);
    expect(exitAt(SWALLOWED_AT + 0.1).seal.face.open).toBeGreaterThan(0.5);
    expect(exitAt(GULP_AT + 0.1).going).toBeNull();
    expect(exitAt(GULP_AT + 0.1).seal.face.open).toBe(0);
    expect(exitAt(GULP_AT + 0.15).seal.face.puff).toBeGreaterThan(0.9);
    // The bulge climbs from the cheek to the nostril, the eyes after it, then cross-eyed.
    const [low, high] = [exitAt(BULGE.from + 0.1).seal.face.bulge!, exitAt(BULGE.to - 0.02).seal.face.bulge!];
    expect(low.y).toBeGreaterThan(high.y + 50);
    expect(Math.hypot(high.x - NOSTRIL.x, high.y - NOSTRIL.y)).toBeLessThan(30);
    expect(exitAt(BULGE.from + 0.3).seal.face.gaze).toBeGreaterThan(0.6);
    expect(exitAt(EXIT_AT).seal.face.cross).toBe(1);
    expect(exitAt(WRONG_AT - 0.1).wrong).toBe(0);
    expect(exitAt(WRONG_AT + 0.2).wrong).toBe(1);
    expect(exitAt(EXIT_AT - 0.1).popped).toBeNull();
    const out = exitAt(EXIT_AT + 0.2);
    expect(out.out).toBe(1);
    expect(out.seal.face.stretch).toBe(1);
    // Head first: the head end hangs below, the other end is in the nostril.
    const last = out.popped![out.popped!.length - 1]!;
    expect(Math.hypot(last.x - NOSTRIL.x, last.y - NOSTRIL.y)).toBeLessThan(25);
    expect(out.popped![0]!.y).toBeGreaterThan(120);
    // "a teenage trend": the eel with sunglasses, the friend wowed.
    expect(sceneAlpha('trend', ONE_AT + 0.1)).toBe(1);
    expect(trendAt(TEENAGE_AT - 0.2).glasses).toBe(0);
    expect(trendAt(TEENAGE_AT + 0.2).glasses).toBe(1);
    expect(trendAt(TREND_AT).wow).toBe(1);
    expect(trendAt(TREND_AT).friend.eel).toBeUndefined();
    expect(trendAt(TREND_AT).cool.eel).toBeDefined();
    // "nobody knows why": a question mark.
    expect(questionAt(NOBODY_AT + 0.2)).toBe(1);
    expect(questionAt(WHY_AT + 0.25)).toBe(0);
  });

  it('keeps the pulled eel in the nostril: the spine starts at it in head units, whatever the head\'s tilt', () => {
    for (const t of [PULL1_AT + 0.3, PULL2_AT + 0.3, POP_AT - 0.05]) {
      const p = pullAt(t);
      const n = toHead(p.seal, p.nostril);
      expect(n.x).toBeCloseTo(NOSTRIL.x, 3);
      expect(n.y).toBeCloseTo(NOSTRIL.y, 3);
      const root = toHead(p.seal, p.eel[0]!);
      expect(Math.hypot(root.x - NOSTRIL.x, root.y - NOSTRIL.y)).toBeLessThan(30);
    }
    expect(hangingEel(300, 0)[0]!.y).toBeLessThan(NOSTRIL.y);
  });

  it('shows the credit from 40% of the way through, gone before the loop point', () => {
    expect(creditAt(LOOP_S * 0.4 - 0.05, LOOP_S)).toBe(0);
    expect(creditAt(LOOP_S * 0.6, LOOP_S)).toBeGreaterThan(0.5);
    expect(creditAt(LOOP_S - 0.3, LOOP_S)).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('why');
    expect(LOOP_S - last.end).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end).toBeLessThan(0.45);
    expect(TEMPO).toBeGreaterThanOrEqual(1.03);
    expect(TEMPO).toBeLessThanOrEqual(1.13);
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end - 1e-9);
  });

  it('captions every spoken word, in short phrases, the right one at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      // Two to five words, never one left alone; one row or two.
      expect(l.words.length).toBeGreaterThanOrEqual(2);
      expect(l.words.length).toBeLessThanOrEqual(5);
      expect(l.rows.length).toBeLessThanOrEqual(2);
      expect(l.rows.flat()).toEqual(l.words);
      for (const row of l.rows) expect(row.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(25);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    for (let t = WORDS[0]!.start; t < LOOP_S; t += FRAME) expect(captionAt(t), `t=${t}`).not.toBeNull();
  });

  it('keeps every text line inside the area the apps leave clear (y 270 to 1250)', () => {
    for (const [name, line] of Object.entries(TEXT)) {
      expect(line.y, name).toBeLessThanOrEqual(1250);
      expect(line.y - line.size * 0.78, name).toBeGreaterThanOrEqual(270);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles (a multiple of 1.5 s), with every sound inside the loop', () => {
    expect(Math.abs(LOOP_S / 1.5 - Math.round(LOOP_S / 1.5))).toBeLessThan(1e-9);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t, s.id).toBeGreaterThanOrEqual(0);
      expect(s.t, s.id).toBeLessThan(LOOP_S);
    }
    for (const w of WORDS) expect(w.end).toBeLessThan(LOOP_S);
  });

  it('changes the sound with the mood: a creak per pull, the pop, a sneeze, the dart, hushed at the end', () => {
    for (const p of [PULL1_AT, PULL2_AT, PULL3_AT]) expect(SOUNDS.some((s) => s.id === 'suck' && Math.abs(s.t - p) < 0.05)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'eatBig' && Math.abs(s.t - POP_AT) < 0.02 && s.gain >= 0.15)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'splash' && Math.abs(s.t - SNEEZE_AT) < 0.05)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'dash' && Math.abs(s.t - DART.from) < 0.05)).toBe(true);
    for (const s of SOUNDS.filter((c) => c.t >= BUT_AT)) expect(s.gain, `${s.id} at ${s.t}`).toBeLessThanOrEqual(0.06);
    for (const l of LEVELS) expect(Math.abs(l.db)).toBeLessThanOrEqual(3);
  });
});
