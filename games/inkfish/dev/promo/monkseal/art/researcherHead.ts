import { INK, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { curve, dab, mix, path, smoothLoop, softLine, taper } from '../../seal/art/paint';
import type { Person } from './researcher';

/** The researcher's head: the face, the cap, the hair. Own units: the head 100 tall, at 0,0. */

export const stroke = (ctx: CanvasRenderingContext2D, w: number, c: string = INK): void => {
  ctx.strokeStyle = c;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
};

const SKULL = smoothLoop([
  { x: 0, y: -52 }, { x: 28, y: -47 }, { x: 39, y: -22 }, { x: 38, y: 8 }, { x: 28, y: 36 }, { x: 0, y: 50 }, { x: -28, y: 36 }, { x: -38, y: 8 }, { x: -39, y: -22 }, { x: -28, y: -47 },
], 5);

function eye(ctx: CanvasRenderingContext2D, x: number, p: Person): void {
  const y = -7;
  const wide = p.mood === 'oh' ? 1 : 0;
  const lid = Math.max(p.blink ?? 0, p.mood === 'strain' ? 0.45 : 0);
  const [rx, ry] = [9.2, (4.4 + 2.4 * wide) * (1 - 0.8 * lid)];
  const shape = [...curve({ x: x - rx, y }, { x, y: y - ry * 2 }, { x: x + rx, y: y + 0.6 }, 8), ...curve({ x: x + rx, y: y + 0.6 }, { x, y: y + ry * 1.5 }, { x: x - rx, y }, 8)];
  path(ctx, shape);
  ctx.fillStyle = '#f8f3e8';
  ctx.fill();
  ctx.save();
  ctx.clip();
  const [ix, iy] = [x + p.turn * 3.4, y + (p.down ?? 0) * 2.4];
  for (const [r, c] of [[5.2, '#5a3a22'], [2.6, '#0a0706']] as const) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(ix, iy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.arc(ix - 1.6, iy - 1.8, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  taper(ctx, shape.slice(0, 9), 2.2, 1.2, '#1c100c', 1);
  softLine(ctx, shape.slice(9).map((q) => ({ x: q.x, y: q.y + 1 })), 1.4, '#7a4f3a', 0.5, 2);
}

export function face(ctx: CanvasRenderingContext2D, p: Person): void {
  const dark = mix(p.skin, '#4a2412', 0.5);
  const light = mix(p.skin, '#fff4e4', 0.45);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 39 - p.turn * 4, -2, 6, 12, s * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = s < 0 ? p.skin : dark;
    ctx.fill();
    stroke(ctx, 1.1);
  }
  path(ctx, SKULL);
  const g = ctx.createRadialGradient(-12, -16, 4, 0, 0, 62);
  g.addColorStop(0, light);
  g.addColorStop(0.5, p.skin);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, 30, 6, 30, '90,44,24', 0.36);
  for (const s of [-1, 1]) dab(ctx, s * 17 + p.turn * 6, -10, 12, '110,62,40', 0.3);
  for (const s of [-1, 1]) dab(ctx, s * 23 + p.turn * 5, 14, 13, '214,96,80', 0.34);
  softLine(ctx, [{ x: -38, y: -28 }, { x: 0, y: -24 }, { x: 38, y: -28 }], 14, '#3a1c10', 0.5);
  if (p.style === 'beard') {
    const rng = createRng(9);
    softLine(ctx, [{ x: -36, y: 8 }, { x: -26, y: 34 }, { x: 0, y: 48 }, { x: 26, y: 34 }, { x: 36, y: 8 }], 24, p.hair, 0.8);
    for (let i = 0; i < 160; i++) {
      const a = Math.PI * (0.06 + 0.88 * rng());
      const r = 0.76 + 0.26 * rng();
      const b = { x: Math.cos(a) * 38 * r, y: 8 + Math.sin(a) * 42 * r };
      taper(ctx, [b, { x: b.x * 1.04, y: b.y + 5 }], 1.1, 0.3, rng() < 0.6 ? mix(p.hair, '#000000', 0.35) : mix(p.hair, '#ffffff', 0.3), 0.75);
    }
  }
  ctx.restore();
  path(ctx, SKULL);
  stroke(ctx, 1.3);
  const t = p.turn * 8;
  const dn = (p.down ?? 0) * 5;
  ctx.save();
  ctx.translate(t, dn);
  eye(ctx, -17, p);
  eye(ctx, 17, p);
  // Brows.
  const lift = p.mood === 'oh' ? 7 : 0;
  for (const s of [-1, 1]) {
    const tiltIn = p.mood === 'strain' ? 6 : p.mood === 'smirk' && s > 0 ? -7 : 0;
    taper(ctx, curve({ x: s * 6, y: -17 - lift + tiltIn }, { x: s * 17, y: -26 - lift + tiltIn * 0.2 }, { x: s * 29, y: -18 - lift - tiltIn * 0.3 }, 8), 4.6, 1.6, mix(p.hair, '#000000', 0.25), 0.95);
  }
  // Nose.
  softLine(ctx, curve({ x: 4 + t * 0.3, y: -6 }, { x: 8 + t * 0.5, y: 6 }, { x: 8 + t * 0.4, y: 13 }, 6), 5, '#7a4028', 0.35);
  softLine(ctx, curve({ x: -1, y: -4 }, { x: -1 + t * 0.3, y: 5 }, { x: t * 0.3, y: 11 }, 6), 3, '#fff0e0', 0.5);
  ctx.beginPath();
  ctx.moveTo(-8, 13);
  ctx.quadraticCurveTo(-9, 18, -4, 17.5);
  ctx.quadraticCurveTo(t * 0.4, 21, 4, 17.5);
  ctx.quadraticCurveTo(9, 18, 8, 13);
  stroke(ctx, 1.2);
  mouth(ctx, p);
  ctx.restore();
}

function mouth(ctx: CanvasRenderingContext2D, p: Person): void {
  if (p.mood === 'oh') {
    ctx.beginPath();
    ctx.ellipse(0, 32, 7.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3a1416';
    ctx.fill();
    stroke(ctx, 2, '#8c4a42');
  } else if (p.mood === 'strain') {
    ctx.beginPath();
    ctx.roundRect(-14, 25, 28, 11, 5);
    ctx.fillStyle = '#fbf6ea';
    ctx.fill();
    stroke(ctx, 1.8, '#6a2a24');
    ctx.beginPath();
    for (const x of [-7, 0, 7]) { ctx.moveTo(x, 26); ctx.lineTo(x, 35); }
    ctx.moveTo(-13, 30.5);
    ctx.lineTo(13, 30.5);
    stroke(ctx, 0.7, '#9a7a6a');
  } else {
    const up = p.mood === 'smirk' ? 5 : 0;
    const lip = curve({ x: -13, y: 27 + up * 0.4 }, { x: 0, y: 38 - up }, { x: 14, y: 27 - up }, 8);
    softLine(ctx, lip.map((q) => ({ x: q.x, y: q.y + 2 })), 5, '#b5655c', 0.8, 3);
    taper(ctx, lip, 1.8, 1.8, '#3a1a1a', 1);
  }
}

export function cap(ctx: CanvasRenderingContext2D, p: Person): void {
  const dark = mix(p.cap, '#000000', 0.45);
  const crown = smoothLoop([{ x: -41, y: -24 }, { x: -40, y: -50 }, { x: -20, y: -67 }, { x: 4, y: -70 }, { x: 28, y: -64 }, { x: 42, y: -46 }, { x: 41, y: -24 }, { x: 0, y: -31 }], 5);
  path(ctx, crown);
  const g = ctx.createLinearGradient(-40, -70, 44, -20);
  g.addColorStop(0, mix(p.cap, '#ffffff', 0.4));
  g.addColorStop(0.5, p.cap);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  stroke(ctx, 1.4);
  for (const x of [-16, 14]) softLine(ctx, curve({ x: x * 0.2, y: -69 }, { x, y: -54 }, { x: x * 1.1, y: -30 }, 6), 1.2, dark, 0.8, 2);
  // The peak, coming forward over the brow.
  const t = p.turn * 13;
  const peak = smoothLoop([{ x: -38 + t * 0.4, y: -30 }, { x: 0 + t * 0.6, y: -36 }, { x: 38 + t * 0.4, y: -30 }, { x: 33 + t * 1.5, y: -19 }, { x: t * 1.8, y: -13 }, { x: -33 + t * 1.5, y: -19 }], 5);
  path(ctx, peak);
  const b = ctx.createLinearGradient(0, -36, 0, -14);
  b.addColorStop(0, mix(p.cap, '#ffffff', 0.25));
  b.addColorStop(1, dark);
  ctx.fillStyle = b;
  ctx.fill();
  stroke(ctx, 1.4);
}

export function ponytail(ctx: CanvasRenderingContext2D, p: Person): void {
  const s = p.turn > 0 ? -1 : 1;
  const shape = smoothLoop([{ x: s * 26, y: -40 }, { x: s * 52, y: -24 }, { x: s * 62, y: 20 }, { x: s * 54, y: 78 }, { x: s * 44, y: 60 }, { x: s * 40, y: 10 }], 5);
  path(ctx, shape);
  ctx.fillStyle = p.hair;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 12; i++) taper(ctx, curve({ x: s * (28 + i), y: -38 }, { x: s * (46 + i), y: 0 }, { x: s * (46 + i * 0.6), y: 70 }, 6), 1.6, 0.5, i % 2 ? mix(p.hair, '#ffffff', 0.3) : mix(p.hair, '#000000', 0.4), 0.7);
  ctx.restore();
  path(ctx, shape);
  stroke(ctx, 1.3);
}
