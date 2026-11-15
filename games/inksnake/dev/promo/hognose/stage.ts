import { curveAt, ramp } from '../short';
import { lowFoxAt } from './lowStage';
import { AT, CUT, RETURN, wrap } from './story';

/**
 * Where everything is at time t. Two viewpoints: from above (the arrival and
 * the bluff, board units on the Pine Barrens window of ground.ts, as in the
 * game) and low on the sand at the snake's eye level (frame 1 and every
 * death beat, screen px; lowStage.ts). The hognose's state is shared: how
 * far it has rolled belly up (its head and body), its mouth and tongue, the
 * bluff's spread neck, a peek. Pure functions of time; the end of the loop
 * runs into frame 1.
 */
export type View = 'top' | 'low';

export interface Cam {
  readonly cx: number;
  readonly cy: number;
  /** Screen px per board unit (1 in the low view). */
  readonly s: number;
}

export type FoxPose = 'walk0' | 'walk1' | 'crouch' | 'sniff' | 'startle';

export interface FoxState {
  /** The nose tip: board units from above, screen px low. */
  readonly x: number;
  readonly y: number;
  /** Radians: the heading from above (0 = right); low, the head's tilt (negative = nose down). */
  readonly heading: number;
  readonly pose: FoxPose;
  /** Low view: how far the face is screwed up at the stink (0 .. 1). */
  readonly wince: number;
}

export type Mouth = 'shut' | 'open';

export interface SnakeState {
  /** From above: the bluffing body shape's weight (the rest is the resting one). */
  readonly bluff: number;
  /** The head turned about the neck (radians) and thrust forward (board units). */
  readonly turn: number;
  readonly strike: number;
  /** Rolled over: 0 back up .. 1 belly up; the head turns with the body, but turns up first to peek. */
  readonly roll: number;
  readonly headRoll: number;
  /** Playing dead: limp (0 .. 1). */
  readonly dead: number;
  /** The neck spread flat: 0 .. 1. */
  readonly hood: number;
  readonly mouth: Mouth;
  /** The limp tongue hanging out of the gaping mouth (0 in .. 1 out), and a live flick. */
  readonly tongue: number;
  readonly flick: number;
  /** The head raised off the ground to look: 0 .. 1. */
  readonly lift: number;
}

export interface Fx {
  readonly stink: number;
  readonly hiss: number;
  readonly bangFox: number;
  readonly question: number;
  readonly dust: number;
  readonly shake: number;
}

export interface Stage {
  readonly view: View;
  readonly cam: Cam;
  readonly fox: FoxState;
  readonly snake: SnakeState;
  readonly fx: Fx;
}

/** The hognose's head in the middle of the window from above; its body lies to the right. */
export const HEAD0 = { x: 100, y: 230 } as const;
/** The hognose's body width from above, board units (the game's snakes are about this). */
export const BODY_W = 20;

/** The hognose flops belly-up as the fox comes back. */
export const FLOP_AT = RETURN + 0.4;
const LOW_CAM: Cam = { cx: 0, cy: 0, s: 1 };
const rad = (d: number): number => (d * Math.PI) / 180;

export const viewAt = (u: number): View => (u >= CUT.arrive && u < CUT.low ? 'top' : 'low');

export const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;
export const hold = (u: number, from: number, to: number, fade: number): number => ramp(u, from, from + fade) * (1 - ramp(u, to - fade, to));

// ---------------------------------------------------------------- from above: the camera and the fox

interface Key {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly v: number;
}
const k = (t: number, x: number, y: number, v: number): Key => ({ t, x, y, v });
const field = (keys: readonly Key[], u: number, f: (k: Key) => number): number => curveAt(keys.map((q) => ({ t: q.t, at: f(q), rate: 0 })), u).at;

/** Camera keys (cx, cy, px per unit) over the shot from above. */
const CAM_KEYS: readonly Key[] = [
  k(CUT.arrive, 150, 225, 6.8),
  k(AT.bluff - 0.3, 150, 225, 6.8),
  k(AT.neck + 0.1, 112, 226, 7.6),
  k(AT.notBuying - 0.2, 112, 226, 7.6),
  k(AT.notBuying + 0.8, 120, 220, 8.2),
  k(CUT.low, 120, 220, 8.2),
];

/** The fox's nose and heading (degrees) over the shot from above. */
const FOX_KEYS: readonly Key[] = [
  k(CUT.arrive, 216, 40, 128),
  k(AT.shows + 0.85, 142, 178, 124),
  k(AT.huge + 0.4, 140, 182, 124),
  k(AT.hiss + 0.0, 141, 181, 124),
  k(AT.hiss + 0.12, 152, 168, 124),
  k(AT.hiss + 0.8, 152, 168, 124),
  k(AT.notBuying - 0.1, 142, 180, 126),
  k(AT.buying + 0.3, 126, 192, 132),
  k(CUT.low, 124, 194, 132),
];

const WALK_S = 0.2;
/** Inside the shot from above (times outside it are held at its ends). */
const above = (u: number): number => Math.max(CUT.arrive, Math.min(CUT.low, u));

function topCam(u: number): Cam {
  const v = above(u);
  return { cx: field(CAM_KEYS, v, (q) => q.x), cy: field(CAM_KEYS, v, (q) => q.y), s: field(CAM_KEYS, v, (q) => q.v) };
}

function topFox(u: number): FoxState {
  const v = above(u);
  const walking = v < AT.shows + 0.85;
  const startled = v >= AT.hiss + 0.05 && v < AT.hiss + 0.8;
  const sniffing = v >= AT.notBuying + 0.2;
  const pose: FoxPose = walking ? (Math.floor(v / WALK_S) % 2 === 0 ? 'walk0' : 'walk1') : startled ? 'startle' : sniffing ? 'sniff' : 'crouch';
  return { x: field(FOX_KEYS, v, (q) => q.x), y: field(FOX_KEYS, v, (q) => q.y), heading: rad(field(FOX_KEYS, v, (q) => q.v)), pose, wince: 0 };
}

// ---------------------------------------------------------------- the hognose

/** Rolled over: belly up in frame 1, upright for the nudge, over again, righted once the coast is clear, flopped again as the fox comes back. */
export function rollAt(t: number): number {
  const u = wrap(t);
  if (u < CUT.arrive) return 1;
  const over = ramp(u, AT.rolls - 0.05, AT.rolls + 0.4);
  const nudged = ramp(u, AT.backOver + 0.1, AT.backOver + 0.42);
  const again = ramp(u, AT.rollsAgain - 0.02, AT.rollsAgain + 0.36);
  const righted = ramp(u, AT.coast - 0.05, AT.coast + 0.4);
  const flop = ramp(u, FLOP_AT, FLOP_AT + 0.38);
  if (u < AT.backOver) return over;
  if (u < AT.rollsAgain - 0.1) return 1 - nudged;
  if (u < AT.coast - 0.3) return again;
  return u < RETURN ? 1 - righted : flop;
}

/** The head turns up to peek while the body still lies belly up. */
function headRollAt(t: number): number {
  const u = wrap(t);
  const roll = rollAt(t);
  return u >= AT.peeks - 0.2 && u < RETURN ? Math.min(roll, 1 - ramp(u, AT.peeks - 0.15, AT.peeks + 0.2)) : roll;
}

/** Playing dead: limp, mouth open. */
const limpAt = (u: number): number => {
  if (u < CUT.arrive) return 1;
  if (u >= RETURN) return ramp(u, FLOP_AT, FLOP_AT + 0.4);
  return ramp(u, AT.rolls + 0.1, AT.rolls + 0.5) * (1 - ramp(u, AT.peeks - 0.15, AT.peeks + 0.1));
};

/** The limp tongue: sliding out after each roll belly up. */
function hangAt(u: number): number {
  if (u < CUT.arrive) return 1;
  if (u >= RETURN) return ramp(u, FLOP_AT + 0.25, FLOP_AT + 0.5);
  if (u >= AT.rollsAgain) return ramp(u, AT.rollsAgain + 0.3, AT.rollsAgain + 0.6);
  return ramp(u, AT.tongue - 0.1, AT.tongue + 0.35);
}

function snakeAt(t: number): SnakeState {
  const u = wrap(t);
  const limp = limpAt(u);
  const headRoll = headRollAt(t);
  const bluff = ramp(u, AT.bluff - 0.2, AT.neck + 0.1) * (1 - ramp(u, AT.notBuying + 0.2, AT.buying + 0.7));
  const hood = ramp(u, AT.neck - 0.1, AT.neck + 0.4) * (1 - ramp(u, AT.notBuying + 0.2, AT.buying + 0.7));
  // False strikes with the mouth shut: three lunges at the fox.
  const strike = Math.max(pulse(u, AT.flat + 0.55, 0.12, 0.3), pulse(u, AT.huge - 0.2, 0.12, 0.3), pulse(u, AT.hiss + 0.5, 0.12, 0.3));
  const peeking = u >= AT.peeks - 0.1 && u < RETURN;
  const lift = peeking ? hold(u, AT.peeks + 0.05, RETURN + 0.1, 0.25) : 0;
  const turn = lift * 0.12 * Math.sin((u - AT.peeks) * 3.1) + (u > AT.huge && u < AT.hiss + 1 ? 0.12 * Math.sin(u * 9) * hood : 0);
  const flickAt = (at: number): number => (u >= at && u < at + 0.3 ? Math.sin(((u - at) / 0.3) * Math.PI) : 0);
  const flick = Math.max(flickAt(AT.neck + 0.2), flickAt(AT.shows + 0.3), flickAt(AT.peeks + 0.45), flickAt(AT.coast + 0.5), flickAt(AT.clear + 0.3));
  const gaping = headRoll >= 0.5 && limp > 0.5;
  // It hisses with its mouth shut, the air rushing out through its nostrils; only playing dead opens it.
  const mouth: Mouth = gaping ? 'open' : 'shut';
  return { bluff, turn, strike, roll: rollAt(t), headRoll, dead: limp, hood, mouth, tongue: gaping ? hangAt(u) : 0, flick, lift };
}

// ---------------------------------------------------------------- the effects

function fxAt(t: number): Fx {
  const u = wrap(t);
  const roll = rollAt(t);
  const limp = limpAt(u);
  const stinking = u < CUT.arrive ? 0.75 : u >= RETURN ? 0.75 * limp : limp * (0.45 + 0.55 * ramp(u, AT.stinks - 0.05, AT.stinks + 0.3)) * (1 - ramp(u, AT.peeks - 0.2, AT.peeks + 0.1));
  const hiss = hold(u, AT.hiss - 0.15, AT.hiss + 0.55, 0.1);
  const bang = Math.max(pulse(u, AT.hiss + 0.05, 0.1, 0.65), pulse(u, AT.stinks, 0.1, 0.6), pulse(u, AT.back + 0.05, 0.1, 0.45));
  const question = hold(u, AT.notBuying + 0.3, AT.rolls + 0.2, 0.2);
  const dust = Math.max(pulse(u, AT.back - 0.1, 0.06, 0.4), pulse(u, AT.rolls + 0.25, 0.06, 0.4), pulse(u, FLOP_AT + 0.32, 0.05, 0.15));
  const shake = Math.max(pulse(u, AT.back - 0.1, 0.05, 0.3), pulse(u, AT.rolls + 0.25, 0.05, 0.28), pulse(u, FLOP_AT + 0.32, 0.05, 0.14));
  return { stink: roll > 0.9 || u < CUT.arrive ? stinking : stinking * roll, hiss, bangFox: bang, question, dust, shake };
}

export function stageAt(t: number): Stage {
  const u = wrap(t);
  const view = viewAt(u);
  return {
    view,
    cam: view === 'top' ? topCam(u) : LOW_CAM,
    fox: view === 'top' ? topFox(u) : lowFoxAt(u),
    snake: snakeAt(t),
    fx: fxAt(t),
  };
}

/** Every value the picture is drawn from at t, by name (for the loop test). */
export function stateAt(t: number): Readonly<Record<string, number | string>> {
  const s = stageAt(t);
  return {
    view: s.view, cx: s.cam.cx, cy: s.cam.cy, s: s.cam.s, fx: s.fox.x, fy: s.fox.y, fh: s.fox.heading, pose: s.fox.pose, wince: s.fox.wince,
    bluff: s.snake.bluff, turn: s.snake.turn, strike: s.snake.strike, roll: s.snake.roll, headRoll: s.snake.headRoll, dead: s.snake.dead, hood: s.snake.hood,
    mouth: s.snake.mouth, tongue: s.snake.tongue, flick: s.snake.flick, lift: s.snake.lift,
    stink: s.fx.stink, hiss: s.fx.hiss, bang: s.fx.bangFox, question: s.fx.question, dust: s.fx.dust, shake: s.fx.shake,
  };
}

