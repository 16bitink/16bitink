import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { type Box, type Brush, columnWash, contour, edgeAt, px, shade, smoothLoop, softLine, type Stops } from '../../seal/art/paint';
import { type Gape, type SharkDraw, type SharkPaint, drawShark, spriteMaker } from './bigSharkKit';
import type { RawShark } from './contract';

/**
 * The great hammerhead (Sphyrna mokarran), painted for the size video. The
 * body is a side view; the head is turned a little toward us and seen a
 * little from above, so the hammer (the cephalofoil) reads: its near blade
 * hangs down in front of the mouth with the eye at its tip, the far blade
 * rises over the head, and the front edge between them runs nearly straight
 * with a notch in the middle. A very tall sickle first dorsal, a tall curved
 * anal fin, pelvics with curved rear edges, a long upper tail lobe with its
 * notch. Bronze-grey above, white below; the big jaw drops under the hammer.
 *
 * Own units: about 313 long, the middle at 0,0, nose right, belly down.
 */

// ---------------------------------------------------------------- the hammer, in its own plane

/** The notch in the hammer's front edge, and how the plate's lateral axis lands on the page (x and y per unit out toward us). */
const NOTCH: Pt = { x: 160, y: -1 };
const TOWARD = { x: 0.28, y: 0.5 } as const;

/** Half the plate, (forward, out) from the notch: the front edge, the rounded lobe with the eye, the hind margin back to the head. */
const HALF: readonly (readonly [number, number])[] = [
  [-2.6, 0], [0, 4], [-0.4, 12], [-0.9, 20], [-1.6, 28], [-2.6, 35], [-4.8, 40], [-8.4, 42], [-12.4, 41.4], [-15.4, 38], [-17.6, 29], [-20, 19], [-22.6, 10], [-26, 0],
];
const plate = (side: 1 | -1, pts = HALF): Pt[] => spline(pts.map(([f, o]) => ({ x: NOTCH.x + f + TOWARD.x * o * side, y: NOTCH.y + TOWARD.y * o * side })), 4);
const NEAR_BLADE = plate(1);
const FAR_BLADE = plate(-1);
/** The groove just behind the front edge (the nostrils sit in it). */
const groove = (side: 1 | -1): Pt[] => plate(side, [[-3.4, 4], [-2.2, 12], [-2.6, 20], [-3.4, 28], [-4.8, 35]]);
const EYE_AT = { x: NOTCH.x - 8.6 + TOWARD.x * 41.2, y: NOTCH.y + TOWARD.y * 41.2 };

// ---------------------------------------------------------------- the body

const BACK: readonly Pt[] = spline([
  { x: 154, y: -1 }, { x: 150, y: -6 }, { x: 140, y: -11 }, { x: 122, y: -15.5 }, { x: 100, y: -20 }, { x: 80, y: -23 }, { x: 60, y: -24.5 },
  { x: 40, y: -24.5 }, { x: 20, y: -23 }, { x: 0, y: -20.5 }, { x: -20, y: -17 }, { x: -40, y: -13 }, { x: -58, y: -9.5 }, { x: -74, y: -6.5 },
  { x: -88, y: -4.5 }, { x: -100, y: -3 }, { x: -112, y: -2 },
], 5);
const BELLY: readonly Pt[] = spline([
  { x: 154, y: -1 }, { x: 150, y: 5 }, { x: 140, y: 10.4 }, { x: 124, y: 14.5 }, { x: 106, y: 19 }, { x: 86, y: 23 }, { x: 64, y: 26 },
  { x: 42, y: 27 }, { x: 20, y: 26 }, { x: 0, y: 23.5 }, { x: -20, y: 19.5 }, { x: -40, y: 15 }, { x: -58, y: 11 }, { x: -74, y: 7.5 },
  { x: -88, y: 5 }, { x: -100, y: 3.5 }, { x: -112, y: 2.5 },
], 5);
const topAt = (x: number): number => edgeAt(BACK, x);
const bottomAt = (x: number): number => edgeAt(BELLY, x);
const along = (v: number, x0: number, x1: number, step = 4): Pt[] => contour(topAt, bottomAt, v, x0, x1, step);

/** The very tall sickle first dorsal: a long convex leading edge, a pointed apex swept back, a deep concave trailing edge, a free rear tip. */
const DORSAL: readonly Pt[] = spline([
  { x: 78, y: -23.2 }, { x: 74, y: -32 }, { x: 68, y: -44 }, { x: 60, y: -57 }, { x: 51, y: -69 }, { x: 43, y: -77.5 }, { x: 37, y: -81 },
  { x: 34.6, y: -79 }, { x: 36, y: -70 }, { x: 39, y: -58 }, { x: 41, y: -46 }, { x: 40.6, y: -37 }, { x: 38, y: -30 }, { x: 33.5, y: -26.4 },
  { x: 38, y: -25.4 }, { x: 46, y: -24.9 },
], 5);
const SECOND_DORSAL: readonly Pt[] = spline([
  { x: -50, y: -10.6 }, { x: -53, y: -16 }, { x: -57, y: -21.5 }, { x: -60, y: -23.5 }, { x: -61.6, y: -21 }, { x: -62, y: -16 },
  { x: -64.5, y: -11.5 }, { x: -70, y: -8.6 }, { x: -76, y: -6.4 },
], 4);
const TOPLINE: readonly Pt[] = [
  ...BACK.filter((p) => p.x > 78), ...DORSAL, ...BACK.filter((p) => p.x < 46 && p.x > -50), ...SECOND_DORSAL, ...BACK.filter((p) => p.x < -76),
];
const BODY: readonly Pt[] = [...TOPLINE, ...[...BELLY].reverse().slice(1, -1)];

const CAUDAL: readonly Pt[] = spline([
  { x: -96, y: -3 }, { x: -108, y: -8 }, { x: -120, y: -15 }, { x: -132, y: -24 }, { x: -142, y: -33.5 }, { x: -149, y: -42 },
  { x: -153, y: -47 }, { x: -152, y: -41.5 }, { x: -147, y: -36.5 }, { x: -143.5, y: -32.5 }, { x: -144, y: -28 }, { x: -140, y: -23 },
  { x: -133.5, y: -15 }, { x: -127.5, y: -7 }, { x: -124, y: 0 }, { x: -123, y: 6 }, { x: -124.5, y: 14 }, { x: -127, y: 22 },
  { x: -129.5, y: 27.5 }, { x: -121, y: 22.5 }, { x: -112, y: 14.5 }, { x: -104, y: 8 }, { x: -96, y: 4 },
], 4);
const ANAL: readonly Pt[] = smoothLoop([
  { x: -46, y: 11.4 }, { x: -50, y: 17.5 }, { x: -55, y: 24 }, { x: -59, y: 28.4 }, { x: -61.4, y: 27.4 }, { x: -61.2, y: 21 },
  { x: -63.5, y: 15 }, { x: -68.5, y: 10.4 }, { x: -73, y: 8.4 }, { x: -62, y: 7.8 }, { x: -50, y: 9 },
], 3);
const PELVIC: readonly Pt[] = smoothLoop([
  { x: -6, y: 21 }, { x: -11.5, y: 27.5 }, { x: -18, y: 32.5 }, { x: -23.4, y: 33.4 }, { x: -23, y: 29 }, { x: -25, y: 23 },
  { x: -29.5, y: 18 }, { x: -24, y: 15 }, { x: -8, y: 17.5 },
], 3);

const LINE: readonly Pt[] = spline([
  { x: 156, y: 2 }, { x: 136, y: 4.5 }, { x: 120, y: 7.4 }, { x: 100, y: 9.8 }, { x: 80, y: 11.2 }, { x: 60, y: 12.2 }, { x: 40, y: 12.2 },
  { x: 20, y: 11 }, { x: 0, y: 9 }, { x: -20, y: 7 }, { x: -40, y: 5 }, { x: -60, y: 3 }, { x: -80, y: 1.5 }, { x: -100, y: 0.5 }, { x: -124, y: 0 },
], 5).map((p) => ({ x: p.x, y: p.y + 0.6 * Math.sin(p.x * 0.19) + 0.3 * Math.sin(p.x * 0.53 + 2) }));
const lineAt = (x: number): number => edgeAt(LINE, x);

const GILLS = [108, 103, 98, 93, 88] as const;

const PECTORAL: readonly Pt[] = smoothLoop([
  { x: -3, y: -6.5 }, { x: 10, y: -7.6 }, { x: 22, y: -6.6 }, { x: 32, y: -3.4 }, { x: 40, y: 1.6 }, { x: 44, y: 6 }, { x: 40.5, y: 6.4 },
  { x: 33, y: 3.4 }, { x: 24, y: 3.8 }, { x: 14, y: 5.6 }, { x: 4, y: 7.2 }, { x: -3, y: 6.4 },
], 4);

const GAPE: Gape = {
  upper: spline([{ x: 140, y: 6.6 }, { x: 131, y: 9.4 }, { x: 121, y: 11.6 }, { x: 112, y: 12.8 }], 4),
  chin: spline([{ x: 142.5, y: 11.6 }, { x: 132, y: 16.4 }, { x: 122, y: 19.4 }, { x: 113, y: 20.8 }, { x: 110.5, y: 20.8 }], 4),
  throat: { x: 97, y: 21 },
  max: 0.56,
  teeth: { upper: 10, lower: 10, long: 3.1, lean: 0.55, slim: 0.62 },
  skin: '#e9e5dc',
};

// ---------------------------------------------------------------- paint

const BRONZE = '#5c5642';
const DARK = '#24211a';
const SHEEN = '#e6dfc4';
const COOL = '#6c6f72';

function bronzeStops(x: number): Stops {
  const t = topAt(x);
  const l = Math.max(0.25, Math.min(0.9, (lineAt(x) - t) / Math.max(1, bottomAt(x) - t)));
  return [
    [0, '#3e3a2c'], [l * 0.3, '#544f3c'], [l * 0.62, '#6c6650'], [l * 0.88, '#857e65'], [l - 0.02, '#9c9579'],
    [l + 0.05, '#ebe8de'], [Math.min(1, l + 0.3), '#f2f0ea'], [1, '#cdccc6'],
  ];
}

function paintFin(k: Brush, shape: readonly Pt[], root: Pt, tip: Pt, rays = 8): void {
  const { pen, ctx } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    pen.fill(shape, '#5a543f', 1);
    const g = ctx.createLinearGradient(root.x, root.y, tip.x, tip.y);
    g.addColorStop(0, 'rgba(160,150,115,0.4)');
    g.addColorStop(0.55, 'rgba(90,84,60,0)');
    g.addColorStop(1, 'rgba(20,18,12,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-220, -120, 440, 240);
    for (let i = 0; i < rays; i++) {
      const u = i / (rays - 1);
      pen.hair([root, { x: tip.x + (u - 0.5) * 14, y: tip.y + (u - 0.5) * 12 }], px(k, 0.7), DARK, 0.12 + 0.14 * u);
    }
  });
  pen.stroke(shape, px(k, 1.4), INK, 1, true);
}

function paintDorsals(k: Brush): void {
  const { pen, ctx } = k;
  for (const [fin, foot0, foot1] of [[DORSAL, 78, 46], [SECOND_DORSAL, -50, -76]] as const) {
    const apex = fin.reduce((a, p) => (p.y < a.y ? p : a));
    const shape = [...fin, { x: foot1, y: 0 }, { x: foot0, y: 0 }];
    pen.clipped(shape, () => {
      for (let i = 0; i < 12; i++) {
        const u = i / 11;
        const fx = foot0 + (foot1 - foot0) * u;
        pen.hair(spline([{ x: fx, y: topAt(fx) }, { x: (fx + apex.x) / 2 + 3, y: (topAt(fx) + apex.y) / 2 }, { x: apex.x + u * 2, y: apex.y + 3 + u * 5 }], 4), px(k, 0.7), u < 0.3 ? SHEEN : DARK, u < 0.3 ? 0.3 : 0.12 + 0.2 * u);
      }
      softLine(ctx, fin.filter((p) => p.x < apex.x + 4), 6, '#151209', 0.38);
      softLine(ctx, fin.filter((p) => p.x >= apex.x), 4, '#c9bf98', 0.34);
    });
  }
}

function paintBronze(k: Brush): void {
  const { pen, ctx } = k;
  columnWash(ctx, -124, 158, 1, topAt, bottomAt, bronzeStops, 70);
  softLine(ctx, along(0.12, 140, -110), 7, '#d8cfa8', 0.22);
  for (let r = 0; r < 10; r++) {
    const v = 0.04 + (0.3 * (r + pen.rng() * 0.7)) / 10;
    let x = 140 - pen.rng() * 30;
    while (x > -110) {
      const end = Math.max(-112, x - 10 - pen.rng() * 40);
      pen.hair(along(v, x, end, 3), px(k, 0.9 + pen.rng() * 0.6), SHEEN, 0.22 * (1 - v / 0.36));
      x = end - 4 - pen.rng() * 18;
    }
  }
  softLine(ctx, LINE.map((p) => ({ x: p.x, y: p.y - 2.4 })), 5, '#b3aa86', 0.28);
  pen.stipple(BODY, 1300, (x, y) => 0.45 * Math.max(0, 1 - (y - topAt(x)) / 15), px(k, 0.7), 'rgba(235,228,200,0.5)');
  pen.hair(along(0.36, 104, -110, 5), px(k, 0.8), '#cfc6a2', 0.18);
  for (let r = 1; r <= 3; r++) pen.hair(along(1 - r * 0.05, 130, -90, 5), px(k, 0.7), COOL, 0.15 - r * 0.03);
  softLine(ctx, along(0.985, 136, -100), 4, '#a3a29a', 0.35);
  pen.hair(LINE.filter((p) => p.x < 150), px(k, 1), DARK, 0.3);
}

function paintGills(k: Brush): void {
  const { pen } = k;
  for (const x of GILLS) {
    const [top, bottom] = [topAt(x) * 0.5, bottomAt(x) * 0.58];
    const slit = spline([{ x: x + 2.2, y: top }, { x: x - 0.4, y: top * 0.35 }, { x: x - 0.7, y: bottom * 0.35 }, { x: x + 1.4, y: bottom }], 6);
    pen.fill([...slit, ...[...slit].reverse().map((p, i, all) => ({ x: p.x - 1.5 * Math.sin((Math.PI * i) / (all.length - 1)), y: p.y }))], DARK, 0.4);
    pen.stroke(slit, px(k, 1.2), INK, 0.9, false);
    pen.hair(slit.slice(2, -2).map((p) => ({ x: p.x - 1.8, y: p.y })), px(k, 0.9), SHEEN, 0.3);
  }
}

/** One blade of the hammer: its top washed bronze, lit along the front edge, shading back to the head; the far one dimmer. */
function paintBlade(k: Brush, side: 1 | -1): void {
  const { pen, ctx } = k;
  const blade = side > 0 ? NEAR_BLADE : FAR_BLADE;
  const tip = { x: NOTCH.x - 9 + TOWARD.x * 42 * side, y: NOTCH.y + TOWARD.y * 42 * side };
  pen.fill(blade, PAPER_FILL, 1);
  pen.clipped(blade, () => {
    const g = ctx.createLinearGradient(NOTCH.x - 30, NOTCH.y, tip.x, tip.y);
    g.addColorStop(0, '#6a644e');
    g.addColorStop(0.55, '#77715a');
    g.addColorStop(1, '#8e876d');
    ctx.fillStyle = g;
    ctx.fillRect(100, -40, 80, 80);
    // The front edge catches the light; the hind margin falls into shadow.
    softLine(ctx, blade.slice(0, Math.round(blade.length * 0.42)).map((p) => ({ x: p.x - 1.4, y: p.y })), 4, '#e1d8b4', 0.45);
    softLine(ctx, blade.slice(Math.round(blade.length * 0.6), Math.round(blade.length * 0.86)), 5, '#1a170f', 0.32);
    // The blade's thin front face, edge-on: a dark band just inside the front edge.
    softLine(ctx, plate(side, [[-1.2, 3], [-0.9, 12], [-1.4, 20], [-2.2, 28], [-3.4, 35], [-5.6, 39.4]]), 2.2, '#2a261b', 0.45);
    for (let i = 0; i < 5; i++) pen.hair(plate(side, [[-6 - i * 3.4, 4], [-6 - i * 3.2, 18], [-8 - i * 2.4, 32]]), px(k, 0.7), DARK, 0.1);
    pen.stipple(blade, 220, () => 0.5, px(k, 0.6), 'rgba(30,26,18,0.5)');
    if (side < 0) pen.fill(blade, '#1e1c16', 0.3);
  });
  pen.hair(groove(side), px(k, 0.9), INK, 0.55);
  pen.stroke(blade, px(k, 1.5), INK, 1, true);
  if (side < 0) {
    const e = { x: NOTCH.x - 8.6 - TOWARD.x * 40.4, y: NOTCH.y - TOWARD.y * 40.4 };
    pen.fill(spline([{ x: e.x - 1.3, y: e.y + 0.3 }, { x: e.x, y: e.y - 0.5 }, { x: e.x + 1.3, y: e.y + 0.3 }, { x: e.x, y: e.y + 0.9 }, { x: e.x - 1.3, y: e.y + 0.3 }], 3), '#0a0b0e', 0.8);
  }
}

/** Washes over the stalk where it runs on into the tail, so the belly's white doesn't streak onto the fin. */
function paintStalk(k: Brush): void {
  const { pen, ctx } = k;
  ctx.save();
  pen.clipped(BODY, () => {
    ctx.fillStyle = '#5a543f';
    for (let x = -94; x > -120; x -= 0.6) {
      ctx.globalAlpha = Math.min(1, (-94 - x) / 10);
      ctx.fillRect(x - 0.6, -20, 0.7, 40);
    }
  });
  ctx.restore();
}

function paintBody(k: Brush): void {
  const { pen } = k;
  paintFin(k, CAUDAL, { x: -100, y: 0 }, { x: -150, y: -42 }, 10);
  pen.clipped(CAUDAL, () => pen.stroke(CAUDAL.slice(28, 60).map((p) => ({ x: p.x + 1.4, y: p.y })), px(k, 4), DARK, 0.3, false));
  paintFin(k, ANAL, { x: -54, y: 10 }, { x: -60, y: 27 }, 6);
  paintFin(k, PELVIC, { x: -14, y: 19 }, { x: -22, y: 32 }, 5);
  paintBlade(k, -1);
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    paintBronze(k);
    paintDorsals(k);
  });
  paintStalk(k);
  paintGills(k);
  pen.stroke(TOPLINE.filter((p) => p.x > -98), px(k, 1.5), INK, 1, true);
  pen.stroke(BELLY.filter((p) => p.x > -98), px(k, 2.1), INK, 1, true);
}

function paintPectoral(k: Brush, far: boolean): void {
  const { pen, ctx } = k;
  pen.fill(PECTORAL, PAPER_FILL, 1);
  pen.clipped(PECTORAL, () => {
    shade(ctx, PECTORAL, -7, 7, [[0, '#8a836a'], [0.45, '#625c46'], [1, '#3f3a2b']]);
    const g = ctx.createLinearGradient(0, 0, 46, 0);
    g.addColorStop(0, 'rgba(20,18,12,0)');
    g.addColorStop(1, 'rgba(20,18,12,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -12, 64, 24);
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      pen.hair(spline([{ x: 0, y: -5 + u * 10.5 }, { x: 22, y: -5 + u * 8 }, { x: 41, y: 2.5 + u * 3 }], 5), px(k, 0.7), DARK, 0.18);
    }
    softLine(ctx, [{ x: 3, y: -6 }, { x: 20, y: -6.6 }, { x: 34, y: -2.4 }, { x: 42, y: 4 }], 3, '#d8cfa8', 0.4);
    if (far) {
      ctx.fillStyle = 'rgba(16,14,8,0.42)';
      ctx.fillRect(-10, -12, 64, 24);
    }
  });
  pen.stroke(PECTORAL.slice(3, PECTORAL.length - 3), px(k, far ? 1.2 : 1.6), INK, 1, true);
}

// ---------------------------------------------------------------- the shark

const PAINT: SharkPaint = {
  box: { x0: -158, x1: 166, y0: -86, y1: 44 } as Box,
  pecBox: { x0: -5, x1: 47, y0: -10, y1: 10 },
  seed: 6911,
  gape: GAPE,
  body: paintBody,
  over: (k) => paintBlade(k, 1),
  pectoral: paintPectoral,
};
const MADE = spriteMaker(PAINT);

const DRAW: SharkDraw = {
  sprites: MADE.at,
  paint: PAINT,
  jawBox: MADE.jawBox,
  bend: { from: 30, rigid: -100, to: -153, wag: 6 },
  eye: { at: EYE_AT, r: 2.9, iris: '#7a6630', lid: '#6e6850', rim: 'rgba(230,220,180,0.45)' },
  near: { root: { x: 84, y: 21 }, angle: 2.45, stretch: 1 },
  far: { root: { x: 76, y: 19 }, angle: 2.7, stretch: 0.8 },
  units: 313,
};

export const HAMMERHEAD: RawShark = {
  id: 'hammerhead',
  name: 'GREAT HAMMERHEAD',
  painted: true,
  mouth: { along: 0.14, below: -0.022 },
  draw: (ctx, len, gulp, t, beat) => drawShark(ctx, DRAW, len, gulp, t, beat),
};
