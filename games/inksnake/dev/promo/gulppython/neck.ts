import { COBRA_ART } from '../../../src/art/chapters/jungleSnake';
import { pathAt } from '../gulphen/path';
import type { Pt } from '../sprites';
import { headU, NECK_W } from './story';

/**
 * Keeps the cobra's head joined to its neck on a bend: the head is laid on
 * the chord from the point where the neck meets it to the tip (not along the
 * tip's own heading), and the body just behind it runs straight along that
 * chord before easing back onto the path.
 */

/** How far behind the tip the game's top-down head sprite's origin sits, world units. */
export const TOP_HEAD_BACK = (COBRA_ART?.snout ?? 22) * (NECK_W / 22);

export interface HeadAxis {
  readonly p: Pt;
  readonly q: Pt;
  readonly heading: number;
}

/** The head's tip on the path, the point `back` behind it, and the heading from that point to the tip. */
export function headAxis(t: number, back: number): HeadAxis {
  const h = headU(t);
  const p = pathAt(h);
  const q = pathAt(h - back);
  const heading = Math.hypot(p.x - q.x, p.y - q.y) > 1e-6 ? Math.atan2(p.y - q.y, p.x - q.x) : p.heading;
  return { p, q, heading };
}

export interface Neck {
  readonly p: Pt;
  readonly e: Pt;
  /** The head's length along the path, and how far its straight chord really reaches. */
  readonly len: number;
  readonly chord: number;
}

/** The neck for a head whose jaws reach `reach` behind the tip, seen side on by `side` (0 top-down .. 1). */
export function neckOf(t: number, reach: number, side: number): Neck {
  const len = 2 * TOP_HEAD_BACK + (reach - 2 * TOP_HEAD_BACK) * side;
  const { p, q, heading } = headAxis(t, len);
  return { p, e: { x: Math.cos(heading), y: Math.sin(heading) }, len, chord: Math.hypot(p.x - q.x, p.y - q.y) };
}

/** The body's spine point `d` behind the tip (head at path place `h`): on the head's straight line near it, on the path further back. */
export function neckAt(n: Neck, h: number, d: number): { x: number; y: number; heading: number } {
  const path = pathAt(h - d);
  const w = Math.min(1, Math.max(0, (d - n.len) / (n.len * 1.4)));
  if (w >= 1) return path;
  const s = w * w * (3 - 2 * w);
  const back = d <= n.len ? (d * n.chord) / n.len : n.chord + (d - n.len);
  const straight = { x: n.p.x - n.e.x * back, y: n.p.y - n.e.y * back };
  const heading = Math.atan2(n.e.y, n.e.x);
  const dh = Math.atan2(Math.sin(path.heading - heading), Math.cos(path.heading - heading));
  return { x: straight.x + (path.x - straight.x) * s, y: straight.y + (path.y - straight.y) * s, heading: heading + dh * s };
}
