import type { SfxId } from '../../../src/audio/recipes';
import { pt } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { clamp01, lerp, ramp, window01 } from '../short';
import { TEMPO, WORDS, type Word } from './words';

/**
 * "This bird hunts snakes by KICKING them": narrated, a pure function of
 * time, every beat timed from the words. Portugal et al. 2016 (Current
 * Biology): a trained secretary bird kicking a rubber snake on a force
 * plate hit with about 5× its body weight, the foot in contact for about
 * 15 ms (about a tenth of a 150 ms blink), too fast to correct mid-kick,
 * so it aims by sight. No gore: a stomp near the head, dust and a flash.
 *
 *   0     frame 1: the bird big, side on, one leg raised high over an
 *         olive-brown snake at golden hour, wings and crest flared (hook);
 *         the stomp lands on "KICKING"
 *   3.00  "Meet the secretary bird. Long legs,": standing, the crest going
 *         up on "secretary", the camera tilting down the legs
 *   5.66  "movie-star eyelashes…": close on the face, the lashes fluttering
 *   7.16  "and a kick of FIVE times its own body weight!": evening, low and
 *         dramatic; the stomp on "kick", five little birds pop up one per
 *         word, and press down on "weight"
 *  10.14  "Scientists timed it: fifteen milliseconds.": a grey lab, a rubber
 *         snake on a force plate, the foot stamps on "timed", a stopwatch in
 *         a lab-coat hand stops on "milliseconds"
 *  12.86  "That's ten times faster than a blink!": the eye, huge; it blinks
 *  15.06  "It can't fix a miss mid-kick… so it has to be perfect, because":
 *         back to the hook's shot, the foot raised, the snake's head
 *         swaying, the bird's eye locked on it (a dashed sight line), cool
 *         and tense; the call to action; then frame 1
 */
export const LOOP_S = 19.5;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

export const startOf = (i: number): number => WORDS[i]!.start / TEMPO;
export const endOf = (i: number): number => WORDS[i]!.end / TEMPO;

/** Words per caption line, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [4, 3, 4, 2, 2, 3, 3, 4, 3, 2, 3, 4, 3, 3, 3, 3, 1];
const FIRST = LINE_WORDS.map((_, i) => LINE_WORDS.slice(0, i).reduce((s, n) => s + n, 0));

export const KICKING_AT = startOf(5);
export const MEET_AT = startOf(7);
export const SECRETARY_AT = startOf(9);
export const LONG_AT = startOf(11);
export const LEGS_AT = startOf(12);
export const STAR_AT = startOf(13);
export const LASHES_AT = startOf(14);
export const KICK_AT = startOf(17);
export const FIVE_AT = startOf(19);
export const WEIGHT_AT = startOf(24);
export const TIMED_AT = startOf(26);
export const FIFTEEN_AT = startOf(28);
export const MS_AT = startOf(29);
export const THATS_AT = startOf(30);
export const FASTER_AT = startOf(33);
export const BLINK_AT = startOf(36);
export const FIX_AT = startOf(39);
export const MISS_AT = startOf(41);
export const SO_AT = startOf(43);
export const PERFECT_AT = startOf(48);
export const LAST_END = endOf(WORDS.length - 1);

/** The cuts, each just before the first word of its beat. */
export const CUT = {
  meet: startOf(7) - 0.12,
  face: startOf(13) - 0.12,
  kick: startOf(15) - 0.12,
  timed: startOf(25) - 0.12,
  blink: startOf(30) - 0.12,
  aim: startOf(37) - 0.12,
} as const;

export type Scene = 'hook' | 'meet' | 'face' | 'kick' | 'timed' | 'blink';

/** The hook's shot runs from "It can't fix" through the loop point to "Meet". */
export const sceneAt = (t: number): Scene => {
  const u = wrap(t);
  if (u < CUT.meet || u >= CUT.aim) return 'hook';
  if (u < CUT.face) return 'meet';
  if (u < CUT.kick) return 'face';
  if (u < CUT.timed) return 'kick';
  if (u < CUT.blink) return 'timed';
  return 'blink';
};

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;

// ---------------------------------------------------------------- the kick

/** Where the foot lands, on the snake's neck (bird units from its body's centre). */
export const TARGET: Pt = pt(48, 58);

/** Where the kicking leg's knee swings to (the femur brings it forward). */
export const KICK_KNEE: Pt = pt(16, 4);

/**
 * The kicking foot: `raise` 0 half up .. 1 cocked, the tarsus held out level
 * in front; `stomp` 0 up .. 1 down on the target (accelerating), the tarsus
 * driving down and forward about the ankle.
 */
export function kickFoot(raise: number, stomp: number): Pt {
  const up = pt(lerp(54, 60, raise), lerp(44, 32, raise));
  const s = stomp * stomp;
  return pt(lerp(up.x, TARGET.x, s), lerp(up.y, TARGET.y, s));
}

/** The hook's own clock: the aim beat at the loop's end runs into frame 1 (negative before the loop point). */
export const hookClock = (t: number): number => {
  const u = wrap(t);
  return u >= CUT.aim ? u - LOOP_S : u;
};
const AIM_U0 = CUT.aim - LOOP_S;

export interface KickPose {
  readonly raise: number;
  readonly stomp: number;
  /** The flash and jolt of the foot landing. */
  readonly impact: number;
  /** The dust after it, 0 .. 1 gone. */
  readonly dust: number;
  /** The snake's head swaying (−1 .. 1), still once pinned. */
  readonly sway: number;
  readonly zoom: number;
}

export function hookPose(t: number): KickPose {
  const u = hookClock(t);
  const stomp = clamp01((u - (KICKING_AT - 0.14)) / 0.14);
  const impact = pulse(u, KICKING_AT, 0.04, 0.4);
  return {
    raise: 0.45 + 0.55 * ramp(u, AIM_U0, KICKING_AT - 0.25),
    stomp,
    impact,
    dust: u < KICKING_AT ? 0 : clamp01((u - KICKING_AT) / 0.9),
    sway: Math.sin(u * 2.6) * (1 - stomp),
    zoom: 1 + 0.035 * ramp(u, AIM_U0, KICKING_AT) + 0.03 * impact,
  };
}

/** The cool, tense light of the aim beat: in after the cut, gone before the loop point. */
export const tenseAt = (t: number): number => window01(wrap(t), CUT.aim, LOOP_S - 0.35, 0.4);
/** The dashed line from the bird's eye to the snake's head: drawn on "fix", gone by "so". */
export const sightAt = (t: number): number => {
  const u = wrap(t);
  return u < FIX_AT - 0.05 || u >= SO_AT ? 0 : Math.min(ramp(u, FIX_AT - 0.05, MISS_AT + 0.2), 1 - ramp(u, SO_AT - 0.3, SO_AT));
};

// ---------------------------------------------------------------- meet

/** The crest going up on "secretary". */
export const crestAt = (t: number): number => 0.25 + 0.75 * ramp(wrap(t), SECRETARY_AT - 0.1, SECRETARY_AT + 0.25);
/** A little hop of the head on "Meet". */
export const bobAt = (t: number): number => pulse(wrap(t), MEET_AT - 0.05, 0.12, 0.35);
/** The camera tilting down to the legs on "Long legs" (0 .. 1). */
export const tiltAt = (t: number): number => ramp(wrap(t), LONG_AT - 0.15, LEGS_AT + 0.15);
/** The ink arrow along the legs, drawn on "legs". */
export const legArrowAt = (t: number): number => ramp(wrap(t), LEGS_AT - 0.1, LEGS_AT + 0.3);

// ---------------------------------------------------------------- the lashes

/** The eye's lid in the face shot: a double flutter on "eyelashes". */
export function lashLidAt(t: number): number {
  const u = wrap(t);
  return Math.max(pulse(u, LASHES_AT - 0.04, 0.07, 0.12), pulse(u, LASHES_AT + 0.24, 0.07, 0.12));
}
/** Sparkles round the lashes, from "movie-star". */
export const sparkleAt = (t: number): number => ramp(wrap(t), STAR_AT - 0.05, STAR_AT + 0.2);
/** The face shot's slow push in. */
export const faceZoom = (t: number): number => 1 + 0.08 * ramp(wrap(t), CUT.face, CUT.kick);

// ---------------------------------------------------------------- five times its weight

export function kickPose(t: number): KickPose {
  const u = wrap(t);
  const first = clamp01((u - (KICK_AT - 0.14)) / 0.14);
  // Lifting a little as the birds pile up, slammed down again on "weight".
  const lift = ramp(u, FIVE_AT, WEIGHT_AT - 0.18) * (1 - clamp01((u - (WEIGHT_AT - 0.12)) / 0.12));
  const impact = Math.max(pulse(u, KICK_AT, 0.04, 0.4), pulse(u, WEIGHT_AT, 0.04, 0.5));
  return {
    raise: 0.5 + 0.5 * ramp(u, CUT.kick, KICK_AT - 0.2),
    stomp: first * (1 - 0.45 * lift),
    impact,
    dust: u < KICK_AT ? 0 : clamp01((u - (u >= WEIGHT_AT ? WEIGHT_AT : KICK_AT)) / 0.9),
    sway: 0,
    zoom: 1.02 + 0.06 * impact + 0.04 * ramp(u, CUT.kick, CUT.timed),
  };
}

/** Little bird i (0..4): 0 not yet .. 1 popped in, on "FIVE times its own body". */
export const miniAt = (t: number, i: number): number => ramp(wrap(t), startOf(19 + i) - 0.05, startOf(19 + i) + 0.12);
/** The five pressing down on "weight". */
export const pressAt = (t: number): number => pulse(wrap(t), WEIGHT_AT - 0.1, 0.1, 0.5);

// ---------------------------------------------------------------- the lab

export function timedPose(t: number): KickPose {
  const u = wrap(t);
  const stomp = clamp01((u - (TIMED_AT - 0.12)) / 0.12);
  return {
    raise: 0.6 + 0.4 * ramp(u, CUT.timed, TIMED_AT - 0.2),
    stomp,
    impact: pulse(u, TIMED_AT, 0.03, 0.3),
    dust: 0,
    sway: 0,
    zoom: 1 + 0.03 * ramp(u, CUT.timed, CUT.blink),
  };
}
/** The stopwatch's hand: sweeping from the cut, stopped on "milliseconds" (turns). */
export const watchAt = (t: number): number => {
  const u = Math.min(wrap(t), MS_AT);
  return Math.max(0, u - CUT.timed) * 0.9;
};
/** The small "15 ms" under the watch, from "fifteen". */
export const msLabelAt = (t: number): number => ramp(wrap(t), FIFTEEN_AT - 0.05, FIFTEEN_AT + 0.15);

// ---------------------------------------------------------------- the blink

/** The lid in the eye shot: shut and open again on "blink". */
export const blinkLidAt = (t: number): number => {
  const u = wrap(t);
  if (u < BLINK_AT - 0.04) return 0;
  if (u < BLINK_AT + 0.04) return ramp(u, BLINK_AT - 0.04, BLINK_AT + 0.04);
  if (u < BLINK_AT + 0.1) return 1;
  return 1 - ramp(u, BLINK_AT + 0.1, BLINK_AT + 0.24);
};
/** The punch in on "That's" and "faster". */
export const eyeZoom = (t: number): number => {
  const u = wrap(t);
  return 1 + 0.06 * ramp(u, CUT.blink, CUT.aim) + 0.05 * pulse(u, THATS_AT - 0.05, 0.1, 0.4) + 0.05 * pulse(u, FASTER_AT - 0.05, 0.1, 0.4);
};
/** Speed streaks on "faster". */
export const streakAt = (t: number): number => window01(wrap(t), FASTER_AT - 0.05, BLINK_AT - 0.05, 0.12);

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
  hook: { y: 404, gap: 128, size: 126 },
  line: { y: 440, size: 118 },
} as const;

export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.slice(HOOK_LINES).find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  return { line, word: line.words.reduce((now, w, i) => (u >= w.start / TEMPO ? i : now), -1) };
}

export function hookWord(t: number): number {
  const u = wrap(t);
  return u < HOOK_TO ? WORDS.slice(0, FIRST[HOOK_LINES]!).reduce((now, w, i) => (u >= startOf(i) ? i : now), -1) : -1;
}

// ---------------------------------------------------------------- the call to action

export const CTA_AT = SO_AT - 0.1;
export const CTA_END = LOOP_S - 0.6;

/** The credit: in 40% of the way through, gone before the loop point (credit.ts). */
export const CREDIT = { text: 'InkSnake · 16bit.ink/snake', from: 0.4 * LOOP_S } as const;

export const ctaAt = (t: number): number => window01(wrap(t), CTA_AT, CTA_END, 0.2);
export const arrowDraw = (t: number): number => clamp01((wrap(t) - CTA_AT - 0.15) / 0.45);

export const CTA = {
  big: { text: '10 levels free', y: 770, size: 132 },
  small: { text: 'tap the channel name', y: 862, size: 80 },
  snakeY: 650,
  arrow: { from: { x: 236, y: 910 }, c0: { x: 262, y: 1120 }, c1: { x: 220, y: 1360 }, tip: { x: 160, y: 1460 } },
} as const;

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
 * Quiet under the voice, one mood per beat: the snake's hiss and the
 * stomp's thud (excited), a call and steps (mischievous), a twinkle on
 * the lashes, the drum of the big kick and five clicks (dramatic), the
 * stopwatch (surprised), the blink's click, and the tense hiss and ticks
 * of the aim (nervous).
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('flap', 0.05, 0.9, 0.35, -0.2),
  cue('strike', 0.55, 1.1, 0.3, 0.3),
  cue('pounce', KICKING_AT - 0.16, 0.8, 0.45),
  cue('bump', KICKING_AT, 0.5, 0.65),
  cue('strike', KICKING_AT + 0.25, 1.3, 0.3, 0.3),
  cue('appear', MEET_AT, 1.1, 0.35),
  cue('caw', SECRETARY_AT, 0.75, 0.35, -0.2),
  cue('steps', LONG_AT, 0.8, 0.35),
  cue('appear', STAR_AT, 1.6, 0.35, 0.2),
  cue('win', LASHES_AT, 1.4, 0.3),
  cue('flap', CUT.kick + 0.1, 0.8, 0.4),
  cue('pounce', KICK_AT - 0.16, 0.7, 0.45),
  cue('bump', KICK_AT, 0.45, 0.65),
  ...[0, 1, 2, 3, 4].map((i) => cue('click', startOf(19 + i), 0.9 + i * 0.12, 0.4)),
  cue('bump', WEIGHT_AT, 0.4, 0.7),
  cue('tick', CUT.timed + 0.15, 1.2, 0.3),
  cue('tick', CUT.timed + 0.6, 1.2, 0.3),
  cue('bump', TIMED_AT, 0.7, 0.5),
  cue('click', MS_AT, 1.3, 0.45),
  cue('appear', THATS_AT, 1.3, 0.35),
  cue('dive', FASTER_AT, 1.4, 0.3),
  cue('click', BLINK_AT, 0.8, 0.45),
  cue('strike', CUT.aim + 0.2, 0.8, 0.3, 0.3),
  cue('tick', MISS_AT, 0.7, 0.3),
  cue('squeeze', SO_AT - 0.2, 0.9, 0.3),
  cue('card', CTA_AT + 0.1, 1, 0.25),
  cue('tick', PERFECT_AT, 0.7, 0.3),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while it shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const scene = sceneAt(t);
  const on = (s: Scene): number => (scene === s ? 1 : 0);
  const h = hookPose(t);
  const k = kickPose(t);
  const m = timedPose(t);
  return {
    hookClock: hookClock(t), raise: on('hook') * h.raise, stomp: on('hook') * h.stomp, impact: on('hook') * h.impact, sway: on('hook') * h.sway, zoom: on('hook') * h.zoom,
    tense: tenseAt(t), sight: sightAt(t), hook: hookAlpha(t), cta: ctaAt(t),
    crest: on('meet') * crestAt(t), bob: on('meet') * bobAt(t), tilt: on('meet') * tiltAt(t), legArrow: on('meet') * legArrowAt(t),
    lashLid: on('face') * lashLidAt(t), sparkle: on('face') * sparkleAt(t),
    kickStomp: on('kick') * k.stomp, kickImpact: on('kick') * k.impact, press: on('kick') * pressAt(t), mini: on('kick') * miniAt(t, 4),
    timedStomp: on('timed') * m.stomp, watch: on('timed') * watchAt(t), ms: on('timed') * msLabelAt(t),
    blink: on('blink') * blinkLidAt(t), streak: on('blink') * streakAt(t),
  };
}
