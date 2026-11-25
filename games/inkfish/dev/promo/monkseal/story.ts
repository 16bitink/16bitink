import type { Pt } from '../../../src/art/pen';
import { lerp, ramp, window01 } from '../short';
import { hangingEel, type SealPose } from './art/seal';
import { NOSTRIL } from './art/sealFace';
import { lengthOf, piece, smoothPath } from './paths';
import {
  BOIL_STEPS, BUT_AT, CATCH_AT, EEL2_AT, EEL_AT, EXIT_AT, FOUR_AT, HIDING_AT, MAYBE_AT, NOBODY_AT, ONE_AT, OR_AT, POP_AT, PULL1_AT, PULL2_AT, PULL3_AT, SCIENTISTS_AT, SNEEZE_AT, SWALLOWED_AT, TEENAGE_AT, THEY_AT, THE_SEAL_AT, THREE_AT, TOTALLY_AT, TREND_AT, WHY_AT, WRONG_AT, boilAt, said, wrap, LOOP_S,
} from './times';

export * from './times';

/**
 * "This seal has an eel up its nose": Hawaiian monk seals, seen "three or four
 * times" by NOAA's Hawaiian Monk Seal Research Program (Dec 2018; the latest a
 * juvenile at French Frigate Shoals, summer 2018). Researchers restrain the
 * seal and gently pull the eel out; the seals were fine. Nobody knows why: a
 * cornered eel fleeing into the nostril, or one swallowed and coming back up
 * the wrong way; Charles Littnan compared it to a teenage trend. Told by a
 * narrator (words.ts), every beat a function of time over LOOP_S, a new mood
 * a sentence:
 *
 *   0     "This seal has an EEL up its nose!" (excited): frame 1, its deadpan
 *         face filling the frame, a spotted eel swinging from one nostril.
 *   2.5   "Scientists in Hawaii have seen it three or four times." (curious): the
 *         camera backs off; more seals pop up behind, each with an eel.
 *   5.3   "They catch the seal, gently pull… and pull… and PULL!" (dramatic):
 *         one holds the seal, the other pulls, the eel longer and longer, and POP.
 *  10.3   "The seal? Totally fine." (a chuckle): a smile, and a sneeze.
 *  12.2   "Maybe the eel was hiding…" (mischievous): from inside a crevice, the
 *         seal's face pokes in and the cornered eel darts up its nose.
 *  13.8   "…or got swallowed, and took the WRONG exit!": the gulp, a bulge up the cheek to the nose.
 *  16.6   "One scientist compared it to a teenage trend." (sarcastic): the eel worn
 *         with sunglasses, a friend impressed, a researcher unconvinced.
 *  19.0   "But honestly… nobody knows why" (surprised): back to frame 1's face.
 */

export type SceneId = 'hook' | 'row' | 'pull' | 'fine' | 'hide' | 'exit' | 'trend';

/** Each scene's start; it stays until the next has faded in over it. The hook comes back at the end. */
export const STARTS: Readonly<Record<SceneId, number>> = {
  hook: BUT_AT - 0.12,
  row: SCIENTISTS_AT - 0.1,
  pull: THEY_AT - 0.1,
  fine: THE_SEAL_AT - 0.14,
  hide: MAYBE_AT - 0.1,
  exit: OR_AT - 0.1,
  trend: ONE_AT - 0.14,
};
export const FADE = 0.2;
export const SCENE_IDS: readonly SceneId[] = ['row', 'pull', 'fine', 'hide', 'exit', 'trend', 'hook'];
const AFTER: Readonly<Record<SceneId, SceneId>> = { hook: 'row', row: 'pull', pull: 'fine', fine: 'hide', hide: 'exit', exit: 'trend', trend: 'hook' };

export function sceneAlpha(id: SceneId, t: number): number {
  const u = wrap(t);
  if (id === 'hook') return u < STARTS.row + FADE ? 1 : u >= STARTS.hook ? ramp(u, STARTS.hook, STARTS.hook + FADE) : 0;
  const end = STARTS[AFTER[id]] + FADE;
  return u >= STARTS[id] && u < end ? ramp(u, STARTS[id], STARTS[id] + FADE) : 0;
}

/** The loop's clock round the seam: negative in the last seconds, so the seam is one motion. */
export const pOf = (t: number): number => { const u = wrap(t); return u > LOOP_S / 2 ? u - LOOP_S : u; };

/** A slow beat for whiskers and breath, whole cycles in the loop, stepped like the line boil. */
export const beatAt = (t: number): number => (2 * Math.PI * 9 * boilAt(wrap(t))) / BOIL_STEPS;
export const breathAt = (t: number): number => Math.sin((2 * Math.PI * 7 * wrap(t)) / LOOP_S);

/** A blink centred on `at`, 0 .. 1. */
const blink = (t: number, at: number, w = 0.11): number => Math.max(0, 1 - Math.abs(t - at) / w);
/** A springy wobble that starts at `at` and dies away. */
const wobble = (t: number, at: number, hz: number, decay: number): number => (t < at ? 0 : Math.sin((t - at) * hz * 2 * Math.PI) * Math.exp(-(t - at) * decay));

// ---------------------------------------------------------------- the hook (frame 1)

export const DEADPAN = 0.4;
export const HOOK = { x: 540, y: 812, scale: 2.52 } as const;

export function hookAt(t: number): SealPose {
  const p = pOf(t);
  const push = ramp(p, STARTS.hook - LOOP_S, -0.2);
  const bump = 0.05 * Math.max(0, wobble(p, EEL_AT, 1.4, 5));
  const scale = HOOK.scale * (lerp(0.86, 1, push) + bump);
  // It glances aside at "honestly", then up, then back to us.
  const aside = window01(p, NOBODY_AT - LOOP_S - 0.35, WHY_AT - LOOP_S + 0.1, 0.16);
  const peek = window01(p, 0.62, 1.16, 0.14);
  const swing = Math.sin(2 * Math.PI * 0.62 * p + 0.5);
  return {
    x: HOOK.x, y: HOOK.y + (1 - push) * 40, scale,
    tilt: 0.018 * Math.sin(2 * Math.PI * 0.31 * p),
    breath: Math.sin(2 * Math.PI * 0.33 * p),
    face: {
      lid: Math.max(DEADPAN, blink(p, 1.95), blink(p, -0.42)), smile: -0.45, gaze: aside * 0.95 + peek * 0.5, gazeY: peek * 1, brow: 0, beat: beatAt(t), stretch: 1,
    },
    eel: { spine: hangingEel(322, swing * (1 + 0.6 * Math.max(0, wobble(p, EEL_AT, 1.1, 2))), 2 * Math.PI * 0.5 * p) },
  };
}

// ---------------------------------------------------------------- "three or four times": the line-up

interface Slot { readonly x: number; readonly y: number; readonly scale: number; readonly up: number; readonly len: number }
/** Near to far: the eel seal, then three more popping up behind. */
export const ROW: readonly Slot[] = [
  { x: 300, y: 1060, scale: 1.42, up: -1, len: 250 },
  { x: 836, y: 930, scale: 1.08, up: THREE_AT - 0.14, len: 260 },
  { x: 560, y: 752, scale: 0.72, up: said('or') - 0.04, len: 210 },
  { x: 912, y: 640, scale: 0.58, up: FOUR_AT - 0.02, len: 230 },
];

export function rowAt(t: number): SealPose[] {
  const u = wrap(t);
  const h = hookAt(STARTS.row);
  const back = ramp(u, STARTS.row, STARTS.row + 0.55);
  return ROW.map((s, k): SealPose => {
    const rise = k ? ramp(u, s.up - 0.16, s.up + 0.1) : 1;
    const pop = 1 + 0.1 * wobble(u, s.up + 0.02, 2.4, 6);
    const scale = k ? s.scale * pop * (0.3 + 0.7 * rise) : lerp(h.scale, s.scale, back);
    const [x, y] = k ? [s.x, s.y + (1 - rise) * 300 * s.scale] : [lerp(h.x, s.x, back), lerp(h.y, s.y, back)];
    const sway = Math.sin(u * 3.4 + k * 1.7);
    return {
      x, y, scale, tilt: (k % 2 ? -1 : 1) * 0.03 * Math.sin(u * 2 + k),
      face: { lid: [DEADPAN, 0.3, 0.52, 0.22][k]!, smile: -0.4, gaze: k ? (s.x > 540 ? -0.4 : 0.4) : 0, beat: beatAt(t) + k, stretch: 1 },
      eel: { spine: hangingEel(s.len, sway, u * 3 + k) },
      breath: breathAt(t),
    };
  });
}
/** How far seal `k` of the line-up is out, 0 .. 1 (0: not drawn). */
export const rowUp = (k: number, t: number): number => (k ? ramp(wrap(t), ROW[k]!.up - 0.16, ROW[k]!.up + 0.02) : 1);

// ---------------------------------------------------------------- the pull

const PULLS = [PULL1_AT, PULL2_AT, PULL3_AT] as const;
/** How much of the eel is out of the nose, in px on screen: more with each pull. */
export const OUT_PX = [430, 900, 1560, 2260] as const;

export interface PullPose {
  readonly seal: SealPose;
  /** The nostril on screen. */
  readonly nostril: Pt;
  /** The eel's spine on screen: from the nostril (or its own head, once out) to the tail. */
  readonly eel: readonly Pt[];
  readonly eelHead: boolean;
  readonly out: number;
  readonly handA: Pt;
  readonly handB: Pt;
  /** The puller: lean, and how far he has fallen back, 0 .. 1. */
  readonly lean: number;
  readonly fall: number;
  readonly tug: number;
  readonly popAge: number;
  /** The holder's hands reach the seal, 0 .. 1. */
  readonly hold: number;
  readonly grab: number;
}

export function pullAt(t: number): PullPose {
  const u = wrap(t);
  const each = PULLS.map((p, i) => ramp(u, p - 0.06, p + (i === 2 ? 0.3 : 0.42)));
  const out = each.reduce((s, v, i) => s + v * (OUT_PX[i + 1]! - OUT_PX[i]!), OUT_PX[0]);
  // A tug as each pull bites, let go between pulls (the hands slide back for a new grip).
  const regrip = PULLS.map((p, i) => ramp(u, p + 0.45, (PULLS[i + 1] ?? p + 9) - 0.1));
  const reach = each.reduce((s, v, i) => s + v - (i < 2 ? regrip[i]! : 0), 0);
  const tug = Math.min(1, reach) * (u < POP_AT ? 1 : 0);
  const age = u - POP_AT;
  const fall = ramp(u, POP_AT + 0.04, POP_AT + 0.5);
  const jig = wobble(u, POP_AT, 3.2, 4);
  const grab = ramp(u, CATCH_AT, PULL1_AT - 0.35);
  const seal: SealPose = {
    x: 308 + tug * 22, y: 902, scale: 1.4, tilt: 0.1 * tug - 0.05 * jig, dx: 12 * tug - 8 * jig, dy: 5 * Math.abs(jig),
    breath: breathAt(t),
    face: {
      lid: age > 0 ? 0.02 : lerp(DEADPAN, 0.22, tug), smile: -0.5, gaze: age > 0 ? 0.6 : 0.7 * ramp(u, CATCH_AT, CATCH_AT + 0.4), gazeY: 0.2, brow: age > 0 ? 0.8 : -0.5 * tug,
      beat: beatAt(t), stretch: 1 - 0.95 * ramp(u, POP_AT, POP_AT + 0.35), wrinkle: 0.3 * tug,
    },
  };
  const a = (seal.tilt ?? 0);
  const local = { x: NOSTRIL.x, y: NOSTRIL.y - 120 };
  const nostril = {
    x: seal.x + seal.scale * ((seal.dx ?? 0) + local.x * Math.cos(a) - local.y * Math.sin(a)),
    y: seal.y + seal.scale * ((seal.dy ?? 0) + 120 + local.x * Math.sin(a) + local.y * Math.cos(a)),
  };
  // Before the grip the eel hangs; then the hands lift it taut to the right.
  const hands = { x: lerp(590, 716, Math.min(1, reach)) + 330 * fall, y: lerp(1110, 1062, Math.min(1, reach)) - 60 * Math.sin(Math.PI * fall) + 260 * fall };
  const handA = { x: hands.x, y: hands.y };
  const handB = { x: hands.x + 104, y: hands.y + 26 };
  const spine = age > 0 ? poppedEel(nostril, handA, handB, age) : tautEel(nostril, handA, handB, out, grab, u);
  return { seal, nostril, eel: spine, eelHead: age > 0, out, handA, handB, lean: -0.05 + 0.15 * Math.min(1, reach) * (1 - fall) + 0.4 * fall, fall, tug, popAge: age, hold: ramp(u, THEY_AT, CATCH_AT + 0.2), grab };
}

/** The rest of the eel beyond the hands: down to the sand, then back and forth along it, `len` px of it. */
function slackTail(from: Pt, len: number, u: number): Pt[] {
  const ground = 1584;
  // Down, round a soft corner, along the sand to the left, round again and back.
  const r = 118;
  const way = smoothPath([
    from, { x: from.x + 10, y: (from.y + ground - r) / 2 }, { x: from.x, y: ground - r }, { x: from.x - r * 0.34, y: ground - r * 0.3 }, { x: from.x - r, y: ground }, { x: from.x - 260, y: ground + 26 }, { x: from.x - 460, y: ground - 4 },
    { x: from.x - 620, y: ground + 26 }, { x: from.x - 716, y: ground + 100 }, { x: from.x - 620, y: ground + 178 }, { x: from.x - 420, y: ground + 168 }, { x: from.x - 200, y: ground + 196 }, { x: from.x + 100, y: ground + 178 },
  ], 10).map((p, i) => ({ x: p.x + 6 * Math.sin(i * 0.25 + u * 3), y: p.y }));
  return piece(way, 8, Math.min(lengthOf(way), len), 60);
}

function tautEel(nose: Pt, a: Pt, b: Pt, out: number, grab: number, u: number): Pt[] {
  const inside = { x: nose.x - 26, y: nose.y - 22 };
  const span = Math.hypot(a.x - nose.x, a.y - nose.y);
  const sag = 60 * (1 - grab) + 16;
  const line: Pt[] = Array.from({ length: 18 }, (_, i) => {
    const v = i / 17;
    return { x: nose.x + (a.x - nose.x) * v, y: nose.y + (a.y - nose.y) * v + sag * Math.sin(Math.PI * v) };
  });
  const taut = [inside, ...line, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 2 }, b, { x: b.x + 34, y: b.y + 34 }, ...slackTail({ x: b.x + 44, y: b.y + 60 }, Math.max(110, out - span - 200), u)];
  if (grab >= 0.999) return taut;
  // Picked up: from hanging straight down to the hands.
  const hung = hangingEel(out / 1.4, 0.3).map((q) => ({ x: nose.x + (q.x - NOSTRIL.x) * 1.4, y: nose.y + (q.y - NOSTRIL.y) * 1.4 }));
  return taut.map((q, i) => {
    const h = hung[Math.min(hung.length - 1, Math.round((i / (taut.length - 1)) * (hung.length - 1)))]!;
    return { x: lerp(h.x, q.x, grab), y: lerp(h.y, q.y, grab) };
  });
}

/** Out: the head end whips up and over after the hands. */
function poppedEel(nose: Pt, a: Pt, b: Pt, age: number): Pt[] {
  const k = Math.min(1, age / 0.5);
  const head = { x: lerp(nose.x + 20, a.x - 130, k), y: nose.y + 20 - 620 * k * (1 - k * 0.42) };
  const mid = { x: lerp((nose.x + a.x) / 2, a.x - 10, k), y: lerp((nose.y + a.y) / 2, a.y - 250, k) };
  const arc: Pt[] = Array.from({ length: 16 }, (_, i) => {
    const v = i / 15;
    const w = 1 - v;
    const c = { x: 2 * mid.x - (head.x + a.x) / 2, y: 2 * mid.y - (head.y + a.y) / 2 };
    return { x: w * w * head.x + 2 * w * v * c.x + v * v * a.x, y: w * w * head.y + 2 * w * v * c.y + v * v * a.y + 14 * Math.sin(v * 9 + age * 20) * (1 - v) };
  });
  return [...arc, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b, { x: b.x + 34, y: b.y + 40 }, ...slackTail({ x: b.x + 44, y: b.y + 70 }, 1500, age)];
}

// ---------------------------------------------------------------- "Totally fine."

export function fineAt(t: number): SealPose {
  const u = wrap(t);
  const happy = ramp(u, TOTALLY_AT - 0.05, TOTALLY_AT + 0.2) * (1 - 0.0 * u);
  const wind = window01(u, SNEEZE_AT - 0.32, SNEEZE_AT + 0.02, 0.24);
  const burst = window01(u, SNEEZE_AT - 0.03, SNEEZE_AT + 0.5, 0.06);
  return {
    x: 540, y: 850 - 24 * wind + 46 * burst, scale: 2.2 * (1 + 0.06 * burst), tilt: -0.03 * wind + 0.06 * Math.sin(u * 2.6) * happy * (1 - burst),
    breath: breathAt(t),
    face: { lid: Math.max(0.12, blink(u, THE_SEAL_AT + 0.42), burst), happy: happy * (1 - 0.0 * burst), smile: lerp(-0.2, 0.95, happy) * (1 - burst), brow: 0.5 * wind, beat: beatAt(t), stretch: 0, wrinkle: Math.max(wind, 0.6 * burst), open: 0.75 * burst },
    liftL: 0, liftR: 0,
  };
}
/** Seconds since the sneeze burst (negative: not yet). */
export const sneezeAge = (t: number): number => wrap(t) - SNEEZE_AT;

// ---------------------------------------------------------------- "hiding…": from inside the crevice

export interface HidePose {
  readonly seal: SealPose;
  /** The eel's spine on screen, head first; its front end may be up the nose. */
  readonly eel: readonly Pt[];
  /** Still has its head out. */
  readonly headOut: boolean;
  /** How far up the nose it is, 0 .. 1. */
  readonly gone: number;
}

export const HIDE_SCALE = 1.95;
const HIDE = { x: 540, y: 742 } as const;
export const HIDE_NOSTRIL: Pt = { x: HIDE.x + NOSTRIL.x * HIDE_SCALE, y: HIDE.y + (NOSTRIL.y + 4) * HIDE_SCALE };
/** The eel's way: from its corner of the crevice, along the ledge, then up into the nostril. */
const HIDE_PATH: readonly Pt[] = smoothPath([
  { x: 20, y: 1240 }, { x: 150, y: 1140 }, { x: 290, y: 1206 }, { x: 430, y: 1140 }, { x: 570, y: 1206 }, { x: 740, y: 1150 }, { x: 800, y: 1060 }, { x: 730, y: 980 },
  { x: 660, y: 910 }, { x: HIDE_NOSTRIL.x + 4, y: HIDE_NOSTRIL.y + 40 }, { x: HIDE_NOSTRIL.x - 6, y: HIDE_NOSTRIL.y - 26 },
]);
const HIDE_LEN = 820;
const HIDE_TOTAL = lengthOf(HIDE_PATH);
export const DART = { from: HIDING_AT - 0.08, to: HIDING_AT + 0.5 } as const;

export function hideAt(t: number): HidePose {
  const u = wrap(t);
  const poke = ramp(u, STARTS.hide, EEL2_AT + 0.1);
  const dart = ramp(u, DART.from, DART.to) ** 1.2;
  const start = 830;
  const head = start + 8 * Math.sin(u * 9) * (1 - dart) + dart * (HIDE_TOTAL + 420 - start);
  const tail = head - HIDE_LEN;
  const front = Math.min(head, HIDE_TOTAL);
  const shock = ramp(u, DART.from + 0.1, DART.from + 0.3);
  return {
    seal: {
      x: HIDE.x, y: HIDE.y, scale: HIDE_SCALE * lerp(0.6, 1, poke), afloat: true, tilt: 0.02 * Math.sin(u * 3),
      face: { lid: lerp(0.1, 0, shock), smile: -0.2, gaze: lerp(0.5, 0.2, shock), gazeY: 1, brow: lerp(0.4, 1, shock), beat: beatAt(t), stretch: ramp(u, DART.from + 0.16, DART.from + 0.3), wrinkle: 0.35 * shock },
    },
    eel: piece(HIDE_PATH, front, Math.max(0, tail), 60),
    headOut: head < HIDE_TOTAL - 4,
    gone: Math.max(0, Math.min(1, (head - HIDE_TOTAL) / HIDE_LEN)),
  };
}

// ---------------------------------------------------------------- "the WRONG exit!"

/** The eel's way into the mouth, in head units: from below left, over the lower lip and under the muzzle. */
const IN_PATH: readonly Pt[] = smoothPath([{ x: -520, y: 330 }, { x: -420, y: 300 }, { x: -320, y: 330 }, { x: -220, y: 286 }, { x: -120, y: 300 }, { x: -40, y: 256 }, { x: -2, y: 200 }, { x: 0, y: 150 }, { x: 0, y: 96 }]);
const IN_TOTAL = lengthOf(IN_PATH);
/** Where along it the head slips in under the muzzle. */
const IN_MOUTH = IN_TOTAL - 34;
const IN_LEN = 460;
export const GULP_AT = SWALLOWED_AT + 0.56;
/** The bulge's way: from the mouth's corner out into the cheek, up, and in to the nostril. */
const BULGE_PATH: readonly Pt[] = smoothPath([{ x: 104, y: 112 }, { x: 138, y: 104 }, { x: 148, y: 80 }, { x: 134, y: 62 }, { x: 98, y: 46 }, { x: NOSTRIL.x + 14, y: NOSTRIL.y + 6 }]);
export const BULGE = { from: GULP_AT + 0.12, to: EXIT_AT - 0.08 } as const;

export interface ExitPose {
  readonly seal: SealPose;
  /** The eel on its way in: its spine (head units, head end first), and whether its head is already inside. */
  readonly going: readonly Pt[] | null;
  readonly headIn: boolean;
  /** The eel popped out of the nostril (head units, head end first, its other end inside). */
  readonly popped: readonly Pt[] | null;
  /** How far out it is, 0 .. 1. */
  readonly out: number;
  /** The NOSE sign's light, 0 .. 1. */
  readonly wrong: number;
}

/** The eel springing out of the nostril and drooping, its head lifted to look at us. */
function poppedOut(out: number, spring: number): Pt[] {
  const len = 20 + 250 * out;
  const base = smoothPath([
    { x: NOSTRIL.x - 8, y: NOSTRIL.y - 14 }, { x: NOSTRIL.x + 8, y: NOSTRIL.y + 30 }, { x: 76, y: 104 }, { x: 74, y: 160 }, { x: 40, y: 198 }, { x: -12, y: 190 }, { x: -40, y: 152 },
  ]).map((p) => {
    const d = Math.max(0, p.y - NOSTRIL.y) / 180;
    return { x: p.x + 26 * spring * d, y: p.y - 14 * spring * d };
  });
  return piece(base, Math.min(lengthOf(base), len), 0, 48);
}

export function exitAt(t: number): ExitPose {
  const u = wrap(t);
  const swim = ramp(u, STARTS.exit - 0.15, SWALLOWED_AT + 0.02);
  const slurp = Math.max(0, Math.min(1, (u - SWALLOWED_AT + 0.04) / (GULP_AT - SWALLOWED_AT + 0.02)));
  const head = lerp(330, IN_MOUTH + 6, swim) + slurp * (IN_LEN + 30);
  const gone = u >= GULP_AT;
  const gulp = ramp(u, GULP_AT - 0.04, GULP_AT + 0.08);
  const b = ramp(u, BULGE.from, BULGE.to);
  const bulgeOn = window01(u, GULP_AT + 0.04, EXIT_AT + 0.02, 0.1);
  const at = piece(BULGE_PATH, 0, lengthOf(BULGE_PATH), 50)[Math.round(50 * b)]!;
  const pop = ramp(u, EXIT_AT - 0.04, EXIT_AT + 0.14);
  const spring = wobble(u, EXIT_AT + 0.06, 2.2, 4.5);
  // The eyes: down at the eel, shut on the gulp, after the bulge, then cross-eyed.
  const puff = window01(u, GULP_AT - 0.04, WRONG_AT + 0.3, 0.16);
  const cross = ramp(u, WRONG_AT - 0.05, WRONG_AT + 0.3);
  const follow = ramp(u, BULGE.from, BULGE.from + 0.2) * (1 - cross);
  return {
    seal: {
      x: 416, y: 842 - 16 * wobble(u, GULP_AT, 2, 6), scale: 1.82, breath: breathAt(t), tilt: 0.05 * follow - 0.05 * spring,
      face: {
        lid: Math.max(0.06, blink(u, GULP_AT + 0.02, 0.14)), smile: -0.25, open: 0.62 * (1 - gulp) * ramp(u, STARTS.exit - 0.05, STARTS.exit + 0.2), brow: lerp(0.35, 1, ramp(u, WRONG_AT, EXIT_AT)),
        gaze: (1 - ramp(u, GULP_AT, GULP_AT + 0.1)) * -0.3 + 0.9 * follow, gazeY: lerp(0.9, 0.5, cross), cross, puff, beat: beatAt(t), stretch: ramp(u, EXIT_AT - 0.22, EXIT_AT),
        wrinkle: 0.5 * window01(u, EXIT_AT - 0.3, EXIT_AT + 0.1, 0.12), bulge: { x: at.x, y: at.y, size: bulgeOn * lerp(1.12, 0.78, b) }, amber: Math.max(cross, 0.7 * follow),
      },
    },
    going: gone ? null : piece(IN_PATH, Math.min(head, IN_TOTAL), Math.max(0, head - IN_LEN), 50),
    headIn: head > IN_MOUTH, popped: pop > 0.01 ? poppedOut(pop, spring) : null, out: pop, wrong: ramp(u, WRONG_AT - 0.05, WRONG_AT + 0.12),
  };
}

// ---------------------------------------------------------------- "a teenage trend"

export interface TrendPose { readonly cool: SealPose; readonly friend: SealPose; /** The sunglasses' drop: 0 above the frame .. 1 on. */ readonly glasses: number; readonly wow: number; readonly shrug: number }
export function trendAt(t: number): TrendPose {
  const u = wrap(t);
  const on = ramp(u, TEENAGE_AT - 0.1, TEENAGE_AT + 0.14);
  const wow = ramp(u, TEENAGE_AT + 0.12, TREND_AT);
  const bob = wobble(u, TEENAGE_AT + 0.12, 2, 4);
  const strut = 0.05 * Math.sin(u * 5) * on;
  return {
    cool: {
      x: 790, y: 1010, scale: 1.3, tilt: 0.04 + 0.08 * on + strut, dy: -12 * on + 8 * bob, breath: breathAt(t),
      face: { lid: 0.3, smile: lerp(0, 0.85, on), beat: beatAt(t), stretch: 1 }, eel: { spine: hangingEel(272, Math.sin(u * 3.6) * 1.1, u * 4) }, liftR: 0,
    },
    friend: {
      x: 258, y: 1050, scale: 1.16, tilt: 0.07 * wow, dx: 10 * wow, breath: breathAt(t + 1),
      face: { lid: lerp(0.3, 0, wow), smile: 0.1, gaze: 1, brow: wow, beat: beatAt(t) + 2, stretch: 0, open: 0.42 * wow },
    },
    glasses: on, wow, shrug: ramp(u, said('compared') - 0.1, said('compared') + 0.3),
  };
}

/** "nobody knows why": a question mark by its head, gone before the loop point. */
export const questionAt = (t: number): number => window01(wrap(t), NOBODY_AT - 0.05, WHY_AT + 0.22, 0.16);
