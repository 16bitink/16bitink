import { INK, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { createArt, type Art } from './bake';

/**
 * The common dolphin (Delphinus): long beak, tall swept-back dorsal fin and
 * its hourglass: a dark grey cape over the back dipping to a V under the
 * fin, a tan-yellow patch on the front flank, pale grey behind, white belly,
 * a dark stripe from the eye to the beak. Paper under the washes, the light
 * from above catching the back in broken strokes, hatching below. Beak at
 * +x; the tail stock bends as it beats.
 */

const sc = (pts: readonly Pt[], k: number): Pt[] => pts.map((p) => ({ x: p.x * k, y: p.y * k }));

const BACK: readonly Pt[] = spline([
  { x: 50, y: 1 }, { x: 47, y: -0.8 }, { x: 40, y: -2.4 }, { x: 36, y: -5.6 }, { x: 30, y: -9.4 }, { x: 20, y: -11.6 }, { x: 8, y: -12.3 },
  { x: -5, y: -11.2 }, { x: -18, y: -8.2 }, { x: -30, y: -4.6 }, { x: -40, y: -2.5 }, { x: -44, y: -1.8 },
], 6);
const BELLY: readonly Pt[] = spline([
  { x: 50, y: 1 }, { x: 46, y: 2.8 }, { x: 38, y: 4.4 }, { x: 30, y: 8 }, { x: 18, y: 11 }, { x: 5, y: 11.8 },
  { x: -8, y: 10 }, { x: -20, y: 6.6 }, { x: -32, y: 3.6 }, { x: -40, y: 2.4 }, { x: -44, y: 1.8 },
], 6);
const BODY: readonly Pt[] = [...BACK, ...[...BELLY].reverse()];
const FIN: readonly Pt[] = spline([{ x: 7, y: -12 }, { x: 2, y: -17 }, { x: -5, y: -23 }, { x: -13, y: -27 }, { x: -10, y: -20 }, { x: -9, y: -14 }, { x: -11, y: -10.6 }], 6);
const FLIPPER: readonly Pt[] = spline([{ x: 25, y: 7 }, { x: 19, y: 11 }, { x: 13, y: 17.5 }, { x: 15, y: 12 }, { x: 18, y: 8.6 }], 5);
const FLUKES: readonly Pt[] = spline([{ x: -42, y: -1.6 }, { x: -48, y: -5 }, { x: -55, y: -8.4 }, { x: -52, y: -2 }, { x: -50, y: 0 }, { x: -52, y: 2 }, { x: -55, y: 8.4 }, { x: -48, y: 5 }, { x: -42, y: 1.6 }], 5);
/** The dark cape: the back down to a line that dips into a V under the fin. */
const CAPE: readonly Pt[] = [...BACK, ...spline([{ x: -44, y: -1 }, { x: -30, y: -2 }, { x: -14, y: -2.6 }, { x: -4, y: 4.4 }, { x: 8, y: -1.6 }, { x: 22, y: -3.4 }, { x: 34, y: -2.6 }, { x: 46, y: -0.4 }, { x: 50, y: 1 }], 6)];
const TAN: readonly Pt[] = spline([{ x: 38, y: 0.6 }, { x: 30, y: -1.4 }, { x: 18, y: -2.4 }, { x: 6, y: -0.6 }, { x: -2, y: 5.4 }, { x: 4, y: 8.2 }, { x: 18, y: 7.6 }, { x: 30, y: 4.4 }, { x: 38, y: 0.6 }], 6);
const GREY: readonly Pt[] = spline([{ x: -4, y: 5 }, { x: -14, y: -1.2 }, { x: -30, y: -1.2 }, { x: -42, y: 0.4 }, { x: -32, y: 3 }, { x: -18, y: 6.2 }, { x: -4, y: 5 }], 6);

const DOLPHIN: Art = createArt({ x0: -58, x1: 54, y0: -30, y1: 20 }, 7211, (ctx, k, pen) => {
  const line = Math.max(0.6, Math.min(3.2, 0.13 * k));
  const p = pen(1);
  const flukes = sc(FLUKES, k);
  p.fill(flukes, '#3b4252', 1);
  p.stroke([...flukes, flukes[0]!], line, INK, 0.85);
  const body = sc(BODY, k);
  p.fill(body, '#fbf7ee', 1);
  p.clipped(body, () => {
    p.fill(sc(GREY, k), '#a3a9b2', 0.85);
    p.fill(sc(TAN, k), '#dcb46c', 0.9);
    ctx.translate(0.8 * k, 0.6 * k);
    p.fill(sc(CAPE, k), '#353b4a', 0.96);
    ctx.translate(-0.8 * k, -0.6 * k);
    // Light on the back, broken pale strokes.
    for (let i = 0; i < 7; i++) p.hair(sc([{ x: 34 - i * 9, y: -9.4 + Math.abs(i - 3) * 0.9 }, { x: 28 - i * 9, y: -9.6 + Math.abs(i - 3) * 0.9 }], k), line * 0.9, '#8f9bb0', 0.75);
    // Shade along the belly.
    p.hatch(body, Math.max(1.4, 1.5 * k), 0.75, line * 0.33, { onlyBelow: 7 * k, alpha: 0.3 });
    // The eye stripe to the beak and the crease at the melon.
    p.stroke(sc([{ x: 34, y: -1.6 }, { x: 40, y: -1.4 }, { x: 46, y: -0.2 }], k), 0.9 * k, '#2a2f3a', 0.8, false);
  });
  p.stroke([...body, body[0]!], line, INK, 0.9);
  p.hair(sc([{ x: 50, y: 1 }, { x: 44, y: 1.4 }, { x: 40, y: 1.2 }], k), line * 0.8, INK, 0.8);
  p.hair(sc([{ x: 40, y: -2.4 }, { x: 38, y: -1 }], k), line * 0.6, INK, 0.6);
  // The eye.
  p.dot(33.6 * k, -1.8 * k, 1.3 * k, '#121318', 1);
  p.dot(33.2 * k, -2.2 * k, 0.4 * k, '#ffffff', 0.9);
  // The dorsal fin and the near flipper.
  const f = pen(2);
  const fin = sc(FIN, k);
  f.fill(fin, '#323846', 1);
  f.hair(sc([{ x: 3, y: -15 }, { x: -9, y: -24 }], k), line * 0.6, '#7d889c', 0.7);
  f.stroke(fin, line, INK, 0.9);
  const flip = sc(FLIPPER, k);
  f.fill(flip, '#3b4252', 1);
  f.stroke([...flip, flip[0]!], line, INK, 0.85);
}, { from: -18, to: -56, amp: 5 });

export function drawDolphin(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, facing: 1 | -1, alpha = 1): void {
  DOLPHIN.draw(ctx, x, y, length, facing === 1 ? angle : Math.PI - angle, t, { flip: facing === -1, beat: t * 7, alpha });
}

export const prepareDolphin = (): void => DOLPHIN.prepare();
