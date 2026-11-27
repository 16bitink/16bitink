import { ellipse, INK, Pen, roundRect, type Pt } from '../pen';
import { C } from './palette';

/**
 * The small pieces in ink: stones, trails, pickups, hearts, shells, the
 * calendar stamp, Brumm's shield, spinners, whirlpools, shutters and the
 * plain rafts. Same keys and image sizes as the painted set.
 */
export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function pebble(fill: string, seed: number): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, seed, 0.35);
    const body = ellipse(w / 2, h / 2, w / 2 - 2.2, h / 2 - 2.6, 16);
    p.fill(body, fill);
    p.stipple(body, 260, (x, y) => (x + y > w * 1.05 ? 0.8 : 0.05), 0.55);
    p.closed(body, 1.7);
  };
}

function star(cx: number, cy: number, r: number, inner = 0.45): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
  });
}

/** Fill, shade and outline a shape in one go. */
function inked(p: Pen, shape: Pt[], fill: string, line: number, shadeBelow?: number): void {
  p.fill(shape, fill);
  if (shadeBelow !== undefined) p.hatch(shape, 3, 0.8, 0.9, { onlyBelow: shadeBelow, alpha: 0.55 });
  p.closed(shape, line);
}

const trails: Record<string, Draw> = {
  'trail-3': (ctx, w, h) => { // bubbles
    const p = new Pen(ctx, 3, 0.3);
    for (const [x, y, r] of [[0.5, 0.25, 0.3], [0.32, 0.62, 0.2], [0.66, 0.78, 0.15]] as const) {
      p.fill(ellipse(w * x, h * y, w * r, w * r, 14), C.blue, 0.6);
      p.circle(w * x, h * y, w * r, 1.6);
      p.dot(w * x - w * r * 0.35, h * y - w * r * 0.35, 1.4, C.white);
    }
  },
  'trail-7': (ctx, w, h) => { const p = new Pen(ctx, 7, 0.3); inked(p, star(w / 2, h / 2, w * 0.4, 0.3), C.white, 1.6); },
  'trail-14': (ctx, w, h) => { // a sea-grass leaf
    const p = new Pen(ctx, 14, 0.3);
    const leaf = [...Array.from({ length: 9 }, (_, i) => ({ x: 4 + (w - 8) * (i / 8), y: h / 2 - Math.sin((i / 8) * Math.PI) * h * 0.35 })),
      ...Array.from({ length: 9 }, (_, i) => ({ x: w - 4 - (w - 8) * (i / 8), y: h / 2 + Math.sin((i / 8) * Math.PI) * h * 0.3 }))];
    inked(p, leaf, C.sage, 1.6);
    p.hair([{ x: 5, y: h / 2 }, { x: w - 6, y: h / 2 - 1 }], 1.1);
  },
  'trail-30': (ctx, w, h) => { // a drop
    const p = new Pen(ctx, 30, 0.3);
    const drop = [{ x: w / 2, y: 3 }, ...ellipse(w / 2, h * 0.64, w * 0.36, h * 0.3, 16).filter((q) => q.y > h * 0.52)];
    drop.sort((a, b) => Math.atan2(a.y - h * 0.6, a.x - w / 2) - Math.atan2(b.y - h * 0.6, b.x - w / 2));
    inked(p, drop, C.blue, 1.6);
    p.dot(w * 0.4, h * 0.6, 1.6, C.white);
  },
  'trail-50': (ctx, w, h) => { const p = new Pen(ctx, 50, 0.3); inked(p, star(w / 2, h / 2 + 1, w * 0.44), C.gold, 1.8, h * 0.55); },
  'trail-100': (ctx, w, h) => { // a curling wave
    const p = new Pen(ctx, 100, 0.3);
    const curl = Array.from({ length: 18 }, (_, i) => {
      const a = Math.PI * 0.2 + (i / 17) * Math.PI * 1.8;
      const r = h * 0.38 * (1 - i / 26);
      return { x: w * 0.55 + Math.cos(a) * r, y: h * 0.5 - Math.sin(a) * r };
    });
    p.stroke([{ x: 3, y: h - 4 }, ...curl.reverse()], 2.4, C.blue, 1);
    p.stroke([{ x: 3, y: h - 4 }, ...curl], 1.4);
  },
};

function medallion(seed: number, ring: string, inside: (p: Pen, w: number, h: number) => void): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, seed, 0.6);
    const outer = ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 28);
    const inner = ellipse(w / 2, h / 2, w / 2 - 14, h / 2 - 14, 28);
    p.fill(outer, ring);
    p.hatch(outer, 4, 0.8, 1, { onlyBelow: h * 0.6, alpha: 0.5 });
    p.fill(inner, C.paper);
    p.closed(inner, 1.8);
    inside(p, w, h);
    p.closed(outer, 3);
  };
}

const pickups: Record<string, Draw> = {
  'pu-fireball': medallion(201, C.orange, (p, w, h) => {
    const flame = [{ x: w * 0.5, y: h * 0.24 }, { x: w * 0.62, y: h * 0.42 }, { x: w * 0.7, y: h * 0.36 }, { x: w * 0.7, y: h * 0.58 },
      ...ellipse(w / 2, h * 0.6, w * 0.2, h * 0.16, 14).filter((q) => q.y > h * 0.6).sort((a, b) => b.x - a.x),
      { x: w * 0.3, y: h * 0.56 }, { x: w * 0.36, y: h * 0.4 }, { x: w * 0.44, y: h * 0.46 }];
    inked(p, flame, C.orange, 2.4, h * 0.6);
    p.fill(ellipse(w / 2, h * 0.64, w * 0.08, h * 0.08, 10), C.gold);
  }),
  'pu-plus3': medallion(202, C.sage, (p, w, h) => {
    for (const [x, y] of [[0.36, 0.6], [0.64, 0.6], [0.5, 0.38]] as const) inked(p, ellipse(w * x, h * y, w * 0.11, h * 0.1, 14), '#d9d3c6', 2, h * y);
  }),
  'pu-wide': medallion(203, C.blue, (p, w, h) => {
    const plank = roundRect(w * 0.3, h * 0.44, w * 0.4, h * 0.12, 3, 4);
    inked(p, plank, C.drift, 2);
    for (const dir of [-1, 1]) {
      const x0 = w / 2 + dir * w * 0.24;
      p.stroke([{ x: x0, y: h / 2 }, { x: x0 + dir * w * 0.1, y: h / 2 }], 2.4, INK, 1, false);
      p.stroke([{ x: x0 + dir * w * 0.04, y: h * 0.43 }, { x: x0 + dir * w * 0.1, y: h / 2 }, { x: x0 + dir * w * 0.04, y: h * 0.57 }], 2.4, INK, 1, false);
    }
  }),
};

function heartShape(w: number, h: number): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const t = (i / 40) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: w / 2 + (x / 17) * (w / 2 - 3), y: h * 0.45 - (y / 17) * (h / 2 - 3) };
  });
}

/** The hinge's foot sits this many radii below the fan's centre. */
const HINGE_DROP = 0.6;
const HINGE_DROP_PLUS_ONE = 1 + HINGE_DROP;

/**
 * A scallop in a w x h box: a round fan (one radius both ways, so it never
 * reads as stretched in a tall box) over a short hinge, centred.
 */
interface ShellGeo { readonly cx: number; readonly cy: number; readonly r: number }

function shellGeo(w: number, h: number): ShellGeo {
  const r = Math.min(w / 2 - 3, (h - 8) / HINGE_DROP_PLUS_ONE);
  return { cx: w / 2, cy: (h - r * HINGE_DROP_PLUS_ONE) / 2 + r, r };
}

function shellShape(w: number, h: number): Pt[] {
  const { cx, cy, r } = shellGeo(w, h);
  const fan = Array.from({ length: 15 }, (_, i) => {
    const a = Math.PI * (1.08 + (i / 14) * 0.84);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  return [
    ...fan,
    { x: cx + r * 0.28, y: cy + r * 0.25 },
    { x: cx + r * 0.4, y: cy + r * HINGE_DROP },
    { x: cx - r * 0.4, y: cy + r * HINGE_DROP },
    { x: cx - r * 0.28, y: cy + r * 0.25 },
  ];
}

const ui: Record<string, Draw> = {
  heart: (ctx, w, h) => { const p = new Pen(ctx, 301, 0.4); inked(p, heartShape(w, h), C.red, 2.6, h * 0.55); },
  'heart-empty': (ctx, w, h) => {
    const p = new Pen(ctx, 302, 0.4);
    const s = heartShape(w, h);
    p.stipple(s, 400, () => 0.35, 0.6);
    p.closed(s, 2);
  },
  'shell-icon': (ctx, w, h) => {
    const p = new Pen(ctx, 303, 0.4);
    const s = shellShape(w, h);
    const { cx, cy, r } = shellGeo(w, h);
    p.fill(s, C.sand);
    for (let i = 1; i < 6; i++) {
      const a = Math.PI * (1.12 + (i / 6) * 0.76);
      p.hair([{ x: cx, y: cy + r * 0.25 }, { x: cx + Math.cos(a) * (r - 3), y: cy + Math.sin(a) * (r - 3) }], 1.4);
    }
    p.stipple(s, 300, (_x, y) => (y > cy - r * 0.15 ? 0.6 : 0.08), 0.6);
    p.closed(s, 2.4);
  },
  'shell-empty': (ctx, w, h) => {
    const p = new Pen(ctx, 304, 0.4);
    const s = shellShape(w, h);
    p.stipple(s, 300, () => 0.3, 0.6);
    p.closed(s, 1.8, '#6a6258');
  },
  stamp: (ctx, w, h) => { // a paw print in an inked ring
    const p = new Pen(ctx, 305, 0.5);
    p.circle(w / 2, h / 2, w / 2 - 4, 2.6, C.red);
    p.fill(ellipse(w / 2, h * 0.6, w * 0.16, h * 0.13, 14), C.red, 0.9);
    for (const [x, y] of [[0.3, 0.4], [0.42, 0.3], [0.58, 0.3], [0.7, 0.4]] as const) p.fill(ellipse(w * x, h * y, w * 0.06, h * 0.07, 10), C.red, 0.9);
  },
};

const board: Record<string, Draw> = {
  shield: (ctx, w, h) => { // a driftwood boom with an iron band
    const p = new Pen(ctx, 401, 0.8);
    const slab = roundRect(4, 6, w - 8, h - 12, 12, 10);
    p.fill(slab, C.stone);
    p.hatch(slab, 5, 0.75, 1.1, { alpha: 0.45 });
    p.hatch(slab, 4, -0.75, 1, { onlyBelow: h * 0.6, alpha: 0.5 });
    for (const fx of [0.25, 0.5, 0.75]) p.dot(w * fx, h / 2, 3.2);
    p.closed(slab, 3.4);
  },
  spinner: (ctx, w, h) => {
    const p = new Pen(ctx, 402, 0.8);
    const log = roundRect(4, h * 0.22, w - 8, h * 0.56, h * 0.26, 16);
    p.fill(log, C.drift);
    for (let i = 1; i <= 2; i++) p.hair([{ x: 14, y: h * (0.22 + i * 0.18) }, { x: w / 2, y: h * (0.2 + i * 0.18) }, { x: w - 14, y: h * (0.22 + i * 0.18) }], 1.4, INK, 0.7);
    p.hatch(log, 5, 0.7, 1.1, { onlyBelow: h * 0.58, alpha: 0.55 });
    p.closed(log, 3);
    const hub = ellipse(w / 2, h / 2, h * 0.42, h * 0.42, 16);
    inked(p, hub, C.stone, 2.6, h * 0.55);
    p.dot(w / 2, h / 2, 4);
  },
  whirlpool: (ctx, w, h) => {
    const p = new Pen(ctx, 403, 0.5);
    const disc = ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 28);
    p.fill(disc, C.blue, 0.55);
    for (let arm = 0; arm < 3; arm++) {
      const pts = Array.from({ length: 26 }, (_, i) => {
        const t = i / 25;
        const a = arm * ((Math.PI * 2) / 3) + t * Math.PI * 2.4;
        const r = (w / 2 - 8) * (1 - t * 0.9);
        return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r };
      });
      p.stroke(pts, 2.2);
    }
    p.dot(w / 2, h / 2, 4);
    p.closed(disc, 1.6, '#4a5a66');
  },
  shutter: (ctx, w, h) => { // tiles: a slatted wooden grate
    const p = new Pen(ctx, 404, 0.4);
    p.fill([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], C.driftDark);
    for (let x = 6; x < w; x += 15) {
      const slat = [{ x, y: 0 }, { x: x + 9, y: 0 }, { x: x + 9, y: h }, { x, y: h }];
      p.fill(slat, C.drift);
      p.hatch(slat, 4, 1.2, 0.9, { alpha: 0.4 });
      p.stroke([{ x, y: 0 }, { x, y: h }], 1.8, INK, 1, false);
      p.stroke([{ x: x + 9, y: 0 }, { x: x + 9, y: h }], 1.8, INK, 1, false);
    }
  },
};

function raft(seed: number): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, seed, 0.5);
    const deck = roundRect(2, 2, w - 4, h - 4, Math.min(6, h / 3), 10);
    p.fill(deck, C.drift);
    p.hair([{ x: 6, y: h / 2 }, { x: w - 6, y: h / 2 + 1 }], 1.4);
    p.hatch(deck, 4, 0.7, 1, { onlyBelow: h * 0.6, alpha: 0.5 });
    for (const fx of [0.14, 0.86]) {
      const rope = roundRect(w * fx - 4, 1, 8, h - 2, 2, 3);
      p.fill(rope, C.sand);
      p.hatch(rope, 2.6, -1, 0.9, { alpha: 0.8 });
      p.closed(rope, 1.4);
    }
    p.closed(deck, 2.4);
  };
}

export const PIECE_DRAWERS: Readonly<Record<string, Draw>> = {
  stone: pebble('#d9d3c6', 1),
  'stone-dark': pebble(C.white, 2),
  ...trails,
  ...pickups,
  ...ui,
  ...board,
  'raft-plain': raft(501),
  'raft-wide': raft(502),
};
