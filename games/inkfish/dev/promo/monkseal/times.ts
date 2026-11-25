import { BOIL_FPS } from '../../../src/art/textures';
import { LOOP_S, WORDS } from './words';

export { LOOP_S };

/** The loop's clocks, and when each beat's word is said. */

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_STEPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** When a word of the voiceover begins, in voice.mp3. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start;
}
export const endOf = (text: string, nth = 1): number => WORDS.filter((x) => x.text === text)[nth - 1]!.end;

export const EEL_AT = said('EEL');
export const NOSE_AT = said('nose!');
export const SCIENTISTS_AT = said('Scientists');
export const SEEN_AT = said('seen');
export const THREE_AT = said('three');
export const FOUR_AT = said('four');
export const THEY_AT = said('They');
export const CATCH_AT = said('catch');
export const PULL1_AT = said('pull…');
export const PULL2_AT = said('pull…', 2);
export const PULL3_AT = said('PULL!');
/** The eel's head pops out of the nostril. */
export const POP_AT = PULL3_AT + 0.3;
export const THE_SEAL_AT = said('The');
export const TOTALLY_AT = said('Totally');
export const FINE_AT = said('fine.');
export const SNEEZE_AT = 11.78;
export const MAYBE_AT = said('Maybe');
export const EEL2_AT = said('eel');
export const HIDING_AT = said('hiding…');
export const OR_AT = said('or', 2);
export const SWALLOWED_AT = said('swallowed,');
export const TOOK_AT = said('took');
export const WRONG_AT = said('WRONG');
export const EXIT_AT = said('exit!');
export const ONE_AT = said('One');
export const TEENAGE_AT = said('teenage');
export const TREND_AT = said('trend.');
export const BUT_AT = said('But');
export const NOBODY_AT = said('nobody');
export const WHY_AT = said('why');
