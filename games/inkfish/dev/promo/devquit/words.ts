/**
 * The voiceover (voice.mp3): ElevenLabs voice Dewy (9D6rPdtdqSwuo8ntjS2C, eleven_v4), the directed read of the
 * script, chosen take 2 (voice-take.mp3, 22.56 s), sped up by TEMPO (pitch kept) with ffmpeg's atempo so its
 * last word ends 0.3 s before the 21 s loop point. WORDS are its words with start and end times in voice.mp3
 * itself (ElevenLabs Scribe, run on the sped-up file), punctuated and capitalised as scripted; the last word
 * ends where the sound does (silencedetect at -35 dB: 20.70 s).
 */
export const TEMPO = 1.0826;

/** Loop length in seconds (a multiple of 1.5 s: whole 30 fps frames and line-boil cycles). */
export const LOOP_S = 21;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: "The", start: 0.24, end: 0.34 },
  { text: "first", start: 0.44, end: 0.66 },
  { text: "person", start: 0.72, end: 1 },
  { text: "to", start: 1.02, end: 1.1 },
  { text: "play", start: 1.14, end: 1.32 },
  { text: "my", start: 1.36, end: 1.5 },
  { text: "game", start: 1.56, end: 1.86 },
  { text: "quit", start: 1.96, end: 2.16 },
  { text: "at", start: 2.2, end: 2.3 },
  { text: "level", start: 2.34, end: 2.52 },
  { text: "SIX.", start: 2.76, end: 3.14 },
  { text: "\"Every", start: 3.68, end: 3.96 },
  { text: "level", start: 4.08, end: 4.3 },
  { text: "feels", start: 4.4, end: 4.6 },
  { text: "the", start: 4.66, end: 4.76 },
  { text: "same.\"", start: 4.88, end: 5.24 },
  { text: "Ouch.", start: 6.46, end: 6.76 },
  { text: "But", start: 7.24, end: 7.38 },
  { text: "starting", start: 7.44, end: 7.74 },
  { text: "tiny", start: 7.82, end: 8.22 },
  { text: "every", start: 8.28, end: 8.44 },
  { text: "level?", start: 8.54, end: 8.78 },
  { text: "That's", start: 9.2, end: 9.38 },
  { text: "the", start: 9.42, end: 9.48 },
  { text: "BEST", start: 9.64, end: 9.9 },
  { text: "part.", start: 9.96, end: 10.22 },
  { text: "That's", start: 10.52, end: 10.78 },
  { text: "Feeding", start: 10.84, end: 11.06 },
  { text: "Frenzy!", start: 11.16, end: 11.52 },
  { text: "So", start: 11.98, end: 12.06 },
  { text: "I", start: 12.14, end: 12.18 },
  { text: "kept", start: 12.24, end: 12.44 },
  { text: "it…", start: 12.48, end: 12.6 },
  { text: "and", start: 12.9, end: 12.98 },
  { text: "made", start: 13.02, end: 13.26 },
  { text: "every", start: 13.34, end: 13.54 },
  { text: "level", start: 13.6, end: 13.8 },
  { text: "different", start: 13.92, end: 14.22 },
  { text: "instead.", start: 14.26, end: 14.68 },
  { text: "A", start: 15.06, end: 15.14 },
  { text: "fishing", start: 15.24, end: 15.56 },
  { text: "fleet!", start: 15.62, end: 15.84 },
  { text: "A", start: 16.079, end: 16.12 },
  { text: "bait", start: 16.2, end: 16.42 },
  { text: "ball!", start: 16.46, end: 16.68 },
  { text: "A", start: 16.96, end: 17.02 },
  { text: "hunter", start: 17.08, end: 17.32 },
  { text: "coming", start: 17.38, end: 17.6 },
  { text: "for", start: 17.64, end: 17.74 },
  { text: "YOU!", start: 17.9, end: 18.12 },
  { text: "So…", start: 18.64, end: 18.92 },
  { text: "would", start: 19.32, end: 19.48 },
  { text: "YOU", start: 19.64, end: 19.74 },
  { text: "quit", start: 19.82, end: 19.96 },
  { text: "at", start: 20, end: 20.06 },
  { text: "level", start: 20.1, end: 20.26 },
  { text: "six?", start: 20.36, end: 20.64 },
];
