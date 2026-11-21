import { INK, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { dab, smoothLoop, softLine, taper, type Brush, type Stops } from '../../seal/art/paint';
import { type Body, type Fin, paintedShark } from './painted';

/**
 * The spiny dogfish (Squalus acanthias), replacing the deep-sea stand-in: a
 * slim shark with a pointed snout and a big green-grey eye, slate grey above
 * with irregular white spots scattered along the back and upper flanks, a
 * pale belly, two dorsals each with a stout spine in front (the second
 * spine as tall as its fin), no anal fin, and a tail with no notch.
 *
 * Drawn through painted.ts: nose right at x = 160, 310 long.
 */

const UNITS = 310;

const BACK: readonly Pt[] = spline([
  { x: 160, y: 4 }, { x: 158, y: 0.2 }, { x: 153, y: -3.8 }, { x: 144, y: -8.4 }, { x: 130, y: -13 }, { x: 112, y: -17 }, { x: 92, y: -20 },
  { x: 70, y: -21.4 }, { x: 46, y: -21.4 }, { x: 22, y: -20 }, { x: -2, y: -17.6 }, { x: -26, y: -14.6 }, { x: -48, y: -11.4 }, { x: -66, y: -8.4 },
  { x: -80, y: -6 }, { x: -92, y: -4.4 }, { x: -104, y: -3 }, { x: -118, y: -1.4 },
], 5);
const BELLY: readonly Pt[] = spline([
  { x: 160, y: 4 }, { x: 159, y: 6.6 }, { x: 155, y: 9 }, { x: 147, y: 11.4 }, { x: 134, y: 13.8 }, { x: 116, y: 16.4 }, { x: 94, y: 18.8 },
  { x: 70, y: 20.2 }, { x: 46, y: 20.4 }, { x: 22, y: 19.2 }, { x: -2, y: 16.8 }, { x: -24, y: 13.8 }, { x: -44, y: 10.6 }, { x: -62, y: 7.6 },
  { x: -78, y: 5.6 }, { x: -92, y: 4 }, { x: -104, y: 3 }, { x: -118, y: 1.8 },
], 5);

const LINE: readonly Pt[] = spline([
  { x: 166, y: 6 }, { x: 140, y: 7 }, { x: 110, y: 7.8 }, { x: 80, y: 8.2 }, { x: 50, y: 8 }, { x: 20, y: 7 }, { x: -10, y: 5.6 },
  { x: -40, y: 4 }, { x: -70, y: 2.4 }, { x: -100, y: 1.4 }, { x: -126, y: 0.5 },
], 5).map((p) => ({ x: p.x, y: p.y + 0.5 * Math.sin(p.x * 0.2) + 0.3 * Math.sin(p.x * 0.57 + 1.4) }));

const DORSAL1: readonly Pt[] = spline([
  { x: 52, y: -21.4 }, { x: 49, y: -27 }, { x: 45.5, y: -33 }, { x: 42, y: -38 }, { x: 39, y: -40.6 }, { x: 36.4, y: -40 },
  { x: 35.6, y: -36 }, { x: 34.6, y: -30 }, { x: 32.4, y: -25 }, { x: 28.6, y: -21.8 }, { x: 25, y: -21 },
], 4);
const DORSAL2: readonly Pt[] = spline([
  { x: -56, y: -10 }, { x: -59, y: -15 }, { x: -62.5, y: -20.4 }, { x: -66, y: -24 }, { x: -68.6, y: -24.4 }, { x: -69.6, y: -21.4 },
  { x: -71, y: -16 }, { x: -74, y: -10.6 }, { x: -79, y: -6.8 },
], 4);
/** The tail: the upper lobe longer, no notch under its tip, a short lower lobe. */
const CAUDAL: readonly Pt[] = spline([
  { x: -84, y: -6 }, { x: -96, y: -8.6 }, { x: -110, y: -12.4 }, { x: -124, y: -17 }, { x: -137, y: -21.6 }, { x: -146, y: -25 },
  { x: -150, y: -26.4 }, { x: -149, y: -23.4 }, { x: -145, y: -20.4 }, { x: -139, y: -16.4 }, { x: -132, y: -11 }, { x: -126, y: -5 },
  { x: -122, y: 0 }, { x: -121, y: 4 }, { x: -122.4, y: 9 }, { x: -124, y: 14 }, { x: -123, y: 17.2 }, { x: -116, y: 14.6 },
  { x: -107, y: 10 }, { x: -97, y: 6.4 }, { x: -84, y: 5.4 },
], 4);
const PELVIC: readonly Pt[] = smoothLoop([
  { x: -24, y: 16 }, { x: -28, y: 20.6 }, { x: -34, y: 23.4 }, { x: -39, y: 23 }, { x: -40, y: 19.6 }, { x: -44, y: 13 }, { x: -38, y: 11.6 },
  { x: -24, y: 13.4 },
], 3);
/** The pectoral, root at 0,0 pointing +x: a concave rear edge. */
const PECTORAL: readonly Pt[] = smoothLoop([
  { x: -3, y: -5.6 }, { x: 8, y: -7 }, { x: 20, y: -6.4 }, { x: 30, y: -3.4 }, { x: 37, y: 1 }, { x: 39.6, y: 6 }, { x: 35, y: 6.4 },
  { x: 28, y: 4 }, { x: 20, y: 3.6 }, { x: 12, y: 5 }, { x: 4, y: 6 }, { x: -3, y: 4.6 },
], 3);

const TOP = '#47515b';

function stops(_x: number, l: number): Stops {
  return [
    [0, TOP], [l * 0.4, '#56616b'], [l * 0.8, '#6c7781'], [l - 0.02, '#7d8891'], [l + 0.02, '#e9ecec'], [Math.min(1, l + 0.3), '#e6e9ea'], [1, '#c6ccd0'],
  ];
}

/** Irregular white spots: two loose rows along the upper flank, a scatter over the back, none on the head's front or the tail. */
function spots(k: Brush, b: Body): void {
  const { pen, ctx } = k;
  const at = (x: number, v: number): Pt => ({ x, y: b.topAt(x) + (b.bottomAt(x) - b.topAt(x)) * v });
  const spot = (p: Pt, r: number): void => {
    dab(ctx, p.x, p.y, r * 1.8, '230,238,242', 0.3);
    const n = 7;
    const blob = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.7 + 0.5 * pen.rng());
      return { x: p.x + Math.cos(a) * rr * 1.25, y: p.y + Math.sin(a) * rr * 0.85 };
    });
    pen.fill(smoothLoop(blob, 3), '#eef2f4', 0.8);
  };
  for (const [v0, gap] of [[0.22, 9], [0.42, 11], [0.08, 16]] as const) {
    for (let x = 108 - pen.rng() * 8; x > -82; x -= gap + pen.rng() * gap * 0.8) {
      if (pen.rng() < 0.15) continue;
      spot(at(x, v0 + (pen.rng() - 0.5) * 0.12), 0.6 + pen.rng() * 1.1);
    }
  }
}

/** The pale trailing edges of the tail and pectorals. */
function edges(k: Brush, f: Fin, kind: 'caudal' | 'under' | 'pectoral' | 'dorsal'): void {
  if (kind === 'caudal') softLine(k.ctx, CAUDAL.filter((_, i) => i > 25 && i < 66), 2.6, '#e8edf0', 0.4);
  if (kind === 'pectoral') softLine(k.ctx, f.shape.filter((p) => p.y > 3 && p.x > 8), 2.2, '#e8edf0', 0.35);
}

/** A dorsal spine: stout, ivory, grooved, inked down its back edge. */
function spine(k: Brush, base: Pt, tip: Pt, w: number): void {
  const mid = { x: (base.x + tip.x) / 2 + 0.4, y: (base.y + tip.y) / 2 };
  taper(k.ctx, [base, mid, tip], w + 0.9, 0.3, INK, 0.95);
  taper(k.ctx, [{ x: base.x + 0.3, y: base.y }, { x: mid.x + 0.3, y: mid.y }, tip], w, 0.2, '#dcd6c6', 0.95);
  taper(k.ctx, [{ x: base.x - 0.2, y: base.y }, { x: mid.x - 0.1, y: mid.y }, tip], w * 0.25, 0.1, '#8a8474', 0.6);
}

export const DOGFISH = paintedShark({
  id: 'dogfish', name: 'SPINY DOGFISH', mouth: { along: 0.084, below: 0.03 }, seed: 6203,
  back: BACK, belly: BELLY, line: LINE,
  dorsals: [{ fin: DORSAL1, foot0: 52, foot1: 25 }, { fin: DORSAL2, foot0: -56, foot1: -79 }],
  caudal: { shape: CAUDAL, root: { x: -92, y: 0 }, tip: { x: -148, y: -25 } },
  under: [{ shape: PELVIC, root: { x: -30, y: 14 }, tip: { x: -38, y: 23 } }],
  stock: -86,
  pectoral: { shape: PECTORAL, root: { x: 0, y: 0 }, tip: { x: 38, y: 5 } },
  pecNear: { x: 88, y: 16 }, pecFar: { x: 82, y: 14.6 }, pecAngle: 2.72,
  eye: { at: { x: 136, y: -2.6 }, r: 5.4, iris: ['#b4c2ae', '#5f7064', '#1c2521'], pupil: [0.3, 0.48], lid: TOP, rim: 'rgba(225,235,240,0.45)' },
  mouthLine: spline([{ x: 143, y: 11.6 }, { x: 137, y: 13.2 }, { x: 131, y: 13.8 }, { x: 125, y: 13.6 }], 5),
  jawMax: 0.42,
  teeth: { n: 10, size: 1.6, colour: '#f1ede2' },
  gills: [103, 100, 97, 94, 91], gillSpan: [0.36, 0.7],
  nostril: [{ x: 153, y: 6.2 }, { x: 150.5, y: 7.2 }, { x: 147.5, y: 7.4 }],
  stops,
  ink: { fin: ['#7e8993', '#58626c', '#353d45'], sheen: '#d9e2ea', dark: '#1b2026', cool: '#8b98a2', belly: 0.35 },
  box: { x0: -154, x1: 164, y0: -44, y1: 28 },
  pecBox: { x0: -5, x1: 42, y0: -9, y1: 9 },
  decorate: spots,
  decorateFin: edges,
  over: (k, b) => {
    spine(k, { x: 53.6, y: b.topAt(53.6) + 0.8 }, { x: 47, y: -35.4 }, 1.6);
    spine(k, { x: -54, y: b.topAt(-54) + 0.8 }, { x: -61.6, y: -26 }, 1.7);
  },
}, UNITS);
