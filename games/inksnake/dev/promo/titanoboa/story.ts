import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import { endOf, LINE_WORDS, startOf, WORDS, type Word } from './words';

/**
 * "This snake was as long as a school BUS!": narrated, a pure function of
 * time, every beat timed from the words. Titanoboa cerrejonensis (Head et
 * al. 2009): about 12.8 m (42 ft) and 1,135 kg (2,500 lb), Cerrejón,
 * Colombia, 58–60 million years ago. Cerrejonisuchus, a 2 m crocodile
 * relative from the same rocks, is thought to have been its prey (Hastings
 * et al. 2010); a 2013 abstract reports teeth and palate like a fish eater's.
 *
 *   0     frame 1: the bus at dusk, the snake along the whole of it, its
 *         head round to us, jaws shut, the tongue flicking (excited)
 *   2.6   "Titanoboa. Forty-two feet…": the head in the swamp, then up and
 *         out over the whole snake, a tape run along it (dramatic)
 *   5.4   "and as heavy as a small CAR": a seesaw that settles level
 *   7.5   "Crocodiles as long as a couch?": a croc and a couch (surprised)
 *   9.5   "Scientists think they were": a scientist, a thought bubble, and
 *         "SNACKS!": into the bubble, the croc goes in head first
 *         (mischievous)
 *   11.6  "Then they found its skull… with teeth like a FISH eater's!": the
 *         brush, the teeth, a lungfish past the jaws (curious)
 *   14.7  "So… crocs or fish?": the head, a plate each side (chuckles)
 *   17.1  "Nobody's swimming in to check, because": a swimmer at the dark
 *         water, two eyes come up (sarcastic); the body slides past the
 *         camera and behind it is frame 1
 */
export const LOOP_S = 19.5;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const BUS_AT = startOf(8);
export const NAME_AT = startOf(9);
export const FEET_AT = startOf(10);
export const FEET_END = endOf(11);
export const HEAVY_AT = startOf(14);
export const CAR_AT = startOf(18);
export const CROCS_AT = startOf(19);
export const COUCH_AT = startOf(24);
export const SCIENTISTS_AT = startOf(25);
export const SNACKS_AT = startOf(29);
export const SNACKS_END = endOf(29);
export const THEN_AT = startOf(30);
export const SKULL_AT = startOf(34);
export const TEETH_AT = startOf(36);
export const FISH_AT = startOf(39);
export const SO_AT = startOf(41);
export const CROCS2_AT = startOf(42);
export const FISH2_AT = startOf(44);
export const NOBODY_AT = startOf(45);
export const CHECK_AT = startOf(49);
export const BECAUSE_AT = startOf(50);
export const LAST_END = endOf(50);

/** The cuts between shots, each just before the first word of its beat. */
export const CUT = {
  boa: NAME_AT - 0.07,
  car: startOf(12) - 0.08,
  couch: CROCS_AT - 0.1,
  think: SCIENTISTS_AT - 0.1,
  strike: SNACKS_AT - 0.1,
  dig: THEN_AT - 0.08,
  which: endOf(40) + 0.22,
  swim: NOBODY_AT - 0.1,
} as const;

export type Scene = 'hook' | 'boa' | 'car' | 'couch' | 'think' | 'strike' | 'dig' | 'which' | 'swim';
const ORDER: readonly Scene[] = ['swim', 'which', 'dig', 'strike', 'think', 'couch', 'car', 'boa'];

/** The body slides past the camera; by its end only frame 1 is left. */
export const WIPE_AT = BECAUSE_AT - 0.06;
export const WIPE_END = LOOP_S - 0.1;

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  if (u >= WIPE_END) return 'hook';
  return ORDER.find((s) => s !== 'hook' && u >= CUT[s as keyof typeof CUT]) ?? 'hook';
}

/** How far the passing body has gone, 0..1 (1 outside the wipe's end, 0 before it). */
export const wipeAt = (t: number): number => {
  const u = wrap(t);
  return u < CUT.boa ? 1 : u <= WIPE_AT ? 0 : clamp01((u - WIPE_AT) / (WIPE_END - WIPE_AT));
};

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;
const spring = (u: number, at: number, f = 3.2, decay = 5): number => (u < at ? 0 : Math.exp(-(u - at) * decay) * Math.cos((u - at) * f * Math.PI * 2));

// ---------------------------------------------------------------- the hook

/** The hook's own clock: the loop's end runs into frame 1 (negative before the loop point). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= WIPE_AT ? u - LOOP_S : u;
};

export interface HookPose {
  readonly gape: number;
  readonly tongue: number;
  readonly sway: number;
  readonly kick: number;
}

export function hookPose(t: number): HookPose {
  const u = hookClock(t);
  const hiss = pulse(u, BUS_AT - 0.05, 0.12, 0.6);
  const flick = (at: number): number => (u > at && u < at + 0.4 ? Math.sin(((u - at) / 0.4) * Math.PI) : 0);
  return {
    gape: 0,
    tongue: Math.max(flick(-0.2), flick(0.17), flick(0.95), flick(BUS_AT - 0.04), flick(-0.72)),
    sway: Math.sin(u * 1.9),
    kick: hiss,
  };
}

// ---------------------------------------------------------------- Titanoboa: the head, then the whole of it

/** The camera's way up and out from the head (0) to the whole snake (1). */
export const rise = (t: number): number => ramp(wrap(t), FEET_AT - 0.42, FEET_AT + 0.28);
/** The tape run along it, 0..1, and its label. */
export const tapeAt = (t: number): number => clamp01((wrap(t) - FEET_AT + 0.05) / 0.75);
export const feetLabel = (t: number): number => window01(wrap(t), FEET_AT + 0.05, CUT.car, 0.16);
export const placeLabel = (t: number): number => window01(wrap(t), NAME_AT + 0.35, FEET_AT - 0.05, 0.2);

// ---------------------------------------------------------------- the seesaw

/** The plank's tilt (radians, + = the car's side down): up and over, then level on "CAR". */
export function tilt(t: number): number {
  const u = wrap(t);
  const fall = lerp(0.2, -0.15, ramp(u, CUT.car, HEAVY_AT + 0.3));
  return lerp(fall, 0, ramp(u, CAR_AT - 0.34, CAR_AT)) + 0.035 * spring(u, CAR_AT, 2.6, 5) * (u >= CAR_AT ? 1 : 0);
}
export const weightLabel = (t: number): number => window01(wrap(t), HEAVY_AT - 0.05, CUT.couch, 0.16);
export const carThud = (t: number): number => pulse(wrap(t), CAR_AT, 0.05, 0.4);

// ---------------------------------------------------------------- the couch

/** The croc walks in beside the couch, and the measure across both on "couch". */
export const crocIn = (t: number): number => smooth(clamp01((wrap(t) - CUT.couch) / 0.55));
export const couchIn = (t: number): number => {
  const u = wrap(t);
  return u < COUCH_AT - 0.42 ? 0 : 1 + 0.25 * spring(u, COUCH_AT - 0.1, 2.4, 7) - (1 - ramp(u, COUCH_AT - 0.42, COUCH_AT - 0.1));
};
export const couchBar = (t: number): number => window01(wrap(t), COUCH_AT + 0.05, CUT.think, 0.16);

// ---------------------------------------------------------------- the thought and the snack

export const scientistIn = (t: number): number => ramp(wrap(t), CUT.think - 0.02, CUT.think + 0.26);
export const bubbleAt = (t: number): number => ramp(wrap(t), SCIENTISTS_AT + 0.28, SCIENTISTS_AT + 0.6);
/** The bubble opening to fill the frame. */
export const bubbleOpen = (t: number): number => ramp(wrap(t), CUT.strike - 0.22, CUT.strike + 0.02);

export interface Strike {
  /** How far the lips have got along the croc: 0 at its snout .. 1 past its tail. */
  readonly over: number;
  /** How near the head is before it strikes (0 waiting in the water .. 1 at the croc). */
  readonly near: number;
  readonly gape: number;
  /** The head turned to us after. */
  readonly smug: number;
  readonly shake: number;
}

export function strikeAt(t: number): Strike {
  const u = wrap(t);
  const at = SNACKS_AT;
  const near = clamp01((u - at + 0.1) / 0.14) ** 2;
  const over = clamp01((u - at - 0.02) / 0.5);
  const shut = ramp(u, at + 0.38, at + 0.53);
  return {
    over: over * (0.75 + 0.25 * over),
    near,
    gape: lerp(lerp(0.05, 0.8, ramp(u, at - 0.14, at)), 0, shut),
    smug: ramp(u, at + 0.54, at + 0.7),
    shake: pulse(u, at + 0.03, 0.03, 0.3),
  };
}

// ---------------------------------------------------------------- the dig

export const sweptAt = (t: number): number => ramp(wrap(t), CUT.dig + 0.02, SKULL_AT + 0.12);
/** The brush: its stroke side to side, and off when done. */
export const brushOff = (t: number): number => ramp(wrap(t), SKULL_AT + 0.16, SKULL_AT + 0.4);
/** The push in on the teeth. */
export const teethPush = (t: number): number => ramp(wrap(t), TEETH_AT - 0.25, TEETH_AT + 0.1);
/** The fish's way across: 0 off the right, 1 in front of the jaws. */
export const fishIn = (t: number): number => ramp(wrap(t), FISH_AT - 0.14, FISH_AT + 0.2);

// ---------------------------------------------------------------- crocs or fish?

export const headUp = (t: number): number => ramp(wrap(t), CUT.which - 0.02, CUT.which + 0.45);
export const crocPlate = (t: number): number => {
  const u = wrap(t);
  return ramp(u, CROCS2_AT - 0.14, CROCS2_AT + 0.06) + 0.12 * spring(u, CROCS2_AT + 0.02, 3, 8);
};
export const fishPlate = (t: number): number => {
  const u = wrap(t);
  return ramp(u, FISH2_AT - 0.14, FISH2_AT + 0.06) + 0.12 * spring(u, FISH2_AT + 0.02, 3, 8);
};
/** Where the head looks: −1 the croc, 1 the fish. */
export function glance(t: number): number {
  const u = wrap(t);
  const keys: readonly (readonly [number, number])[] = [[CUT.which, 0], [CROCS2_AT - 0.1, 0], [CROCS2_AT + 0.1, -1], [FISH2_AT - 0.1, -1], [FISH2_AT + 0.08, 1], [FISH2_AT + 0.3, 1], [FISH2_AT + 0.42, -0.5], [CUT.swim, 0.4]];
  if (u <= keys[0]![0]) return 0;
  for (let i = 1; i < keys.length; i++) if (u <= keys[i]![0]) return lerp(keys[i - 1]![1], keys[i]![1], smooth((u - keys[i - 1]![0]) / (keys[i]![0] - keys[i - 1]![0])));
  return 0.4;
}
export const lick = (t: number): number => {
  const u = wrap(t);
  const at = SO_AT + 0.05;
  return u > at && u < at + 0.42 ? Math.sin(((u - at) / 0.42) * Math.PI) : 0;
};

// ---------------------------------------------------------------- nobody's swimming in

/** The eyes and brow coming up out of the water. */
export const surface = (t: number): number => ramp(wrap(t), NOBODY_AT + 0.35, NOBODY_AT + 0.95);
/** The swimmer seeing them, and backing off. */
export const scared = (t: number): number => ramp(wrap(t), NOBODY_AT + 0.72, NOBODY_AT + 0.86);
export const back = (t: number): number => ramp(wrap(t), NOBODY_AT + 0.86, NOBODY_AT + 1.7);

// ---------------------------------------------------------------- the words

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** When the hook's words come up, ready for frame 1: after "because", under which the swimmer's line is gone. */
const HOOK_FROM = LOOP_S - 0.22;

/** The voiceover cut into short lines, each on screen from its first word until the next takes over. */
export const LINES: readonly Line[] = LINE_WORDS.map((n, i) => {
  const first = FIRST[i]!;
  return { words: WORDS.slice(first, first + n), from: i === 0 ? 0 : startOf(first), to: i + 1 < LINE_WORDS.length ? startOf(FIRST[i + 1]!) : HOOK_FROM };
});

/** The two hook lines stand together from frame 1, in full, so it works with the sound off. */
export const HOOK_LINES = 2;
export const HOOK_TO = LINES[HOOK_LINES]!.from - 0.07;

export const hookAlpha = (t: number): number => {
  const u = wrap(t);
  return u < HOOK_TO ? 1 : ramp(u, HOOK_FROM, LOOP_S - 0.04);
};

export const TEXT = {
  hook: { y: 382, gap: 122, size: 132 },
  line: { y: 420, size: 124 },
  feet: { text: '42 ft (12.8 m)', y: 556, size: 112 },
  place: { text: 'Colombia, 58–60 million years ago', y: 1228, size: 62 },
  weight: { text: '2,500 lb (1,135 kg)', y: 552, size: 100 },
  couch: { text: '6–7 ft (2 m)', y: 568, size: 96 },
} as const;

/** The line on screen after the hook, and the word being said in it (−1 none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start ? i : now), -1) };
}

/** The word being said in the hook lines, counted through both (−1 none). */
export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, _, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

export const CREDIT = { text: 'InkSnake · 16bit.ink/snake' } as const;

// ---------------------------------------------------------------- the sound

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch = 1, gain = 0.5, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** Quiet under the voice, one mood per beat. */
export const SOUNDS: readonly SoundCue[] = [
  cue('strike', 0.02, 0.5, 0.45),
  cue('growl', 0.5, 0.55, 0.3),
  cue('squeeze', BUS_AT - 0.04, 0.5, 0.5),
  cue('bump', BUS_AT, 0.4, 0.5),
  cue('growl', NAME_AT - 0.02, 0.42, 0.55),
  cue('steps', FEET_AT - 0.35, 0.5, 0.35),
  ...Array.from({ length: 7 }, (_, i) => cue('tick', FEET_AT + i * 0.11, 1 + 0.06 * i, 0.26)),
  cue('grown', FEET_AT + 0.7, 0.7, 0.3),
  cue('plop', HEAVY_AT - 0.25, 0.5, 0.5, 0.4),
  cue('bump', CAR_AT - 0.02, 0.4, 0.75),
  cue('knot', CAR_AT + 0.16, 0.7, 0.3),
  cue('steps', CUT.couch + 0.05, 1, 0.35, -0.4), cue('steps', CUT.couch + 0.25, 1.1, 0.35, -0.2), cue('steps', CUT.couch + 0.45, 1, 0.3),
  cue('plop', COUCH_AT - 0.12, 0.8, 0.55),
  cue('squeak', COUCH_AT + 0.1, 0.9, 0.3),
  cue('appear', SCIENTISTS_AT + 0.3, 1.1, 0.4, 0.2),
  cue('strike', SNACKS_AT - 0.05, 0.75, 0.75, 0.3),
  cue('gulp', SNACKS_AT + 0.1, 0.5, 0.7),
  cue('swallow', SNACKS_AT + 0.35, 0.55, 0.5),
  cue('gulp', SNACKS_AT + 0.58, 0.42, 0.6),
  ...[0.05, 0.3, 0.55].map((d) => cue('squeeze', CUT.dig + d, 1.6, 0.22)),
  cue('appear', SKULL_AT, 0.7, 0.4),
  ...Array.from({ length: 4 }, (_, i) => cue('tick', TEETH_AT + i * 0.07, 1.6 + 0.1 * i, 0.22)),
  cue('plop', FISH_AT - 0.04, 1.1, 0.6, 0.3),
  cue('appear', CUT.which + 0.1, 0.6, 0.35),
  cue('card', CROCS2_AT - 0.08, 0.8, 0.5, -0.4),
  cue('plop', FISH2_AT - 0.06, 1.2, 0.5, 0.4),
  cue('tick', CUT.swim + 0.1, 0.6, 0.3),
  cue('plop', NOBODY_AT + 0.5, 0.5, 0.5, 0.3),
  cue('cry', NOBODY_AT + 0.82, 1.2, 0.16, -0.3),
  ...[0.95, 1.12, 1.29].map((d) => cue('steps', NOBODY_AT + d, 1.3, 0.35, -0.5)),
  cue('squeeze', WIPE_AT, 0.4, 0.5),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while that shot shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const h = hookPose(t);
  const s = sceneAt(t);
  return {
    wipe: wipeAt(t), hookClock: hookClock(t), gape: h.gape, tongue: h.tongue, sway: h.sway, kick: h.kick, hook: hookAlpha(t),
    rise: s === 'boa' ? rise(t) : 0, feet: feetLabel(t), place: placeLabel(t), weight: weightLabel(t), bar: couchBar(t), surface: s === 'swim' ? surface(t) : 0,
  };
}
