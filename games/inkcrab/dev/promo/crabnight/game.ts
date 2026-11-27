import { clamp01, lerp, smooth } from '../short';
import { AT, type CrabState, GAME_SURFACE, said } from './story';

/**
 * The game beat on Moonlit Bay: the player crab walking the strand, the
 * plankton lighting up under every step, and the camera, which shows the
 * whole beach (backdrop, sand, burrow) while Dewy speaks, then closes in on
 * the strand for "A night beach, lit by glowing plankton".
 */
const SPEED = 165;
const START_X = 130;
/** The crab's drawing scale in the world (×2 once the camera is in: ~480 px across). */
export const GAME_CRAB_SCALE = 1.6;

export function playerAt(t: number): CrabState {
  const u = Math.max(0, t - AT.game);
  return { x: START_X + SPEED * u, y: GAME_SURFACE, out: 1, facing: 1, bob: 4 * Math.abs(Math.sin(u * 9)) };
}

/** The camera: zoom, and the world point at the frame's middle (540, 960). */
export interface Cam {
  readonly z: number;
  readonly x: number;
  readonly y: number;
}

export const ZOOM = 2;
export const ZOOM_AT = said('A') - 0.2;
const ZOOM_S = 0.6;

export function gameCam(t: number): Cam {
  const u = smooth((t - ZOOM_AT) / ZOOM_S);
  const z = lerp(1, ZOOM, u);
  const half = 540 / ZOOM;
  // Just ahead of the crab, kept inside the beach.
  const follow = Math.min(1080 - half, Math.max(half, playerAt(t).x + 40));
  // The strand lands at y ≈ 1030 on screen: (GAME_SURFACE − y)·ZOOM + 960 = 1030.
  return { z, x: lerp(540, follow, u), y: lerp(960, GAME_SURFACE - 35, u) };
}

/** A world point on screen through the camera. */
export function toScreen(cam: Cam, p: { readonly x: number; readonly y: number }): { readonly x: number; readonly y: number } {
  return { x: (p.x - cam.x) * cam.z + 540, y: (p.y - cam.y) * cam.z + 960 };
}

/** Seconds between the crab's steps; each one stirs the plankton. */
export const STEP_S = 0.36;
/** Seconds a footprint takes to fade (the game's FOOTPRINT fade). */
export const FADE_S = 3;

export interface Footprint {
  readonly x: number;
  /** Seconds since the step. */
  readonly age: number;
  readonly seed: number;
}

/** The footprints glowing at t: one per step since the crab set off, under its legs, alternating feet. */
export function footprintsAt(t: number): readonly Footprint[] {
  const out: Footprint[] = [];
  for (let k = 0; ; k++) {
    const at = AT.game + 0.15 + k * STEP_S;
    if (at > t) break;
    const age = t - at;
    if (age > FADE_S) continue;
    out.push({ x: playerAt(at).x + 30 + (k % 2 === 0 ? -26 : 26), age, seed: k });
  }
  return out;
}

/** How bright a footprint is: a flash as the foot comes down, then a slow fade. */
export const footprintGlow = (age: number): number => (age < 0 ? 0 : (1 + 0.6 * (1 - clamp01(age / 0.25))) * (1 - clamp01(age / FADE_S)) ** 1.4);
