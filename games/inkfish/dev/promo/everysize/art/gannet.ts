import { INK, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { createArt, type Art } from './bake';

/**
 * A Cape gannet in its dive, wings folded back into an arrow: white body and
 * coverts, black flight feathers along the trailing edge, an all-black tail,
 * the buff-yellow head, the blue-grey dagger of a bill and the black stripe
 * of bare skin down its throat. Painted like the game's fish: paper, a wash
 * laid a little off the outline, hatching on the shaded underside. Bill at
 * +x. drawGannetDive adds its trail: a streak of bubbles once it's in.
 */

const sc = (pts: readonly Pt[], k: number): Pt[] => pts.map((p) => ({ x: p.x * k, y: p.y * k }));

const BODY: readonly Pt[] = spline([
  { x: 33, y: -2.6 }, { x: 28, y: -6 }, { x: 20, y: -7.2 }, { x: 10, y: -8.6 }, { x: -4, y: -9.4 }, { x: -18, y: -8 }, { x: -30, y: -4.4 },
  { x: -34, y: 0 }, { x: -30, y: 4.4 }, { x: -18, y: 7.8 }, { x: -4, y: 9.2 }, { x: 10, y: 8.2 }, { x: 20, y: 6.6 }, { x: 28, y: 5.2 }, { x: 33, y: 2.4 },
], 6);
const BILL: readonly Pt[] = [{ x: 50, y: 0.3 }, { x: 40, y: -2 }, { x: 32, y: -3.2 }, { x: 32, y: 2.8 }, { x: 40, y: 1.6 }];
const HEAD: readonly Pt[] = spline([{ x: 33, y: -2.6 }, { x: 28, y: -6.4 }, { x: 18, y: -7.4 }, { x: 14, y: -2 }, { x: 18, y: 6.4 }, { x: 28, y: 5.6 }, { x: 33, y: 2.4 }], 6);
/** The near wing folded along the back, shoulder to crossed tips. */
const WING: readonly Pt[] = spline([
  { x: 14, y: -6 }, { x: 4, y: -10.8 }, { x: -12, y: -12 }, { x: -30, y: -9.6 }, { x: -46, y: -5.2 }, { x: -52, y: -3.4 },
  { x: -44, y: -2.2 }, { x: -26, y: -2.6 }, { x: -8, y: -3.4 }, { x: 8, y: -3.8 },
], 6);
const PRIMARIES: readonly Pt[] = spline([{ x: -18, y: -11.6 }, { x: -30, y: -9.6 }, { x: -46, y: -5.2 }, { x: -52, y: -3.4 }, { x: -44, y: -2.2 }, { x: -26, y: -2.6 }, { x: -16, y: -3 }], 6);
const TAIL: readonly Pt[] = [{ x: -30, y: -3 }, { x: -48, y: -2.4 }, { x: -54, y: 0 }, { x: -48, y: 2.6 }, { x: -30, y: 3.4 }];

const GANNET: Art = createArt({ x0: -58, x1: 54, y0: -16, y1: 13 }, 6113, (ctx, k, pen) => {
  const line = Math.max(0.6, Math.min(3, 0.13 * k));
  const p = pen(1);
  // Tail first, under the body.
  p.fill(sc(TAIL, k), '#1e1d22', 1);
  p.stroke(sc([...TAIL, TAIL[0]!], k), line, INK, 0.8);
  // The body: paper white, shaded cool underneath.
  const body = sc(BODY, k);
  p.fill(body, '#fbf8f0', 1);
  p.clipped(body, () => {
    const g = ctx.createLinearGradient(0, -9 * k, 0, 9 * k);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(150,170,190,0.18)');
    g.addColorStop(1, 'rgba(90,110,140,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(-40 * k, -10 * k, 80 * k, 20 * k);
    p.hatch(body, Math.max(1.5, 1.6 * k), 0.9, line * 0.35, { onlyBelow: 3 * k, alpha: 0.3 });
  });
  p.stroke([...body, body[0]!], line, INK, 0.85);
  // The head: buff-yellow, and the bill.
  const head = sc(HEAD, k);
  const h = pen(2);
  h.fill(head, '#f2d98c', 1);
  h.clipped(head, () => {
    ctx.translate(0.8 * k, 0.6 * k);
    h.fill(head, '#e2b85a', 0.6);
    ctx.translate(-0.8 * k, -0.6 * k);
  });
  const bill = sc(BILL, k);
  h.fill(bill, '#a9b6c4', 1);
  h.hair(sc([{ x: 49, y: 0.3 }, { x: 33, y: 0 }], k), line * 0.7, INK, 0.8);
  h.stroke([...bill, bill[0]!], line, INK, 0.9);
  // The black stripe of skin round the eye and down the throat.
  h.stroke(sc([{ x: 33, y: -2.2 }, { x: 29, y: -2.4 }, { x: 27, y: -1.6 }], k), 1.4 * k, '#141318', 0.95, false);
  h.stroke(sc([{ x: 32, y: 2.6 }, { x: 26, y: 3.8 }, { x: 18, y: 5.2 }], k), 1.1 * k, '#141318', 0.95, false);
  h.dot(28.8 * k, -2.6 * k, 1.1 * k, '#d9e4ec', 1);
  h.dot(28.8 * k, -2.6 * k, 0.5 * k, '#141318', 1);
  h.stroke([...head.slice(0, 4)], line * 0.8, INK, 0.7);
  // The folded wing over the back, its flight feathers black.
  const w = pen(3);
  const wing = sc(WING, k);
  w.fill(wing, '#f6f3ea', 1);
  w.fill(sc(PRIMARIES, k), '#1e1d22', 0.96);
  for (let i = 0; i < 6; i++) w.hair(sc([{ x: -20 - i * 5, y: -10.8 + i * 1.2 }, { x: -24 - i * 5, y: -3 }], k), line * 0.4, '#5d5c66', 0.6);
  w.hatch(wing, Math.max(1.5, 1.8 * k), -0.2, line * 0.3, { alpha: 0.18 });
  w.stroke([...wing, wing[0]!], line, INK, 0.85);
});

const BUBBLE_N = 26;

/**
 * The gannet plunging along `angle` with its bill at (x, y); `under` 0 still
 * in the air .. 1 a body length or more into the water (the bubbles trail
 * back to where it went in, `entry`).
 */
export function drawGannetDive(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, entry: Pt | null, alpha = 1): void {
  if (alpha <= 0) return;
  if (entry) {
    const dx = x - entry.x;
    const dy = y - entry.y;
    const run = Math.hypot(dx, dy);
    ctx.save();
    ctx.globalAlpha *= alpha;
    for (let i = 0; i < BUBBLE_N; i++) {
      const u = i / BUBBLE_N;
      const wob = Math.sin(i * 2.7 + t * 6) * length * 0.05 * (1 - u);
      const bx = entry.x + dx * u * 0.92 + wob - Math.sin(angle) * wob;
      const by = entry.y + dy * u * 0.92 - (1 - u) * length * 0.2 * Math.sin(i);
      const r = length * (0.012 + 0.03 * ((i * 37) % 7) / 7) * (0.6 + 0.6 * (1 - u));
      if (run * u < length * 0.2) continue;
      ctx.strokeStyle = 'rgba(240,250,255,0.8)';
      ctx.lineWidth = Math.max(1, r * 0.25);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  GANNET.draw(ctx, x - Math.cos(angle) * length * 0.5, y - Math.sin(angle) * length * 0.5, length, angle, t, { alpha });
}

export const prepareGannet = (): void => GANNET.prepare();
