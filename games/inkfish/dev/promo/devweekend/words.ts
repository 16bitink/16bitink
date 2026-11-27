/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Dewy" (9D6rPdtdqSwuo8ntjS2C) on eleven_v4, one flow of 4 takes
 * (flow 6cGH5aAGQCHJRWpR0FFZ); the 22.8 s take with the tightest pauses is voice-take.mp3 (last word ends 22.58 s),
 * sped up by TEMPO (pitch kept) with ffmpeg's atempo so its last word ends 0.3 s before the 21 s loop point.
 * WORDS are its words with start and end times in the take (ElevenLabs Scribe, one run); divide by TEMPO for
 * voice.mp3 (SPEECH_WORDS does). Spelling and capitals follow the script (Scribe wrote "4:00 PM", "6:00 PM",
 * "10:00 PM", "11" and "100": the numbers are split into the script's words inside Scribe's span; "a hundred"
 * starts where the sound comes back after the pause, from silencedetect at -40 dB).
 *
 * The script ends on the laugh, and the loop's first line ("I built THIS in one weekend.") starts the story again.
 */
export const TEMPO = 1.091;

/** Loop length in seconds (a multiple of 1.5 s). */
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: "I", start: 0.16, end: 0.22 },
  { text: "built", start: 0.34, end: 0.54 },
  { text: "THIS", start: 0.6, end: 0.76 },
  { text: "in", start: 0.8, end: 0.9 },
  { text: "one", start: 1.12, end: 1.28 },
  { text: "weekend.", start: 1.4, end: 1.9 },
  { text: "Saturday,", start: 2.58, end: 3.02 },
  { text: "four", start: 3.28, end: 3.48 },
  { text: "p.m.:", start: 3.5, end: 3.86 },
  { text: "a", start: 4.26, end: 4.32 },
  { text: "fish!", start: 4.48, end: 4.84 },
  { text: "…Kind", start: 5.4, end: 5.62 },
  { text: "of.", start: 5.68, end: 5.84 },
  { text: "Six", start: 6.4, end: 6.66 },
  { text: "p.m.:", start: 6.7, end: 7.0 },
  { text: "it", start: 7.36, end: 7.44 },
  { text: "has", start: 7.48, end: 7.62 },
  { text: "a", start: 7.68, end: 7.76 },
  { text: "TAIL!", start: 7.84, end: 8.28 },
  { text: "Ten", start: 8.82, end: 9.08 },
  { text: "p.m.:", start: 9.12, end: 9.48 },
  { text: "the", start: 9.82, end: 9.98 },
  { text: "final", start: 10.08, end: 10.32 },
  { text: "boss", start: 10.4, end: 10.68 },
  { text: "gets", start: 10.76, end: 10.96 },
  { text: "EIGHT", start: 11.18, end: 11.36 },
  { text: "arms.", start: 11.5, end: 11.92 },
  { text: "Eleven:", start: 12.36, end: 12.86 },
  { text: "SHARKS!", start: 13.26, end: 13.8 },
  { text: "Sunday:", start: 14.4, end: 14.8 },
  { text: "a", start: 15.15, end: 15.3 },
  { text: "hundred", start: 15.3, end: 15.68 },
  { text: "levels,", start: 15.74, end: 16.16 },
  { text: "birds,", start: 16.379, end: 16.8 },
  { text: "boats,", start: 16.98, end: 17.32 },
  { text: "a", start: 17.46, end: 17.5 },
  { text: "whole", start: 17.6, end: 17.8 },
  { text: "ocean…", start: 17.96, end: 18.38 },
  { text: "and", start: 18.98, end: 19.26 },
  { text: "no", start: 19.36, end: 19.5 },
  { text: "Start", start: 19.62, end: 19.86 },
  { text: "button.", start: 19.9, end: 20.16 },
  { text: "Nobody", start: 21.18, end: 21.5 },
  { text: "could", start: 21.54, end: 21.66 },
  { text: "START", start: 21.84, end: 22.08 },
  { text: "the", start: 22.12, end: 22.2 },
  { text: "game.", start: 22.28, end: 22.58 },
];

/** The words in voice.mp3's time (after atempo): for the captions and the lip sync. */
export const SPEECH_WORDS: readonly Word[] = WORDS.map((w) => ({ text: w.text, start: w.start / TEMPO, end: w.end / TEMPO }));
