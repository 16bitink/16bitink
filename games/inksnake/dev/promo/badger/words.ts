/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (take2.mp3 copied to voice-take.mp3, 20.80 s, last word ending at 20.69 s), sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 19.5 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run, 2026-11-15; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling, capitals and punctuation follow the script. Edges at
 * pauses are fixed from the waveform (silencedetect at -40 dB), and the last
 * word's end is where the sound fades out.
 *
 * the script ends mid-sentence ("…It doesn't care. Because") and the loop's first line finishes it.
 */
export const TEMPO = 1.0776;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.1, end: 0.36 },
  { text: 'badger', start: 0.4, end: 0.72 },
  { text: 'eats', start: 0.82, end: 0.98 },
  { text: 'VENOMOUS', start: 1.16, end: 1.52 },
  { text: 'snakes!', start: 1.62, end: 2.21 },
  { text: 'A', start: 2.59, end: 2.76 },
  { text: 'puff', start: 2.86, end: 3.08 },
  { text: 'adder,', start: 3.16, end: 3.36 },
  { text: 'one', start: 3.85, end: 3.98 },
  { text: 'of', start: 4.0, end: 4.1 },
  { text: 'Africa\'s', start: 4.18, end: 4.54 },
  { text: 'most', start: 4.58, end: 4.88 },
  { text: 'dangerous.', start: 4.94, end: 5.56 },
  { text: 'The', start: 6.01, end: 6.14 },
  { text: 'badger', start: 6.18, end: 6.42 },
  { text: 'grabs', start: 6.56, end: 6.86 },
  { text: 'it…', start: 6.9, end: 6.98 },
  { text: 'and', start: 7.36, end: 7.46 },
  { text: 'gets', start: 7.48, end: 7.76 },
  { text: 'bitten,', start: 7.8, end: 8.06 },
  { text: 'right', start: 8.44, end: 8.58 },
  { text: 'in', start: 8.6, end: 8.66 },
  { text: 'the', start: 8.7, end: 8.74 },
  { text: 'FACE!', start: 8.96, end: 9.43 },
  { text: 'It', start: 9.93, end: 10.02 },
  { text: 'collapses.', start: 10.08, end: 10.79 },
  { text: 'It\'s', start: 11.28, end: 11.42 },
  { text: 'over…', start: 11.52, end: 11.82 },
  { text: 'Hours', start: 12.33, end: 12.66 },
  { text: 'later?', start: 12.74, end: 13.07 },
  { text: 'It', start: 13.38, end: 13.5 },
  { text: 'WAKES', start: 13.62, end: 13.9 },
  { text: 'UP…', start: 14.02, end: 14.18 },
  { text: 'and', start: 14.44, end: 14.58 },
  { text: 'finishes', start: 14.7, end: 15.06 },
  { text: 'its', start: 15.1, end: 15.24 },
  { text: 'lunch!', start: 15.3, end: 15.71 },
  { text: 'Resistant,', start: 16.07, end: 16.72 },
  { text: 'not', start: 17.0, end: 17.12 },
  { text: 'immune…', start: 17.16, end: 17.72 },
  { text: 'but', start: 17.95, end: 18.11 },
  { text: 'honestly?', start: 18.27, end: 18.77 },
  { text: 'It', start: 19.04, end: 19.16 },
  { text: 'doesn\'t', start: 19.18, end: 19.42 },
  { text: 'care.', start: 19.48, end: 19.71 },
  { text: 'Because', start: 20.09, end: 20.69 },
];
