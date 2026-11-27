/**
 * Mouth shapes and blinks for Dewy, a pure function of time (port of apps/web/scripts/duo/lipsync.py).
 *
 *   A closed (M B P)   B barely open   C half open (E, I, L, TH)   D wide (A)   E "oh"   F "oo" (W)
 * The shape comes from the spelling of the word being said (Scribe timings); the voice loudness
 * (per 30 fps frame, 0..1, from envelope.py) decides when the mouth shuts and how wide it opens.
 * Shapes lead the sound by one frame, none is held for a single frame (a lone shut frame lasts two),
 * and blinks come every 2.4-5.4 s while the mouth is shut.
 */

export interface SpeechWord {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}
export type MouthKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type EyeKey = 'half' | 'blink';
export const LIPSYNC_FPS = 30;

const UNITS = /ough|augh|tion|oo|ou|ow|oa|oi|oy|ew|ee|ea|ei|ie|ai|ay|au|aw|ar|er|ir|or|ur|th|sh|ch|ph|wh|ck|ng|qu|[a-z]/g;
const SHAPES: ReadonlyArray<readonly [MouthKey, ReadonlySet<string>]> = [
  ['A', new Set(['m', 'b', 'p'])],
  ['D', new Set(['a', 'ai', 'ay', 'ar', 'augh'])],
  ['E', new Set(['o', 'oa', 'or', 'oi', 'oy', 'ou', 'ow', 'ough', 'au', 'aw'])],
  ['F', new Set(['oo', 'ew', 'w', 'wh', 'qu'])],
  ['C', new Set(['e', 'ee', 'ea', 'ei', 'ie', 'i', 'y', 'u', 'er', 'ir', 'ur', 'l', 'th', 'tion'])],
];
const NOT_VOWELS = new Set(['l', 'th', 'w', 'wh', 'qu']);
const SILENT = 0.15; // level below which the mouth shuts
const LOUD = 0.8; // level above which it opens wider
const IN_WORD_SILENT = 0.06; // inside a word only real silence shuts it
const LEAD = 0.035; // mouths move a frame before the sound
const BLINK_SEQ: readonly EyeKey[] = ['half', 'blink', 'blink', 'half'];
const SMOOTH_WARMUP = 4; // frames re-run before t so the one-frame smoothing matches a whole-track pass

const isVowel = (u: string): boolean => SHAPES.some(([k, set]) => k !== 'A' && set.has(u)) && !NOT_VOWELS.has(u);

function shapeOf(unit: string): MouthKey {
  for (const [key, set] of SHAPES) if (set.has(unit)) return key;
  return 'B';
}

/** The word as (shape, weight) pieces: vowels take twice as long as consonants. */
export function wordUnits(text: string): ReadonlyArray<readonly [MouthKey, number]> {
  let word = text.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length > 2 && word.endsWith('e') && !'aeiou'.includes(word.charAt(word.length - 2))) word = word.slice(0, -1);
  const units = word.match(UNITS) ?? ['a'];
  return units.map((u) => [shapeOf(u), isVowel(u) ? 2 : 1] as const);
}

function shapeAt(word: SpeechWord, t: number): MouthKey {
  const units = wordUnits(word.text);
  const total = units.reduce((s, [, w]) => s + w, 0);
  let pos = ((t - word.start) / Math.max(1e-3, word.end - word.start)) * total;
  for (const [key, weight] of units) {
    pos -= weight;
    if (pos < 0) return key;
  }
  return units[units.length - 1]?.[0] ?? 'B';
}

function byLevel(key: MouthKey, level: number, silent: number): MouthKey {
  if (level < silent) return 'A';
  if (key === 'D' && level < 0.5) return 'C';
  if ((key === 'B' || key === 'C') && level > LOUD) return key === 'B' ? 'C' : 'D';
  return key;
}

function rawShape(words: readonly SpeechWord[], envelope: readonly number[], frame: number): MouthKey {
  const level = envelope[frame] ?? 0;
  const t = frame / LIPSYNC_FPS + LEAD;
  const word = words.find((w) => w.start <= t && t < w.end);
  const key: MouthKey = word ? shapeAt(word, t) : level > 0.35 ? 'B' : 'A';
  return byLevel(key, level, word ? IN_WORD_SILENT : SILENT);
}

/** The mouth shape at time t (seconds). 'A' while nobody is speaking. */
export function mouthAt(words: readonly SpeechWord[], envelope: readonly number[], t: number): MouthKey {
  const frame = Math.max(0, Math.floor(t * LIPSYNC_FPS));
  const first = Math.max(0, frame - SMOOTH_WARMUP);
  const keys: MouthKey[] = [];
  for (let i = first; i <= frame + 1; i++) keys.push(rawShape(words, envelope, i));
  // smooth(): no shape held for a single frame, except a lone shut frame is stretched to two
  for (let i = 1; i < keys.length - 1; i++) {
    if (keys[i] === keys[i - 1] || keys[i] === keys[i + 1]) continue;
    if (keys[i] === 'A') keys[i + 1] = 'A';
    else keys[i] = keys[i - 1] ?? 'A';
  }
  return keys[frame - first] ?? 'A';
}

/** The blink frame showing at time t, or null. `seed` varies the rhythm (default 0). */
export function blinkAt(t: number, seed = 0): EyeKey | null {
  const frame = Math.floor(t * LIPSYNC_FPS);
  let at = 1.2 + (seed % 1.7);
  for (let k = 1; ; k++) {
    const start = Math.round(at * LIPSYNC_FPS);
    if (frame < start) return null;
    if (frame < start + BLINK_SEQ.length) return BLINK_SEQ[frame - start] ?? null;
    at += 2.4 + (((seed * 7919 + k * 104729) % 1000) / 1000) * 3.0;
  }
}

/** What the face shows at t: the mouth shape, and an eye frame when the mouth is shut and a blink is due. */
export function faceAt(words: readonly SpeechWord[], envelope: readonly number[], t: number, seed = 0): { readonly mouth: MouthKey; readonly eyes: EyeKey | null } {
  const mouth = mouthAt(words, envelope, t);
  return { mouth, eyes: mouth === 'A' ? blinkAt(t, seed) : null };
}
