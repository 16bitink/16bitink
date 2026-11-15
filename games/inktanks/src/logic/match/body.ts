import type { Pt } from '../vec';
import type { Tank } from './types';

/**
 * A tank's body for hits and bumps: a circle of its radius round its centre,
 * or, for a long body (the chapter 4 train, `Tank.length` > 0), a capsule
 * along its heading. `spinePoint` is the point of the body's spine nearest
 * to (x, y): measure hit distances from it instead of the centre.
 */
export function spinePoint(t: Tank, x: number, y: number): Pt {
  if (t.length <= 0) return t;
  const ux = Math.cos(t.heading);
  const uy = Math.sin(t.heading);
  const k = Math.max(-t.length, Math.min(t.length, (x - t.x) * ux + (y - t.y) * uy));
  return { x: t.x + ux * k, y: t.y + uy * k };
}

/** Distance from (x, y) to the body's spine. */
export function spineDist(t: Tank, x: number, y: number): number {
  const p = spinePoint(t, x, y);
  return Math.hypot(x - p.x, y - p.y);
}
