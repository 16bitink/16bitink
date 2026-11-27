/**
 * The voiceover (voice.mp3): ElevenLabs, voice Dewy (9D6rPdtdqSwuo8ntjS2C,
 * eleven_v4), take 2 (voice-take.mp3: the livelier of the two, 144 Hz median,
 * −18.9 LUFS), trimmed to its speech (0.07–21.63 s) and sped up by TEMPO
 * (pitch kept) with ffmpeg's atempo: speech length (21.53 s) ÷ (19.5 − 0.3).
 * WORDS are its words with start and end times in voice.mp3 (already sped up),
 * from ElevenLabs Scribe (one run, no tags echoed); the first word's start
 * and the last word's end come from silencedetect. Spelling and emphasis
 * follow the script (CAPS, "…", "!"), not Scribe's.
 *
 * The last line ("…a BIGGER home!") runs straight into the first ("Land
 * hermit crabs DIG."), so the loop never stops talking.
 */
export const TEMPO = 1.1215;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A time in voice.mp3, in the loop (the voice starts with it). */
export const inVoice = (voiceSeconds: number): number => voiceSeconds;

export const WORDS: readonly Word[] = [
  { text: 'Land', start: 0.03, end: 0.4 },
  { text: 'hermit', start: 0.46, end: 0.7 },
  { text: 'crabs', start: 0.78, end: 1.08 },
  { text: 'DIG.', start: 1.28, end: 1.8 },
  { text: 'To', start: 2.3, end: 2.4 },
  { text: 'grow,', start: 2.44, end: 2.78 },
  { text: 'a', start: 3.22, end: 3.26 },
  { text: 'land', start: 3.34, end: 3.54 },
  { text: 'hermit', start: 3.58, end: 3.8 },
  { text: 'crab', start: 3.86, end: 4.1 },
  { text: 'often', start: 4.2, end: 4.44 },
  { text: 'buries', start: 4.54, end: 4.84 },
  { text: 'itself', start: 4.88, end: 5.24 },
  { text: 'in', start: 5.26, end: 5.4 },
  { text: 'damp', start: 5.44, end: 5.66 },
  { text: 'sand…', start: 5.78, end: 6.2 },
  { text: 'sheds', start: 6.62, end: 6.94 },
  { text: 'its', start: 6.96, end: 7.1 },
  { text: 'old', start: 7.14, end: 7.32 },
  { text: 'skin…', start: 7.4, end: 7.84 },
  { text: 'and', start: 8.26, end: 8.36 },
  { text: 'stays', start: 8.46, end: 8.7 },
  { text: 'hidden', start: 8.78, end: 9.02 },
  { text: 'for', start: 9.12, end: 9.22 },
  { text: 'WEEKS.', start: 9.36, end: 9.83 },
  { text: 'My', start: 10.24, end: 10.56 },
  { text: 'son', start: 10.62, end: 10.82 },
  { text: 'loves', start: 11.0, end: 11.3 },
  { text: 'digging', start: 11.36, end: 11.58 },
  { text: 'for', start: 11.62, end: 11.72 },
  { text: 'treasure…', start: 11.78, end: 12.17 },
  { text: 'so', start: 12.44, end: 12.62 },
  { text: 'in', start: 12.66, end: 12.72 },
  { text: 'the', start: 12.74, end: 12.8 },
  { text: 'game', start: 12.86, end: 13.02 },
  { text: 'I', start: 13.08, end: 13.12 },
  { text: 'made', start: 13.16, end: 13.28 },
  { text: 'him,', start: 13.32, end: 13.44 },
  { text: 'you', start: 13.58, end: 13.8 },
  { text: 'dig', start: 13.84, end: 14.0 },
  { text: 'too.', start: 14.06, end: 14.36 },
  { text: 'Tunnels,', start: 14.65, end: 15.2 },
  { text: 'buried', start: 15.35, end: 15.64 },
  { text: 'shells…', start: 15.72, end: 16.24 },
  { text: 'and', start: 16.4, end: 16.54 },
  { text: 'the', start: 16.58, end: 16.66 },
  { text: 'treasure', start: 16.74, end: 17.04 },
  { text: 'every', start: 17.2, end: 17.4 },
  { text: 'crab', start: 17.5, end: 17.76 },
  { text: 'wants:', start: 17.82, end: 18.18 },
  { text: 'a', start: 18.33, end: 18.42 },
  { text: 'BIGGER', start: 18.58, end: 18.82 },
  { text: 'home!', start: 18.88, end: 19.2 },
];
