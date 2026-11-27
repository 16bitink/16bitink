/**
 * The voiceover (voice.mp3): ElevenLabs voice Dewy (9D6rPdtdqSwuo8ntjS2C, eleven_v4), the directed read, voiced
 * 2026-11-27 (take 4 of 4), sped up by TEMPO with ffmpeg's atempo to end about 0.3 s before the 21 s loop point.
 * WORDS: ElevenLabs Scribe on the take, times divided by TEMPO and checked against silencedetect -40 dB on voice.mp3.
 * "3:00 AM" is written out as said ("three a.m."). The script ends mid-thought so the loop's first line follows it:
 * "...the flying ones. / It's three a.m."
 */
export const TEMPO = 1.16;
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: "It's", start: 0.16, end: 0.38 },
  { text: "three", start: 0.43, end: 0.67 },
  { text: "a.m.,", start: 0.71, end: 1.09 },
  { text: "and", start: 1.64, end: 1.74 },
  { text: "my", start: 1.78, end: 1.93 },
  { text: "rubber", start: 1.98, end: 2.17 },
  { text: "ducks", start: 2.29, end: 2.50 },
  { text: "are", start: 2.53, end: 2.66 },
  { text: "flying.", start: 2.76, end: 3.22 },
  { text: "They're", start: 3.67, end: 3.81 },
  { text: "decoys.", start: 3.90, end: 4.41 },
  { text: "Sharks", start: 4.76, end: 5.03 },
  { text: "chase", start: 5.07, end: 5.24 },
  { text: "the", start: 5.29, end: 5.41 },
  { text: "duck", start: 5.45, end: 5.67 },
  { text: "instead", start: 5.71, end: 5.93 },
  { text: "of", start: 5.98, end: 6.05 },
  { text: "you.", start: 6.14, end: 6.28 },
  { text: "Genius.", start: 6.69, end: 7.22 },
  { text: "Except", start: 7.67, end: 8.19 },
  { text: "I", start: 8.72, end: 8.78 },
  { text: "never", start: 8.84, end: 9.05 },
  { text: "told", start: 9.12, end: 9.28 },
  { text: "them", start: 9.31, end: 9.40 },
  { text: "where", start: 9.43, end: 9.50 },
  { text: "the", start: 9.53, end: 9.64 },
  { text: "water", start: 9.69, end: 9.90 },
  { text: "ends,", start: 9.98, end: 10.24 },
  { text: "so", start: 10.95, end: 11.05 },
  { text: "they", start: 11.10, end: 11.21 },
  { text: "kept", start: 11.29, end: 11.48 },
  { text: "going", start: 11.55, end: 11.86 },
  { text: "up,", start: 12.28, end: 12.45 },
  { text: "up,", start: 12.74, end: 12.88 },
  { text: "sharks", start: 13.24, end: 13.55 },
  { text: "right", start: 13.69, end: 13.86 },
  { text: "behind", start: 13.90, end: 14.19 },
  { text: "them.", start: 14.24, end: 14.38 },
  { text: "One", start: 14.93, end: 15.03 },
  { text: "line", start: 15.09, end: 15.19 },
  { text: "of", start: 15.22, end: 15.29 },
  { text: "code", start: 15.34, end: 15.52 },
  { text: "later,", start: 15.55, end: 15.81 },
  { text: "they", start: 16.09, end: 16.21 },
  { text: "stop", start: 16.29, end: 16.47 },
  { text: "at", start: 16.48, end: 16.53 },
  { text: "the", start: 16.57, end: 16.64 },
  { text: "surface,", start: 16.69, end: 17.12 },
  { text: "and", start: 17.59, end: 17.67 },
  { text: "a", start: 17.71, end: 17.78 },
  { text: "seagull", start: 17.93, end: 18.22 },
  { text: "steals", start: 18.40, end: 18.69 },
  { text: "one.", start: 18.78, end: 18.93 },
  { text: "I", start: 19.45, end: 19.50 },
  { text: "kinda", start: 19.55, end: 19.76 },
  { text: "miss", start: 19.81, end: 19.97 },
  { text: "the", start: 20.00, end: 20.09 },
  { text: "flying", start: 20.16, end: 20.43 },
  { text: "ones", start: 20.50, end: 20.72 },
];
