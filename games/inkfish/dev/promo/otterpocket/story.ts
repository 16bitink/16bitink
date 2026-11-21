import { type Pt } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { lerp, ramp, window01 } from '../short';
import { type FaceLook } from './face';
import { type Arm, CHEST_STONE, type OtterPose } from './otter';
import { CHUCKLE, LOOP_S, WORDS } from './words';

/**
 * "Sea otters have POCKETS!", beat by beat, every value a pure function of
 * loop time (render.ts draws it). One mood a sentence:
 *
 * 1. hook (excited): frame 1 is the title, the otter big on its back in the
 *    kelp, one arm up, the skin pouch under it with a round stone peeking out.
 * 2. flap (curious): "A loose flap of skin under each arm…" we push in on
 *    the pouch as its paw pulls the flap open, then both arms go up.
 * 3. rock (mischief): "and they keep a ROCK in there." the stone comes up
 *    out of the pouch, a sly look, and sinks back in.
 * 4. dive (action): "Dive down," it rolls over and sinks out of sight, bubbles.
 * 5. clam: "grab a clam," on the sea floor its paws close on a big clam.
 * 6. float (calm): "float on your back…" up again, the clam in its paws, the
 *    stone on its chest.
 * 7. smash (dramatic): "and SMASH!" the clam up high, then down on the stone:
 *    splash, shell chips, a jolt.
 * 8. count (surprise): "One otter cracked 44 mussels… with just 6 stones!"
 *    shells pile up round it as a counter runs, then six stones in a row.
 * 9. laugh: the [chuckles], a grin with its eyes shut.
 * 10. armpit (tender): "So next time an otter reaches into its armpit…
 *    remember," eyes shut, a paw tucked into the armpit, the arm lifts into
 *    frame 1.
 */

export { LOOP_S };

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** When the nth `text` is said, in loop seconds. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`no word "${text}" #${nth}`);
  return w.start;
}
const endOf = (text: string, nth = 1): number => WORDS.filter((w) => w.text === text)[nth - 1]!.end;

export const AT = {
  pockets: said('POCKETS!'),
  a: said('A'),
  flap: said('flap'),
  skin: said('skin'),
  under: said('under'),
  each: said('each'),
  arm: said('arm…'),
  and: said('and'),
  keep: said('keep'),
  rock: said('ROCK'),
  there: said('there.'),
  dive: said('Dive'),
  down: said('down,'),
  grab: said('grab'),
  clam: said('clam,'),
  float: said('float'),
  back: said('back…'),
  and2: said('and', 2),
  smash: said('SMASH!'),
  one: said('One'),
  cracked: said('cracked'),
  n44: said('44'),
  mussels: said('mussels…'),
  musselsEnd: endOf('mussels…'),
  six: said('6'),
  stones: said('stones!'),
  stonesEnd: endOf('stones!'),
  chuckle: CHUCKLE.start,
  so: said('So'),
  reaches: said('reaches'),
  armpit: said('armpit…'),
  armpitEnd: endOf('armpit…'),
  remember: said('remember,'),
} as const;

/** The clam hits the stone. */
export const IMPACT = AT.smash + 0.04;

// ---------------------------------------------------------------- scenes

export type SceneName = 'hook' | 'flap' | 'rock' | 'dive' | 'clam' | 'float' | 'smash' | 'count' | 'laugh' | 'armpit';

export const CUTS: readonly { readonly name: SceneName; readonly from: number }[] = [
  { name: 'hook', from: 0 },
  { name: 'flap', from: AT.a - 0.1 },
  { name: 'rock', from: AT.and - 0.1 },
  { name: 'dive', from: AT.dive - 0.12 },
  { name: 'clam', from: AT.grab - 0.1 },
  { name: 'float', from: AT.float - 0.1 },
  { name: 'smash', from: AT.and2 - 0.1 },
  { name: 'count', from: AT.one - 0.12 },
  { name: 'laugh', from: AT.chuckle - 0.08 },
  { name: 'armpit', from: AT.so - 0.1 },
];

export interface Scene {
  readonly name: SceneName;
  readonly u: number;
}

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  let i = 0;
  while (i + 1 < CUTS.length && u >= CUTS[i + 1]!.from) i++;
  return { name: CUTS[i]!.name, u };
}
export const sceneFrom = (name: SceneName): number => CUTS.find((c) => c.name === name)!.from;
export const sceneTo = (name: SceneName): number => {
  const i = CUTS.findIndex((c) => c.name === name);
  return i + 1 < CUTS.length ? CUTS[i + 1]!.from : LOOP_S;
};

// ---------------------------------------------------------------- poses

const arm = (ex: number, ey: number, px: number, py: number): Arm => ({ elbow: { x: ex, y: ey }, paw: { x: px, y: py } });
const mirror = (a: Arm): Arm => ({ elbow: { x: -a.elbow.x, y: a.elbow.y }, paw: { x: -a.paw.x, y: a.paw.y } });
const mixPt = (a: Pt, b: Pt, u: number): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });
export const mixArm = (a: Arm, b: Arm, u: number): Arm => ({ elbow: mixPt(a.elbow, b.elbow, u), paw: mixPt(a.paw, b.paw, u) });

export const ARMS = {
  chest: arm(215, -40, 92, -112),
  raise: arm(262, -372, 236, -530),
  /** Frame 1's left paw, patting the chest towards the pouch. */
  pat: arm(-190, -10, -24, -70),
  /** The left paw across at the right pouch's lower lip, holding it open. */
  reach: arm(-30, 10, 170, -70),
  hold: arm(220, -60, 84, -200),
  /** Lifted towards us (the clam drawn bigger), a little up the chest. */
  high: arm(236, -100, 86, -232),
  smash: arm(225, -20, 82, -150),
} as const;

const FACE0: FaceLook = { tilt: 0, eyes: 1, happy: 0, smile: 0.6, laugh: 0, look: { x: 0, y: 0 }, brow: 0 };
const mixFace = (a: FaceLook, b: FaceLook, u: number): FaceLook => ({
  tilt: lerp(a.tilt, b.tilt, u), eyes: lerp(a.eyes, b.eyes, u), happy: lerp(a.happy, b.happy, u), smile: lerp(a.smile, b.smile, u),
  laugh: lerp(a.laugh, b.laugh, u), look: mixPt(a.look, b.look, u), brow: lerp(a.brow, b.brow, u),
});

/** Breathing and bobbing on the swell: cycles of 3 s (six to the loop). */
const bob = (u: number): number => Math.sin((2 * Math.PI * u) / 3);

/** Frame 1's pose: right arm up, the left paw at the pouch, the stone peeking, an excited look. */
export function hookPose(t: number): OtterPose {
  const u = wrap(t);
  return {
    armL: ARMS.pat, armR: mixArm(ARMS.raise, arm(266, -362, 244, -520), 0.5 + 0.5 * bob(u)),
    face: { ...FACE0, tilt: 0.04 * bob(u), smile: 0.85, brow: 0.5, look: { x: 0.2, y: -0.2 } },
    pouchOpen: 0.45, stone: 1, stoneLift: 0.3, toes: 0.5 + 0.5 * bob(u), pouch: 1, back: false,
  };
}

function flapPose(u: number): OtterPose {
  const h = hookPose(u);
  const open = ramp(u, AT.flap - 0.1, AT.skin + 0.1);
  const both = window01(u, AT.under - 0.05, sceneTo('flap') + 0.2, 0.3);
  return {
    ...h,
    armL: mixArm(mixArm(ARMS.pat, ARMS.reach, ramp(u, sceneFrom('flap'), AT.flap)), mirror(ARMS.raise), both),
    face: { ...FACE0, tilt: -0.06, brow: 0.8, smile: 0.5, look: { x: 0.8 - 0.8 * both, y: 0.3 - 0.5 * both } },
    pouchOpen: lerp(0.35, 1, open * (1 - both * 0.6)),
    stoneLift: lerp(0.22, 0.1, open),
  };
}

function rockPose(u: number): OtterPose {
  const h = hookPose(u);
  const lift = window01(u, AT.rock - 0.3, AT.there + 0.15, 0.25);
  const sly = ramp(u, sceneFrom('rock'), AT.keep);
  return {
    ...h,
    armL: mixArm(ARMS.pat, ARMS.reach, ramp(u, sceneFrom('rock'), AT.keep)),
    face: { ...FACE0, tilt: 0.1 * sly, eyes: lerp(1, 0.55, sly), smile: 1, brow: -sly, look: { x: 0.9, y: 0.3 } },
    pouchOpen: 0.7,
    stoneLift: lerp(0.15, 0.8, lift),
  };
}

function floatPose(u: number): OtterPose {
  const up = window01(u, AT.and2 - 0.05, IMPACT + 0.3, 0.3);
  const down = ramp(u, IMPACT - 0.14, IMPACT);
  const smashed = u >= IMPACT - 0.14;
  const r = smashed ? mixArm(ARMS.high, ARMS.smash, down) : mixArm(ARMS.hold, ARMS.high, up);
  const flinch = window01(u, IMPACT - 0.05, IMPACT + 0.35, 0.08);
  const wow = ramp(u, IMPACT + 0.3, IMPACT + 0.6);
  return {
    armL: mirror(r), armR: r,
    face: mixFace({ ...FACE0, eyes: lerp(0.85, 0.05, flinch), smile: 0.6, brow: lerp(0, -0.6, up), look: { x: 0, y: 0.6 } }, { ...FACE0, brow: 1, smile: 0.9, look: { x: 0, y: 0.6 } }, wow),
    pouchOpen: 0, stone: 0, stoneLift: 0, toes: 0.5 + 0.5 * bob(u) + flinch, pouch: 0, back: false,
  };
}

function countPose(u: number): OtterPose {
  const laugh = ramp(u, AT.chuckle - 0.1, AT.chuckle + 0.1);
  const wiggle = laugh * 0.05 * Math.sin(u * 30);
  return {
    armL: mirror(ARMS.chest), armR: ARMS.chest,
    face: mixFace({ ...FACE0, brow: 1, smile: 0.3, laugh: 0.35, look: { x: -0.5, y: 0.4 } }, { ...FACE0, tilt: wiggle, eyes: 0, happy: 1, smile: 1, laugh: 1, brow: 0.6 }, laugh),
    pouchOpen: 0, stone: 0, stoneLift: 0, toes: 0.5 + 0.5 * bob(u), pouch: 0, back: false,
  };
}

/** "So next time an otter reaches into its armpit… remember," then into frame 1. */
function armpitPose(u: number): OtterPose {
  const h = hookPose(LOOP_S);
  const tuck = ramp(u, AT.reaches - 0.3, AT.armpit + 0.1);
  const lift = ramp(u, AT.remember - 0.35, LOOP_S - 0.05);
  const fromLaugh = ramp(u, sceneFrom('armpit'), sceneFrom('armpit') + 0.5);
  const raiseR = mixArm(ARMS.chest, arm(280, -230, 236, -380), tuck);
  const awake = ramp(u, AT.remember - 0.1, LOOP_S - 0.15);
  const tender: FaceLook = { ...FACE0, tilt: -0.1, eyes: 0, happy: 0.7, smile: 0.85 };
  const fromCount = countPose(sceneFrom('armpit')).face;
  return {
    armL: mixArm(mixArm(mirror(ARMS.chest), ARMS.reach, tuck), h.armL, lift),
    armR: mixArm(raiseR, h.armR, lift),
    face: mixFace(mixFace(fromCount, tender, fromLaugh), h.face, awake),
    pouchOpen: lerp(0, h.pouchOpen, lift), stone: 1, stoneLift: lerp(0, h.stoneLift, lift),
    toes: h.toes, pouch: 1, back: false,
  };
}

// ---------------------------------------------------------------- the camera

/** Shows local point (cx, cy) at screen (540, sy), `zoom` px per unit, rolled by `rot`. */
export interface Cam {
  readonly cx: number;
  readonly cy: number;
  readonly zoom: number;
  readonly rot: number;
  readonly sy: number;
}
const mixCam = (a: Cam, b: Cam, u: number): Cam => ({
  cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), zoom: lerp(a.zoom, b.zoom, u), rot: lerp(a.rot, b.rot, u), sy: lerp(a.sy, b.sy, u),
});

export const HOOK_CAM: Cam = { cx: 30, cy: -150, zoom: 1.15, rot: -0.08, sy: 1010 };
const POUCH_CAM: Cam = { cx: 200, cy: -230, zoom: 2.1, rot: -0.12, sy: 820 };
const WIDE_CAM: Cam = { cx: 0, cy: -170, zoom: 0.98, rot: 0, sy: 1000 };
const ROCK_CAM: Cam = { cx: 170, cy: -250, zoom: 1.75, rot: 0.06, sy: 860 };
const FLOAT_CAM: Cam = { cx: 0, cy: -150, zoom: 1.2, rot: 0.04, sy: 980 };
const COUNT_CAM: Cam = { cx: 0, cy: -60, zoom: 0.82, rot: 0, sy: 960 };

export interface View {
  readonly scene: Scene;
  readonly pose: OtterPose;
  readonly cam: Cam;
  /** The otter's own scale and roll over (flip < 0: from behind), and how deep it is (0 surface .. 1 gone). */
  readonly flip: number;
  readonly depth: number;
}

export function viewAt(t: number): View {
  const scene = sceneAt(t);
  const u = scene.u;
  const v = (pose: OtterPose, cam: Cam, flip = 1, depth = 0): View => ({ scene, pose, cam, flip, depth });
  switch (scene.name) {
    case 'hook':
      return v(hookPose(u), mixCam(HOOK_CAM, { ...HOOK_CAM, zoom: 1.2 }, ramp(u, 0, sceneTo('hook'))));
    case 'flap': {
      const inK = ramp(u, sceneFrom('flap'), AT.skin);
      const outK = ramp(u, AT.under - 0.1, AT.arm);
      return v(flapPose(u), mixCam(mixCam(HOOK_CAM, POUCH_CAM, inK), WIDE_CAM, outK));
    }
    case 'rock':
      return v(rockPose(u), mixCam(WIDE_CAM, ROCK_CAM, ramp(u, sceneFrom('rock'), AT.rock)));
    case 'dive': {
      const k = ramp(u, sceneFrom('dive'), sceneFrom('dive') + 0.35);
      const sink = ramp(u, AT.dive + 0.15, sceneTo('dive'));
      const pose = { ...rockPose(sceneFrom('dive')), stone: 0, back: k > 0.5, face: { ...FACE0, eyes: 0, happy: 0 } };
      return v(pose, { ...WIDE_CAM, zoom: lerp(0.98, 0.5, sink), rot: 0.15 * sink }, Math.cos(Math.PI * k), sink);
    }
    case 'float': {
      const rise = ramp(u, sceneFrom('float'), sceneFrom('float') + 0.6);
      return v(floatPose(u), mixCam({ ...FLOAT_CAM, zoom: 0.9 }, FLOAT_CAM, rise));
    }
    case 'smash': {
      const punch = window01(u, IMPACT - 0.06, IMPACT + 0.5, 0.08);
      return v(floatPose(u), { ...FLOAT_CAM, zoom: FLOAT_CAM.zoom + 0.12 * punch });
    }
    case 'count':
    case 'laugh':
      return v(countPose(u), mixCam(FLOAT_CAM, COUNT_CAM, ramp(u, sceneFrom('count'), AT.cracked + 0.1)));
    case 'armpit': {
      const k = ramp(u, sceneFrom('armpit'), AT.armpitEnd);
      const close = ramp(u, AT.armpitEnd, LOOP_S - 0.05);
      return v(armpitPose(u), mixCam(mixCam(COUNT_CAM, { ...HOOK_CAM, zoom: 1.3, cx: 120 }, k), HOOK_CAM, close));
    }
    default:
      // The clam on the sea floor is drawn on its own (render.ts); keep the otter's frame for completeness.
      return v(hookPose(u), HOOK_CAM, 1, 1);
  }
}

// ---------------------------------------------------------------- props

/** The clam in the paws (local units) and how cracked it is, or null. */
export function clamAt(t: number): { readonly at: Pt; readonly crack: number; readonly scale: number } | null {
  const u = wrap(t);
  const s = sceneAt(t).name;
  if (s !== 'float' && s !== 'smash') return null;
  const p = viewAt(t).pose.armR.paw;
  const up = window01(u, AT.and2 - 0.05, IMPACT + 0.3, 0.3) * (1 - ramp(u, IMPACT - 0.14, IMPACT));
  return { at: { x: 0, y: p.y - 22 }, crack: ramp(u, IMPACT, IMPACT + 0.25), scale: 1 + 0.4 * up };
}
/** The stone on the chest, from the float to the end of the count. */
export const chestStoneAt = (t: number): number => {
  const s = sceneAt(t).name;
  return s === 'float' || s === 'smash' ? 1 : s === 'count' ? 1 - ramp(wrap(t), AT.cracked - 0.3, AT.cracked) : 0;
};
export { CHEST_STONE };

/** The sea-floor beat: how far the paws have come down and closed (0..1), and how far the clam is lifted. */
export function grabAt(t: number): { readonly reach: number; readonly lift: number } {
  const u = wrap(t);
  return { reach: ramp(u, sceneFrom('clam'), AT.grab + 0.2), lift: ramp(u, AT.clam - 0.1, sceneTo('clam')) };
}

export const MUSSELS = 44;
export const STONES = 6;
/** How many mussel shells are up, and the counter, at t (0 .. 44). */
export const musselsAt = (t: number): number => {
  const u = wrap(t);
  if (sceneAt(t).name !== 'count' && sceneAt(t).name !== 'laugh') return 0;
  return Math.round(MUSSELS * ramp(u, AT.cracked, AT.musselsEnd));
};
/** How many stones are lined up (0 .. 6), one per beat from "6" to the end of "stones!". */
export const stonesAt = (t: number): number => {
  const u = wrap(t);
  if (sceneAt(t).name !== 'count' && sceneAt(t).name !== 'laugh') return 0;
  const from = AT.six - 0.05;
  return u < from ? 0 : Math.min(STONES, 1 + Math.floor((u - from) / ((AT.stonesEnd - from) / (STONES - 1))));
};
/** The pile and the labels fade as the laugh ends. */
export const pileAlphaAt = (t: number): number => (sceneAt(t).name === 'laugh' ? 1 - ramp(wrap(t), AT.chuckle + 0.1, sceneTo('laugh')) : 1);

/** A jolt on the smash, screen px. */
export function shakeAt(t: number): Pt {
  const s = wrap(t) - IMPACT;
  const a = s < 0 || s > 0.45 ? 0 : 20 * Math.exp(-s * 8) * Math.sin(s * 70);
  return { x: a * 0.7, y: a };
}
