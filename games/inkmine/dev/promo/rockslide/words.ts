/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (take2.mp3 copied to voice-take.mp3, 21.76 s, last word ending at 21.49 s), sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 19.5 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run, 2026-11-15; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling, capitals and punctuation follow the script. Edges at
 * pauses are fixed from the waveform (silencedetect at -40 dB), and the last
 * word's end is where the sound fades out.
 *
 * the script ends mid-sentence ("…before you dig, remember:") and the loop's first line finishes it.
 */
export const TEMPO = 1.11927;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'These', start: 0.14, end: 0.34 },
  { text: 'rocks', start: 0.48, end: 0.76 },
  { text: 'are', start: 0.84, end: 0.94 },
  { text: 'ALIVE!', start: 0.98, end: 1.75 },
  { text: 'It\'s', start: 2.27, end: 2.5 },
  { text: 'the', start: 2.54, end: 2.64 },
  { text: 'Rockslide…', start: 2.68, end: 3.35 },
  { text: 'a', start: 3.71, end: 3.9 },
  { text: 'crab', start: 3.98, end: 4.28 },
  { text: 'the', start: 4.32, end: 4.4 },
  { text: 'size', start: 4.48, end: 4.68 },
  { text: 'of', start: 4.72, end: 4.76 },
  { text: 'a', start: 4.84, end: 4.9 },
  { text: 'HILL,', start: 5.02, end: 5.34 },
  { text: 'asleep', start: 5.64, end: 6.02 },
  { text: 'under', start: 6.06, end: 6.22 },
  { text: 'the', start: 6.26, end: 6.32 },
  { text: 'mesa.', start: 6.36, end: 6.77 },
  { text: 'And', start: 7.16, end: 7.3 },
  { text: 'behind', start: 7.34, end: 7.7 },
  { text: 'it?', start: 7.76, end: 7.85 },
  { text: 'A', start: 8.17, end: 8.26 },
  { text: 'bed', start: 8.42, end: 8.58 },
  { text: 'of', start: 8.64, end: 8.84 },
  { text: 'OPALS.', start: 8.94, end: 9.47 },
  { text: 'Drill', start: 9.93, end: 10.24 },
  { text: 'slowly…', start: 10.44, end: 10.99 },
  { text: 'one', start: 11.46, end: 11.64 },
  { text: 'block…', start: 11.7, end: 12.12 },
  { text: 'one', start: 12.66, end: 12.84 },
  { text: 'more…', start: 12.92, end: 13.36 },
  { text: 'Its', start: 13.8, end: 14.0 },
  { text: 'eyes', start: 14.1, end: 14.32 },
  { text: 'OPEN!', start: 14.38, end: 14.75 },
  { text: 'Rocks', start: 15.07, end: 15.42 },
  { text: 'rain', start: 15.54, end: 15.74 },
  { text: 'from', start: 15.76, end: 15.88 },
  { text: 'the', start: 15.92, end: 16.0 },
  { text: 'roof!', start: 16.06, end: 16.42 },
  { text: 'You', start: 16.74, end: 16.86 },
  { text: 'can\'t', start: 16.94, end: 17.16 },
  { text: 'hurt', start: 17.2, end: 17.34 },
  { text: 'it.', start: 17.38, end: 17.5 },
  { text: 'You', start: 17.82, end: 17.86 },
  { text: 'can', start: 17.9, end: 18.08 },
  { text: 'only', start: 18.16, end: 18.4 },
  { text: 'RUN!', start: 18.56, end: 18.96 },
  { text: 'So,', start: 19.32, end: 19.74 },
  { text: 'before', start: 20.0, end: 20.3 },
  { text: 'you', start: 20.34, end: 20.42 },
  { text: 'dig,', start: 20.48, end: 20.83 },
  { text: 'remember:', start: 20.99, end: 21.49 },
];

/** When word `i` starts, in loop seconds. */
export const said = (i: number): number => WORDS[i]!.start / TEMPO;
