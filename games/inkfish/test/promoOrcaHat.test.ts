import { describe, expect, it } from 'vitest';
import { FEMALE_FIN_TOP, hatOf, MALE_FIN_TOP, snoutOf } from '../dev/promo/orcahat/art/hatOrca';
import { SOFT_LIFT_DB } from '../dev/promo/orcahat/audio';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/orcahat/script';
import {
  anyTagAt, BOIL_STEPS, boilAt, BORN_AT, BUT_AT, CAUGHT_AT, COPIED_AT, darkAt, EVERYWHERE_AT, flashAt, HATS_AT, HE_AT, HIS_HEAD_AT, hookAt, HOOK_WATER_Y, j27At, LOOP_S, NOBODY_AT,
  OTHER_AT, PHOTOGRAPHER_AT, PUSH, questionAt, ROW, ROW_FIRST, rowAt, said, SCENE_IDS, sceneAlpha, STARTS, TAGS, tagAlpha, THEN_AT, VANISHED_AT, viewfinderAt, wrap, YEAR24_AT,
} from '../dev/promo/orcahat/story';
import { TEMPO, WORDS } from '../dev/promo/orcahat/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const WRITTEN = [anyTagAt, viewfinderAt, flashAt, questionAt];
const tag = (text: string) => TAGS.find((g) => g.text === text)!;

describe('promo short: orcas started wearing salmon as hats (narrated)', () => {
  it('loops: every clocked value at the loop point equals its value at the start', () => {
    expect(wrap(END)).toBeCloseTo(LOOP_S, 5);
    const [a, b] = [hookAt(0), hookAt(END)];
    for (const k of ['x', 'y', 'len', 'angle', 'flick', 'hat'] as const) expect(b.orca[k], k).toBeCloseTo(a.orca[k]!, 2);
    expect(b.age).toBeCloseTo(a.age, 4);
    for (const id of SCENE_IDS) expect(sceneAlpha(id, END), id).toBeCloseTo(sceneAlpha(id, 0), 4);
    for (const f of WRITTEN) {
      expect(f(0), f.name).toBe(0);
      expect(f(END), f.name).toBeCloseTo(0, 3);
    }
    // The dark drama belongs to the J27 scene, gone under the hook by the loop point.
    expect(sceneAlpha('j27', END)).toBe(0);
    expect(darkAt(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
  });

  it('never jumps: the hook, the row, J27 and the scene fades move smoothly frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [wrap(t), wrap(t + FRAME)];
      if (sceneAlpha('hook', a) > 0 && sceneAlpha('hook', b) > 0) {
        const [ha, hb] = [hookAt(a), hookAt(b)];
        expect(Math.hypot(hb.orca.x - ha.orca.x, hb.orca.y - ha.orca.y), `hook t=${t}`).toBeLessThan(40);
        expect(Math.abs(hb.orca.angle - ha.orca.angle), `hook angle t=${t}`).toBeLessThan(0.02);
      }
      if (b > a) {
        for (const bare of [false, true]) {
          const [ra, rb] = [rowAt(a, bare), rowAt(b, bare)];
          ra.forEach((r, k) => expect(Math.hypot(rb[k]!.orca.x - r.orca.x, rb[k]!.orca.y - r.orca.y), `row ${k} t=${t}`).toBeLessThan(40));
        }
        const [ja, jb] = [j27At(a), j27At(b)];
        expect(Math.abs(jb.zoom - ja.zoom), `zoom t=${t}`).toBeLessThan(0.08);
        expect(Math.hypot(jb.orca.x - ja.orca.x, jb.orca.y - ja.orca.y), `J27 t=${t}`).toBeLessThan(40);
      }
      for (const id of SCENE_IDS) expect(sceneAlpha(id, b) - sceneAlpha(id, a), id).toBeLessThan(0.35);
    }
  });

  it('opens on the hook: one big female head just through the surface, a salmon on top, spray in the air, nothing written', () => {
    expect(sceneAlpha('hook', 0.3)).toBe(1);
    for (const id of SCENE_IDS.filter((x) => x !== 'hook')) expect(sceneAlpha(id, 0.3), id).toBe(0);
    const h = hookAt(0.3);
    expect(h.orca.female).toBe(true);
    expect(h.orca.hat).toBe(1);
    expect(h.orca.len).toBeGreaterThanOrEqual(2000);
    const snout = snoutOf(h.orca);
    expect(snout.x).toBeGreaterThan(950);
    expect(snout.x).toBeLessThan(1080);
    // The hat is above the water and in the middle band of the frame, the spray still flying.
    const hat = hatOf(h.orca);
    expect(hat.y).toBeLessThan(HOOK_WATER_Y - 150);
    expect(hat.y).toBeGreaterThan(700);
    expect(h.age).toBeGreaterThan(0.2);
    expect(h.age).toBeLessThan(0.8);
    // Nothing written in the first second: no caption before the first word, no tag, no credit.
    expect(captionAt(0.3)).toBeNull();
    for (let t = 0; t < 1; t += FRAME) {
      for (const f of WRITTEN) expect(f(t), `${f.name} t=${t}`).toBe(0);
      expect(creditAt(t, LOOP_S)).toBe(0);
    }
    expect(captionAt(said('In') + 0.01)!.line.words.map((w) => w.text).join(' ')).toBe('In 1987,');
  });

  it('comes back to frame 1 for the seam: the head rises out of the water across the loop point', () => {
    expect(sceneAlpha('hook', STARTS.hook - 0.01)).toBe(0);
    expect(sceneAlpha('hook', LOOP_S - 0.1)).toBe(1);
    expect(hatOf(hookAt(STARTS.hook).orca).y).toBeGreaterThan(HOOK_WATER_Y);
    expect(hookAt(STARTS.hook).orca.y).toBeGreaterThan(hookAt(0.3).orca.y + 200);
    expect(BORN_AT).toBeLessThan(STARTS.hook);
  });

  it('draws the right fins: the 1987 female shorter and curved, J27 a male with the very tall fin', () => {
    expect(FEMALE_FIN_TOP).toBeGreaterThan(MALE_FIN_TOP + 60);
    expect(hookAt(0.3).orca.female).toBe(true);
    expect(rowAt(said('copied'), false)[ROW_FIRST]!.orca.female).toBe(true);
    expect(j27At(said('J27…')).orca.female).toBe(false);
  });

  it('puts every noun on screen as it is said', () => {
    // "an orca put a dead salmon on her HEAD": her, the hat on.
    expect(sceneAlpha('hook', said('salmon'))).toBe(1);
    expect(hookAt(said('HEAD,')).orca.hat).toBe(1);
    // "and other orcas copied her!": they surface one by one, in hats, the "1987" tag on the second beat.
    expect(sceneAlpha('row', OTHER_AT)).toBe(1);
    const copiers = ROW.filter((s) => s.up > 0);
    expect(copiers.length).toBeGreaterThanOrEqual(5);
    for (const s of copiers) expect(s.up).toBeGreaterThanOrEqual(OTHER_AT - 0.01);
    expect(Math.min(...copiers.map((s) => s.up))).toBeLessThan(COPIED_AT);
    expect(tagAlpha(tag('1987'), COPIED_AT + 0.3)).toBe(1);
    // "Salmon hats, everywhere!": every one up with its hat, more on the horizon.
    const all = rowAt(EVERYWHERE_AT + 0.4, false);
    for (const r of all) expect(r.orca.hat).toBe(1);
    expect(ROW.filter((s) => s.up >= HATS_AT && s.up <= EVERYWHERE_AT + 0.01).length).toBeGreaterThanOrEqual(3);
    // "Then, next summer… the fad just vanished.": the same row, hats on at first, all gone after.
    expect(sceneAlpha('vanish', THEN_AT + 0.4)).toBe(1);
    for (const r of rowAt(THEN_AT + 0.4, true)) expect(r.orca.hat).toBe(1);
    for (const r of rowAt(VANISHED_AT + 0.7, true)) expect(r.orca.hat).toBe(0);
    expect(tagAlpha(tag('summer 1988'), said('summer…'))).toBe(1);
    // "But in 2024, a photographer caught J27…": J27 up, the tag, the viewfinder, the shutter.
    expect(sceneAlpha('j27', YEAR24_AT)).toBe(1);
    expect(tagAlpha(tag('2024'), YEAR24_AT + 0.3)).toBe(1);
    expect(viewfinderAt(PHOTOGRAPHER_AT + 0.2)).toBe(1);
    expect(flashAt(CAUGHT_AT + 0.02)).toBeGreaterThan(0.8);
    expect(j27At(CAUGHT_AT).age).toBeGreaterThan(0.5);
    expect(tagAlpha(tag('J27 · 2024'), said('J27…') + 0.3)).toBe(1);
    // "with a salmon on his head!": pushed in on the hat, near the middle of the frame.
    const j = j27At(HIS_HEAD_AT + 0.2);
    expect(j.zoom).toBeGreaterThanOrEqual(PUSH.zoom - 0.01);
    const hat = hatOf(j.orca);
    const onScreen = { x: j.tx + (hat.x - j.cx) * j.zoom, y: j.ty + (hat.y - j.cy) * j.zoom };
    expect(onScreen.x).toBeGreaterThan(300);
    expect(onScreen.x).toBeLessThan(800);
    expect(onScreen.y).toBeGreaterThan(600);
    expect(onScreen.y).toBeLessThan(1100);
    expect(viewfinderAt(HIS_HEAD_AT + 0.2)).toBe(0);
    // "Nobody knows why.": dark, a question mark. "He wasn't even BORN": "J27 · born 1991".
    expect(questionAt(said('why.'))).toBe(1);
    expect(darkAt(said('why.'))).toBe(1);
    expect(tagAlpha(tag('J27 · born 1991'), BORN_AT)).toBe(1);
  });

  it('shows the year tags small, from the second beat, one at a time', () => {
    expect(Math.min(...TAGS.map((g) => g.from))).toBeGreaterThan(4);
    expect(TEXT.tag.size).toBeLessThan(TEXT.caption.size);
    for (let t = 0; t < LOOP_S; t += FRAME) expect(TAGS.filter((g) => tagAlpha(g, t) > 0.5).length, `t=${t}`).toBeLessThanOrEqual(1);
  });

  it('shows the credit from 40% of the way through, gone before the loop point', () => {
    expect(creditAt(LOOP_S * 0.4 - 0.05, LOOP_S)).toBe(0);
    expect(creditAt(LOOP_S * 0.6, LOOP_S)).toBeGreaterThan(0.5);
    expect(creditAt(LOOP_S - 0.3, LOOP_S)).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('BORN');
    expect(LOOP_S - last.end).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end).toBeLessThan(0.45);
    expect(TEMPO).toBeGreaterThanOrEqual(1.03);
    expect(TEMPO).toBeLessThanOrEqual(1.13);
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end - 1e-9);
  });

  it('captions every spoken word, in short phrases, the right one at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(19);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
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
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t, s.id).toBeGreaterThanOrEqual(0);
      expect(s.t, s.id).toBeLessThan(LOOP_S);
    }
    for (const w of WORDS) expect(w.end).toBeLessThan(LOOP_S);
  });

  it('changes the sound with the mood: a splash at the seam and per orca, near silence for the fad, the shutter on "caught"', () => {
    expect(SOUNDS.some((s) => s.id === 'splash' && s.t > LOOP_S - 0.4)).toBe(true);
    for (const s of ROW.filter((r) => r.up > 0)) expect(SOUNDS.some((c) => c.id === 'splash' && Math.abs(c.t - s.up) < 0.1), `orca up at ${s.up}`).toBe(true);
    const soft = SOUNDS.filter((s) => s.t >= THEN_AT - 0.01 && s.t < BUT_AT - 0.01);
    expect(soft.length).toBeGreaterThan(0);
    for (const s of soft) expect(s.gain, `${s.id} at ${s.t}`).toBeLessThanOrEqual(0.05);
    expect(SOUNDS.some((s) => s.id === 'click' && Math.abs(s.t - CAUGHT_AT) < 0.05 && s.gain >= 0.1)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'boom' && Math.abs(s.t - NOBODY_AT) < 0.1)).toBe(true);
    // The soft line is lifted, but stays the quiet one.
    expect(SOFT_LIFT_DB).toBeGreaterThan(1.5);
    expect(SOFT_LIFT_DB).toBeLessThan(4);
    expect(HE_AT).toBeGreaterThan(NOBODY_AT);
  });
});
