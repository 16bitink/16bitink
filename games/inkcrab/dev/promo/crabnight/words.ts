/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Dewy" (9D6rPdtdqSwuo8ntjS2C,
 * eleven_v4), take t1 (voice-take.mp3) trimmed 0.05 s at the head and sped up
 * by TEMPO (pitch kept) with ffmpeg's atempo: the last word's end in the
 * trimmed take (19.72 s, silencedetect) ÷ (18 − 0.3). WORDS are its words with
 * start and end times in voice.mp3 (already sped up), from ElevenLabs Scribe
 * (one run, no tags echoed); the first word's start comes from silencedetect.
 * Spelling and emphasis follow the script (Scribe writes "walk", "dark").
 *
 * The script's first line raises the question ("how do you find one?") and
 * its last line runs back into the first: "…lit by glowing plankton. / Ever
 * since the Maldives, my son looks for hermit crabs wherever we go."
 */
export const TEMPO = 1.1141;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'Ever', start: 0.02, end: 0.26 },
  { text: 'since', start: 0.34, end: 0.52 },
  { text: 'the', start: 0.56, end: 0.64 },
  { text: 'Maldives,', start: 0.7, end: 1.18 },
  { text: 'my', start: 1.42, end: 1.58 },
  { text: 'son', start: 1.66, end: 1.82 },
  { text: 'looks', start: 1.86, end: 2.02 },
  { text: 'for', start: 2.04, end: 2.18 },
  { text: 'hermit', start: 2.24, end: 2.48 },
  { text: 'crabs', start: 2.52, end: 2.8 },
  { text: 'wherever', start: 2.86, end: 3.3 },
  { text: 'we', start: 3.36, end: 3.44 },
  { text: 'go.', start: 3.5, end: 3.76 },
  { text: "Here's", start: 4.28, end: 4.5 },
  { text: 'the', start: 4.54, end: 4.64 },
  { text: 'trick.', start: 4.7, end: 5.0 },
  { text: 'Look', start: 5.52, end: 5.66 },
  { text: 'for', start: 5.7, end: 5.84 },
  { text: 'shells', start: 5.92, end: 6.2 },
  { text: 'that', start: 6.24, end: 6.42 },
  { text: 'WALK.', start: 6.48, end: 6.82 },
  { text: 'Check', start: 7.28, end: 7.44 },
  { text: 'the', start: 7.48, end: 7.58 },
  { text: 'seaweed', start: 7.66, end: 7.94 },
  { text: 'line', start: 7.98, end: 8.14 },
  { text: 'the', start: 8.16, end: 8.24 },
  { text: 'waves', start: 8.28, end: 8.5 },
  { text: 'leave', start: 8.54, end: 8.66 },
  { text: 'behind…', start: 8.7, end: 9.14 },
  { text: 'and', start: 9.5, end: 9.62 },
  { text: 'come', start: 9.7, end: 9.86 },
  { text: 'back', start: 9.92, end: 10.22 },
  { text: 'after', start: 10.3, end: 10.52 },
  { text: 'DARK.', start: 10.6, end: 10.94 },
  { text: 'Most', start: 11.38, end: 11.6 },
  { text: 'land', start: 11.66, end: 11.84 },
  { text: 'hermit', start: 11.88, end: 12.08 },
  { text: 'crabs', start: 12.12, end: 12.4 },
  { text: 'come', start: 12.44, end: 12.54 },
  { text: 'out', start: 12.58, end: 12.68 },
  { text: 'at', start: 12.7, end: 12.78 },
  { text: 'night.', start: 12.82, end: 13.08 },
  { text: 'So', start: 13.62, end: 13.78 },
  { text: 'the', start: 13.84, end: 13.92 },
  { text: 'last', start: 13.98, end: 14.22 },
  { text: 'beach', start: 14.26, end: 14.42 },
  { text: 'in', start: 14.44, end: 14.52 },
  { text: 'my', start: 14.56, end: 14.7 },
  { text: 'game?', start: 14.74, end: 14.96 },
  { text: 'A', start: 15.44, end: 15.5 },
  { text: 'night', start: 15.56, end: 15.76 },
  { text: 'beach,', start: 15.8, end: 16.08 },
  { text: 'lit', start: 16.48, end: 16.66 },
  { text: 'by', start: 16.7, end: 16.84 },
  { text: 'glowing', start: 16.88, end: 17.2 },
  { text: 'plankton.', start: 17.26, end: 17.7 },
];

/** Where each caption phrase starts (index into WORDS): short phrases, one on screen at a time. */
export const PHRASE_STARTS: readonly number[] = [0, 4, 10, 13, 16, 21, 25, 29, 34, 38, 42, 49, 52];
