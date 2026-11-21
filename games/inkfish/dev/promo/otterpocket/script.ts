import type { SfxId } from '../../../src/audio/recipes';
import { AT, IMPACT, LOOP_S, MUSSELS, sceneFrom, STONES, wrap } from './story';
import { CHUCKLE, WORDS, type Word } from './words';

/** What's written over the picture (the hook, the spoken phrases, the count) and the sound effects under the voice. */

/** Every text's baseline and size, all inside the band the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  hook1: { y: 360, size: 108 },
  hook2: { y: 476, size: 116 },
  count1: { y: 380, size: 120 },
  count2: { y: 490, size: 96 },
  caption: { y: 1200, size: 96 },
} as const;

/** The hook: the first sentence, on two lines at the top, over frame 1. */
export const HOOK_WORDS: readonly Word[] = WORDS.slice(0, 4);
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
    from: g[0]!.start,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start : LOOP_S,
  }));
})();

/** The hook is up from the loop's first frame until the first phrase. */
export const HOOK_TO = LINES[0]!.from;

function spoken(words: readonly Word[], u: number): number {
  let word = -1;
  words.forEach((w, i) => {
    if (u >= w.start) word = i;
  });
  return word;
}

/** The hook's word being spoken (0 .. 3, -1 before the first), or null once it's gone. */
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

/** A tick for every few shells as the pile grows, rising. */
const PILE: readonly SoundCue[] = Array.from({ length: 11 }, (_, i) =>
  cue('click', AT.cracked + ((AT.mussels + 0.3 - AT.cracked) * i) / 10, 1.1 + i * 0.06, 0.12, i % 2 ? 0.3 : -0.3));
/** A clack for each of the six stones. */
const CLACKS: readonly SoundCue[] = Array.from({ length: STONES }, (_, i) =>
  cue('clang', AT.six - 0.05 + ((AT.stonesEnd - AT.six) * i) / (STONES - 1), 1.7 + i * 0.04, 0.06, -0.4 + i * 0.16));

/**
 * Quiet under the voice, one mood a beat: a lap of water and a bright chime
 * for the hook; a rustle as the flap is pulled; a clink of stone on ROCK and
 * a drop as it goes back; a splash and a falling suck for the dive; scrape
 * and click as the paws close on the clam; a splash up to the surface; a
 * lunge, a smash, a clang and a boom on SMASH; ticks as the shells pile up,
 * a clack per stone; a little squeak for the laugh; a soft rustle in the
 * armpit and a chime on "remember".
 */
export const SOUNDS: readonly SoundCue[] = [
  // Sea otters have POCKETS!
  cue('splash', 0.04, 1.3, 0.1, -0.2),
  cue('powerup', AT.pockets, 1.3, 0.1),
  // A loose flap of skin under each arm…
  cue('rustle', AT.flap - 0.05, 1.2, 0.16, 0.2),
  cue('suck', AT.skin, 1.5, 0.06, 0.2),
  cue('rustle', AT.under, 1.4, 0.1, -0.2),
  // and they keep a ROCK in there.
  cue('clang', AT.rock, 1.35, 0.1, 0.2),
  cue('spotted', AT.keep, 1.2, 0.06),
  cue('drop', AT.there + 0.1, 0.9, 0.12, 0.2),
  // Dive down, grab a clam,
  cue('splash', AT.dive, 0.8, 0.2),
  cue('suck', AT.down, 0.5, 0.12),
  cue('rustle', sceneFrom('clam') + 0.05, 0.7, 0.14),
  cue('click', AT.grab + 0.2, 0.8, 0.16),
  // float on your back…
  cue('splash', sceneFrom('float'), 1.15, 0.14, 0.1),
  cue('free', AT.back, 1.3, 0.05),
  // and SMASH!
  cue('lunge', AT.and2, 0.8, 0.12),
  cue('smash', IMPACT, 0.7, 0.3),
  cue('clang', IMPACT + 0.01, 1.05, 0.12),
  cue('boom', IMPACT + 0.02, 0.4, 0.2),
  cue('splash', IMPACT + 0.05, 1.0, 0.14),
  // One otter cracked 44 mussels… with just 6 stones!
  ...PILE,
  cue('spotted', AT.musselsEnd - 0.1, 1.25, 0.08),
  ...CLACKS,
  cue('powerup', AT.stones + 0.1, 1.5, 0.07),
  // [chuckles]
  cue('squawk', CHUCKLE.start + 0.05, 1.8, 0.05, 0.2),
  // So next time an otter reaches into its armpit… remember,
  cue('rustle', AT.reaches, 1.35, 0.12, 0.2),
  cue('free', AT.armpit, 1.6, 0.05),
  cue('powerup', AT.remember, 1.4, 0.07),
  cue('splash', LOOP_S - 0.35, 1.3, 0.07, -0.2),
];

export { MUSSELS };
