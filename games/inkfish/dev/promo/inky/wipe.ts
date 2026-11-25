import { VIDEO } from '../short';
import type { Pt } from '../octopus/geom';
import { NIGHT_LIGHT } from './hall';
import { drawTube, glow } from './paint';
import { wipeAt } from './story';

/** The closing wipe: a huge arm, suckers on the lens, sweeping across the frame. */

/** Wide enough to cover the whole frame at its middle, tilt and all. */
export const WIPE_R = 760;
const TILT = 0.09;

/** The arm's middle line at wipe position u (0 .. 1), off the frame on both ends. */
export function wipePath(u: number): Pt[] {
  const x = -WIPE_R - 160 + (VIDEO.width + 2 * (WIPE_R + 160)) * u;
  return Array.from({ length: 9 }, (_, i) => {
    const y = -300 + (i / 8) * (VIDEO.height + 600);
    return { x: x + (y - VIDEO.height / 2) * TILT + 26 * Math.sin(i * 0.9 + u * 5), y };
  });
}

export function drawWipe(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const u = wipeAt(t);
  if (u <= 0) return;
  const path = wipePath(u);
  const mid = path[4]!;
  glow(ctx, mid.x, mid.y, WIPE_R * 1.5, 1600, [2, 4, 10], 0.6);
  drawTube(ctx, { path, radius: () => WIPE_R, n: 120, band: () => 0.12, seed: 7101, boil, pressed: true, suckerK: 0.25, detail: 0.7, line: 9 }, { ...NIGHT_LIGHT, ambient: 0.3 });
}
