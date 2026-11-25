import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { curve, dab, path, smoothLoop, softLine, taper } from '../../seal/art/paint';

/**
 * The monk seal's body seen from the front, lying on the sand behind its
 * head: plump rolls of fat at the neck, slate above, creamy-yellow on the
 * throat and belly, two short fore flippers with nails. In the face's units
 * (../art/sealFace.ts): the head's middle at 0,0, the sand at about y = 400.
 */

const BODY: readonly Pt[] = smoothLoop([
  { x: 0, y: -120 }, { x: 120, y: -90 }, { x: 196, y: 0 }, { x: 236, y: 110 }, { x: 262, y: 220 }, { x: 262, y: 320 }, { x: 210, y: 388 }, { x: 90, y: 410 }, { x: 0, y: 414 },
  { x: -90, y: 410 }, { x: -210, y: 388 }, { x: -262, y: 320 }, { x: -262, y: 220 }, { x: -236, y: 110 }, { x: -196, y: 0 }, { x: -120, y: -90 },
], 7);

const HAIRS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 1300 }, () => {
    const x = -258 + rng() * 516;
    const y = 60 + rng() * 350;
    return { x, y, dx: x * 0.05 + (rng() - 0.5) * 6, dy: 7 + rng() * 9, light: rng() < 0.5, w: 0.6 + rng() * 0.8 };
  });
})();

/** Where the sand meets the body, in its own units. */
export const GROUND = 404;

function flipper(ctx: CanvasRenderingContext2D, s: 1 | -1, lift: number, lw: number): void {
  ctx.save();
  ctx.translate(s * 196, 318);
  ctx.scale(s, 1);
  ctx.rotate(-lift);
  const shape = smoothLoop([
    { x: -36, y: -34 }, { x: 24, y: -44 }, { x: 78, y: -14 }, { x: 122, y: 36 }, { x: 144, y: 74 }, { x: 128, y: 92 }, { x: 88, y: 92 }, { x: 40, y: 82 }, { x: -14, y: 62 }, { x: -46, y: 20 },
  ], 6);
  path(ctx, shape);
  const g = ctx.createLinearGradient(-20, -40, 90, 96);
  g.addColorStop(0, '#9a958c');
  g.addColorStop(0.5, '#77726e');
  g.addColorStop(1, '#4b4745');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, 30, -20, 44, '230,226,214', 0.4);
  dab(ctx, 40, 92, 60, '24,20,18', 0.5);
  // The fingers inside the flipper.
  for (let i = 0; i < 4; i++) {
    const tip = { x: 138 - i * 20, y: 66 + i * 9 };
    const pts = curve({ x: 34 - i * 12, y: 12 + i * 10 }, { x: 92 - i * 16, y: 26 + i * 12 }, tip, 8);
    softLine(ctx, pts, 8, '#211d1c', 0.45);
    softLine(ctx, pts.map((p) => ({ x: p.x + 3, y: p.y - 7 })), 6, '#d9d3c6', 0.35);
  }
  for (const h of HAIRS.slice(0, 300)) {
    const p = { x: h.x * 0.36 + 50, y: (h.y - 220) * 0.4 + 26 };
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = h.light ? '#f0e9d8' : '#201c1b';
    ctx.lineWidth = h.w;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 8, p.y + 6);
    ctx.stroke();
  }
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.7 * lw;
  ctx.stroke();
  // The nails at the edge of it.
  for (let i = 0; i < 5; i++) {
    const at = { x: 140 - i * 20, y: 76 + Math.sin(i * 0.9) * 10 };
    taper(ctx, curve({ x: at.x - 8, y: at.y - 8 }, { x: at.x + 4, y: at.y }, { x: at.x + 9, y: at.y + 12 }, 6), 8, 1.6, '#1c1714', 1);
    taper(ctx, curve({ x: at.x - 6, y: at.y - 8 }, { x: at.x + 3, y: at.y - 2 }, { x: at.x + 6, y: at.y + 6 }, 6), 2, 0.6, '#a89c8c', 0.7);
  }
  ctx.restore();
}

export interface BodyLook {
  readonly lw: number;
  /** A slow breath, -1 .. 1. */
  readonly breath?: number;
  /** The flippers lifted (waving), radians. */
  readonly liftL?: number;
  readonly liftR?: number;
  /** No shadow on the sand (under water). */
  readonly afloat?: boolean;
}

export function drawSealBody(ctx: CanvasRenderingContext2D, o: BodyLook): void {
  const b = o.breath ?? 0;
  if (!o.afloat) {
    // Its weight on the sand.
    softLine(ctx, [{ x: -300, y: GROUND + 2 }, { x: 0, y: GROUND + 16 }, { x: 320, y: GROUND + 4 }], 60, '#4a3414', 0.55, 20);
  }
  ctx.save();
  ctx.scale(1 + 0.008 * b, 1);
  path(ctx, BODY);
  const g = ctx.createLinearGradient(0, -120, 0, 414);
  g.addColorStop(0, '#62656a');
  g.addColorStop(0.34, '#85858a');
  g.addColorStop(0.56, '#a79f90');
  g.addColorStop(0.8, '#cabb90');
  g.addColorStop(1, '#a8935f');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Slate down the flanks, cream down the middle.
  dab(ctx, -270, 180, 150, '66,68,74', 0.75);
  dab(ctx, 276, 180, 170, '40,40,46', 0.85);
  dab(ctx, -60, 330, 180, '244,230,180', 0.45);
  // The head's shadow across the throat, so anything pale hanging there stands out.
  dab(ctx, 10, 190, 170, '46,36,26', 0.85);
  dab(ctx, 20, 250, 130, '60,46,30', 0.5);
  softLine(ctx, [{ x: -220, y: 404 }, { x: 0, y: 420 }, { x: 220, y: 404 }], 60, '#3c2c14', 0.5, 20);
  for (const h of HAIRS) {
    ctx.globalAlpha = h.light ? 0.26 : 0.22;
    ctx.strokeStyle = h.light ? '#f6eed6' : '#282320';
    ctx.lineWidth = h.w;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(h.x + h.dx, h.y + h.dy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Rolls of fat round the neck, each lit on top and dark in its crease.
  for (const [w, y0, y1, a] of [[226, 90, 222, 0.8], [244, 150, 282, 0.7], [256, 220, 340, 0.55]] as const) {
    const pts = curve({ x: -w, y: y0 }, { x: 0, y: y1 * 1.5 - y0 * 0.5 }, { x: w, y: y0 }, 24);
    softLine(ctx, pts, 34, '#2c221a', a * 0.55, 16);
    softLine(ctx, pts.map((p) => ({ x: p.x, y: p.y + 22 })), 20, '#fff4d4', a * 0.35, 14);
    taper(ctx, pts.slice(0, 13), 1, 2.6 * o.lw, INK, a);
    taper(ctx, [...pts.slice(12)].reverse(), 1, 2.6 * o.lw, INK, a);
  }
  ctx.restore();
  path(ctx, BODY);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * o.lw;
  ctx.stroke();
  ctx.restore();
  flipper(ctx, -1, o.liftL ?? 0, o.lw);
  flipper(ctx, 1, o.liftR ?? 0, o.lw);
}
