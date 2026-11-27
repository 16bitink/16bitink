import { clamp01, lerp, ramp, smooth } from '../short';
import { PHRASE_STARTS, WORDS, type Word } from './words';

/**
 * "How To Find A Hermit Crab": every beat as a pure function of loop time.
 *
 * - day (frame 1): Dewy's son searching a beach, paw over his eyes, looking far
 *   off, while a hermit crab walks along in his footprints right behind him.
 * - "Here's the trick.": the crab ducks into its shell just as he turns round.
 * - "Look for shells that WALK.": close on the sand, still shells; one stands up and walks.
 * - "Check the seaweed line…": a wave washes up and draws back, leaving its line
 *   of weed and driftwood; two crabs forage along it.
 * - "…come back after DARK.": night falls fast; the son with his torch, the beam
 *   sweeping the sand, crabs coming up out of the sand and from by the drift line.
 * - "So the last beach in my game?": Dewy rises in front of Moonlit Bay, the game's
 *   last beach; the player crab walks the strand, the plankton lighting under it.
 * - The night melts into a sunrise and back to frame 1.
 */
export const LOOP_S = 18;

/** When a word (its nth time) starts in the loop. */
export function said(text: string, nth = 0): number {
  const found = WORDS.filter((w) => w.text === text)[nth];
  if (!found) throw new Error(`No word "${text}" (${nth})`);
  return found.start;
}

export const AT = {
  /** The crab freezes and pops into its shell; the son turns round just after. */
  hide: 4.08,
  turn: 4.3,
  turnBack: 5.05,
  /** Close on the sand. */
  close: 5.3,
  /** The shell stands up on its legs (on "WALK"). */
  stand: said('WALK.') - 0.12,
  /** The shore: a wave washes up the sand and draws back. */
  shore: 7.12,
  waveIn: 7.25,
  waveTop: said('line') + 0.05,
  waveOut: said('behind…') + 0.1,
  /** Back to the wide beach before night falls. */
  wide: said('and') - 0.3,
  /** Night falls. */
  dusk: said('and') + 0.05,
  night: said('DARK.') + 0.25,
  /** The torch clicks on. */
  torch: said('DARK.') + 0.3,
  /** The game's last beach, and Dewy. */
  game: said('So') - 0.3,
  dewyIn: said('So') - 0.25,
  dewyOut: said('beach,') + 0.1,
  /** Sunrise, and back to frame 1. */
  dawn: said('plankton.') + 0.05,
  dayBack: said('plankton.') + 0.25,
} as const;

/** Crossfade lengths between shots. */
const CUT_S = 0.28;

export type ShotId = 'day' | 'close' | 'wrack' | 'shore' | 'game';

/** Which shot is under, which fades in over it, and how far (u 0..1). */
export interface Shots {
  readonly under: ShotId;
  readonly over: ShotId | null;
  readonly u: number;
}

export function shotsAt(t: number): Shots {
  const fade = (under: ShotId, over: ShotId, at: number, len = CUT_S): Shots => ({ under, over, u: smooth((t - at) / len) });
  if (t < AT.close) return { under: 'day', over: null, u: 0 };
  if (t < AT.close + CUT_S) return fade('day', 'close', AT.close);
  if (t < AT.shore) return { under: 'close', over: null, u: 0 };
  if (t < AT.shore + CUT_S) return fade('close', 'wrack', AT.shore);
  if (t < AT.wide) return { under: 'wrack', over: null, u: 0 };
  if (t < AT.wide + CUT_S) return fade('wrack', 'shore', AT.wide);
  if (t < AT.game) return { under: 'shore', over: null, u: 0 };
  if (t < AT.game + 0.36) return fade('shore', 'game', AT.game, 0.36);
  if (t < AT.dayBack) return { under: 'game', over: null, u: 0 };
  return fade('game', 'day', AT.dayBack, LOOP_S - AT.dayBack);
}

/** The day shot's own clock: the end of the loop runs on into its start. */
export const dayClock = (t: number): number => (t > LOOP_S / 2 ? t - LOOP_S : t);

// ---------------------------------------------------------------- frame 1: the son and the crab behind him

/** The sand line the son and the crab walk along in the day shot. */
export const DAY_GROUND = 1570;
export const SON_H = 940;
const SON_X0 = 640;
const SON_V = 14;
const STEP_S = 0.6;

export interface SonState {
  readonly x: number;
  readonly y: number;
  readonly lift: number;
  readonly tilt: number;
  /** 0 looking off to the right (as drawn), 1 turned round to look back at the crab. */
  readonly turned: number;
}

export function daySon(t: number): SonState {
  const c = dayClock(t);
  // He stops to turn round, then walks on.
  const stopped = Math.min(ramp(c, AT.hide - 0.2, AT.hide), 1 - ramp(c, AT.turnBack, AT.turnBack + 0.25));
  const [p0, p1] = [AT.hide - 0.1, AT.turnBack + 0.12];
  const walkT = c - Math.max(0, Math.min(c, p1) - p0);
  const walking = 1 - stopped;
  const phase = (walkT / STEP_S) * Math.PI;
  return {
    x: SON_X0 + SON_V * walkT,
    y: DAY_GROUND,
    lift: 14 * Math.abs(Math.sin(phase)) * walking + 10 * Math.sin(Math.PI * clamp01((c - AT.turn) / 0.22)),
    tilt: 0.03 * Math.sin(phase) * walking,
    turned: Math.min(ramp(c, AT.turn, AT.turn + 0.14), 1 - ramp(c, AT.turnBack, AT.turnBack + 0.14)),
  };
}

export interface CrabState {
  readonly x: number;
  readonly y: number;
  /** 1 walking with its legs out, 0 tucked into its shell. */
  readonly out: number;
  /** 1 faces right. */
  readonly facing: 1 | -1;
  /** Shell lift and rock while stepping. */
  readonly bob: number;
}

/** The crab in his footprints: a step behind him, stopping dead and tucking in as he turns. */
export function dayCrab(t: number): CrabState {
  const c = dayClock(t);
  const freeze = ramp(c, AT.hide - 0.06, AT.hide + 0.06);
  const moving = 1 - Math.min(1, freeze);
  const x0 = SON_X0 - 430;
  const walkT = Math.min(c, AT.hide);
  return {
    x: x0 + 22 * walkT,
    y: DAY_GROUND - 10,
    out: 1 - freeze,
    facing: 1,
    bob: 3 * Math.abs(Math.sin(c * 9)) * moving,
  };
}

/** The son's footprints in the sand behind him, oldest first. */
export const FOOTPRINTS: readonly { readonly x: number; readonly y: number }[] = Array.from({ length: 9 }, (_, i) => ({
  x: -40 + i * 74,
  y: DAY_GROUND - 6 + (i % 2 === 0 ? -14 : 12),
}));

// ---------------------------------------------------------------- close on the sand: shells that walk

/** Close on the sand: the walker's ground line and drawing scale (its shell ~340 px across). */
export const CLOSE_GROUND = 1060;
export const CLOSE_SCALE = 3.2;
/** Where the close shot's sharp sand starts. */
export const CLOSE_SAND_TOP = 780;

export interface StillShell {
  readonly kind: 'snail' | 'nerite' | 'topshell' | 'moonsnail' | 'whelk';
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
}

/** Still shells round the walker, nearer ones lower and bigger. */
export const CLOSE_SHELLS: readonly StillShell[] = [
  { kind: 'topshell', x: 860, y: 900, scale: 2.1, facing: 1, tilt: -0.08 },
  { kind: 'moonsnail', x: 170, y: 1250, scale: 3.0, facing: -1, tilt: 0.05 },
  { kind: 'nerite', x: 900, y: 1330, scale: 3.3, facing: -1, tilt: 0.12 },
];

/** The shell that walks: still at first, then up on its legs on "WALK", off to the right. */
export function walker(t: number): CrabState {
  const up = ramp(t, AT.stand, AT.stand + 0.22);
  const go = Math.max(0, t - (AT.stand + 0.25));
  return {
    x: 360 + 240 * go,
    y: CLOSE_GROUND - 40 * up,
    out: up,
    facing: 1,
    bob: up * 5 * Math.abs(Math.sin(go * 10)),
  };
}

// ---------------------------------------------------------------- the shore: the wave, the seaweed line, then night

/** Where the sea meets the sand, and how far up the sand the wave runs (the high-water mark). */
export const SHORE_Y = 1050;
export const WRACK_Y = 1330;

/** The wrack line on screen: where the wave turned, wavering across the sand. */
export const wrackY = (x: number): number => WRACK_Y + 9 * Math.sin(x / 120) + 4 * Math.sin(x / 37 + 1);

/** How far down the sand the water reaches (screen y of its front), and how much water is still on the sand. */
export function waveAt(t: number, top: number = SHORE_Y, line: number = WRACK_Y): { readonly front: number; readonly water: number } {
  const inU = smooth((t - AT.waveIn) / (AT.waveTop - AT.waveIn));
  const outU = smooth((t - AT.waveTop - 0.05) / (AT.waveOut - AT.waveTop));
  const front = lerp(top - 20, line + 8, inU * (1 - outU));
  return { front, water: inU * (1 - 0.7 * outU) * (1 - ramp(t, AT.waveOut, AT.waveOut + 0.4)) };
}

/** The low close view of the seaweed line: where the sea meets the sand, and the line, big across the frame. */
export const WRACK_CLOSE = { sea: 790, line: 1150, k: 2.4, crab: 2.5 } as const;
export const wrackCloseY = (x: number): number => WRACK_CLOSE.line + 20 * Math.sin(x / 170) + 8 * Math.sin(x / 53 + 1);

/** The two foragers in the close view: in from either side along the line, ~270 px shells. */
export function foragersClose(t: number): readonly CrabState[] {
  // In as the water draws back off the sand.
  const u = Math.max(0, t - (AT.waveTop - 0.1));
  const a = -170 + Math.min(470, 480 * u);
  const b = 1250 - Math.min(450, 440 * Math.max(0, u - 0.1));
  return [
    { x: a, y: wrackCloseY(a) + 24, out: 1, facing: 1, bob: 6 * Math.abs(Math.sin(u * 9)) },
    { x: b, y: wrackCloseY(b) + 24, out: 1, facing: -1, bob: 6 * Math.abs(Math.sin(u * 8 + 1)) },
  ];
}

/** The line of weed the wave left: hidden under the wave till it turns, there for good after. */
export const wrackShown = (t: number): number => (t < AT.close ? 0 : ramp(t, AT.waveTop - 0.05, AT.waveTop + 0.35));

/** 0 day, 1 night. */
export const darknessAt = (t: number): number => ramp(t, AT.dusk, AT.night);

/** Two crabs foraging along the line: in from either side, picking at it. */
export function foragers(t: number): readonly CrabState[] {
  const u = Math.max(0, t - (AT.waveTop + 0.25));
  const a = -80 + Math.min(230, 260 * u);
  const b = 1160 - Math.min(380, 240 * Math.max(0, u - 0.2));
  return [
    { x: a, y: wrackY(a) + 16, out: 1, facing: 1, bob: 4 * Math.abs(Math.sin(u * 9)) },
    { x: b, y: wrackY(b) + 16, out: 1, facing: -1, bob: 4 * Math.abs(Math.sin(u * 8 + 1)) },
  ];
}

/** The son with his torch, at the right: in as the torch clicks on. */
export const TORCH_SON = { x: 830, y: 1600, h: 840 } as const;
export const torchSonIn = (t: number): number => ramp(t, AT.torch - 0.25, AT.torch + 0.15);

/** The beam's pool of light on the sand: where it points at time t (it sweeps right to left and back). */
export function beamAt(t: number): { readonly x: number; readonly y: number; readonly on: number } {
  const keys: readonly (readonly [number, number, number])[] = [
    [AT.torch, 640, 1520],
    [said('Most'), 450, 1520],
    [said('crabs', 1), 390, 1370],
    [said('night.'), 170, 1490],
    [AT.game + 0.4, 300, 1460],
  ];
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1]![0]) i++;
  const [t0, x0, y0] = keys[i]!;
  const [t1, x1, y1] = keys[i + 1]!;
  const u = smooth((t - t0) / (t1 - t0));
  const on = ramp(t, AT.torch, AT.torch + 0.08);
  return { x: lerp(x0, x1, u), y: lerp(y0, y1, u), on };
}

/** Crabs coming out in the light: up out of the sand, or out from the drift line. */
export interface Emerger {
  readonly x: number;
  readonly y: number;
  readonly at: number;
  readonly from: 'sand' | 'drift';
  readonly facing: 1 | -1;
  readonly walk: number;
}

export const EMERGERS: readonly Emerger[] = [
  { x: 450, y: 1520, at: said('Most') - 0.05, from: 'sand', facing: -1, walk: -50 },
  { x: 390, y: wrackY(390) + 22, at: said('crabs', 1) - 0.1, from: 'drift', facing: 1, walk: 50 },
  { x: 170, y: 1490, at: said('night.') - 0.1, from: 'sand', facing: 1, walk: 60 },
];

/** How far out of the sand (0 buried, 1 up) and how far it has walked since. */
export function emergeAt(e: Emerger, t: number): { readonly up: number; readonly dx: number } {
  const up = ramp(t, e.at, e.at + 0.4);
  return { up, dx: e.walk * Math.max(0, t - e.at - 0.45) };
}

// ---------------------------------------------------------------- the game: Moonlit Bay

/** The terrain's surface on screen, the game's tile on screen. */
export const GAME_SURFACE = 1030;
export const GAME_TILE = 48;

/** Dewy: up from the bottom edge before he speaks of his game, down again after "A night beach". */
export const DEWY = { x: 770, y: 1900, width: 650 } as const;

export function dewySlide(t: number): number {
  const rise = 1 - easeOutBack(clamp01((t - AT.dewyIn) / 0.45));
  const drop = smooth((t - AT.dewyOut) / 0.4);
  return Math.max(rise, drop);
}

function easeOutBack(u: number): number {
  const c = 1.45;
  const v = u - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
}

/** The warm light of sunrise washing over the night beach just before frame 1 comes back. */
export const sunriseAt = (t: number): number => Math.min(ramp(t, AT.dawn, AT.dayBack + 0.2), 1 - ramp(t, LOOP_S - 0.25, LOOP_S));

// ---------------------------------------------------------------- captions

export const CAPTION_Y = 430;
export const CAPTION_SIZE = 92;

/** The credit: the game and its short link, under the captions, 40% of the way in, gone before the loop point. */
export const CREDIT = { text: 'InkCrab · 16bit.ink/crab', inAt: 0.4, y: CAPTION_Y + 96, size: 46 } as const;

export interface Spoken {
  readonly words: readonly string[];
  readonly current: number;
  readonly alpha: number;
}

const PHRASES: readonly (readonly Word[])[] = PHRASE_STARTS.map((s, i) => WORDS.slice(s, PHRASE_STARTS[i + 1] ?? WORDS.length));
export const PHRASE_LIST = PHRASES;
const LEAD_S = 0.12;

/** The phrase on screen at t, its word being said (-1 before the first), faded in and out at the loop's ends. */
export function spokenAt(t: number): Spoken {
  const lead = (p: readonly Word[]): number => p[0]!.start - LEAD_S;
  // The first phrase comes up just before the loop point, so the seam carries it.
  const wrapAt = LOOP_S - 0.17;
  const tt = t >= wrapAt ? t - LOOP_S : t;
  let k = 0;
  for (let i = 0; i < PHRASES.length; i++) if (tt >= lead(PHRASES[i]!)) k = i;
  const phrase = PHRASES[k]!;
  let current = -1;
  phrase.forEach((w, i) => {
    if (tt >= w.start - 0.02) current = i;
  });
  const alpha = k === PHRASES.length - 1 ? 1 - ramp(t, wrapAt - 0.15, wrapAt) : tt < 0 ? ramp(tt, -0.17, -0.07) : 1;
  return { words: phrase.map((w) => w.text), current, alpha };
}
