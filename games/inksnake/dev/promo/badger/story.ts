import type { SfxId } from '../../../src/audio/recipes';
import { clamp01, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This badger eats VENOMOUS snakes!": narrated, a pure function of time,
 * every beat timed from the words. The Kalahari, filmed for National
 * Geographic (2002): a honey badger eating a puff adder was bitten on the
 * face by it, collapsed and lay still; it woke hours later and finished its
 * meal. Resistant, not immune; never the mechanism, never "immune", no
 * blood, no torn flesh.
 *
 *   0     frame 1: the badger big in frame, the adder's body in its jaws,
 *         the adder's head raised by its chest, chevrons clear (hook)
 *   2.28  "A puff adder, one of Africa's most dangerous.": the adder coiled
 *         on the red sand, head drawn back, puffing up on "dangerous"
 *   5.46  "The badger grabs it… and gets bitten, right in the FACE!": the
 *         badger lunges in and grabs it; the adder's head whips round and
 *         strikes its cheek; the camera punches in on the face
 *   9.10  "It collapses. It's over…": the badger tips over onto its side,
 *         eyes shut, still; the colour drains
 *   11.32 "Hours later? It WAKES UP…": the light runs to evening; its eyes
 *         snap open, it pops up and shakes itself
 *   13.28 "and finishes its lunch!": chewing, the adder's tail slipping in
 *   14.80 "Resistant, not immune… but honestly? It doesn't care.": smug,
 *         licking its lips; the call to action
 *   18.88 the hook opens out of the last shot into frame 1
 */
export const LOOP_S = 19.5;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;

/** How many words each caption line holds, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [3, 2, 3, 3, 2, 4, 3, 4, 2, 2, 2, 3, 4, 1, 2, 2, 3, 1];

const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const VENOMOUS_AT = startOf(3);
export const ADDER_AT = startOf(6);
export const DANGEROUS_AT = startOf(12);
export const GRABS_AT = startOf(15);
export const BITTEN_AT = startOf(19);
export const FACE_AT = startOf(23);
export const COLLAPSES_AT = startOf(25);
export const OVER_AT = startOf(27);
export const HOURS_AT = startOf(28);
export const WAKES_AT = startOf(31);
export const UP_AT = startOf(32);
export const FINISHES_AT = startOf(34);
export const LUNCH_AT = startOf(36);
export const RESISTANT_AT = startOf(37);
export const IMMUNE_AT = startOf(39);
export const HONESTLY_AT = startOf(41);
export const CARE_AT = startOf(44);
export const LAST_END = endOf(WORDS.length - 1);

/** The cuts between shots, each just before the first word of its beat. */
export const CUT = {
  adder: startOf(5) - 0.12,
  grab: startOf(13) - 0.12,
  down: startOf(24) - 0.12,
  later: startOf(28) - 0.12,
  lunch: startOf(33) - 0.12,
  rest: startOf(37) - 0.12,
} as const;

/** The hook opens out of the last shot over the loop's last moments. */
export const IRIS_AT = LOOP_S - 0.62;

export type Scene = 'hook' | 'adder' | 'grab' | 'down' | 'later' | 'lunch' | 'rest';

export const sceneAt = (t: number): Scene => {
  const u = wrap(t);
  if (u < CUT.adder) return 'hook';
  if (u < CUT.grab) return 'adder';
  if (u < CUT.down) return 'grab';
  if (u < CUT.later) return 'down';
  if (u < CUT.lunch) return 'later';
  if (u < CUT.rest) return 'lunch';
  return 'rest';
};

/** How much of the frame the hook covers: all of it in its own shot, and a widening circle over the last shot at the end. */
export const irisAt = (t: number): number => {
  const u = wrap(t);
  if (u < CUT.adder) return 1;
  return u < IRIS_AT ? 0 : clamp01((u - IRIS_AT) / (LOOP_S - IRIS_AT - 0.05));
};

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;

// ---------------------------------------------------------------- frame 1

/** The hook's own clock: the loop's end runs into frame 1 (negative before the loop point). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= IRIS_AT ? u - LOOP_S : u;
};

export interface HookPose {
  /** The badger's head tugging back on its catch (radians, − = nose up). */
  readonly tug: number;
  /** The adder's raised forebody swaying. */
  readonly sway: number;
  readonly zoom: number;
}

export function hookPose(t: number): HookPose {
  const u = hookClock(t);
  const run = (u + 0.62) / (CUT.adder + 0.62);
  const tug = -0.05 * pulse(u, VENOMOUS_AT - 0.05, 0.12, 0.5) - 0.012 * Math.sin(u * 5.2);
  return { tug, sway: Math.sin(u * 3.1), zoom: 1 + 0.03 * run + 0.02 * pulse(u, VENOMOUS_AT - 0.05, 0.12, 0.5) };
}

// ---------------------------------------------------------------- the adder

/** The adder puffing up its body on "dangerous" (0 .. 1), and its head drawing back. */
export const puffAt = (t: number): number => {
  const u = wrap(t);
  return ramp(u, DANGEROUS_AT - 0.15, DANGEROUS_AT + 0.35) * (1 - ramp(u, CUT.grab - 0.25, CUT.grab));
};
/** The adder shot's slow push in (1 .. 1.12). */
export const adderZoom = (t: number): number => 1 + 0.12 * ramp(wrap(t), CUT.adder, CUT.grab);
/** The tongue flicking in the adder shot, 0 in .. 1 out. */
export function adderTongue(t: number): number {
  const u = wrap(t);
  for (const s of [CUT.adder + 0.3, ADDER_AT + 0.35, startOf(10)]) if (u >= s && u < s + 0.26) return Math.sin(((u - s) / 0.26) * Math.PI);
  return 0;
}

// ---------------------------------------------------------------- the grab and the bite

/** The badger's lunge in from the left: 0 off at the left .. 1 its jaws on the adder, on "grabs". */
export const lungeAt = (t: number): number => ramp(wrap(t), CUT.grab + 0.05, GRABS_AT + 0.1);
/** The jaws open as it comes, then close on "grabs" (0 shut .. 1 wide). */
export const jawsAt = (t: number): number => {
  const u = wrap(t);
  return ramp(u, CUT.grab + 0.1, GRABS_AT - 0.2) * (1 - ramp(u, GRABS_AT - 0.05, GRABS_AT + 0.08));
};
/** The adder's head whipping round to the badger's face, 0 .. 1 at the strike, on "bitten". */
export const strikeAt = (t: number): number => ramp(wrap(t), BITTEN_AT - 0.35, BITTEN_AT + 0.02);
/** The hit: a flash and a jolt at the strike. */
export const hitAt = (t: number): number => pulse(wrap(t), BITTEN_AT + 0.02, 0.05, 0.4);
/** The badger flinching: the head thrown back and the eye squeezed shut, from the strike to the cut. */
export const flinchAt = (t: number): number => ramp(wrap(t), BITTEN_AT, BITTEN_AT + 0.12);
/** The camera punching in on the face on "FACE" (0 the wide .. 1 close). */
export const punchAt = (t: number): number => ramp(wrap(t), FACE_AT - 0.12, FACE_AT + 0.08);
/** The adder pulling back off the face after the strike. */
export const recoilAt = (t: number): number => ramp(wrap(t), FACE_AT + 0.35, FACE_AT + 0.75);

// ---------------------------------------------------------------- the collapse

/** The badger tipping over: 0 standing, groggy .. 1 flat on its side, from "collapses". */
export const tipAt = (t: number): number => ramp(wrap(t), COLLAPSES_AT - 0.05, COLLAPSES_AT + 0.35);
/** The wobble before it goes over. */
export const groggyAt = (t: number): number => {
  const u = wrap(t);
  return u < CUT.down ? 0 : Math.sin((u - CUT.down) * 14) * (1 - ramp(u, COLLAPSES_AT - 0.1, COLLAPSES_AT + 0.1));
};
/** The colour draining on "It's over…" (0 .. 1). */
export const drainAt = (t: number): number => ramp(wrap(t), OVER_AT - 0.3, OVER_AT + 0.5);

// ---------------------------------------------------------------- hours later

/** The day running to evening on "Hours later?" (0 .. 1). */
export const duskAt = (t: number): number => ramp(wrap(t), CUT.later + 0.1, WAKES_AT - 0.1);
/** The eyes snapping open on "WAKES". */
export const wakeAt = (t: number): number => (wrap(t) >= WAKES_AT - 0.03 ? 1 : 0);
/** Up on its feet with a pop on "UP" (0 lying .. 1 standing). */
export const upAt = (t: number): number => (wrap(t) >= UP_AT - 0.04 ? 1 : 0);
/** Shaking itself off after it pops up, dying away into the lunch shot. */
export const shakeAt = (t: number): number => {
  const u = wrap(t);
  if (u < UP_AT || u >= FINISHES_AT) return 0;
  return Math.sin((u - UP_AT) * 42) * (1 - ramp(u, UP_AT + 0.25, FINISHES_AT - 0.05));
};
/** The dust puff when it pops up (0 .. 1 .. gone). */
export const popAt = (t: number): number => {
  const u = wrap(t);
  return u < UP_AT - 0.04 ? 0 : clamp01((u - UP_AT + 0.04) / 0.45);
};

// ---------------------------------------------------------------- lunch

/** How much of the adder is left outside the mouth: 1 at the cut .. 0 gone, the tail tip in on "lunch". */
export const leftAt = (t: number): number => 1 - ramp(wrap(t), CUT.lunch + 0.1, LUNCH_AT + 0.3);
/** Chewing: the jaws working (0 shut .. 1 apart). */
export function chewAt(t: number): number {
  const u = wrap(t);
  if (u < CUT.lunch || u >= CUT.rest) return 0;
  return 0.5 + 0.5 * Math.sin((u - CUT.lunch) * 15);
}

// ---------------------------------------------------------------- rest

/** "resistant ✓" and "immune ✗" written in, each on its word, gone with the call to action. */
export const resistantTag = (t: number): number => window01(wrap(t), RESISTANT_AT - 0.05, HONESTLY_AT - 0.2, 0.18);
export const immuneTag = (t: number): number => window01(wrap(t), IMMUNE_AT - 0.05, HONESTLY_AT - 0.2, 0.18);
/** The cross drawn through "immune" (0 .. 1). */
export const crossAt = (t: number): number => ramp(wrap(t), IMMUNE_AT + 0.15, IMMUNE_AT + 0.45);
/** The lick of the lips, on "honestly?". */
export const lickAt = (t: number): number => window01(wrap(t), HONESTLY_AT - 0.1, CARE_AT + 0.1, 0.1);
/** A shrug of the head on "care". */
export const shrugAt = (t: number): number => pulse(wrap(t), CARE_AT - 0.08, 0.14, 0.4);

// ---------------------------------------------------------------- the words

export interface Line {
  readonly words: readonly Word[];
  readonly from: number;
  readonly to: number;
}

/** When the hook's words come up over the last of the iris, ready for frame 1. */
const HOOK_FROM = LOOP_S - 0.24;

/** The voiceover cut into phrases, each on screen from its first word until the next takes over. */
export const LINES: readonly Line[] = LINE_WORDS.map((n, i) => {
  const first = FIRST[i]!;
  return {
    words: WORDS.slice(first, first + n),
    from: i === 0 ? 0 : startOf(first),
    to: i + 1 < LINE_WORDS.length ? startOf(FIRST[i + 1]!) : HOOK_FROM,
  };
});

/** The hook's two lines stand together from frame 1, in full, so it works with the sound off. */
export const HOOK_LINES = 2;
export const HOOK_TO = LINES[HOOK_LINES]!.from;

export const hookAlpha = (t: number): number => {
  const u = wrap(t);
  return u < HOOK_TO ? 1 : ramp(u, HOOK_FROM, LOOP_S - 0.04);
};

export const TEXT = {
  hook: { y: 540, gap: 132, size: 136 },
  line: { y: 452, size: 128 },
} as const;

/** The line on screen after the hook, and the word being said in it (−1 none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start / TEMPO ? i : now), -1) };
}

/** The word being said in the hook lines, counted through both (−1 none). */
export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, w, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

// ---------------------------------------------------------------- the call to action

export const CTA_AT = startOf(40) - 0.1;
export const CTA_END = LOOP_S - 0.6;

/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: CTA_AT } as const;

export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.2);
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.15) / 0.45);

export const CTA = {
  big: { text: '10 levels free', y: 1010, size: 140 },
  small: { text: 'tap the channel name', y: 1110, size: 84 },
  arrow: { from: { x: 236, y: 1156 }, c0: { x: 262, y: 1310 }, c1: { x: 220, y: 1390 }, tip: { x: 160, y: 1460 } },
} as const;

// ---------------------------------------------------------------- the sound

/**
 * The voice's gain envelope (audio.ts): the take drops on the sad beat, "It
 * collapses." about 6.5 dB and "It's over…" about 9 dB under the whole take
 * (−22.3 LUFS), so they are lifted back to within ~4 dB of it.
 */
export const VOICE_LIFT: readonly { readonly from: number; readonly to: number; readonly db: number }[] = [
  { from: startOf(24), to: endOf(25), db: 3 },
  { from: startOf(26), to: endOf(27), db: 5.5 },
];

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch = 1, gain = 0.5, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/**
 * Quiet under the voice, one mood per beat: the tug and growl of the hook,
 * the adder's hiss, the lunge and the strike, the thud of the collapse and
 * the hush, then comic from the wake-up (the pop, the shake, the gulps, the
 * smug little win).
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('growl', 0.05, 1.1, 0.4),
  cue('squeeze', VENOMOUS_AT, 0.8, 0.35, 0.2),
  cue('strike', CUT.adder + 0.05, 0.7, 0.35, 0.2),
  cue('strike', DANGEROUS_AT, 0.6, 0.45, 0.2),
  cue('pounce', CUT.grab + 0.15, 0.9, 0.45, -0.3),
  cue('growl', GRABS_AT, 1, 0.45),
  cue('strike', BITTEN_AT - 0.2, 0.9, 0.5, 0.3),
  cue('hurt', BITTEN_AT + 0.03, 1, 0.55),
  cue('yowl', FACE_AT, 1.2, 0.4),
  cue('bump', COLLAPSES_AT + 0.3, 0.45, 0.65),
  cue('lose', OVER_AT, 0.8, 0.35),
  cue('tick', HOURS_AT, 0.9, 0.25),
  cue('tick', HOURS_AT + 0.35, 0.9, 0.22),
  cue('appear', WAKES_AT - 0.03, 1.4, 0.45),
  cue('plop', UP_AT - 0.04, 0.8, 0.55),
  cue('flap', UP_AT + 0.05, 1.3, 0.35),
  cue('gulp', FINISHES_AT + 0.05, 0.9, 0.45),
  cue('gulp', startOf(35) + 0.05, 1, 0.45),
  cue('swallow', LUNCH_AT + 0.1, 1.2, 0.5),
  cue('click', RESISTANT_AT, 1, 0.3),
  cue('miss', IMMUNE_AT + 0.15, 1.1, 0.3),
  cue('win', HONESTLY_AT - 0.05, 1.1, 0.3),
  cue('card', CTA_AT + 0.1, 1, 0.25),
  cue('growl', IRIS_AT + 0.1, 1.1, 0.3),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while that shot shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const h = hookPose(t);
  const scene = sceneAt(t);
  const on = (s: Scene): number => (scene === s ? 1 : 0);
  return {
    iris: irisAt(t), hookClock: hookClock(t), tug: h.tug, sway: h.sway, zoom: h.zoom, hook: hookAlpha(t),
    puff: on('adder') * puffAt(t), adderZoom: on('adder') * adderZoom(t), tongue: on('adder') * adderTongue(t),
    lunge: on('grab') * lungeAt(t), jaws: on('grab') * jawsAt(t), strike: on('grab') * strikeAt(t), hit: on('grab') * hitAt(t), flinch: on('grab') * flinchAt(t), punch: on('grab') * punchAt(t),
    tip: on('down') * tipAt(t), groggy: on('down') * groggyAt(t), drain: on('down') * drainAt(t),
    dusk: on('later') * duskAt(t), wake: on('later') * wakeAt(t), up: on('later') * upAt(t), shake: shakeAt(t), pop: on('later') * popAt(t),
    left: on('lunch') * leftAt(t), chew: chewAt(t),
    resistant: resistantTag(t), immune: immuneTag(t), lick: lickAt(t), shrug: shrugAt(t), cta: ctaAt(t),
  };
}
