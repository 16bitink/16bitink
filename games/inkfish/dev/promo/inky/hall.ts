import { INK, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import type { Pt } from '../octopus/geom';
import { drawTube, glow, type Light, poly, type Ramp, type Rgb, rgb, wash } from './paint';
import { cycles } from './story';

/** The aquarium hall at night (or morning) and a glass tank seen from a little above its rim. */

export const NIGHT_LIGHT: Light = { key: [-0.5, -0.72, 0.62], ambient: 0.2, rim: [0.55, 0.75, 0.1], rimColour: [64, 190, 208], rimK: 1.5, wet: 0.75 };

/** Dark blue hall: a warm cone of light from above, other tanks glowing far off. */
export function drawHall(ctx: CanvasRenderingContext2D, t: number, cone: { x: number; y: number; w: number; a: number }, floorY = 1500): void {
  const { width: W, height: H } = VIDEO;
  ctx.fillStyle = wash(ctx, 0, 0, 0, H, [[0, '#0a1530'], [0.45, '#0d2044'], [0.8, '#071327'], [1, '#040a16']]);
  ctx.fillRect(-60, -60, W + 120, H + 120);
  // Far tanks, out of focus: soft panes of teal.
  for (const p of [{ x: 70, y: 620, w: 190, h: 250, c: [30, 120, 150] as Rgb }, { x: 985, y: 560, w: 230, h: 300, c: [26, 104, 140] as Rgb }, { x: 560, y: 470, w: 160, h: 180, c: [22, 86, 120] as Rgb }]) {
    glow(ctx, p.x, p.y, p.w * 1.5, p.h * 1.15, p.c, 0.32, 'lighter');
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = rgb(p.c, 0.07);
      const g = k * 9;
      ctx.beginPath();
      ctx.roundRect(p.x - p.w / 2 - g, p.y - p.h / 2 - g, p.w + 2 * g, p.h + 2 * g, 26 + g);
      ctx.fill();
    }
  }
  // Columns of shadow between.
  for (const x of [250, 800]) {
    ctx.fillStyle = wash(ctx, x - 70, 0, x + 70, 0, [[0, 'rgba(4,9,22,0)'], [0.5, 'rgba(4,9,22,0.6)'], [1, 'rgba(4,9,22,0)']]);
    ctx.fillRect(x - 70, 0, 140, floorY);
  }
  // The cone.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 24; k++) {
    const s = 1 - k * 0.038;
    const g = ctx.createLinearGradient(0, cone.y, 0, cone.y + 1500);
    g.addColorStop(0, `rgba(255,190,104,${cone.a * 0.042})`);
    g.addColorStop(0.6, `rgba(255,160,80,${cone.a * 0.016})`);
    g.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cone.x - 30 * s, cone.y);
    ctx.lineTo(cone.x + 30 * s, cone.y);
    ctx.lineTo(cone.x + cone.w * s, cone.y + 1500);
    ctx.lineTo(cone.x - cone.w * s, cone.y + 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  glow(ctx, cone.x, cone.y + 20, 150, 110, [255, 214, 140], 0.75 * cone.a + 0.1, 'lighter');
  // Dust in the light.
  const rng = createRng(77);
  for (let i = 0; i < 46; i++) {
    const u = rng();
    const x = cone.x + (rng() - 0.5) * 2 * cone.w * (0.1 + 0.9 * u) + 12 * Math.sin(cycles(1 + (i % 3), t) + i);
    const y = cone.y + u * 1300 + 10 * Math.cos(cycles(1 + (i % 2), t) + i * 2);
    ctx.fillStyle = `rgba(255,220,160,${0.1 + 0.28 * rng()})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rng() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface Tank {
  readonly xL: number;
  readonly xR: number;
  readonly rim: number;
  readonly base: number;
  /** The back rim: how far in from the sides, and how much higher. */
  readonly inset: number;
  readonly rise: number;
  /** The water's surface under the rim. */
  readonly water: number;
  readonly frame: number;
}

const line = (ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, style: string): void => {
  ctx.strokeStyle = style;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

/** Everything behind what's in the tank: back wall, water, surface, back rim. `day` 0 night glow .. 1 morning. */
export function drawTankBack(ctx: CanvasRenderingContext2D, k: Tank, t: number, boil: number, opts: { rocks?: boolean; day?: number } = {}): void {
  const { xL, xR, rim, base, inset, rise } = k;
  const day = opts.day ?? 0;
  const s = (xR - xL) / 980;
  const surf = rim + k.water;
  const surfB = rim - rise + k.water * 0.8;
  glow(ctx, (xL + xR) / 2, (rim + Math.min(base, rim + 900 * s)) / 2, (xR - xL) * 0.85, (Math.min(base, rim + 900 * s) - rim) * 0.95, [40, 170, 190], 0.28 * (1 - 0.7 * day), 'lighter');
  // Air inside, above the water, through to the back glass.
  poly(ctx, [{ x: xL, y: rim }, { x: xL + inset, y: rim - rise }, { x: xR - inset, y: rim - rise }, { x: xR, y: rim }], 'rgba(20,60,86,0.55)');
  const g = wash(ctx, 0, surf, 0, base, day ? [[0, '#8fcfd0'], [0.5, '#5aa6b0'], [1, '#2f6f80']] : [[0, '#37b4bd'], [0.3, '#1b8298'], [0.7, '#0d4a66'], [1, '#072c45']]);
  ctx.fillStyle = g;
  ctx.fillRect(xL, surf, xR - xL, base - surf);
  // Light falling through the water.
  ctx.save();
  ctx.beginPath();
  ctx.rect(xL, surf, xR - xL, base - surf);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = xL + (xR - xL) * (0.08 + 0.17 * i) + 16 * s * Math.sin(cycles(1, t) + i * 1.9);
    const r = wash(ctx, 0, surf, 0, surf + 800 * s, [[0, 'rgba(150,245,240,0.2)'], [1, 'rgba(120,230,235,0)']]);
    poly(ctx, [{ x, y: surf }, { x: x + (34 + 22 * (i % 3)) * s, y: surf }, { x: x + 10 * s, y: surf + 900 * s }, { x: x - 110 * s, y: surf + 900 * s }], r);
  }
  ctx.globalCompositeOperation = 'source-over';
  // Side panes, darker.
  poly(ctx, [{ x: xL, y: surf }, { x: xL + inset * 0.8, y: surf }, { x: xL + inset * 0.8, y: base }, { x: xL, y: base }], 'rgba(3,28,48,0.28)');
  poly(ctx, [{ x: xR, y: surf }, { x: xR - inset * 0.8, y: surf }, { x: xR - inset * 0.8, y: base }, { x: xR, y: base }], 'rgba(3,28,48,0.34)');
  if (opts.rocks) drawRocks(ctx, k, s, boil, day);
  ctx.restore();
  // The surface, seen from above.
  poly(ctx, [{ x: xL, y: surf }, { x: xL + inset, y: surfB }, { x: xR - inset, y: surfB }, { x: xR, y: surf }], wash(ctx, 0, surfB, 0, surf, [[0, '#1d7f95'], [1, '#5fd4d4']]));
  const pen = new Pen(ctx, 81 + (boil % 3) * 977, 1);
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.5) / 7;
    const y = surfB + (surf - surfB) * u;
    const half = (xR - xL) / 2 - inset * (1 - u);
    const c = (xL + xR) / 2 + half * 0.8 * Math.sin(i * 2.4) + 14 * s * Math.sin(cycles(2, t) + i);
    const w = half * (0.1 + 0.08 * (i % 3));
    pen.hair([{ x: c - w, y }, { x: c, y: y - 3 * s }, { x: c + w, y: y + 1 }], 2.4 * s + 0.6, '#d8fffb', 0.55);
  }
  // Back rim and corners.
  line(ctx, { x: xL + inset, y: rim - rise }, { x: xR - inset, y: rim - rise }, 14 * s, '#0b1626');
  line(ctx, { x: xL + inset, y: rim - rise - 5 * s }, { x: xR - inset, y: rim - rise - 5 * s }, 3 * s, 'rgba(150,200,220,0.5)');
  for (const [a, b] of [[{ x: xL, y: rim }, { x: xL + inset, y: rim - rise }], [{ x: xR, y: rim }, { x: xR - inset, y: rim - rise }]] as const) {
    line(ctx, a, b, 18 * s, '#0b1626');
    line(ctx, { x: a.x, y: a.y - 6 * s }, { x: b.x, y: b.y - 6 * s }, 3 * s, 'rgba(150,200,220,0.45)');
  }
}

const WEED: Ramp = [[3, 26, 40], [6, 50, 60], [16, 92, 88], [48, 142, 118], [110, 190, 150]];
const WEED_DAY: Ramp = [[22, 60, 54], [40, 90, 74], [70, 130, 98], [120, 176, 130], [176, 214, 164]];

/** Rounded rocks, weed and gravel on the tank's floor. */
function drawRocks(ctx: CanvasRenderingContext2D, k: Tank, s: number, boil: number, day: number): void {
  const rng = createRng(505);
  const pen = new Pen(ctx, 85 + (boil % 3) * 977, 1.2);
  const w = k.xR - k.xL;
  // Weed.
  for (let i = 0; i < 9; i++) {
    const x = k.xL + w * (0.06 + 0.11 * i) + rng() * 30 * s;
    const h = (150 + rng() * 210) * s;
    const pts = Array.from({ length: 12 }, (_, j) => ({ x: x + 22 * s * Math.sin(j * 0.55 + i), y: k.base - 30 * s - (h * j) / 11 }));
    drawTube(ctx, { path: pts, radius: (u) => (11 + 4 * Math.sin(u * 9 + i)) * s * Math.sqrt(1 - u * 0.98), n: 34, seed: 900 + i, boil, detail: 0, ramp: day ? WEED_DAY : WEED, line: 1.4 }, NIGHT_LIGHT);
  }
  for (let i = 0; i < 9; i++) {
    const x = k.xL + w * (0.02 + 0.12 * i) + rng() * 40 * s;
    const rx = (80 + rng() * 80) * s;
    const ry = (46 + rng() * 60) * s;
    const y = k.base - 10 * s;
    const pts = Array.from({ length: 26 }, (_, j) => {
      const a = Math.PI + (j / 25) * Math.PI;
      const q = 1 + 0.06 * Math.sin(a * 5 + i * 2) + 0.03 * Math.sin(a * 9 + i);
      return { x: x + Math.cos(a) * rx * q, y: y + Math.sin(a) * ry * q };
    });
    const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.75, rx * 0.06, x, y - ry * 0.3, rx * 1.15);
    g.addColorStop(0, day ? '#b7bda6' : '#5c9aa0');
    g.addColorStop(0.45, day ? '#7a8478' : '#2a5c70');
    g.addColorStop(1, day ? '#3c4a4c' : '#0a2336');
    poly(ctx, pts, g);
    pen.stroke(pts, 2.6 * s + 0.8, INK, 0.8, false);
    for (let d = 0; d < 14; d++) {
      const a = rng() * Math.PI;
      const q = rng() * 0.8;
      pen.dot(x + Math.cos(a) * rx * q, y - Math.sin(a) * ry * q, (1.5 + rng() * 3) * s, '#081c2c', 0.4);
    }
  }
}

/** The front: glass sheen, corner edges, the rim's front bar. */
export function drawTankFront(ctx: CanvasRenderingContext2D, k: Tank, t: number, boil: number, opts: { sheen?: number } = {}): void {
  const { xL, xR, rim, base } = k;
  const s = (xR - xL) / 980;
  const surf = rim + k.water;
  ctx.save();
  ctx.beginPath();
  ctx.rect(xL, rim, xR - xL, base - rim);
  ctx.clip();
  const sheen = opts.sheen ?? 1;
  for (const [x, w, a] of [[0.08, 70, 0.1], [0.18, 24, 0.08], [0.7, 120, 0.08], [0.86, 30, 0.06]] as const) {
    const px = xL + (xR - xL) * x;
    poly(ctx, [{ x: px + 260 * s, y: rim }, { x: px + (260 + w) * s, y: rim }, { x: px + (w - 240) * s, y: rim + 1000 * s }, { x: px - 240 * s, y: rim + 1000 * s }], wash(ctx, 0, rim, 0, rim + 1000 * s, [[0, `rgba(225,250,255,${a * 1.6 * sheen})`], [1, 'rgba(225,250,255,0)']]));
  }
  // The water line against the front glass.
  ctx.strokeStyle = 'rgba(214,255,252,0.75)';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  for (let x = xL; x <= xR + 1; x += 14) {
    const y = surf + 3 * s * Math.sin(x / (46 * s) + cycles(6, t));
    if (x === xL) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  for (const x of [xL, xR]) {
    line(ctx, { x, y: rim }, { x, y: base }, 15 * s, '#0a1322');
    line(ctx, { x: x - 3 * s, y: rim }, { x: x - 3 * s, y: base }, 3 * s, 'rgba(160,220,235,0.55)');
  }
  // The front bar of the rim.
  const f = k.frame;
  poly(ctx, [{ x: xL - 10 * s, y: rim - f / 2 }, { x: xR + 10 * s, y: rim - f / 2 }, { x: xR + 10 * s, y: rim + f / 2 }, { x: xL - 10 * s, y: rim + f / 2 }], wash(ctx, 0, rim - f / 2, 0, rim + f / 2, [[0, '#5b7690'], [0.22, '#26384e'], [0.6, '#121d2e'], [1, '#070d18']]));
  const pen = new Pen(ctx, 87 + (boil % 3) * 977, 0.8);
  pen.stroke([{ x: xL - 10 * s, y: rim - f / 2 }, { x: xR + 10 * s, y: rim - f / 2 }], 2.6 * s + 0.6, '#b9dced', 0.7, false);
  pen.stroke([{ x: xL - 10 * s, y: rim + f / 2 }, { x: xR + 10 * s, y: rim + f / 2 }], 3 * s, INK, 0.9, false);
  // Wet beads along it.
  const rng = createRng(19);
  for (let i = 0; i < 26; i++) {
    const x = xL + rng() * (xR - xL);
    const r = (2 + rng() * 5) * s;
    const y = rim - f / 2 + rng() * f;
    ctx.fillStyle = 'rgba(190,236,246,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.4, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A glass-and-metal lid: a slab between its near edge's two ends, `d` the way back along its depth. */
export function drawLid(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, d: Pt, thick: number, boil: number, day = 0): void {
  const pen = new Pen(ctx, 89 + (boil % 3) * 977, 0.9);
  const up = { x: 0, y: -thick };
  const top: Pt[] = [{ x: a.x, y: a.y + up.y }, { x: b.x, y: b.y + up.y }, { x: b.x + d.x, y: b.y + d.y + up.y }, { x: a.x + d.x, y: a.y + d.y + up.y }];
  poly(ctx, top, wash(ctx, a.x, a.y, b.x + d.x, b.y + d.y, day ? [[0, '#8ea0a8'], [1, '#c3d0d2']] : [[0, '#26405c'], [0.5, '#476a86'], [1, '#6f94a8']]));
  ctx.save();
  ctx.beginPath();
  top.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.clip();
  for (let i = 1; i < 12; i++) {
    const u = i / 12;
    pen.hair([{ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - thick }, { x: a.x + (b.x - a.x) * u + d.x, y: a.y + (b.y - a.y) * u + d.y - thick }], 2.2, '#0a1a2c', 0.4);
  }
  for (const u of [0.33, 0.66]) pen.hair([{ x: a.x + d.x * u, y: a.y + d.y * u - thick }, { x: b.x + d.x * u, y: b.y + d.y * u - thick }], 2.2, '#0a1a2c', 0.4);
  ctx.restore();
  pen.closed(top, 3, INK);
  const face: Pt[] = [a, b, top[1]!, top[0]!];
  poly(ctx, face, wash(ctx, a.x, a.y - thick, a.x, a.y, [[0, day ? '#dfe6e4' : '#8fb2c4'], [0.3, day ? '#9aa6a8' : '#37526c'], [1, day ? '#5c686c' : '#16263a']]));
  pen.closed(face, 3.2, INK);
}

/** The lid's handle: a small bar standing on its face. */
export function drawHandle(ctx: CanvasRenderingContext2D, at: Pt, along: Pt, boil: number): void {
  const pen = new Pen(ctx, 93 + (boil % 3) * 977, 0.8);
  const bar = [{ x: at.x - along.x, y: at.y - along.y }, { x: at.x - along.x * 0.9, y: at.y - along.y * 0.9 - 24 }, { x: at.x + along.x * 0.9, y: at.y + along.y * 0.9 - 24 }, { x: at.x + along.x, y: at.y + along.y }];
  pen.stroke(bar, 17, INK, 1, false);
  pen.stroke(bar, 11, '#9ec0d0', 1, false);
  pen.hair(bar.map((p) => ({ x: p.x - 2, y: p.y - 3 })), 3, '#eefaff', 0.8);
}
