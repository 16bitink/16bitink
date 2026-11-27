/**
 * The voiceover (voice.mp3): ElevenLabs, voice Dewy (9D6rPdtdqSwuo8ntjS2C,
 * eleven_v4), take t1 (voice-take.mp3: tighter pauses than t2, the same
 * energy) with 0.075 s of its lead-in trimmed, then sped up by TEMPO (pitch
 * kept) with ffmpeg's atempo: the last word's end (18.85 s in the take,
 * silencedetect) ÷ (18 − 0.3). WORDS are its words with start and end times
 * in voice.mp3 (already sped up), from ElevenLabs Scribe (one run, the
 * [laughs] tag not echoed: the laugh sits between "home." and "And"); the
 * first word's start and the last word's end come from silencedetect.
 * Spelling and emphasis follow the script, so `inVoice` is the identity here.
 *
 * The script ends mid-sentence so the loop's first line finishes it:
 * "…And it all started because / my son loves two things."
 */
export const TEMPO = 1.0607;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A time in voice.mp3, in the loop (the voice starts with it). */
export const inVoice = (voiceSeconds: number): number => voiceSeconds;

export const WORDS: readonly Word[] = [
  { text: 'My', start: 0.06, end: 0.32 },
  { text: 'son', start: 0.4, end: 0.64 },
  { text: 'loves', start: 0.86, end: 1.2 },
  { text: 'two', start: 1.32, end: 1.5 },
  { text: 'things.', start: 1.62, end: 1.98 },
  { text: 'Hermit', start: 2.38, end: 2.62 },
  { text: 'crabs…', start: 2.68, end: 3.12 },
  { text: 'and', start: 3.36, end: 3.6 },
  { text: 'digging', start: 3.68, end: 3.96 },
  { text: 'for', start: 4.02, end: 4.16 },
  { text: 'TREASURE!', start: 4.22, end: 4.72 },
  { text: 'So', start: 5.24, end: 5.46 },
  { text: "what's", start: 5.62, end: 5.92 },
  { text: 'treasure', start: 6, end: 6.32 },
  { text: 'to', start: 6.36, end: 6.46 },
  { text: 'a', start: 6.52, end: 6.56 },
  { text: 'hermit', start: 6.62, end: 6.84 },
  { text: 'crab?', start: 6.9, end: 7.2 },
  { text: 'A', start: 7.54, end: 7.6 },
  { text: 'BIGGER', start: 7.8, end: 8.06 },
  { text: 'shell!', start: 8.22, end: 8.58 },
  { text: 'It', start: 8.88, end: 8.96 },
  { text: "can't", start: 9.02, end: 9.2 },
  { text: 'grow', start: 9.24, end: 9.38 },
  { text: 'its', start: 9.42, end: 9.56 },
  { text: 'own…', start: 9.62, end: 9.86 },
  { text: 'so', start: 10.16, end: 10.4 },
  { text: 'it', start: 10.46, end: 10.52 },
  { text: 'has', start: 10.58, end: 10.7 },
  { text: 'to', start: 10.74, end: 10.84 },
  { text: 'FIND', start: 10.92, end: 11.16 },
  { text: 'one.', start: 11.22, end: 11.38 },
  { text: 'So', start: 11.78, end: 11.92 },
  { text: 'I', start: 12.04, end: 12.08 },
  { text: 'built', start: 12.14, end: 12.3 },
  { text: 'him', start: 12.32, end: 12.4 },
  { text: 'a', start: 12.44, end: 12.5 },
  { text: 'game', start: 12.56, end: 12.8 },
  { text: 'where', start: 12.84, end: 13.04 },
  { text: "you're", start: 13.14, end: 13.3 },
  { text: 'the', start: 13.34, end: 13.42 },
  { text: 'crab…', start: 13.46, end: 13.84 },
  { text: 'digging', start: 14.22, end: 14.54 },
  { text: 'for', start: 14.58, end: 14.68 },
  { text: 'your', start: 14.72, end: 14.82 },
  { text: 'next', start: 14.88, end: 15.12 },
  { text: 'home.', start: 15.16, end: 15.48 },
  { text: 'And', start: 16.22, end: 16.3 },
  { text: 'it', start: 16.34, end: 16.46 },
  { text: 'all', start: 16.54, end: 16.72 },
  { text: 'started', start: 16.8, end: 17.14 },
  { text: 'because…', start: 17.2, end: 17.7 },
];

/** Where the [laughs] tag sounds in voice.mp3 (between "home." and "And", silencedetect). */
export const LAUGH = { start: 15.7, end: 16.16 } as const;

/** Words per caption line, phrase by phrase. */
export const LINE_WORDS = [5, 2, 4, 3, 4, 3, 5, 6, 6, 4, 5, 5] as const;
