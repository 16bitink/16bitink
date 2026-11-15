import type { SfxId } from '../../../src/audio/recipes';
import { AT, LOOP_S, wrap } from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (the hook and the spoken phrases), and the sound effects under the voice. */

/** Every text's baseline and size, all inside the band the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  hook1: { y: 360, size: 108 },
  hook2: { y: 476, size: 108 },
  caption: { y: 1200, size: 96 },
} as const;

/** The hook: the first sentence, on two lines at the top, over frame 1. */
export const HOOK_WORDS: readonly Word[] = WORDS.slice(0, 6);
export const HOOK_ROWS: readonly (readonly Word[])[] = [HOOK_WORDS.slice(0, 3), HOOK_WORDS.slice(3)];

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The rest of the voiceover cut into short phrases: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS.slice(HOOK_WORDS.length)) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:!?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    from: g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The hook is up from the loop's first frame until the first phrase. */
export const HOOK_TO = LINES[0]!.from;

/** The word being spoken among `words` at u (-1: none yet). */
function spoken(words: readonly Word[], u: number): number {
  let word = -1;
  words.forEach((w, i) => {
    if (u >= w.start / TEMPO) word = i;
  });
  return word;
}

/** The hook's word being spoken (0 .. 5, -1 before the first), or null once it's gone. */
export function hookAt(t: number): number | null {
  const u = wrap(t);
  return u < HOOK_TO ? spoken(HOOK_WORDS, u) : null;
}

/** The phrase on screen at time t, and the word being spoken in it. */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  return line ? { line, word: spoken(line.words, u) } : null;
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** Little flat-footed steps across the ice. */
const STEPS: readonly SoundCue[] = Array.from({ length: 9 }, (_, i) => cue('click', AT.so - 0.05 + i * 0.294, 1.5 + (i % 2) * 0.18, 0.09, i % 2 ? 0.3 : -0.3));
/** Plinks running along the bill's smooth edge on "teeth.". */
const EDGE: readonly SoundCue[] = Array.from({ length: 5 }, (_, i) => cue('free', AT.teeth - 0.05 + i * 0.09, 1.6 + i * 0.08, 0.06, -0.3 + i * 0.15));
/** A falling run as the light goes down every spine. */
const DOWN: readonly SoundCue[] = Array.from({ length: 7 }, (_, i) => cue('click', AT.all + i * 0.19, 1.5 - i * 0.1, 0.11, i % 2 ? 0.2 : -0.2));

/**
 * Quiet under the voice, one mood a beat: a low boom and a sting for the hook;
 * a bright chime, flat little steps, a soft honk and a fluffy rustle on the
 * ice; a slow suck and a falling tone as the bill opens; a smash, a boom and
 * a clang on SPIKES; plinks along the smooth edge and a snap and boop for
 * "don't have any"; a shimmer across the nail; a falling run down the spines
 * to a low boom; a splash, a wriggle, a snag on ONE and a gulp; a cute chime,
 * then a suck as the bill snaps open into the hook.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook.
  cue('boom', 0.04, 0.3, 0.22),
  cue('suck', 0.3, 0.55, 0.1, 0.1),
  cue('spotted', AT.mouth, 0.62, 0.14),
  // So cute, fluffy, waddling.
  cue('powerup', AT.cute, 1.35, 0.08, -0.1),
  ...STEPS,
  cue('squawk', AT.right + 0.05, 1.45, 0.07, 0.2),
  cue('rustle', AT.fluffy, 1.3, 0.14),
  cue('free', AT.fluffy + 0.2, 1.8, 0.06, 0.25),
  // Then it opens up…
  cue('drop', AT.then, 0.6, 0.12),
  cue('suck', AT.opens, 0.45, 0.14, 0.1),
  cue('spotted', AT.up, 0.42, 0.1),
  // SPIKES!
  cue('lunge', AT.spikes - 0.3, 0.6, 0.14),
  cue('smash', AT.spikes, 0.55, 0.12),
  cue('boom', AT.spikes + 0.02, 0.38, 0.24),
  cue('clang', AT.spikes + 0.04, 0.8, 0.08),
  // Not teeth. Penguins don't have any.
  ...EDGE,
  cue('click', AT.have, 0.9, 0.2),
  cue('drop', AT.any, 1.2, 0.1),
  // Spines, made like your fingernails.
  cue('click', AT.made - 0.2, 1.2, 0.14, 0.3),
  cue('free', AT.fingernails, 1.4, 0.08),
  // ALL pointing down the throat…
  ...DOWN,
  cue('boom', AT.throat, 0.3, 0.18),
  // so a slippery fish only goes ONE way.
  cue('splash', AT.so2, 1.1, 0.12, 0.2),
  cue('rustle', AT.slippery, 1.5, 0.1, 0.2),
  cue('hooked', AT.one, 1.0, 0.1),
  cue('hurt', AT.one + 0.08, 1.3, 0.06),
  cue('eatBig', AT.way + 0.08, 0.55, 0.36),
  cue('boom', AT.way + 0.1, 0.4, 0.16),
  // So, trust me:
  cue('powerup', AT.so3 + 0.05, 1.5, 0.07),
  cue('suck', LOOP_S - 0.45, 0.6, 0.14, 0.1),
];
