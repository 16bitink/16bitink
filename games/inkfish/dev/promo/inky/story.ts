import { BOIL_FPS } from '../../../src/art/textures';
import { ramp } from '../short';
import { LOOP_S, WORDS } from './words';

export { LOOP_S };

/**
 * "This octopus broke out of an aquarium": Inky, a common New Zealand octopus
 * at the National Aquarium of New Zealand in Napier (2016). The lid was left
 * slightly open after maintenance; overnight he climbed out, crossed the
 * floor and went down a drain about 150 mm (6 in) wide that runs to the sea.
 * Told by a narrator (words.ts), every beat timed to the words.
 *
 *   0     "This octopus broke OUT of an aquarium!" (excited): the octopus
 *         halfway over the rim of its tank, huge, looking at us
 *   2.3   "New Zealand, 2016." (mischievous): the islands at night, a light
 *         at Napier; then the dark hall, the one glowing tank
 *   4.4   "The lid was left open… just a crack.": the gap, the eye under it;
 *         an arm tip feels its way out
 *   7.2   "Inky squeezed out," (dramatic): the whole body oozing flat through
 *         the gap; 8.5 "crossed the floor…": seen from a security camera
 *   9.6   "and found a drain, SIX inches wide.": beside a ruler, pouring
 *         itself down it, an eye last
 *  12.1   "And that pipe led to the OCEAN!" (surprised): sliding down the
 *         pipe; a burst out into bright blue sea
 *  14.5   "Next morning: an empty tank… and a trail." (chuckles): the keeper
 *  17.5   "The manager said he didn't even leave a MESSAGE!" (sarcastic): a
 *         blank note on the glass, a shrug
 *  20.1   "Inky was never seen again, after" (softly): a silhouette swimming
 *         off into the blue, an arm waving; an arm sweeps the lens → frame 1
 */

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** The line boil steps at the game's 8 a second: 180 steps, 60 whole cycles a loop. */
export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** When a word of the voiceover begins (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`"${text}" (#${nth}) isn't in the voiceover`);
  return w.start;
}

export const OUT_AT = said('OUT');
export const AQUARIUM_AT = said('aquarium!');
export const NEW_AT = said('New');
export const YEAR_AT = said('2016.');
export const LID_AT = said('The');
export const OPEN_AT = said('open…');
export const JUST_AT = said('just');
export const CRACK_AT = said('crack.');
export const INKY_AT = said('Inky');
export const SQUEEZED_AT = said('squeezed');
export const CROSSED_AT = said('crossed');
export const FLOOR_AT = said('floor…');
export const FOUND_AT = said('and');
export const DRAIN_AT = said('drain,');
export const SIX_AT = said('SIX');
export const WIDE_AT = said('wide.');
export const PIPE_AT = said('And');
export const OCEAN_AT = said('OCEAN!');
export const NEXT_AT = said('Next');
export const EMPTY_AT = said('empty');
export const TANK_AT = said('tank…');
export const TRAIL_AT = said('trail.');
export const MANAGER_AT = said('The', 2);
export const LEAVE_AT = said('leave');
export const MESSAGE_AT = said('MESSAGE!');
export const INKY2_AT = said('Inky', 2);
export const NEVER_AT = said('never');
export const AGAIN_AT = said('again,');
export const AFTER_AT = said('after');

/** Whole cycles a loop, as a phase in radians: for wiggles that must be where they were at the seam. */
export const cycles = (n: number, t: number): number => (2 * Math.PI * n * t) / LOOP_S;

// ---------------------------------------------------------------- the cuts

export type Scene = 'hook' | 'map' | 'hall' | 'lid' | 'squeeze' | 'floor' | 'drain' | 'pipe' | 'ocean' | 'morning' | 'message' | 'deep';

export const CUTS: readonly { readonly at: number; readonly scene: Scene }[] = [
  { at: 0, scene: 'hook' },
  { at: NEW_AT - 0.1, scene: 'map' },
  { at: YEAR_AT - 0.06, scene: 'hall' },
  { at: LID_AT - 0.1, scene: 'lid' },
  { at: INKY_AT - 0.08, scene: 'squeeze' },
  { at: CROSSED_AT - 0.08, scene: 'floor' },
  { at: FOUND_AT - 0.08, scene: 'drain' },
  { at: PIPE_AT - 0.08, scene: 'pipe' },
  { at: OCEAN_AT - 0.04, scene: 'ocean' },
  { at: NEXT_AT - 0.34, scene: 'morning' },
  { at: MANAGER_AT - 0.1, scene: 'message' },
  { at: INKY2_AT - 0.12, scene: 'deep' },
];

/** The closing wipe: an arm sweeps over the lens; under it the hook comes back. */
export const WIPE_FROM = AFTER_AT - 0.22;
/** When the arm covers the whole frame: the picture changes behind it. */
export const WIPE_MID = 22.02;
export const WIPE_TO = 22.46;
/** 0 the arm is off one side .. 0.5 covers the frame .. 1 off the other. */
export const wipeAt = (t: number): number => {
  const u = wrap(t);
  if (u < WIPE_FROM || u >= WIPE_TO) return 0;
  return u < WIPE_MID ? (0.5 * (u - WIPE_FROM)) / (WIPE_MID - WIPE_FROM) : 0.5 + (0.5 * (u - WIPE_MID)) / (WIPE_TO - WIPE_MID);
};

/** The scene on screen at t, and when it began (the hook, uncovered by the wipe, is the last). */
export function sceneAt(t: number): { readonly scene: Scene; readonly from: number; readonly to: number } {
  const u = wrap(t);
  if (u >= WIPE_MID) return { scene: 'hook', from: WIPE_MID, to: LOOP_S };
  let i = 0;
  while (i < CUTS.length - 1 && u >= CUTS[i + 1]!.at) i++;
  return { scene: CUTS[i]!.scene, from: CUTS[i]!.at, to: i + 1 < CUTS.length ? CUTS[i + 1]!.at : WIPE_MID };
}

/** The hook's own clock: video time in the hook, negative (up to 0) as the loop comes back round to it. */
export function hookClock(t: number): number {
  const u = wrap(t);
  return u >= WIPE_MID - 1 ? u - LOOP_S : u;
}

/** White flashes on the big moments (0..1), fading fast. */
export function flashAt(t: number): number {
  const u = wrap(t);
  const s = u - (OCEAN_AT - 0.04);
  return s < 0 || s > 0.24 ? 0 : 0.8 * (1 - s / 0.24) ** 2;
}

const JOLTS = [{ at: OUT_AT + 0.02, amp: 12 }, { at: SQUEEZED_AT + 0.34, amp: 8 }, { at: SIX_AT + 0.02, amp: 9 }, { at: OCEAN_AT, amp: 20 }, { at: MESSAGE_AT, amp: 8 }] as const;

/** Jolts of the picture, px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  return JOLTS.reduce((acc, j) => {
    const s = u - j.at;
    if (s < 0 || s > 0.35) return acc;
    const amp = j.amp * (1 - s / 0.35) ** 2;
    return { x: acc.x + amp * Math.sin(s * 120), y: acc.y + amp * 0.7 * Math.cos(s * 150) };
  }, { x: 0, y: 0 });
}

/** A quick zoom punch into each new scene (1 = none). */
export function punchAt(t: number): number {
  const { scene, from } = sceneAt(t);
  if (scene === 'hook') return 1;
  return 1 + 0.045 * (1 - ramp(wrap(t) - from, 0, 0.35));
}
