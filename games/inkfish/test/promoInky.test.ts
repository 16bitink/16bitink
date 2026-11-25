import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { LIFTS } from '../dev/promo/inky/audio';
import { HOLE, lastLook, pourAt, rulerAlpha, RULER, walkerAt } from '../dev/promo/inky/floor';
import { feelerAt, SLIT } from '../dev/promo/inky/gap';
import { hookAt, TANK } from '../dev/promo/inky/hook';
import { cameraAt } from '../dev/promo/inky/morning';
import { bodyTube, eyesOf, type Octo } from '../dev/promo/inky/octo';
import { tubeFrame } from '../dev/promo/inky/paint';
import { CAPTION_SIZE, CAPTION_Y, captionAt, DRAIN_LABEL, drainLabelAlpha, LINES, SOUNDS } from '../dev/promo/inky/script';
import { swimmerAt } from '../dev/promo/inky/sea';
import { squeezeAt } from '../dev/promo/inky/squeeze';
import {
  boilAt, BOIL_STEPS, CRACK_AT, CROSSED_AT, CUTS, DRAIN_AT, FLOOR_AT, flashAt, hookClock, INKY_AT, JUST_AT, LOOP_S, MESSAGE_AT, NEXT_AT, OCEAN_AT, OUT_AT, PIPE_AT, punchAt, said, sceneAt, shakeAt,
  SIX_AT, SQUEEZED_AT, TANK_AT, TRAIL_AT, WIDE_AT, WIPE_FROM, WIPE_MID, WIPE_TO, wipeAt, wrap,
} from '../dev/promo/inky/story';
import { wipePath, WIPE_R } from '../dev/promo/inky/wipe';
import { WORDS } from '../dev/promo/inky/words';
import { resample } from '../dev/promo/octopus/geom';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

type Pt = { readonly x: number; readonly y: number };

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: Pt, q: Pt): number => Math.hypot(q.x - p.x, q.y - p.y);
const pathGap = (a: readonly Pt[], b: readonly Pt[]): number => {
  const [ra, rb] = [resample(a, 40), resample(b, 40)];
  return Math.max(...ra.map((p, i) => dist(p, rb[i]!)));
};
const hook = (t: number): ReturnType<typeof hookAt> => hookAt(wrap(t), hookClock(t));
const eyes = (o: Octo): ReturnType<typeof eyesOf> => eyesOf(o, tubeFrame(bodyTube(o, 0)));

describe('promo short: this octopus broke out of an aquarium (narrated)', () => {
  it('loops: the hook clock, the octopus, every arm, the lid and every overlay are where they started', () => {
    expect(hookClock(END)).toBeCloseTo(hookClock(0), 5);
    expect(sceneAt(END).scene).toBe('hook');
    expect(sceneAt(0).scene).toBe('hook');
    const [a, b] = [hook(END), hook(0)];
    expect(pathGap(a.octo.axis, b.octo.axis)).toBeLessThan(0.01);
    for (const key of ['size', 'turn', 'lid', 'breathe'] as const) expect(a.octo[key]).toBeCloseTo(b.octo[key]!, 4);
    expect(dist(a.octo.gaze, b.octo.gaze)).toBeLessThan(1e-4);
    [...a.near, ...a.inside].forEach((arm, i) => expect(pathGap(arm.path, [...b.near, ...b.inside][i]!.path)).toBeLessThan(0.01));
    expect(dist(a.lidA, b.lidA) + dist(a.lidB, b.lidB)).toBeLessThan(0.01);
    expect(a.zoom).toBeCloseTo(b.zoom, 5);
    for (const f of [flashAt, drainLabelAlpha, wipeAt]) expect(f(END)).toBeCloseTo(f(0), 5);
    expect(punchAt(END)).toBeCloseTo(punchAt(0), 5);
    expect(shakeAt(END).x).toBeCloseTo(shakeAt(0).x, 5);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
    expect(LOOP_S % 1.5).toBe(0);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(LOOP_S * BOIL_FPS).toBe(BOIL_STEPS);
    expect(boilAt(END)).toBe(BOIL_STEPS - 1);
  });

  it('never jumps within a shot: the hook, the feeler, the squeeze, the walk, the pour and the swim all move on smoothly', () => {
    for (const t of FRAMES) {
      const u = t + FRAME;
      const [p, q] = [sceneAt(t), sceneAt(u)];
      if (p.scene !== q.scene) continue;
      const [a, b] = [wrap(t), wrap(u)];
      if (p.scene === 'hook') {
        expect(pathGap(hook(t).octo.axis, hook(u).octo.axis)).toBeLessThan(14);
        hook(t).near.forEach((arm, i) => expect(pathGap(arm.path, hook(u).near[i]!.path)).toBeLessThan(26));
      } else if (p.scene === 'lid') {
        const [m, n] = [feelerAt(a), feelerAt(b)];
        expect(dist(m[m.length - 1]!, n[n.length - 1]!)).toBeLessThan(90);
      } else if (p.scene === 'squeeze') {
        expect(pathGap(squeezeAt(a).octo.axis, squeezeAt(b).octo.axis)).toBeLessThan(120);
      } else if (p.scene === 'floor') {
        expect(dist(walkerAt(a), walkerAt(b))).toBeLessThan(40);
      } else if (p.scene === 'drain') {
        expect(Math.abs(pourAt(b) - pourAt(a))).toBeLessThan(0.1);
      } else if (p.scene === 'ocean') {
        expect(dist(swimmerAt(a), swimmerAt(b))).toBeLessThan(95);
      } else if (p.scene === 'morning') {
        expect(Math.abs(cameraAt(b).y - cameraAt(a).y)).toBeLessThan(45);
      }
    }
  });

  it('changes picture behind the arm: the wipe covers the whole frame when the hook comes back', () => {
    expect(wipeAt(WIPE_MID)).toBeCloseTo(0.5, 5);
    expect(WIPE_FROM).toBeGreaterThan(said('again,'));
    expect(WIPE_TO).toBeLessThan(LOOP_S);
    // One frame either side of the change, no corner of the frame shows past the arm.
    for (const t of [WIPE_MID - FRAME * 0.5, WIPE_MID, WIPE_MID + FRAME * 0.5]) {
      const path = wipePath(wipeAt(t));
      for (const p of path.filter((q) => q.y > -250 && q.y < 2170)) {
        expect(p.x - WIPE_R * 0.985).toBeLessThan(0);
        expect(p.x + WIPE_R * 0.985).toBeGreaterThan(1080);
      }
    }
    // Clear of the frame at its ends.
    expect(Math.max(...wipePath(0).map((p) => p.x)) + WIPE_R).toBeLessThan(0);
    expect(Math.min(...wipePath(1).map((p) => p.x)) - WIPE_R).toBeGreaterThan(1080);
  });

  it('opens on the octopus halfway out of the tank, huge, looking at us, nothing written but the words', () => {
    const s = hook(0);
    const f = tubeFrame(bodyTube(s.octo, 0));
    const edges = f.pts.flatMap((p, i) => [p.x - f.r[i]! * Math.abs(f.nrm[i]!.x), p.x + f.r[i]! * Math.abs(f.nrm[i]!.x)]);
    expect(Math.max(...edges) - Math.min(...edges)).toBeGreaterThan(540);
    // Arms span nearly the whole frame.
    const armX = [...s.near, ...s.inside].flatMap((a) => a.path.map((p) => p.x));
    expect(Math.max(...armX) - Math.min(...armX)).toBeGreaterThan(820);
    // Head and mantle above the rim, its other arms still in the water below it.
    const top = Math.min(...f.pts.map((p) => p.y));
    expect(top).toBeGreaterThan(200);
    expect(top).toBeLessThan(330);
    for (const e of eyes(s.octo)) expect(e.c.y).toBeLessThan(TANK.rim);
    expect(s.inside.every((a) => Math.max(...a.path.map((p) => p.y)) > TANK.rim + 500)).toBe(true);
    // A big eye, above the caption.
    const near = eyes(s.octo).at(-1)!;
    expect(near.r * 2).toBeGreaterThan(130);
    expect(near.c.y + near.r).toBeLessThan(CAPTION_Y - CAPTION_SIZE);
    expect(s.octo.lid).toBeLessThan(0.2);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('This octopus broke');
    expect(drainLabelAlpha(0)).toBe(0);
  });

  it('tells the beats in order, each scene on screen as it is said', () => {
    const at = (t: number): string => sceneAt(t).scene;
    expect(CUTS.map((c) => c.scene)).toEqual(['hook', 'map', 'hall', 'lid', 'squeeze', 'floor', 'drain', 'pipe', 'ocean', 'morning', 'message', 'deep']);
    expect(CUTS.every((c, i) => i === 0 || c.at > CUTS[i - 1]!.at + 0.7)).toBe(true);
    expect(at(OUT_AT)).toBe('hook');
    expect(at(said('Zealand,'))).toBe('map');
    expect(at(CRACK_AT)).toBe('lid');
    expect(at(SQUEEZED_AT)).toBe('squeeze');
    expect(at(FLOOR_AT)).toBe('floor');
    expect(at(SIX_AT)).toBe('drain');
    expect(at(said('pipe'))).toBe('pipe');
    expect(at(OCEAN_AT)).toBe('ocean');
    expect(at(TANK_AT)).toBe('morning');
    expect(at(MESSAGE_AT)).toBe('message');
    expect(at(said('seen'))).toBe('deep');
    // The arm creeps out on "just a crack"; the body pops free on "out,".
    expect(feelerAt(CRACK_AT + 0.3).length).toBeGreaterThan(feelerAt(JUST_AT).length * 1.3);
    expect(squeezeAt(INKY_AT).pop).toBe(0);
    expect(squeezeAt(CROSSED_AT - 0.09).pop).toBeGreaterThan(0.5);
    // It pours from inside the glass to outside: one shrinks as the other swells, and the last eye is in the slot between them.
    expect(squeezeAt(INKY_AT).inside).toBeGreaterThan(0.9);
    expect(squeezeAt(CROSSED_AT - 0.12).inside).toBeLessThan(0.05);
    const tall = (t: number): number => {
      const a = squeezeAt(t).octo.axis;
      return dist(a[0]!, a[a.length - 1]!);
    };
    expect(tall(CROSSED_AT - 0.12)).toBeGreaterThan(3 * tall(INKY_AT));
    const eye = squeezeAt(said('out,')).slotEye;
    expect(eye.y).toBeGreaterThan(SLIT - squeezeAt(said('out,')).gap);
    expect(eye.y).toBeLessThan(SLIT);
    // Down the drain by "wide", the eye last, gone before the pipe.
    expect(pourAt(DRAIN_AT)).toBe(0);
    expect(pourAt(WIDE_AT + 0.1)).toBeCloseTo(1, 2);
    expect(lastLook(WIDE_AT + 0.3)).toBeGreaterThan(0.95);
    expect(lastLook(PIPE_AT - 0.06)).toBeLessThan(0.05);
    // The ruler's up with "SIX", as long as the drain is wide, below it.
    expect(rulerAlpha(SIX_AT + 0.12)).toBe(1);
    expect(RULER.y).toBeGreaterThan(HOLE.y + HOLE.ry);
    // The camera's on the floor by "trail", not before the tank.
    expect(cameraAt(TANK_AT).y).toBe(0);
    expect(cameraAt(TRAIL_AT + 0.06).y).toBeGreaterThan(200);
    expect(sceneAt(NEXT_AT - 0.5).scene).toBe('ocean');
  });

  it('keeps every line of text in the clear band, each caption short and on as it is spoken', () => {
    expect(CAPTION_Y).toBeLessThanOrEqual(1250);
    expect(CAPTION_Y - CAPTION_SIZE).toBeGreaterThan(270);
    expect(DRAIN_LABEL.y).toBeLessThan(CAPTION_Y - CAPTION_SIZE * 0.75);
    expect(DRAIN_LABEL.text).toMatch(/in.*cm/);
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      // Phrases: no lone word, nothing too long to read at a glance.
      expect(l.words.length).toBeGreaterThanOrEqual(2);
      expect(l.words.length).toBeLessThanOrEqual(5);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(22);
      expect(l.to).toBeGreaterThan(l.from);
    }
    for (const w of WORDS) expect(captionAt((w.start + w.end) / 2)!.line.words).toContain(w);
    for (let i = 1; i < WORDS.length; i++) expect(WORDS[i]!.start).toBeGreaterThanOrEqual(WORDS[i - 1]!.end - 1e-9);
    expect(LOOP_S - WORDS.at(-1)!.end).toBeGreaterThan(0.2);
    expect(LOOP_S - WORDS.at(-1)!.end).toBeLessThan(0.4);
  });

  it('shows the credit only from 40% in to just before the loop point', () => {
    expect(creditAt(1, LOOP_S)).toBe(0);
    expect(creditAt(0.39 * LOOP_S, LOOP_S)).toBe(0);
    expect(creditAt(OCEAN_AT, LOOP_S)).toBeGreaterThan(0.7);
    expect(creditAt(LOOP_S - 0.5, LOOP_S)).toBe(0);
  });

  it('keeps every sound inside the loop and quiet, and lifts the quiet lines one after another', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeLessThan(0.4);
      expect(Math.abs(s.pan)).toBeLessThanOrEqual(0.6);
    }
    LIFTS.forEach((l, i) => {
      expect(l.to).toBeGreaterThan(l.from + 0.2);
      if (i > 0) expect(l.from).toBeGreaterThanOrEqual(LIFTS[i - 1]!.to);
      // Lifts change only in the pauses.
      for (const at of [l.from, l.to]) expect(WORDS.some((w) => at > w.start && at < w.end)).toBe(false);
    });
  });
});
