/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (take1.mp3 copied to voice-take.mp3, 22.16 s, last word ending at 22.04 s), sped up by
 * TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the
 * 21 s loop point. WORDS are its words with start and end times in the
 * take (ElevenLabs Scribe, one run, 2026-11-15; no tags were echoed), so divide by TEMPO
 * for voice.mp3. Spelling, capitals and punctuation follow the script. Edges at
 * pauses are fixed from the waveform (silencedetect at -40 dB), and the last
 * word's end is where the sound fades out.
 *
 * "This snake fakes its own DEATH!" is the hook; the script ends mid-sentence ("…and that's how") and the loop's first line finishes it.
 */
export const TEMPO = 1.06473;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.14, end: 0.3 },
  { text: 'snake', start: 0.42, end: 0.7 },
  { text: 'fakes', start: 0.92, end: 1.16 },
  { text: 'its', start: 1.18, end: 1.36 },
  { text: 'own', start: 1.4, end: 1.56 },
  { text: 'DEATH!', start: 1.72, end: 2.15 },
  { text: 'A', start: 2.61, end: 2.7 },
  { text: 'fox', start: 2.88, end: 3.16 },
  { text: 'shows', start: 3.2, end: 3.46 },
  { text: 'up…', start: 3.54, end: 3.75 },
  { text: 'so', start: 4.21, end: 4.38 },
  { text: 'first,', start: 4.44, end: 4.76 },
  { text: 'it', start: 5.02, end: 5.16 },
  { text: 'bluffs:', start: 5.2, end: 5.63 },
  { text: 'Neck', start: 5.93, end: 6.18 },
  { text: 'flat,', start: 6.26, end: 6.56 },
  { text: 'a', start: 6.88, end: 6.9 },
  { text: 'huge', start: 7.1, end: 7.48 },
  { text: 'HISS!', start: 7.58, end: 7.98 },
  { text: 'Fox', start: 9.08, end: 9.34 },
  { text: 'isn\'t', start: 9.38, end: 9.56 },
  { text: 'buying', start: 9.62, end: 9.92 },
  { text: 'it.', start: 9.98, end: 10.15 },
  { text: 'So', start: 10.47, end: 10.66 },
  { text: 'it', start: 10.7, end: 10.78 },
  { text: 'rolls', start: 10.92, end: 11.2 },
  { text: 'over…', start: 11.3, end: 11.66 },
  { text: 'tongue', start: 11.91, end: 12.24 },
  { text: 'out…', start: 12.32, end: 12.53 },
  { text: 'it', start: 12.93, end: 13.04 },
  { text: 'even', start: 13.1, end: 13.28 },
  { text: 'STINKS!', start: 13.64, end: 14.16 },
  { text: 'Flip', start: 14.56, end: 14.74 },
  { text: 'it', start: 14.78, end: 14.84 },
  { text: 'back', start: 14.88, end: 15.04 },
  { text: 'over?', start: 15.14, end: 15.38 },
  { text: 'It', start: 15.72, end: 15.86 },
  { text: 'rolls', start: 15.94, end: 16.2 },
  { text: 'right', start: 16.24, end: 16.44 },
  { text: 'BACK!', start: 16.48, end: 16.82 },
  { text: 'Drama', start: 17.5, end: 17.92 },
  { text: 'queen.', start: 18.02, end: 18.34 },
  { text: 'Then', start: 18.7, end: 18.92 },
  { text: 'it', start: 18.96, end: 19.02 },
  { text: 'peeks…', start: 19.14, end: 19.61 },
  { text: 'coast', start: 19.97, end: 20.22 },
  { text: 'is', start: 20.26, end: 20.4 },
  { text: 'clear…', start: 20.44, end: 20.78 },
  { text: 'and', start: 21.21, end: 21.42 },
  { text: 'that\'s', start: 21.5, end: 21.72 },
  { text: 'how', start: 21.76, end: 22.04 },
];
