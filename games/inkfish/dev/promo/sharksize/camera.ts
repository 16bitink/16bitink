import { FRAME } from '../descent/frame';
import { EXTRAS, GHOSTS, STANDS } from './facts';
import { STEPS, YOU_M, stepAt } from './ladder';
import { T, VIDEO_S } from './timeline';

/**
 * The one stage: the sand along the bottom, you standing on it, the step's
 * shark gliding in from the right with its snout tip at the anchor. World
 * metres, x to the right, y up from the sand. The camera only ever changes
 * its width (metres across the frame): the anchor stays at the same screen
 * spot and the sand at the same line, so as the sharks grow the camera zooms
 * out in log space and you shrink beside them. It widens ahead of every
 * ghost (a claimed size) and comes back after.
 */

const W = FRAME.width;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Where the sand is and where the anchor (the step shark's snout tip) lands on screen. */
export const GROUND_Y = 985;
export const SNOUT_X = 640;
/** The share of the frame's width a step's shark takes. */
const FILL = 0.52;

/** The step shark's snout tip, world metres, for a shark `len` long: just right of you, a little above the sand. */
export const snoutOf = (len: number): Pt => ({ x: 0.22 + 0.1 * len, y: 0.03 + 0.15 * len });

/** The cold open frames the whale shark's head beside you. */
const OPEN_WIDTH = 11;

/** The width the frame wants at t, before smoothing. */
function target(t: number): number {
  const i = stepAt(t);
  let w = i < 0 ? OPEN_WIDTH : STEPS[i]!.length / FILL;
  for (const g of GHOSTS) {
    if (t < g.from || t >= g.until) continue;
    const len = g.shrink && t >= g.shrink.at + 0.6 ? g.shrink.length : g.length;
    w = Math.max(w, (len * 1.06) / 0.62 + (g.lift ?? 0) * 0.5);
  }
  for (const s of STANDS) if (t >= s.from && t < s.until) w = Math.max(w, ((s.length + 0.5) * W) / GROUND_Y);
  for (const e of EXTRAS) {
    if (t < e.from || t >= e.until) continue;
    const len = Math.max(e.length, e.grow ?? 0);
    w = Math.max(w, (e.x + len + 0.5) / 0.6, ((e.y + len * 0.25 + 0.4) * W) / (GROUND_Y - 120));
  }
  // The whole you stays in view from the bull shark on.
  if (i >= 4) w = Math.max(w, ((YOU_M + 0.4) * W) / (GROUND_Y - 220));
  return w;
}

const DT = 1 / 30;
const N = Math.ceil(VIDEO_S / DT) + 2;
const LEAD = Math.round(1.2 / DT);
const HALF = Math.round(0.8 / DT);

/** log width per frame: widened 1.2 s ahead (max over the lead), then averaged over ±0.8 s. The slam into the first step is quick. */
const LOG_WIDTH: Float64Array = (() => {
  const raw = Float64Array.from({ length: N }, (_, k) => Math.log(target(k * DT)));
  const led = raw.map((_, k) => {
    let m = -Infinity;
    for (let j = k; j <= Math.min(N - 1, k + LEAD); j++) m = Math.max(m, raw[j]!);
    return m;
  });
  const out = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, k - HALF); j <= Math.min(N - 1, k + HALF); j++) {
      s += led[j]!;
      n++;
    }
    out[k] = s / n;
  }
  // The slam: from the whale shark's head straight down to the 8-inch shark, over 0.9 s, no lead.
  const a = Math.round((T.this0 - 0.2) / DT);
  const b = Math.round((T.this0 + 0.7) / DT);
  const from = Math.log(OPEN_WIDTH);
  for (let k = Math.max(0, a - LEAD - HALF); k < a; k++) out[k] = Math.max(out[k]!, from);
  for (let k = a; k <= b; k++) {
    const u = (k - a) / (b - a);
    const e = u * u * (3 - 2 * u);
    out[k] = from + (raw[b]! - from) * e;
  }
  return out;
})();

/** Frame width at t, metres. */
export function widthAt(t: number): number {
  const k = Math.max(0, Math.min(N - 1, t / DT));
  const i = Math.floor(k);
  const j = Math.min(N - 1, i + 1);
  return Math.exp(LOG_WIDTH[i]! + (LOG_WIDTH[j]! - LOG_WIDTH[i]!) * (k - i));
}

export interface Camera {
  /** px per metre. */
  readonly scale: number;
  /** The anchor's world x (the step shark's snout). */
  readonly anchor: number;
}

/** The anchor follows the step's snout tip, eased between steps like the width. */
export function cameraAt(t: number): Camera {
  const w = widthAt(t);
  // The anchor slides with the frame: the snout of a shark that fills it.
  return { scale: W / w, anchor: snoutOf(w * FILL).x };
}

export const toScreen = (cam: Camera, p: Pt): Pt => ({ x: SNOUT_X + (p.x - cam.anchor) * cam.scale, y: GROUND_Y - p.y * cam.scale });
