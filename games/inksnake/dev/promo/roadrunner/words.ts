/**
 * The voiceover (voice.mp3): ElevenLabs, voice "Mark – Natural Conversations"
 * on eleven_v4 (voice-take.mp3), sped up by TEMPO (pitch kept) with ffmpeg's
 * atempo so its last word ends 0.3 s before the 18 s loop point. WORDS are its
 * words with start and end times in the take: ElevenLabs Scribe ran on
 * voice.mp3 (one run, 2026-11-25; no tags were echoed), its times multiplied
 * by TEMPO, so divide by TEMPO for voice.mp3. Spelling, capitals and
 * punctuation follow the script. The edges around pauses (the first and last
 * words, "No", "Sometimes", "In") are fixed from silencedetect at -38 dB.
 *
 * The script ends mid-sentence ("Good thing") and the loop's first line
 * finishes it ("The REAL roadrunner eats rattlesnakes!").
 */
export const TEMPO = 1.0763;

export interface Word {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export const WORDS: readonly Word[] = [
  { text: 'The', start: 0.075, end: 0.215 },
  { text: 'REAL', start: 0.431, end: 0.71 },
  { text: 'roadrunner', start: 0.775, end: 1.205 },
  { text: 'eats', start: 1.292, end: 1.485 },
  { text: 'rattlesnakes!', start: 1.636, end: 2.454 },
  { text: 'It', start: 2.863, end: 2.971 },
  { text: 'grabs', start: 3.035, end: 3.358 },
  { text: 'a', start: 3.423, end: 3.487 },
  { text: 'young', start: 3.552, end: 3.702 },
  { text: 'one', start: 3.746, end: 3.875 },
  { text: 'by', start: 3.939, end: 4.047 },
  { text: 'the', start: 4.09, end: 4.176 },
  { text: 'head…', start: 4.241, end: 4.488 },
  { text: 'and', start: 4.757, end: 4.865 },
  { text: 'SLAMS', start: 5.102, end: 5.489 },
  { text: 'it', start: 5.532, end: 5.597 },
  { text: 'on', start: 5.64, end: 5.726 },
  { text: 'the', start: 5.747, end: 5.812 },
  { text: 'ground!', start: 5.877, end: 6.372 },
  { text: 'Too', start: 6.824, end: 6.974 },
  { text: 'long', start: 7.061, end: 7.233 },
  { text: 'to', start: 7.254, end: 7.362 },
  { text: 'swallow?', start: 7.426, end: 7.825 },
  { text: 'No', start: 8.072, end: 8.395 },
  { text: 'problem.', start: 8.481, end: 8.89 },
  { text: 'It', start: 9.235, end: 9.299 },
  { text: 'just', start: 9.342, end: 9.493 },
  { text: 'walks', start: 9.536, end: 9.773 },
  { text: 'around…', start: 9.837, end: 10.225 },
  { text: 'with', start: 10.376, end: 10.483 },
  { text: 'the', start: 10.526, end: 10.634 },
  { text: 'tail', start: 10.698, end: 10.978 },
  { text: 'hanging', start: 11.043, end: 11.301 },
  { text: 'OUT', start: 11.323, end: 11.409 },
  { text: 'of', start: 11.452, end: 11.495 },
  { text: 'its', start: 11.538, end: 11.667 },
  { text: 'mouth!', start: 11.732, end: 12.012 },
  { text: 'Sometimes', start: 12.377, end: 13.002 },
  { text: 'for', start: 13.045, end: 13.131 },
  { text: 'over', start: 13.195, end: 13.389 },
  { text: 'an', start: 13.432, end: 13.583 },
  { text: 'HOUR.', start: 13.691, end: 14.089 },
  { text: 'And', start: 14.509, end: 14.595 },
  { text: 'the', start: 14.616, end: 14.702 },
  { text: 'coyote?', start: 14.745, end: 15.208 },
  { text: 'In', start: 15.628, end: 15.779 },
  { text: 'real', start: 15.865, end: 16.015 },
  { text: 'life,', start: 16.058, end: 16.295 },
  { text: 'he\'s', start: 16.532, end: 16.726 },
  { text: 'twice', start: 16.79, end: 17.135 },
  { text: 'as', start: 17.199, end: 17.307 },
  { text: 'FAST.', start: 17.415, end: 17.834 },
  { text: 'Good', start: 18.34, end: 18.685 },
  { text: 'thing', start: 18.749, end: 19.051 },
];
