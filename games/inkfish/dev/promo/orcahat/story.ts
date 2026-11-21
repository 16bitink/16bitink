import { BOIL_FPS } from '../../../src/art/textures';
import { ramp, window01 } from '../short';
import type { HatOrca } from './art/hatOrca';
import { LOOP_S, WORDS } from './words';

export { LOOP_S };

/**
 * "Orcas started wearing salmon as hats": in 1987 a female of the southern
 * resident orcas' K pod (Puget Sound and the Salish Sea) began carrying a
 * dead salmon on her head; within weeks J and L pods did it too, and by the
 * summer of 1988 the fad was gone. On 25 Oct 2024 Jim Pasola photographed
 * J27 "Blackberry", a male born in 1991, with a salmon on his head in Puget
 * Sound. Nobody knows why. Told by a narrator (words.ts), every beat a
 * function of time over a loop of LOOP_S, a new mood a sentence:
 *
 *   0     (a chuckle) "In 1987… an orca put a dead salmon on her HEAD.": frame 1,
 *         her head just burst up through grey-green water, big, a whole salmon
 *         draped over it, spray still in the air. Nothing written.
 *   4.6   "And other orcas copied her! Salmon hats, everywhere!" (excited): a row
 *         of orcas surfacing one after another, each in a hat, then more on the
 *         horizon; a small "1987" tag.
 *   8.4   "Then, next summer… the fad just vanished." (softly): the same row in a
 *         cold mist, "1988"; the hats fade off one by one.
 *  11.9   "But in 2024, a photographer caught J27… with a salmon on his head!"
 *         (surprised): J27's very tall fin, a viewfinder, the shutter, then a
 *         push-in on the hat. "2024", "J27".
 *  16.8   "Nobody knows why. He wasn't even BORN" (dramatic): dark, a "?", then
 *         "J27 · born 1991"; the water swells and the loop's first frame bursts up.
 */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start;
}
export const endOf = (text: string, nth = 1): number => WORDS.filter((x) => x.text === text)[nth - 1]!.end;

export const ORCA_AT = said('orca');
export const SALMON_AT = said('salmon');
export const HEAD_AT = said('HEAD,');
export const AND_AT = said('and');
export const OTHER_AT = said('other');
export const COPIED_AT = said('copied');
export const HER_AT = said('her!');
export const HATS_AT = said('Salmon');
export const EVERYWHERE_AT = said('everywhere!');
export const THEN_AT = said('Then,');
export const NEXT_AT = said('next');
export const FAD_AT = said('fad');
export const VANISHED_AT = said('vanished.');
export const BUT_AT = said('But');
export const YEAR24_AT = said('2024,');
export const PHOTOGRAPHER_AT = said('photographer');
export const CAUGHT_AT = said('caught');
export const J27_AT = said('J27…');
export const WITH_AT = said('with');
export const SALMON2_AT = said('salmon', 2);
export const HIS_HEAD_AT = said('head!');
export const NOBODY_AT = said('Nobody');
export const WHY_AT = said('why.');
export const HE_AT = said('He');
export const BORN_AT = said('BORN');

export type SceneId = 'hook' | 'row' | 'vanish' | 'j27';

/** Each scene's start; it stays until the next has faded in over it. The hook comes back at the end. */
export const STARTS: Readonly<Record<SceneId, number>> = {
  hook: LOOP_S - 0.45,
  row: AND_AT - 0.12,
  vanish: THEN_AT - 0.12,
  j27: BUT_AT - 0.12,
};
export const FADE = 0.28;
export const SCENE_IDS: readonly SceneId[] = ['row', 'vanish', 'j27', 'hook'];
const AFTER: Readonly<Record<SceneId, SceneId>> = { hook: 'row', row: 'vanish', vanish: 'j27', j27: 'hook' };

export function sceneAlpha(id: SceneId, t: number): number {
  const u = wrap(t);
  if (id === 'hook') return u < STARTS.row + FADE ? 1 : u >= STARTS.hook ? ramp(u, STARTS.hook, STARTS.hook + FADE) : 0;
  const end = STARTS[AFTER[id]] + FADE;
  return u >= STARTS[id] && u < end ? ramp(u, STARTS[id], STARTS[id] + FADE) : 0;
}

/** The loop's clock round the seam: negative in the last seconds, so the head's rise and frame 1 are one motion. */
export const pOf = (t: number): number => { const u = wrap(t); return u > LOOP_S / 2 ? u - LOOP_S : u; };

const centreOf = (snout: { readonly x: number; readonly y: number }, len: number, angle: number): { x: number; y: number } =>
  ({ x: snout.x - (Math.cos(angle) * len) / 2, y: snout.y - (Math.sin(angle) * len) / 2 });

// ---------------------------------------------------------------- the hook (frame 1)

export const HOOK_WATER_Y = 1130;
export const HOOK_LEN = 2300;
/** When the head breaks the surface, on the loop clock pOf: just before the seam, so frame 1 has spray in the air. */
export const BREACH = -0.16;

export interface HookPose {
  readonly orca: HatOrca;
  /** Seconds since the head broke the surface (negative: still under). */
  readonly age: number;
}

export function hookAt(t: number): HookPose {
  const p = pOf(t);
  const up = ramp(p, -0.62, 0.32);
  const settle = ramp(p, 0, 0.9);
  const bob = settle * Math.sin((2 * Math.PI * p) / 2.25);
  const angle = -0.1 - 0.07 * (1 - up) + 0.012 * bob;
  const snout = { x: 1050 + 10 * p, y: 1050 + 470 * (1 - up) + 10 * bob };
  // The limp salmon flops as the head comes up, and once more on "HEAD".
  const flop = 9 * Math.sin(Math.max(0, p - BREACH) * 10) * Math.exp(-Math.max(0, p - BREACH) * 2.6) * ramp(p, BREACH - 0.2, BREACH);
  const nod = 7 * Math.sin(Math.max(0, p - HEAD_AT) * 12) * Math.exp(-Math.max(0, p - HEAD_AT) * 4);
  return {
    orca: { ...centreOf(snout, HOOK_LEN, angle), len: HOOK_LEN, angle, female: true, hat: 1, flick: flop + nod, tail: p * 2.2 },
    age: p - BREACH,
  };
}

// ---------------------------------------------------------------- the row (and the same row when the fad is gone)

export interface RowSlot {
  readonly snout: { readonly x: number; readonly y: number };
  readonly len: number;
  readonly angle: number;
  readonly female: boolean;
  /** When it surfaces. */
  readonly up: number;
  /** When its hat fades away (the vanish beat). */
  readonly gone: number;
  /** The water line at it. */
  readonly water: number;
}

const slot = (x: number, y: number, len: number, female: boolean, up: number, gone: number): RowSlot =>
  ({ snout: { x, y }, len, angle: -0.06, female, up, gone, water: y + len * 0.04 });

/** Far to near: three tiny ones on the horizon ("everywhere"), then three that copy her, then her in front. */
export const ROW: readonly RowSlot[] = [
  slot(250, 742, 220, true, HATS_AT + 0.05, FAD_AT + 0.05),
  slot(620, 734, 190, false, HATS_AT + 0.4, FAD_AT + 0.2),
  slot(1010, 750, 240, true, EVERYWHERE_AT, FAD_AT + 0.35),
  slot(880, 800, 400, true, HER_AT - 0.1, FAD_AT + 0.5),
  slot(470, 852, 520, true, COPIED_AT - 0.05, VANISHED_AT - 0.05),
  slot(1070, 912, 640, false, OTHER_AT, VANISHED_AT + 0.1),
  slot(760, 1060, 1000, true, -1, VANISHED_AT + 0.28),
];
export const ROW_FIRST = ROW.length - 1;

export interface RowPose {
  readonly orca: HatOrca;
  readonly age: number;
  readonly water: number;
}

/** Every orca of the row at time t; `bare` is the vanish beat, the hats fading off. */
export function rowAt(t: number, bare: boolean): RowPose[] {
  const u = wrap(t);
  return ROW.map((s, k) => {
    const rise = 1 - ramp(u, s.up - 0.4, s.up + 0.12);
    const bob = Math.sin(u * 2.6 + k * 1.3);
    const angle = s.angle - 0.06 * rise + 0.01 * bob;
    const snout = { x: s.snout.x + 6 * (u - STARTS.row), y: s.snout.y + s.len * (0.3 * rise + 0.006 * bob) };
    const age = u - s.up;
    const flick = 9 * Math.sin(Math.max(0, age) * 10) * Math.exp(-Math.max(0, age) * 3);
    const hat = bare ? 1 - ramp(u, s.gone, s.gone + 0.35) : 1;
    return { orca: { ...centreOf(snout, s.len, angle), len: s.len, angle, female: s.female, hat, flick, tail: u * 2 + k }, age, water: s.water };
  });
}

// ---------------------------------------------------------------- J27

export const J27_LEN = 1400;
export const J27_WATER_Y = 1000;
/** He surfaces on "2024". */
export const J27_UP = YEAR24_AT + 0.25;
export const PUSH = { from: WITH_AT - 0.15, to: HIS_HEAD_AT + 0.1, zoom: 2, screen: { x: 600, y: 860 } } as const;
const VIDEO_MID = { x: 540, y: 960 } as const;

export interface J27Pose {
  readonly orca: HatOrca;
  readonly age: number;
  /** The camera: zoom about (cx, cy), which moves to (tx, ty) on screen. */
  readonly zoom: number;
  readonly cx: number;
  readonly cy: number;
  readonly tx: number;
  readonly ty: number;
}

export function j27At(t: number): J27Pose {
  const u = wrap(t);
  const rise = 1 - ramp(u, J27_UP - 0.45, J27_UP + 0.15);
  const bob = Math.sin(u * 2.3);
  const angle = -0.06 - 0.06 * rise + 0.01 * bob;
  const snout = { x: 930 + 14 * (u - BUT_AT), y: 940 + 320 * rise + 7 * bob };
  const orca: HatOrca = { ...centreOf(snout, J27_LEN, angle), len: J27_LEN, angle, female: false, hat: 1, tail: u * 2.1, flick: 12 * Math.sin(Math.max(0, u - J27_UP) * 9) * Math.exp(-Math.max(0, u - J27_UP) * 2.8) };
  const push = ramp(u, PUSH.from, PUSH.to);
  const drift = ramp(u, NOBODY_AT, LOOP_S) * 0.15;
  // The hat, near enough: the middle of the salmon above the head, local (-112, -100).
  const s = J27_LEN / 1000;
  const hat = { x: snout.x - 112 * s, y: snout.y - 100 * s - 112 * s * Math.sin(angle) };
  const neutral = { x: VIDEO_MID.x, y: VIDEO_MID.y };
  return {
    orca, age: u - J27_UP, zoom: 1 + (PUSH.zoom - 1) * push + drift,
    cx: neutral.x + (hat.x - neutral.x) * push, cy: neutral.y + (hat.y - neutral.y) * push,
    tx: neutral.x + (PUSH.screen.x - neutral.x) * push, ty: neutral.y + (PUSH.screen.y - neutral.y) * push,
  };
}

// ---------------------------------------------------------------- written things

export interface Tag {
  readonly text: string;
  readonly from: number;
  readonly to: number;
}

/** The small tags at the top: never in frame 1 (the first is on the second beat). */
export const TAGS: readonly Tag[] = [
  { text: '1987', from: COPIED_AT, to: THEN_AT + 0.25 },
  { text: 'summer 1988', from: NEXT_AT - 0.05, to: BUT_AT },
  { text: '2024', from: YEAR24_AT, to: J27_AT + 0.1 },
  { text: 'J27 · 2024', from: J27_AT, to: NOBODY_AT },
  { text: 'J27 · born 1991', from: HE_AT - 0.05, to: LOOP_S - 0.3 },
];
export const tagAlpha = (tag: Tag, t: number): number => window01(wrap(t), tag.from, tag.to, 0.2);
export const anyTagAt = (t: number): number => Math.max(...TAGS.map((g) => tagAlpha(g, t)));

/** The viewfinder over J27: from "photographer" until the push-in. */
export const viewfinderAt = (t: number): number => window01(wrap(t), PHOTOGRAPHER_AT - 0.1, PUSH.from + 0.3, 0.2);
/** The shutter's flash on "caught". */
export const flashAt = (t: number): number => { const a = wrap(t) - CAUGHT_AT; return a < 0 || a > 0.5 ? 0 : Math.exp(-a * 9); };
/** "Nobody knows why.": a big question mark. */
export const questionAt = (t: number): number => window01(wrap(t), NOBODY_AT + 0.1, HE_AT, 0.2);
/** The dark drama from "Nobody" until the hook takes over. */
export const darkAt = (t: number): number => ramp(wrap(t), NOBODY_AT - 0.1, NOBODY_AT + 0.4);
