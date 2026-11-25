import { lineLength, pointAt } from '../geom';
import { INK } from '../style';
import type { RoadShape } from './roadShape';

/**
 * Cross Rivers: roads wear out. By condition a road shows hairline cracks,
 * then darker patches of repair, then potholes. Placed from the road's id, so
 * the same road always wears the same way.
 */
export const SOUND = 0.78;
const CRACK_PER_PX = 0.02;
const PATCH_PER_PX = 0.01;
const HOLE_BELOW = 0.45;
const MARGIN = 14;

const rng = (seed: number): (() => number) => {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const bucket = (condition: number | undefined): number => (condition === undefined ? 8 : Math.round(condition * 8));

export function paintWorn(g: CanvasRenderingContext2D, r: RoadShape): void {
  const cond = r.road.condition;
  if (cond === undefined || cond >= SOUND || r.road.flyover || r.inner.length < 2) return;
  const len = lineLength(r.inner);
  if (len < MARGIN * 3) return;
  const bad = (SOUND - cond) / SOUND;
  const next = rng(r.road.id + 11);
  const at = (): { x: number; y: number; a: number; side: number } => {
    const p = pointAt(r.inner, MARGIN + next() * (len - MARGIN * 2));
    return { ...p, side: (next() * 2 - 1) * (r.half - 3) };
  };
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = Math.round(len * PATCH_PER_PX * bad * 2); i > 0; i--) patch(g, at(), next);
  for (let i = Math.round(len * CRACK_PER_PX * bad * 3); i > 0; i--) crack(g, at(), next);
  if (cond < HOLE_BELOW) for (let i = Math.round(len * PATCH_PER_PX * (HOLE_BELOW - cond) * 3); i > 0; i--) hole(g, at(), next);
  g.restore();
}

type Spot = { x: number; y: number; a: number; side: number };
const place = (g: CanvasRenderingContext2D, s: Spot): void => {
  g.translate(s.x - Math.sin(s.a) * s.side, s.y + Math.cos(s.a) * s.side);
  g.rotate(s.a);
};

function patch(g: CanvasRenderingContext2D, s: Spot, next: () => number): void {
  const w = 9 + next() * 14;
  const h = 4 + next() * 5;
  g.save();
  place(g, s);
  g.fillStyle = 'rgba(38,34,44,0.4)';
  g.strokeStyle = 'rgba(30,26,34,0.45)';
  g.lineWidth = 0.7;
  g.fillRect(-w / 2, -h / 2, w, h);
  g.strokeRect(-w / 2, -h / 2, w, h);
  g.restore();
}

function crack(g: CanvasRenderingContext2D, s: Spot, next: () => number): void {
  g.save();
  place(g, s);
  g.strokeStyle = INK;
  g.globalAlpha = 0.7;
  g.lineWidth = 0.9;
  g.beginPath();
  let x = 0;
  let y = 0;
  g.moveTo(x, y);
  for (let i = 0; i < 4; i++) {
    x += 3 + next() * 4;
    y += (next() - 0.5) * 6;
    g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
}

function hole(g: CanvasRenderingContext2D, s: Spot, next: () => number): void {
  g.save();
  place(g, s);
  g.fillStyle = 'rgba(22,18,26,0.7)';
  g.strokeStyle = 'rgba(236,228,210,0.5)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.ellipse(0, 0, 3 + next() * 2.5, 2.2 + next() * 1.5, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}
