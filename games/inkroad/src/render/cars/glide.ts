/**
 * How a moving car is drawn between two sim steps (pure, shared by the car layer and the motion tests): from the
 * pose drawn when the step came (x0, a0) to the sim's new pose (x1, a1), t from 0 to 1.
 */
export interface Glide { x0: number; y0: number; z0: number; a0: number; x1: number; y1: number; z1: number; a1: number }
export interface GlidePose { x: number; y: number; z: number; a: number }

export const turn = (a: number, b: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** The ends' headings must lie this close to the chord (cosine) for the curved glide; otherwise a straight one. */
const ALIGNED = 0.5;
const TINY = 1e-3;

/**
 * A car drives along its heading: between steps it follows the cubic Hermite curve whose end tangents are the two
 * headings, and is drawn along that curve's tangent (no sideways slip, however coarse the step). A car that stands,
 * or whose headings do not fit its move, glides straight with its heading turned evenly.
 */
export function glideAt(g: Glide, t: number, out: GlidePose): GlidePose {
  const dx = g.x1 - g.x0, dy = g.y1 - g.y0, len = Math.hypot(dx, dy);
  out.z = g.z0 + (g.z1 - g.z0) * t;
  const c0 = Math.cos(g.a0), s0 = Math.sin(g.a0), c1 = Math.cos(g.a1), s1 = Math.sin(g.a1);
  if (len < TINY || (c0 * dx + s0 * dy) / len < ALIGNED || (c1 * dx + s1 * dy) / len < ALIGNED) {
    out.x = g.x0 + dx * t;
    out.y = g.y0 + dy * t;
    out.a = g.a0 + turn(g.a0, g.a1) * t;
    return out;
  }
  const t2 = t * t, t3 = t2 * t;
  const h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  out.x = g.x0 + h10 * len * c0 + h01 * dx + h11 * len * c1;
  out.y = g.y0 + h10 * len * s0 + h01 * dy + h11 * len * s1;
  const d10 = 3 * t2 - 4 * t + 1, d01 = 6 * t - 6 * t2, d11 = 3 * t2 - 2 * t;
  const vx = d10 * len * c0 + d01 * dx + d11 * len * c1, vy = d10 * len * s0 + d01 * dy + d11 * len * s1;
  const even = g.a0 + turn(g.a0, g.a1) * t;
  out.a = Math.hypot(vx, vy) < TINY ? even : even + turn(even, Math.atan2(vy, vx));
  return out;
}
