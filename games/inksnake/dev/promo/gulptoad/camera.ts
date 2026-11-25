import { curveAt, type Key, ramp } from '../short';
import type { Pt } from '../sprites';
import { DRIFT } from './path';
import { BITE_AT, GULP_AT, HEAVES, LOOP_S, SPURT } from './story';

/**
 * The camera, as the hen short's: close on the swallow, a wide shot over the
 * crawl. Over the loop the snake grows GROW times and the camera pulls back
 * as much, so the snake and the next toad draw the same on screen as they
 * did and only the ground shows the change: it zooms out for good and
 * crossfades into itself (groundAt).
 */
export const GROW = 1.2;
export const SCREEN_ANCHOR: Pt = { x: 540, y: 800 };

const spring = (s: number): number => 1 - Math.exp(-8 * s) * Math.cos(13 * s);

/** How far the camera has pulled back to make up for the growth, 0 .. 1, after you've seen it grow. */
const pull = (t: number): number => ramp(t, 6.4, 8.4);
/** The snake's growth: a springy spurt on "Bigger!". */
export const growth = (t: number): number => (t <= SPURT ? 1 : GROW ** spring(t - SPURT));
/** Screen px per world unit on frame 1. */
const BASE_ZOOM = 0.97;
/** A step back to fit the whole lump in, then the wide shot over the crawl; 1 on frame 1. */
const wide = (t: number): number => BASE_ZOOM * (1 - 0.24 * ramp(t, 4.1, 5.3) - 0.04 * ramp(t, 6.4, 8.4) + 0.28 * ramp(t, 10.5, 11.75));

export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

const C0 = { x: -190, y: 10 };
const camKeys = (pick: (p: Pt) => number): readonly Key[] => [
  { t: 0, at: pick(C0), rate: 0 },
  { t: BITE_AT, at: pick(C0) },
  { t: 3.9, at: pick({ x: -420, y: 70 }) },
  { t: 5.2, at: pick({ x: -630, y: 150 }) },
  { t: 6.1, at: pick({ x: -632, y: 160 }), rate: 0 },
  { t: 6.6, at: pick({ x: -690, y: 165 }) },
  { t: 7.4, at: pick({ x: -960, y: 130 }) },
  { t: 8.1, at: pick({ x: -1340, y: -20 }) },
  { t: 9.5, at: pick({ x: -1400, y: -600 }) },
  { t: 10.2, at: pick({ x: DRIFT.x - 170, y: DRIFT.y + 80 }) },
  { t: 11.75, at: pick({ x: C0.x + DRIFT.x, y: C0.y + DRIFT.y }), rate: 0 },
  { t: LOOP_S, at: pick({ x: C0.x + DRIFT.x, y: C0.y + DRIFT.y }), rate: 0 },
];
const CAM_X = camKeys((p) => p.x);
const CAM_Y = camKeys((p) => p.y);

export function viewAt(t: number): View {
  return { x: curveAt(CAM_X, t).at, y: curveAt(CAM_Y, t).at, zoom: (growth(t) * wide(t)) / GROW ** pull(t) };
}

/** World to screen, shake not included. */
export const toScreen = (v: View, p: Pt): Pt => ({ x: SCREEN_ANCHOR.x + (p.x - v.x) * v.zoom, y: SCREEN_ANCHOR.y + (p.y - v.y) * v.zoom });

export interface GroundLayer {
  /** Screen px per ground unit, and where the ground's origin lands. */
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

/**
 * The ground: the sand crawling under the snake, zooming out for good by
 * GROW a loop. Two copies, the second GROW times bigger and placed so it is
 * at the end of the loop just what the first is at its start; the second
 * fades in over the wide shot, so the end flows into frame 1.
 */
export function groundAt(t: number): readonly [GroundLayer, GroundLayer] {
  const v = viewAt(t);
  const zoom = v.zoom / growth(t) / BASE_ZOOM;
  const trackOf = (u: number): Pt => {
    const c = { x: curveAt(CAM_X, u).at, y: curveAt(CAM_Y, u).at };
    if (u <= SPURT) return c;
    const s = { x: curveAt(CAM_X, SPURT).at, y: curveAt(CAM_Y, SPURT).at };
    return { x: s.x + GROW * (c.x - s.x), y: s.y + GROW * (c.y - s.y) };
  };
  const c = trackOf(t);
  const [c0, c1] = [trackOf(0), trackOf(LOOP_S)];
  const first = { zoom, x: SCREEN_ANCHOR.x - c.x * zoom, y: SCREEN_ANCHOR.y - c.y * zoom, alpha: 1 };
  const second = {
    zoom: zoom * GROW,
    x: SCREEN_ANCHOR.x + (c1.x - c.x) * zoom - c0.x * zoom * GROW,
    y: SCREEN_ANCHOR.y + (c1.y - c.y) * zoom - c0.y * zoom * GROW,
    alpha: ramp(t, 6.8, 10),
  };
  return [first, second];
}

/** Screen shake, px. */
export function shakeAt(t: number): Pt {
  const jolts = [{ at: BITE_AT, amp: 10 }, ...HEAVES.map((h) => ({ at: h + 0.1, amp: 9 })), { at: GULP_AT, amp: 20 }, { at: SPURT, amp: 7 }];
  return jolts.reduce<Pt>((sum, j) => {
    const s = t - j.at;
    if (s < 0 || s > 0.3) return sum;
    const amp = j.amp * (1 - s / 0.3) ** 2;
    return { x: sum.x + amp * Math.sin(s * 120), y: sum.y + amp * 0.7 * Math.cos(s * 150) };
  }, { x: 0, y: 0 });
}
