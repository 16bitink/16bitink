/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (voice-take.mp3), sped up by TEMPO (pitch kept) with ffmpeg's
 * atempo so its last word ends about 0.3 s before the 21 s loop point. WORDS
 * are its words with start and end times in voice.mp3 itself, i.e. already in
 * loop seconds (ElevenLabs Scribe on voice.mp3, one run, 2026-11-25; no tags
 * were echoed). Spelling, capitals and punctuation follow the script. Edges at
 * pauses are fixed from the waveform (silencedetect at -38 dB). The
 * [chuckles] between "traffic…" and "so" is a laugh, not a word, so it isn't
 * captioned.
 *
 * The script ends mid-sentence ("…because") and the loop's first line finishes it.
 */
export const TEMPO = 1.086;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'These', start: 0.04, end: 0.32 },
  { text: 'crows', start: 0.42, end: 0.78 },
  { text: 'use', start: 0.86, end: 0.98 },
  { text: 'CARS', start: 1.1, end: 1.48 },
  { text: 'as', start: 1.56, end: 1.7 },
  { text: 'nutcrackers!', start: 1.78, end: 2.59 },
  { text: 'In', start: 2.9, end: 3.02 },
  { text: 'Sendai,', start: 3.12, end: 3.42 },
  { text: 'Japan,', start: 3.48, end: 3.94 },
  { text: 'walnuts', start: 4.22, end: 4.54 },
  { text: 'are', start: 4.58, end: 4.74 },
  { text: 'too', start: 4.82, end: 4.98 },
  { text: 'hard', start: 5.02, end: 5.18 },
  { text: 'to', start: 5.22, end: 5.28 },
  { text: 'crack.', start: 5.34, end: 5.69 },
  { text: 'So', start: 6.03, end: 6.28 },
  { text: 'a', start: 6.32, end: 6.38 },
  { text: 'crow', start: 6.46, end: 6.72 },
  { text: 'drops', start: 6.82, end: 7.12 },
  { text: 'one', start: 7.16, end: 7.24 },
  { text: 'on', start: 7.28, end: 7.34 },
  { text: 'the', start: 7.36, end: 7.44 },
  { text: 'road…', start: 7.5, end: 7.77 },
  { text: 'and', start: 8.1, end: 8.26 },
  { text: 'waits.', start: 8.42, end: 8.83 },
  { text: 'CRUNCH!', start: 9.12, end: 9.8 },
  { text: 'Missed?', start: 10.14, end: 10.6 },
  { text: 'It', start: 10.89, end: 11.04 },
  { text: 'moves', start: 11.12, end: 11.34 },
  { text: 'the', start: 11.4, end: 11.48 },
  { text: 'nut…', start: 11.54, end: 11.72 },
  { text: 'right', start: 11.98, end: 12.12 },
  { text: 'in', start: 12.14, end: 12.22 },
  { text: 'front', start: 12.28, end: 12.38 },
  { text: 'of', start: 12.42, end: 12.46 },
  { text: 'a', start: 12.5, end: 12.56 },
  { text: 'TIRE!', start: 12.62, end: 13.09 },
  { text: 'But', start: 13.46, end: 13.62 },
  { text: 'now', start: 13.68, end: 13.88 },
  { text: 'lunch', start: 13.96, end: 14.16 },
  { text: 'is', start: 14.2, end: 14.28 },
  { text: 'in', start: 14.3, end: 14.34 },
  { text: 'the', start: 14.38, end: 14.42 },
  { text: 'middle', start: 14.46, end: 14.62 },
  { text: 'of', start: 14.64, end: 14.74 },
  { text: 'traffic…', start: 14.82, end: 15.35 },
  { text: 'so', start: 16.04, end: 16.14 },
  { text: 'some', start: 16.3, end: 16.46 },
  { text: 'wait', start: 16.5, end: 16.62 },
  { text: 'at', start: 16.64, end: 16.7 },
  { text: 'the', start: 16.72, end: 16.8 },
  { text: 'CROSSWALK,', start: 16.86, end: 17.42 },
  { text: 'until', start: 17.5, end: 17.74 },
  { text: 'the', start: 17.78, end: 17.84 },
  { text: 'cars', start: 17.9, end: 18.14 },
  { text: 'STOP!', start: 18.22, end: 18.48 },
  { text: 'Better', start: 18.84, end: 19.12 },
  { text: 'than', start: 19.16, end: 19.28 },
  { text: 'most', start: 19.34, end: 19.52 },
  { text: 'people', start: 19.56, end: 19.78 },
  { text: 'do,', start: 19.86, end: 20.02 },
  { text: 'because', start: 20.18, end: 20.65 },
];

/** The laugh between "traffic…" and "so" (silencedetect: sound from 15.57 s up to the "so"). */
export const CHUCKLE = { start: 15.57, end: 16.0 } as const;
