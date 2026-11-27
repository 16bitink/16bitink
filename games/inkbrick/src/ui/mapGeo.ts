import type { Shells } from '../app/save';
import { MAP_POINTS } from '../art/manifest';
import type { Gate } from '../level/index';

/** The map's sums, apart from the DOM (src/ui/mapScreen.ts): node spots, the next level, the coast's crop, the trail. */

/** The coast map image's size (the manifest's MAP_POINTS are in its px). */
export const MAP_W = 1920;
export const MAP_H = 1080;

/** Node centres in % of the screen: across in landscape, upward in portrait. */
export function nodeSpot(i: number, portrait: boolean): { x: number; y: number } {
  if (portrait) return { x: 50 + Math.sin(i * 1.15) * 28, y: 88 - i * 6.6 };
  return { x: 9 + i * 9.2, y: 62 + Math.sin(i * 0.95) * 16 };
}

/** The level to play next: the first open one not cleared yet (only it bobs in green). */
export function nextLevel(levels: readonly number[], d: { readonly gate: (n: number) => Gate; readonly shells: (n: number) => Shells | undefined }): number | null {
  return levels.find((n) => d.gate(n) === 'play' && !d.shells(n)?.[0]) ?? null;
}

/** Portrait: the painted coast at the screen's height, slid so the place sits mid-screen (CSS background size and position). */
export function coastCrop(chapter: number, w: number, h: number): { size: string; pos: string } {
  const s = h / MAP_H;
  const iw = MAP_W * s;
  const p = MAP_POINTS[chapter]!;
  const x = Math.max(w - iw, Math.min(0, w / 2 - p.x * s));
  return { size: `${iw}px ${h}px`, pos: `${x}px 0` };
}

/** A smooth path (SVG, in % of the screen) through the portrait nodes `from`..`to` (indexes 0-9). */
export function trailPath(from: number, to: number): string {
  const pts = Array.from({ length: to - from + 1 }, (_, i) => nodeSpot(from + i, true));
  if (pts.length < 2) return '';
  const f = (n: number): string => n.toFixed(2);
  let d = `M${f(pts[0]!.x)} ${f(pts[0]!.y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    d += ` Q${f(a.x)} ${f(a.y)} ${f((a.x + b.x) / 2)} ${f((a.y + b.y) / 2)}`;
  }
  const last = pts[pts.length - 1]!;
  return `${d} L${f(last.x)} ${f(last.y)}`;
}
