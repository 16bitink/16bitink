/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), chosen take voice-take.mp3, sped up by TEMPO
 * (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 19.5 s loop point. WORDS are its words with start and end times in
 * voice.mp3 itself (ElevenLabs Scribe, run on the sped-up file, so no
 * division by TEMPO), the tags dropped, "J-27" written "J27". The take opens
 * on a chuckle (0.03–0.6 s), not a word; the last word ends where the sound
 * does (silencedetect at -40 dB: 20.60 s in the take, 19.20 s here).
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…He wasn't even BORN / " (a chuckle) "in 1987…".
 */
export const TEMPO = 1.073;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 19.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'In', start: 0.62, end: 0.72 },
  { text: '1987,', start: 0.78, end: 1.74 },
  { text: 'an', start: 2.16, end: 2.24 },
  { text: 'orca', start: 2.42, end: 2.66 },
  { text: 'put', start: 2.76, end: 2.88 },
  { text: 'a', start: 2.92, end: 3.1 },
  { text: 'dead', start: 3.16, end: 3.36 },
  { text: 'salmon', start: 3.54, end: 3.84 },
  { text: 'on', start: 3.88, end: 3.96 },
  { text: 'her', start: 3.98, end: 4.06 },
  { text: 'HEAD,', start: 4.1, end: 4.3 },
  { text: 'and', start: 4.6, end: 4.72 },
  { text: 'other', start: 4.86, end: 5.1 },
  { text: 'orcas', start: 5.14, end: 5.42 },
  { text: 'copied', start: 5.48, end: 5.84 },
  { text: 'her!', start: 5.86, end: 6.04 },
  { text: 'Salmon', start: 6.4, end: 6.68 },
  { text: 'hats,', start: 6.74, end: 7.12 },
  { text: 'everywhere!', start: 7.22, end: 7.78 },
  { text: 'Then,', start: 8.4, end: 8.6 },
  { text: 'next', start: 9.06, end: 9.24 },
  { text: 'summer…', start: 9.3, end: 9.56 },
  { text: 'the', start: 10.08, end: 10.18 },
  { text: 'fad', start: 10.26, end: 10.48 },
  { text: 'just', start: 10.54, end: 10.68 },
  { text: 'vanished.', start: 10.9, end: 11.38 },
  { text: 'But', start: 11.86, end: 11.94 },
  { text: 'in', start: 11.98, end: 12.06 },
  { text: '2024,', start: 12.24, end: 12.94 },
  { text: 'a', start: 13.24, end: 13.26 },
  { text: 'photographer', start: 13.3, end: 13.82 },
  { text: 'caught', start: 13.92, end: 14.16 },
  { text: 'J27…', start: 14.22, end: 14.98 },
  { text: 'with', start: 15.22, end: 15.3 },
  { text: 'a', start: 15.32, end: 15.44 },
  { text: 'salmon', start: 15.54, end: 15.84 },
  { text: 'on', start: 15.88, end: 15.96 },
  { text: 'his', start: 15.98, end: 16.08 },
  { text: 'head!', start: 16.12, end: 16.34 },
  { text: 'Nobody', start: 16.78, end: 17.08 },
  { text: 'knows', start: 17.14, end: 17.4 },
  { text: 'why.', start: 17.44, end: 17.76 },
  { text: 'He', start: 18.2, end: 18.3 },
  { text: "wasn't", start: 18.34, end: 18.52 },
  { text: 'even', start: 18.54, end: 18.8 },
  { text: 'BORN', start: 18.84, end: 19.2 },
];
