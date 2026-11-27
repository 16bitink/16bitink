import { WORDS, LOOP_S } from './words';

export { LOOP_S };

/**
 * "My rubber ducks learned to fly at 3 AM" (Dewy, the game's creator; the 3:07 am fix of Mon Oct 5). Every beat is timed to the words.
 *
 *   0.0   frame 1: ducks rising through the night sky above the sea, debug boxes, fish staring up; Dewy tired
 *   3.7   "They're decoys": Dewy proud; a shark turns from the player to a duck (debug arrow switches target)
 *   7.7   "Except…": Dewy frustrated
 *   9.1   "where the water ENDS": a duck pops through the surface and keeps rising, duck.y counts into the negatives, warnings stack
 *  10.95  "so they kept going": Dewy laughing
 *  12.4   "Up, up…": ducks leave the game window, cross the editor and fly out of the monitor past Dewy; sharks leap after them
 *  14.9   "One line of code later": Dewy tired; the editor takes the whole width and the fix types itself
 *  16.7   "stop at the surface": the preview comes back, the duck bobs on the waterline
 *  17.6   "a seagull steals one": Dewy hurt; a gull dives and carries it off
 *  19.45  "I kinda miss": Dewy moved; the fix is commented out, ghost ducks rise again (back to frame 1)
 */
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start;
}

export const DECOYS_AT = said('decoys.');
export const SWITCH_AT = DECOYS_AT + 0.1;
export const EXCEPT_AT = said('Except');
export const ENDS_AT = said('ends,') - 0.25;
export const KEPT_AT = said('so');
export const UP_AT = said('up,');
export const ESCAPE_AT = UP_AT - 0.05;
export const ONE_AT = said('One');
export const SURFACE_AT = said('surface,') - 0.2;
export const AND_AT = said('and', 2);
export const GULL_AT = said('seagull');
export const STEALS_AT = said('steals');
export const MISS_AT = said('kinda') - 0.15;
export const FLYING_AT = said('flying');

/** The period the ducks' rise repeats with: it divides the loop, so the frame-1 sky comes back unbroken. */
export const DUCK_PERIOD = 3.5;

/** Mood changes: [at, pose]. Frame 1 is tired. */
export const MOODS = [
  { at: 0, key: 'tired' },
  { at: DECOYS_AT - 0.8, key: 'proud' },
  { at: EXCEPT_AT - 0.05, key: 'frustrated' },
  { at: KEPT_AT - 0.05, key: 'laughing' },
  { at: ONE_AT - 0.1, key: 'tired' },
  { at: AND_AT - 0.1, key: 'hurt' },
  { at: MISS_AT, key: 'moved' },
] as const;

export const fadeOut = (t: number, from: number, to: number): number => Math.min(1, Math.max(0, (t - from) / (to - from)));

/** 1 while the preview fills the laptop screen (the opening and the closing seam), 0 in the split layout. */
export const fullAt = (t: number): number => 1 - fadeOut(t, DECOYS_AT - 0.5, DECOYS_AT + 0.1) + fadeOut(t, FLYING_AT - 0.4, FLYING_AT + 0.2);
