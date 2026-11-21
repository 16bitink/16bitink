import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { type Box, type Brush, columnWash, contour, edgeAt, px, shade, smoothLoop, softLine, type Stops } from '../../seal/art/paint';
import { type Gape, type SharkDraw, type SharkPaint, drawShark, spriteMaker } from './bigSharkKit';
import type { RawShark } from './contract';

/**
 * The shortfin mako (Isurus oxyrinchus), an adult, painted for the size
 * video: a deep, torpedo body; a long conical pointed snout; a big black eye;
 * five long gill slits; the first dorsal big and round-tipped, set just behind
 * the pectorals; tiny second dorsal and anal fins; a crescent tail with its
 * two lobes nearly equal, and a strong keel along the tail stalk. Metallic
 * deep indigo above, broken off along a sharp line to snow white below; the
 * long smooth hooked teeth show when the jaw drops.
 *
 * Own units: about 332 long (nose to the upper lobe's tip), the middle at
 * 0,0, nose right, belly down. Baked and drawn by bigSharkKit.ts.
 */

// ---------------------------------------------------------------- shape

const BACK: readonly Pt[] = spline([
  { x: 160, y: 1 }, { x: 157, y: -3 }, { x: 150, y: -7.5 }, { x: 140, y: -12 }, { x: 126, y: -17 }, { x: 110, y: -21.5 }, { x: 92, y: -25 },
  { x: 72, y: -27.5 }, { x: 50, y: -28.5 }, { x: 28, y: -28 }, { x: 6, y: -26 }, { x: -18, y: -22 }, { x: -40, y: -17 }, { x: -60, y: -12 },
  { x: -78, y: -8 }, { x: -92, y: -5.5 }, { x: -104, y: -4 }, { x: -118, y: -2.5 },
], 5);
const BELLY: readonly Pt[] = spline([
  { x: 160, y: 1 }, { x: 158, y: 4.5 }, { x: 152, y: 8 }, { x: 143, y: 11 }, { x: 130, y: 14 }, { x: 114, y: 17.5 }, { x: 96, y: 21 },
  { x: 76, y: 24.5 }, { x: 54, y: 26.5 }, { x: 32, y: 27 }, { x: 10, y: 26 }, { x: -12, y: 23 }, { x: -34, y: 18.5 }, { x: -54, y: 13 },
  { x: -72, y: 8.5 }, { x: -88, y: 5.5 }, { x: -104, y: 3.5 }, { x: -118, y: 2.5 },
], 5);
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => edgeAt(BELLY, x);
const along = (v: number, x0: number, x1: number, step = 4): Pt[] => contour(topAt, bottomAt, v, x0, x1, step);

const DORSAL: readonly Pt[] = spline([
  { x: 44, y: -28.4 }, { x: 39, y: -35 }, { x: 33, y: -44 }, { x: 27, y: -52.5 }, { x: 21, y: -57.5 }, { x: 15.5, y: -58 }, { x: 12.5, y: -54 },
  { x: 11, y: -46 }, { x: 8.5, y: -37 }, { x: 4, y: -30.5 }, { x: -1, y: -27.4 }, { x: -4, y: -25.6 },
], 5);
const SECOND_DORSAL: readonly Pt[] = spline([
  { x: -84, y: -6.6 }, { x: -86, y: -10 }, { x: -88.6, y: -11.8 }, { x: -91, y: -11 }, { x: -92, y: -8 }, { x: -95.5, y: -5 },
], 4);
const TOPLINE: readonly Pt[] = [
  ...BACK.filter((p) => p.x > 44), ...DORSAL, ...BACK.filter((p) => p.x < -4 && p.x > -84), ...SECOND_DORSAL, ...BACK.filter((p) => p.x < -96),
];
const BODY: readonly Pt[] = [...TOPLINE, ...[...BELLY].reverse().slice(1, -1)];

/** The crescent tail: the two lobes nearly equal, a deep fork between them. */
const CAUDAL: readonly Pt[] = spline([
  { x: -108, y: -4 }, { x: -122, y: -11 }, { x: -136, y: -22 }, { x: -150, y: -35 }, { x: -162, y: -46 }, { x: -172, y: -53.5 },
  { x: -171, y: -48 }, { x: -165.5, y: -38 }, { x: -159, y: -26 }, { x: -153, y: -14 }, { x: -150, y: -4 }, { x: -150, y: 4 },
  { x: -153, y: 14 }, { x: -158, y: 25 }, { x: -163, y: 35 }, { x: -166.5, y: 43.5 }, { x: -160, y: 39 }, { x: -148, y: 29 },
  { x: -134, y: 18 }, { x: -122, y: 9.5 }, { x: -108, y: 4 },
], 4);
const ANAL: readonly Pt[] = smoothLoop([
  { x: -82, y: 6.6 }, { x: -85, y: 10.5 }, { x: -88, y: 12.6 }, { x: -90.5, y: 11.4 }, { x: -94, y: 6 }, { x: -88, y: 4 },
], 3);
const PELVIC: readonly Pt[] = smoothLoop([
  { x: -30, y: 19.2 }, { x: -35, y: 25 }, { x: -41, y: 28.4 }, { x: -45, y: 27.6 }, { x: -46, y: 23 }, { x: -50, y: 16.5 }, { x: -46, y: 13 }, { x: -32, y: 15 },
], 3);
/** The keel: a ridge along the middle of the tail stalk. */
const KEEL: readonly Pt[] = spline([{ x: -96, y: 0.2 }, { x: -106, y: -0.1 }, { x: -116, y: -0.3 }, { x: -126, y: 0 }], 4);

/** The countershading line, sharp: just under the eye, low along the flank, up to the middle at the tail. */
const LINE: readonly Pt[] = spline([
  { x: 166, y: 3 }, { x: 150, y: 3.6 }, { x: 138, y: 2.6 }, { x: 124, y: 4.2 }, { x: 110, y: 7 }, { x: 92, y: 9.5 }, { x: 70, y: 11 },
  { x: 48, y: 11.5 }, { x: 26, y: 11 }, { x: 4, y: 9.5 }, { x: -20, y: 7 }, { x: -44, y: 4.5 }, { x: -66, y: 2 }, { x: -90, y: 0.5 }, { x: -124, y: 0 },
], 5).map((p) => ({ x: p.x, y: p.y + 0.4 * Math.sin(p.x * 0.23) + 0.25 * Math.sin(p.x * 0.61 + 1) }));
const lineAt = (x: number): number => edgeAt(LINE, x);

const GILLS = [101, 96, 91, 86, 81] as const;

const PECTORAL: readonly Pt[] = smoothLoop([
  { x: -3, y: -6 }, { x: 10, y: -7.2 }, { x: 22, y: -6.8 }, { x: 34, y: -4.6 }, { x: 44, y: -1 }, { x: 51, y: 3 }, { x: 48.5, y: 4.8 },
  { x: 40, y: 3.8 }, { x: 30, y: 4 }, { x: 18, y: 5.4 }, { x: 6, y: 6.8 }, { x: -3, y: 6 },
], 4);

const GAPE: Gape = {
  upper: spline([{ x: 149, y: 6.4 }, { x: 141, y: 8.4 }, { x: 131, y: 10.2 }, { x: 121, y: 11.4 }, { x: 113, y: 12 }], 4),
  chin: spline([{ x: 150.2, y: 7.8 }, { x: 147, y: 10.8 }, { x: 141, y: 13.6 }, { x: 134, y: 15.8 }, { x: 124, y: 18.2 }, { x: 115, y: 19.8 }, { x: 112, y: 19.8 }], 4),
  throat: { x: 99, y: 20.6 },
  max: 0.52,
  teeth: { upper: 10, lower: 10, long: 4.6, lean: 0.4, slim: 0.28 },
  skin: '#e4e0e6',
};

// ---------------------------------------------------------------- paint

const DEEP = '#0f1648';
const DARK = '#0a0f30';
const SHEEN = '#d7dcff';
const COOL = '#5e6a86';

function metalStops(x: number): Stops {
  const t = topAt(x);
  const l = Math.max(0.25, Math.min(0.9, (lineAt(x) - t) / Math.max(1, bottomAt(x) - t)));
  return [
    [0, DEEP], [l * 0.25, '#162170'], [l * 0.55, '#1d2c88'], [l * 0.82, '#2a42a6'], [l - 0.025, '#4064c8'],
    [l + 0.01, '#f8f9fb'], [Math.min(1, l + 0.3), '#eef1f5'], [1, '#c9d0dc'],
  ];
}

/** A fin: indigo washed in, lit along its leading edge, darker toward its trailing edge, fine rays from its root. */
function paintFin(k: Brush, shape: readonly Pt[], root: Pt, tip: Pt, rays = 8): void {
  const { pen, ctx } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.fill(shape, '#1a2a80', 1);
    const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
    g.addColorStop(0, 'rgba(80,110,220,0.45)');
    g.addColorStop(0.55, 'rgba(30,50,150,0)');
    g.addColorStop(1, 'rgba(4,6,26,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-220, -120, 440, 240);
    for (let i = 0; i < rays; i++) {
      const u = i / (rays - 1);
      pen.hair([root, { x: tip.x + (u - 0.5) * 16, y: tip.y + (u - 0.5) * 12 }], px(k, 0.7), DARK, 0.12 + 0.14 * u);
    }
  });
  pen.stroke(shape, px(k, 1.4), INK, 1, true);
}

function paintDorsals(k: Brush): void {
  const { pen, ctx } = k;
  for (const [fin, foot0, foot1] of [[DORSAL, 44, -4], [SECOND_DORSAL, -84, -96]] as const) {
    const apex = fin.reduce((a, p) => (p.y < a.y ? p : a));
    const shape = [...fin, { x: foot1, y: 0 }, { x: foot0, y: 0 }];
    pen.clipped(shape, () => {
      for (let i = 0; i < 11; i++) {
        const u = i / 10;
        const fx = foot0 + (foot1 - foot0) * u;
        pen.hair([{ x: fx, y: topAt(fx) }, { x: apex.x - u * 3, y: apex.y + 3 + u * 5 }], px(k, 0.7), u < 0.3 ? SHEEN : DARK, u < 0.3 ? 0.28 : 0.14 + 0.22 * u);
      }
      softLine(ctx, fin.filter((p) => p.x < apex.x), 5, '#03051a', 0.38);
      softLine(ctx, fin.filter((p) => p.x >= apex.x), 3.4, '#8ea6f6', 0.34);
    });
  }
}

function paintMetal(k: Brush): void {
  const { pen, ctx } = k;
  columnWash(ctx, -124, 166, 1, topAt, bottomAt, metalStops, 70);
  // The metallic sheen: a broken band of light along the upper flank, a cooler glow just over the line.
  softLine(ctx, along(0.12, 150, -110), 7, '#c3ccff', 0.26);
  softLine(ctx, along(0.3, 120, -60), 6, '#8b7ee0', 0.1);
  for (let r = 0; r < 12; r++) {
    const v = 0.03 + (0.3 * (r + pen.rng() * 0.7)) / 12;
    let x = 150 - pen.rng() * 30;
    while (x > -112) {
      const end = Math.max(-114, x - 10 - pen.rng() * 40);
      pen.hair(along(v, x, end, 3), px(k, 0.9 + pen.rng() * 0.6), SHEEN, 0.28 * (1 - v / 0.36));
      x = end - 4 - pen.rng() * 18;
    }
  }
  softLine(ctx, LINE.map((p) => ({ x: p.x, y: p.y - 2.2 })), 4, '#6d8cf0', 0.32);
  pen.stipple(BODY, 1500, (x, y) => 0.5 * Math.max(0, 1 - (y - topAt(x)) / 16), px(k, 0.7), 'rgba(205,215,255,0.55)');
  pen.hair(along(0.34, 100, -112, 5), px(k, 0.8), '#aab8f5', 0.18);
  for (let r = 1; r <= 3; r++) pen.hair(along(1 - r * 0.05, 128, -90, 5), px(k, 0.7), COOL, 0.15 - r * 0.03);
  softLine(ctx, along(0.985, 140, -100), 4, '#9aa6bc', 0.35);
  pen.hair(LINE.filter((p) => p.x < 152), px(k, 1), DARK, 0.4);
}

function paintHead(k: Brush): void {
  const { pen } = k;
  for (const x of GILLS) {
    const [top, bottom] = [topAt(x) * 0.62, bottomAt(x) * 0.66];
    const slit = spline([{ x: x + 2.6, y: top }, { x: x - 0.4, y: top * 0.35 }, { x: x - 0.8, y: bottom * 0.35 }, { x: x + 1.6, y: bottom }], 6);
    pen.fill([...slit, ...[...slit].reverse().map((p, i, all) => ({ x: p.x - 1.6 * Math.sin((Math.PI * i) / (all.length - 1)), y: p.y }))], DARK, 0.42);
    pen.stroke(slit, px(k, 1.2), INK, 0.9, false);
    pen.hair(slit.slice(2, -2).map((p) => ({ x: p.x - 1.9, y: p.y })), px(k, 0.9), SHEEN, 0.32);
  }
  pen.clipped(BODY, () => {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 7; i++) {
        const x = 154 - row * 2 - i * 3.2 - pen.rng() * 1.4;
        pen.dot(x, topAt(x) + (bottomAt(x) - topAt(x)) * (0.28 + row * 0.15), px(k, 0.7), DARK, 0.4);
      }
    }
  });
  pen.stroke(spline([{ x: 152.5, y: 5.4 }, { x: 150, y: 6.4 }, { x: 147, y: 6.6 }], 3), px(k, 1.1), INK, 0.85, false);
}

/** Washes over the stalk where it runs on into the tail, so no paper shows there; then the keel. */
function paintStalk(k: Brush): void {
  const { pen, ctx } = k;
  ctx.save();
  pen.clipped(BODY, () => {
    ctx.fillStyle = '#1a2a80';
    for (let x = -100; x > -126; x -= 0.6) {
      ctx.globalAlpha = Math.min(1, (-100 - x) / 12);
      ctx.fillRect(x - 0.6, -20, 0.7, 40);
    }
  });
  ctx.restore();
  softLine(ctx, KEEL.map((p) => ({ x: p.x, y: p.y + 1.1 })), 2, '#03051a', 0.32);
  softLine(ctx, KEEL.map((p) => ({ x: p.x, y: p.y - 0.6 })), 1.3, '#7f95ee', 0.38);
  pen.hair(KEEL, px(k, 1), INK, 0.6);
}

function paintBody(k: Brush): void {
  const { pen } = k;
  paintFin(k, CAUDAL, { x: -112, y: 0 }, { x: -168, y: -46 }, 10);
  pen.clipped(CAUDAL, () => pen.stroke(CAUDAL.filter((p) => p.x < -148).map((p) => ({ x: p.x + 1.5, y: p.y })), px(k, 4), DARK, 0.3, false));
  paintFin(k, ANAL, { x: -86, y: 6 }, { x: -89, y: 12 }, 4);
  paintFin(k, PELVIC, { x: -40, y: 17 }, { x: -44, y: 27 }, 5);
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    paintMetal(k);
    paintDorsals(k);
  });
  paintStalk(k);
  paintHead(k);
  pen.stroke(TOPLINE.filter((p) => p.x > -100), px(k, 1.5), INK, 1, true);
  pen.stroke(BELLY.filter((p) => p.x > -100), px(k, 2.1), INK, 1, true);
}

function paintPectoral(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  pen.fill(PECTORAL, PAPER_FILL, 1);
  pen.clipped(PECTORAL, () => {
    shade(ctx, PECTORAL, -7, 7, [[0, '#3f62cc'], [0.45, '#25389e'], [1, '#141f66']]);
    const g = ctx.createLinearGradient(0, 0, 52, 0);
    g.addColorStop(0, 'rgba(8,10,40,0)');
    g.addColorStop(1, 'rgba(8,10,40,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -12, 70, 24);
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      pen.hair(spline([{ x: 0, y: -4.6 + u * 10 }, { x: 24, y: -4.6 + u * 8 }, { x: 48, y: 1.5 + u * 3 }], 5), px(k, 0.7), DARK, 0.18);
    }
    softLine(ctx, [{ x: 3, y: -5.6 }, { x: 22, y: -6.2 }, { x: 40, y: -2.8 }, { x: 50, y: 2.4 }], 3, '#a4b4ff', 0.4);
    if (far) {
      ctx.fillStyle = 'rgba(6,8,30,0.42)';
      ctx.fillRect(-10, -12, 70, 24);
    }
  });
  pen.stroke(PECTORAL.slice(3, PECTORAL.length - 3), px(k, far ? 1.2 : 1.6), INK, 1, true);
}

// ---------------------------------------------------------------- the shark

const PAINT: SharkPaint = {
  box: { x0: -178, x1: 166, y0: -64, y1: 50 } as Box,
  pecBox: { x0: -5, x1: 54, y0: -10, y1: 10 },
  seed: 5303,
  gape: GAPE,
  body: paintBody,
  pectoral: paintPectoral,
};
const MADE = spriteMaker(PAINT);

const DRAW: SharkDraw = {
  sprites: MADE.at,
  paint: PAINT,
  jawBox: MADE.jawBox,
  bend: { from: 40, rigid: -112, to: -172, wag: 6 },
  eye: { at: { x: 131, y: -4.4 }, r: 4.9, iris: '#26324a', lid: '#1b2a78', rim: 'rgba(180,195,255,0.45)' },
  near: { root: { x: 80, y: 19 }, angle: 2.5, stretch: 1 },
  far: { root: { x: 72, y: 17 }, angle: 2.75, stretch: 0.8 },
  units: 332,
};

export const MAKO: RawShark = {
  id: 'mako',
  name: 'SHORTFIN MAKO',
  painted: true,
  mouth: { along: 0.078, below: 0.036 },
  draw: (ctx, len, gulp, t, beat) => drawShark(ctx, DRAW, len, gulp, t, beat),
};
