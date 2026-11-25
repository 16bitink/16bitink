/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (eleven_v4), sped up by 1.1132 (pitch kept) so its last word ends 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times
 * in voice.mp3 itself (ElevenLabs Scribe, one run; no tags were echoed).
 * Spelling, capitals and "…" follow the script; word edges at pauses are
 * fixed from the waveform (silencedetect at -38 dB).
 *
 * The script ends mid-sentence, and the loop's first line finishes it:
 * "…Nobody's swimming in to check, because / this snake was as long as a school BUS!"
 */
export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.065, end: 0.3 },
  { text: 'snake', start: 0.36, end: 0.64 },
  { text: 'was', start: 0.68, end: 0.78 },
  { text: 'as', start: 0.82, end: 0.94 },
  { text: 'long', start: 1.02, end: 1.22 },
  { text: 'as', start: 1.26, end: 1.32 },
  { text: 'a', start: 1.38, end: 1.48 },
  { text: 'school', start: 1.58, end: 1.86 },
  { text: 'BUS!', start: 1.96, end: 2.316 },
  { text: 'Titanoboa.', start: 2.657, end: 3.783 },
  { text: 'Forty-two', start: 4.131, end: 4.72 },
  { text: 'feet…', start: 4.9, end: 5.162 },
  { text: 'and', start: 5.433, end: 5.52 },
  { text: 'as', start: 5.58, end: 5.7 },
  { text: 'heavy', start: 5.76, end: 6.04 },
  { text: 'as', start: 6.1, end: 6.16 },
  { text: 'a', start: 6.2, end: 6.28 },
  { text: 'small', start: 6.4, end: 6.644 },
  { text: 'CAR.', start: 6.78, end: 7.211 },
  { text: 'Crocodiles', start: 7.592, end: 8.2 },
  { text: 'as', start: 8.26, end: 8.36 },
  { text: 'long', start: 8.44, end: 8.62 },
  { text: 'as', start: 8.66, end: 8.72 },
  { text: 'a', start: 8.76, end: 8.82 },
  { text: 'couch?', start: 8.9, end: 9.342 },
  { text: 'Scientists', start: 9.613, end: 10.22 },
  { text: 'think', start: 10.26, end: 10.4 },
  { text: 'they', start: 10.44, end: 10.52 },
  { text: 'were', start: 10.56, end: 10.72 },
  { text: 'SNACKS!', start: 10.84, end: 11.382 },
  { text: 'Then', start: 11.694, end: 11.88 },
  { text: 'they', start: 11.92, end: 12.0 },
  { text: 'found', start: 12.06, end: 12.22 },
  { text: 'its', start: 12.24, end: 12.4 },
  { text: 'skull…', start: 12.48, end: 12.786 },
  { text: 'with', start: 12.998, end: 13.127 },
  { text: 'teeth', start: 13.26, end: 13.5 },
  { text: 'like', start: 13.52, end: 13.64 },
  { text: 'a', start: 13.68, end: 13.74 },
  { text: 'FISH', start: 13.88, end: 14.06 },
  { text: "eater's!", start: 14.12, end: 14.482 },
  { text: 'So…', start: 15.16, end: 15.391 },
  { text: 'crocs', start: 15.718, end: 16.18 },
  { text: 'or', start: 16.28, end: 16.4 },
  { text: 'fish?', start: 16.5, end: 16.823 },
  { text: "Nobody's", start: 17.185, end: 17.66 },
  { text: 'swimming', start: 17.72, end: 17.96 },
  { text: 'in', start: 18.0, end: 18.06 },
  { text: 'to', start: 18.08, end: 18.16 },
  { text: 'check,', start: 18.24, end: 18.565 },
  { text: 'because', start: 18.68, end: 19.213 },
];

/** How many words each caption line holds, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [5, 4, 1, 2, 3, 4, 1, 5, 2, 3, 3, 2, 2, 4, 1, 3, 4, 2];

/** Word i's start and end in the video, seconds. */
export const startOf = (i: number): number => WORDS[i]!.start;
export const endOf = (i: number): number => WORDS[i]!.end;
