/**
 * Keeping stones lively, shared by the Sim and the aim trace (so the bots' predictions match play):
 * a minimum vertical share (no endless side-to-side runs), a minimum sideways share after a stone
 * bounce (a straight shot into a hole doesn't come straight back out), and a loop breaker (a stone
 * that bounces LOOP_BOUNCES times off walls and stone without touching a brick or the raft is
 * turned a few degrees). All deterministic: square roots and the sine table only.
 */
import { LOOP_NUDGE_DEG, MIN_VX_SHARE, MIN_VY_SHARE } from './constants';
import { cosDeg, sinDeg } from './trig';

export interface Moving { vx: number; vy: number }

/** At least MIN_VY_SHARE of the speed vertical. */
export function keepUpright(b: Moving, speed: number): void {
  const min = MIN_VY_SHARE * speed;
  if (Math.abs(b.vy) >= min) return;
  b.vy = b.vy < 0 ? -min : min;
  b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(speed * speed - min * min);
}

/** After a stone bounce: at least MIN_VX_SHARE sideways; `tie` picks the side when vx is exactly 0. */
export function keepSideways(b: Moving, speed: number, tie: number): void {
  const min = MIN_VX_SHARE * speed;
  if (Math.abs(b.vx) >= min) return;
  const side = b.vx > 0 ? 1 : b.vx < 0 ? -1 : tie % 2 === 0 ? 1 : -1;
  b.vx = side * min;
  b.vy = (b.vy < 0 ? -1 : 1) * Math.sqrt(speed * speed - min * min);
}

/** Turns the velocity by LOOP_NUDGE_DEG, alternating the direction with `count`. */
export function nudge(b: Moving, count: number): void {
  const deg = count % 2 === 0 ? LOOP_NUDGE_DEG : -LOOP_NUDGE_DEG;
  const c = cosDeg(deg);
  const s = sinDeg(deg);
  const vx = b.vx * c - b.vy * s;
  b.vy = b.vx * s + b.vy * c;
  b.vx = vx;
}

/** Scales the velocity back to `speed` (no-op for a resting stone). */
export function keepSpeed(b: Moving, speed: number): void {
  const s = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  if (s < 1e-9) return;
  b.vx *= speed / s;
  b.vy *= speed / s;
}

/** A bumper's kick: `share` of the speed added along the normal, the speed kept. */
export function kick(b: Moving, nx: number, ny: number, speed: number, share: number): void {
  b.vx += nx * share * speed;
  b.vy += ny * share * speed;
  keepSpeed(b, speed);
}

/** A constant pull (current, heavy) of (ax, ay) for dt, the speed kept, at least MIN_VY_SHARE vertical. */
export function pull(b: Moving, ax: number, ay: number, dt: number, speed: number): void {
  b.vx += ax * dt;
  b.vy += ay * dt;
  keepSpeed(b, speed);
  keepUpright(b, speed);
}
