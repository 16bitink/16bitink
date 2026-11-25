import { INK, type Pt } from '../../../../src/art/pen';
import { curve, dab, path, smoothLoop, softLine, taper } from '../../seal/art/paint';
import { drawEel, eelShadow } from './eel';
import { HAIRS, line } from './fur';
import { EEL_W, mouth, mouthLineOver, NOSTRIL, nose, pad, rimOver, whiskers } from './sealMuzzle';

export { EEL_W, NOSTRIL };

/**
 * A Hawaiian monk seal's face, front-on: a broad round head with no ear flaps,
 * big dark wet eyes set wide apart, a short broad flat muzzle with two slit
 * nostrils on top, short pale whiskers on fat pads; slate grey on the crown
 * fading to a creamy-yellow chin. Painted live like ../../seal/art: washes,
 * soft light and shade, the fur laid in hair by hair, thin interior ink. Own
 * units: the head 400 wide, its middle at 0,0.
 */

export interface FaceLook {
  /** Upper eyelids: 0 wide open .. 1 shut. Deadpan is about 0.42. */
  readonly lid: number;
  /** Eyes shut in a smile, 0 .. 1. */
  readonly happy?: number;
  /** The mouth: -1 drooping .. 1 smiling. */
  readonly smile: number;
  /** Where it looks, -1 (left) .. 1 (right), and down (+). */
  readonly gaze?: number;
  readonly gazeY?: number;
  /** Brows: -1 worried (up in the middle) .. 1 raised. */
  readonly brow?: number;
  /** Whisker sway phase, radians. */
  readonly beat: number;
  /** The nose wrinkled up, winding up a sneeze, 0 .. 1; the mouth open, 0 .. 1. */
  readonly wrinkle?: number;
  readonly open?: number;
  /** How wide the eel's nostril (viewer's right) is stretched, 0 a slit .. 1 round an eel. */
  readonly stretch?: number;
  /** Cross-eyed, 0 .. 1; the irises lit amber so the pupils' aim shows, 0 .. 1; cheeks puffed, 0 .. 1; a lump under the skin (head units). */
  readonly cross?: number;
  readonly amber?: number;
  readonly puff?: number;
  readonly bulge?: { readonly x: number; readonly y: number; readonly size: number };
  readonly lw: number;
}

const HEAD: readonly Pt[] = smoothLoop([
  { x: 0, y: -160 }, { x: 78, y: -145 }, { x: 144, y: -98 }, { x: 186, y: -20 }, { x: 197, y: 66 }, { x: 166, y: 132 }, { x: 92, y: 170 }, { x: 0, y: 180 },
  { x: -92, y: 170 }, { x: -166, y: 132 }, { x: -197, y: 66 }, { x: -186, y: -20 }, { x: -144, y: -98 }, { x: -78, y: -145 },
], 7);

/** The head with its cheeks blown out. */
const puffed = (puff: number): readonly Pt[] => (puff < 0.005 ? HEAD : HEAD.map((p) => {
  const k = puff * Math.exp(-(((p.y - 92) / 62) ** 2));
  return { x: p.x * (1 + 0.17 * k), y: p.y + 6 * puff * Math.max(0, p.y / 180) };
}));

function coat(ctx: CanvasRenderingContext2D, lw: number, puff: number): void {
  const shape = puffed(puff);
  path(ctx, shape);
  const g = ctx.createLinearGradient(-30, -155, 30, 182);
  g.addColorStop(0, '#6f7276');
  g.addColorStop(0.3, '#8d8f90');
  g.addColorStop(0.58, '#a9a498');
  g.addColorStop(0.8, '#cfc29c');
  g.addColorStop(1, '#dccb98');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The big planes: light on the brow from the upper left, the cheeks turning away, the shadow side.
  dab(ctx, -70, -96, 130, '216,220,222', 0.55);
  dab(ctx, 168, 20, 120, '44,42,44', 0.42);
  dab(ctx, -196, 60, 70, '52,50,52', 0.34);
  dab(ctx, 120, -120, 90, '46,48,54', 0.3);
  dab(ctx, -104, 92, 84, '232,220,184', 0.5);
  dab(ctx, 112, 100, 70, '206,190,146', 0.4);
  softLine(ctx, [{ x: -150, y: 150 }, { x: -60, y: 178 }, { x: 60, y: 178 }, { x: 150, y: 150 }], 46, '#5c4a2c', 0.4);
  // The eyes' sockets and the dark bridge between them, down to the nose.
  for (const s of [-1, 1]) dab(ctx, s * 106, -34, 74, '40,38,42', 0.42);
  dab(ctx, 0, -18, 70, '70,68,70', 0.4);
  // The mask's dark "bandit" patch round the muzzle.
  dab(ctx, 0, 60, 128, '58,50,46', 0.42);
  for (const h of HAIRS) line(ctx, [h.a, h.b], h.w, h.light ? '#f0eadb' : '#26242a', h.light ? 0.34 : 0.3);
  // Folds of fat: on the brow, under the eyes, round the cheeks.
  for (const s of [-1, 1]) {
    const folds: readonly (readonly [Pt, Pt, Pt, number])[] = [
      [{ x: s * 60, y: 10 }, { x: s * 98, y: 34 }, { x: s * 146, y: 22 }, 0.5],
      [{ x: s * 134, y: 60 }, { x: s * 168, y: 96 }, { x: s * 132, y: 142 }, 0.45],
      [{ x: s * 158, y: 40 }, { x: s * 186, y: 80 }, { x: s * 164, y: 120 }, 0.35],
      [{ x: s * 20, y: -84 }, { x: s * 62, y: -96 }, { x: s * 108, y: -84 }, 0.3],
    ];
    for (const [a, c, b, alpha] of folds) {
      const pts = curve(a, c, b, 10);
      softLine(ctx, pts, 12, '#2a2422', alpha * 0.8);
      softLine(ctx, pts.map((p) => ({ x: p.x, y: p.y - 7 })), 7, '#f4ecd6', alpha * 0.5);
      taper(ctx, pts, 2.2 * lw, 0.6 * lw, INK, alpha);
    }
    // The ear: only a small hole, no flap.
    dab(ctx, s * 178, -6, 7, '18,14,14', 0.85);
  }
  if (puff > 0.01) {
    for (const s of [-1, 1]) {
      dab(ctx, s * 168 - 16, 70, 60, '250,240,212', 0.38 * puff);
      softLine(ctx, curve({ x: s * 150, y: 150 }, { x: s * 226, y: 130 }, { x: s * 214, y: 60 }, 10), 26, '#3a2c20', 0.5 * puff, 12);
      taper(ctx, curve({ x: s * 138, y: 128 }, { x: s * 122, y: 92 }, { x: s * 142, y: 50 }, 10), 1, 2.6 * lw, INK, 0.7 * puff);
    }
  }
  ctx.restore();
  path(ctx, shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * lw;
  ctx.stroke();
}

/** An eye closed in a smile: the lids meet in an upward arc, the cheek pushed up under it. */
function smilingEye(ctx: CanvasRenderingContext2D, s: 1 | -1, x: number, y: number, o: FaceLook): void {
  dab(ctx, x - 8, y - 14, 46, '196,196,192', 0.5);
  const arc = curve({ x: x - 42, y: y + 16 }, { x, y: y - 40 }, { x: x + 42, y: y + 16 }, 16);
  softLine(ctx, arc.map((p) => ({ x: p.x, y: p.y + 10 })), 20, '#1e1a1c', 0.5);
  softLine(ctx, arc.map((p) => ({ x: p.x, y: p.y - 15 })), 12, '#eeeae0', 0.5);
  line(ctx, arc, 7 * o.lw, INK, 1);
  const cheek = curve({ x: x - 40, y: y + 40 }, { x, y: y + 24 }, { x: x + 40, y: y + 40 }, 10);
  softLine(ctx, cheek, 10, '#231e20', 0.45);
  taper(ctx, cheek, 2 * o.lw, 1 * o.lw, INK, 0.6);
  const brow = curve({ x: x + -s * 46, y: y - 48 }, { x, y: y - 74 }, { x: x + s * 46, y: y - 40 }, 12);
  softLine(ctx, brow, 12, '#231f22', 0.45);
  taper(ctx, brow, 3 * o.lw, 1 * o.lw, INK, 0.65);
  dab(ctx, x - s * 22, y - 84, 17, '226,216,190', 0.6);
}

function eye(ctx: CanvasRenderingContext2D, s: 1 | -1, o: FaceLook): void {
  const { lw } = o;
  const [x, y] = [s * 104, -34];
  const [rx, ry] = [44, 40];
  const happy = o.happy ?? 0;
  if (happy > 0.5) return smilingEye(ctx, s, x, y, o);
  const shut = Math.max(o.lid, happy * 2);
  // Tear-wet fur under the eye.
  softLine(ctx, curve({ x: x - s * 26, y: y + 26 }, { x: x - s * 34, y: y + 54 }, { x: x - s * 30, y: y + 76 }, 8), 16, '#241d1c', 0.4);
  const rim = smoothLoop([{ x: x - rx, y: y + 4 }, { x: x - rx * 0.55, y: y - ry * 0.82 }, { x: x + rx * 0.1, y: y - ry }, { x: x + rx * 0.8, y: y - ry * 0.6 }, { x: x + rx, y: y + 4 }, { x: x + rx * 0.5, y: y + ry * 0.9 }, { x: x - rx * 0.45, y: y + ry * 0.92 }], 6);
  ctx.save();
  path(ctx, rim);
  const [gx, gy] = [(o.gaze ?? 0) * 11 - s * (o.cross ?? 0) * 17, (o.gazeY ?? 0) * 8];
  const g = ctx.createRadialGradient(x + gx, y + 12 + gy, 2, x + gx * 0.6, y, rx * 1.1);
  g.addColorStop(0, '#6a4526');
  g.addColorStop(0.42, '#2c1a10');
  g.addColorStop(0.8, '#0b0706');
  g.addColorStop(1, '#030202');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const amber = o.amber ?? 0;
  if (amber > 0.01) {
    const a = ctx.createRadialGradient(x + gx, y + gy + 4, 12, x, y, rx * 1.05);
    a.addColorStop(0, '#a8713c');
    a.addColorStop(0.6, '#7a4c26');
    a.addColorStop(1, '#2a170c');
    ctx.globalAlpha = amber;
    ctx.fillStyle = a;
    ctx.fillRect(x - rx * 1.2, y - ry * 1.2, rx * 2.4, ry * 2.4);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = amber > 0.01 ? `rgba(0,0,0,${0.8 + 0.2 * amber})` : 'rgba(0,0,0,0.8)';
  ctx.beginPath();
  ctx.ellipse(x + gx, y + 1 + gy, 19, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wet: the sky's window high on the left, a small one low on the right, the bright rim of tears.
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.beginPath();
  ctx.ellipse(x - 13 + gx * 0.7, y + 4 + gy * 0.6, 9.5, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,226,240,0.6)';
  ctx.beginPath();
  ctx.ellipse(x + 14 + gx * 0.7, y + 19 + gy * 0.6, 5, 3.6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  softLine(ctx, curve({ x: x - 30, y: y + 22 }, { x, y: y + 38 }, { x: x + 30, y: y + 21 }, 10), 5, '#d9ecf2', 0.65);
  // The upper lid: a heavy furred fold coming down, lit along its edge.
  const drop = -ry * 1.15 + Math.min(1, shut) * ry * 2.15;
  const edge = curve({ x: x - rx * 1.15, y: y + drop + 5 }, { x, y: y + drop - 4 }, { x: x + rx * 1.15, y: y + drop + 5 }, 12);
  ctx.beginPath();
  ctx.moveTo(x - rx * 1.3, y - ry * 2);
  for (const p of edge) ctx.lineTo(p.x, p.y);
  ctx.lineTo(x + rx * 1.3, y - ry * 2);
  ctx.closePath();
  const lidFill = ctx.createLinearGradient(0, y - ry, 0, y + drop + 8);
  lidFill.addColorStop(0, '#6a696b');
  lidFill.addColorStop(1, '#8f8c88');
  ctx.fillStyle = lidFill;
  ctx.fill();
  softLine(ctx, edge.map((p) => ({ x: p.x, y: p.y - 9 })), 7, '#d8d4cc', 0.45);
  softLine(ctx, edge.map((p) => ({ x: p.x, y: p.y + 5 })), 9, '#000000', 0.6);
  line(ctx, edge, 3.4 * lw, INK, 1);
  ctx.restore();
  path(ctx, rim);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8 * lw;
  ctx.stroke();
  // A crease over the lid, the pale brow spot and its two hairs.
  const brow = o.brow ?? 0;
  const inner = -s;
  const crease = curve({ x: x + inner * 46, y: y - 34 - (brow < 0 ? -brow * 26 : brow * 10) }, { x, y: y - 58 - Math.abs(brow) * 8 }, { x: x - inner * 48, y: y - 26 - Math.max(0, brow) * 12 }, 12);
  softLine(ctx, crease, 13, '#231f22', 0.5);
  taper(ctx, crease, 3.4 * lw, 1 * lw, INK, 0.75);
  softLine(ctx, crease.map((p) => ({ x: p.x, y: p.y - 9 })), 8, '#e8e4da', 0.4);
  dab(ctx, x + inner * 22, y - 72 - Math.abs(brow) * 10, 17, '226,216,190', 0.6);
  for (const k of [0, 1]) taper(ctx, curve({ x: x + inner * (18 + k * 8), y: y - 72 - Math.abs(brow) * 10 }, { x: x + inner * (16 + k * 10), y: y - 96 }, { x: x + inner * (4 + k * 14), y: y - 112 }, 6), 1.2, 0.4, '#f3ecd8', 0.8);
}

/** Something moving under the skin: a round lump, lit on top, its shadow under it. */
function lump(ctx: CanvasRenderingContext2D, b: { readonly x: number; readonly y: number; readonly size: number }, lw: number): void {
  const r = 46 * b.size;
  softLine(ctx, curve({ x: b.x - r * 0.9, y: b.y + r * 0.5 }, { x: b.x + r * 0.1, y: b.y + r * 1.5 }, { x: b.x + r * 1.05, y: b.y + r * 0.3 }, 14), r * 0.7, '#1d1512', 0.8, 14);
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, r, r * 0.92, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.4, r * 0.08, b.x, b.y, r);
  g.addColorStop(0, 'rgba(236,228,210,0.95)');
  g.addColorStop(0.45, 'rgba(176,166,148,0.9)');
  g.addColorStop(0.85, 'rgba(120,110,98,0.75)');
  g.addColorStop(1, 'rgba(90,80,72,0.55)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (const h of HAIRS) if (Math.hypot(h.a.x - b.x, h.a.y - b.y) < r * 1.1) line(ctx, [h.a, h.b], h.w, h.light ? '#f6efe0' : '#26242a', 0.4);
  ctx.restore();
  taper(ctx, curve({ x: b.x - r * 0.96, y: b.y + r * 0.3 }, { x: b.x - r * 0.1, y: b.y + r * 1.42 }, { x: b.x + r * 0.98, y: b.y + r * 0.1 }, 14), 1 * lw, 3.4 * lw, INK, 0.9);
  taper(ctx, curve({ x: b.x - r * 0.98, y: b.y + r * 0.1 }, { x: b.x - r * 0.3, y: b.y - r * 1.36 }, { x: b.x + r * 0.9, y: b.y - r * 0.4 }, 14), 1 * lw, 2 * lw, INK, 0.6);
}

/** The whole face; with an `eel` (its spine in head units, from inside the nostril out) hanging from the nostril. */
export function drawSealFace(ctx: CanvasRenderingContext2D, o: FaceLook, eel?: { readonly spine: readonly Pt[]; readonly slide?: number; readonly headOut?: boolean; readonly alarm?: number }, inMouth?: (ctx: CanvasRenderingContext2D) => void): void {
  coat(ctx, o.lw, o.puff ?? 0);
  eye(ctx, -1, o);
  eye(ctx, 1, o);
  mouth(ctx, o);
  inMouth?.(ctx);
  // Puffed cheeks push the whisker pads out with them.
  const k = 1 + 0.09 * (o.puff ?? 0);
  ctx.save();
  ctx.translate(0, 72);
  ctx.scale(k, k);
  ctx.translate(0, -72);
  pad(ctx, -1, o);
  pad(ctx, 1, o);
  if (!(o.open ?? 0)) mouthLineOver(ctx, o);
  ctx.restore();
  if (o.bulge && o.bulge.size > 0.01) lump(ctx, o.bulge, o.lw);
  nose(ctx, o);
  whiskers(ctx, o);
  if (eel) {
    eelShadow(ctx, eel.spine, EEL_W, 16, 10, 0.5);
    drawEel(ctx, eel.spine, { width: EEL_W, ink: 2.6 * o.lw, slide: eel.slide ?? 0, head: !!eel.headOut, cut: !!eel.headOut, alarm: eel.alarm ?? 0 });
    // The nostril's shadow on the eel's root.
    softLine(ctx, [{ x: NOSTRIL.x - 18, y: NOSTRIL.y - 8 }, { x: NOSTRIL.x + 4, y: NOSTRIL.y - 12 }, { x: NOSTRIL.x + 24, y: NOSTRIL.y - 4 }], 22, '#1a0f0a', 0.75);
    rimOver(ctx, o.lw);
  }
}
