/** Small shared shapes and easing for the screen kit. */

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export interface Pt { readonly x: number; readonly y: number }

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
export const smooth = (u: number): number => {
  const c = clamp01(u);
  return c * c * (3 - 2 * c);
};
/** 0 → 1 over [from, to], smoothly. */
export const ramp = (t: number, from: number, to: number): number => smooth((t - from) / (to - from));
/** An overshooting pop-in, 0 → ~1.1 → 1 over `dur` s from `at` (0 before). */
export function pop(t: number, at: number, dur = 0.35): number {
  const u = (t - at) / dur;
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const c = 1.70158 * 1.4;
  const v = u - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
}

export const lerpRect = (a: Rect, b: Rect, u: number): Rect => ({
  x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), w: lerp(a.w, b.w, u), h: lerp(a.h, b.h, u),
});
export const inset = (r: Rect, d: number): Rect => ({ x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d });
/** Splits `r` left|right at fraction `f` of its width, with a `gap` between. */
export function splitH(r: Rect, f: number, gap = 0): readonly [Rect, Rect] {
  const w1 = (r.w - gap) * f;
  return [{ x: r.x, y: r.y, w: w1, h: r.h }, { x: r.x + w1 + gap, y: r.y, w: r.w - w1 - gap, h: r.h }];
}
/** Splits `r` top/bottom at fraction `f` of its height, with a `gap` between. */
export function splitV(r: Rect, f: number, gap = 0): readonly [Rect, Rect] {
  const h1 = (r.h - gap) * f;
  return [{ x: r.x, y: r.y, w: r.w, h: h1 }, { x: r.x, y: r.y + h1 + gap, w: r.w, h: r.h - h1 - gap }];
}

export function roundRect(ctx: CanvasRenderingContext2D, r: Rect, rad: number): void {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, rad);
}

/** Clips to `r` (rounded by `rad`) for the duration of `draw`. */
export function clipped(ctx: CanvasRenderingContext2D, r: Rect, draw: () => void, rad = 0): void {
  ctx.save();
  roundRect(ctx, r, rad);
  ctx.clip();
  draw();
  ctx.restore();
}

/** A deterministic hash in 0..1 (for jitter that must not change between frames). */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Position along a polyline at arc-length fraction `u` (0..1), with the heading there. */
export function alongPolyline(pts: readonly Pt[], u: number): { readonly p: Pt; readonly angle: number } {
  if (pts.length < 2) return { p: pts[0] ?? { x: 0, y: 0 }, angle: 0 };
  const lens: number[] = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  const target = clamp01(u) * lens[lens.length - 1]!;
  let i = 1;
  while (i < pts.length - 1 && lens[i]! < target) i++;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const seg = lens[i]! - lens[i - 1]! || 1;
  const f = (target - lens[i - 1]!) / seg;
  return { p: { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) }, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

export function polylineLength(pts: readonly Pt[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return s;
}

/** Fonts: Caveat is the game's hand (loaded by the promo page); Menlo is the Mac's code face (the recorder runs on a Mac). */
export const HAND = 'Caveat';
export const MONO = 'Menlo, "SF Mono", Consolas, monospace';
