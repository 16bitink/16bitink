import type { Pt } from '../../../src/art/pen';
import { drawFin, drawMapCard, type MapSpec, type Rect } from '../everysize/maps';
import { smooth } from '../short';
import { drawStamp } from '../survival/hud';
import { drawText, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { verdictInk } from './hud';
import { T } from './timeline';

/**
 * Spectacle 1 (~2:30): the bull shark's swims up rivers, on two old-chart
 * map cards (everysize's map style). A fin swims up the Amazon from its
 * mouth to Peru while the distance runs to 2,300 mi · 3,700 km; then a
 * second fin climbs the Mississippi to Illinois, "over 1,000 mi · 1,600 km"
 * (the fact-check's softened figure), where a road sign waits. Coastlines
 * and rivers are simplified by hand from the real ones (lon, lat).
 */

type LonLat = readonly [number, number];

const W = 1920;
const H = 1080;

export const SOUTH_AMERICA: MapSpec = {
  lon: [-84, -32], lat: [-56, 13],
  land: [[
    [-92, 16], [-90, 14], [-85, 12], [-83, 10], [-79, 9.2], [-77, 8.5], [-75, 11], [-71.5, 12.4], [-68, 10.6], [-63, 10.7], [-60, 8.5], [-57, 6], [-52, 4.5],
    [-50, 1.8], [-48.5, -1], [-44, -2.5], [-39, -3.5], [-35, -5.5], [-35, -9], [-37.5, -12.5], [-39, -17], [-40, -20.5], [-42, -23], [-46, -24],
    [-48.5, -26], [-48.6, -28.5], [-51, -31], [-53, -33.8], [-56, -34.8], [-57.5, -36], [-57, -38.5], [-62, -39], [-65, -41], [-64.5, -42.5],
    [-67, -45.5], [-66, -47], [-68, -50], [-69, -52], [-71, -54], [-74.5, -52], [-75.5, -47], [-74, -43], [-73.5, -37], [-71.5, -33], [-71.5, -28],
    [-70.5, -23], [-70.3, -18], [-74, -15.5], [-76.3, -13.5], [-78, -10], [-79.8, -7], [-81.2, -5], [-80.3, -2.5], [-80, 0], [-79.5, 1.5],
    [-78.5, 2.6], [-77.5, 4], [-77.4, 6.5], [-79, 8], [-80, 7.5], [-83, 8.5], [-86, 11], [-92, 14],
  ]],
  labels: [
    { at: [-50, -11], text: 'BRAZIL', size: 44 },
    { at: [-75.5, -9.5], text: 'PERU', size: 38 },
    { at: [-38, 3], text: 'Atlantic', size: 34, sea: true },
    { at: [-80, -30], text: 'Pacific', size: 34, sea: true },
  ],
};

/** The Amazon from its mouth up to Iquitos, Peru. */
const AMAZON: readonly LonLat[] = [[-49.8, -0.4], [-52, -1.5], [-55, -2.2], [-58.5, -3.1], [-60, -3.2], [-62.5, -3.5], [-65, -2.9], [-67.5, -3.2], [-70, -3.8], [-72, -4.2], [-73.2, -3.75]];

export const NORTH_AMERICA: MapSpec = {
  lon: [-101, -79], lat: [25.5, 42],
  land: [[
    [-102, 44], [-102, 25], [-97.4, 25], [-97.4, 26], [-97.2, 27.8], [-95, 29.2], [-93.5, 29.7], [-91.5, 29.4], [-89.6, 29], [-89, 29.2], [-89.6, 30.2],
    [-88, 30.4], [-86.5, 30.4], [-85, 29.7], [-84, 30], [-83, 29], [-82.7, 27.8], [-81.8, 26.1], [-80.5, 25.2], [-80, 26.7], [-80.6, 28.5], [-81.3, 30.5],
    [-79, 33], [-78, 44],
  ]],
  labels: [
    { at: [-89.2, 40.4], text: 'ILLINOIS', size: 38 },
    { at: [-90.5, 27], text: 'Gulf of Mexico', size: 34, sea: true },
    { at: [-96, 36], text: 'UNITED STATES', size: 40 },
  ],
};

/** The Mississippi from its mouth up to Alton, Illinois. */
const MISSISSIPPI: readonly LonLat[] = [
  [-89.3, 29.1], [-90.1, 29.95], [-91.2, 30.5], [-91.4, 31.6], [-91.1, 32.4], [-91.2, 33.4], [-90.6, 34.6], [-90.05, 35.15], [-89.6, 36.2], [-89.2, 37],
  [-89.6, 37.5], [-90.2, 38.6], [-90.18, 38.89],
];

const ease = (u: number): number => smooth(Math.max(0, Math.min(1, u)));

/** A point `u` of the way along a polyline (by length), in map px. */
function along(path: readonly Pt[], u: number): Pt {
  const seg = path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y));
  let left = seg.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, u));
  for (let i = 0; i < seg.length; i++) {
    if (left <= seg[i]!) {
      const k = seg[i]! ? left / seg[i]! : 0;
      return { x: path[i]!.x + (path[i + 1]!.x - path[i]!.x) * k, y: path[i]!.y + (path[i + 1]!.y - path[i]!.y) * k };
    }
    left -= seg[i]!;
  }
  return path[path.length - 1]!;
}

function drawRiver(ctx: CanvasRenderingContext2D, pts: readonly Pt[], u: number, alpha: number): Pt {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#5b8fb5';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([14, 10]);
  ctx.strokeStyle = '#c8372d';
  ctx.lineWidth = 6;
  ctx.beginPath();
  const n = 80;
  for (let k = 0; k <= n * u; k++) {
    const p = along(pts, k / n);
    if (k) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
  return along(pts, u);
}

function roadSign(ctx: CanvasRenderingContext2D, x: number, y: number, a: number): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#5a4a32';
  ctx.fillRect(x - 6, y, 12, 120);
  ctx.fillStyle = '#1f7a3e';
  ctx.strokeStyle = '#f4f1e8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(x - 150, y - 80, 300, 90, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawText(ctx, 'WELCOME TO ILLINOIS', { x, y: y - 36, size: 34, maxWidth: 270 }, 700, a, { fill: '#f4f1e8', halo: '#0b3018' });
}

const MAP_RECT: Rect = { x: 110, y: 50, w: 980, h: 980 };

/** The insert, full frame: [from, to) as render.ts places it. */
export const MAPS = { from: T.amazon - 0.9, to: T.saltier - 0.4 } as const;

export function drawMaps(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d4f75');
  g.addColorStop(1, '#0d2740');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const swap = T.another - 0.2;
  const south = t < swap;
  const a = south ? 1 - ease((t - swap + 0.35) / 0.35) : ease((t - swap) / 0.35);
  const spec = south ? SOUTH_AMERICA : NORTH_AMERICA;
  const path = south ? AMAZON : MISSISSIPPI;
  const u = south ? ease((t - T.amazon) / (T.peru + 0.3 - T.amazon)) : ease((t - T.mississippi + 0.4) / (T.illinois + 0.4 - T.mississippi));
  let fin: Pt = { x: 0, y: 0 };
  drawMapCard(ctx, spec, MAP_RECT, t, a, (proj) => {
    fin = drawRiver(ctx, path.map(proj), u, a);
    drawFin(ctx, fin.x, fin.y - 6, 34, a);
  });
  const cx = 1500;
  if (south) {
    const mi = Math.round((2300 * u) / 10) * 10;
    const km = Math.round((3700 * u) / 10) * 10;
    drawText(ctx, 'UP THE AMAZON', { x: cx, y: 300, size: 54, maxWidth: 700 }, 700, a, PAPER_ON_INK);
    drawText(ctx, `${mi.toLocaleString('en-US')} MI · ${km.toLocaleString('en-US')} KM`, { x: cx, y: 420, size: 72, maxWidth: 740 }, 700, a, YELLOW_ON_INK);
    drawText(ctx, 'ALL THE WAY TO PERU', { x: cx, y: 530, size: 46, maxWidth: 700 }, 700, a * ease((t - T.peru) / 0.3), PAPER_ON_INK);
    drawStamp(ctx, 'REPORTED', verdictInk('REPORTED'), cx, 620, 34, t, T.peru + 0.4, a, -0.06);
  } else {
    drawText(ctx, 'UP THE MISSISSIPPI', { x: cx, y: 300, size: 54, maxWidth: 700 }, 700, a, PAPER_ON_INK);
    drawText(ctx, 'OVER 1,000 MI · 1,600 KM', { x: cx, y: 420, size: 66, maxWidth: 740 }, 700, a * ease((t - T.another - 0.6) / 0.3), YELLOW_ON_INK);
    drawText(ctx, 'TO ILLINOIS', { x: cx, y: 530, size: 46, maxWidth: 700 }, 700, a * ease((t - T.illinois) / 0.3), PAPER_ON_INK);
    drawStamp(ctx, 'REPORTED', verdictInk('REPORTED'), cx, 620, 34, t, T.illinois + 0.3, a, -0.06);
    roadSign(ctx, cx, 840, a * ease((t - T.beach + 0.2) / 0.3));
    drawText(ctx, 'NOT EXACTLY THE BEACH', { x: cx, y: 1010, size: 40, maxWidth: 700 }, 700, a * ease((t - T.beach) / 0.3), PAPER_ON_INK);
  }
}
