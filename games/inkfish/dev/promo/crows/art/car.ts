import { type Pt } from '../../../../src/art/pen';
import { rngOf } from '../../otterpocket/brush';
import { dab, softLine } from '../../seal/art/paint';
import { arc, fillShape, groundShadow, inkLine, linear, P, radial, ring, spline, within } from './ink';

/**
 * Painted everyday cars, plain (no badges, no plate text): the big wheel of
 * the close-ups, a small hatchback side on, and the same kind of car from the
 * front. Units: the wheel has radius 100; the cars are 400 wide side on and
 * 170 from the front, 150 tall, their wheels standing at y = 0.
 */

// ---------------------------------------------------------------- wheel

/** A wheel of radius `r` px turned by `spin`; `depth` px of tread shows on the side `side` faces (perspective). */
export function drawWheel(ctx: CanvasRenderingContext2D, c: Pt, r: number, spin: number, depth: number, side: number, boil: number): void {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(r / 100, r / 100);
  const d = (depth / r) * 100 * side;
  if (depth > 0) {
    // The tread: the far rim's disc, joined to the near one, with its blocks and grooves.
    const far = ring(d, 0, 96, 97);
    const hull = side > 0 ? [...arc(0, 0, 99, Math.PI / 2, (3 * Math.PI) / 2, 24), ...arc(d, 0, 97, -Math.PI / 2, Math.PI / 2, 24)] : [...arc(d, 0, 97, Math.PI / 2, (3 * Math.PI) / 2, 24), ...arc(0, 0, 99, -Math.PI / 2, Math.PI / 2, 24)];
    fillShape(ctx, hull, linear(ctx, d - side * 60, 0, d + side * 98, 0, [[0, '#1b1c20'], [0.55, '#3c3d43'], [0.85, '#5c5c62'], [1, '#35363b']]));
    within(ctx, hull, () => {
      for (let i = 0; i < 44; i++) {
        const a = spin + (i / 44) * Math.PI * 2;
        const [cs, sn] = [Math.cos(a), Math.sin(a)];
        if (cs * side < -0.2) continue;
        // Slanted grooves across the tread.
        const a2 = a + 0.07;
        softLine(ctx, [{ x: cs * 98, y: sn * 98 }, { x: d * 0.42 + cs * 98, y: sn * 98 }], 3.4, '#0e0f12', 0.9, 2);
        softLine(ctx, [{ x: d * 0.56 + Math.cos(a2) * 98, y: Math.sin(a2) * 98 }, { x: d + Math.cos(a2) * 97, y: Math.sin(a2) * 97 }], 3.4, '#0e0f12', 0.9, 2);
      }
      for (const v of [0.46, 0.53]) softLine(ctx, arc(d * v, 0, 98, side > 0 ? -1.6 : 1.5, side > 0 ? 1.6 : 4.7, 30), 3, '#101114', 0.9, 2);
      softLine(ctx, arc(d * 0.9, 0, 97, side > 0 ? -1.2 : 2, side > 0 ? 0.9 : 4.3, 30), 5, '#8d8a86', 0.35, 3);
    });
    inkLine(ctx, hull, 2, 0.85, boil, true);
    void far;
  }
  // The sidewall.
  const tyre = Array.from({ length: 176 }, (_, i) => {
    const a = (i / 176) * Math.PI * 2;
    const t = ((((a - spin) / (Math.PI * 2)) * 44) % 1 + 1) % 1;
    const rr = t < 0.18 ? 97.6 : 100;
    return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
  });
  fillShape(ctx, tyre, radial(ctx, -20, -30, 130, [[0, '#55565c'], [0.6, '#3c3d42'], [0.85, '#2a2b30'], [1, '#1a1b1f']]));
  within(ctx, tyre, () => {
    dab(ctx, -40, -70, 70, '200,205,215', 0.28);
    dab(ctx, 10, 90, 80, '8,8,12', 0.5);
    softLine(ctx, ring(0, 0, 92, 92, 60), 3, '#15161a', 0.8, 2);
    softLine(ctx, arc(0, 0, 90, Math.PI * 0.9, Math.PI * 1.75), 3, '#9b9ca4', 0.45, 2);
    softLine(ctx, ring(0, 0, 78, 78, 60), 2.4, '#17181c', 0.7, 2);
    softLine(ctx, arc(0, 0, 76, Math.PI * 0.95, Math.PI * 1.7), 2.4, '#8d8e96', 0.4, 2);
    // Short ribs round the shoulder and a dusting of road.
    for (let i = 0; i < 44; i++) {
      const a = spin + ((i + 0.6) / 44) * Math.PI * 2;
      softLine(ctx, [{ x: Math.cos(a) * 93, y: Math.sin(a) * 93 }, { x: Math.cos(a) * 99, y: Math.sin(a) * 99 }], 2, '#101114', 0.6, 1);
    }
    const rng = rngOf(8);
    for (let i = 0; i < 60; i++) {
      const a = rng() * 6.28 + spin;
      const q = 68 + rng() * 30;
      dab(ctx, Math.cos(a) * q, Math.sin(a) * q, 1.6 + rng() * 3, '176,164,146', 0.2);
    }
  });
  inkLine(ctx, tyre, 2.4, 0.9, boil, true);
  // The wheel: a steel rim, a hubcap with slots, nuts.
  const rim = ring(0, 0, 64);
  fillShape(ctx, rim, radial(ctx, -18, -22, 92, [[0, '#f4f2ec'], [0.45, '#c9c9c8'], [0.8, '#8c8f96'], [1, '#5b5e67']]));
  fillShape(ctx, ring(0, 0, 57), linear(ctx, -40, -50, 40, 56, [[0, '#8d9098'], [0.5, '#c4c5c6'], [1, '#eceae4']]));
  fillShape(ctx, ring(0, 0, 54), radial(ctx, -14, -20, 84, [[0, '#f6f4ee'], [0.5, '#cfd0d0'], [1, '#8b8f97']]));
  for (let i = 0; i < 9; i++) {
    const a = spin + (i / 9) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    const slot = spline(P(34, -7, 46, -9, 49, 0, 46, 9, 34, 7, 31, 0), 4, true);
    fillShape(ctx, slot, linear(ctx, 32, 0, 49, 0, [[0, '#15161a'], [1, '#3a3c43']]));
    inkLine(ctx, slot, 1.2, 0.7, boil, true);
    ctx.restore();
  }
  fillShape(ctx, ring(0, 0, 21), radial(ctx, -6, -8, 30, [[0, '#ffffff'], [0.5, '#cfd0d1'], [1, '#7d818a']]));
  for (let i = 0; i < 5; i++) {
    const a = spin + 0.3 + (i / 5) * Math.PI * 2;
    const n = { x: Math.cos(a) * 13, y: Math.sin(a) * 13 };
    fillShape(ctx, ring(n.x, n.y, 2.6, 2.6, 6, a), '#60646d');
  }
  fillShape(ctx, ring(0, 0, 6), '#a9acb2');
  inkLine(ctx, ring(0, 0, 21), 1.4, 0.75, boil, true);
  inkLine(ctx, ring(0, 0, 54), 1.2, 0.6, boil, true);
  inkLine(ctx, rim, 2, 0.85, boil, true);
  softLine(ctx, arc(0, 0, 60.5, Math.PI * 1.05, Math.PI * 1.55), 4, '#ffffff', 0.8, 3);
  ctx.restore();
}

// ---------------------------------------------------------------- colours

export interface Paint { readonly lit: string; readonly mid: string; readonly deep: string }
export const PAINTS = {
  red: { lit: '#f0765a', mid: '#c9402f', deep: '#75201d' },
  blue: { lit: '#8fb9d6', mid: '#4c83ac', deep: '#27486a' },
  cream: { lit: '#fbf3df', mid: '#dccfb0', deep: '#94856a' },
  teal: { lit: '#8fd0c4', mid: '#3f988f', deep: '#1f5556' },
  yellow: { lit: '#ffe08a', mid: '#e3ab35', deep: '#93641a' },
} as const;

/** A driver behind the glass: a soft dark shape of head and shoulders, with only a hint of a face (`face` 1 right, -1 left, 0 to us). */
function drawDriver(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, face: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k * (face < 0 ? -1 : 1), k);
  const shoulders = spline(P(-44, 52, -36, 26, -10, 15, 12, 15, 34, 24, 44, 52), 6, true);
  fillShape(ctx, shoulders, linear(ctx, 0, 14, 0, 52, [[0, '#3a4250'], [1, '#1d222b']]), 0.85);
  fillShape(ctx, P(-7, 4, 8, 4, 9, 20, -8, 20), '#6d5546', 0.8);
  const head = face === 0 ? spline(P(0, -25, 13, -20, 17, -4, 13, 11, 0, 20, -13, 11, -17, -4, -13, -20), 6, true) : spline(P(-2, -25, 11, -20, 16, -8, 19, -1, 15, 5, 13, 13, 3, 18, -10, 11, -16, -4, -13, -19), 6, true);
  fillShape(ctx, head, linear(ctx, -18, 0, 18, 0, [[0, '#4f3d33'], [0.6, '#8a6a55'], [1, '#a98468']]), 0.85);
  within(ctx, head, () => {
    for (const e of face === 0 ? [-6, 7] : [10]) dab(ctx, e, -2, 6, '30,20,16', 0.55);
    dab(ctx, face === 0 ? 1 : 13, 10, 6, '60,32,26', 0.35);
    dab(ctx, face === 0 ? 2 : 17, 3, 5, '214,172,140', 0.4);
    dab(ctx, 0, -24, 22, '24,18,16', 0.95);
    dab(ctx, -16, 0, 14, '24,18,16', 0.6);
  });
  softLine(ctx, face === 0 ? arc(0, -8, 17, Math.PI * 1.05, Math.PI * 1.95) : arc(-2, -8, 16, Math.PI * 0.85, Math.PI * 1.75), 11, '#1d1613', 0.9, 4);
  ctx.restore();
}

/** Sky and autumn trees mirrored in the glass, over whatever is behind it. */
function reflections(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number): void {
  const w = x1 - x0;
  const h = y1 - y0;
  fillShape(ctx, P(x0, y0, x1, y0, x1, y1, x0, y1), linear(ctx, x0, y0, x1, y1, [[0, 'rgba(226,238,242,0.55)'], [0.35, 'rgba(170,192,200,0.25)'], [0.7, 'rgba(120,140,150,0.3)'], [1, 'rgba(214,226,228,0.5)']]));
  const rng = rngOf(19);
  for (let i = 0; i < 22; i++) dab(ctx, x0 + w * rng(), y0 + h * (0.05 + 0.5 * rng()), h * (0.08 + 0.12 * rng()), i % 3 ? '226,164,74' : '196,98,56', 0.22);
  for (const [u, k] of [[0.3, 0.16], [0.42, 0.06], [0.74, 0.12]] as const) fillShape(ctx, P(x0 + w * (u + 0.08), y0, x0 + w * (u + 0.08 + k), y0, x0 + w * (u - 0.1 + k), y1, x0 + w * (u - 0.1), y1), linear(ctx, 0, y0, 0, y1, [[0, 'rgba(244,250,250,0.5)'], [1, 'rgba(244,250,250,0.12)']]));
}

// ---------------------------------------------------------------- side view

const SIDE: readonly Pt[] = spline(P(-196, -34, -200, -66, -192, -92, -176, -104, -150, -140, -110, -152, 0, -154, 46, -146, 84, -102, 150, -92, 186, -80, 197, -58, 195, -36, 184, -25, 110, -24, 0, -24, -110, -24, -182, -25), 6, true);
const GLASS: readonly (readonly Pt[])[] = [
  spline(P(-160, -104, -140, -136, -108, -144, -66, -145, -66, -102), 4, true),
  spline(P(-56, -102, -56, -145, 0, -146, 38, -139, 68, -104, 60, -101), 4, true),
];

/** A small car side on, its nose towards `face`, its wheels on the ground at (x, y). */
export function drawCarSide(ctx: CanvasRenderingContext2D, at: Pt, k: number, face: number, paint: Paint, spin: number, boil: number): void {
  groundShadow(ctx, at.x, at.y + 2 * k, 230 * k, 20 * k, 0.6);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(k * face, k);
  fillShape(ctx, P(-176, -40, 176, -40, 170, -14, -170, -14), '#17181c');
  fillShape(ctx, SIDE, linear(ctx, 0, -156, 0, -24, [[0, paint.lit], [0.25, paint.mid], [0.5, paint.lit], [0.62, paint.mid], [1, paint.deep]]));
  within(ctx, SIDE, () => {
    softLine(ctx, P(-196, -84, -60, -90, 80, -88, 196, -72), 7, '#ffffff', 0.4, 4);
    softLine(ctx, P(-190, -44, 190, -42), 12, paint.deep, 0.55, 4);
    dab(ctx, -60, -152, 90, '255,255,255', 0.4);
    dab(ctx, -170, -40, 70, '10,10,16', 0.25);
  });
  GLASS.forEach((g, i) => {
    fillShape(ctx, g, linear(ctx, -140, -146, 60, -100, [[0, '#6f8794'], [0.4, '#33424c'], [1, '#56707c']]));
    within(ctx, g, () => {
      if (i === 1) drawDriver(ctx, 8, -110, 1, 1);
      reflections(ctx, i ? -56 : -160, i ? 68 : -66, -146, -101);
    });
    inkLine(ctx, g, 1.4, 0.85, boil, true);
  });
  inkLine(ctx, P(-61, -100, -62, -60, -56, -30), 1.2, 0.6, boil);
  inkLine(ctx, P(72, -98, 78, -60, 66, -30), 1.2, 0.6, boil);
  inkLine(ctx, P(-46, -84, -26, -84), 2.4, 0.7, boil);
  fillShape(ctx, spline(P(172, -82, 194, -70, 196, -58, 178, -62), 4, true), radial(ctx, 184, -70, 18, [[0, '#fffdf0'], [1, '#d8c48c']]));
  fillShape(ctx, spline(P(-198, -84, -186, -84, -186, -60, -199, -60), 4, true), radial(ctx, -194, -74, 18, [[0, '#ff8a70'], [1, '#a32420']]));
  fillShape(ctx, P(60, -106, 72, -118, 84, -116, 82, -104), paint.mid);
  for (const x of [-118, 122]) fillShape(ctx, arc(x, -34, 46, Math.PI, Math.PI * 2), '#15161a');
  inkLine(ctx, SIDE, 2, 0.9, boil, true);
  ctx.restore();
  for (const x of [-118, 122]) drawWheel(ctx, { x: at.x + x * k * face, y: at.y - 36 * k }, 36 * k, spin * face, 0, 1, boil);
}

// ---------------------------------------------------------------- front view

const FRONT: readonly Pt[] = spline(P(-84, -30, -88, -62, -84, -84, -72, -96, -60, -138, -46, -150, 0, -154, 46, -150, 60, -138, 72, -96, 84, -84, 88, -62, 84, -34, 72, -25, 40, -24, 0, -24, -40, -24, -72, -25), 6, true);
const SCREEN: readonly Pt[] = spline(P(-66, -98, -54, -136, -40, -144, 0, -146, 40, -144, 54, -136, 66, -98, 0, -94), 5, true);

/** A small car coming straight at us. `dip` noses it down (braking). */
export function drawCarFront(ctx: CanvasRenderingContext2D, at: Pt, k: number, paint: Paint, boil: number, dip = 0, roll = 0): void {
  groundShadow(ctx, at.x, at.y + 2 * k, 120 * k, 16 * k, 0.7);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(k, k);
  // The dark under the car, then the two front tyres, tread on.
  fillShape(ctx, P(-74, -40, 74, -40, 70, -10, -70, -10), '#101115');
  for (const s of [-1, 1]) {
    const tyre = spline(P(s * 60 - 13, -46, s * 60 + 13, -46, s * 60 + 15, -30, s * 60 + 15, -6, s * 60 + 10, 0, s * 60 - 10, 0, s * 60 - 15, -6, s * 60 - 15, -30), 4, true);
    fillShape(ctx, tyre, linear(ctx, s * 60 - 15, 0, s * 60 + 15, 0, [[0, '#1b1c20'], [0.4, '#4d4e54'], [1, '#1e1f23']]));
    within(ctx, tyre, () => {
      for (let i = -1; i < 9; i++) {
        const y = -46 + ((i + (((roll % 1) + 1) % 1)) * 6);
        softLine(ctx, P(s * 60 - 14, y, s * 60 - 4, y + 3), 1.6, '#0d0e11', 0.9, 2);
        softLine(ctx, P(s * 60 + 4, y + 3, s * 60 + 14, y), 1.6, '#0d0e11', 0.9, 2);
      }
      softLine(ctx, P(s * 60 - 3, -46, s * 60 - 3, 0), 1.2, '#0d0e11', 0.9, 2);
      softLine(ctx, P(s * 60 + 3, -46, s * 60 + 3, 0), 1.2, '#0d0e11', 0.9, 2);
    });
    inkLine(ctx, tyre, 1.8, 0.9, boil, true);
  }
  ctx.translate(0, 4 * dip);
  fillShape(ctx, FRONT, linear(ctx, 0, -154, 0, -24, [[0, paint.lit], [0.4, paint.mid], [0.48, paint.lit], [0.7, paint.mid], [1, paint.deep]]));
  within(ctx, FRONT, () => {
    dab(ctx, 0, -88, 80, '255,255,255', 0.35);
    softLine(ctx, P(-84, -80, 0, -86, 84, -80), 4, '#ffffff', 0.5, 3);
    dab(ctx, -84, -50, 40, '10,10,16', 0.3);
    dab(ctx, 84, -50, 40, '10,10,16', 0.3);
  });
  fillShape(ctx, SCREEN, linear(ctx, -50, -146, 50, -96, [[0, '#8fa6b0'], [0.4, '#3d4c56'], [1, '#5f7884']]));
  within(ctx, SCREEN, () => {
    // Right-hand drive: the driver sits on our left.
    drawDriver(ctx, -28, -112, 0.9, 0);
    reflections(ctx, -66, 66, -147, -94);
  });
  inkLine(ctx, SCREEN, 1.6, 0.85, boil, true);
  for (const s of [-1, 1]) {
    const lamp = spline(P(s * 50, -76, s * 76, -82, s * 82, -70, s * 74, -60, s * 52, -62), 4, true);
    fillShape(ctx, lamp, radial(ctx, s * 66, -70, 22, [[0, '#ffffff'], [0.5, '#f4ecca'], [1, '#b6a984']]));
    inkLine(ctx, lamp, 1.4, 0.85, boil, true);
    fillShape(ctx, spline(P(s * 70, -108, s * 88, -112, s * 92, -98, s * 78, -96), 4, true), paint.mid);
    inkLine(ctx, spline(P(s * 70, -108, s * 88, -112, s * 92, -98, s * 78, -96), 4, true), 1.2, 0.8, boil, true);
  }
  const grille = spline(P(-44, -56, 44, -56, 38, -42, -38, -42), 4, true);
  fillShape(ctx, grille, '#1c1d22');
  for (const y of [-52, -48, -45]) softLine(ctx, P(-40, y, 40, y), 1.4, '#7d808a', 0.6, 1);
  fillShape(ctx, P(-20, -40, 20, -40, 20, -29, -20, -29), '#f1efe6');
  inkLine(ctx, P(-20, -40, 20, -40, 20, -29, -20, -29), 1, 0.7, boil, true);
  inkLine(ctx, P(-84, -58, -50, -40, 50, -40, 84, -58), 1, 0.4, boil);
  inkLine(ctx, FRONT, 2, 0.9, boil, true);
  ctx.restore();
}

// ---------------------------------------------------------------- the close-up's corner of a car

/**
 * The front corner of a car over its big wheel, filling a close-up: the wing
 * with its arch, the short nose and the bumper's tuck. Wheel radius 100, its
 * middle at 0,0; the nose towards +x.
 */
export function drawCarCorner(ctx: CanvasRenderingContext2D, paint: Paint, boil: number): void {
  const arch = arc(0, 0, 118, Math.PI * 1.02, Math.PI * 1.88, 26);
  const body: Pt[] = [{ x: -420, y: 40 }, { x: -118, y: 40 }, ...arch, ...spline(P(114, -34, 140, -30, 166, -40, 180, -66, 178, -104, 168, -140, 136, -190, 60, -238, -60, -262, -420, -300), 5)];
  // Inside the arch, under the wing's edge.
  const well = [...arc(0, 0, 121, Math.PI * 1.0, Math.PI * 1.88, 26), { x: 96, y: 10 }, { x: -121, y: 40 }];
  fillShape(ctx, well, '#0f1014');
  fillShape(ctx, body, linear(ctx, 0, -270, 30, 30, [[0, paint.lit], [0.35, paint.mid], [0.5, paint.lit], [0.7, paint.mid], [1, paint.deep]]));
  within(ctx, body, () => {
    softLine(ctx, spline(P(-420, -170, -60, -168, 80, -150, 160, -112), 6), 30, '#ffffff', 0.42, 16);
    softLine(ctx, spline(P(-420, -176, -60, -174, 80, -156, 170, -116), 6), 6, '#ffffff', 0.35, 6);
    softLine(ctx, arc(0, 0, 125, Math.PI * 0.98, Math.PI * 1.98, 30), 15, paint.lit, 0.75, 12);
    softLine(ctx, spline(P(100, -34, 142, -33, 180, -56), 4), 16, paint.deep, 0.75, 10);
    dab(ctx, 60, -250, 160, '255,250,235', 0.5);
    dab(ctx, -300, 0, 180, '20,10,16', 0.4);
  });
  const lamp = spline(P(110, -150, 134, -160, 156, -128, 164, -104, 138, -100, 112, -118), 5, true);
  fillShape(ctx, lamp, radial(ctx, 140, -126, 46, [[0, '#ffffff'], [0.45, '#fbf0c6'], [1, '#b49f6c']]));
  within(ctx, lamp, () => {
    softLine(ctx, ring(140, -124, 17, 19), 5, '#a99568', 0.7, 3);
    dab(ctx, 140, -124, 15, '255,255,255', 0.9);
  });
  inkLine(ctx, lamp, 2, 0.9, boil, true);
  softLine(ctx, P(118, -140, 138, -146), 4, '#ffffff', 0.9, 2);
  inkLine(ctx, body, 2.4, 0.9, boil, true);
  // The bumper's crease and the dark gap under it.
  inkLine(ctx, spline(P(104, -70, 136, -84, 176, -92), 4), 1.6, 0.55, boil);
  inkLine(ctx, spline(P(62, -240, 40, -200, 20, -150, 24, -128), 5), 1.6, 0.4, boil);
}
