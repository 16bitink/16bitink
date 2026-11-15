import { BOIL_FPS } from '../../../src/art/textures';
import { clamp01, lerp, ramp, window01 } from '../short';
import { add, type Camera, lookAt, place, type Rig, scale, turnBy, v3, type V3 } from './geo';
import { BILL_L, onJaw, POSE0, type Pose, rigsOf, type Rigs, type Spine, THROAT_Z, tongueAt } from './model';
import { type Light } from './paint';
import { LOOP_S, TEMPO, WORDS } from './words';

/**
 * "Never look inside a penguin's mouth!", beat by beat, every value a pure
 * function of loop time (render.ts draws it). One mood a sentence:
 *
 * 1. hook (horror): frame 1 is the title, a gentoo's head big on a dark
 *    ground, its bill wide open towards us, the mouth full of pale spines.
 * 2. cute (sunny): "So cute, right? Fluffy… waddling…" it waddles over the
 *    ice, tilts its head, fluffs up.
 * 3. open (suspense): "then it opens up…" the light drains, we push in on
 *    its head as the bill slowly opens.
 * 4. spikes (shock): "and it's full of SPIKES!" right into the open bill,
 *    rows of spines on the tongue and the palate, a punch-in and a red flash.
 * 5. noteeth (deadpan): "Not teeth. Penguins don't have any." the bill side
 *    on, a glint running along its smooth edges, then it shuts it, smug.
 * 6. nails (curious): "Spines, made like your fingernails," one spine big,
 *    pale keratin ridged like a nail, a sheen across it.
 * 7. throat (eerie): "ALL pointing down the throat…" deeper in, a light runs
 *    down every spine towards the dark throat.
 * 8. fish (mischief): "so a slippery fish only goes ONE way." a silver fish
 *    slides in head first, tries to back out, the spines hold it, gulp.
 * 9. trust (cheeky): "So, trust me:" the cute face again, a blink, and the
 *    bill snaps open into frame 1.
 */

export { LOOP_S };

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** When the nth `text` is said, in voice.mp3 (loop) seconds. */
export function said(text: string, nth = 1): number {
  const hits = WORDS.filter((w) => w.text === text);
  const w = hits[nth - 1];
  if (!w) throw new Error(`no word "${text}" #${nth}`);
  return w.start / TEMPO;
}
const endOf = (text: string, nth = 1): number => WORDS.filter((w) => w.text === text)[nth - 1]!.end / TEMPO;

export const AT = {
  never: said('NEVER'),
  mouth: said('mouth!'),
  so: said('So'),
  cute: said('cute,'),
  right: said('right?'),
  fluffy: said('Fluffy…'),
  waddling: said('waddling…'),
  then: said('then'),
  opens: said('opens'),
  up: said('up…'),
  upEnd: endOf('up…'),
  and: said('and'),
  full: said('full'),
  spikes: said('SPIKES!'),
  not: said('Not'),
  teeth: said('teeth.'),
  penguins: said('Penguins'),
  have: said('have'),
  any: said('any.'),
  spines: said('Spines,'),
  made: said('made'),
  fingernails: said('fingernails,'),
  all: said('ALL'),
  pointing: said('pointing'),
  down: said('down'),
  throat: said('throat…'),
  throatEnd: endOf('throat…'),
  so2: said('so'),
  slippery: said('slippery'),
  fish: said('fish'),
  only: said('only'),
  goes: said('goes'),
  one: said('ONE'),
  way: said('way.'),
  wayEnd: endOf('way.'),
  so3: said('So,'),
  trust: said('trust'),
  me: said('me:'),
} as const;

// ---------------------------------------------------------------- scenes

export type SceneName = 'hook' | 'cute' | 'open' | 'spikes' | 'noteeth' | 'nails' | 'throat' | 'fish' | 'trust';

/** Each scene's first moment (hard cuts, a little before the word that calls for it). */
export const CUTS: readonly { readonly name: SceneName; readonly from: number }[] = [
  { name: 'hook', from: 0 },
  { name: 'cute', from: AT.so - 0.12 },
  { name: 'open', from: AT.then - 0.1 },
  { name: 'spikes', from: AT.and - 0.08 },
  { name: 'noteeth', from: AT.not - 0.1 },
  { name: 'nails', from: AT.spines - 0.12 },
  { name: 'throat', from: AT.all - 0.1 },
  { name: 'fish', from: AT.so2 - 0.12 },
  { name: 'trust', from: AT.so3 - 0.12 },
];

export interface Scene {
  readonly name: SceneName;
  /** Loop seconds. */
  readonly u: number;
  /** Seconds since the scene's cut. */
  readonly s: number;
}

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  let i = 0;
  while (i + 1 < CUTS.length && u >= CUTS[i + 1]!.from) i++;
  return { name: CUTS[i]!.name, u, s: u - CUTS[i]!.from };
}
export const sceneFrom = (name: SceneName): number => CUTS.find((c) => c.name === name)!.from;
export const sceneTo = (name: SceneName): number => {
  const i = CUTS.findIndex((c) => c.name === name);
  return i + 1 < CUTS.length ? CUTS[i + 1]!.from : LOOP_S;
};

// ---------------------------------------------------------------- lights

const DUSK: Light = {
  dir: v3(-0.5, 0.72, 0.48), key: [0.98, 0.88, 0.8], amb: [0.13, 0.16, 0.23], sky: [0.16, 0.2, 0.28], flash: 0.55, deep: 0.86, rim: [0.5, 0.66, 0.95],
};
/** The head shots: the dusk, with a soft key from in front so the black head shows its feathers. */
const FACE: Light = {
  dir: v3(0.25, 0.62, 0.74), key: [0.95, 0.9, 0.86], amb: [0.2, 0.23, 0.3], sky: [0.2, 0.24, 0.32], flash: 0.5, deep: 0.86, rim: [0.45, 0.6, 0.9],
};
const DAY: Light = {
  dir: v3(-0.55, 0.75, 0.38), key: [1.02, 0.98, 0.9], amb: [0.3, 0.34, 0.42], sky: [0.34, 0.4, 0.52], flash: 0.15, deep: 0.8, rim: [0.4, 0.46, 0.58],
};
const RED: Light = {
  dir: v3(-0.4, 0.7, 0.6), key: [1.05, 0.82, 0.76], amb: [0.2, 0.07, 0.09], sky: [0.16, 0.06, 0.08], flash: 0.75, deep: 0.9, rim: [0.95, 0.35, 0.3],
};
const COOL: Light = {
  dir: v3(-0.5, 0.8, 0.35), key: [0.92, 0.95, 1.0], amb: [0.26, 0.29, 0.36], sky: [0.3, 0.34, 0.42], flash: 0.35, deep: 0.85, rim: [0.45, 0.55, 0.7],
};

const mix3 = (a: readonly [number, number, number], b: readonly [number, number, number], u: number): [number, number, number] =>
  [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
export function mixLight(a: Light, b: Light, u: number): Light {
  if (u <= 0) return a;
  if (u >= 1) return b;
  return {
    dir: v3(lerp(a.dir.x, b.dir.x, u), lerp(a.dir.y, b.dir.y, u), lerp(a.dir.z, b.dir.z, u)),
    key: mix3(a.key, b.key, u), amb: mix3(a.amb, b.amb, u), sky: mix3(a.sky, b.sky, u),
    flash: lerp(a.flash, b.flash, u), deep: lerp(a.deep, b.deep, u), rim: mix3(a.rim ?? [0, 0, 0], b.rim ?? [0, 0, 0], u),
  };
}

// ---------------------------------------------------------------- the penguin and the camera each beat

/** A camera at `dir` (bill frame) `dist` cm from a bill-frame point, looking at it. */
export interface Shot {
  readonly at: V3;
  readonly dir: V3;
  readonly dist: number;
  readonly focal: number;
  readonly cx: number;
  readonly cy: number;
  readonly roll: number;
  /** Which frame `at` and `dir` are in: the bill's (close on the mouth) or the body's (head and shoulders). */
  readonly frame?: 'bill' | 'body';
}

export function shotCamera(rigs: Rigs, shot: Shot, frame: Rig = shot.frame === 'body' ? rigs.body : rigs.bill): Camera {
  const target = place(frame, shot.at);
  const d = turnBy(frame, shot.dir);
  const l = Math.hypot(d.x, d.y, d.z) || 1;
  return lookAt(add(target, scale(d, shot.dist / l)), target, shot.focal, shot.cx, shot.cy, shot.roll);
}

const mixShot = (a: Shot, b: Shot, u: number): Shot => ({
  at: v3(lerp(a.at.x, b.at.x, u), lerp(a.at.y, b.at.y, u), lerp(a.at.z, b.at.z, u)),
  dir: v3(lerp(a.dir.x, b.dir.x, u), lerp(a.dir.y, b.dir.y, u), lerp(a.dir.z, b.dir.z, u)),
  dist: lerp(a.dist, b.dist, u), focal: lerp(a.focal, b.focal, u), cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), roll: lerp(a.roll, b.roll, u),
  frame: a.frame,
});

/** Frame 1: the head big, the bill wide open towards us, a little from its right and above. */
export const HOOK_SHOT: Shot = { at: v3(0, 59.5, 8.5), dir: v3(0.45, 0.95, 1), dist: 21, focal: 1380, cx: 540, cy: 810, roll: 0, frame: 'body' };
/** Side on (the smooth edges: no teeth). */
const SIDE_SHOT: Shot = { at: v3(0, 0.6, 0.4), dir: v3(1, 0.2, 0.3), dist: 30, focal: 1500, cx: 470, cy: 860, roll: 0 };
/** Above and to the side, to watch the fish go in. */
const FISH_SHOT: Shot = { at: v3(0, 59.5, 8.5), dir: v3(0.5, 1.05, 1), dist: 22, focal: 1380, cx: 540, cy: 810, roll: 0, frame: 'body' };
/** The cute face, bill shut. */
const FACE_SHOT: Shot = { at: v3(0, 57.5, 6), dir: v3(0.45, 0.6, 1), dist: 24, focal: 1380, cx: 540, cy: 840, roll: 0, frame: 'body' };

/**
 * A camera inside the open bill, `lift` cm over the middle of the tongue at
 * bill-frame z `z`, looking down the tongue to the throat: a road of spines
 * under a ceiling of spines, the throat dark ahead.
 */
export function tunnelCamera(rigs: Rigs, z: number, lift: number, focal: number, cy = 900): Camera {
  const eye = onJaw(rigs.lower, add(tongueAt(Math.min(z, 4.4), 0), v3(0, lift, Math.max(0, z - 4.4))));
  const at = onJaw(rigs.lower, add(tongueAt(THROAT_Z + 0.2, 0), v3(0, lift * 0.55, -1.2)));
  return lookAt(eye, at, focal, 540, cy);
}

/** What a frame shows: the penguin's pose, the camera, the light, and the backdrop's mood. */
export interface View {
  readonly scene: Scene;
  readonly pose: Pose;
  readonly rigs: Rigs;
  readonly cam: Camera;
  readonly light: Light;
  /** Backdrop: 0 bright ice .. 1 dark. */
  readonly dark: number;
  /** A red wash over everything (the shock), 0 .. 1. */
  readonly red: number;
}

/** The hook's pose: head up a little, bill wide, breathing (12 breaths a loop, so it loops). */
export function hookPose(t: number): Pose {
  const u = wrap(t);
  const breath = Math.sin((2 * Math.PI * u) / 1.5);
  return { ...POSE0, headPitch: -0.3 + 0.015 * breath, headYaw: 0.04 * Math.sin((2 * Math.PI * u) / 4.5), open: 1.07 + 0.025 * breath, flap: 0.2 };
}

function hookShot(t: number): Shot {
  const u = wrap(t);
  // A slow push in through the line, held from the loop point.
  const k = ramp(u, 0, AT.so);
  return { ...HOOK_SHOT, dist: lerp(HOOK_SHOT.dist, HOOK_SHOT.dist - 1.2, k) };
}

/** The waddle: each step rocks the body onto the other foot. */
export function waddleAt(t: number, speed: number): { readonly roll: number; readonly bob: number; readonly stepL: number; readonly stepR: number; readonly yaw: number } {
  const ph = 2 * Math.PI * t * 1.7;
  return {
    roll: 0.11 * speed * Math.sin(ph),
    bob: 0.9 * speed * Math.abs(Math.sin(ph)),
    stepL: speed * Math.max(0, Math.sin(ph)),
    stepR: speed * Math.max(0, -Math.sin(ph)),
    yaw: 0.05 * speed * Math.sin(ph + 0.6),
  };
}

function cuteView(u: number): { pose: Pose; cam: Camera; rigs: Rigs } {
  const s = u - sceneFrom('cute');
  const speed = 0.55 + 0.45 * ramp(u, AT.waddling - 0.3, AT.waddling + 0.2);
  const w = waddleAt(s, speed);
  const fluff = window01(u, AT.fluffy - 0.15, AT.waddling - 0.05, 0.2);
  const shiver = fluff * 0.05 * Math.sin(s * 42);
  const tilt = window01(u, AT.cute - 0.1, AT.fluffy, 0.25);
  const pose: Pose = {
    ...POSE0,
    at: v3(-6 + 6 * s, 0, 10 * s - 15),
    yaw: 0.35 + w.yaw,
    roll: w.roll + shiver,
    bob: w.bob,
    stepL: w.stepL,
    stepR: w.stepR,
    flap: 0.35 + 0.25 * speed,
    puff: fluff,
    headRoll: 0.28 * tilt + shiver * 2,
    headPitch: -0.06 * tilt,
    blink: window01(u, AT.right + 0.05, AT.right + 0.32, 0.08),
  };
  const rigs = rigsOf(pose);
  const target = add(pose.at, v3(0, 34, 0));
  const eye = add(target, v3(52 + 8 * s, 22, 108 - 6 * s));
  return { pose, cam: lookAt(eye, target, 1500, 540, 820), rigs };
}

function openView(u: number): { pose: Pose; cam: Camera; rigs: Rigs } {
  const k = ramp(u, sceneFrom('open'), AT.upEnd + 0.15);
  const pose: Pose = {
    ...POSE0,
    yaw: lerp(0.35, 0, k),
    headPitch: lerp(0, -0.3, k),
    open: 0.62 * ramp(u, AT.opens - 0.1, AT.upEnd + 0.12),
    flap: 0.3,
  };
  const rigs = rigsOf(pose);
  const far: Shot = { ...FACE_SHOT, dist: 80, at: v3(0, 47, 2) };
  const near: Shot = { ...HOOK_SHOT, dist: 23 };
  return { pose, cam: shotCamera(rigs, mixShot(far, near, k)), rigs };
}

function spikesView(u: number): { pose: Pose; cam: Camera; rigs: Rigs } {
  const pose: Pose = { ...POSE0, headPitch: -0.3, open: 1.05, flap: 0.2 };
  const rigs = rigsOf(pose);
  // From just past the tip, punched in over the tongue on "SPIKES!", then drifting on.
  const punch = ramp(u, AT.spikes - 0.14, AT.spikes + 0.08);
  const drift = ramp(u, AT.spikes, sceneTo('spikes') + 0.4);
  const z = lerp(BILL_L + 2.2, 4.3, ramp(u, sceneFrom('spikes'), AT.full)) - 1.0 * punch - 0.5 * drift;
  return { pose, cam: tunnelCamera(rigs, z, lerp(1.5, 1.25, punch), 900 + 120 * punch), rigs };
}

/** The bill shut on "have", smug. */
function noTeethView(u: number): { pose: Pose; cam: Camera; rigs: Rigs } {
  const shut = ramp(u, AT.have - 0.15, AT.have + 0.12);
  const pose: Pose = {
    ...POSE0, headPitch: -0.12 - 0.12 * shut, open: 0.8 * (1 - shut), flap: 0.2, headRoll: -0.12 * shut,
    blink: window01(u, AT.any - 0.05, AT.any + 0.3, 0.08),
  };
  const rigs = rigsOf(pose);
  const drift = ramp(u, sceneFrom('noteeth'), sceneTo('noteeth'));
  return { pose, cam: shotCamera(rigs, { ...SIDE_SHOT, dist: lerp(23, 21.5, drift) }), rigs };
}

function throatView(u: number): { pose: Pose; cam: Camera; rigs: Rigs } {
  const pose: Pose = { ...POSE0, headPitch: -0.3, open: 1.08, flap: 0.2 };
  const rigs = rigsOf(pose);
  const k = ramp(u, sceneFrom('throat'), sceneTo('throat') + 0.3);
  return { pose, cam: tunnelCamera(rigs, lerp(3.4, 1.4, k), lerp(1.3, 1.0, k), 950), rigs };
}

function fishView(u: number): { pose: Pose; cam: Camera; rigs: Rigs } {
  const gulp = window01(u, AT.way - 0.05, AT.wayEnd + 0.15, 0.12);
  const pose: Pose = { ...POSE0, headPitch: -0.3 - 0.1 * gulp, open: 1.05 * (1 - 0.75 * ramp(u, AT.way + 0.05, AT.wayEnd + 0.1)), flap: 0.2 };
  const rigs = rigsOf(pose);
  return { pose, cam: shotCamera(rigs, { ...FISH_SHOT, dist: FISH_SHOT.dist - 0.8 * ramp(u, sceneFrom('fish'), sceneTo('fish')) }), rigs };
}

/** "So, trust me:" the cute face, a blink, then the bill snaps open into the hook. */
function trustView(u: number): { pose: Pose; cam: Camera; rigs: Rigs } {
  const toHook = ramp(u, LOOP_S - 0.55, LOOP_S - 0.04);
  const h = hookPose(LOOP_S);
  const tilt = window01(u, sceneFrom('trust'), LOOP_S - 0.45, 0.25);
  const cute: Pose = { ...POSE0, headRoll: 0.24 * tilt, headPitch: -0.08, flap: 0.25, blink: window01(u, AT.trust - 0.02, AT.trust + 0.26, 0.08) };
  const pose: Pose = {
    ...cute,
    headRoll: lerp(cute.headRoll, h.headRoll, toHook),
    headPitch: lerp(cute.headPitch, h.headPitch, toHook),
    headYaw: lerp(cute.headYaw, h.headYaw, toHook),
    open: lerp(0, h.open, ramp(u, LOOP_S - 0.42, LOOP_S - 0.04)),
    flap: lerp(cute.flap, h.flap, toHook),
  };
  const rigs = rigsOf(pose);
  return { pose, cam: shotCamera(rigs, mixShot(FACE_SHOT, hookShot(LOOP_S), ramp(u, LOOP_S - 0.7, LOOP_S - 0.04))), rigs };
}

export function viewAt(t: number): View {
  const scene = sceneAt(t);
  const u = scene.u;
  const base = (pose: Pose, shot: Shot): { pose: Pose; cam: Camera; rigs: Rigs } => {
    const rigs = rigsOf(pose);
    return { pose, cam: shotCamera(rigs, shot), rigs };
  };
  let v: { pose: Pose; cam: Camera; rigs: Rigs };
  let light = DUSK;
  let dark = 1;
  let red = 0;
  switch (scene.name) {
    case 'hook':
      v = base(hookPose(u), hookShot(u));
      light = FACE;
      break;
    case 'cute':
      v = cuteView(u);
      light = DAY;
      dark = 0;
      break;
    case 'open': {
      v = openView(u);
      const k = ramp(u, AT.opens - 0.2, AT.upEnd + 0.1);
      light = mixLight(DAY, FACE, k);
      dark = k;
      break;
    }
    case 'spikes':
      v = spikesView(u);
      red = window01(u, AT.spikes - 0.05, sceneTo('spikes'), 0.3);
      light = mixLight(DUSK, RED, ramp(u, AT.spikes - 0.1, AT.spikes + 0.1));
      break;
    case 'noteeth':
      v = noTeethView(u);
      light = COOL;
      dark = 0.45;
      break;
    case 'throat':
      v = throatView(u);
      light = mixLight(DUSK, RED, 0.45);
      red = 0.35;
      break;
    case 'fish':
      v = fishView(u);
      light = FACE;
      break;
    case 'trust': {
      v = trustView(u);
      const k = ramp(u, LOOP_S - 0.6, LOOP_S - 0.05);
      light = mixLight(DAY, FACE, k);
      dark = k;
      break;
    }
    default:
      // The fingernail beat is drawn on its own (nail.ts); keep the penguin's frame for completeness.
      v = base(hookPose(u), HOOK_SHOT);
  }
  return { scene, ...v, light, dark, red };
}

// ---------------------------------------------------------------- the spines lit in turn, the fish

/** A light running down the spines from the bill tip to the throat on "ALL pointing down the throat". */
export function glowAt(t: number): (s: Spine) => number {
  const u = wrap(t);
  if (sceneAt(t).name !== 'throat') return () => 0;
  const front = 1.15 - 1.4 * ramp(u, AT.all - 0.05, AT.throatEnd);
  const on = window01(u, AT.all - 0.1, sceneTo('throat'), 0.15);
  return (s) => on * Math.exp(-(((s.depth - front) / 0.16) ** 2));
}

/** The fish's head along the tongue (bill-frame z): in from the tip, a try at backing out on "ONE", gone on "way.". */
export function fishZAt(t: number): number {
  const u = wrap(t);
  const inZ = lerp(BILL_L - 0.6, 0.9, ramp(u, sceneFrom('fish') + 0.05, AT.fish + 0.3));
  const deeper = -1.3 * ramp(u, AT.only - 0.05, AT.one - 0.1);
  const back = 0.9 * window01(u, AT.one - 0.12, AT.way + 0.02, 0.1);
  const gulp = -8 * ramp(u, AT.way - 0.02, AT.wayEnd);
  return inZ + deeper + back + gulp;
}
/** How hard it wriggles, 0 .. 1. */
export const fishWriggleAt = (t: number): number => {
  const u = wrap(t);
  return 0.4 + 0.6 * window01(u, AT.one - 0.2, AT.way + 0.05, 0.1);
};
/** Gone into the throat. */
export const fishGoneAt = (t: number): boolean => fishZAt(t) < THROAT_Z - 3.2;

// ---------------------------------------------------------------- the fingernail beat

/** The sheen over the spine on "fingernails". */
export const sheenAt = (t: number): number => clamp01((wrap(t) - (AT.fingernails - 0.1)) / 0.7);
export const spineInAt = (t: number): number => ramp(wrap(t), sceneFrom('nails'), AT.spines + 0.25);

// ---------------------------------------------------------------- jolts

/** A jolt on the shock and the gulp, screen px. */
export function shakeAt(t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  const jolt = (at: number, size: number): number => {
    const s = u - at;
    return s < 0 || s > 0.45 ? 0 : size * Math.exp(-s * 8) * Math.sin(s * 68);
  };
  const a = jolt(AT.spikes, 18) + jolt(AT.one + 0.05, 8) + jolt(AT.way + 0.12, 10);
  return { x: a * 0.7, y: a };
}
