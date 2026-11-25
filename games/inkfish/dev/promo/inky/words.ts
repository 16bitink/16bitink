/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * (UgBBYS2sOqTuMpoF3BR0, eleven_v4), the directed read (audio tags, caps
 * emphasis and punctuation), voiced 2026-11-25, sped up by TEMPO (pitch
 * kept) with ffmpeg's atempo to end about 0.3 s before the 22.5 s loop point.
 * WORDS are its words with start and end times in voice.mp3 itself
 * (ElevenLabs Scribe on the sped-up file), word edges at the pauses fixed
 * from the waveform (silencedetect at -40 dB). The narrator chuckles at
 * 14.2–14.8, before "Next morning".
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "Inky was never seen again, after / this octopus broke OUT of an aquarium!"
 */
export const TEMPO = 1.1192;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 22.5;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'This', start: 0.08, end: 0.28 },
  { text: 'octopus', start: 0.42, end: 0.86 },
  { text: 'broke', start: 0.96, end: 1.18 },
  { text: 'OUT', start: 1.22, end: 1.3 },
  { text: 'of', start: 1.32, end: 1.38 },
  { text: 'an', start: 1.4, end: 1.44 },
  { text: 'aquarium!', start: 1.48, end: 2.161 },
  { text: 'New', start: 2.413, end: 2.66 },
  { text: 'Zealand,', start: 2.74, end: 3.246 },
  { text: '2016.', start: 3.333, end: 4.208 },
  { text: 'The', start: 4.572, end: 4.68 },
  { text: 'lid', start: 4.74, end: 4.9 },
  { text: 'was', start: 4.94, end: 5.04 },
  { text: 'left', start: 5.08, end: 5.28 },
  { text: 'open…', start: 5.36, end: 5.662 },
  { text: 'just', start: 6.014, end: 6.32 },
  { text: 'a', start: 6.36, end: 6.42 },
  { text: 'crack.', start: 6.48, end: 6.847 },
  { text: 'Inky', start: 7.275, end: 7.56 },
  { text: 'squeezed', start: 7.7, end: 8.1 },
  { text: 'out,', start: 8.18, end: 8.366 },
  { text: 'crossed', start: 8.566, end: 8.92 },
  { text: 'the', start: 8.96, end: 9.04 },
  { text: 'floor…', start: 9.1, end: 9.43 },
  { text: 'and', start: 9.704, end: 9.8 },
  { text: 'found', start: 9.92, end: 10.08 },
  { text: 'a', start: 10.12, end: 10.2 },
  { text: 'drain,', start: 10.26, end: 10.683 },
  { text: 'SIX', start: 10.776, end: 11.2 },
  { text: 'inches', start: 11.26, end: 11.54 },
  { text: 'wide.', start: 11.6, end: 11.904 },
  { text: 'And', start: 12.231, end: 12.36 },
  { text: 'that', start: 12.42, end: 12.58 },
  { text: 'pipe', start: 12.64, end: 12.9 },
  { text: 'led', start: 12.96, end: 13.08 },
  { text: 'to', start: 13.12, end: 13.18 },
  { text: 'the', start: 13.22, end: 13.36 },
  { text: 'OCEAN!', start: 13.46, end: 13.906 },
  { text: 'Next', start: 14.8, end: 14.98 },
  { text: 'morning:', start: 15.04, end: 15.349 },
  { text: 'an', start: 15.578, end: 15.72 },
  { text: 'empty', start: 15.76, end: 15.98 },
  { text: 'tank…', start: 16.079, end: 16.355 },
  { text: 'and', start: 16.638, end: 16.78 },
  { text: 'a', start: 16.82, end: 16.86 },
  { text: 'trail.', start: 16.92, end: 17.257 },
  { text: 'The', start: 17.597, end: 17.7 },
  { text: 'manager', start: 17.78, end: 18.1 },
  { text: 'said', start: 18.18, end: 18.32 },
  { text: 'he', start: 18.34, end: 18.46 },
  { text: "didn't", start: 18.5, end: 18.66 },
  { text: 'even', start: 18.7, end: 18.84 },
  { text: 'leave', start: 18.88, end: 19 },
  { text: 'a', start: 19.04, end: 19.1 },
  { text: 'MESSAGE!', start: 19.26, end: 19.802 },
  { text: 'Inky', start: 20.268, end: 20.56 },
  { text: 'was', start: 20.6, end: 20.74 },
  { text: 'never', start: 20.8, end: 20.96 },
  { text: 'seen', start: 21.06, end: 21.18 },
  { text: 'again,', start: 21.22, end: 21.572 },
  { text: 'after', start: 21.8, end: 22.206 },
];
