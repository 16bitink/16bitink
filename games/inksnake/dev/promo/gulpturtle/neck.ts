import type { Pt } from '../sprites';
import { pathAt } from '../gulphen/path';
import { ANA_JAW_ART } from '../gulpcapy/anacondaSide';
import { type JawEdge, jawEdge } from '../headSeam';
import { headU, NECK_W } from './story';

/** Where the snake's head lies on the path and how the neck comes off it. */

/** The game's head is this many art units across the neck, and its snout tip this far before its origin. */
export const HEAD_W = 21.6;
export const HEAD_TIP = 24.6;
/** The top-down head's chord length back from the tip, and how far behind the tip the body starts under it. */
export const TOP_CHORD = 1.55 * HEAD_TIP * (NECK_W / HEAD_W);
export const TOP_D0 = 165;

export interface Axis {
  /** The way the head points, and the side that's up on screen. */
  readonly e: Pt;
  readonly up: Pt;
}

export const axisOf = (heading: number): Axis => {
  const e = { x: Math.cos(heading), y: Math.sin(heading) };
  return { e, up: { x: -e.y, y: e.x } };
};

export const along = (p: Pt, a: Axis, forward: number, up: number): Pt => ({ x: p.x + a.e.x * forward + a.up.x * up, y: p.y + a.e.y * forward + a.up.y * up });

/**
 * The head laid on the path the neck follows: its tip at the head, its axis
 * along the chord back to the point `back` behind it where the neck meets
 * it, so on a bend or a turn it never swings off the neck.
 */
export function headAxis(t: number, back: number): { p: Pt; q: Pt; heading: number } {
  const h = headU(t);
  const p = pathAt(h);
  const q = pathAt(h - back);
  const heading = Math.hypot(p.x - q.x, p.y - q.y) > 1e-6 ? Math.atan2(p.y - q.y, p.x - q.x) : p.heading;
  return { p, q, heading };
}

export interface JawPlace {
  readonly offU: number;
  readonly offL: number;
  readonly hingeU: Pt;
  readonly hingeL: Pt;
  readonly tipU: Pt;
  readonly tipL: Pt;
}

/** What the side-on head needs of the neck behind it. */
export interface HeadRoom {
  readonly reach: number;
  readonly side: number;
  /** The skull's top and the chin's underside, which the neck carries on behind the hinges. */
  readonly skull: JawEdge;
  readonly chin: JawEdge;
  /** How far behind the tip the jaw art has faded out. */
  readonly hold: number;
}

/** Art units the skull's back stands off the upper jaw's hinge line, and the chin's off the lower's (anacondaSide.ts). */
export const SKULL_RISE_ART = 12.3;
export const CHIN_DROP_ART = 9.3;
/** Art units behind the hinge where fadeBack has cleared the jaws. */
export const JAW_FADE_ART = 24;
/** World units over which the neck eases from the head's edges to its own. */
export const SEAM_EASE = 260;
/** Over how long the head's edges come down to the meal's, behind the hinges. */
export const SEAM_OVER_BACK = 230;
/** How long the neck's curve onto the path is, in head lengths. */
export const NECK_JOIN = 1.5;

export function headRoom(q: JawPlace, reach: number, side: number, heading: number): HeadRoom {
  const up = axisOf(heading).up;
  const down = { x: -up.x, y: -up.y };
  const k = Math.hypot(q.tipU.x - q.hingeU.x, q.tipU.y - q.hingeU.y) / ANA_JAW_ART;
  return {
    reach,
    side,
    skull: jawEdge(q.hingeU, q.tipU, ANA_JAW_ART, SKULL_RISE_ART, up),
    chin: jawEdge(q.hingeL, q.tipL, ANA_JAW_ART, CHIN_DROP_ART, down),
    hold: reach + JAW_FADE_ART * k,
  };
}

/** The neck just behind the head: straight along the head's axis, easing back onto the path, so a turning head stays joined to it. */
export interface Neck {
  readonly p: Pt;
  readonly q: Pt;
  readonly e: Pt;
  /** How long the head's chord is along the path, and how far the chord really reaches. */
  readonly len: number;
  readonly chord: number;
}

export function neckOf(t: number, head: HeadRoom): Neck {
  const len = TOP_CHORD + (head.reach - TOP_CHORD) * head.side;
  const { p, q, heading } = headAxis(t, len);
  return { p, q, e: { x: Math.cos(heading), y: Math.sin(heading) }, len, chord: Math.hypot(p.x - q.x, p.y - q.y) };
}

/**
 * The body's spine point `d` behind the tip: on the head's straight line near
 * it, then a smooth curve from the head's back onto the path, so on a bend
 * the neck comes off the head at its own angle without pinching.
 */
export function neckAt(n: Neck, h: number, d: number): { x: number; y: number; heading: number } {
  const own = Math.atan2(n.e.y, n.e.x);
  if (d <= n.len) {
    const back = (d * n.chord) / n.len;
    return { x: n.p.x - n.e.x * back, y: n.p.y - n.e.y * back, heading: own };
  }
  const join = n.len * NECK_JOIN;
  if (d >= n.len + join) return pathAt(h - d);
  const u = (d - n.len) / join;
  const end = pathAt(h - n.len - join);
  const m0 = { x: -n.e.x * join, y: -n.e.y * join };
  const m1 = { x: -Math.cos(end.heading) * join, y: -Math.sin(end.heading) * join };
  const [u2, u3] = [u * u, u * u * u];
  const at = (a: number, ma: number, b: number, mb: number): number => (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * ma + (3 * u2 - 2 * u3) * b + (u3 - u2) * mb;
  const rate = (a: number, ma: number, b: number, mb: number): number => (6 * u2 - 6 * u) * a + (3 * u2 - 4 * u + 1) * ma + (6 * u - 6 * u2) * b + (3 * u2 - 2 * u) * mb;
  return {
    x: at(n.q.x, m0.x, end.x, m1.x),
    y: at(n.q.y, m0.y, end.y, m1.y),
    heading: Math.atan2(-rate(n.q.y, m0.y, end.y, m1.y), -rate(n.q.x, m0.x, end.x, m1.x)),
  };
}
