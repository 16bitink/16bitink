import { BITE_AT, CLACK_AT, FLICKS, GULP_AT, HEAVES, POKE_POP, POKE_PULL, SLURP_AT, SNIP_AT, SPOT_AT, SPURT, STRIKE_AT, type SoundCue } from './story';

/** The soundtrack's cues, from the game's own effects. */
export const SOUNDS: readonly SoundCue[] = [
  // The strike: water rushing in, the claws clattering, the bite.
  { id: 'suck', t: 0.05, pitch: 0.6, gain: 0.8, pan: 0.1 },
  { id: 'click', t: 0.3, pitch: 0.7, gain: 0.45, pan: 0.3 },
  { id: 'click', t: 0.5, pitch: 0.85, gain: 0.4, pan: 0.3 },
  { id: 'eat', t: BITE_AT, pitch: 0.45, gain: 0.8, pan: 0.15 },
  { id: 'clang', t: BITE_AT, pitch: 0.4, gain: 0.12, pan: 0.15 },
  // The tussle: legs scrabbling, the claws braced on the jaws, a heave at a time.
  { id: 'rustle', t: 1.3, pitch: 0.9, gain: 0.5, pan: 0.3 },
  { id: 'click', t: 1.68, pitch: 0.5, gain: 0.45, pan: 0.2 },
  ...HEAVES.flatMap((h): SoundCue[] => [
    { id: 'suck', t: h, pitch: 0.5, gain: 0.6, pan: 0.1 },
    { id: 'lunge', t: h + 0.05, pitch: 0.45, gain: 0.45, pan: 0.1 },
  ]),
  // CLACK on the lip, and the wince.
  { id: 'clang', t: CLACK_AT, pitch: 0.9, gain: 0.3, pan: 0.15 },
  { id: 'click', t: CLACK_AT, pitch: 0.6, gain: 0.9, pan: 0.15 },
  { id: 'spotted', t: CLACK_AT + 0.06, pitch: 1.3, gain: 0.3, pan: 0 },
  { id: 'rustle', t: 3.25, pitch: 1, gain: 0.4, pan: 0.3 },
  { id: 'clang', t: 3.68, pitch: 0.7, gain: 0.12, pan: 0.2 },
  // The wave and the last snip.
  { id: 'rustle', t: 4.05, pitch: 1.2, gain: 0.3, pan: 0.3 },
  { id: 'click', t: SNIP_AT, pitch: 1, gain: 0.8, pan: 0.3 },
  { id: 'click', t: SNIP_AT + 0.11, pitch: 1.15, gain: 0.6, pan: 0.3 },
  // The last slurp and the gulp.
  { id: 'suck', t: SLURP_AT - 0.1, pitch: 0.7, gain: 0.9, pan: 0.1 },
  { id: 'suck', t: GULP_AT - 0.2, pitch: 1.9, gain: 0.45, pan: 0.15 },
  { id: 'eatBig', t: GULP_AT, pitch: 0.6, gain: 1, pan: 0 },
  { id: 'drop', t: GULP_AT + 0.02, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'eat', t: GULP_AT + 0.38, pitch: 0.55, gain: 0.45, pan: 0 },
  // The antenna, slurped in like spaghetti, and the pop.
  { id: 'suck', t: POKE_PULL - 0.05, pitch: 1.6, gain: 0.5, pan: 0.15 },
  { id: 'eat', t: GULP_AT + 0.78, pitch: 0.55, gain: 0.3, pan: 0 },
  { id: 'eat', t: POKE_POP, pitch: 1.3, gain: 0.7, pan: 0.1 },
  { id: 'grow', t: SPURT, pitch: 0.9, gain: 0.75, pan: 0 },
  // A snip from inside.
  { id: 'click', t: 6.7, pitch: 0.4, gain: 0.35, pan: 0 },
  // The next one, flicking backwards out of the dark; the "!"; the strike.
  ...FLICKS.map((f, i): SoundCue => ({ id: 'dash', t: f, pitch: 0.6 + 0.08 * i, gain: 0.35 + 0.08 * i, pan: 0.45 - 0.1 * i })),
  ...FLICKS.map((f, i): SoundCue => ({ id: 'lash', t: f, pitch: 0.6, gain: 0.25 + 0.05 * i, pan: 0.4 - 0.1 * i })),
  { id: 'click', t: 11.0, pitch: 0.8, gain: 0.35, pan: 0.35 },
  { id: 'spotted', t: SPOT_AT, pitch: 0.85, gain: 0.55, pan: 0.3 },
  { id: 'lunge', t: STRIKE_AT, pitch: 0.6, gain: 0.9, pan: 0.1 },
  { id: 'dash', t: STRIKE_AT + 0.1, pitch: 0.8, gain: 0.45, pan: 0.1 },
];
