/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (take2.mp3 copied to voice-take.mp3, 20.24 s, last word ending at 19.93 s), sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 18 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run, 2026-11-15; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling, capitals and punctuation follow the script. Edges at
 * pauses are fixed from the waveform (silencedetect at -40 dB), and the last
 * word's end is where the sound fades out.
 *
 * the script ends mid-sentence ("…So, trust me:") and the loop's first line finishes it.
 */
export const TEMPO = 1.12599;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 18;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'NEVER', start: 0.3, end: 0.58 },
  { text: 'look', start: 0.66, end: 0.78 },
  { text: 'inside', start: 0.82, end: 1.12 },
  { text: 'a', start: 1.16, end: 1.24 },
  { text: 'penguin\'s', start: 1.28, end: 1.66 },
  { text: 'mouth!', start: 1.72, end: 2.15 },
  { text: 'So', start: 2.4, end: 2.66 },
  { text: 'cute,', start: 2.82, end: 3.1 },
  { text: 'right?', start: 3.2, end: 3.49 },
  { text: 'Fluffy…', start: 3.84, end: 4.4 },
  { text: 'waddling…', start: 4.88, end: 5.48 },
  { text: 'then', start: 5.79, end: 6.04 },
  { text: 'it', start: 6.08, end: 6.24 },
  { text: 'opens', start: 6.34, end: 6.7 },
  { text: 'up…', start: 6.8, end: 7.0 },
  { text: 'and', start: 7.34, end: 7.42 },
  { text: 'it\'s', start: 7.44, end: 7.58 },
  { text: 'full', start: 7.64, end: 7.76 },
  { text: 'of', start: 7.8, end: 7.94 },
  { text: 'SPIKES!', start: 8.16, end: 8.72 },
  { text: 'Not', start: 9.11, end: 9.36 },
  { text: 'teeth.', start: 9.42, end: 9.79 },
  { text: 'Penguins', start: 10.08, end: 10.4 },
  { text: 'don\'t', start: 10.42, end: 10.56 },
  { text: 'have', start: 10.6, end: 10.76 },
  { text: 'any.', start: 10.8, end: 10.98 },
  { text: 'Spines,', start: 11.38, end: 12.22 },
  { text: 'made', start: 12.48, end: 12.66 },
  { text: 'like', start: 12.68, end: 12.82 },
  { text: 'your', start: 12.84, end: 13.0 },
  { text: 'fingernails,', start: 13.06, end: 13.68 },
  { text: 'ALL', start: 13.94, end: 14.28 },
  { text: 'pointing', start: 14.32, end: 14.7 },
  { text: 'down', start: 14.74, end: 14.92 },
  { text: 'the', start: 14.96, end: 15.06 },
  { text: 'throat…', start: 15.1, end: 15.46 },
  { text: 'so', start: 15.85, end: 16.04 },
  { text: 'a', start: 16.1, end: 16.18 },
  { text: 'slippery', start: 16.24, end: 16.62 },
  { text: 'fish', start: 16.76, end: 17.08 },
  { text: 'only', start: 17.14, end: 17.34 },
  { text: 'goes', start: 17.38, end: 17.62 },
  { text: 'ONE', start: 17.88, end: 18.0 },
  { text: 'way.', start: 18.1, end: 18.43 },
  { text: 'So,', start: 18.78, end: 19.17 },
  { text: 'trust', start: 19.36, end: 19.74 },
  { text: 'me:', start: 19.78, end: 19.93 },
];
