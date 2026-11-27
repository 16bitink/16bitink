/**
 * The voiceover (voice.mp3): ElevenLabs, voice Dewy (9D6rPdtdqSwuo8ntjS2C,
 * eleven_v4), take t1 (voice-take.mp3: steadier loudness than t2, every line
 * within ~3 dB of the take), its leading 0.12 s of silence trimmed, then sped
 * up by TEMPO (pitch kept) with ffmpeg's atempo: last word's end in the
 * trimmed take (18.196 s, silencedetect) ÷ (18 − 0.3). WORDS are its words
 * with start and end times in voice.mp3 (already sped up), from ElevenLabs
 * Scribe (one run, the tags weren't echoed; the "[laughs]" sits between
 * "LEGS." and "He"); the first word's start and the last word's end come
 * from silencedetect and the loudness envelope. Spelling and emphasis follow
 * the script, which Scribe flattened ("The Maldives," "shell with legs").
 *
 * The script ends on "the place it all began." and runs straight into its
 * first line, "This is where my son and I saw our first hermit crab."
 */
export const TEMPO = 1.028;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.03, end: 0.22 },
  { text: 'is', start: 0.26, end: 0.38 },
  { text: 'where', start: 0.42, end: 0.56 },
  { text: 'my', start: 0.6, end: 0.78 },
  { text: 'son', start: 0.86, end: 1.02 },
  { text: 'and', start: 1.04, end: 1.14 },
  { text: 'I', start: 1.2, end: 1.34 },
  { text: 'saw', start: 1.46, end: 1.64 },
  { text: 'our', start: 1.7, end: 1.86 },
  { text: 'first', start: 2.02, end: 2.32 },
  { text: 'hermit', start: 2.42, end: 2.7 },
  { text: 'crab.', start: 2.78, end: 3.12 },
  { text: 'The', start: 3.54, end: 3.64 },
  { text: 'Maldives!', start: 3.72, end: 4.38 },
  { text: 'A', start: 4.78, end: 4.82 },
  { text: 'little', start: 4.88, end: 5.14 },
  { text: 'shell…', start: 5.26, end: 5.6 },
  { text: 'with', start: 5.96, end: 6.14 },
  { text: 'LEGS.', start: 6.3, end: 6.82 },
  { text: 'He', start: 7.84, end: 7.94 },
  { text: 'was', start: 8.0, end: 8.16 },
  { text: 'hooked.', start: 8.24, end: 8.56 },
  { text: 'So', start: 9.08, end: 9.2 },
  { text: 'when', start: 9.22, end: 9.32 },
  { text: 'I', start: 9.38, end: 9.44 },
  { text: 'made', start: 9.48, end: 9.62 },
  { text: 'him', start: 9.64, end: 9.72 },
  { text: 'a', start: 9.78, end: 9.82 },
  { text: 'hermit', start: 9.88, end: 10.12 },
  { text: 'crab', start: 10.16, end: 10.4 },
  { text: 'game…', start: 10.48, end: 10.72 },
  { text: 'level', start: 11.18, end: 11.42 },
  { text: 'one', start: 11.54, end: 11.72 },
  { text: 'HAD', start: 12.0, end: 12.24 },
  { text: 'to', start: 12.3, end: 12.36 },
  { text: 'be', start: 12.42, end: 12.5 },
  { text: 'this', start: 12.56, end: 12.72 },
  { text: 'beach.', start: 12.76, end: 13.06 },
  { text: 'Seaplane,', start: 13.5, end: 14.1 },
  { text: 'water', start: 14.28, end: 14.52 },
  { text: 'villas,', start: 14.6, end: 15.04 },
  { text: 'palm', start: 15.22, end: 15.46 },
  { text: 'trees…', start: 15.56, end: 16.0 },
  { text: 'the', start: 16.42, end: 16.5 },
  { text: 'place', start: 16.56, end: 16.82 },
  { text: 'it', start: 16.86, end: 16.98 },
  { text: 'all', start: 17.08, end: 17.22 },
  { text: 'began.', start: 17.26, end: 17.7 },
];
