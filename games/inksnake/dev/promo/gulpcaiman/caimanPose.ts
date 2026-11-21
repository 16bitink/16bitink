import { clamp01, curveAt, type Key, lerp, ramp, window01 } from '../short';
import { DRIFT, TILT } from '../gulphen/path';
import { CLIMB_AT, GULP_AT, headU, HEAVES, KICK_AT, NEXT_AT, SPOT_AT, U } from './story';

/**
 * The young caiman's poses: the one being swallowed, lying half out of the
 * shallows (its tail and hind legs in the water), and the next one swimming in
 * along the bank, eyes and snout above the surface, then climbing out a little
 * to where frame 1 finds the first.
 */
export interface CaimanPose {
  /** Its snout tip in the world, and its axis's tilt (nose up when positive). */
  readonly x: number;
  readonly y: number;
  readonly tilt: number;
  /** Head about the neck: 0 along the axis, negative up. */
  readonly neck: number;
  readonly alarm: boolean;
  /** Each leg's swing about its hip, 0 down .. PI/2 trailing back. */
  readonly foreNear: number;
  readonly foreFar: number;
  readonly hindNear: number;
  readonly hindFar: number;
  /** How far the hind hips have slid back along it as they go in (world units). */
  readonly hindBack: number;
  /** The tail's two joints' bend, negative up. */
  readonly tailBase: number;
  readonly tailTip: number;
  /** A shudder in time with a heave, 0 .. 1. */
  readonly shudder: number;
  /** Ground shadow, 0 .. 1. */
  readonly shadow: number;
  /** Where along it (world units from the snout) the water starts; it's dry in front of this. */
  readonly waterA: number;
  /** How deep it lies in the water there: 0 wading (the belly and legs under), 1 swimming (only eyes, snout and back above). */
  readonly sink: number;
}

/** The leg swing that stands a leg plumb on the ground with the body tilted up by TILT. */
const PLUMB = TILT;
/** Where the water starts along the caiman on frame 1: just behind its fore legs. */
export const SHORE_A = 340 * U;
const FRAME_ONE_NECK = -0.05;
/** The leg swing when tucked back along the flanks to swim. */
const TUCK = 1.35;

/** A pulse at each heave. */
export const heaveAt = (t: number): number => Math.max(0, ...HEAVES.map((h) => Math.sin(Math.PI * clamp01((t - h + 0.05) / 0.35))));

/** The tail's lash when only it is left: up, then slapping down. */
export const lashAt = (t: number): number => {
  const s = (t - KICK_AT) / 0.42;
  return s > 0 && s < 1 ? Math.sin(2 * Math.PI * s) * (1 - s) ** 0.6 : 0;
};

function swallowedCaiman(t: number): CaimanPose {
  const a = headU(t) / U;
  const fore = ramp(a, 200, 330);
  const hind = ramp(a, 420, 590);
  const paddle = Math.sin(2 * Math.PI * 3.2 * t) * 0.3;
  const thrash = window01(t, 0.6, 3.5, 0.4);
  const sweep = Math.sin(2 * Math.PI * 1.6 * t);
  return {
    x: 0, y: 0, tilt: TILT, neck: FRAME_ONE_NECK * (1 - ramp(t, 0.3, 1.5)), alarm: true,
    foreNear: PLUMB + 0.1 + paddle * (1 - fore) + fore * 1.25,
    foreFar: PLUMB - paddle * (1 - fore) + fore * 1.3,
    hindNear: PLUMB - 0.05 + 0.7 * paddle * (1 - hind) + hind * 1.35,
    hindFar: PLUMB + 0.05 - 0.7 * paddle * (1 - hind) + hind * 1.38,
    hindBack: 110 * U * hind,
    tailBase: 0.1 * sweep * thrash,
    tailTip: 0.26 * Math.sin(2 * Math.PI * 1.6 * t - 1) * window01(t, 0.6, 4.1, 0.4) - 0.75 * lashAt(t),
    shudder: heaveAt(t), shadow: 1 - ramp(a, 300, 500), waterA: SHORE_A, sink: 0,
  };
}

/** Its swim in along the bank and the climb out, world units behind frame 1's place along its axis. */
const SWIM: readonly Key[] = [
  { t: NEXT_AT, at: -1250, rate: 300 },
  { t: 9.9, at: -500, rate: 0 },
  { t: CLIMB_AT, at: -500, rate: 0 },
  { t: 11.15, at: -12 },
  { t: 11.4, at: 0, rate: 0 },
];

function nextCaiman(t: number): CaimanPose {
  const back = t < 11.4 ? curveAt(SWIM, t) : { at: 0, rate: 0 };
  const climb = ramp(t, CLIMB_AT, 11.2);
  const swim = 1 - climb;
  const stride = t > CLIMB_AT && t < 11.25 ? Math.sin(2 * Math.PI * 2.6 * (t - CLIMB_AT)) : 0;
  const beat = Math.sin(2 * Math.PI * 1.3 * t);
  const settle = 1 - ramp(t, 11.0, 11.4);
  const bob = 4 * Math.sin(2 * Math.PI * 0.9 * t) * swim;
  return {
    x: DRIFT.x + back.at * Math.cos(TILT),
    y: DRIFT.y - back.at * Math.sin(TILT) + bob,
    tilt: TILT,
    neck: lerp(-0.1, FRAME_ONE_NECK, climb),
    alarm: t >= SPOT_AT - 0.1,
    foreNear: lerp(TUCK, PLUMB + 0.1 + 0.4 * stride * settle, climb),
    foreFar: lerp(TUCK + 0.05, PLUMB - 0.4 * stride * settle, climb),
    hindNear: lerp(TUCK, PLUMB - 0.05 - 0.3 * stride * settle, climb),
    hindFar: lerp(TUCK + 0.05, PLUMB + 0.05 + 0.3 * stride * settle, climb),
    hindBack: 0,
    tailBase: 0.14 * beat * settle,
    tailTip: 0.34 * Math.sin(2 * Math.PI * 1.3 * t - 1) * settle,
    shudder: 0,
    shadow: climb,
    waterA: SHORE_A + back.at,
    sink: swim,
  };
}

/** The caiman in play at time t, if any. */
export function caimanAt(t: number): CaimanPose | null {
  if (t < GULP_AT - 0.02) return swallowedCaiman(t);
  return t >= NEXT_AT ? nextCaiman(t) : null;
}

