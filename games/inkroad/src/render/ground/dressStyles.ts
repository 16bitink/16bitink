import type { Pt } from '../../sim/types';
import { fbm } from '../noise';
import type { Pen } from './dress';
import { spotsIn } from './free';
import { fieldAt } from './terrain';

type Spot = { x: number; y: number; a: number; b: number; c: number };

/** What each city's ground is dressed with, between its blocks. */
export function dressStyle(style: string, p: Pen): void {
  if (style === 'oldtown') return oldtown(p);
  if (style === 'islands') return islands(p);
  if (style === 'hills') return hills(p);
  if (style === 'rivers') return rivers(p);
  return gulf(p);
}

/** Spots of a grid where `gate` holds, dry, and clear of roads and lots by `pad`. */
function each(p: Pen, step: number, seed: number, pad: number, gate: (s: Spot) => boolean, draw: (s: Spot) => void): void {
  for (const s of spotsIn(p.box, step / 1.3, seed)) if (gate(s) && p.dry(s) && p.clear(s, pad)) draw(s);
}

const curve = (g: CanvasRenderingContext2D, a: Pt, b: Pt, bend: number): void => {
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.quadraticCurveTo((a.x + b.x) / 2 + bend * (b.y - a.y) * 0.3, (a.y + b.y) / 2 - bend * (b.x - a.x) * 0.3, b.x, b.y);
  g.stroke();
};

function dots(g: CanvasRenderingContext2D, s: Spot, colours: readonly string[], n: number, r: number, size: number): void {
  for (let i = 0; i < n; i++) {
    const t = (s.a * 97 + i * 2.399) % 6.283;
    const d = r * Math.sqrt((i + 0.5) / n);
    g.fillStyle = colours[(i + Math.floor(s.b * 7)) % colours.length]!;
    g.beginPath();
    g.arc(s.x + Math.cos(t) * d, s.y + Math.sin(t * 1.3 + i) * d * 0.8, size * (0.7 + 0.6 * ((i * 37) % 10) / 10), 0, 6.283);
    g.fill();
  }
}

/** A short run along a grid axis, for hedges and walls. */
function run(g: CanvasRenderingContext2D, s: Spot, len: number): void {
  g.beginPath();
  if (s.c > 0.5) { g.moveTo(s.x, s.y); g.lineTo(s.x + len, s.y); } else { g.moveTo(s.x, s.y); g.lineTo(s.x, s.y + len); }
  g.stroke();
}

function gulf(p: Pen): void {
  const { g } = p;
  // Dune ridges: a shade side, a lit side and a hair of pen.
  each(p, 120, 311, 16, (s) => fbm(s.x / 300, s.y / 300, 2, 5) > 0.42 && s.a < 0.55, (s) => {
    const len = 46 + 70 * s.b;
    const a = { x: s.x, y: s.y };
    const b = { x: s.x + len, y: s.y + len * (s.c - 0.5) * 0.5 };
    g.lineWidth = 9; g.strokeStyle = 'rgba(150,98,48,0.07)';
    curve(g, { x: a.x + 3, y: a.y + 4 }, { x: b.x + 3, y: b.y + 4 }, 0.5);
    g.lineWidth = 6; g.strokeStyle = 'rgba(255,246,218,0.2)';
    curve(g, { x: a.x - 2, y: a.y - 2 }, { x: b.x - 2, y: b.y - 2 }, 0.5);
    g.lineWidth = 0.8; g.strokeStyle = 'rgba(120,80,40,0.12)';
    curve(g, a, b, 0.5);
  });
  // Sand tracks, two faint wheel lines.
  each(p, 380, 317, 24, (s) => s.a < 0.35, (s) => {
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(140,96,50,0.13)';
    for (const o of [0, 5]) curve(g, { x: s.x, y: s.y + o }, { x: s.x + 150 + 80 * s.b, y: s.y + o + (s.c - 0.5) * 70 }, 0.4);
  });
  // Tufts of dry grass.
  each(p, 70, 319, 14, (s) => s.a < 0.2, (s) => {
    g.lineWidth = 1; g.strokeStyle = 'rgba(112,110,52,0.4)';
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(s.x + i * 2.5, s.y); g.lineTo(s.x + i * 4, s.y - 5 - s.b * 3); g.stroke(); }
  });
}

function oldtown(p: Pen): void {
  const { g } = p;
  each(p, 84, 331, 14, (s) => s.a < 0.3, (s) => { g.lineWidth = 5.5; g.strokeStyle = 'rgba(62,92,44,0.6)'; run(g, s, 34 + 30 * s.b); g.lineWidth = 2; g.strokeStyle = 'rgba(150,176,86,0.5)'; run(g, { ...s, x: s.x - 0.5, y: s.y - 1 }, 30 + 26 * s.b); });
  each(p, 100, 333, 14, (s) => s.a > 0.84, (s) => { g.lineWidth = 3.4; g.strokeStyle = 'rgba(58,50,43,0.5)'; run(g, s, 46); g.lineWidth = 2; g.strokeStyle = 'rgba(232,224,200,0.9)'; run(g, { ...s, y: s.y - 0.6 }, 46); });
  // Kitchen gardens: a bed of soil with rows of green.
  each(p, 150, 337, 20, (s) => s.a > 0.5 && s.b < 0.6, (s) => {
    const w = 34, h = 22;
    g.fillStyle = 'rgba(118,86,52,0.45)'; g.fillRect(s.x, s.y, w, h);
    g.lineWidth = 3; g.strokeStyle = 'rgba(92,130,56,0.8)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(s.x + 3, s.y + 3 + i * 5.2); g.lineTo(s.x + w - 3, s.y + 3 + i * 5.2); g.stroke(); }
    g.lineWidth = 1; g.strokeStyle = 'rgba(58,50,43,0.5)'; g.strokeRect(s.x, s.y, w, h);
  });
  // Benches: a small slab with two dark legs.
  each(p, 220, 339, 12, (s) => s.a > 0.7, (s) => { g.fillStyle = 'rgba(122,86,50,0.9)'; g.fillRect(s.x, s.y, 12, 4); g.fillStyle = 'rgba(58,50,43,0.6)'; g.fillRect(s.x + 1, s.y + 4, 2, 1.5); g.fillRect(s.x + 9, s.y + 4, 2, 1.5); });
  // Stacks of barrels by the port.
  for (const l of p.lots.lots) {
    if (l.kind !== 'port' || l.level === 0) continue;
    const x = (l.gx + l.w) * 40 + 12, y = (l.gy + l.h) * 40 - 30;
    for (let i = 0; i < 6; i++) {
      const bx = x + (i % 3) * 11 + (i > 2 ? 5 : 0), by = y + Math.floor(i / 3) * 10;
      g.fillStyle = '#9a6a3a'; g.strokeStyle = 'rgba(58,50,43,0.7)'; g.lineWidth = 0.9;
      g.beginPath(); g.arc(bx, by, 5, 0, 6.283); g.fill(); g.stroke();
      g.fillStyle = 'rgba(230,190,120,0.7)'; g.beginPath(); g.arc(bx - 1, by - 1, 2.4, 0, 6.283); g.fill();
    }
  }
}

function islands(p: Pen): void {
  const { g, rows } = p;
  each(p, 230, 341, 28, (s) => s.a < 0.3 && fieldAt(rows, 'p', s.x, s.y) < 0.4, (s) => {
    const rx = 17 + 14 * s.b, ry = rx * 0.62;
    g.fillStyle = 'rgba(210,226,150,0.55)'; g.beginPath(); g.ellipse(s.x, s.y, rx + 3.5, ry + 3, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(84,160,170,0.92)'; g.beginPath(); g.ellipse(s.x, s.y, rx, ry, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(190,236,232,0.5)'; g.beginPath(); g.ellipse(s.x - rx * 0.25, s.y - ry * 0.3, rx * 0.5, ry * 0.3, 0, 0, 6.283); g.fill();
    g.lineWidth = 0.9; g.strokeStyle = 'rgba(58,50,43,0.5)'; g.beginPath(); g.ellipse(s.x, s.y, rx, ry, 0, 0, 6.283); g.stroke();
  });
  // Winding footpaths.
  each(p, 170, 343, 16, (s) => s.a > 0.5, (s) => {
    const e = { x: s.x + 70 + 60 * s.b, y: s.y + (s.c - 0.5) * 90 };
    g.lineWidth = 5; g.strokeStyle = 'rgba(214,190,140,0.5)'; curve(g, s, e, 1.2);
    g.lineWidth = 2.6; g.strokeStyle = 'rgba(244,226,180,0.55)'; curve(g, s, e, 1.2);
  });
  // Flower beds and banana patches.
  each(p, 74, 347, 16, (s) => s.a < 0.2, (s) => dots(g, s, ['#e0587a', '#f2b238', '#f4eadc', '#c8434a', '#9a62c8'], 9, 12, 2.1));
  each(p, 120, 349, 16, (s) => s.a > 0.78, (s) => {
    g.lineWidth = 4; g.strokeStyle = 'rgba(44,112,48,0.7)';
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(s.x + i * 5 - 10, s.y + 3); g.lineTo(s.x + i * 5 - 12 + s.b * 4, s.y - 6); g.stroke(); }
  });
}

function hills(p: Pen): void {
  const { g, rows, box } = p;
  const STEP = 10;
  const height = (x: number, y: number): number => fieldAt(rows, 'h', x, y) + fieldAt(rows, '#', x, y) * 0.9;
  const x0 = Math.floor(box.x0 / STEP) * STEP, y0 = Math.floor(box.y0 / STEP) * STEP;
  for (let y = y0; y < box.y1; y += STEP) {
    for (let x = x0; x < box.x1; x += STEP) {
      const v = height(x, y);
      if (v < 0.04) continue;
      g.fillStyle = `rgba(112,78,40,${Math.min(0.16, v * 0.18)})`;
      g.beginPath(); g.arc(x, y, 9, 0, 6.283); g.fill();
      const level = v * 4;
      if (Math.abs(level - Math.round(level)) > 0.07 || Math.round(level) < 1) continue;
      const gx = height(x + 4, y) - height(x - 4, y), gy = height(x, y + 4) - height(x, y - 4);
      const n = Math.hypot(gx, gy) || 1;
      const tx = -gy / n * 7, ty = gx / n * 7;
      g.lineWidth = 2.6; g.strokeStyle = 'rgba(72,52,30,0.28)'; g.beginPath(); g.moveTo(x - tx, y - ty + 1.8); g.lineTo(x + tx, y + ty + 1.8); g.stroke();
      g.lineWidth = 2; g.strokeStyle = 'rgba(238,226,196,0.62)'; g.beginPath(); g.moveTo(x - tx, y - ty); g.lineTo(x + tx, y + ty); g.stroke();
    }
  }
  // Garden plots and dry-stone field walls on the flat.
  each(p, 130, 351, 18, (s) => s.a > 0.55 && s.b < 0.5 && height(s.x, s.y) < 0.2, (s) => {
    g.fillStyle = 'rgba(126,100,60,0.4)'; g.fillRect(s.x, s.y, 30, 20);
    g.lineWidth = 2.4; g.strokeStyle = 'rgba(116,138,64,0.75)';
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s.x + 3, s.y + 4 + i * 6); g.lineTo(s.x + 27, s.y + 4 + i * 6); g.stroke(); }
  });
  each(p, 100, 353, 14, (s) => s.a < 0.22, (s) => { g.lineWidth = 3; g.strokeStyle = 'rgba(90,70,48,0.4)'; run(g, s, 50); g.lineWidth = 1.8; g.strokeStyle = 'rgba(232,222,192,0.8)'; run(g, { ...s, y: s.y - 0.8 }, 50); });
}

function rivers(p: Pen): void {
  const { g, rows } = p;
  each(p, 80, 361, 14, (s) => s.a < 0.3 && fbm(s.x / 240, s.y / 240, 2, 9) > 0.45, (s) => dots(g, s, ['#c8642c', '#b2461e', '#d89a38', '#8c5a2a'], 12, 13, 1.7));
  // Yard fences: two rails and posts.
  each(p, 110, 363, 14, (s) => s.a > 0.78, (s) => {
    g.lineWidth = 1; g.strokeStyle = 'rgba(90,62,38,0.8)';
    for (const dy of [0, 3]) { g.beginPath(); g.moveTo(s.x, s.y + dy); g.lineTo(s.x + 48, s.y + dy); g.stroke(); }
    g.fillStyle = 'rgba(90,62,38,0.9)';
    for (let i = 0; i <= 6; i++) g.fillRect(s.x + i * 8 - 0.7, s.y - 1, 1.5, 6);
  });
  // A railway siding: rails and sleepers.
  each(p, 460, 367, 24, (s) => s.a < 0.3, (s) => {
    const len = 110;
    g.lineWidth = 1.8; g.strokeStyle = 'rgba(92,64,40,0.7)';
    for (let i = 0; i < len; i += 7) { g.beginPath(); g.moveTo(s.x + i, s.y - 4); g.lineTo(s.x + i, s.y + 4); g.stroke(); }
    g.lineWidth = 1.1; g.strokeStyle = 'rgba(70,66,70,0.85)';
    for (const dy of [-2.5, 2.5]) { g.beginPath(); g.moveTo(s.x, s.y + dy); g.lineTo(s.x + len, s.y + dy); g.stroke(); }
  });
  // Weeds on bare ground, and reeds along the bank.
  each(p, 64, 369, 12, (s) => s.a < 0.3, (s) => { g.lineWidth = 1; g.strokeStyle = 'rgba(96,102,48,0.6)'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(s.x + i * 2, s.y); g.lineTo(s.x + i * 3, s.y - 5 - ((i * i) % 3)); g.stroke(); } });
  for (const s of spotsIn(p.box, 28, 371)) {
    const w = fieldAt(rows, '~', s.x, s.y);
    if (w < 0.12 || w > 0.34 || s.a > 0.45 || !p.clear(s, 12)) continue;
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(118,112,52,0.75)';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(s.x + i * 2, s.y); g.lineTo(s.x + i * 2.6, s.y - 9 - ((i * i) % 3) * 2); g.stroke(); }
  }
}
