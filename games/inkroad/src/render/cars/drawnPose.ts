/**
 * The pose a moving car is drawn at, a share t (0..1) through the time since the sim's last step: between the vehicle
 * model's sub-step frames (src/sim/drawn.ts). Pure, shared by the car layer and the motion tests, so the tests
 * sample exactly what is drawn.
 */
import type { CarsView } from '../../sim/types';

export interface DrawnPose { x: number; y: number; z: number; a: number }

const STRIDE = 4;

export const turn = (a: number, b: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** Car slot i at share t of its last step, into `out` (no allocation). */
export function drawnAt(c: CarsView, i: number, t: number, out: DrawnPose): DrawnPose {
  const f = Math.max(0, Math.min(1, t)) * c.sub;
  const k = Math.min(c.sub - 1, Math.floor(f)), u = f - k;
  const o = (i * (c.sub + 1) + k) * STRIDE, q = o + STRIDE;
  const fr = c.frames;
  out.x = fr[o]! + (fr[q]! - fr[o]!) * u;
  out.y = fr[o + 1]! + (fr[q + 1]! - fr[o + 1]!) * u;
  out.a = fr[o + 2]! + turn(fr[o + 2]!, fr[q + 2]!) * u;
  out.z = fr[o + 3]! + (fr[q + 3]! - fr[o + 3]!) * u;
  return out;
}
