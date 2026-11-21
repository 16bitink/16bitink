/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (voice-take.mp3, 20.96 s, last word ending at 20.80 s), sped up
 * by TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s
 * before the 19.5 s loop point. WORDS are its words with start and end times
 * in the take: ElevenLabs Scribe ran on voice.mp3 (one run, 2026-11-21; no
 * tags were echoed), its times multiplied by TEMPO, so divide by TEMPO for
 * voice.mp3. Spelling, capitals and punctuation follow the script ("movie
 * star" is one word, as written). The first word's start and the last word's
 * end are fixed from the waveform (silencedetect at -40 dB).
 *
 * The script ends mid-sentence ("…so it has to be perfect, because") and the
 * loop's first line finishes it.
 */
export const TEMPO = 1.0831;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.1, end: 0.3 },
  { text: 'bird', start: 0.41, end: 0.61 },
  { text: 'hunts', start: 0.67, end: 0.91 },
  { text: 'snakes…', start: 1.02, end: 1.47 },
  { text: 'by', start: 1.8, end: 2.01 },
  { text: 'KICKING', start: 2.08, end: 2.49 },
  { text: 'them!', start: 2.56, end: 2.79 },
  { text: 'Meet', start: 3.38, end: 3.57 },
  { text: 'the', start: 3.62, end: 3.79 },
  { text: 'secretary', start: 3.86, end: 4.42 },
  { text: 'bird.', start: 4.53, end: 4.81 },
  { text: 'Long', start: 5.22, end: 5.46 },
  { text: 'legs,', start: 5.52, end: 5.96 },
  { text: 'movie-star', start: 6.26, end: 6.78 },
  { text: 'eyelashes…', start: 6.91, end: 7.58 },
  { text: 'and', start: 7.88, end: 7.95 },
  { text: 'a', start: 8.01, end: 8.08 },
  { text: 'kick', start: 8.14, end: 8.36 },
  { text: 'of', start: 8.43, end: 8.69 },
  { text: 'FIVE', start: 8.73, end: 9.01 },
  { text: 'times', start: 9.12, end: 9.49 },
  { text: 'its', start: 9.53, end: 9.68 },
  { text: 'own', start: 9.73, end: 10.01 },
  { text: 'body', start: 10.05, end: 10.31 },
  { text: 'weight!', start: 10.42, end: 10.66 },
  { text: 'Scientists', start: 11.11, end: 11.55 },
  { text: 'timed', start: 11.61, end: 11.89 },
  { text: 'it:', start: 11.94, end: 12.02 },
  { text: 'fifteen', start: 12.41, end: 12.93 },
  { text: 'milliseconds.', start: 13.06, end: 13.76 },
  { text: 'That\'s', start: 14.06, end: 14.3 },
  { text: 'ten', start: 14.38, end: 14.56 },
  { text: 'times', start: 14.64, end: 14.9 },
  { text: 'faster', start: 14.99, end: 15.32 },
  { text: 'than', start: 15.34, end: 15.4 },
  { text: 'a', start: 15.45, end: 15.55 },
  { text: 'blink!', start: 15.6, end: 15.92 },
  { text: 'It', start: 16.44, end: 16.57 },
  { text: 'can\'t', start: 16.64, end: 16.9 },
  { text: 'fix', start: 16.94, end: 17.13 },
  { text: 'a', start: 17.2, end: 17.26 },
  { text: 'miss', start: 17.31, end: 17.55 },
  { text: 'mid-kick…', start: 17.61, end: 18.17 },
  { text: 'so', start: 18.54, end: 18.74 },
  { text: 'it', start: 18.78, end: 18.91 },
  { text: 'has', start: 19.0, end: 19.21 },
  { text: 'to', start: 19.26, end: 19.32 },
  { text: 'be', start: 19.34, end: 19.5 },
  { text: 'perfect,', start: 19.56, end: 20.02 },
  { text: 'because', start: 20.28, end: 20.8 },
];
