import { INK, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { dab, px, smoothLoop, softLine, taper, type Brush, type Stops } from '../../seal/art/paint';
import { type Body, paintedShark } from './painted';

/**
 * The dwarf lanternshark (Etmopterus perryi), the smallest shark: shown up to
 * ~1,000 px wide, so painted in detail. A slim cigar of a body with a short
 * blunt snout and a big green-gold eye; very dark brown-black above and a
 * darker, black belly marked with rows of tiny photophores glowing
 * blue-white, denser in the flank marks over the pelvic fin and at the tail's
 * base. Two small dorsals, the second the larger, each with a spine in front;
 * no anal fin; a long upper tail lobe with a notch under its tip.
 *
 * Drawn through painted.ts: nose right at x = 160, 310 long.
 */

const UNITS = 310;

const BACK: readonly Pt[] = spline([
  { x: 160, y: 1 }, { x: 158.5, y: -3 }, { x: 154, y: -7 }, { x: 146, y: -10.5 }, { x: 133, y: -13.5 }, { x: 116, y: -15.5 }, { x: 96, y: -17 },
  { x: 70, y: -17.6 }, { x: 45, y: -17.2 }, { x: 20, y: -15.6 }, { x: -5, y: -13.4 }, { x: -30, y: -10.8 }, { x: -50, y: -8.4 }, { x: -68, y: -6 },
  { x: -80, y: -4.6 }, { x: -92, y: -3.3 }, { x: -106, y: -2 }, { x: -120, y: -0.6 },
], 5);
const BELLY: readonly Pt[] = spline([
  { x: 160, y: 1 }, { x: 159, y: 4 }, { x: 155.5, y: 7 }, { x: 148, y: 9.6 }, { x: 136, y: 11.6 }, { x: 118, y: 13.6 }, { x: 95, y: 15.4 },
  { x: 70, y: 16.4 }, { x: 45, y: 16 }, { x: 20, y: 14.6 }, { x: -5, y: 12.2 }, { x: -30, y: 9.6 }, { x: -50, y: 7.2 }, { x: -68, y: 5.2 },
  { x: -80, y: 4.2 }, { x: -92, y: 3.1 }, { x: -106, y: 2 }, { x: -120, y: 0.8 },
], 5);

/** Where the brown flank breaks to the black belly (dark below, the reverse of most sharks). */
const LINE: readonly Pt[] = spline([
  { x: 166, y: 3 }, { x: 140, y: 5 }, { x: 110, y: 6.2 }, { x: 80, y: 6.8 }, { x: 50, y: 6.6 }, { x: 20, y: 5.6 }, { x: -10, y: 4.4 },
  { x: -40, y: 3 }, { x: -70, y: 1.8 }, { x: -100, y: 1 }, { x: -126, y: 0.4 },
], 5).map((p) => ({ x: p.x, y: p.y + 0.5 * Math.sin(p.x * 0.23) + 0.3 * Math.sin(p.x * 0.61 + 1) }));

/** The first dorsal: small and low, set behind the pectorals. */
const DORSAL1: readonly Pt[] = spline([
  { x: 58, y: -17.3 }, { x: 56, y: -20.5 }, { x: 53, y: -24 }, { x: 49.5, y: -26.2 }, { x: 46.5, y: -25.8 }, { x: 45.2, y: -22.5 },
  { x: 43.5, y: -19.6 }, { x: 40, y: -17.4 },
], 4);
/** The second dorsal: larger, over the gap between the pelvics and the tail. */
const DORSAL2: readonly Pt[] = spline([
  { x: -14, y: -13.2 }, { x: -17, y: -18 }, { x: -21, y: -24 }, { x: -25.5, y: -29 }, { x: -29.5, y: -31.2 }, { x: -33, y: -30.4 },
  { x: -34.2, y: -26 }, { x: -36, y: -20 }, { x: -39.5, y: -14 }, { x: -44, y: -9.8 },
], 4);

/** The tail: a long upper lobe with a notch under its tip, a small lower lobe. */
const CAUDAL: readonly Pt[] = spline([
  { x: -76, y: -5 }, { x: -90, y: -6.6 }, { x: -104, y: -8.6 }, { x: -118, y: -11 }, { x: -132, y: -13.4 }, { x: -143, y: -15 },
  { x: -150, y: -14.6 }, { x: -149.5, y: -11.4 }, { x: -144.5, y: -8.6 }, { x: -139, y: -7.4 }, { x: -137.5, y: -4.4 }, { x: -133, y: -1.2 },
  { x: -124, y: 2.4 }, { x: -113, y: 6 }, { x: -105, y: 10 }, { x: -100, y: 12.6 }, { x: -96.5, y: 11.4 }, { x: -94.5, y: 7.4 },
  { x: -90, y: 4.6 }, { x: -76, y: 4.4 },
], 4);
const PELVIC: readonly Pt[] = smoothLoop([
  { x: -4, y: 11.8 }, { x: -8, y: 16.4 }, { x: -14, y: 19 }, { x: -19, y: 18.4 }, { x: -20.5, y: 15 }, { x: -24, y: 10.6 },
  { x: -18, y: 8.8 }, { x: -4, y: 9.6 },
], 3);
/** The pectoral, root at 0,0 pointing +x: small and rounded, a paddle. */
const PECTORAL: readonly Pt[] = smoothLoop([
  { x: -2, y: -4 }, { x: 6, y: -5 }, { x: 14, y: -4.6 }, { x: 20, y: -2.2 }, { x: 23.5, y: 1.4 }, { x: 21.5, y: 4.2 }, { x: 15, y: 4.6 },
  { x: 8, y: 4.6 }, { x: 1, y: 4.8 }, { x: -2, y: 3.4 },
], 3);

const TOP = '#2a1f19';
const FLANK = '#43322a';
const BLACK = '#0d0a0a';

function stops(_x: number, l: number): Stops {
  return [
    [0, TOP], [l * 0.45, '#352820'], [l * 0.85, FLANK], [l - 0.02, '#3a2b24'], [l + 0.05, '#17110f'], [Math.min(1, l + 0.25), BLACK], [1, '#120e0f'],
  ];
}

// ---------------------------------------------------------------- the light organs

/** One photophore: a soft blue-white glow and a bright core. */
function photophore(k: Brush, x: number, y: number, r: number, bright: number): void {
  const { ctx } = k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  dab(ctx, x, y, r * 4.5, '70,150,230', 0.16 * bright);
  dab(ctx, x, y, r * 1.8, '150,215,255', 0.5 * bright);
  ctx.restore();
  ctx.fillStyle = `rgba(232,248,255,${0.85 * bright})`;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

/** Rows along the belly, a scatter on the lower flank, the flank marks over the pelvic fin and at the tail's base. */
function lights(k: Brush, b: Body): void {
  const { pen, ctx } = k;
  // The belly's faint blue glow first, so the dots sit in a haze.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  softLine(ctx, b.along(0.88, 128, -92), 7, '#3c7fc4', 0.1);
  ctx.restore();
  const at = (x: number, v: number): Pt => ({ x, y: b.topAt(x) + (b.bottomAt(x) - b.topAt(x)) * v });
  for (const v of [0.76, 0.85, 0.93]) {
    for (let x = 134 - pen.rng() * 3; x > -100; x -= 2.6 + pen.rng() * 1.4) {
      if (pen.rng() < 0.12) continue;
      const p = at(x + pen.rng() * 0.8, v + (pen.rng() - 0.5) * 0.03);
      photophore(k, p.x, p.y, 0.5 + pen.rng() * 0.25, 0.6 + 0.4 * pen.rng());
    }
  }
  // The flank mark over the pelvic fin: an oblique band reaching up the flank and back.
  for (let i = 0; i < 70; i++) {
    const u = pen.rng();
    const x = 10 - u * 52 + (pen.rng() - 0.5) * 6;
    const v = 0.88 - u * 0.36 + (pen.rng() - 0.5) * 0.14;
    const p = at(x, v);
    photophore(k, p.x, p.y, 0.45 + pen.rng() * 0.2, 0.55 + 0.45 * pen.rng());
  }
  // The mark at the tail's base.
  for (let i = 0; i < 45; i++) {
    const x = -56 - pen.rng() * 36;
    const p = at(x, 0.45 + pen.rng() * 0.5);
    photophore(k, p.x, p.y, 0.42 + pen.rng() * 0.2, 0.55 + 0.45 * pen.rng());
  }
  // The odd one up the flank, sparse.
  for (let i = 0; i < 40; i++) {
    const x = 120 - pen.rng() * 200;
    const p = at(x, 0.5 + pen.rng() * 0.2);
    photophore(k, p.x, p.y, 0.4, 0.35 + 0.3 * pen.rng());
  }
  // Fine dark mottling over the brown back, so it isn't flat.
  pen.stipple(b.outline, 900, (x, y) => 0.6 * Math.max(0, 1 - (y - b.topAt(x)) / 20), px(k, 0.7), 'rgba(0,0,0,0.35)');
}

/** A spine in front of a dorsal: pale horn, inked down its back edge. */
function spine(k: Brush, base: Pt, tip: Pt): void {
  const pts = [base, { x: (base.x * 2 + tip.x) / 3 + 0.3, y: (base.y * 2 + tip.y) / 3 }, { x: (base.x + tip.x * 2) / 3 + 0.2, y: (base.y + tip.y * 2) / 3 }, tip];
  taper(k.ctx, pts, 1.9, 0.25, INK, 0.95);
  taper(k.ctx, pts.map((p) => ({ x: p.x + 0.25, y: p.y })), 1.1, 0.15, '#d8cdb6', 0.95);
}

export const LANTERNSHARK = paintedShark({
  id: 'lanternshark', name: 'DWARF LANTERNSHARK', mouth: { along: 0.065, below: 0.03 }, seed: 3301,
  back: BACK, belly: BELLY, line: LINE,
  dorsals: [{ fin: DORSAL1, foot0: 58, foot1: 40 }, { fin: DORSAL2, foot0: -14, foot1: -44 }],
  caudal: { shape: CAUDAL, root: { x: -84, y: 0 }, tip: { x: -148, y: -14 } },
  under: [{ shape: PELVIC, root: { x: -10, y: 11 }, tip: { x: -18, y: 18 } }],
  stock: -80,
  pectoral: { shape: PECTORAL, root: { x: 0, y: 0 }, tip: { x: 22, y: 2 } },
  pecNear: { x: 93, y: 11.5 }, pecFar: { x: 87, y: 10.5 }, pecAngle: 2.55,
  eye: { at: { x: 139.5, y: -2.4 }, r: 6.4, iris: ['#e4e68a', '#86a83c', '#1e2c16'], pupil: [0.34, 0.56], lid: TOP, rim: 'rgba(190,210,150,0.35)' },
  mouthLine: spline([{ x: 152, y: 7.4 }, { x: 145, y: 9.2 }, { x: 138, y: 9.9 }, { x: 131.5, y: 9.7 }], 5),
  jawMax: 0.45,
  teeth: { n: 10, size: 1.3, colour: '#ece6d6' },
  gills: [113, 110, 107, 104, 101], gillSpan: [0.4, 0.7],
  nostril: [{ x: 155, y: 4.2 }, { x: 153, y: 5.2 }, { x: 150.5, y: 5.4 }],
  stops,
  ink: { fin: ['#4a3a30', '#2b211c', '#100c0a'], sheen: '#a08d7a', dark: '#070505', cool: '#3c3c4e', belly: 0.3 },
  box: { x0: -154, x1: 164, y0: -36, y1: 26 },
  pecBox: { x0: -4, x1: 26, y0: -7, y1: 7 },
  decorate: lights,
  decorateFin: (k, _fin, kind) => {
    if (kind !== 'caudal') return;
    for (let i = 0; i < 14; i++) photophore(k, -88 - k.pen.rng() * 14, 4 + k.pen.rng() * 6, 0.42, 0.6);
  },
  over: (k, b) => {
    spine(k, { x: 60, y: b.topAt(60) + 0.6 }, { x: 54.2, y: -26.4 });
    spine(k, { x: -11.5, y: b.topAt(-11.5) + 0.6 }, { x: -18.6, y: -28 });
    // The rim of water light along the back, so the dark body reads against dark water.
    softLine(k.ctx, b.topline.filter((p) => p.x < 156 && p.x > -76).map((p) => ({ x: p.x, y: p.y + 0.9 })), 1.6, '#8fa9c2', 0.4);
  },
}, UNITS);
