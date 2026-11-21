import type { Pt } from '../../../src/art/pen';
import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { turn } from '../heroncrab/art/ink';
import { BILL_TIP, GAPE_MAX, HEAD_SCALE, HINGE, headToWorld, type HeronHead, type HeronPose, NECK_BASE } from './art/heron';
import type { RatPose } from './art/rat';
import { inVoice, WORDS, type Word } from './words';

/**
 * "This bird swallowed a New York rat whole", narrated: every beat a pure
 * function of time, timed from the voice's words (words.ts). From Manhattan
 * Bird Alert's video of 5 September 2021: at a Central Park pond a great
 * blue heron lifted a large rat out of the water, dunked it, and swallowed it
 * whole in seconds, head first and tail last, while onlookers cheered; the
 * poster said he had never seen one eat a rat before.
 *
 * The hook (frame 1) is the gulp itself, close up: the bill raised, the rat
 * going in head first, its long tail hanging out, the park's trees and
 * Midtown's towers soft behind. The story rewinds to the pond, comes back to
 * the same close-up for "down it goes", and the last ink wash lands on it.
 */
export const LOOP_S = 18;

/** When a word of the voiceover begins in the loop (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`The script has no "${text}" (${nth})`);
  return inVoice(w.start);
}

export const AT = {
  rat: said('RAT…'),
  whole: said('whole!'),
  hookOut: said('Central') - 0.3,
  heron: said('heron'),
  strike: said('snatches'),
  lift: said('rat'),
  pond: said('pond…'),
  dunk: said('dunks'),
  up: said('it…'),
  close: said('and'),
  toss: said('down'),
  head: said('Head'),
  tail: said('tail'),
  last: said('LAST.'),
  crowd: said('People') - 0.25,
  cheer: said('CHEERED!'),
  birder: said('Even') - 0.2,
  never: said('never'),
  wash: LOOP_S - 0.6,
} as const;

export interface Cam {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** Where the rat is and how it is drawn; `clip` hides what is inside the heron or under the water. */
export interface RatPlace {
  readonly at: Pt;
  readonly angle: number;
  readonly k: number;
  readonly facing: number;
  readonly pose: Omit<RatPose, 'down'>;
  readonly clip: 'gape' | 'water' | 'none';
}

const head = (x: number, y: number, a: number, gape = 0, throat = 0): HeronHead => ({ x, y, a, gape, throat });
const alive = (t: number, wet: number, taut = 0, paddle = 0.8): Omit<RatPose, 'down'> => ({ kick: t * 13, paddle, wet, taut, swish: t * 6 });
/** The rat's size against the heron's head (rat units per head unit). */
export const RAT_K = 0.95;
/** Where a crosswise rat is gripped, in the head's frame. */
const GRIP: Pt = { x: BILL_TIP - 26, y: 10 };

/** The rat held crosswise in the bill, snout to the left, wriggling. */
function heldRat(heron: HeronPose, t: number, wet: number, clip: RatPlace['clip']): RatPlace {
  return {
    at: headToWorld(heron, GRIP), angle: Math.PI - 0.12 + 0.12 * Math.sin(t * 7), k: RAT_K * HEAD_SCALE * heron.k, facing: -1, pose: alive(t, wet), clip,
  };
}

/** Head position (body units) that puts the bill tip on a world point at bill angle `a`. */
function headReaching(body: Omit<HeronPose, 'head'>, tip: Pt, a: number): Pt {
  const reach = (BILL_TIP - 10) * HEAD_SCALE;
  const local = { x: (tip.x - body.x) / body.k, y: (tip.y - body.y) / body.k };
  return { x: local.x - Math.cos(a) * reach, y: local.y - Math.sin(a) * reach };
}

// ---------------------------------------------------------------- the pond (wide)

export const WATER_Y = 1120;
const POND_BODY = { x: 300, y: 1190, k: 1.5, face: 1, lean: 0, kink: 0.9, lump: { at: 0, size: 0 }, legs: true, step: 0, walk: 0 } as const;

/** The swimming rat's middle, world px, paddling in towards the heron. */
export const swimAt = (t: number): Pt => ({ x: lerp(1060, 560, ramp(t, AT.hookOut, AT.strike)), y: WATER_Y + 8 + 3 * Math.sin(t * 5) });

export function pondHeron(t: number): HeronPose {
  const lean = 0.45 * window01(t, AT.strike - 0.25, AT.lift + 0.15, 0.2) + 0.45 * window01(t, AT.dunk - 0.1, AT.up + 0.1, 0.12) - 0.3;
  const body = { ...POND_BODY, lean };
  // Hunting: the neck drawn back in an S, the bill on the water; coiled tighter just before the strike.
  const watch = head(118, -468, 0.42);
  const coil = head(98, -452, 0.62);
  const lifted = head(150, -478, 0.42, 0.1);
  const strikeU = ramp(t, AT.strike - 0.04, AT.strike + 0.1);
  const out = headReaching(body, swimAt(AT.strike), 0.95);
  const dunkOut = headReaching(body, { x: swimAt(AT.strike).x + 10, y: WATER_Y + 40 }, 1);
  const coilU = ramp(t, AT.heron, AT.strike - 0.05);
  const liftU = ramp(t, AT.lift - 0.1, AT.lift + 0.35);
  const dunkU = window01(t, AT.dunk - 0.05, AT.up + 0.05, 0.12);
  let x = lerp(lerp(watch.x, coil.x, coilU), out.x, strikeU);
  let y = lerp(lerp(watch.y, coil.y, coilU), out.y, strikeU);
  let a = lerp(lerp(watch.a, coil.a, coilU), 0.95, strikeU);
  x = lerp(x, lifted.x, liftU);
  y = lerp(y, lifted.y, liftU);
  a = lerp(a, lifted.a, liftU);
  x = lerp(x, dunkOut.x, dunkU);
  y = lerp(y, dunkOut.y, dunkU);
  a = lerp(a, 1, dunkU);
  const kink = lerp(0.9, 0.25, Math.max(strikeU * (1 - liftU), dunkU));
  return { ...body, kink, head: head(x, y, a + 0.03 * Math.sin(t * 9) * liftU, 0.12 * liftU) };
}

export function pondRat(t: number, heron: HeronPose): RatPlace {
  if (t < AT.strike + 0.08) return { at: swimAt(t), angle: Math.PI, k: RAT_K * HEAD_SCALE * POND_BODY.k, facing: -1, pose: alive(t, 1, 0, 0.6), clip: 'water' };
  return heldRat(heron, t, 1, 'water');
}

const pondKeys = (pick: (c: Cam) => number): readonly Key[] => ([
  [AT.hookOut, { x: 540, y: 960, zoom: 1 }],
  [AT.heron - 0.3, { x: 540, y: 960, zoom: 1.02 }],
  [AT.strike - 0.1, { x: 480, y: 1040, zoom: 1.38 }],
  [AT.pond, { x: 480, y: 860, zoom: 1.45 }],
  [AT.dunk + 0.1, { x: 500, y: 1010, zoom: 1.42 }],
  [AT.close, { x: 500, y: 900, zoom: 1.5 }],
] as const).map(([t, c]) => ({ t, at: pick(c), rate: 0 }));
const [PX, PY, PZ] = [pondKeys((c) => c.x), pondKeys((c) => c.y), pondKeys((c) => c.zoom)];
export const pondCam = (t: number): Cam => ({ x: curveAt(PX, t).at, y: curveAt(PY, t).at, zoom: curveAt(PZ, t).at });

// ---------------------------------------------------------------- the gulp (close-up, and the hook)

const CLOSE_K = 7.4;
const NECK_AT: Pt = { x: -60, y: 1950 };
const CLOSE_BODY = {
  x: NECK_AT.x - NECK_BASE.x * CLOSE_K, y: NECK_AT.y - NECK_BASE.y * CLOSE_K, k: CLOSE_K, face: 1, lean: 0, kink: 0.15, legs: false, step: 0, walk: 0,
} as const;
/** Where the head sits on screen with the bill raised, and the bill's angle. */
const UP_HEAD: Pt = { x: 300, y: 870 };
export const UP_A = -0.98;
const LOW_HEAD: Pt = { x: 300, y: 900 };
const LOW_A = -0.3;
/** How far the rat's snout has gone in past the gape, rat lengths in head units (it is gone past ~360). */
export const GONE_D = 372;

/** How deep the rat is, by time: the hook holds it head-in, the payoff takes it all. */
export function depthAt(t: number): number {
  if (t < AT.close) return 24 + 2 * Math.max(-0.6, t) + 7 * ramp(t, AT.rat, AT.rat + 0.15) + 9 * ramp(t, AT.whole, AT.whole + 0.15);
  const keys: readonly Key[] = [
    { t: AT.toss + 0.3, at: -20, rate: 0 }, { t: AT.head - 0.1, at: 30 }, { t: AT.head + 0.5, at: 80 },
    { t: AT.tail, at: 175 }, { t: AT.last + 0.35, at: GONE_D, rate: 0 },
  ];
  return curveAt(keys, t).at;
}

/** The lump going down the neck: where (0 head .. 1 body) and how big. */
export function lumpAt(t: number, d = depthAt(t)): { readonly at: number; readonly size: number } {
  if (t < AT.close) return { at: 0.05, size: clamp01((d - 20) / 30) * 0.5 };
  const swallowed = clamp01((d - 20) / 160);
  const later = ramp(t, AT.last + 0.3, AT.wash);
  return { at: 0.05 + 0.35 * swallowed + 0.5 * later, size: Math.min(swallowed * 1.4, 1) * (1 - 0.3 * later) };
}

export function closeHeron(t: number): HeronPose {
  const d = depthAt(t);
  const tossU = t < AT.close ? 1 : ramp(t, AT.toss - 0.05, AT.toss + 0.3);
  const doneU = ramp(t, AT.last + 0.35, AT.last + 0.8);
  // Gulps: a jerk of the head on each big word.
  const jerk = [AT.rat, AT.whole, AT.toss, AT.head, AT.tail, AT.last].reduce((s, at) => s + 0.07 * window01(t, at, at + 0.35, 0.08) * Math.sin((t - at) * 18), 0);
  const a = lerp(LOW_A, UP_A, tossU) + jerk + 0.25 * doneU;
  const at = { x: lerp(LOW_HEAD.x, UP_HEAD.x, tossU), y: lerp(LOW_HEAD.y, UP_HEAD.y, tossU) - 30 * jerk };
  // The bill gapes wide round the body, less round the tail, shut once it's gone.
  const fat = window01(d, -60, 190, 30);
  const gape = (t < AT.close || tossU > 0.5 ? 0.25 + 0.6 * fat + 0.15 * clamp01((d - 190) / 60) * (d < 300 ? 1 : 0) : 0.3) * (1 - doneU);
  const b = CLOSE_BODY;
  // The throat swells round the rat's head and shoulders, and empties as it goes on down.
  const throat = (t < AT.close || tossU > 0.5 ? clamp01((d + 10) / 50) : 0) * (1 - clamp01((d - 200) / 120));
  return { ...b, lump: lumpAt(t, d), head: head((at.x - b.x) / b.k, (at.y - b.y) / b.k, a, gape, throat) };
}

/** The rat's nose and the line down its middle, in its own units (where it sits in the gape). */
const RAT_NOSE: Pt = { x: 104, y: -6 };

/**
 * The rat in the open bill, snout first, `d` in past the hinge: its axis on the
 * line halfway between the mandibles, its back under the upper mandible and its
 * belly over the lower one; whatever has gone past the hinge is down the throat.
 */
function swallowRat(heron: HeronPose, t: number, d: number, wet: number): RatPlace {
  const half = (GAPE_MAX * heron.head.gape) / 2;
  const angle = half + Math.PI;
  const toHead = (q: Pt): Pt => turn({ x: q.x * RAT_K, y: -q.y * RAT_K }, { x: 0, y: 0 }, angle);
  const nose = { x: HINGE.x + Math.cos(half) * (10 - d), y: HINGE.y - 2 + Math.sin(half) * (10 - d) };
  const off = toHead(RAT_NOSE);
  const origin = { x: nose.x - off.x, y: nose.y - off.y };
  // The tail keeps hanging down; it only straightens a little as it's pulled in.
  const taut = 0.35 * ramp(d, 150, 260);
  return {
    at: headToWorld(heron, origin), angle: heron.head.a + angle, k: RAT_K * HEAD_SCALE * heron.k, facing: -1,
    pose: { ...alive(t, wet, taut, 0.9 * (1 - clamp01((d - 120) / 60))), swish: t * 7 }, clip: 'gape',
  };
}

export function closeRat(t: number, heron: HeronPose): RatPlace | null {
  const d = depthAt(t);
  if (d >= GONE_D - 1) return null;
  const wet = 1 - 0.3 * ramp(t, AT.close, AT.last);
  if (t < AT.close) return swallowRat(heron, t, d, 0.8);
  const tossU = ramp(t, AT.toss - 0.05, AT.toss + 0.3);
  const along = swallowRat(heron, t, d, wet);
  if (tossU >= 1) return along;
  const held = heldRat(heron, t, wet, 'none');
  return { ...along, at: { x: lerp(held.at.x, along.at.x, tossU), y: lerp(held.at.y, along.at.y, tossU) }, angle: lerp(held.angle, along.angle, tossU), clip: tossU < 0.5 ? 'none' : 'gape' };
}

export const closeCam = (t: number): Cam => ({ x: 540, y: 960, zoom: 1 + 0.01 * (t + 0.6) });

// ---------------------------------------------------------------- the crowd and the birder

/** The heron after: upright on the far bank, the lump going down, a satisfied little shake. */
export function afterHeron(t: number, x: number, y: number, k: number): HeronPose {
  const lump = lumpAt(t);
  const a = -0.25 + 0.05 * Math.sin(t * 3);
  return { x, y, k, face: 1, lean: -0.3, kink: 0.6, lump, legs: true, step: 0, walk: 0, head: head(112 + 4 * Math.sin(t * 3), -500, a, 0) };
}

export interface Crowd {
  readonly x: number;
  readonly k: number;
  readonly cap: boolean;
  readonly tone: string;
  readonly delay: number;
}
export const CROWD: readonly Crowd[] = [
  { x: 640, k: 0.6, cap: true, tone: '#2c3140', delay: 0.05 },
  { x: 830, k: 0.66, cap: false, tone: '#353342', delay: 0 },
  { x: 1010, k: 0.62, cap: false, tone: '#2b2f38', delay: 0.12 },
];
export const CROWD_FEET = 1540;
/** Arms up on "CHEERED!". */
export const cheerAt = (t: number, delay: number): number => ramp(t, AT.cheer - 0.15 + delay, AT.cheer + 0.15 + delay) * (1 - 0.15 * Math.sin(t * 14) ** 2);
export const crowdCam = (t: number): Cam => ({ x: 540, y: 960, zoom: 1 + 0.03 * ramp(t, AT.crowd, AT.birder) });

/** The birder's phone screen, and the birder in profile beside it. */
export const PHONE = { x: 70, y: 600, w: 640, h: 380 } as const;
export const BIRDER = { x: 1000, y: 2320, k: 1.32 } as const;
export const birderShout = (t: number): number => ramp(t, AT.never - 0.1, AT.never + 0.2);
export const recAt = (t: number): number => (Math.floor(t * 2) % 2 === 0 ? 1 : 0);
export const birderCam = (t: number): Cam => ({ x: 540, y: 960, zoom: 1 + 0.025 * ramp(t, AT.birder, AT.wash) });

// ---------------------------------------------------------------- shots and washes

export type ShotId = 'hook' | 'pond' | 'gulp' | 'crowd' | 'birder';

export interface Shot {
  readonly id: ShotId;
  readonly at: number;
}

export interface FrameState {
  readonly under: Shot;
  readonly over: Shot | null;
  readonly u: number;
  readonly how: 'wash' | 'fade';
}

const still = (id: ShotId, at: number): FrameState => ({ under: { id, at }, over: null, u: 0, how: 'wash' });
const WASH_S = 0.3;
const CUT_S = 0.1;
const CUTS: readonly (readonly [number, ShotId, ShotId])[] = [[AT.close, 'pond', 'gulp'], [AT.crowd, 'gulp', 'crowd'], [AT.birder, 'crowd', 'birder']];

export function shotsAt(t: number): FrameState {
  if (t < AT.hookOut) return still('hook', t);
  if (t < AT.hookOut + WASH_S) return { under: { id: 'hook', at: t }, over: { id: 'pond', at: t }, u: (t - AT.hookOut) / WASH_S, how: 'wash' };
  if (t >= AT.wash) {
    const u = (t - AT.wash) / (LOOP_S - AT.wash);
    // A clean dissolve into frame 1.
    return u >= 1 ? still('hook', t - LOOP_S) : { under: { id: 'birder', at: t }, over: { id: 'hook', at: t - LOOP_S }, u, how: 'fade' };
  }
  let id: ShotId = 'pond';
  for (const [at, from, to] of CUTS) {
    if (t >= at && t < at + CUT_S) return { under: { id: from, at: t }, over: { id: to, at: t }, u: (t - at) / CUT_S, how: 'fade' };
    if (t >= at) id = to;
  }
  return still(id, t);
}

// ---------------------------------------------------------------- words

export interface SpokenRow {
  readonly words: readonly string[];
  readonly current: number;
  readonly y: number;
  readonly size: number;
  readonly unsaid: number;
}

const LINE_WORDS = [3, 5, 3, 4, 3, 3, 2, 4, 2, 2, 3, 3, 3, 3, 2, 1] as const;
const HOOK_LINES = 2;
export const HOOK_ROWS = [{ y: 1104, size: 122 }, { y: 1232, size: 122 }] as const;
/** Low under the pond and the close-up; high over the crowd and the birder. */
export const ROW_LOW = { y: 1230, size: 124 } as const;
export const ROW_HIGH = { y: 420, size: 124 } as const;

export const LINES: readonly (readonly Word[])[] = LINE_WORDS.reduce<{ at: number; lines: (readonly Word[])[] }>(
  (acc, n) => ({ at: acc.at + n, lines: [...acc.lines, WORDS.slice(acc.at, acc.at + n)] }),
  { at: 0, lines: [] },
).lines;

const startOf = (line: readonly Word[]): number => inVoice(line[0]!.start);
const currentIn = (line: readonly Word[], t: number): number => line.reduce((c, w, i) => (t >= inVoice(w.start) ? i : c), -1);
const texts = (line: readonly Word[]): readonly string[] => line.map((w) => w.text);

export function spokenAt(time: number): readonly SpokenRow[] {
  const t = time >= LOOP_S ? time - LOOP_S : time;
  if (t < startOf(LINES[HOOK_LINES]!)) {
    const second = currentIn(LINES[1]!, t) >= 0;
    return LINES.slice(0, HOOK_LINES).map((line, i) => ({
      words: texts(line), current: i === 0 ? (second ? line.length : Math.max(0, currentIn(line, t))) : currentIn(line, t), unsaid: 1, ...HOOK_ROWS[i]!,
    }));
  }
  const line = [...LINES].reverse().find((l) => t >= startOf(l))!;
  const row = t >= AT.crowd + CUT_S / 2 ? ROW_HIGH : ROW_LOW;
  return [{ words: texts(line), current: currentIn(line, t), unsaid: 0.55, ...row }];
}

// ---------------------------------------------------------------- everything at once

export interface Poses {
  readonly heron: HeronPose;
  readonly rat: RatPlace | null;
  readonly cam: Cam;
}

export function posesOf(shot: Shot): Poses {
  const t = shot.at;
  if (shot.id === 'hook' || shot.id === 'gulp') {
    const heron = closeHeron(t);
    return { heron, rat: closeRat(t, heron), cam: closeCam(t) };
  }
  if (shot.id === 'pond') {
    const heron = pondHeron(t);
    return { heron, rat: pondRat(t, heron), cam: pondCam(t) };
  }
  if (shot.id === 'crowd') return { heron: afterHeron(t, 250, 1190, 1.25), rat: null, cam: crowdCam(t) };
  return { heron: afterHeron(t, 330, 1190, 1.4), rat: null, cam: birderCam(t) };
}

/** Everything on screen at time t, as data: t = 0 and t = LOOP_S must match exactly. */
export function stateAt(t: number): { readonly shots: FrameState; readonly poses: Poses; readonly spoken: readonly SpokenRow[] } {
  const shots = shotsAt(t);
  const top = shots.over && shots.u >= 0.5 ? shots.over : shots.under;
  return { shots, poses: posesOf(top), spoken: spokenAt(t) };
}

/** A point of the bill in world px (for tests and splashes): `u` 0 root .. 1 tip. */
export const billPoint = (p: HeronPose, u: number): Pt => headToWorld(p, turn({ x: 22 + u * (BILL_TIP - 22), y: 4 }, { x: 0, y: 0 }, 0));
