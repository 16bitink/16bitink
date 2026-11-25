import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { rngOf } from '../../otterpocket/brush';
import { dab, softLine, taper } from '../../seal/art/paint';
import { fillShape, inkLine, linear, P, ring, spline, within } from './ink';

/**
 * A street in Sendai in autumn, painted once into canvases: golden hazy sky,
 * a soft mountain, zelkovas and ginkgos turning, low shops with awnings and
 * cloth curtains, poles and wires. The road is painted per shot, in
 * perspective from the same horizon.
 */

/** The far picture's size; its horizon is at BACK.hy. */
export const BACK = { w: 1240, h: 1200, hy: 900 } as const;

type Ctx = CanvasRenderingContext2D;

/** A tree's crown: clouds of leaf dabs, dark below, lit on top, with leaf flecks at the edges. */
function crown(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number, dark: string, mid: string, lit: string, n = 240): void {
  const rng = rngOf(seed);
  const lump = (i: number): Pt => ({ x: Math.cos(i * 2.4) * rx * 0.62, y: Math.sin(i * 2.4) * ry * 0.55 });
  for (let pass = 0; pass < 3; pass++) {
    const ink = [dark, mid, lit][pass]!;
    for (let i = 0; i < n; i++) {
      const c = lump(i % 9);
      const a = rng() * 6.28;
      const q = Math.sqrt(rng());
      const px = x + c.x + Math.cos(a) * q * rx * 0.44 - pass * rx * 0.05;
      const py = y + c.y + Math.sin(a) * q * ry * 0.44 - pass * ry * 0.12;
      const s = (rx / 26) * (0.6 + rng() * 1.2) * (1 - pass * 0.16);
      ctx.save();
      ctx.globalAlpha = pass === 2 ? 0.5 : 0.62;
      ctx.translate(px, py);
      ctx.rotate(rng() * 3.14);
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.5, s * 0.85, 0, 0, 6.28);
      ctx.fill();
      ctx.restore();
    }
  }
  dab(ctx, x + rx * 0.2, y + ry * 0.5, rx * 0.9, '70,34,16', 0.25);
  dab(ctx, x - rx * 0.3, y - ry * 0.4, rx * 0.8, '255,240,190', 0.28);
}

function trunk(ctx: Ctx, x: number, y0: number, y1: number, w: number): void {
  taper(ctx, spline(P(x, y0, x + w * 0.3, (y0 + y1) / 2, x - w * 0.2, y1), 6), w, w * 0.5, '#4d3a2e', 0.95);
  taper(ctx, P(x - w * 0.2, y0, x - w * 0.1, y1), w * 0.3, w * 0.15, '#8d7058', 0.6);
  for (const s of [-1, 1]) taper(ctx, spline(P(x, y1 + (y0 - y1) * 0.3, x + s * w * 1.5, y1 + (y0 - y1) * 0.05, x + s * w * 3.2, y1 - (y0 - y1) * 0.35), 5), w * 0.5, w * 0.15, '#4d3a2e', 0.9);
}

interface Shop { readonly x0: number; readonly x1: number; readonly top0: number; readonly top1: number; readonly wall: string; readonly shade: string; readonly awning: readonly [string, string]; readonly noren?: string }

/** A shopfront running back in perspective from x0 (near) to x1 (far), its base on the vanishing lines. */
function shop(ctx: Ctx, s: Shop, vx: number, hy: number, slope: number, seed: number): void {
  const base = (x: number): number => hy + Math.abs(x - vx) * slope;
  const y = (x: number, v: number): number => { const u = (x - s.x0) / (s.x1 - s.x0); const t = s.top0 + (s.top1 - s.top0) * u; return t + (base(x) - t) * v; };
  const q = (u0: number, u1: number, v0: number, v1: number): Pt[] => {
    const a = s.x0 + (s.x1 - s.x0) * u0;
    const b = s.x0 + (s.x1 - s.x0) * u1;
    return [{ x: a, y: y(a, v0) }, { x: b, y: y(b, v0) }, { x: b, y: y(b, v1) }, { x: a, y: y(a, v1) }];
  };
  const wall = q(0, 1, 0, 1);
  fillShape(ctx, wall, linear(ctx, s.x0, 0, s.x1, 0, [[0, s.wall], [1, s.shade]]));
  const rng = rngOf(seed);
  within(ctx, wall, () => {
    for (let i = 0; i < 40; i++) dab(ctx, s.x0 + (s.x1 - s.x0) * rng(), y(s.x0, rng()), 14 + rng() * 30, rng() > 0.5 ? '255,244,220' : '60,44,40', 0.08);
  });
  // Upstairs windows with warm light in one.
  [0.1, 0.56].forEach((u, i) => {
    const w = q(u, u + 0.32, 0.14, 0.36);
    fillShape(ctx, w, linear(ctx, 0, w[0]!.y, 0, w[2]!.y, i === 0 ? [[0, '#f4d99a'], [1, '#c99a58']] : [[0, '#7f96a2'], [1, '#4a5a66']]));
    inkLine(ctx, w, 1.1, 0.6, 0, true);
    inkLine(ctx, [{ x: (w[0]!.x + w[1]!.x) / 2, y: (w[0]!.y + w[1]!.y) / 2 }, { x: (w[2]!.x + w[3]!.x) / 2, y: (w[2]!.y + w[3]!.y) / 2 }], 1, 0.5, 0);
  });
  // The open shopfront below, glowing, and what stands in it.
  const front = q(0.06, 0.94, 0.56, 1);
  fillShape(ctx, front, linear(ctx, 0, front[0]!.y, 0, front[2]!.y, [[0, '#4a3524'], [0.35, '#c08a4c'], [1, '#6d4a2e']]));
  within(ctx, front, () => {
    for (let i = 0; i < 26; i++) {
      const u = rng();
      const x = s.x0 + (s.x1 - s.x0) * u;
      const size = Math.abs(s.x1 - s.x0) * (0.03 + rng() * 0.05);
      dab(ctx, x, y(x, 0.76 + rng() * 0.2), size * 1.6, ['214,84,52', '236,178,72', '120,148,80', '240,226,196', '150,70,44'][i % 5]!, 0.85);
    }
  });
  inkLine(ctx, front, 1.2, 0.6, 0, true);
  // The awning, striped, its edge scalloped by light.
  const aw = q(-0.02, 1.02, 0.45, 0.58).map((p, i) => (i >= 2 ? { x: p.x + (vx > s.x0 ? 1 : -1) * Math.abs(s.x1 - s.x0) * 0.1, y: p.y } : p));
  fillShape(ctx, aw, s.awning[0]);
  within(ctx, aw, () => {
    for (let i = 0; i < 9; i += 2) {
      const b = q(i / 9, (i + 1) / 9, 0.44, 0.6);
      fillShape(ctx, b, s.awning[1]);
    }
    softLine(ctx, [aw[0]!, aw[1]!], 14, '#ffffff', 0.35, 4);
    softLine(ctx, [aw[3]!, aw[2]!], 12, '#2a1a16', 0.35, 4);
  });
  inkLine(ctx, aw, 1.3, 0.75, 0, true);
  if (s.noren) {
    for (let i = 0; i < 4; i++) {
      const n = q(0.14 + i * 0.1, 0.23 + i * 0.1, 0.57, 0.74);
      fillShape(ctx, n, s.noren);
      softLine(ctx, [n[0]!, n[3]!], 3, '#0d1a30', 0.4, 2);
      inkLine(ctx, n, 1, 0.6, 0, true);
    }
  }
  inkLine(ctx, wall, 1.3, 0.6, 0, true);
}

function paintBack(ctx: Ctx): void {
  const { w, hy } = BACK;
  const vx = w / 2;
  ctx.fillStyle = linear(ctx, 0, 0, 0, hy, [[0, '#a9c3d4'], [0.35, '#d7dccf'], [0.7, '#f6e6c2'], [1, '#fdf0d0']]);
  ctx.fillRect(0, 0, w, hy);
  // Soft clouds and the low sun's glow.
  const rng = rngOf(12);
  for (let i = 0; i < 46; i++) dab(ctx, rng() * w, 60 + rng() * 420, 60 + rng() * 120, '255,250,236', 0.14);
  dab(ctx, vx + 60, hy - 220, 520, '255,232,170', 0.75);
  // The mountains: two soft ridges, streaked with light and forest.
  const ridge = (pts: Pt[], top: string, low: string, seed: number): void => {
    const line = spline(pts, 10);
    const shape = [...line, { x: w, y: hy }, { x: 0, y: hy }];
    fillShape(ctx, shape, linear(ctx, 0, 380, 0, hy, [[0, top], [1, low]]));
    const r = rngOf(seed);
    within(ctx, shape, () => {
      for (let i = 0; i < 260; i++) {
        const p = line[Math.floor(r() * line.length)]!;
        const y = p.y + r() * 220;
        const dx = (r() - 0.5) * 40;
        softLine(ctx, [{ x: p.x, y }, { x: p.x + dx, y: y + 30 + r() * 50 }], 8 + r() * 12, r() > 0.5 ? '#f2d9a8' : '#5c6e8a', 0.1, 2);
      }
    });
  };
  ridge(P(0, 620, 140, 560, 300, 470, 420, 430, 540, 400, 660, 452, 800, 540, 960, 560, 1100, 610, 1240, 600), '#8296ae', '#d8cdb4', 5);
  ridge(P(0, 700, 200, 660, 380, 690, 560, 640, 760, 680, 940, 640, 1240, 700), '#a08a6e', '#e2cfa2', 6);
  // Trees along both pavements, far to near, the shops behind them.
  for (let i = 0; i < 30; i++) crown(ctx, vx - 330 + i * 23, hy - 90 - (i % 5) * 12, 48, 44, 40 + i, '#8a4c22', i % 3 ? '#d58a34' : '#c45f2e', i % 2 ? '#f4c45e' : '#eeb04c', 60);
  const shops: readonly Shop[] = [
    { x0: vx - 60, x1: vx - 40, top0: hy - 90, top1: hy - 70, wall: '#cbb493', shade: '#bda583', awning: ['#b85a42', '#e8d8b8'] },
    { x0: vx - 150, x1: vx - 60, top0: hy - 210, top1: hy - 118, wall: '#d9c7a4', shade: '#c6b08a', awning: ['#5b7f86', '#e8dfc8'] },
    { x0: vx - 310, x1: vx - 150, top0: hy - 400, top1: hy - 236, wall: '#c9a98a', shade: '#e0caa6', awning: ['#b5472f', '#f0e2c4'], noren: '#2f4a78' },
    { x0: vx - 640, x1: vx - 310, top0: hy - 720, top1: hy - 420, wall: '#a98f78', shade: '#d2bb98', awning: ['#3f6d5c', '#efe4c8'] },
    { x0: vx + 60, x1: vx + 40, top0: hy - 80, top1: hy - 64, wall: '#cbb493', shade: '#bda583', awning: ['#b85a42', '#e8d8b8'] },
    { x0: vx + 170, x1: vx + 60, top0: hy - 220, top1: hy - 110, wall: '#b9ab9c', shade: '#cfc0a6', awning: ['#c98a3a', '#f3e7cc'] },
    { x0: vx + 340, x1: vx + 170, top0: hy - 380, top1: hy - 232, wall: '#d4bd9e', shade: '#dcc9a6', awning: ['#51688c', '#efe4cc'], noren: '#8c2f2a' },
    { x0: vx + 650, x1: vx + 340, top0: hy - 660, top1: hy - 410, wall: '#9c8777', shade: '#cdb696', awning: ['#a8452f', '#efe0c4'] },
  ];
  shops.forEach((s, i) => shop(ctx, s, vx, hy, 0.14, 300 + i));
  for (const [x, y, r, s] of [[vx - 120, hy - 190, 70, 1], [vx + 130, hy - 190, 74, 2], [vx - 235, hy - 300, 118, 3], [vx + 262, hy - 310, 126, 4], [vx - 440, hy - 500, 200, 5], [vx + 480, hy - 520, 214, 6]] as const) {
    trunk(ctx, x, hy + Math.abs(x - vx) * 0.12, y + r * 0.4, r * 0.16);
    const red = s % 3 === 0;
    crown(ctx, x, y, r * 1.1, r * 0.92, 70 + s, red ? '#7c2f1c' : '#8a561c', red ? '#c9542c' : '#dc9a30', red ? '#f0915a' : '#ffd772', 420);
  }
  // Poles and wires.
  for (const [x, top, wide] of [[vx - 190, hy - 520, 8], [vx + 214, hy - 560, 9]] as const) {
    fillShape(ctx, P(x - wide, hy + 30, x - wide * 0.7, top, x + wide * 0.7, top, x + wide, hy + 30), linear(ctx, x - wide, 0, x + wide, 0, [[0, '#8b8378'], [0.4, '#c9c0b0'], [1, '#6a6259']]));
    for (const dy of [20, 60]) softLine(ctx, P(x - 60, top + dy, x + 60, top + dy + 4), 7, '#5c5249', 0.95, 2);
  }
  for (let i = 0; i < 5; i++) {
    inkLine(ctx, spline(P(0, 40 + i * 40, vx - 420, 260 + i * 26, vx - 190, 390 + i * 10), 8), 1.6, 0.55, 0, false, '#4a423c');
    inkLine(ctx, spline(P(w, 10 + i * 40, vx + 420, 240 + i * 26, vx + 214, 350 + i * 10), 8), 1.6, 0.55, 0, false, '#4a423c');
  }
  // Haze at the vanishing point, and leaves drifting.
  dab(ctx, vx, hy - 20, 300, '255,240,206', 0.75);
  for (let i = 0; i < 70; i++) {
    ctx.save();
    ctx.translate(rng() * w, 200 + rng() * 640);
    ctx.rotate(rng() * 6.28);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = ['#e7a23a', '#c9582c', '#f2c65c'][i % 3]!;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 + rng() * 5, 2 + rng() * 2.4, 0, 0, 6.28);
    ctx.fill();
    ctx.restore();
  }
}

let sharp: HTMLCanvasElement | null = null;
let blurred: HTMLCanvasElement | null = null;

/** The far picture, sharp or out of focus (shrunk and stretched back, twice). */
function back(soft: boolean): HTMLCanvasElement {
  if (!sharp) {
    const made = makeCanvas(BACK.w, BACK.h);
    paintBack(made.ctx);
    sharp = made.canvas;
  }
  if (!soft) return sharp;
  if (!blurred) {
    const small = makeCanvas(Math.round(BACK.w / 22), Math.round(BACK.h / 22));
    small.ctx.imageSmoothingQuality = 'high';
    const half = makeCanvas(BACK.w / 4, BACK.h / 4);
    half.ctx.imageSmoothingQuality = 'high';
    half.ctx.drawImage(sharp, 0, 0, half.canvas.width, half.canvas.height);
    const q = makeCanvas(BACK.w / 10, BACK.h / 10);
    q.ctx.imageSmoothingQuality = 'high';
    q.ctx.drawImage(half.canvas, 0, 0, q.canvas.width, q.canvas.height);
    small.ctx.drawImage(q.canvas, 0, 0, small.canvas.width, small.canvas.height);
    const out = makeCanvas(BACK.w, BACK.h);
    out.ctx.imageSmoothingQuality = 'high';
    // Several offset copies, so the stretched pixels melt together.
    for (let i = 0; i < 12; i++) {
      out.ctx.globalAlpha = 1 / (i + 1);
      out.ctx.drawImage(small.canvas, Math.cos(i * 2.4) * i * 2.2, Math.sin(i * 2.4) * i * 2.2, BACK.w, BACK.h);
    }
    blurred = out.canvas;
  }
  return blurred;
}

/** The far picture with its horizon at `hy`, `k` px per picture px, its vanishing point at `vx`. */
export function drawBack(ctx: Ctx, vx: number, hy: number, k: number, soft: boolean): void {
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(back(soft), vx - (BACK.w / 2) * k, hy - BACK.hy * k, BACK.w * k, BACK.h * k);
  ctx.restore();
}

// ---------------------------------------------------------------- the road

/** Ground perspective: lateral metres X and depth Z to the screen. */
export interface Ground { readonly vx: number; readonly hy: number; readonly f: number; readonly h: number }
export const project = (g: Ground, X: number, Z: number): Pt => ({ x: g.vx + (g.f * X) / Z, y: g.hy + (g.f * g.h) / Z });
export const pxPerM = (g: Ground, Z: number): number => g.f / Z;
/** The depth of a screen y on the ground. */
export const depthAt = (g: Ground, y: number): number => (g.f * g.h) / Math.max(1, y - g.hy);

const FLECKS: readonly { readonly X: number; readonly Z: number; readonly r: number; readonly ink: string; readonly a: number }[] = (() => {
  const rng = rngOf(640);
  return Array.from({ length: 5200 }, (_, i) => {
    const Z = 0.45 + 9 * rng() ** 2.4;
    return { X: (rng() - 0.5) * 1.6 * Z, Z, r: 0.0014 + 0.0034 * rng() ** 2, ink: ['#efe7d6', '#5b5750', '#8a8378', '#3f3c38', '#c7bca8'][i % 5]!, a: 0.12 + rng() * 0.36 };
  });
})();

/** Pale grey asphalt from the horizon to the bottom of the frame, its stones bigger towards us. */
export function drawRoad(ctx: Ctx, g: Ground, dx = 0, light = 1): void {
  const { width: W, height: H } = ctx.canvas;
  ctx.fillStyle = linear(ctx, 0, g.hy, 0, H, [[0, '#e9dcc0'], [0.12, '#cdc3b0'], [0.45, '#aaa398'], [1, '#7d786f']]);
  ctx.fillRect(0, g.hy, W, H - g.hy);
  ctx.save();
  for (const s of FLECKS) {
    const p = project(g, s.X + dx, s.Z);
    if (p.x < -10 || p.x > W + 10 || p.y > H + 10) continue;
    const r = Math.max(0.6, s.r * pxPerM(g, s.Z));
    ctx.globalAlpha = s.a * light * Math.min(1, 2.4 / s.Z) * Math.min(1, s.Z);
    ctx.fillStyle = s.ink;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.3, Math.max(0.5, r * 0.62), 0, 0, 6.28);
    ctx.fill();
  }
  ctx.restore();
  // A long wash of low sun across the road.
  dab(ctx, g.vx + 60, g.hy + 30, 520, '255,238,196', 0.5);
}

/** A worn white marking on the road between X0..X1 and Z0..Z1 (metres). */
export function drawStripe(ctx: Ctx, g: Ground, X0: number, X1: number, Z0: number, Z1: number, seed: number, boil: number): void {
  const q = [project(g, X0, Z0), project(g, X1, Z0), project(g, X1, Z1), project(g, X0, Z1)];
  fillShape(ctx, q, linear(ctx, 0, q[2]!.y, 0, q[0]!.y, [[0, '#fbf4e2'], [1, '#e9e5da']]), 0.94);
  const rng = rngOf(seed);
  within(ctx, q, () => {
    for (let i = 0; i < 220; i++) {
      const Z = Z0 + (Z1 - Z0) * rng();
      const p = project(g, X0 + (X1 - X0) * rng(), Z);
      const r = pxPerM(g, Z) * (0.001 + rng() * 0.0032);
      ctx.fillStyle = `rgba(120,114,104,${(0.2 + rng() * 0.35).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.8, r * 0.7, 0, 0, 6.28);
      ctx.fill();
    }
  });
  inkLine(ctx, q, 1, 0.22, boil, true);
}

/** The pavement on one side: a raised kerb from X (metres) outwards. `side` -1 left, 1 right. */
export function drawPavement(ctx: Ctx, g: Ground, X: number, side: number, boil: number, Zfar = 40): void {
  const near = 0.5;
  const up = 0.12;
  const lifted = { ...g, h: g.h - up };
  const face = [project(g, X, near), project(lifted, X, near), project(lifted, X, Zfar), project(g, X, Zfar)];
  const top = [project(lifted, X, near), project(lifted, X + side * 30, near), project(lifted, X + side * 30, Zfar), project(lifted, X, Zfar)];
  fillShape(ctx, top, linear(ctx, 0, g.hy, 0, ctx.canvas.height, [[0, '#ead9b8'], [0.25, '#cdb99a'], [1, '#a48f76']]));
  within(ctx, top, () => {
    for (let i = 0; i < 40; i++) {
      const Z = 0.5 * 1.16 ** i;
      const a = project(lifted, X, Z);
      const b = project(lifted, X + side * 12, Z);
      softLine(ctx, [a, b], Math.max(1, 5 / Z), '#6f5c48', 0.4, 2);
    }
    for (let i = 1; i < 10; i++) softLine(ctx, [project(lifted, X + side * i * 0.4, near), project(lifted, X + side * i * 0.4, Zfar)], 2, '#6f5c48', 0.3, 2);
  });
  fillShape(ctx, face, linear(ctx, 0, g.hy, 0, ctx.canvas.height, [[0, '#d9ccb2'], [1, '#7f766b']]));
  const strip = [project(lifted, X, near), project(lifted, X + side * 0.16, near), project(lifted, X + side * 0.16, Zfar), project(lifted, X, Zfar)];
  fillShape(ctx, strip, linear(ctx, 0, g.hy, 0, ctx.canvas.height, [[0, '#f2e8d2'], [1, '#c9c2b4']]));
  inkLine(ctx, [face[0]!, face[3]!], 1.6, 0.5, boil);
  inkLine(ctx, [face[1]!, face[2]!], 1.6, 0.6, boil);
}

/** Fallen leaves on the ground at fixed spots. */
export function drawFallen(ctx: Ctx, g: Ground, n: number, seed: number, X0: number, X1: number, Z0 = 0.7, Z1 = 4): void {
  const rng = rngOf(seed);
  for (let i = 0; i < n; i++) {
    const Z = Z0 + (Z1 - Z0) * rng() ** 1.5;
    const p = project(g, X0 + (X1 - X0) * rng(), Z);
    const k = pxPerM(g, Z) * 0.026;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, 0.5);
    ctx.rotate(rng() * 6.28);
    const leaf = spline(P(-k, 0, -k * 0.3, -k * 0.55, k * 0.5, -k * 0.4, k * 1.1, 0, k * 0.5, k * 0.4, -k * 0.3, k * 0.5), 4, true);
    fillShape(ctx, leaf, ['#d9902e', '#b5492a', '#eab94e', '#8f5526'][i % 4]!);
    inkLine(ctx, P(-k * 1.4, 0, k, 0), 1, 0.5, 0, false, '#4a2a14');
    ctx.restore();
  }
}

/** A pedestrian light on its post: red man or green man, plain painted box. */
export function drawPedestrianLight(ctx: Ctx, x: number, y: number, k: number, ground: number, green: number, boil: number): void {
  ctx.save();
  fillShape(ctx, P(x - 9 * k, ground, x - 8 * k, y, x + 8 * k, y, x + 9 * k, ground), linear(ctx, x - 9 * k, 0, x + 9 * k, 0, [[0, '#6f6a62'], [0.4, '#cfc6b6'], [1, '#5a554e']]));
  ctx.translate(x, y);
  ctx.scale(k, k);
  const box = P(-46, -86, 46, -86, 50, -82, 50, 92, 46, 96, -46, 96, -50, 92, -50, -82);
  fillShape(ctx, box, linear(ctx, -50, 0, 50, 0, [[0, '#2d3a36'], [0.5, '#4a5c54'], [1, '#26302d']]));
  inkLine(ctx, box, 2, 0.9, boil, true);
  const man = (walk: boolean): Pt[][] => walk
    ? [ring(4, -24, 7), spline(P(-6, -14, 8, -14, 10, 4, 16, 26, 8, 28, 0, 8, -10, 26, -18, 24, -6, 2), 4, true), spline(P(8, -12, 20, 2, 16, 6, 4, -6), 3, true)]
    : [ring(0, -26, 7), spline(P(-10, -16, 10, -16, 12, 6, 7, 8, 6, 28, 1, 28, 0, 10, -1, 28, -6, 28, -7, 8, -12, 6), 4, true)];
  ([[-40, 1 - green, '#ff5a3c', '255,90,50', false], [48, green, '#63f0a4', '90,240,160', true]] as const).forEach(([cy, on, colour, rgb, walk]) => {
    ctx.save();
    ctx.translate(0, cy);
    fillShape(ctx, P(-36, -38, 36, -38, 36, 38, -36, 38), '#12181a');
    ctx.globalAlpha = 0.14 + 0.86 * on;
    for (const s of man(walk)) fillShape(ctx, s.map((q) => ({ x: q.x, y: q.y * 1.1 })), colour);
    ctx.globalAlpha = on;
    dab(ctx, 0, 0, 90, rgb, 0.5);
    ctx.restore();
    inkLine(ctx, P(-36, cy - 38, 36, cy - 38, 36, cy + 38, -36, cy + 38), 1.4, 0.8, boil, true);
  });
  ctx.restore();
}

