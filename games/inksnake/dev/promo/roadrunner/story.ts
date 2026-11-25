import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, lerp, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "The REAL roadrunner eats rattlesnakes!": narrated, a pure function of
 * time, every beat timed from the words. The greater roadrunner (Geococcyx
 * californianus) takes young rattlesnakes by the head and beats them on the
 * ground; a snake too long to swallow hangs from the bill while it digests,
 * sometimes over an hour; a coyote runs about 40 mph, a roadrunner about 20.
 * No gore: the slam is dust and a flash, and the snake goes limp.
 *
 *   0     frame 1: the bird's head and chest, huge, a young diamondback
 *         hanging out of its bill, rattle shaking; a gulp on "eats" (hook)
 *   2.5   "It grabs a young one by the head…": the strike at a coiled snake
 *   4.3   "and SLAMS it on the ground!": up over the head and down, twice
 *   6.2   "Too long to swallow?": it gulps, the snake stays out; "No
 *         problem.": a slow blink and a tilt of the head
 *   8.45  "It just walks around… with the tail hanging OUT of its mouth!":
 *         a proud strut, the tail swinging
 *  11.35  "Sometimes for over an HOUR.": standing, the sun sliding across the
 *         sky, its shadow sweeping round
 *  13.35  "And the coyote? In real life, he's twice as FAST.": it gallops up
 *         and past the running bird
 *  16.6   "Good thing": it looks back, sees the snake and brakes; the camera
 *         pushes in to the bill = frame 1
 */
export const LOOP_S = 18;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;

/** Words per caption line, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [3, 2, 2, 3, 3, 3, 3, 2, 2, 2, 4, 3, 2, 3, 2, 3, 3, 3, 2, 2, 2];
const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const EATS_AT = startOf(3);
export const GRABS_AT = startOf(6);
export const HEAD_AT = startOf(12);
export const AND_AT = startOf(13);
export const SLAMS_AT = startOf(14);
export const GROUND_AT = startOf(18);
export const TOO_AT = startOf(19);
export const LONG_AT = startOf(20);
export const SWALLOW_AT = startOf(22);
export const NO_AT = startOf(23);
export const WALKS_AT = startOf(27);
export const OUT_AT = startOf(33);
export const HOUR_AT = startOf(41);
export const COYOTE_AT = startOf(44);
export const REAL_AT = startOf(46);
export const TWICE_AT = startOf(49);
export const FAST_AT = startOf(51);
export const GOOD_AT = startOf(52);
export const THING_AT = startOf(53);
export const LAST_END = endOf(WORDS.length - 1);

/** The cuts, each just before the first word of its beat. */
export const CUT = {
  grab: startOf(5) - 0.14,
  long: startOf(19) - 0.12,
  strut: startOf(25) - 0.12,
  hour: startOf(37) - 0.1,
  race: startOf(42) - 0.12,
} as const;

export type Scene = 'hook' | 'grab' | 'long' | 'strut' | 'hour' | 'race';

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  if (u < CUT.grab) return 'hook';
  if (u < CUT.long) return 'grab';
  if (u < CUT.strut) return 'long';
  if (u < CUT.hour) return 'strut';
  return u < CUT.race ? 'hour' : u >= PUSH.done ? 'hook' : 'race';
}

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;

/** Piecewise smooth keys: [time, value], eased between. */
export function keys(t: number, ks: readonly (readonly [number, number])[]): number {
  if (t <= ks[0]![0]) return ks[0]![1];
  for (let i = 1; i < ks.length; i++) {
    const [a, b] = [ks[i - 1]!, ks[i]!];
    if (t <= b[0]) return lerp(a[1], b[1], ramp(t, a[0], b[0]));
  }
  return ks[ks.length - 1]![1];
}

// ---------------------------------------------------------------- the hook, and the push back into it

/** The push in to the bill: starts, cross-fades into the hook's drawing, and is done just before the loop point. */
export const PUSH = { from: GOOD_AT + 0.06, fade: GOOD_AT + 0.42, done: LOOP_S - 0.14 } as const;

/** The hook's own clock: it runs from before the loop point (negative) to the first cut. */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u > LOOP_S / 2 ? u - LOOP_S : u;
};

/** 0 the race's framing .. 1 the hook's (a steady push, easing into frame 1). */
export const pushAt = (t: number): number => ramp(wrap(t), PUSH.from, PUSH.done);
export const pushFade = (t: number): number => ramp(wrap(t), PUSH.fade, PUSH.done - 0.12);

export interface HookPose {
  /** The snake's swing (radians) and the rattle's shake. */
  readonly swing: number;
  readonly shake: number;
  /** How much of what hangs has been gulped in, 0..1, and the bulge going down the neck (0..1 along; −1 none). */
  readonly gulp: number;
  readonly bulge: number;
  readonly crest: number;
  readonly lid: number;
  readonly zoom: number;
}

export function hookPose(t: number): HookPose {
  const u = hookClock(t);
  const g = ramp(u, EATS_AT - 0.04, EATS_AT + 0.22);
  return {
    swing: 0.11 * Math.sin(u * 4.2 + 0.4),
    shake: 0.34 * Math.sin(u * 62),
    gulp: 0.09 * g,
    bulge: u > EATS_AT + 0.05 && u < EATS_AT + 0.75 ? 1 - (u - EATS_AT - 0.05) / 0.7 : -1,
    crest: 0.86 + 0.14 * pulse(u, startOf(1) - 0.05, 0.1, 0.5) + 0.06 * Math.sin(u * 3),
    lid: pulse(u, startOf(2) + 0.02, 0.05, 0.1),
    zoom: 1 + 0.03 * ramp(u, 0, CUT.grab),
  };
}

// ---------------------------------------------------------------- the grab and the slam

/** The strike landing on the snake's head; the two slams. */
export const STRIKE_AT = GRABS_AT + 0.1;
export const SLAM_1 = SLAMS_AT + 0.1;
export const SLAM_2 = GROUND_AT + 0.05;

export interface GrabPose {
  /** The bird's eye from its hip (bird units) and its head's turn, the body's pitch. */
  readonly x: number;
  readonly y: number;
  readonly ang: number;
  readonly tilt: number;
  /** 0 the snake free .. 1 held. */
  readonly held: number;
  /** The held snake's direction (radians, down = π/2). */
  readonly dir: number;
  /** How hard it thrashes; 0 limp. */
  readonly thrash: number;
  readonly impact: number;
  readonly dust: number;
  readonly zoom: number;
}

const G0 = CUT.grab;
const POSE: readonly (readonly [number, number, number, number, number])[] = [
  // t, eye x, eye y, head turn, tilt
  [G0, 520, -600, 0.2, -0.1], [STRIKE_AT - 0.16, 470, -610, 0.12, -0.12], [STRIKE_AT, 742, 18, 0.62, 0.26], [STRIKE_AT + 0.2, 742, 18, 0.62, 0.26],
  [STRIKE_AT + 0.7, 590, -500, 0.12, -0.04], [AND_AT - 0.24, 590, -510, 0.1, -0.05], [AND_AT + 0.06, 360, -520, -0.4, -0.24], [SLAM_1 - 0.13, 340, -520, -0.45, -0.26], [SLAM_1, 772, 190, 0.82, 0.44],
  [SLAM_1 + 0.14, 766, 160, 0.8, 0.42], [SLAM_2 - 0.2, 440, -440, -0.3, -0.16], [SLAM_2 - 0.13, 436, -440, -0.3, -0.16], [SLAM_2, 766, 180, 0.82, 0.43], [SLAM_2 + 0.2, 760, 160, 0.8, 0.42], [CUT.long - 0.06, 640, -300, 0.3, 0.1],
];
const DIR: readonly (readonly [number, number])[] = [
  [STRIKE_AT, 0.6], [STRIKE_AT + 0.6, 1.57], [AND_AT - 0.3, 1.57], [AND_AT - 0.06, -0.6], [AND_AT + 0.1, -2.5], [SLAM_1 - 0.15, -3.0], [SLAM_1 - 0.02, 0.5], [SLAM_1 + 0.16, 0.55], [SLAM_2 - 0.24, -2.4], [SLAM_2 - 0.14, -2.8], [SLAM_2 - 0.02, 0.5], [SLAM_2 + 0.22, 0.55], [CUT.long, 1.4],
];

/** Where the snake's base points at a moment; the body follows later along it (a whip). */
export const grabDir = (t: number): number => keys(t, DIR);

export function grabPose(t: number): GrabPose {
  const u = wrap(t);
  const at = (i: 1 | 2 | 3 | 4): number => keys(u, POSE.map((k) => [k[0], k[i]] as const));
  const hit = u < (SLAM_1 + SLAM_2) / 2 ? SLAM_1 : SLAM_2;
  return {
    x: at(1), y: at(2), ang: at(3), tilt: at(4),
    held: ramp(u, STRIKE_AT - 0.01, STRIKE_AT + 0.02),
    dir: grabDir(u),
    thrash: window01(u, STRIKE_AT, SLAM_1 - 0.1, 0.12),
    impact: Math.max(pulse(u, SLAM_1, 0.03, 0.34), 0.8 * pulse(u, SLAM_2, 0.03, 0.34)),
    dust: u < SLAM_1 ? 0 : clamp01((u - hit) / 0.75),
    zoom: 1 + 0.16 * window01(u, STRIKE_AT + 0.1, AND_AT + 0.1, 0.35) + 0.04 * pulse(u, SLAM_1, 0.04, 0.3),
  };
}

// ---------------------------------------------------------------- too long to swallow

export interface LongPose {
  /** How much of the hanging snake is in (0..), the gulp's bulge (0..1 up the neck; −1 none). */
  readonly gulp: number;
  readonly bulge: number;
  readonly ang: number;
  readonly lid: number;
  readonly crest: number;
  /** The dashed measure down the snake, 0..1 drawn, and its strength. */
  readonly measure: number;
  readonly zoom: number;
}

export function longPose(t: number): LongPose {
  const u = wrap(t);
  const g = ramp(u, SWALLOW_AT - 0.05, SWALLOW_AT + 0.12);
  // It tries, the snake comes a little, and slips back out.
  const back = ramp(u, SWALLOW_AT + 0.3, SWALLOW_AT + 0.5);
  return {
    gulp: 0.14 * g - 0.1 * back,
    bulge: u > SWALLOW_AT && u < SWALLOW_AT + 0.55 ? 1 - (u - SWALLOW_AT) / 0.55 : -1,
    ang: 0.06 - 0.42 * window01(u, TOO_AT, SWALLOW_AT + 0.42, 0.28) + 0.2 * ramp(u, NO_AT, NO_AT + 0.25),
    lid: 0.62 * window01(u, NO_AT - 0.02, CUT.strut + 0.3, 0.14),
    crest: 0.35 + 0.65 * ramp(u, NO_AT - 0.05, NO_AT + 0.15),
    measure: ramp(u, LONG_AT - 0.1, LONG_AT + 0.3) * (1 - ramp(u, SWALLOW_AT - 0.05, SWALLOW_AT + 0.1)),
    zoom: 1 + 0.05 * ramp(u, CUT.long, CUT.strut),
  };
}

// ---------------------------------------------------------------- the strut

export const STEP_S = 0.62;
/** The strut's phase (0..1 a full two-step cycle): a step lands on "walks" and on "OUT". */
export const strutPhase = (t: number): number => (wrap(t) - WALKS_AT) / STEP_S;

// ---------------------------------------------------------------- the hour

/** The day going by: 0 morning .. 1 evening. */
export const dayAt = (t: number): number => ramp(wrap(t), CUT.hour + 0.05, CUT.race - 0.05);
/** How much of what hung out has gone down by then (bit by bit). */
export const digestAt = (t: number): number => 0.3 * dayAt(t);

// ---------------------------------------------------------------- the race

/** The bird's place on screen (its hip's x): it drops back as the coyote goes by, and runs on past it when it brakes. */
export const birdXAt = (t: number): number => keys(wrap(t), [[CUT.race, 560], [TWICE_AT, 540], [FAST_AT + 0.2, 250], [SKID_AT, 250], [GOOD_AT + 0.2, 480]]);
/** How far the coyote's middle is ahead of the bird's hip, px: behind until "twice", past it on "FAST", and left behind in the skid. */
export const coyoteLeadAt = (t: number): number => {
  const u = wrap(t);
  const run = keys(u, [[CUT.race, -900], [COYOTE_AT + 0.3, -520], [REAL_AT + 0.5, -430], [TWICE_AT, -400], [FAST_AT + 0.24, 330], [SKID_AT, 350]]);
  return run - 1900 * Math.max(0, u - SKID_AT) ** 1.55;
};
/** It looks back, sees the snake, and brakes. */
export const SKID_AT = FAST_AT + 0.36;
export const skidAt = (t: number): number => ramp(wrap(t), SKID_AT, SKID_AT + 0.16);
/** Its head turned to look back at the snake (1) while it is ahead of it; facing it (0) once the snake has gone by. */
export const lookBackAt = (t: number): number => ramp(wrap(t), SKID_AT - 0.12, SKID_AT) - ramp(wrap(t), GOOD_AT - 0.02, GOOD_AT + 0.08);
/** Speed streaks, strongest on "FAST". */
export const streakAt = (t: number): number => 0.45 + 0.55 * ramp(wrap(t), TWICE_AT - 0.1, FAST_AT) - ramp(wrap(t), FAST_AT + 0.4, GOOD_AT + 0.1);
/** The two small speeds (both units), only under "twice as FAST". */
export const speedsAt = (t: number): number => window01(wrap(t), TWICE_AT - 0.05, FAST_AT + 0.75, 0.16);
export const SPEEDS = [{ text: 'coyote: 40 mph (64 km/h)', y: 490 }, { text: 'roadrunner: 20 mph (32 km/h)', y: 556 }] as const;
export const SPEED_SIZE = 62;

// ---------------------------------------------------------------- the words

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

const HOOK_FROM = LOOP_S - 0.24;

export const LINES: readonly Line[] = LINE_WORDS.map((n, i) => {
  const first = FIRST[i]!;
  return {
    words: WORDS.slice(first, first + n),
    from: i === 0 ? 0 : startOf(first),
    to: i + 1 < LINE_WORDS.length ? startOf(FIRST[i + 1]!) : HOOK_FROM,
  };
});

export const HOOK_LINES = 2;
export const HOOK_TO = LINES[HOOK_LINES]!.from;

export const hookAlpha = (t: number): number => {
  const u = wrap(t);
  return u < HOOK_TO ? 1 : ramp(u, HOOK_FROM, LOOP_S - 0.04);
};

export const TEXT = {
  hook: { y: 392, gap: 124, size: 128 },
  line: { y: 386, size: 122 },
} as const;

export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start / TEMPO ? i : now), -1) };
}

export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, _, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

/** The credit: in 40% of the way through, gone before the loop point (credit.ts). */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: 0.4 * LOOP_S } as const;

// ---------------------------------------------------------------- the sound

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch = 1, gain = 0.5, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/**
 * Quiet under the voice, one mood per beat: the rattle and a gulp (excited),
 * the strike and the slams (dramatic), a stuck gulp and a pleased cluck
 * (mischievous), comic steps (chuckles), the ticking hour (surprised), the
 * gallop (sarcastic), the skid (nervous).
 */
export const SOUNDS: readonly SoundCue[] = [
  ...[0.08, 0.3, 0.52, 0.74].map((t, i) => cue('tick', t, 2.2 + i * 0.06, 0.22, 0.3)),
  cue('gulp', EATS_AT + 0.05, 0.7, 0.5),
  cue('strike', CUT.grab + 0.06, 1.2, 0.35, 0.4),
  cue('pounce', STRIKE_AT - 0.12, 1.1, 0.45),
  cue('nip', STRIKE_AT, 0.8, 0.5, 0.2),
  cue('squeeze', STRIKE_AT + 0.4, 1.2, 0.25, 0.2),
  cue('flap', SLAM_1 - 0.34, 0.9, 0.45, -0.2),
  cue('bump', SLAM_1, 0.45, 0.7, 0.3),
  cue('flap', SLAM_2 - 0.3, 1.05, 0.35, -0.2),
  cue('bump', SLAM_2, 0.5, 0.62, 0.3),
  cue('appear', LONG_AT, 0.9, 0.3),
  cue('gulp', SWALLOW_AT, 0.55, 0.5),
  cue('squeeze', SWALLOW_AT + 0.3, 0.8, 0.3),
  cue('cluck', NO_AT + 0.02, 0.9, 0.4),
  ...Array.from({ length: 9 }, (_, i) => cue('steps', WALKS_AT - STEP_S / 2 + i * (STEP_S / 2) * 1, 1.15 + (i % 2) * 0.2, 0.34, i % 2 ? 0.1 : -0.1)),
  cue('card', OUT_AT, 1, 0.3),
  ...Array.from({ length: 5 }, (_, i) => cue('tick', CUT.hour + 0.1 + i * 0.38, 1 + i * 0.05, 0.32)),
  cue('appear', HOUR_AT, 1.4, 0.3),
  cue('growl', COYOTE_AT - 0.1, 1.2, 0.35, -0.5),
  ...Array.from({ length: 14 }, (_, i) => cue('steps', CUT.race + 0.15 + i * 0.2, 0.75 + (i % 2) * 0.15, 0.32, -0.4 + i * 0.05)),
  cue('dive', TWICE_AT, 1.3, 0.35, -0.2),
  cue('miss', FAST_AT + 0.45, 0.7, 0.5, 0.3),
  cue('yowl', GOOD_AT + 0.02, 1.35, 0.24, 0.35),
  cue('tick', LOOP_S - 0.14, 2.2, 0.22, 0.3),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while it shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const scene = sceneAt(t);
  const on = (s: Scene): number => (scene === s ? 1 : 0);
  const h = hookPose(t);
  const g = grabPose(t);
  const l = longPose(t);
  return {
    hookClock: hookClock(t), swing: on('hook') * h.swing, shake: on('hook') * h.shake, gulp: on('hook') * h.gulp, crest: on('hook') * h.crest, lid: on('hook') * h.lid, zoom: on('hook') * h.zoom,
    push: on('race') * pushAt(t), hook: hookAlpha(t),
    grabX: on('grab') * g.x, grabDir: on('grab') * g.dir, impact: on('grab') * g.impact,
    longGulp: on('long') * l.gulp, longLid: on('long') * l.lid, measure: on('long') * l.measure,
    strut: on('strut') * strutPhase(t), day: on('hour') * dayAt(t),
    coyote: on('race') * coyoteLeadAt(t), skid: on('race') * skidAt(t), speeds: on('race') * speedsAt(t),
  };
}
