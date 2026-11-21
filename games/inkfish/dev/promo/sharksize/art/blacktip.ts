import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { smoothLoop, softLine, taper, type Brush, type Stops } from '../../seal/art/paint';
import { type Body, type Fin, inkTip, paintedShark } from './painted';

/**
 * The blacktip reef shark (Carcharhinus melanopterus): a stout requiem shark
 * with a short, broadly rounded snout, an oval eye, a tall first dorsal set
 * over the pectorals' rear tips, falcate pectorals and a small second dorsal
 * over the anal fin. Pale brownish grey above, white below, a white band
 * running forward along the flank, and bold black tips on every fin, sharpest
 * on the first dorsal and the tail, each edged by a pale band.
 *
 * It also stands on its tail beside you (tilt π/2), so its shapes are kept
 * clean and readable at any angle. Drawn through painted.ts: nose right at
 * x = 160, 310 long.
 */

const UNITS = 310;

const BACK: readonly Pt[] = spline([
  { x: 160, y: 3 }, { x: 158.6, y: -2 }, { x: 154.5, y: -7.5 }, { x: 147, y: -13 }, { x: 135, y: -18.6 }, { x: 119, y: -23.4 }, { x: 99, y: -27 },
  { x: 77, y: -29 }, { x: 54, y: -29.4 }, { x: 30, y: -28 }, { x: 6, y: -25 }, { x: -18, y: -21 }, { x: -40, y: -16.4 }, { x: -58, y: -12 },
  { x: -72, y: -8.6 }, { x: -82, y: -6.4 }, { x: -94, y: -4.6 }, { x: -106, y: -3 }, { x: -118, y: -1.6 },
], 5);
const BELLY: readonly Pt[] = spline([
  { x: 160, y: 3 }, { x: 159.6, y: 7.2 }, { x: 156.6, y: 11.2 }, { x: 150, y: 14.6 }, { x: 139, y: 17.6 }, { x: 123, y: 21 }, { x: 103, y: 24.4 },
  { x: 80, y: 27 }, { x: 56, y: 28.4 }, { x: 32, y: 28.4 }, { x: 8, y: 26.4 }, { x: -14, y: 23 }, { x: -34, y: 18.6 }, { x: -52, y: 13.6 },
  { x: -66, y: 9.6 }, { x: -78, y: 7 }, { x: -92, y: 5 }, { x: -106, y: 3.4 }, { x: -118, y: 2 },
], 5);

const LINE: readonly Pt[] = spline([
  { x: 166, y: 5.5 }, { x: 140, y: 6.5 }, { x: 118, y: 8.4 }, { x: 96, y: 10.2 }, { x: 72, y: 11.6 }, { x: 46, y: 12 }, { x: 20, y: 11 },
  { x: -6, y: 9 }, { x: -30, y: 7 }, { x: -54, y: 4.6 }, { x: -76, y: 2.6 }, { x: -100, y: 1.6 }, { x: -126, y: 0.6 },
], 5).map((p) => ({ x: p.x, y: p.y + 0.6 * Math.sin(p.x * 0.19) + 0.35 * Math.sin(p.x * 0.53 + 2) }));

/** The first dorsal: tall, a convex leading edge to a narrowly rounded apex, a concave trailing edge to a short free tip. */
const DORSAL1: readonly Pt[] = spline([
  { x: 66, y: -29.2 }, { x: 62.5, y: -36 }, { x: 58, y: -45 }, { x: 53, y: -54 }, { x: 48.5, y: -60.5 }, { x: 45, y: -63.6 },
  { x: 42, y: -63 }, { x: 40.6, y: -58 }, { x: 39.6, y: -50 }, { x: 38.4, y: -42 }, { x: 35.6, y: -35.4 }, { x: 30.5, y: -31.4 }, { x: 25.5, y: -29.6 },
], 4);
const DORSAL2: readonly Pt[] = spline([
  { x: -48, y: -14.4 }, { x: -51, y: -19 }, { x: -54, y: -22.8 }, { x: -57, y: -24.4 }, { x: -58.6, y: -22 }, { x: -60, y: -17 },
  { x: -63, y: -12.6 }, { x: -67, y: -9.8 },
], 4);

/** The tail: the long upper lobe with a notch under its tip, the fork, the lower lobe. */
const CAUDAL: readonly Pt[] = spline([
  { x: -76, y: -7.4 }, { x: -92, y: -10.4 }, { x: -106, y: -15.4 }, { x: -120, y: -22.4 }, { x: -132, y: -30 }, { x: -142, y: -37 },
  { x: -150, y: -42.6 }, { x: -149.4, y: -38.6 }, { x: -145, y: -35.2 }, { x: -142.4, y: -31 }, { x: -137.4, y: -24 }, { x: -131.4, y: -15 },
  { x: -125.6, y: -6 }, { x: -121.6, y: 1 }, { x: -123.2, y: 8 }, { x: -126, y: 16 }, { x: -128.4, y: 23 }, { x: -126.6, y: 26.4 },
  { x: -119, y: 22 }, { x: -110, y: 15 }, { x: -100, y: 9.4 }, { x: -90, y: 6.6 }, { x: -76, y: 6.6 },
], 4);
const PELVIC: readonly Pt[] = smoothLoop([
  { x: -8, y: 25 }, { x: -13, y: 30 }, { x: -19, y: 34 }, { x: -24, y: 33.4 }, { x: -24.4, y: 29 }, { x: -28, y: 22 }, { x: -22, y: 19.4 },
  { x: -8, y: 21.4 },
], 3);
const ANAL: readonly Pt[] = smoothLoop([
  { x: -50, y: 13 }, { x: -54, y: 18 }, { x: -58, y: 21 }, { x: -61.4, y: 20.4 }, { x: -61.4, y: 17 }, { x: -65, y: 11.4 }, { x: -60, y: 9.4 },
  { x: -50, y: 10.4 },
], 3);
/** The pectoral, root at 0,0 pointing +x: long and falcate. */
const PECTORAL: readonly Pt[] = smoothLoop([
  { x: -3, y: -7 }, { x: 10, y: -8.6 }, { x: 24, y: -8 }, { x: 38, y: -5.4 }, { x: 48, y: -1 }, { x: 55, y: 4.6 }, { x: 58.4, y: 9 },
  { x: 54, y: 8.8 }, { x: 46, y: 5 }, { x: 36, y: 3 }, { x: 24, y: 3.6 }, { x: 12, y: 5.6 }, { x: 2, y: 7 }, { x: -3, y: 5.4 },
], 3);

const TOP = '#6e6557';
const BLACK = '#121212';

function stops(_x: number, l: number): Stops {
  return [
    [0, TOP], [l * 0.4, '#7f7666'], [l * 0.8, '#958c7c'], [l - 0.02, '#a49b8b'], [l + 0.015, '#f0eee8'], [Math.min(1, l + 0.3), '#ebe9e3'], [1, '#c9ccca'],
  ];
}

/** The white band: the belly's white reaching forward up the flank from over the anal fin to a point under the first dorsal. */
function flankBand(k: Brush, b: Body): void {
  const { ctx } = k;
  const v = (x: number, u: number): Pt => {
    const t = b.topAt(x);
    const d = b.bottomAt(x) - t;
    const line = (b.lineAt(x) - t) / d;
    return { x, y: t + d * (line - u * (0.16 - 0.1 * ((x + 66) / 100))) };
  };
  const xs = Array.from({ length: 21 }, (_, i) => -66 + i * 5);
  // Fat at the back where it joins the belly, a point at the front.
  const upper = xs.map((x) => v(x, 1 - ((x + 66) / 100) ** 2 * 0.5));
  const lower = xs.map((x) => ({ x, y: b.lineAt(x) + 1.5 }));
  const shape = [...upper, ...[...lower].reverse()];
  softLine(ctx, upper.map((p) => ({ x: p.x, y: p.y - 1.6 })), 3, '#4a4338', 0.25);
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#efede7';
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  softLine(ctx, upper, 2.4, '#f4f2ec', 0.5);
  taper(ctx, upper.slice(4, -2), 0.4, 0.8, '#3a342b', 0.25);
}

function tips(k: Brush, f: Fin, kind: 'caudal' | 'under' | 'pectoral' | 'dorsal'): void {
  const { ctx } = k;
  if (kind === 'dorsal') {
    const tall = f.root.y - f.tip.y > 20;
    inkTip(ctx, { x: f.root.x + 2, y: f.root.y }, f.tip, tall ? 0.36 : 0.42, BLACK, 1, 0.45);
  } else if (kind === 'caudal') {
    inkTip(ctx, { x: -98, y: -8 }, { x: -150, y: -42.6 }, 0.26, BLACK, 1, 0.4);
    inkTip(ctx, { x: -108, y: 8 }, { x: -127.4, y: 26 }, 0.5, BLACK, 1, 0.4);
    // The trailing edge between the lobes, dusky.
    softLine(ctx, CAUDAL.filter((p, i) => i > 28 && i < 60), 3.4, BLACK, 0.55);
  } else if (kind === 'pectoral') {
    inkTip(ctx, f.root, { x: 58.4, y: 9 }, 0.24, BLACK, 0.95, 0.35);
  } else {
    inkTip(ctx, f.root, f.tip, 0.45, BLACK, 0.85, 0.3);
  }
}

export const BLACKTIP = paintedShark({
  id: 'blacktip', name: 'BLACKTIP REEF SHARK', mouth: { along: 0.075, below: 0.042 }, seed: 5507,
  back: BACK, belly: BELLY, line: LINE,
  dorsals: [{ fin: DORSAL1, foot0: 66, foot1: 25.5 }, { fin: DORSAL2, foot0: -48, foot1: -67 }],
  caudal: { shape: CAUDAL, root: { x: -90, y: 0 }, tip: { x: -148, y: -40 } },
  under: [
    { shape: ANAL, root: { x: -56, y: 11 }, tip: { x: -60, y: 20.5 } },
    { shape: PELVIC, root: { x: -16, y: 22 }, tip: { x: -23, y: 33.5 } },
  ],
  stock: -82,
  pectoral: { shape: PECTORAL, root: { x: 0, y: 0 }, tip: { x: 56, y: 6 } },
  pecNear: { x: 90, y: 22 }, pecFar: { x: 84, y: 20 }, pecAngle: 2.68,
  eye: { at: { x: 139, y: -3.4 }, r: 4.3, iris: ['#7d8660', '#323a28', '#0c0e0a'], pupil: [0.2, 0.62], lid: TOP, rim: 'rgba(240,235,220,0.45)' },
  mouthLine: spline([{ x: 147.5, y: 13 }, { x: 141, y: 15.6 }, { x: 134, y: 16.8 }, { x: 127, y: 17 }], 5),
  jawMax: 0.5,
  teeth: { n: 11, size: 2.2, colour: '#f3efe4' },
  gills: [107, 103, 99, 95, 91], gillSpan: [0.28, 0.66],
  nostril: [{ x: 152.5, y: 8.6 }, { x: 150, y: 9.7 }, { x: 146.6, y: 9.9 }],
  stops,
  ink: { fin: ['#aca392', '#877e6f', '#5a5245'], sheen: '#ece4d4', dark: '#2a2620', cool: '#8a949c', belly: 0.35 },
  box: { x0: -156, x1: 164, y0: -68, y1: 38 },
  pecBox: { x0: -6, x1: 61, y0: -11, y1: 12 },
  decorate: flankBand,
  decorateFin: tips,
}, UNITS);
