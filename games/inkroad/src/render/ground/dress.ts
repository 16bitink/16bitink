import { lotRect } from '../../city/geometry';
import type { Pt } from '../../sim/types';
import { offsetLine, type Box } from '../geom';
import { fbm } from '../noise';
import { linePath } from '../pen';
import { clearIn, spotsIn, type Clear } from './free';
import { paintBeaches } from './beachGround';
import { dressStyle } from './dressStyles';
import type { LotScene } from './lotsGround';
import { kerbOf, type RoadScene, type RoadShape } from './roadShape';
import { fieldAt } from './terrain';

/**
 * The flat dressing between the blocks: washes of colour, hedges, beds, ponds,
 * dunes and terraces. Painted into the baked ground under the lots and roads
 * (so a new building or road simply covers it), the same from the map seed,
 * and free per frame.
 */
export interface Pen {
  readonly g: CanvasRenderingContext2D;
  readonly rows: readonly string[];
  readonly box: Box;
  readonly clear: Clear;
  readonly lots: LotScene;
  /** Dry land at a point (not sea, not rock). */
  readonly dry: (p: Pt) => boolean;
}

const BLOOM_TINT: Readonly<Record<string, readonly [string, string]>> = {
  gulf: ['196,140,80', '255,244,214'], oldtown: ['150,150,70', '232,226,170'], islands: ['58,110,52', '210,226,140'],
  hills: ['170,126,64', '226,214,160'], rivers: ['176,112,54', '218,196,130'],
};

export function paintDress(g: CanvasRenderingContext2D, style: string, rows: readonly string[], net: RoadScene, lots: LotScene, box: Box): void {
  const clear = clearIn(net, lots, box);
  const dry = (p: Pt): boolean => fieldAt(rows, '~', p.x, p.y) < 0.12 && fieldAt(rows, '#', p.x, p.y) < 0.4;
  const pen: Pen = { g, rows, box, clear, lots, dry };
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  blooms(pen, BLOOM_TINT[style] ?? BLOOM_TINT.gulf!);
  dressStyle(style, pen);
  paintBeaches(pen);
  sharedHedges(pen);
  g.restore();
}

/** Large soft patches of warmer and cooler colour: watercolour blooms. */
function blooms(p: Pen, tint: readonly [string, string]): void {
  const { g } = p;
  for (const s of spotsIn(p.box, 150, 301)) {
    const k = fbm(s.x / 420, s.y / 420, 3, 81);
    if (k < 0.45 || !p.dry(s)) continue;
    const warm = s.a > 0.5;
    const r = 70 + 90 * s.b;
    const grad = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    const a = (k - 0.4) * 0.34;
    grad.addColorStop(0, `rgba(${warm ? tint[0] : tint[1]},${a})`);
    grad.addColorStop(1, `rgba(${warm ? tint[0] : tint[1]},0)`);
    g.fillStyle = grad;
    g.fillRect(s.x - r, s.y - r, r * 2, r * 2);
  }
}

/** A hedge along the gap between two neighbouring plots, so the lots read as one street. */
function sharedHedges(p: Pen): void {
  const homes = p.lots.lots.filter((l) => l.level > 0 && l.kind === 'home').map((l) => lotRect(l));
  const { g } = p;
  g.strokeStyle = 'rgba(64,92,44,0.55)';
  g.lineWidth = 4.5;
  for (const a of homes) {
    for (const b of homes) {
      if (a === b) continue;
      const gapX = b.x - (a.x + a.w);
      const gapY = b.y - (a.y + a.h);
      const y0 = Math.max(a.y, b.y) + 8;
      const y1 = Math.min(a.y + a.h, b.y + b.h) - 8;
      const x0 = Math.max(a.x, b.x) + 8;
      const x1 = Math.min(a.x + a.w, b.x + b.w) - 8;
      if (gapX >= 0 && gapX <= 20) hedge(p, a.x + a.w + gapX / 2, y0, y1, true);
      if (gapY >= 0 && gapY <= 20) hedge(p, a.y + a.h + gapY / 2, x0, x1, false);
    }
  }
}

function hedge(p: Pen, at: number, from: number, to: number, vertical: boolean): void {
  if (to - from < 12) return;
  const { g } = p;
  const mid = vertical ? { x: at, y: (from + to) / 2 } : { x: (from + to) / 2, y: at };
  if (mid.x < p.box.x0 - 90 || mid.x > p.box.x1 + 90 || mid.y < p.box.y0 - 90 || mid.y > p.box.y1 + 90) return;
  g.beginPath();
  if (vertical) { g.moveTo(at, from); g.lineTo(at, to); } else { g.moveTo(from, at); g.lineTo(to, at); }
  g.stroke();
}

/** Sidewalks with a slight change of tone along them. */
export function paintWalkTone(g: CanvasRenderingContext2D, roads: readonly RoadShape[]): void {
  g.save();
  g.lineCap = 'butt';
  for (const r of roads) {
    if (r.inner.length < 2) continue;
    const k = kerbOf(r.road);
    for (const side of [-1, 1]) {
      const line = linePath(offsetLine(r.inner, side * (r.half + k * 0.55)));
      g.lineWidth = Math.max(1, k * 0.8);
      g.setLineDash([46, 31, 19, 26]);
      g.strokeStyle = 'rgba(255,250,236,0.2)';
      g.stroke(line);
      g.setLineDash([23, 50, 37, 21]);
      g.strokeStyle = 'rgba(120,98,70,0.12)';
      g.stroke(line);
    }
  }
  g.setLineDash([]);
  g.restore();
}
