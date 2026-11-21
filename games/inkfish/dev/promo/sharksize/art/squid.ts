import { INK, Pen, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { spline } from '../../kraken/whale';
import { path, screenScale, softLine, taper } from '../../seal/art/paint';

/**
 * A small open-ocean squid, the cookiecutter's meal: a torpedo mantle with
 * the arrowhead fins at its tip, a short head with a big eye, eight arms and
 * two longer tentacles with their clubs, trailing as it jets away tip first.
 * Reddish and half see-through: a rosy wash, darker along the back, flecked
 * with chromatophores, paling to the belly. Drawn live (it's small), the pen
 * reseeded per line-boil frame. 100 units long, mantle tip to tentacle clubs.
 */

const MANTLE: readonly Pt[] = spline([
  { x: 50, y: 0 }, { x: 46, y: -3 }, { x: 38, y: -6.4 }, { x: 26, y: -8.4 }, { x: 12, y: -9 }, { x: 3, y: -8.6 }, { x: 0, y: -7.8 },
  { x: 0, y: 7.2 }, { x: 3, y: 8 }, { x: 12, y: 8.4 }, { x: 26, y: 7.8 }, { x: 38, y: 5.8 }, { x: 46, y: 2.8 },
], 5);
const FIN_TOP: readonly Pt[] = spline([{ x: 49, y: -1.6 }, { x: 43, y: -9 }, { x: 37, y: -12.6 }, { x: 33, y: -10.4 }, { x: 31, y: -6.6 }], 4);
const FIN_LOW: readonly Pt[] = FIN_TOP.map((p) => ({ x: p.x, y: -p.y * 0.85 }));
const HEAD: readonly Pt[] = spline([
  { x: 1, y: -7 }, { x: -3, y: -6.6 }, { x: -8, y: -5.6 }, { x: -11, y: -4 }, { x: -11.5, y: 0 }, { x: -11, y: 4 }, { x: -8, y: 5.4 }, { x: -3, y: 6.2 }, { x: 1, y: 6.6 },
], 4);
const EYE: Pt = { x: -4.4, y: -0.8 };

/** An arm (or tentacle) from the head, wavy with time. */
function arm(i: number, n: number, reach: number, t: number): Pt[] {
  const spread = (i / (n - 1) - 0.5) * 9;
  return Array.from({ length: 12 }, (_, k) => {
    const s = k / 11;
    const wave = 1.6 * s * Math.sin(t * 5 + i * 0.9 - s * 4);
    return { x: -10 - reach * s, y: spread * (0.6 + 0.6 * s) + wave };
  });
}

function paintMantle(ctx: CanvasRenderingContext2D, pen: Pen, lw: number): void {
  for (const fin of [FIN_TOP, FIN_LOW]) {
    const shape = [...fin, { x: 40, y: 0 }];
    pen.fill(shape, '#e6a08e', 0.92);
    pen.clipped(shape, () => softLine(ctx, fin, 3, '#a8463a', 0.35));
    pen.stroke(fin, 1.1 * lw, INK, 0.9, false);
  }
  pen.fill(MANTLE, '#ecb9a8', 0.94);
  pen.clipped(MANTLE, () => {
    const g = ctx.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, '#b44f3f');
    g.addColorStop(0.35, '#dc8c78');
    g.addColorStop(0.7, '#f0c6b6');
    g.addColorStop(1, '#f6e1d6');
    ctx.fillStyle = g;
    ctx.fillRect(-2, -10, 54, 20);
    // The see-through mantle: the gladius (pen) and the gut faintly through it.
    softLine(ctx, [{ x: 4, y: -6.6 }, { x: 26, y: -7.2 }, { x: 46, y: -2.4 }], 2, '#8a3a32', 0.25);
    softLine(ctx, [{ x: 6, y: 1.5 }, { x: 22, y: 1 }, { x: 34, y: 0.4 }], 4, '#c27a66', 0.25);
    softLine(ctx, [{ x: 4, y: -3 }, { x: 30, y: -3.6 }, { x: 46, y: -0.6 }], 2.4, '#fff3ea', 0.35);
    pen.stipple(MANTLE, 420, (_x, y) => 0.75 - (y + 9) / 24, 0.42, '#9b3428');
  });
  pen.stroke(MANTLE, 1.3 * lw, INK, 1, false);
}

function paintHead(ctx: CanvasRenderingContext2D, pen: Pen, lw: number, t: number): void {
  // The arms first (behind the head), each inked then filled, the tentacles longest, ending in clubs.
  for (let i = 0; i < 2; i++) {
    const line = arm(i * 7 + 0.5, 8, 38, t);
    taper(ctx, line, 1.8 + 1.4 * lw, 0.9 + 1.4 * lw, INK, 0.9);
    taper(ctx, line, 1.8, 0.9, '#d98472', 1);
    const end = line[line.length - 1]!;
    const club = line[line.length - 3]!;
    taper(ctx, [club, end], 3 + 1.4 * lw, 1 + 1.4 * lw, INK, 0.9);
    taper(ctx, [club, end], 3, 1, '#c96a58', 1);
  }
  for (let i = 0; i < 8; i++) {
    const line = arm(i, 8, 24 + (i % 3) * 3, t);
    taper(ctx, line, 3 + 1.4 * lw, 0.4 + 1.2 * lw, INK, 0.9);
    taper(ctx, line, 3, 0.4, i % 2 ? '#e39a86' : '#d27c69', 1);
  }
  pen.fill(HEAD, '#e7a996', 0.96);
  pen.clipped(HEAD, () => {
    const g = ctx.createLinearGradient(0, -7, 0, 7);
    g.addColorStop(0, '#b75443');
    g.addColorStop(0.6, '#eab29f');
    g.addColorStop(1, '#f4d8cb');
    ctx.fillStyle = g;
    ctx.fillRect(-13, -8, 15, 16);
    pen.stipple(HEAD, 120, () => 0.5, 0.4, '#9b3428');
  });
  pen.stroke(HEAD, 1.2 * lw, INK, 1, false);
  // The big eye: a silvery ring, a dark pupil, a catchlight.
  ctx.save();
  ctx.fillStyle = '#d9dde0';
  ctx.beginPath();
  ctx.arc(EYE.x, EYE.y, 3.6, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(EYE.x, EYE.y + 0.6, 0, EYE.x, EYE.y, 2.8);
  g.addColorStop(0, '#2b2f38');
  g.addColorStop(1, '#050608');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(EYE.x, EYE.y, 2.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9 * lw;
  ctx.beginPath();
  ctx.arc(EYE.x, EYE.y, 3.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(EYE.x + 1, EYE.y - 1, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The collar where the mantle opens.
  path(ctx, [{ x: 0.6, y: -7.4 }, { x: -0.6, y: 0 }, { x: 0.6, y: 6.8 }]);
  ctx.strokeStyle = 'rgba(27,26,31,0.6)';
  ctx.lineWidth = 0.9 * lw;
  ctx.stroke();
}

/** Draws the squid, its body centre at (x, y), `len` px long, the mantle tip toward `facing`. */
export function drawSquid(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, facing: 1 | -1, t: number): void {
  const boil = ((Math.floor(t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((facing * len) / 100, len / 100);
  const lw = 1 / screenScale(ctx);
  const pen = new Pen(ctx, 3301 + boil * 977, 0.35 * lw);
  ctx.lineJoin = 'round';
  paintHead(ctx, pen, lw, t);
  paintMantle(ctx, pen, lw);
  ctx.restore();
}
