import { ellipse, INK, Pen, roundRect, type Pt } from '../pen';
import { C } from './palette';

/**
 * Chapter boards (1080 x 1920) and their wide surrounds (1920 x 1080) in ink:
 * pale paper in the chapter's tint, faint wave strokes, an edge motif kept to
 * the margins (the middle stays empty paper for the bricks), an inked frame.
 */
interface Theme {
  readonly paper: string;
  readonly edge: (p: Pen, w: number, h: number) => void;
}

const rect = (x: number, y: number, w: number, h: number): Pt[] => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];

function waves(p: Pen, w: number, h: number, n: number, alpha: number): void {
  for (let i = 0; i < n; i++) {
    const x = p.rng() * w;
    const y = p.rng() * h;
    const len = 50 + p.rng() * 70;
    const pts = Array.from({ length: 6 }, (_, k) => ({ x: x + (len * k) / 5, y: y + (k % 2 ? -5 : 4) }));
    p.hair(pts, 2, INK, alpha);
  }
}

function grain(p: Pen, w: number, h: number): void {
  p.stipple(rect(0, 0, w, h), (w * h) / 260, () => 0.5, 1, '#6a6258');
}

/** A sandy shore along the bottom: sand fill, stipple densest at the waterline, a few pebbles. */
function shore(p: Pen, w: number, h: number, depth: number, fill: string): void {
  const top = h - depth;
  const line = Array.from({ length: 13 }, (_, i) => ({ x: (w * i) / 12, y: top + Math.sin(i * 1.7) * depth * 0.12 }));
  const sand = [...line, { x: w, y: h }, { x: 0, y: h }];
  p.fill(sand, fill);
  p.stipple(sand, w * depth * 0.025, (_x, y) => 0.15 + 0.6 * Math.max(0, 1 - (y - top) / depth), 1.4);
  p.stroke(line, 4);
  for (let i = 0; i < 5; i++) {
    const x = p.rng() * w;
    const y = top + depth * (0.35 + p.rng() * 0.5);
    const peb = ellipse(x, y, 6 + p.rng() * 5, 4 + p.rng() * 3, 12);
    p.fill(peb, C.white);
    p.closed(peb, 2);
  }
}

function sideRocks(p: Pen, w: number, h: number, width: number, fill: string, dense: number): void {
  for (const left of [true, false]) {
    const pts: Pt[] = Array.from({ length: 14 }, (_, i) => ({ x: (left ? 0 : w) + (left ? 1 : -1) * width * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.3))), y: (h * i) / 13 }));
    const shape = left ? [{ x: 0, y: 0 }, ...pts, { x: 0, y: h }] : [{ x: w, y: 0 }, ...pts, { x: w, y: h }];
    p.fill(shape, fill);
    p.hatch(shape, dense, left ? 0.9 : -0.9, 2, { alpha: 0.55 });
    p.stroke(pts, 4);
  }
}

/** One ice floe: a jagged flat slab (pale top, a hatched ice-blue side under it), inked, with a crack or two. */
function floe(p: Pen, cx: number, cy: number, rx: number): void {
  const ry = rx * (0.42 + p.rng() * 0.12);
  const top: Pt[] = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * Math.PI * 2;
    const k = 0.78 + p.rng() * 0.27;
    return { x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k };
  });
  const depth = Math.max(6, rx * 0.16);
  const side = top.map((q) => ({ x: q.x, y: q.y + depth }));
  p.fill(side, C.ice);
  p.hatch(side, 4, 1.15, 1.2, { onlyBelow: cy + ry * 0.2, alpha: 0.6 });
  p.closed(side, 2.6);
  p.fill(top, '#f2f6f5');
  p.stipple(top, rx * 4, (_x, y) => (y > cy + ry * 0.35 ? 0.5 : 0.04), 1);
  for (let c = 0; c < 2; c++) {
    const x0 = cx + (p.rng() - 0.5) * rx;
    p.hair([{ x: x0, y: cy - ry * 0.3 }, { x: x0 + rx * 0.15, y: cy }, { x: x0 + rx * 0.05, y: cy + ry * 0.3 }], 1.4, INK, 0.6);
  }
  p.closed(top, 3);
  // A ripple beside it on the water.
  p.hair([{ x: cx - rx * 0.9, y: cy + ry + depth + 8 }, { x: cx - rx * 0.4, y: cy + ry + depth + 5 }, { x: cx + rx * 0.1, y: cy + ry + depth + 9 }], 1.6, INK, 0.45);
}

/** Floes along both side edges, whole (never cut by the edge). On the wide surround they keep to the outer bands. */
function floes(p: Pen, w: number, h: number): void {
  const n = w > h ? 10 : 7;
  const band = w > h ? w * 0.16 : w * 0.02;
  for (let i = 0; i < n; i++) {
    const left = i % 2 === 0;
    const rx = w > h ? 46 + p.rng() * 22 : 24 + p.rng() * 14;
    const off = rx + 10 + p.rng() * band;
    const x = left ? off : w - off;
    const y = h * (0.06 + 0.86 * ((i + p.rng() * 0.8) / n));
    floe(p, x, y, rx);
  }
}

function wallTop(p: Pen, w: number, h: number): void {
  const rows = 2;
  for (let r = 0; r < rows; r++) {
    for (let x = r % 2 ? -60 : 0; x < w; x += 120) {
      const block = roundRect(x + 3, r * 60 + 3, 114, 54, 6, 4);
      p.fill(block, '#b8afb6');
      p.hatch(block, 6, 0.8, 1.4, { alpha: 0.4, onlyBelow: r * 60 + 34 });
      p.closed(block, 2.6);
    }
  }
}

const THEMES: readonly Theme[] = [
  { paper: '#e9e5dc', edge: (p, w, h) => shore(p, w, h, h * 0.045, C.sand) },
  { paper: '#e3e7e8', edge: (p, w, h) => floes(p, w, h) },
  { paper: '#ebe2d6', edge: (p, w, h) => shore(p, w, h, h * 0.04, '#d9c3a6') },
  { paper: '#d9dbd8', edge: (p, w, h) => sideRocks(p, w, h, w * 0.05, C.stone, 9) },
  { paper: '#e6e0e2', edge: (p, w, h) => wallTop(p, w, h) },
];

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, chapter: number, framed: boolean): void {
  const t = THEMES[Math.max(0, Math.min(4, chapter - 1))]!;
  const p = new Pen(ctx, 900 + chapter * 13 + (framed ? 1 : 0), 2);
  p.fill(rect(0, 0, w, h), t.paper);
  grain(p, w, h);
  waves(p, w, h, Math.round((w * h) / 90000), 0.35);
  t.edge(p, w, h);
  if (framed) p.closed(roundRect(8, 8, w - 16, h - 16, 18, 14), 7);
}

export const boardDrawer = (chapter: number) => (ctx: CanvasRenderingContext2D, w: number, h: number): void => draw(ctx, w, h, chapter, true);
export const surroundDrawer = (chapter: number) => (ctx: CanvasRenderingContext2D, w: number, h: number): void => draw(ctx, w, h, chapter, false);
