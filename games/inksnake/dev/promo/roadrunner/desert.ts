import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { mix, rgba } from '../../../src/art/wash';
import { VIDEO } from '../short';
import { curve, fillShape, hair, linear, loop, pt, rngOf, soft } from './paint';

/**
 * The Sonoran Desert in warm light, in layers: the sky (drawn live, so the
 * sun can slide across it), soft mesas and far saguaros, nearer saguaros
 * with their pleats and arms, and the sandy ground with stones, creosote and
 * dry grass. The land layers are painted once and tile, so a shot can run
 * past them.
 */
export interface Land {
  readonly far: HTMLCanvasElement;
  readonly mid: HTMLCanvasElement;
  readonly ground: HTMLCanvasElement;
}

/** Every layer tiles at this width. */
export const TILE = 2160;
/** The layers' heights: far and mid stand on the horizon; the ground runs down from it. */
const FAR_H = 420;
const MID_H = 760;
const GROUND_H = 1100;

interface SkyTone {
  readonly at: number;
  readonly top: string;
  readonly mid: string;
  readonly low: string;
}
const SKY: readonly SkyTone[] = [
  { at: 0, top: '#e9a66a', mid: '#f3bf86', low: '#ffe2ae' },
  { at: 0.5, top: '#7fbcdc', mid: '#bfe0e2', low: '#fbeecb' },
  { at: 1, top: '#b5566a', mid: '#ee8a5a', low: '#ffc873' },
];

const tone = (day: number, key: 'top' | 'mid' | 'low'): string => {
  const i = day < 0.5 ? 0 : 1;
  return mix(SKY[i]![key], SKY[i + 1]![key], (day - SKY[i]!.at) / 0.5);
};

/** The sky: `day` 0 morning .. 0.5 noon .. 1 evening; the sun at `sun`, its glow under it. */
export function drawSky(ctx: CanvasRenderingContext2D, horizon: number, day: number, sun: Pt, r: number): void {
  fillShape(ctx, [pt(0, 0), pt(VIDEO.width, 0), pt(VIDEO.width, horizon + 30), pt(0, horizon + 30)], linear(ctx, pt(0, 0), pt(0, horizon), [[0, tone(day, 'top')], [0.55, tone(day, 'mid')], [1, tone(day, 'low')]]));
  soft(ctx, sun.x, sun.y, r * 7, r * 7, 0, '#fff1c4', 0.55);
  soft(ctx, sun.x, sun.y, r * 2.4, r * 2.4, 0, '#fff8de', 0.8);
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, r, 0, 7);
  ctx.fill();
  const rng = rngOf(812);
  for (let i = 0; i < 6; i++) soft(ctx, rng() * VIDEO.width, horizon * (0.2 + rng() * 0.55), 190 + rng() * 260, 10 + rng() * 12, 0, '#fff6e0', 0.4);
}

/** Draws a shape at x and again a tile either side, so the layer wraps. */
function wrapped(ctx: CanvasRenderingContext2D, draw: () => void): void {
  for (const dx of [-TILE, 0, TILE]) {
    ctx.save();
    ctx.translate(dx, 0);
    draw();
    ctx.restore();
  }
}

function mesa(ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, colour: string, seed: number): void {
  const rng = rngOf(seed);
  const top: Pt[] = [];
  for (let i = 0; i <= 8; i++) top.push(pt(x - w * 0.32 + (w * 0.64 * i) / 8, base - h * (0.96 + rng() * 0.06) + (i === 0 || i === 8 ? h * 0.08 : 0)));
  const shape = [pt(x - w * 0.62, base + 30), pt(x - w * 0.5, base - h * 0.16), pt(x - w * 0.37, base - h * 0.46), pt(x - w * 0.345, base - h * 0.5), ...top, pt(x + w * 0.35, base - h * 0.52), pt(x + w * 0.38, base - h * 0.45), pt(x + w * 0.52, base - h * 0.14), pt(x + w * 0.64, base + 30)];
  fillShape(ctx, shape, linear(ctx, pt(x - w * 0.4, 0), pt(x + w * 0.5, 0), [[0, mix(colour, '#ffd9a0', 0.4)], [0.4, colour], [1, mix(colour, '#5a2a3a', 0.35)]]));
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.clip();
  // Cliff flutes, strata and the pale talus at its foot.
  for (let i = 0; i < 26; i++) hair(ctx, x - w * 0.34 + rng() * w * 0.68, base - h, 1.57 + (rng() - 0.5) * 0.06, h * (0.3 + rng() * 0.28), 5 + rng() * 8, mix(colour, '#4a2030', 0.5), 0.3, 0);
  for (let i = 0; i < 4; i++) fillShape(ctx, [pt(x - w, base - h * (0.9 - i * 0.12)), pt(x + w, base - h * (0.91 - i * 0.12)), pt(x + w, base - h * (0.88 - i * 0.12)), pt(x - w, base - h * (0.87 - i * 0.12))], mix(colour, '#ffe0b0', 0.4), 0.28);
  soft(ctx, x, base + 20, w * 0.7, h * 0.4, 0, '#ffdca6', 0.5);
  ctx.restore();
}

/** A saguaro: a pleated column with curved arms, spines catching the light; `flat` a soft far silhouette. */
function saguaro(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, seed: number, flat: boolean): void {
  const rng = rngOf(seed);
  const w = h * 0.13;
  const green = flat ? '#8d7f62' : '#6a7a4c';
  const column = (spine: readonly Pt[], cw: number): void => {
    const n = spine.length - 1;
    const half = (i: number): number => (cw / 2) * (i > n * 0.8 ? Math.sqrt(Math.max(0, 1 - ((i - n * 0.8) / (n * 0.2)) ** 2)) : 0.9 + 0.1 * Math.sin((i / n) * 3));
    const edge = (s: number): Pt[] => spine.map((p, i) => {
      const a = spine[Math.max(0, i - 1)]!;
      const b = spine[Math.min(n, i + 1)]!;
      const t = Math.atan2(b.y - a.y, b.x - a.x);
      return pt(p.x - Math.sin(t) * half(i) * s, p.y + Math.cos(t) * half(i) * s);
    });
    const shape = [...edge(1), ...edge(-1).reverse()];
    if (!flat) {
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#2d3320';
      ctx.beginPath();
      shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    fillShape(ctx, shape, green);
    ctx.save();
    ctx.beginPath();
    shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.clip();
    for (let j = -4; j <= 4; j++) {
      const v = j / 4.4;
      const rib = spine.map((p, i) => {
        const a = spine[Math.max(0, i - 1)]!;
        const b = spine[Math.min(n, i + 1)]!;
        const t = Math.atan2(b.y - a.y, b.x - a.x);
        return pt(p.x - Math.sin(t) * half(i) * v, p.y + Math.cos(t) * half(i) * v);
      });
      ctx.lineWidth = cw * 0.1;
      ctx.strokeStyle = j % 2 ? rgba('#2c3a20', flat ? 0.12 : 0.42) : rgba('#dfe0a8', flat ? 0.12 : 0.4);
      ctx.beginPath();
      rib.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      if (!flat) for (const p of rib) if (rng() < 0.5) hair(ctx, p.x, p.y, rng() * 6.28, cw * 0.1, 2, '#f7eccb', 0.7, 0);
    }
    // Lit on the left, shaded on the right.
    const [l, r] = [spine[0]!.x - cw * 0.5, spine[0]!.x + cw * 0.5];
    ctx.fillStyle = linear(ctx, pt(Math.min(...spine.map((p) => p.x)) - cw * 0.5, 0), pt(Math.max(...spine.map((p) => p.x)) + cw * 0.5, 0), [[0, rgba('#ffe6a8', 0.45)], [0.45, rgba('#ffe6a8', 0)], [1, rgba('#1c2418', 0.5)]]);
    ctx.fillRect(l - h, base - h * 1.2, r - l + h * 2, h * 1.4);
    ctx.restore();
  };
  if (!flat) soft(ctx, x + h * 0.3, base + 4, h * 0.42, h * 0.035, 0, '#4a2413', 0.4);
  for (const [s, at, reach, up] of [[-1, 0.42, 0.2, 0.36], [1, 0.54, 0.18, 0.3]] as const) {
    const y = base - h * (at + (rng() - 0.5) * 0.08);
    const r = h * reach;
    column(curve([pt(x, y + r * 0.2), pt(x + s * r * 0.6, y + r * 0.26), pt(x + s * r, y - r * 0.1), pt(x + s * r * 1.04, y - h * up)], 6), w * 0.66);
  }
  column(curve([pt(x, base + h * 0.02), pt(x + w * 0.06, base - h * 0.5), pt(x, base - h)], 6), w);
}

function farLayer(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, FAR_H);
  wrapped(ctx, () => {
    for (const [x, w, h, c, s] of [[300, 560, 190, '#d99a74', 3], [1480, 700, 230, '#d3906c', 5], [900, 420, 130, '#e2ab82', 7], [2000, 380, 150, '#dda27a', 9]] as const) mesa(ctx, x, FAR_H - 20, w, h, c, s);
    fillShape(ctx, [pt(0, FAR_H), ...Array.from({ length: 41 }, (_, i) => pt((i / 40) * TILE, FAR_H - 34 - 12 * Math.sin((i / 40) * 6.2832 * 3) - 6 * Math.sin((i / 40) * 6.2832 * 7))), pt(TILE, FAR_H)], '#d99a68');
    const rng = rngOf(31);
    for (let i = 0; i < 11; i++) saguaro(ctx, rng() * TILE, FAR_H - 22 - rng() * 14, 60 + rng() * 70, 40 + i, true);
  });
  return canvas;
}

function bush(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number): void {
  const rng = rngOf(seed);
  soft(ctx, x + size * 0.3, y + 2, size * 0.8, size * 0.1, 0, '#4a2413', 0.42);
  for (let i = 0; i < 26; i++) hair(ctx, x + (rng() - 0.5) * size * 0.16, y, -1.57 + (rng() - 0.5) * 1.8, size * (0.5 + rng() * 0.5), size * 0.03, i % 3 ? '#5f4a34' : '#7a6246', 0.9, (rng() - 0.5) * 0.5);
  for (let i = 0; i < 150; i++) {
    const a = -1.57 + (rng() - 0.5) * 2.2;
    const r = size * (0.35 + rng() * 0.7);
    const p = pt(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.86);
    hair(ctx, p.x, p.y, a + (rng() - 0.5) * 1.6, size * 0.1, size * 0.05, ['#7f8a4c', '#97a05c', '#5f6b38', '#b5b878'][i % 4]!, 0.92, 0.1);
  }
}

function midLayer(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, MID_H);
  wrapped(ctx, () => {
    saguaro(ctx, 190, MID_H - 60, 560, 61, false);
    saguaro(ctx, 1290, MID_H - 40, 430, 67, false);
    saguaro(ctx, 1830, MID_H - 70, 330, 71, false);
    bush(ctx, 560, MID_H - 34, 130, 81);
    bush(ctx, 1010, MID_H - 50, 100, 83);
    bush(ctx, 1560, MID_H - 30, 150, 85);
    bush(ctx, 2060, MID_H - 44, 110, 87);
  });
  return canvas;
}

function groundLayer(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, GROUND_H);
  const edge = Array.from({ length: 61 }, (_, i) => pt((i / 60) * TILE, 20 + 7 * Math.sin((i / 60) * 6.2832 * 2) + 4 * Math.sin((i / 60) * 6.2832 * 5)));
  fillShape(ctx, [...edge, pt(TILE, GROUND_H), pt(0, GROUND_H)], linear(ctx, pt(0, 0), pt(0, GROUND_H), [[0, '#e2ac72'], [0.12, '#edbd83'], [0.45, '#dd9f63'], [1, '#a9653a']]));
  const rng = rngOf(901);
  const items = Array.from({ length: 1500 }, () => ({ x: rng() * TILE, y: 30 + rng() * (GROUND_H - 40), r: rng(), r2: rng() })).sort((a, b) => a.y - b.y);
  wrapped(ctx, () => {
    items.slice(0, 1500).forEach((p, i) => {
      const k = p.y / GROUND_H;
      if (i % 14 === 0) soft(ctx, p.x, p.y, 130 + k * 240, 14 + k * 40, 0, p.r < 0.5 ? '#f7cf98' : '#a8623a', 0.24);
      hair(ctx, p.x, p.y, (p.r - 0.5) * 0.12, 24 + k * 120, 1.4 + k * 3, p.r2 < 0.5 ? '#8f4f2c' : '#ffe2b0', 0.22 + k * 0.1, (p.r - 0.5) * 0.1);
    });
    items.filter((_, i) => i % 13 === 5).forEach((p) => {
      const k = p.y / GROUND_H;
      const r = 5 + k * 20 * (0.4 + p.r);
      soft(ctx, p.x + r * 0.5, p.y + r * 0.6, r * 1.5, r * 0.5, 0, '#4a2413', 0.45);
      const stone = loop([pt(p.x - r, p.y + r * 0.4), pt(p.x - r * 0.7, p.y - r * 0.4), pt(p.x, p.y - r * (0.6 + p.r2 * 0.2)), pt(p.x + r * 0.8, p.y - r * 0.3), pt(p.x + r, p.y + r * 0.4), pt(p.x, p.y + r * 0.56)], 4);
      fillShape(ctx, stone, linear(ctx, pt(p.x - r, p.y - r), pt(p.x + r, p.y + r), [[0, '#f0cda2'], [0.5, '#b98a66'], [1, '#6b4632']]));
      new Pen(ctx, 5 + Math.round(p.x), 0.4).stroke([...stone, stone[0]!], Math.max(1, r * 0.1), '#4a2a1c', 0.6, false);
    });
    items.filter((p, i) => i % 37 === 9 && p.y > 60).forEach((p, i) => {
      const k = p.y / GROUND_H;
      const size = 26 + k * 120;
      soft(ctx, p.x + size * 0.3, p.y + 3, size * 0.6, size * 0.1, 0, '#4a2413', 0.4);
      const r2 = rngOf(700 + i);
      for (let j = 0; j < 22; j++) hair(ctx, p.x + (r2() - 0.5) * size * 0.2, p.y, -1.57 + (r2() - 0.5) * 1.7, size * (0.5 + r2() * 0.6), size * 0.045, ['#d9b56a', '#b98f4a', '#f0d492'][j % 3]!, 0.95, (r2() - 0.5) * 0.6);
    });
  });
  return canvas;
}

export const bakeLand = (): Land => ({ far: farLayer(), mid: midLayer(), ground: groundLayer() });

function tiled(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, x: number, y: number): void {
  const x0 = Math.round(((x % TILE) + TILE) % TILE);
  // A pixel wider than it is, so no seam shows.
  ctx.drawImage(layer, x0 - TILE, y, TILE + 1, layer.height);
  ctx.drawImage(layer, x0, y, TILE + 1, layer.height);
}

/** The land with its horizon at `horizon`, scrolled left by `scroll` px (the ground's speed; the rest slower). */
export function drawLand(ctx: CanvasRenderingContext2D, land: Land, horizon: number, scroll: number, o: { mid?: number; offset?: number } = {}): void {
  const off = o.offset ?? 0;
  tiled(ctx, land.far, off - scroll * 0.06, horizon - FAR_H + 34);
  tiled(ctx, land.ground, off - scroll, horizon - 4);
  if (o.mid !== 0) {
    ctx.save();
    ctx.translate(0, horizon + 70);
    ctx.scale(o.mid ?? 1, o.mid ?? 1);
    tiled(ctx, land.mid, (off - scroll * 0.55) / (o.mid ?? 1), -MID_H);
    ctx.restore();
  }
}
