/**
 * The voiceover (voice.mp3): ElevenLabs voice Dewy (9D6rPdtdqSwuo8ntjS2C), eleven_v4, take 2 of 4,
 * at natural speed (TEMPO 1: the last word ends 0.32 s before the 19.5 s loop point).
 * WORDS: ElevenLabs Scribe timings in voice.mp3, tags dropped, punctuation and CAPS as scripted.
 */
export const TEMPO = 1;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: "As", start: 0.14, end: 0.24 },
  { text: "a", start: 0.3, end: 0.36 },
  { text: "kid,", start: 0.44, end: 0.72 },
  { text: "I", start: 1.14, end: 1.18 },
  { text: "was", start: 1.24, end: 1.4 },
  { text: "OBSESSED", start: 1.46, end: 2.28 },
  { text: "with", start: 2.32, end: 2.52 },
  { text: "Feeding", start: 2.6, end: 2.9 },
  { text: "Frenzy.", start: 2.98, end: 3.4 },
  { text: "You're", start: 4.22, end: 4.34 },
  { text: "a", start: 4.38, end: 4.46 },
  { text: "tiny", start: 4.54, end: 4.82 },
  { text: "fish.", start: 4.94, end: 5.28 },
  { text: "You", start: 5.7, end: 5.78 },
  { text: "eat", start: 5.82, end: 5.96 },
  { text: "smaller", start: 6.06, end: 6.34 },
  { text: "fish.", start: 6.42, end: 6.68 },
  { text: "You", start: 7.06, end: 7.14 },
  { text: "become", start: 7.18, end: 7.48 },
  { text: "the", start: 7.56, end: 7.64 },
  { text: "BIG", start: 7.82, end: 8.02 },
  { text: "fish.", start: 8.14, end: 8.48 },
  { text: "That's", start: 9.08, end: 9.3 },
  { text: "it!", start: 9.4, end: 9.6 },
  { text: "That's", start: 9.92, end: 10.1 },
  { text: "the", start: 10.14, end: 10.2 },
  { text: "whole", start: 10.24, end: 10.36 },
  { text: "game.", start: 10.46, end: 10.78 },
  { text: "Then", start: 11.46, end: 11.58 },
  { text: "I", start: 11.66, end: 11.72 },
  { text: "grew", start: 11.76, end: 11.96 },
  { text: "up…", start: 12.08, end: 12.24 },
  { text: "and", start: 12.8, end: 12.92 },
  { text: "forgot", start: 12.98, end: 13.28 },
  { text: "about", start: 13.34, end: 13.58 },
  { text: "it.", start: 13.62, end: 13.76 },
  { text: "So", start: 14.34, end: 14.46 },
  { text: "one", start: 14.6, end: 14.76 },
  { text: "weekend…", start: 14.82, end: 15.2 },
  { text: "I", start: 15.58, end: 15.64 },
  { text: "built", start: 15.68, end: 15.86 },
  { text: "my", start: 15.9, end: 16.04 },
  { text: "OWN!", start: 16.12, end: 16.42 },
  { text: "And", start: 16.84, end: 16.96 },
  { text: "for", start: 17, end: 17.14 },
  { text: "two", start: 17.22, end: 17.38 },
  { text: "days…", start: 17.46, end: 17.82 },
  { text: "I", start: 18.26, end: 18.32 },
  { text: "was", start: 18.36, end: 18.46 },
  { text: "that", start: 18.52, end: 18.66 },
  { text: "kid", start: 18.7, end: 18.84 },
  { text: "again.", start: 18.9, end: 19.18 },
];
