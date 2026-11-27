import { drawGameFish, drawGameItem, smooth, type Pt, type Rect } from '../devstory/screen';
import { ESCAPE_AT } from './story';
import { duckAt, sharkAt, surfaceOf } from './world';

/** Ducks (and the sharks after them) leaving the game window: drawn over the bezel, in screen space, before Dewy. */
const DUR = 1.75;

/** Catmull-Rom through `pts` at u in 0..1. */
export function through(pts: readonly Pt[], u: number): Pt {
  const n = pts.length - 1;
  const s = Math.min(Math.max(u, 0), 0.9999) * n;
  const i = Math.floor(s);
  const f = s - i;
  const p = (j: number): Pt => pts[Math.min(n, Math.max(0, j))]!;
  const cr = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f ** 3);
  return { x: cr(p(i - 1).x, p(i).x, p(i + 1).x, p(i + 2).x), y: cr(p(i - 1).y, p(i).y, p(i + 1).y, p(i + 2).y) };
}

/** Waypoints after the start: A past the left ear, B past the right ear, C straight up and out. */
const TAILS: readonly (readonly Pt[])[] = [
  [{ x: 600, y: 380 }, { x: 330, y: 250 }, { x: 120, y: 470 }, { x: 150, y: 830 }, { x: 320, y: 1040 }, { x: 110, y: 1220 }, { x: -200, y: 1300 }],
  [{ x: 900, y: 330 }, { x: 1010, y: 560 }, { x: 960, y: 860 }, { x: 760, y: 1040 }, { x: 960, y: 1210 }, { x: 1300, y: 1290 }],
  [{ x: 760, y: 190 }, { x: 860, y: -60 }, { x: 900, y: -300 }],
];
const DELAY = [0, 0.2, 0.4] as const;
const SHARK_LAG = 0.4;

export function drawEscapes(c: CanvasRenderingContext2D, t: number, view: Rect): void {
  if (t < ESCAPE_AT || t > ESCAPE_AT + DUR + 1.0) return;
  const surf = surfaceOf(view);
  // Sharks first (they follow), then the ducks in front of them.
  for (const k of [0, 1] as const) {
    const sh = sharkAt(ESCAPE_AT, view);
    const start = { x: duckAt(k, ESCAPE_AT, view).x, y: surf + 40 };
    void sh;
    const path = [start, ...TAILS[k]!];
    const u = (t - ESCAPE_AT - DELAY[k]! - SHARK_LAG) / DUR;
    if (u <= 0 || u >= 1.05) continue;
    const e = smooth(u) * 0.35 + u * 0.65;
    const p = through(path, e);
    const q = through(path, Math.min(1, e + 0.02));
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const grow = 1 + 0.7 * smooth(Math.min(1, e * 1.4));
    drawGameFish(c, { shape: 'shark', variant: 'heavy', x: p.x, y: p.y, length: 230 * grow, facing: dx < 0 ? -1 : 1, tilt: Math.atan2(-dy, Math.abs(dx)) }, t);
  }
  for (const k of [0, 1, 2] as const) {
    const path = [{ x: duckAt(k, ESCAPE_AT, view).x, y: duckAt(k, ESCAPE_AT, view).y }, ...TAILS[k]!];
    const u = (t - ESCAPE_AT - DELAY[k]!) / DUR;
    if (u <= 0 && k > 0) {
      const d = duckAt(k, t, view);
      drawGameItem(c, 'duck', { x: d.x, y: d.y, width: 80, facing: 1, rot: d.rot }, t);
      continue;
    }
    if (u >= 1.05) continue;
    const e = Math.max(0, smooth(u) * 0.35 + u * 0.65);
    const p = through(path, e);
    const grow = 1 + 1.6 * smooth(Math.min(1, e * 1.4));
    drawGameItem(c, 'duck', { x: p.x, y: p.y, width: 80 * grow, facing: 1, rot: 0.3 * Math.sin(t * 9 + k) }, t);
  }
}
