import { INK } from '../../../../src/art/pen';
import { drawRay, type Ray } from './rayKit';

/**
 * The spotted eagle ray (Aetobatus narinari), the tiger shark's meal: a head
 * standing out in front of the disc with a rounded duck-bill snout, long
 * pointed wings swept back and beating, inky blue-black above covered in
 * white spots and rings, white below, and a very long whip tail with the
 * spine at its root. Painted by rayKit.ts; 100 units long.
 */

/** Points inside the disc, from above, for the spots: (u, w, radius, ring?). */
const SPOTS: readonly (readonly [number, number, number, boolean])[] = Array.from({ length: 64 }, (_, i) => {
  const u = 30 - ((i * 0.618034) % 1) * 42;
  const w = (((i * 0.7548777) % 1) - 0.5) * 84;
  return [u, w, 1.3 + ((i * 0.381966) % 1) * 1.1, i % 3 === 0] as const;
}).filter(([u, w]) => {
  // Inside the wing: in front of the trailing edge and behind the leading edge.
  const a = Math.abs(w);
  return a < 43 && u < 28 - a * 0.68 && u > -10 - a * 0.1 && !(a < 5 && u > 24);
});

const SPOTTED: Ray = {
  disc: [
    [42, 0], [41, 3], [37, 5], [31, 6], [27, 7.5], [16, 21], [5, 35], [-3, 45], [-7, 46], [-7, 41], [-5, 33], [-7, 22], [-11, 10], [-13, 0],
    [-11, -10], [-7, -22], [-5, -33], [-7, -41], [-7, -46], [-3, -45], [5, -35], [16, -21], [27, -7.5], [31, -6], [37, -5], [41, -3],
  ],
  tail: { root: -12, tip: -58, thick: 2.3, spine: 0.06 },
  dome: { u: 16, lu: 22, lw: 9, h: 5 },
  wing: { from: 8, reach: 46, lift: 13 },
  rate: 0.9,
  eye: { u: 34, w: 5.6, r: 1.7 },
  spiracle: { u: 29, w: 6.4, r: 1.2 },
  top: { light: '#4c5a70', mid: '#26304a', dark: '#111827' },
  belly: '#f3f4f2',
  marks: ({ ctx, at, lw }) => {
    ctx.save();
    for (const [u, w, r, ring] of SPOTS) {
      const p = at(u, w);
      ctx.fillStyle = '#f2f1ea';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      if (ring) {
        ctx.fillStyle = '#26304a';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r * 0.5, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = INK;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 0.6 * lw;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },
};

export function drawEagleRay(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, facing: 1 | -1, t: number): void {
  drawRay(ctx, SPOTTED, x, y, len, facing, t);
}
