/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), chosen take voice-take.mp3, sped up by TEMPO
 * (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 21 s loop point. WORDS are its words with start and end times in voice.mp3
 * itself (ElevenLabs Scribe, run on the sped-up file), punctuated as scripted;
 * the last word ends where the sound does (silencedetect at -35 dB: 20.70 s).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…nobody knows why / this seal has an EEL up its nose!".
 */
export const TEMPO = 1.1118;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.14, end: 0.32 },
  { text: 'seal', start: 0.4, end: 0.68 },
  { text: 'has', start: 0.76, end: 0.88 },
  { text: 'an', start: 0.92, end: 1.1 },
  { text: 'EEL', start: 1.2, end: 1.4 },
  { text: 'up', start: 1.46, end: 1.54 },
  { text: 'its', start: 1.58, end: 1.72 },
  { text: 'nose!', start: 1.76, end: 2.12 },
  { text: 'Scientists', start: 2.5, end: 2.9 },
  { text: 'in', start: 2.92, end: 3.0 },
  { text: 'Hawaii', start: 3.02, end: 3.42 },
  { text: 'have', start: 3.48, end: 3.58 },
  { text: 'seen', start: 3.62, end: 3.72 },
  { text: 'it', start: 3.76, end: 3.88 },
  { text: 'three', start: 3.94, end: 4.12 },
  { text: 'or', start: 4.14, end: 4.24 },
  { text: 'four', start: 4.28, end: 4.42 },
  { text: 'times.', start: 4.5, end: 4.92 },
  { text: 'They', start: 5.28, end: 5.4 },
  { text: 'catch', start: 5.48, end: 5.68 },
  { text: 'the', start: 5.72, end: 5.8 },
  { text: 'seal,', start: 5.88, end: 6.1 },
  { text: 'gently', start: 6.5, end: 6.8 },
  { text: 'pull…', start: 6.88, end: 7.22 },
  { text: 'and', start: 7.68, end: 7.8 },
  { text: 'pull…', start: 7.92, end: 8.32 },
  { text: 'and', start: 8.74, end: 8.9 },
  { text: 'PULL!', start: 9.08, end: 9.5 },
  { text: 'The', start: 10.32, end: 10.4 },
  { text: 'seal?', start: 10.48, end: 10.72 },
  { text: 'Totally', start: 11.1, end: 11.42 },
  { text: 'fine.', start: 11.5, end: 11.8 },
  { text: 'Maybe', start: 12.22, end: 12.54 },
  { text: 'the', start: 12.58, end: 12.66 },
  { text: 'eel', start: 12.7, end: 12.84 },
  { text: 'was', start: 12.9, end: 13.02 },
  { text: 'hiding…', start: 13.08, end: 13.46 },
  { text: 'or', start: 13.76, end: 13.94 },
  { text: 'got', start: 13.98, end: 14.16 },
  { text: 'swallowed,', start: 14.24, end: 14.68 },
  { text: 'and', start: 14.78, end: 14.9 },
  { text: 'took', start: 14.96, end: 15.12 },
  { text: 'the', start: 15.16, end: 15.26 },
  { text: 'WRONG', start: 15.38, end: 15.72 },
  { text: 'exit!', start: 15.84, end: 16.14 },
  { text: 'One', start: 16.58, end: 16.68 },
  { text: 'scientist', start: 16.78, end: 17.12 },
  { text: 'compared', start: 17.16, end: 17.44 },
  { text: 'it', start: 17.48, end: 17.56 },
  { text: 'to', start: 17.6, end: 17.66 },
  { text: 'a', start: 17.7, end: 17.76 },
  { text: 'teenage', start: 17.82, end: 18.2 },
  { text: 'trend.', start: 18.26, end: 18.6 },
  { text: 'But', start: 18.98, end: 19.1 },
  { text: 'honestly…', start: 19.14, end: 19.52 },
  { text: 'nobody', start: 19.9, end: 20.16 },
  { text: 'knows', start: 20.18, end: 20.36 },
  { text: 'why', start: 20.42, end: 20.7 },
];
