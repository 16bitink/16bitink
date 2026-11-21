/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (eleven_v4), voice-take.mp3 sped up by TEMPO (pitch kept) with ffmpeg's
 * atempo: last word's end (18.73 s, silencedetect) ÷ (18 − 0.3). WORDS are
 * its words with start and end times in voice.mp3 (already sped up), from
 * ElevenLabs Scribe (one run, no tags echoed); the first word's start and the
 * last word's end come from silencedetect. Spelling and emphasis follow the
 * script, so `inVoice` is the identity here.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…had never seen that before, because / this bird swallowed a New York RAT… whole!"
 */
export const TEMPO = 1.0582;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A time in voice.mp3, in the loop (the voice starts with it). */
export const inVoice = (voiceSeconds: number): number => voiceSeconds;

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.05, end: 0.34 },
  { text: 'bird', start: 0.46, end: 0.7 },
  { text: 'swallowed', start: 0.8, end: 1.12 },
  { text: 'a', start: 1.2, end: 1.26 },
  { text: 'New', start: 1.32, end: 1.42 },
  { text: 'York', start: 1.48, end: 1.68 },
  { text: 'RAT…', start: 1.88, end: 2.22 },
  { text: 'whole!', start: 2.54, end: 2.96 },
  { text: 'Central', start: 3.52, end: 3.8 },
  { text: 'Park,', start: 3.9, end: 4.2 },
  { text: '2021.', start: 4.56, end: 5.26 },
  { text: 'A', start: 5.72, end: 5.8 },
  { text: 'great', start: 5.84, end: 6.08 },
  { text: 'blue', start: 6.1, end: 6.28 },
  { text: 'heron', start: 6.32, end: 6.56 },
  { text: 'snatches', start: 6.74, end: 7.12 },
  { text: 'a', start: 7.16, end: 7.2 },
  { text: 'rat', start: 7.24, end: 7.42 },
  { text: 'from', start: 7.44, end: 7.54 },
  { text: 'the', start: 7.58, end: 7.66 },
  { text: 'pond…', start: 7.7, end: 7.98 },
  { text: 'dunks', start: 8.42, end: 8.68 },
  { text: 'it…', start: 8.76, end: 8.84 },
  { text: 'and', start: 9.06, end: 9.2 },
  { text: 'down', start: 9.34, end: 9.54 },
  { text: 'it', start: 9.56, end: 9.68 },
  { text: 'goes!', start: 9.72, end: 10.1 },
  { text: 'Head', start: 10.44, end: 10.6 },
  { text: 'first…', start: 10.7, end: 11.02 },
  { text: 'tail', start: 11.28, end: 11.62 },
  { text: 'LAST.', start: 11.8, end: 12.24 },
  { text: 'People', start: 12.62, end: 12.98 },
  { text: 'actually', start: 13.08, end: 13.48 },
  { text: 'CHEERED!', start: 13.58, end: 14.02 },
  { text: 'Even', start: 14.42, end: 14.62 },
  { text: 'the', start: 14.64, end: 14.76 },
  { text: 'birder', start: 14.78, end: 15.04 },
  { text: 'who', start: 15.08, end: 15.28 },
  { text: 'filmed', start: 15.32, end: 15.56 },
  { text: 'it', start: 15.58, end: 15.66 },
  { text: 'had', start: 15.7, end: 15.84 },
  { text: 'never', start: 15.94, end: 16.2 },
  { text: 'seen', start: 16.26, end: 16.42 },
  { text: 'that', start: 16.46, end: 16.58 },
  { text: 'before,', start: 16.62, end: 16.98 },
  { text: 'because', start: 17.18, end: 17.7 },
];
