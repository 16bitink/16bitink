import { clamp01, curveAt, lerp, ramp, window01, type Key } from '../short';
import { boilAt as kitBoilAt } from '../sprites';
import { said } from './words';

/**
 * "These Rocks Are Alive", narrated: every beat as a pure function of loop
 * time, cut on the words (words.ts). The file opens on the Rockslide awake,
 * its rock-heap back and great claw filling the frame, rocks raining from the
 * roof ("These rocks are ALIVE!"), and cuts at "It's" to the same cave with
 * the sleeper: close on the heap and its half-buried claw, then pulling back
 * ("a crab the size of a HILL") to the whole cave under the mesa, the tiny
 * prospector walking in over the top. "And behind it?" pans to the opal bed at
 * the east end; "Drill slowly… one block… one more…" takes the three blocks
 * of the shaft over the bed, the noise bar jumping with each. "Its eyes OPEN!"
 * is the close-up on its eyes; "Rocks rain from the roof!" the awake giant
 * scuttling the cave, shaking rock down (the game: three every 1.3 s, landing
 * as loose rock); "You can only RUN!" the chase, which grows into frame 1
 * with the CTA, the loop's first line finishing the sentence.
 */
export const LOOP_S = 19.5;

/** Word indices in WORDS that beats are cut on. */
const W = { its: 4, hill: 13, asleep: 14, mesa: 17, and: 18, opals: 24, drill: 25, slowly: 26, block: 28, more: 30, itsEyes: 31, eyes: 32, opens: 33, rocks: 34, cant: 39, youRun: 43, run: 46 } as const;

/** The cut from frame 1's giant to the sleeper, as "It's the Rockslide…" starts. */
export const CUT_AT = said(W.its) - 0.1;
export const HILL_AT = said(W.hill);
export const MESA_AT = said(W.mesa) - 0.5;
export const AND_AT = said(W.and);
export const OPALS_AT = said(W.opals);
export const EYE_AT = said(W.itsEyes);
export const EYE_TWITCH_AT = said(W.eyes);
export const EYE_OPEN_AT = said(W.opens);
export const EYE_OPEN_S = 0.32;
/** "Rocks rain from the roof!": back in the cave, it is up. */
export const WAKE_AT = said(W.rocks) - 0.08;
/** "You can only RUN!": the chase. */
export const CHARGE_AT = said(W.youRun) - 0.04;

/** The three blocks: each on a word of "Drill slowly… one block… one more…", the bar jumping with each. */
export const BLOCKS_AT: readonly number[] = [said(W.slowly), said(W.block), said(W.more)];
export const DIG_FROM = said(W.drill) - 0.12;
/** Each block adds about what the game's drill does (0.14); the bar starts part way, as it does after the first digging. */
export const NOISE_START = 0.57;
export const NOISE_PER_BLOCK = 0.143;

/** The CTA: the last 3.0 s, gone 0.6 s before the loop point. */
export const CTA_FROM = LOOP_S - 3;
export const CTA_TO = LOOP_S - 0.6;
export const CTA_FADE_S = 0.3;

/** The hook caption: up on frame 1 through the line it says, back only after the CTA has left. */
export const HOOK_OFF_AT = said(W.its) - 0.4;
export const HOOK_OFF_S = 0.2;
export const HOOK_BACK_AT = LOOP_S - 0.55;
export const HOOK_BACK_S = 0.3;

export type Scene = 'chase' | 'cave' | 'eye' | 'rain';

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
export const boilAt = (t: number): number => kitBoilAt(wrap(t));

export function sceneAt(time: number): Scene {
  const t = wrap(time);
  if (t < CUT_AT) return 'chase';
  if (t < EYE_AT) return 'cave';
  if (t < WAKE_AT) return 'eye';
  if (t < CHARGE_AT) return 'rain';
  return 'chase';
}

/** The chase's own clock: it runs on past the loop's end into the file's first two seconds, so nothing jumps at the seam. */
export const chaseClock = (time: number): number => {
  const t = wrap(time);
  return t < CUT_AT ? t + LOOP_S : t;
};
/** The giant's clock (rain and chase share it). */
const OVERRUN = LOOP_S + CUT_AT;

// ---- the world (cave.ts has the picture): px at zoom 1 ----
export const SURFACE_Y = 330;
export const BLOCK = 120;
export const ROOF_Y = SURFACE_Y + 3 * BLOCK;
export const FLOOR_Y = 1290;
export const SHAFT_X = 900;
export const SLEEP_X = 400;
/** Screen px per drawing unit for the giant and the prospector at zoom 1. */
export const GIANT_SCALE = 2.8;
export const FIGURE_SCALE = 3.3;

export interface View {
  readonly zoom: number;
  readonly cx: number;
  readonly cy: number;
}

/** Where the world point (cx, cy) sits in the middle of the frame and the floor lands, for a zoom. */
const viewOn = (zoom: number, cx: number, floorAt: number): View => ({ zoom, cx, cy: FLOOR_Y - (floorAt - 960) / zoom });

const WIDE = viewOn(1.05, 590, 1235);
const SLEEPER = viewOn(1.6, 440, 1215);
const OPALS = viewOn(1.2, 900, 1235);

const key = (t: number, v: View, rate = 0): readonly [Key, Key, Key] => [{ t, at: v.zoom, rate: rate }, { t, at: v.cx, rate: 0 }, { t, at: v.cy, rate: 0 }];
const track = (keys: readonly (readonly [number, View, number?])[]): readonly [readonly Key[], readonly Key[], readonly Key[]] => [
  keys.map(([t, v, r]) => key(t, v, r)[0]), keys.map(([t, v]) => key(t, v)[1]), keys.map(([t, v]) => key(t, v)[2]),
];

const CAVE_TRACK = track([
  [CUT_AT, SLEEPER, -0.03], [HILL_AT - 0.2, viewOn(1.45, 440, 1215), -0.1], [MESA_AT + 0.4, WIDE, 0], [AND_AT - 0.1, WIDE, 0], [AND_AT + 0.75, OPALS, 0], [OPALS_AT + 0.5, OPALS, 0],
  [DIG_FROM + 0.1, WIDE, 0], [EYE_AT, WIDE, 0],
]);

/** The giant's x in the cave, scuttling towards the shaft as it comes. */
const GIANT_X: readonly Key[] = [
  { t: WAKE_AT, at: SLEEP_X, rate: 40 }, { t: CHARGE_AT, at: 500, rate: 30 }, { t: LOOP_S, at: 540, rate: 25 }, { t: OVERRUN, at: 570, rate: 10 },
];
const CHASE_ZOOM: readonly Key[] = [
  { t: CHARGE_AT, at: 1.1, rate: 0.2 }, { t: CHARGE_AT + 1.4, at: 1.4 }, { t: LOOP_S, at: 1.58, rate: 0.03 }, { t: OVERRUN, at: 1.63, rate: 0.02 },
];

export const giantX = (time: number): number => (sceneAt(time) === 'cave' || sceneAt(time) === 'eye' ? SLEEP_X : curveAt(GIANT_X, chaseClock(time)).at);

/** The camera: wide, close or on the giant; its focus follows the giant in the chase. */
export function cameraAt(time: number): View {
  const scene = sceneAt(time);
  const t = wrap(time);
  if (scene === 'cave') {
    const [z, x, y] = CAVE_TRACK;
    return { zoom: curveAt(z, t).at, cx: curveAt(x, t).at, cy: curveAt(y, t).at };
  }
  if (scene === 'rain') return WIDE;
  const c = chaseClock(time);
  const zoom = curveAt(CHASE_ZOOM, c).at;
  return viewOn(zoom, curveAt(GIANT_X, c).at - 40, 1335);
}

export type GiantPose = 'sleep' | 'awake';
export const giantPoseAt = (time: number): GiantPose => (sceneAt(time) === 'cave' || sceneAt(time) === 'eye' ? 'sleep' : 'awake');

/** The giant's body sway as it walks (px of its drawing, up/down), a footfall every 0.65 s. */
export const stepAt = (time: number): number => (giantPoseAt(time) === 'awake' ? Math.abs(Math.sin(chaseClock(time) * (Math.PI / 0.65))) : 0);

// ---- the noise ----
export const barAt = (time: number): number => ramp(wrap(time), DIG_FROM - 0.15, DIG_FROM + 0.15) * (1 - ramp(wrap(time), EYE_AT, EYE_AT + 0.1));
export const blockT = (at: number, t: number): number => ramp(t, at, at + 0.16);

export function noiseAt(time: number): number {
  const t = wrap(time);
  return NOISE_START + NOISE_PER_BLOCK * BLOCKS_AT.reduce((sum, at) => sum + blockT(at, t), 0);
}

export const blocksGone = (time: number): number => BLOCKS_AT.filter((at) => wrap(time) >= at).length;

/** The prospector's depth in the shaft (rows dug), dropping onto the next block as each gives; the drill's work on the block under them (0..1). */
export function digAt(time: number): { row: number; work: number } {
  const t = wrap(time);
  const row = BLOCKS_AT.reduce((sum, at) => sum + ramp(t, at + 0.02, at + 0.24), 0);
  const gone = BLOCKS_AT.filter((at) => t >= at).length;
  if (gone >= BLOCKS_AT.length) return { row, work: 0 };
  const from = gone === 0 ? DIG_FROM : BLOCKS_AT[gone - 1]! + 0.24;
  return { row, work: clamp01((t - from) / (BLOCKS_AT[gone]! - from)) };
}

/** After the last block: the drill stops, the prospector still. */
export const hushAt = (time: number): number => ramp(wrap(time), BLOCKS_AT[2]! + 0.05, BLOCKS_AT[2]! + 0.2);

/** The prospector walks in over the surface from the east as the camera pulls back, to the shaft's mouth. */
export const WALK_FROM = HILL_AT + 0.1;
export const WALK_TO = MESA_AT + 1.0;
export const walkAt = (time: number): number => ramp(wrap(time), WALK_FROM, WALK_TO);

/** The opal bed lights up as it is named, and keeps a shimmer. */
export const opalLitAt = (time: number): number => 0.18 + 0.82 * ramp(wrap(time), OPALS_AT - 0.1, OPALS_AT + 0.3);

// ---- the eye ----
/** How far open the eyes are (0..1): shut, a twitch of the lid, then up on their stalks. */
export function eyeOpenAt(time: number): number {
  const t = wrap(time);
  const twitch = 0.1 * window01(t, EYE_TWITCH_AT, EYE_TWITCH_AT + 0.2, 0.07);
  return Math.max(twitch, ramp(t, EYE_OPEN_AT, EYE_OPEN_AT + EYE_OPEN_S));
}

// ---- the rain ----
/** The roof lets go of three rocks every 1.3 s (the game's rhythm), the first as "Rocks" is said. */
export const RAIN_FIRST = said(W.rocks);
export const RAIN_EVERY = 1.3;
export const ROCK_SHAKE_S = 0.35;
export const ROCK_FALL_S = 0.62;
export const ROCK_LIE_S = 1.5;
export const ROCK_FADE_S = 0.5;
const ROCK_SIZES: readonly number[] = [124, 102, 144];
const ROCK_OFFSETS: readonly number[] = [-120, 210, 470];

export interface Rock {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly seed: number;
  readonly spin: number;
  readonly phase: 'shake' | 'fall' | 'lie';
  /** Seconds since it landed (lie) or began to shake. */
  readonly age: number;
  readonly alpha: number;
}

const hash = (n: number): number => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Every rock the roof has shaken loose by chase-clock `c`, in the air or lying. */
export function rocksAt(c: number): Rock[] {
  const out: Rock[] = [];
  const last = Math.floor((c - RAIN_FIRST) / RAIN_EVERY);
  for (let k = Math.max(0, last - 3); k <= last; k++) {
    for (let j = 0; j < ROCK_SIZES.length; j++) {
      const start = RAIN_FIRST + k * RAIN_EVERY + j * 0.22;
      const drop = start + ROCK_SHAKE_S;
      const land = drop + ROCK_FALL_S;
      const gone = land + ROCK_LIE_S + ROCK_FADE_S;
      if (c < start || c >= gone) continue;
      const seed = 6100 + k * 7 + j;
      const size = ROCK_SIZES[(j + k) % 3]! * (0.9 + 0.2 * hash(seed));
      const x = curveAt(GIANT_X, Math.max(start, WAKE_AT)).at + ROCK_OFFSETS[(j + k * 2) % 3]! + (hash(seed + 1) - 0.5) * 120;
      const spin = (hash(seed + 2) - 0.5) * 1.6;
      const ground = FLOOR_Y + 40 + 30 * hash(seed + 3) - size * 0.42;
      if (c < drop) {
        const rattle = Math.sin((c - start) * 80) * 3 * ramp(c, start, start + 0.1);
        out.push({ x: x + rattle, y: ROOF_Y + size * 0.3, size, seed, spin: 0, phase: 'shake', age: c - start, alpha: 1 });
      } else if (c < land) {
        const u = (c - drop) / ROCK_FALL_S;
        out.push({ x, y: lerp(ROOF_Y + size * 0.3, ground, u * u), size, seed, spin: spin * u, phase: 'fall', age: c - drop, alpha: 1 });
      } else {
        out.push({ x, y: ground, size, seed, spin, phase: 'lie', age: c - land, alpha: 1 - ramp(c, land + ROCK_LIE_S, land + ROCK_LIE_S + ROCK_FADE_S) });
      }
    }
  }
  return out;
}

/** Times at which a rock lands (chase clock), for the sound. */
export const landingsIn = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let k = 0; k < 20; k++) {
    for (let j = 0; j < ROCK_SIZES.length; j++) {
      const t = RAIN_FIRST + k * RAIN_EVERY + j * 0.22 + ROCK_SHAKE_S + ROCK_FALL_S;
      if (t >= from && t < to) out.push(t);
    }
  }
  return out;
};

// ---- the chase ----
const FLEE_X: readonly Key[] = [{ t: CHARGE_AT, at: 880, rate: -40 }, { t: 17.2, at: 800 }, { t: LOOP_S, at: 780, rate: 15 }, { t: OVERRUN, at: 830, rate: 30 }];
const FLEE_Y: readonly Key[] = [{ t: CHARGE_AT, at: 1330, rate: 0 }, { t: 17.2, at: 1400 }, { t: LOOP_S, at: 1405, rate: 0 }, { t: OVERRUN, at: 1408, rate: 0 }];

export interface Flee {
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
}

/** The prospector running ahead of it (screen px): jet-hopping in front of the camera, one size while the giant grows behind them. */
export function fleeAt(time: number): Flee {
  const c = chaseClock(time);
  const x = curveAt(FLEE_X, c);
  const y = curveAt(FLEE_Y, c);
  const bob = Math.sin((c - LOOP_S) * ((2 * Math.PI) / 0.65)) * 7;
  return { x: x.at, y: y.at + bob, tilt: 0.3 + Math.max(-0.2, Math.min(0.2, x.rate / 400)) };
}

/** In the rain the prospector hangs on the jet in the cave, near the shaft's mouth, turned to face it (world px). */
export function hoverAt(time: number): { x: number; y: number; tilt: number } {
  const t = wrap(time);
  return { x: SHAFT_X - 150 - 30 * ramp(t, WAKE_AT, CHARGE_AT), y: 1000 + Math.sin(t * 5) * 6, tilt: -0.12 };
}

/** The camera shake (px): a tremor while it walks, a jolt on every footfall in the chase, steady for the beat round the seam. */
export function shakeAt(time: number): { x: number; y: number } {
  const s = sceneAt(time);
  const t = wrap(time);
  if (s === 'eye') {
    const k = 1.5 + 5 * ramp(t, EYE_OPEN_AT, EYE_OPEN_AT + 0.3);
    return { x: k * Math.sin(t * 61), y: k * Math.cos(t * 47) };
  }
  if (s === 'cave') return { x: 0, y: 0 };
  const c = chaseClock(time);
  if (s === 'rain') {
    const k = 3 + 3 * ramp(c, WAKE_AT, CHARGE_AT);
    return { x: k * Math.sin(c * 57), y: k * Math.cos(c * 43) };
  }
  const steady = lerp(0.05, 1, ramp(Math.abs(c - LOOP_S), 0.04, 0.32));
  const k = steady * (5 + 6 * ramp(c, CHARGE_AT, LOOP_S));
  return { x: k * Math.sin(c * 41), y: k * Math.cos(c * 53) };
}

/** The dark dip over the cut from frame 1 to the sleeper. */
export const darkAt = (time: number): number => window01(wrap(time), CUT_AT - 0.1, CUT_AT + 0.35, 0.18);

export const ctaAt = (time: number): number => window01(wrap(time), CTA_FROM, CTA_TO, CTA_FADE_S);
export const arrowAt = (time: number): number => (wrap(time) < CTA_TO ? ramp(wrap(time), CTA_FROM + 0.15, CTA_FROM + 0.65) : 0);

export function hookAt(time: number): number {
  const t = wrap(time);
  return Math.max(1 - ramp(t, HOOK_OFF_AT, HOOK_OFF_AT + HOOK_OFF_S), ramp(t, HOOK_BACK_AT, HOOK_BACK_AT + HOOK_BACK_S));
}
