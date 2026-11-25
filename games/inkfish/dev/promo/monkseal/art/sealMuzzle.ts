import { INK, type Pt } from '../../../../src/art/pen';
import { curve, dab, path, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { HAIRS, line } from './fur';
import type { FaceLook } from './sealFace';

/** The monk seal's muzzle: the whisker pads, the flat nose with its nostrils, the mouth, the whiskers. In the face's units. */

/** The eel's nostril: its middle and radii when stretched. */
export const NOSTRIL: Pt = { x: 42, y: 20 };
export const EEL_W = 50;

/** One whisker pad: fat, dark at the nose and paler at its edge, rows of whisker pits. */
export function pad(ctx: CanvasRenderingContext2D, s: 1 | -1, o: FaceLook): void {
  const shape = smoothLoop([
    { x: s * 2, y: 44 }, { x: s * 30, y: 26 }, { x: s * 84, y: 30 }, { x: s * 124, y: 62 }, { x: s * 122, y: 102 }, { x: s * 84, y: 124 }, { x: s * 34, y: 120 }, { x: s * 2, y: 100 },
  ], 6);
  path(ctx, shape);
  const g = ctx.createRadialGradient(s * 34, 36, 8, s * 56, 70, 92);
  g.addColorStop(0, '#4d4644');
  g.addColorStop(0.55, '#6e645c');
  g.addColorStop(0.85, '#a0937c');
  g.addColorStop(1, '#8a7c66');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, s * 70 - 16, 48, 44, '226,214,190', 0.42);
  softLine(ctx, [{ x: s * 10, y: 122 }, { x: s * 70, y: 128 }, { x: s * 124, y: 104 }], 26, '#2a201c', 0.5);
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 5; i++) dab(ctx, s * (44 + i * 16 + (r % 2) * 7), 56 + r * 15 + i * 1.6, 5, '20,14,12', 0.75);
  }
  for (const h of HAIRS.slice(0, 320)) {
    const a = { x: s * (12 + Math.abs(h.a.x) * 0.58), y: 70 + h.a.y * 0.3 };
    line(ctx, [a, { x: a.x + s * 10, y: a.y + 5 }], h.w * 0.9, h.light ? '#f0e6cf' : '#1c1614', 0.24);
  }
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.9 * o.lw;
  ctx.globalAlpha = 0.75;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** The flat nose on top of the muzzle, a nostril either side: slits slanting in, or the eel's stretched hole. */
export function nose(ctx: CanvasRenderingContext2D, o: FaceLook): void {
  const wr = o.wrinkle ?? 0;
  const st = o.stretch ?? 0;
  const bulge = 10 * st;
  const plate = smoothLoop([
    { x: -62, y: 10 - 6 * wr }, { x: -34, y: -16 - 8 * wr }, { x: 0, y: -20 - 8 * wr }, { x: 40, y: -18 - 8 * wr - bulge }, { x: 70 + bulge, y: 6 - 6 * wr }, { x: 70 + bulge, y: 40 }, { x: 34, y: 60 }, { x: 0, y: 64 }, { x: -32, y: 56 }, { x: -60, y: 36 },
  ], 6);
  path(ctx, plate);
  const g = ctx.createLinearGradient(-20, -24, 14, 64);
  g.addColorStop(0, '#8a8580');
  g.addColorStop(0.5, '#676059');
  g.addColorStop(1, '#443c38');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, -22, -8, 34, '214,214,212', 0.5);
  dab(ctx, 0, 62, 34, '16,12,11', 0.4);
  if (st > 0) dab(ctx, NOSTRIL.x - 12, NOSTRIL.y - 30, 26, '220,214,206', 0.5 * st);
  ctx.restore();
  path(ctx, plate);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * o.lw;
  ctx.globalAlpha = 0.32;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // The wrinkles of a sneeze coming.
  for (let i = 0; i < 3 && wr > 0.05; i++) {
    const y = -30 - i * 13;
    softLine(ctx, curve({ x: -38 + i * 5, y: y + 8 }, { x: 0, y: y - 10 }, { x: 38 - i * 5, y: y + 8 }, 8), 7, '#1f1a1a', 0.5 * wr);
    taper(ctx, curve({ x: -38 + i * 5, y: y + 8 }, { x: 0, y: y - 10 }, { x: 38 - i * 5, y: y + 8 }, 8), 2.6, 2.6, INK, 0.6 * wr);
  }
  // The free nostril: a long dark slit, slanting down and in, with a wet lit rim.
  const slit = (s: 1 | -1): void => {
    const fat = 6 + 8 * wr;
    const sh = smoothLoop([{ x: s * 52, y: 2 }, { x: s * 44 + s * fat * 0.5, y: 22 }, { x: s * 22, y: 38 }, { x: s * 30 - s * fat * 0.4, y: 20 - fat * 0.5 }], 6);
    path(ctx, sh);
    ctx.fillStyle = '#0a0606';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8 * o.lw;
    ctx.stroke();
    softLine(ctx, [{ x: s * 58, y: -3 }, { x: s * 44, y: -4 }, { x: s * 30, y: 8 }], 6, '#e0dcd6', 0.45);
  };
  slit(-1);
  if (st < 0.05) slit(1);
  else {
    ctx.beginPath();
    ctx.ellipse(NOSTRIL.x, NOSTRIL.y, 14 + 18 * st, 18 + 9 * st, 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#080404';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2 * o.lw;
    ctx.stroke();
    softLine(ctx, Array.from({ length: 10 }, (_, i) => ({ x: NOSTRIL.x + (34 + 2 * st) * Math.cos(Math.PI * (0.05 + i * 0.1)), y: NOSTRIL.y + 2 + 30 * Math.sin(Math.PI * (0.05 + i * 0.1)) })), 8, '#8d8078', 0.6);
  }
}

export function mouth(ctx: CanvasRenderingContext2D, o: FaceLook): void {
  const { lw, smile } = o;
  const open = o.open ?? 0;
  const cy = 112 - 22 * smile;
  if (open > 0.02) {
    const h = 20 + 46 * open;
    const shape = smoothLoop([{ x: -78, y: 112 }, { x: -30, y: 106 }, { x: 0, y: 102 }, { x: 30, y: 106 }, { x: 78, y: 112 }, { x: 56, y: 112 + h * 0.8 }, { x: 0, y: 112 + h }, { x: -56, y: 112 + h * 0.8 }], 6);
    path(ctx, shape);
    ctx.fillStyle = '#2a1014';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#c8737f';
    ctx.beginPath();
    ctx.ellipse(0, 118 + h, 44, h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    dab(ctx, -10, 112 + h * 0.8, 22, '255,200,206', 0.4);
    ctx.restore();
    path(ctx, shape);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4 * lw;
    ctx.stroke();
    return;
  }
  // The lower lip's soft roll, then the mouth's line from under the nose out to its corners.
  softLine(ctx, curve({ x: -70, y: 138 }, { x: 0, y: 152 }, { x: 70, y: 138 }, 10), 22, '#e8dcb4', 0.7);
  for (const s of [-1, 1]) {
    const pts = [...curve({ x: 0, y: 106 }, { x: s * 26, y: 132 }, { x: s * 70, y: 126 + 2 * smile }, 8), ...curve({ x: s * 70, y: 126 + 2 * smile }, { x: s * 108, y: 122 }, { x: s * (122 + 6 * Math.abs(smile)), y: cy + 6 }, 8)];
    softLine(ctx, pts.map((p) => ({ x: p.x, y: p.y + 7 })), 14, '#33271f', 0.5);
    line(ctx, pts, 3.4 * lw);
    const corner = { x: s * (122 + 6 * Math.abs(smile)), y: cy + 6 };
    softLine(ctx, [{ x: corner.x - s * 2, y: corner.y - 8 }, { x: corner.x + s * 6, y: corner.y + 8 }], 10, '#2a201c', 0.5);
    taper(ctx, curve({ x: corner.x - s * 4, y: corner.y - 9 }, { x: corner.x + s * 7, y: corner.y }, { x: corner.x + s * 2, y: corner.y + 12 }, 6), 2 * lw, 1 * lw, INK, 0.8);
  }
  line(ctx, [{ x: 0, y: 62 }, { x: -1, y: 106 }], 2.4 * lw);
}

export function whiskers(ctx: CanvasRenderingContext2D, o: FaceLook): void {
  for (const s of [-1, 1] as const) {
    for (let i = 0; i < 9; i++) {
      const row = i % 3;
      const base = { x: s * (66 + Math.floor(i / 3) * 19 + row * 4), y: 60 + row * 18 + Math.floor(i / 3) * 4 };
      const a = 0.12 + row * 0.22 + Math.floor(i / 3) * 0.04 + 0.04 * Math.sin(o.beat + i) - 0.3 * (o.wrinkle ?? 0);
      const len = 62 + (i % 4) * 9;
      const tip = { x: base.x + s * Math.cos(a) * len, y: base.y + Math.sin(a) * len + 8 };
      const pts = curve(base, { x: base.x + s * Math.cos(a) * len * 0.55, y: base.y + Math.sin(a) * len * 0.4 - 5 }, tip, 10);
      taper(ctx, pts.map((p) => ({ x: p.x + 0.8, y: p.y + 1.3 })), 2.6, 0.6, '#191210', 0.4);
      taper(ctx, pts, 2.1, 0.5, '#fbf5e4', 0.97);
      dab(ctx, base.x, base.y, 5, '20,14,12', 0.9);
    }
  }
}

/** The flared skin over the eel's root: drawn after the eel, so it comes OUT of the nostril. */
export function rimOver(ctx: CanvasRenderingContext2D, lw: number): void {
  const { x, y } = NOSTRIL;
  const inner = Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1.06 + (i / 12) * 0.92); return { x: x + 33 * Math.cos(a) + 1, y: y + 3 + 22 * Math.sin(a) }; });
  const outer = Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1.0 + (i / 12) * 1.02); const k = Math.sin((i / 12) * Math.PI) ** 0.6; return { x: x + (33 + 12 * k) * Math.cos(a), y: y + 3 + (22 + 23 * k) * Math.sin(a) }; });
  const shape = [...inner, ...[...outer].reverse()];
  path(ctx, shape);
  const g = ctx.createLinearGradient(x - 20, y - 40, x + 16, y + 6);
  g.addColorStop(0, '#9b938d');
  g.addColorStop(0.55, '#645c58');
  g.addColorStop(1, '#3a3331');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  softLine(ctx, outer.slice(2, 9).map((p) => ({ x: p.x + 3, y: p.y + 9 })), 10, '#efe9e0', 0.55);
  ctx.restore();
  line(ctx, inner, 3 * lw);
  softLine(ctx, outer.slice(2, 11), 2.4 * lw, INK, 0.7, 2);
}

/** The mouth's line again along the pads' lower edge, so the smile reads over them. */
export function mouthLineOver(ctx: CanvasRenderingContext2D, o: FaceLook): void {
  line(ctx, [{ x: 0, y: 60 }, { x: -1, y: 106 }], 2.2 * o.lw, INK, 0.8);
  // A smile pulls the corners up past the pads into the cheeks.
  if (o.smile <= 0.1) return;
  for (const s of [-1, 1]) {
    const k = o.smile;
    const pts = curve({ x: s * 62, y: 127 }, { x: s * 128, y: 132 }, { x: s * (128 + 24 * k), y: 112 - 34 * k }, 12);
    softLine(ctx, pts.map((p) => ({ x: p.x, y: p.y + 6 })), 12, '#33271f', 0.5 * k);
    line(ctx, pts, 3.6 * o.lw, INK, k);
    const end = pts[pts.length - 1]!;
    const dimple = curve({ x: end.x - s * 14, y: end.y - 7 }, { x: end.x + s * 4, y: end.y - 5 }, { x: end.x + s * 10, y: end.y + 12 }, 8);
    softLine(ctx, dimple, 10, '#2a201c', 0.5 * k);
    taper(ctx, dimple, 2.2 * o.lw, 1 * o.lw, INK, 0.9 * k);
  }
}
