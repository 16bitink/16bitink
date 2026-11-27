import {
  clamp01, countAt, drawGameBird, drawGameFish, drawGameItem, drawHitbox, drawReadout, drawSea, drawTargetArrow, lerp, ramp, smooth, DEBUG, type Pt, type Rect,
} from '../devstory/screen';
import { DUCK_PERIOD, ENDS_AT, ESCAPE_AT, GULL_AT, STEALS_AT, SURFACE_AT, SWITCH_AT, DECOYS_AT, MISS_AT, wrap } from './story';

/** The game preview's world: a night sea, the rubber ducks (all dimensions relative to the viewport `r`). */
export const SURF = 0.52;
const OFFSETS = [0.25, (((-ENDS_AT / DUCK_PERIOD) % 1) + 1) % 1, 0.83] as const;
const DUCK_W = 80;

export const surfaceOf = (r: Rect): number => r.y + r.h * SURF;

/** Duck k rising through the sky (periodic: the loop's frame 1 comes back unbroken). */
export function duckAt(k: number, t: number, r: Rect): { readonly x: number; readonly y: number; readonly rot: number; readonly u: number } {
  const u = (((t / DUCK_PERIOD + OFFSETS[k]!) % 1) + 1) % 1;
  const rise = u * (surfaceOf(r) - r.y + 70);
  return {
    x: r.x + r.w * (0.27 + 0.23 * k) + 26 * Math.sin(t * 1.7 + k * 2.1),
    y: surfaceOf(r) - 8 - rise,
    rot: 0.16 * Math.sin(t * 3.1 + k),
    u,
  };
}

/** How much the fish stare up: 1 in frame 1, back to 1 for the closing seam. */
const stare = (t: number): number => 1 - ramp(t, DECOYS_AT - 0.6, DECOYS_AT) + ramp(t, MISS_AT + 0.6, MISS_AT + 1.2) * (1 - 0);

export function sharkAt(t: number, r: Rect): { readonly x: number; readonly y: number; readonly facing: 1 | -1; readonly tilt: number } {
  const surf = surfaceOf(r);
  const d0 = duckAt(0, t, r);
  const enter = smooth((t - 3.0) / (SWITCH_AT - 3.0));
  const home = { x: lerp(r.x + r.w * 1.05, r.x + r.w * 0.62, enter), y: surf + r.h * 0.3 };
  const chase = smooth((t - SWITCH_AT) / 0.9);
  const x = lerp(home.x, d0.x + 70, chase);
  const y = lerp(home.y, surf + 46 + 14 * Math.sin(t * 2.4), chase);
  return { x, y, facing: -1, tilt: lerp(0.0, 0.5, chase) };
}

/** Where the preview's gull and the rescued duck are while the gull steals it. */
export function gullAt(t: number, r: Rect): { readonly gull: Pt; readonly dive: boolean; readonly duck: Pt | null } | null {
  const start = GULL_AT - 0.55;
  if (t < start || t > STEALS_AT + 1.2) return null;
  const surf = surfaceOf(r);
  const target = { x: r.x + r.w * 0.5, y: surf - 4 };
  const away = { x: r.x - 120, y: r.y - 80 };
  const from = { x: r.x + r.w + 70, y: r.y + r.h * 0.12 };
  const dive0 = STEALS_AT - 0.55;
  const grab = STEALS_AT - 0.05;
  if (t < dive0) {
    const u = (t - start) / (dive0 - start);
    return { gull: { x: lerp(from.x, r.x + r.w * 0.7, smooth(u)), y: lerp(from.y, r.y + r.h * 0.2, u) + 8 * Math.sin(t * 6) }, dive: false, duck: null };
  }
  if (t < grab) {
    const u = smooth((t - dive0) / (grab - dive0));
    return { gull: { x: lerp(r.x + r.w * 0.7, target.x + 10, u), y: lerp(r.y + r.h * 0.2, target.y - 40, u) }, dive: true, duck: null };
  }
  const u = smooth((t - grab) / 1.0);
  const g = { x: lerp(target.x + 10, away.x, u), y: lerp(target.y - 40, away.y, u * u) };
  return { gull: g, dive: false, duck: { x: g.x - 6, y: g.y + 44 } };
}

/** Where the settled duck is after the fix: it rises from below and stops at the waterline, then bobs. */
export function floatingDuck(t: number, r: Rect): Pt | null {
  if (t < SURFACE_AT) return null;
  const surf = surfaceOf(r);
  const u = (t - SURFACE_AT) / 0.7;
  const rise = u < 1 ? (1 - smooth(u)) * 150 : 0;
  const bob = u < 1 ? 0 : Math.sin((t - SURFACE_AT) * 3.2) * 3;
  return { x: r.x + r.w * 0.5 + (u >= 1 ? Math.sin((t - SURFACE_AT) * 0.9) * 10 : 0), y: surf + 4 + rise + bob };
}

export interface WorldOpts {
  /** Size factor: 1 in the normal preview, ~2.3 when the preview fills the screen. */
  readonly k: number;
  /** Ducks flying (frame 1 .. escape; the ghosts after the fix). */
  readonly skyDucks: number;
  /** Fish and sharks in the water. */
  readonly water: boolean;
}

function drawFish(c: CanvasRenderingContext2D, r: Rect, t: number, k: number): void {
  const surf = surfaceOf(r);
  const s = stare(t);
  const up = (s: number, a: number, b: number): number => lerp(a, b, s);
  drawGameFish(c, { shape: 'inkling', x: r.x + r.w * 0.2, y: surf + r.h * 0.3, length: 112 * k, facing: 1, tilt: up(s, 0, 0.95) }, t);
  drawGameFish(c, { shape: 'inkling', x: r.x + r.w * 0.44, y: surf + r.h * 0.37, length: 78 * k, facing: 1, tilt: up(s, 0, 1.05), variant: 'heavy' }, t + 0.4);
  drawGameFish(c, { shape: 'inkling', x: r.x + r.w * 0.34, y: surf + r.h * 0.2, length: 60 * k, facing: 1, tilt: up(s, 0, 1.1) }, t + 0.9);
}

/** Draws the preview's contents into `r` at loop time t. */
export function drawWorld(c: CanvasRenderingContext2D, r: Rect, t0: number, o: WorldOpts): void {
  const t = wrap(t0);
  const surf = surfaceOf(r);
  drawSea(c, r, t, { surfaceY: surf, night: 0.92, depth: 0.55 });
  if (o.water) {
    drawFish(c, r, t, o.k);
    if (t > 3.0 && t < ESCAPE_AT) {
      const s = sharkAt(t, r);
      drawGameFish(c, { shape: 'shark', variant: 'heavy', x: s.x, y: s.y, length: 230 * o.k, facing: s.facing, tilt: s.tilt }, t);
      const nose = { x: s.x - 105 * o.k, y: s.y - 6 };
      const you = { x: r.x + r.w * 0.2 + 30, y: surf + r.h * 0.3 - 20 };
      const d0 = duckAt(0, t, r);
      if (t < SWITCH_AT) {
        drawTargetArrow(c, nose, you, { t, at: 3.5, label: 'target: you', bend: 0.3 });
      } else if (t < ENDS_AT - 0.3) {
        drawTargetArrow(c, nose, { x: d0.x + 14, y: d0.y + 36 }, { t, at: SWITCH_AT, label: 'target: duck', bend: -0.3 });
      }
    }
  }
  const sky = t < ESCAPE_AT || t > MISS_AT + 0.4;
  if (sky && o.skyDucks > 0) {
    const fadeIn = t > MISS_AT ? ramp(t, MISS_AT + 0.4, MISS_AT + 1.1) : 1;
    c.save();
    c.globalAlpha *= fadeIn * o.skyDucks;
    for (let k = 0; k < 3; k++) {
      const d = duckAt(k, t, r);
      drawGameItem(c, 'duck', { x: d.x, y: d.y, width: DUCK_W * o.k, facing: 1, rot: d.rot }, t);
      const hero = k === 1 && t >= ENDS_AT && t < ESCAPE_AT;
      drawHitbox(c, { x: d.x - 44 * o.k, y: d.y - 42 * o.k, w: 88 * o.k, h: 84 * o.k }, { t, label: hero ? 'duck.y < 0' : `decoy#${k + 1}`, color: hero ? DEBUG.bad : DEBUG.box });
    }
    c.restore();
  }
  // "where the water ends": the readout counts into the negatives.
  if (t > ENDS_AT - 0.5 && t < ESCAPE_AT + 0.6) {
    const n = countAt(t, 0, -12480, ENDS_AT + 0.1, ESCAPE_AT + 0.1, 2.2);
    drawReadout(c, r.x + r.w / 2, r.y + 44, { label: 'duck.y', value: Math.round(n.value), t, bad: n.value < -3, size: 30, anchor: 'center' });
  }
  if (o.k > 1.5 && sky && o.skyDucks > 0) {
    const d1 = duckAt(1, t, r);
    const fadeIn = t > MISS_AT ? ramp(t, MISS_AT + 0.4, MISS_AT + 1.1) : 1;
    c.save();
    c.globalAlpha *= fadeIn;
    drawReadout(c, d1.x, d1.y - 62 * o.k, { label: 'duck.y', value: -Math.round((surf - d1.y) * 5), t, bad: true, size: 36, anchor: 'center' });
    c.restore();
  }
  const f = floatingDuck(t, r);
  const g = gullAt(t, r);
  if (f && !(g && g.duck)) {
    drawGameItem(c, 'duck', { x: f.x, y: f.y, width: DUCK_W * o.k, facing: 1, rot: Math.sin(t * 2.6) * 0.06 }, t);
    if (t < STEALS_AT - 0.5) drawHitbox(c, { x: f.x - 44 * o.k, y: f.y - 38 * o.k, w: 88 * o.k, h: 76 * o.k }, { t, label: 'duck.y = surface', at: SURFACE_AT + 0.5, color: '#9bff8a' });
    if (t < STEALS_AT - 0.2) drawReadout(c, r.x + r.w / 2, r.y + 44, { label: 'duck.y', value: 0, t, size: 30, anchor: 'center' });
  }
  if (g) {
    if (g.duck) drawGameItem(c, 'duck', { x: g.duck.x, y: g.duck.y, width: DUCK_W * 0.9 * o.k, facing: 1, rot: 0.5 * Math.sin(t * 12) }, t);
    drawGameBird(c, 'gull', { x: g.gull.x, y: g.gull.y, width: 250 * o.k, facing: 1 }, t, 7, g.dive);
  }
}

export { clamp01 };
