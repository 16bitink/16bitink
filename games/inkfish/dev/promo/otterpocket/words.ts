/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (voice-take.mp3, 18.88 s, last word ending at 18.66 s), sped up
 * by TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before
 * the 18 s loop point. WORDS are its words with start and end times in
 * voice.mp3 itself, i.e. already in loop seconds (ElevenLabs Scribe on
 * voice.mp3, one run, 2026-11-21; no tags were echoed). Spelling, capitals and
 * punctuation follow the script; the numbers are written as digits because
 * the captions show them that way. Edges at pauses are fixed from the
 * waveform (silencedetect at -40 dB): the first word starts with the file and
 * the last word's end is where the sound fades out. The [chuckles] between
 * "stones!" and "So" is a laugh, not a word, so it isn't captioned.
 *
 * The script ends mid-sentence ("…remember,") and the loop's first line finishes it.
 */
export const TEMPO = 1.05442;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Sea', start: 0.04, end: 0.32 },
  { text: 'otters', start: 0.36, end: 0.62 },
  { text: 'have', start: 0.66, end: 0.86 },
  { text: 'POCKETS!', start: 0.92, end: 1.58 },
  { text: 'A', start: 1.92, end: 1.98 },
  { text: 'loose', start: 2.08, end: 2.28 },
  { text: 'flap', start: 2.38, end: 2.56 },
  { text: 'of', start: 2.6, end: 2.72 },
  { text: 'skin', start: 2.8, end: 3.06 },
  { text: 'under', start: 3.1, end: 3.3 },
  { text: 'each', start: 3.34, end: 3.48 },
  { text: 'arm…', start: 3.62, end: 3.95 },
  { text: 'and', start: 4.24, end: 4.52 },
  { text: 'they', start: 4.56, end: 4.68 },
  { text: 'keep', start: 4.72, end: 4.86 },
  { text: 'a', start: 4.94, end: 4.98 },
  { text: 'ROCK', start: 5.12, end: 5.4 },
  { text: 'in', start: 5.46, end: 5.56 },
  { text: 'there.', start: 5.62, end: 5.85 },
  { text: 'Dive', start: 6.26, end: 6.52 },
  { text: 'down,', start: 6.56, end: 6.86 },
  { text: 'grab', start: 7.02, end: 7.28 },
  { text: 'a', start: 7.32, end: 7.36 },
  { text: 'clam,', start: 7.42, end: 7.76 },
  { text: 'float', start: 7.9, end: 8.14 },
  { text: 'on', start: 8.18, end: 8.26 },
  { text: 'your', start: 8.3, end: 8.4 },
  { text: 'back…', start: 8.44, end: 8.72 },
  { text: 'and', start: 8.92, end: 9.22 },
  { text: 'SMASH!', start: 9.42, end: 10.09 },
  { text: 'One', start: 10.42, end: 10.66 },
  { text: 'otter', start: 10.76, end: 10.9 },
  { text: 'cracked', start: 11.0, end: 11.22 },
  { text: '44', start: 11.4, end: 11.88 },
  { text: 'mussels…', start: 12.0, end: 12.4 },
  { text: 'with', start: 12.52, end: 12.64 },
  { text: 'just', start: 12.7, end: 12.88 },
  { text: '6', start: 12.94, end: 13.16 },
  { text: 'stones!', start: 13.26, end: 13.77 },
  { text: 'So', start: 14.58, end: 14.82 },
  { text: 'next', start: 14.96, end: 15.14 },
  { text: 'time', start: 15.18, end: 15.34 },
  { text: 'an', start: 15.38, end: 15.5 },
  { text: 'otter', start: 15.56, end: 15.74 },
  { text: 'reaches', start: 15.84, end: 16.1 },
  { text: 'into', start: 16.14, end: 16.32 },
  { text: 'its', start: 16.36, end: 16.46 },
  { text: 'armpit…', start: 16.52, end: 16.88 },
  { text: 'remember,', start: 17.2, end: 17.71 },
];

/** The laugh between the count and "So next time" (silencedetect: sound from 13.99 to 14.35 s). */
export const CHUCKLE = { start: 13.99, end: 14.35 } as const;
