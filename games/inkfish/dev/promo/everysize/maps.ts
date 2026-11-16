import { INK, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { clamp01, smooth } from '../short';
import { drawCard, drawText, INK_ON_PAPER } from '../swallowyou/text';
import { boilOf } from './art/bake';

/**
 * The map cards, drawn like an old chart in pen and ink: paper land with a
 * wobbly coastline and a band of ripple lines offshore, a pale blue-grey
 * sea, hand-lettered names. The east coast of South Africa (the sardine run
 * moving north-east as a silver ribbon), the Strait of Gibraltar (an orca
 * fin in it) and Western Australia's south coast (the 2019 pin). Plus the
 * night globe with two lights for "about two of us". Coastlines are
 * simplified by hand from the real ones (lon, lat).
 */

type LonLat = readonly [number, number];

export interface MapSpec {
  readonly lon: readonly [number, number];
  readonly lat: readonly [number, number];
  readonly land: readonly (readonly LonLat[])[];
  readonly labels: readonly { readonly at: LonLat; readonly text: string; readonly size: number; readonly sea?: boolean }[];
}

export const SOUTH_AFRICA: MapSpec = {
  lon: [16, 36], lat: [-36.2, -22],
  land: [[
    [14, -20], [14, -28.6], [16.5, -28.6], [17.1, -30.5], [18, -32.5], [18.4, -33.9], [18.5, -34.36], [19.3, -34.6], [20, -34.83], [21, -34.4], [22.1, -34.2],
    [23.4, -34.1], [24.8, -34.2], [25.6, -34], [26.5, -33.75], [27.9, -33.05], [28.8, -32.3], [29.5, -31.6], [30.3, -30.9], [31, -29.9], [31.6, -29.2],
    [32.1, -28.8], [32.5, -28], [32.9, -26.9], [32.9, -26], [33.6, -25.4], [35, -24.5], [35.5, -23], [35.6, -20], [37, -20],
  ]],
  labels: [
    { at: [22.6, -31.4], text: 'SOUTH AFRICA', size: 44 },
    { at: [32.6, -33.6], text: 'Indian Ocean', size: 34, sea: true },
    { at: [29.6, -29.4], text: 'Durban', size: 28 },
  ],
};

/** The sardine run's ribbon: just offshore, from the south coast up past Durban. */
export const RUN_PATH: readonly LonLat[] = [[23.5, -34.7], [25.6, -34.45], [27.9, -33.5], [29.5, -32.1], [30.6, -31], [31.4, -30.1], [32.2, -29.2]];

export const GIBRALTAR: MapSpec = {
  lon: [-7.2, -4.1], lat: [35.2, 36.95],
  land: [
    [[-7.6, 37.5], [-7.4, 37.2], [-6.95, 37.1], [-6.4, 36.8], [-6.3, 36.53], [-6.15, 36.3], [-5.95, 36.18], [-5.8, 36.08], [-5.6, 36.01], [-5.45, 36.07],
      [-5.42, 36.15], [-5.36, 36.11], [-5.35, 36.16], [-5.3, 36.3], [-5.15, 36.42], [-4.9, 36.5], [-4.6, 36.58], [-4.42, 36.7], [-4, 36.73], [-3.9, 37.5]],
    [[-6.5, 34.8], [-6.15, 35.2], [-6.03, 35.46], [-5.95, 35.65], [-5.93, 35.79], [-5.8, 35.79], [-5.6, 35.84], [-5.4, 35.92], [-5.33, 35.9], [-5.35, 35.8],
      [-5.3, 35.6], [-5.1, 35.4], [-4.8, 35.25], [-4.3, 35.2], [-3.9, 35.2], [-3.9, 34.8]],
  ],
  labels: [
    { at: [-5.9, 36.72], text: 'SPAIN', size: 44 },
    { at: [-5.55, 35.45], text: 'MOROCCO', size: 44 },
    { at: [-6.75, 35.95], text: 'Atlantic', size: 32, sea: true },
    { at: [-4.75, 36.05], text: 'Mediterranean', size: 30, sea: true },
  ],
};

export const WEST_AUSTRALIA: MapSpec = {
  lon: [112, 126.5], lat: [-36.5, -26],
  land: [[
    [122, -17], [121, -19.5], [118.6, -20.3], [117, -20.6], [114.6, -21.8], [113.6, -23.5], [113.4, -26.5], [114.1, -27.7], [114.6, -28.8], [115, -29.9],
    [115.3, -31], [115.75, -32], [115.6, -33.3], [115, -33.6], [115.1, -34.4], [116, -34.85], [117.9, -35.1], [119.4, -34.45], [120.5, -33.95], [121.9, -33.86],
    [123.5, -33.9], [124.5, -33], [126, -32.3], [127, -32], [127, -17],
  ]],
  labels: [
    { at: [119.5, -29.5], text: 'WESTERN AUSTRALIA', size: 42 },
    { at: [116.5, -35.9], text: 'Southern Ocean', size: 32, sea: true },
  ],
};

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** lon, lat → px inside the card (north up, the longitudes squeezed by the latitude's cosine). */
export function projector(spec: MapSpec, r: Rect): (p: LonLat) => Pt {
  const midLat = ((spec.lat[0] + spec.lat[1]) / 2) * (Math.PI / 180);
  const spanX = (spec.lon[1] - spec.lon[0]) * Math.cos(midLat);
  const spanY = spec.lat[1] - spec.lat[0];
  const k = Math.min(r.w / spanX, r.h / spanY);
  const ox = r.x + (r.w - spanX * k) / 2;
  const oy = r.y + (r.h - spanY * k) / 2;
  return ([lon, lat]) => ({ x: ox + (lon - spec.lon[0]) * Math.cos(midLat) * k, y: oy + (spec.lat[1] - lat) * k });
}

/** Draws a map card into `r` (which includes its paper border), fading with `alpha`; `extra` draws on top in map px. */
export function drawMapCard(ctx: CanvasRenderingContext2D, spec: MapSpec, r: Rect, t: number, alpha: number, extra?: (proj: (p: LonLat) => Pt) => void): void {
  if (alpha <= 0) return;
  const slide = (1 - smooth(alpha)) * 40;
  ctx.save();
  ctx.translate(0, slide);
  drawCard(ctx, r.x, r.y, r.w, r.h, alpha);
  const inner = { x: r.x + 18, y: r.y + 18, w: r.w - 36, h: r.h - 36 };
  const proj = projector(spec, inner);
  const pen = new Pen(ctx, 2201 + boilOf(t) * 977, 1.1);
  ctx.globalAlpha = alpha;
  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();
  ctx.fillStyle = '#bcd3da';
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  for (const poly of spec.land) {
    const pts = poly.map(proj);
    // Ripples offshore: the coast traced again, fainter, a few times outwards.
    for (let i = 3; i >= 1; i--) pen.stroke(pts, 1.6, '#5f7f8c', 0.28 / i + 0.05, false);
    pen.fill(pts, '#efe4c8', 1);
    pen.hatch(pts, 9, -0.7, 1, { alpha: 0.12 });
    pen.stroke(pts, 3, INK, 0.9, false);
  }
  for (const l of spec.labels) {
    const p = proj(l.at);
    drawText(ctx, l.text, { x: p.x, y: p.y, size: l.size, maxWidth: inner.w * 0.6 }, l.sea ? 500 : 700, alpha * (l.sea ? 0.75 : 1), l.sea ? { fill: '#2f5361', halo: '#bcd3da' } : INK_ON_PAPER);
  }
  extra?.(proj);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
  ctx.restore();
}

/** A pin: a red dot with a ring that pulses, and an ink stem. */
export function drawPin(ctx: CanvasRenderingContext2D, p: Pt, t: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const pulse = (t * 1.2) % 1;
  ctx.strokeStyle = `rgba(216,49,43,${0.8 * (1 - pulse)})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10 + 30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#d8312b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The sardine run: a silver ribbon of tiny fish streaming along the path, drawn on as `u` goes 0 .. 1. */
export function drawRun(ctx: CanvasRenderingContext2D, proj: (p: LonLat) => Pt, t: number, u: number): void {
  const pts = RUN_PATH.map(proj);
  const along = (s: number): Pt => {
    const f = s * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    const k = f - i;
    return { x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * k, y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * k };
  };
  ctx.save();
  for (let n = 0; n < 160; n++) {
    const s = ((n / 160 + t * 0.06) % 1) * u;
    const p = along(s);
    const q = along(Math.min(1, s + 0.004));
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    const off = Math.sin(n * 2.3) * 12;
    ctx.fillStyle = n % 3 ? 'rgba(236,244,250,0.95)' : 'rgba(150,170,186,0.95)';
    ctx.beginPath();
    ctx.ellipse(p.x - Math.sin(a) * off, p.y + Math.cos(a) * off, 7, 2.6, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // The arrowhead at the front.
  const tip = along(u);
  const back = along(Math.max(0, u - 0.05));
  const a = Math.atan2(tip.y - back.y, tip.x - back.x);
  ctx.translate(tip.x, tip.y);
  ctx.rotate(a);
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-6, -16);
  ctx.lineTo(-6, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** An orca's dorsal fin cutting the water, ink on the sea. */
export function drawFin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#16181f';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.45, y);
  ctx.quadraticCurveTo(x - size * 0.1, y - size * 0.4, x + size * 0.05, y - size * 1.25);
  ctx.quadraticCurveTo(x + size * 0.18, y - size * 0.5, x + size * 0.5, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.9, y + 2);
  ctx.quadraticCurveTo(x, y + size * 0.12, x + size * 0.9, y + 2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the night globe

const AFRICA: readonly LonLat[] = [
  [-17, 21], [-17, 14.7], [-12, 8], [-8, 4.5], [-3, 5], [4, 6], [9, 4], [9.5, 1], [12, -5], [13, -12], [12, -17], [15, -27], [18.4, -34], [20, -34.8],
  [25.6, -34], [31, -29.9], [33, -26], [35.5, -23], [35, -18], [40.6, -15], [40, -10.5], [39.3, -6.8], [40.5, -2.5], [43, 0], [46, 2], [51, 11.8],
  [43.5, 11.6], [42.6, 15], [38.5, 18], [35.5, 24], [32.5, 30], [29, 31], [25, 31.6], [20, 32], [15, 32.3], [10.5, 34], [10, 37.2], [3, 36.8],
  [-2, 35.1], [-5.9, 35.8], [-9.8, 30], [-13.2, 27.6],
];
const EURASIA: readonly LonLat[] = [
  [-9.5, 43], [-9, 37], [-5.6, 36], [-2, 36.7], [0, 38.7], [3.2, 42], [6, 43], [9, 44.4], [12.5, 41.8], [16, 38], [18.5, 40], [13, 45.7], [19.5, 42],
  [24, 38], [26, 40.5], [29, 41], [36, 36.5], [35, 32], [34.5, 28], [39, 22], [43, 13], [45, 12.8], [52, 16], [59, 22.5], [56, 26.5], [51, 24],
  [48, 29.5], [52, 32], [60, 25], [68, 24], [72, 21], [77, 8], [80, 15], [88, 22], [100, 15], [100, 60], [60, 70], [40, 67], [28, 71], [15, 69],
  [5, 62], [8, 58], [10.5, 54], [5, 53], [-1.5, 49.5], [-4.5, 48.5], [-1.5, 46], [-1.5, 43.4],
];

/** The Earth at night, turning slowly, two warm lights on it. */
export function drawGlobe(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const lon0 = (8 + (t % 60) * 1.5) * (Math.PI / 180);
  const lat0 = 12 * (Math.PI / 180);
  const proj = ([lon, lat]: LonLat): Pt & { front: boolean } => {
    const l = lon * (Math.PI / 180) - lon0;
    const p = lat * (Math.PI / 180);
    const x = Math.cos(p) * Math.sin(l);
    const y = Math.cos(lat0) * Math.sin(p) - Math.sin(lat0) * Math.cos(p) * Math.cos(l);
    const z = Math.sin(lat0) * Math.sin(p) + Math.cos(lat0) * Math.cos(p) * Math.cos(l);
    return { x: cx + x * r, y: cy - y * r, front: z > 0 };
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  const sea = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  sea.addColorStop(0, '#24365a');
  sea.addColorStop(1, '#070b18');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(160,190,230,0.18)';
  ctx.lineWidth = 1.5;
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    for (let lon = -180; lon <= 180; lon += 6) {
      const p = proj([lon, lat]);
      if (p.front) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let lon = -180; lon < 180; lon += 30) {
    ctx.beginPath();
    for (let lat = -90; lat <= 90; lat += 6) {
      const p = proj([lon, lat]);
      if (p.front) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (const land of [AFRICA, EURASIA]) {
    const pts = land.map(proj);
    if (!pts.some((p) => p.front)) continue;
    ctx.fillStyle = '#1c2538';
    ctx.strokeStyle = 'rgba(190,205,230,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(200,220,255,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // The two lights.
  ([[3, 9], [27, -12]] as const).forEach(([lon, lat], i) => {
    const p = proj([lon, lat]);
    if (!p.front) return;
    const glow = 0.75 + 0.25 * Math.sin(t * 3 + i * 2);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 34);
    g.addColorStop(0, `rgba(255,236,150,${glow})`);
    g.addColorStop(0.25, `rgba(255,200,80,${0.6 * glow})`);
    g.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export const fade = (t: number, from: number, to: number, s = 0.35): number => clamp01((t - from) / s) * clamp01((to - t) / s);
