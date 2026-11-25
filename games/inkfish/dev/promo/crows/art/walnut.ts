import { type Pt } from '../../../../src/art/pen';
import { dab, softLine } from '../../seal/art/paint';
import { rngOf } from '../../otterpocket/brush';
import { fillShape, inkLine, linear, P, radial, ring, spline, within } from './ink';

/**
 * A Japanese walnut, painted: a wrinkled tan shell, a little pointed at one
 * end, with its seam; cracked, two half shells round a golden, brain-folded
 * kernel. Local units: the nut's half height is 100.
 */
const SHELL: readonly Pt[] = spline(P(0, -108, 26, -94, 62, -74, 84, -34, 88, 12, 70, 58, 36, 90, 0, 98, -38, 90, -72, 58, -88, 12, -84, -34, -62, -74, -26, -94), 6, true);

/** Grooves wandering from tip to base down each side of the seam, with short slanting branches. */
const GROOVES: readonly (readonly Pt[])[] = (() => {
  const rng = rngOf(77);
  const out: Pt[][] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const u = 0.22 + i * 0.22;
      const phase = rng() * 6.28;
      const wave = 4 + rng() * 5;
      const line = Array.from({ length: 17 }, (_, j) => {
        const v = -0.86 + (j / 16) * 1.7;
        const bulge = Math.sqrt(Math.max(0.04, 1 - v * v));
        return { x: side * (88 * u * bulge) + wave * Math.sin(v * (5 + i) + phase), y: v * 97 };
      });
      out.push(line);
      for (let b = 0; b < 3; b++) {
        const p = line[3 + Math.floor(rng() * 11)]!;
        const s = rng() > 0.5 ? 1 : -1;
        out.push(spline(P(p.x, p.y, p.x + s * 6, p.y + 9, p.x + s * 11, p.y + 21 + rng() * 8), 4));
      }
    }
  }
  return out;
})();

export function drawWalnut(ctx: CanvasRenderingContext2D, at: Pt, r: number, a: number, boil: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(a);
  ctx.scale(r / 100, r / 100);
  fillShape(ctx, SHELL, radial(ctx, -20, -30, 150, [[0, '#f0cf98'], [0.4, '#d8a766'], [0.75, '#a9713a'], [1, '#6f4522']]));
  within(ctx, SHELL, () => {
    for (const g of GROOVES) {
      softLine(ctx, g.map((p) => ({ x: p.x + 4, y: p.y + 3 })), 9, '#f7dcab', 0.4, 3);
      softLine(ctx, g, 8, '#7a4b22', 0.62, 4);
    }
    dab(ctx, 30, 74, 90, '70,38,16', 0.5);
    dab(ctx, -34, -46, 44, '255,238,200', 0.55);
  });
  // The seam, raised, down the middle.
  const seam = spline(P(0, -106, 7, -60, 3, 0, 8, 50, 0, 96), 6);
  softLine(ctx, seam.map((p) => ({ x: p.x + 7, y: p.y })), 10, '#5a3416', 0.6, 3);
  softLine(ctx, seam, 8, '#f2d29a', 0.8, 3);
  inkLine(ctx, seam.map((p) => ({ x: p.x + 5, y: p.y })), 1.2, 0.55, boil, false, '#4a2a12');
  inkLine(ctx, SHELL, 2, 0.85, boil, true, '#3a2212');
  ctx.restore();
}

/** A half shell's outline, seen from above its open side: the rounded back bulging below the rim. */
const HALF: readonly Pt[] = spline(P(-94, -10, -90, -42, -62, -66, -20, -76, 24, -76, 64, -66, 90, -42, 94, -10, 88, 32, 66, 70, 34, 92, 0, 100, -34, 92, -66, 70, -88, 32), 6, true);
const RIM: readonly Pt[] = ring(0, -20, 93, 55, 60);
const HOLLOW: readonly Pt[] = ring(0, -18, 78, 43, 60);

/** Half a walnut shell, open side towards us: wrinkled outside, a pale seam rim, the chambered hollow inside. */
export function drawHalfShell(ctx: CanvasRenderingContext2D, at: Pt, r: number, a: number, boil: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(a);
  ctx.scale(r / 100, r / 100);
  fillShape(ctx, HALF, radial(ctx, -26, 20, 130, [[0, '#ecc890'], [0.45, '#cf9c5c'], [0.8, '#9c6633'], [1, '#62401f']]));
  within(ctx, HALF, () => {
    // Wrinkles running down the outside from the rim to the tip, wandering as on the whole nut.
    const rng = rngOf(31);
    for (let i = 0; i < 11; i++) {
      const u = -1 + (i + 0.5) / 5.5;
      const phase = rng() * 6.28;
      const line = Array.from({ length: 10 }, (_, j) => {
        const v = j / 9;
        return { x: 96 * u * Math.cos(v * 1.25) + 5 * Math.sin(v * 7 + phase), y: -20 + 55 * Math.sqrt(Math.max(0, 1 - u * u)) + v * (72 - 36 * u * u) };
      });
      softLine(ctx, line.map((p) => ({ x: p.x + 4, y: p.y + 2 })), 8, '#f7dcab', 0.4, 3);
      softLine(ctx, line, 7, '#7a4b22', 0.6, 4);
    }
    dab(ctx, 30, 96, 80, '66,36,16', 0.55);
    dab(ctx, -46, 44, 34, '255,236,196', 0.45);
  });
  // The rim: the thick pale edge where the halves met.
  fillShape(ctx, RIM, linear(ctx, -90, -60, 90, 30, [[0, '#fbe6bd'], [0.5, '#e6c086'], [1, '#b98a4e']]));
  inkLine(ctx, RIM, 1.3, 0.6, boil, true, '#4a2c14');
  fillShape(ctx, HOLLOW, radial(ctx, 14, 2, 92, [[0, '#c99a60'], [0.5, '#966235'], [1, '#4e2e15']]));
  within(ctx, HOLLOW, () => {
    // The two chambers' lobes, pressed in the shape of the kernel, and the wall between them.
    for (const s of [-1, 1]) {
      const lobe = spline(P(s * 14, -46, s * 44, -52, s * 66, -34, s * 56, -18, s * 70, 0, s * 46, 16, s * 18, 10, s * 26, -18), 5, true);
      fillShape(ctx, lobe, radial(ctx, s * 40, -14, 46, [[0, '#6a4020'], [0.7, '#7e5029'], [1, '#a87444']]));
      softLine(ctx, spline(P(s * 22, 10, s * 48, 16, s * 70, 0), 5), 6, '#e6bd84', 0.7, 3);
      softLine(ctx, spline(P(s * 34, -30, s * 48, -22, s * 40, -8, s * 54, 2), 5), 6, '#3f2410', 0.6, 3);
    }
    softLine(ctx, spline(P(0, -62, 4, -30, -3, 0, 0, 26), 5), 15, '#4a2b13', 0.6, 4);
    softLine(ctx, spline(P(-2, -62, 2, -30, -5, 0, -2, 26), 5), 9, '#f0cf98', 0.95, 4);
    softLine(ctx, ring(0, -24, 80, 46, 50), 12, '#2e1808', 0.4, 5);
  });
  inkLine(ctx, HOLLOW, 1.2, 0.55, boil, true, '#3a2212');
  softLine(ctx, spline(P(-80, -42, -40, -66, 10, -72, 50, -65), 6), 5, '#fff6de', 0.85, 3);
  inkLine(ctx, HALF, 1.9, 0.85, boil, true, '#3a2212');
  ctx.restore();
}

const KERNEL: readonly Pt[] = spline(P(0, -70, 22, -86, 54, -78, 76, -50, 70, -22, 88, 6, 72, 42, 44, 66, 14, 62, 0, 80, -16, 62, -46, 66, -74, 42, -86, 6, -70, -22, -76, -50, -54, -78, -22, -86), 5, true);
/** The cleft down the middle, and the winding folds running out across each lobe. */
const FOLDS: readonly (readonly Pt[])[] = (() => {
  const rng = rngOf(88);
  const out: Pt[][] = [spline(P(0, -70, 5, -36, -4, 4, 3, 44, 0, 76), 6)];
  for (const side of [-1, 1]) {
    for (let k = 0; k < 7; k++) {
      const y0 = -66 + k * 21;
      const ph = rng() * 6.28;
      const x0 = 8 + rng() * 10;
      const x1 = 58 + rng() * 22;
      const line = Array.from({ length: 13 }, (_, i) => {
        const x = x0 + ((x1 - x0) * i) / 12;
        return { x: side * x, y: y0 + 6.5 * Math.sin(x * 0.13 + ph) + y0 * 0.16 * (x / 80) ** 2 };
      });
      out.push(line);
      const q = line[4 + Math.floor(rng() * 6)]!;
      out.push(spline(P(q.x, q.y, q.x + side * 3, q.y + 7, q.x + side * (rng() - 0.5) * 10, q.y + 14), 4));
    }
  }
  return out;
})();

/** The golden kernel, folded like a little brain. */
export function drawKernel(ctx: CanvasRenderingContext2D, at: Pt, r: number, a: number, boil: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(a);
  ctx.scale(r / 100, r / 100);
  fillShape(ctx, KERNEL, radial(ctx, -18, -30, 130, [[0, '#fff0bd'], [0.45, '#f3ca72'], [0.8, '#d1953c'], [1, '#93601f']]));
  within(ctx, KERNEL, () => {
    for (const f of FOLDS) {
      softLine(ctx, f.map((p) => ({ x: p.x - 4, y: p.y - 4 })), 9, '#fff6d2', 0.65, 5);
      softLine(ctx, f, 11, '#a06a24', 0.6, 6);
    }
    dab(ctx, 20, 60, 70, '130,76,20', 0.4);
    FOLDS.forEach((f) => inkLine(ctx, f, 0.8, 0.22, boil, false, '#6b3f12'));
  });
  inkLine(ctx, KERNEL, 1.8, 0.85, boil, true, '#4a2a10');
  ctx.restore();
}

/** The cracked nut lying open on the road: two half shells and the kernel between them. */
export function drawCracked(ctx: CanvasRenderingContext2D, at: Pt, r: number, boil: number, kernel = true): void {
  drawHalfShell(ctx, { x: at.x - r * 1.5, y: at.y - r * 0.04 }, r * 0.94, -0.16, boil);
  drawHalfShell(ctx, { x: at.x + r * 1.55, y: at.y + r * 0.02 }, r * 0.9, 0.2, boil);
  if (kernel) drawKernel(ctx, { x: at.x, y: at.y }, r * 0.86, 0.1, boil);
}

/** Bits of shell thrown up from `at`, `u` 0..1 through the burst. */
export function drawShellBits(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number, boil: number): void {
  if (u <= 0 || u >= 1) return;
  const rng = rngOf(505);
  for (let i = 0; i < 40; i++) {
    const dir = -Math.PI * (rng() < 0.6 ? (rng() < 0.5 ? 0.02 + 0.2 * rng() : 0.78 + 0.2 * rng()) : rng());
    const speed = size * (0.8 + 2 * rng());
    const r = size * (0.025 + 0.075 * rng() ** 1.6);
    const spin = (rng() - 0.5) * 14;
    const x = at.x + Math.cos(dir) * speed * u;
    const y = Math.min(at.y + size * (0.1 + 0.4 * ((i * 0.37) % 1)), at.y + Math.sin(dir) * speed * u * 1.5 + size * 2.4 * u * u);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - u) * 4);
    ctx.translate(x, y);
    ctx.rotate(spin * u + i);
    // A curved shard, dark outside, pale inside.
    const bit = spline(P(-r, r * 0.1, -r * 0.5, -r * 0.6, r * 0.3, -r * 0.75, r * 1.05, -r * 0.1, r * 0.5, r * 0.15, r * 0.35, r * 0.5, -r * 0.3, r * 0.3), 4, true);
    fillShape(ctx, bit, linear(ctx, 0, -r, 0, r * 0.6, i % 3 === 0 ? [[0, '#f2d39c'], [1, '#b98346']] : [[0, '#c08a50'], [0.6, '#8a5a2c'], [1, '#5a3718']]));
    inkLine(ctx, bit, 1.4, 0.8, boil, true, '#3a2212');
    ctx.restore();
  }
}
