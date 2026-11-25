import { INK, Pen } from '../../../src/art/pen';
import { type Pt, spline } from '../octopus/geom';
import { drawTube, type Frame, glow, type Light, poly, type Ramp, wash } from './paint';

/** The keeper: an invented man with a grey-flecked beard, a plain cap and a teal polo, painted. */

export const DAY: Light = { key: [-0.55, -0.6, 0.65], ambient: 0.34, rim: [0.8, -0.3, 0.1], rimColour: [255, 226, 176], rimK: 0.7 };
const FLESH: Ramp = [[92, 44, 28], [150, 84, 54], [204, 138, 96], [230, 176, 132], [248, 212, 172], [255, 236, 210]];
const CLOTH: Ramp = [[6, 30, 40], [14, 60, 74], [28, 98, 112], [58, 142, 152], [132, 198, 200]];
const TROUSER: Ramp = [[14, 18, 30], [30, 38, 56], [52, 64, 88], [90, 106, 130], [150, 164, 182]];
const RUBBER: Ramp = [[8, 12, 10], [22, 34, 28], [44, 64, 52], [92, 118, 98], [170, 190, 170]];
const WOOD: Ramp = [[70, 40, 16], [120, 74, 34], [180, 122, 64], [220, 170, 104], [246, 214, 158]];

export interface Face {
  /** Which way the head's turned: -1 (left) .. 1 (right). */
  readonly yaw: number;
  readonly look: Pt;
  /** 0 level .. 1 raised in wonder. */
  readonly brow: number;
  /** 0 shut .. 1 jaw dropped. */
  readonly open: number;
  /** Mouth corners: -1 down (a shrug) .. 1 a smile. */
  readonly smile: number;
  readonly lid: number;
}

/** Head centred on `at`, 280 × k px from crown to chin. */
export function drawHead(ctx: CanvasRenderingContext2D, at: Pt, k: number, tilt: number, f: Face, boil: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(tilt);
  ctx.scale(k, k);
  const pen = new Pen(ctx, 151 + (boil % 3) * 977, 0.8);
  const y = f.yaw * 24;
  const jaw = f.open * 26;
  const half: Pt[] = [{ x: 0, y: -140 }, { x: 60, y: -130 }, { x: 96, y: -84 }, { x: 103, y: -20 }, { x: 98, y: 38 }, { x: 86, y: 84 + jaw * 0.5 }, { x: 58, y: 122 + jaw }, { x: 22, y: 142 + jaw }];
  const face = spline([...half.map((p) => ({ x: p.x + f.yaw * 4, y: p.y })), ...[...half].reverse().map((p) => ({ x: -p.x + f.yaw * 4, y: p.y }))], 5);
  // Ears.
  for (const s of [-1, 1]) {
    const ex = s * 104 - f.yaw * 14;
    const ear = Array.from({ length: 21 }, (_, i) => ({ x: ex + Math.cos((i / 20) * 6.283) * 19, y: 4 + Math.sin((i / 20) * 6.283) * 35 }));
    poly(ctx, ear, wash(ctx, ex - 19, 0, ex + 19, 0, [[0, '#e8b48c'], [1, '#b06a48']]));
    pen.stroke(ear, 3.4, INK, 0.95, false);
    pen.hair([{ x: ex + s * 6, y: -16 }, { x: ex + s * 2, y: 4 }, { x: ex + s * 5, y: 22 }], 2.4, '#7a3d26', 0.7);
  }
  const g = ctx.createRadialGradient(-34 + y, -30, 12, 4, 10, 168);
  g.addColorStop(0, '#fbdcb8');
  g.addColorStop(0.4, '#eab98e');
  g.addColorStop(0.75, '#c98a60');
  g.addColorStop(1, '#8c4f33');
  poly(ctx, face, g);
  ctx.save();
  ctx.beginPath();
  face.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.clip();
  glow(ctx, -50 + y, 34, 38, 28, [226, 110, 84], 0.42);
  glow(ctx, 56 + y, 36, 36, 28, [210, 98, 74], 0.4);
  // The shade side, hatched; the cap's shadow on the brow.
  pen.hatch([{ x: 58 + y, y: -120 }, { x: 120, y: -120 }, { x: 120, y: 170 }, { x: 40 + y, y: 170 }], 8, 1.05, 1.2, { color: '#6b3320', alpha: 0.3 });
  ctx.fillStyle = wash(ctx, 0, -82, 0, -34, [[0, 'rgba(70,28,20,0.62)'], [1, 'rgba(70,28,20,0)']]);
  ctx.fillRect(-130, -82, 260, 50);
  ctx.restore();
  // Beard: along the jaw, round the mouth.
  const bd = (x: number, yy: number): Pt => ({ x: x + f.yaw * 4, y: yy });
  const beard = spline([bd(-101, 8), bd(-95, 50), bd(-85, 88 + jaw * 0.5), bd(-57, 126 + jaw), bd(-22, 147 + jaw), bd(22, 147 + jaw), bd(57, 126 + jaw), bd(85, 88 + jaw * 0.5), bd(95, 50), bd(101, 8), bd(86, 34), bd(66 + y * 0.5, 58), bd(44 + y, 54), bd(y, 48), bd(-44 + y, 54), bd(-66 + y * 0.5, 58), bd(-86, 34)], 4);
  poly(ctx, beard, wash(ctx, -60, 0, 80, 150, [[0, '#a08e7e'], [0.5, '#6c5a4c'], [1, '#3a2c25']]));
  pen.clipped(beard, () => {
    for (let i = 0; i < 190; i++) {
      const x = -100 + pen.rng() * 200;
      const yy = 10 + pen.rng() * (140 + jaw);
      pen.hair([{ x, y: yy }, { x: x + (x - y) * 0.05 + 2, y: yy + 14 }], 1.7, i % 3 ? '#2c201a' : '#d9cdbd', 0.5);
    }
  });
  pen.hair(beard, 2, INK, 0.5);
  // Eyes.
  for (const s of [-1, 1]) {
    const c = { x: s * 41 + y, y: -14 };
    const w = 25;
    const h = 13 + 6 * f.brow - 9 * f.lid;
    const shape = spline([{ x: c.x - w, y: c.y + 2 }, { x: c.x - w * 0.5, y: c.y - h * 0.8 }, { x: c.x + w * 0.1, y: c.y - h }, { x: c.x + w * 0.7, y: c.y - h * 0.5 }, { x: c.x + w, y: c.y + 2 }, { x: c.x + w * 0.4, y: c.y + h * 0.62 }, { x: c.x - w * 0.4, y: c.y + h * 0.66 }, { x: c.x - w, y: c.y + 2 }], 5);
    glow(ctx, c.x, c.y + 2, 40, 28, [120, 60, 42], 0.35);
    poly(ctx, shape, wash(ctx, 0, c.y - h, 0, c.y + h, [[0, '#c9bdae'], [0.45, '#f6f0e4'], [1, '#e6dccb']]));
    pen.clipped(shape, () => {
      const i = { x: c.x + f.look.x * 10, y: c.y + f.look.y * 6 };
      pen.dot(i.x, i.y, 12.5, '#3a2413');
      pen.dot(i.x, i.y, 10.6, '#7c5226');
      pen.dot(i.x, i.y + 2, 7, '#a9763a', 0.7);
      pen.dot(i.x, i.y, 5.6, '#0b0708');
      pen.dot(i.x - 4, i.y - 4.5, 3.2, '#ffffff');
    });
    pen.hair(shape.slice(0, 21), 5, INK, 1);
    pen.hair(shape.slice(20), 2, '#5b2c1c', 0.9);
    pen.hair([{ x: c.x - w * 0.9, y: c.y - h - 5 }, { x: c.x, y: c.y - h - 9 }, { x: c.x + w * 0.9, y: c.y - h - 3 }], 2, '#7a3d26', 0.7);
    pen.hair([{ x: c.x - w * 0.7, y: c.y + h + 5 }, { x: c.x, y: c.y + h + 10 }, { x: c.x + w * 0.7, y: c.y + h + 5 }], 1.8, '#8a4a30', 0.55);
    const by = -46 - 20 * f.brow;
    const brow: Pt[] = [{ x: c.x - s * 26, y: by + 4 - 5 * f.brow }, { x: c.x - s * 8, y: by - 8 }, { x: c.x + s * 14, y: by - 8 }, { x: c.x + s * 32, y: by + 5 }];
    pen.stroke(spline(brow, 4), 11, '#4d3b30', 1, false);
    for (let q = 0; q < 9; q++) pen.hair([{ x: c.x + s * (-24 + q * 6), y: by + 3 }, { x: c.x + s * (-20 + q * 6.5), y: by - 10 }], 1.8, '#b9a893', 0.6);
  }
  // Forehead lines when the brows go up.
  if (f.brow > 0.3) for (const d of [0, 10]) pen.hair([{ x: -46 + y, y: -84 - d }, { x: y, y: -88 - d }, { x: 46 + y, y: -84 - d }], 2, '#8a4a30', 0.5 * f.brow);
  // Nose.
  const n = { x: y * 1.5, y: 34 };
  glow(ctx, n.x + 14, n.y - 18, 22, 46, [130, 66, 44], 0.4);
  poly(ctx, spline([{ x: n.x - 24, y: n.y + 6 }, { x: n.x - 18, y: n.y - 12 }, { x: n.x - 8, y: n.y - 30 }, { x: n.x + 10, y: n.y - 30 }, { x: n.x + 22, y: n.y - 10 }, { x: n.x + 26, y: n.y + 6 }, { x: n.x + 10, y: n.y + 15 }, { x: n.x - 10, y: n.y + 15 }, { x: n.x - 24, y: n.y + 6 }], 4), wash(ctx, n.x - 26, n.y - 30, n.x + 26, n.y + 16, [[0, '#f6cfa6'], [0.5, '#e0a57a'], [1, '#a8643f']]));
  glow(ctx, n.x - 6, n.y - 6, 11, 10, [255, 240, 220], 0.75);
  pen.stroke(spline([{ x: n.x + 8 + 4 * f.yaw, y: -20 }, { x: n.x + 18, y: n.y - 14 }, { x: n.x + 27, y: n.y + 4 }, { x: n.x + 16, y: n.y + 14 }, { x: n.x, y: n.y + 17 }, { x: n.x - 16, y: n.y + 13 }, { x: n.x - 25, y: n.y + 4 }], 4), 3.2, INK, 0.9, false);
  for (const s of [-1, 1]) pen.dot(n.x + s * 12, n.y + 11, 4.4, '#4a1f12', 0.85);
  // Moustache and mouth.
  const m = { x: y * 1.2, y: 84 + jaw * 0.35 };
  if (f.open > 0.15) {
    const mouth = Array.from({ length: 25 }, (_, i) => ({ x: m.x + Math.cos((i / 24) * 6.283) * (25 - 4 * f.open), y: m.y + Math.sin((i / 24) * 6.283) * (8 + 24 * f.open) }));
    poly(ctx, mouth, '#3a0f12');
    pen.clipped(mouth, () => {
      poly(ctx, [{ x: m.x - 30, y: m.y - 40 }, { x: m.x + 30, y: m.y - 40 }, { x: m.x + 30, y: m.y - 14 * f.open }, { x: m.x - 30, y: m.y - 14 * f.open }], '#f4eee0');
      glow(ctx, m.x, m.y + 24 * f.open, 22, 14, [206, 92, 92], 1);
    });
    pen.hair(mouth, 3.4, INK, 0.95);
  } else {
    const c = -11 * f.smile;
    const lip = spline([{ x: m.x - 36, y: m.y + c + 2 }, { x: m.x - 14, y: m.y - 2 }, { x: m.x, y: m.y + 1 }, { x: m.x + 14, y: m.y - 2 }, { x: m.x + 36, y: m.y + c + 2 }], 4);
    poly(ctx, [...lip, { x: m.x + 18, y: m.y + 14 }, { x: m.x - 18, y: m.y + 14 }], '#b0624c');
    pen.stroke(lip, 4.4, '#3a0f12', 1, false);
  }
  const stache = spline([{ x: m.x - 46, y: m.y - 2 - 8 * f.smile }, { x: m.x - 30, y: m.y - 24 }, { x: m.x, y: m.y - 30 }, { x: m.x + 30, y: m.y - 24 }, { x: m.x + 46, y: m.y - 2 - 8 * f.smile }, { x: m.x + 22, y: m.y - 10 }, { x: m.x, y: m.y - 14 }, { x: m.x - 22, y: m.y - 10 }, { x: m.x - 46, y: m.y - 2 - 8 * f.smile }], 4);
  poly(ctx, stache, wash(ctx, m.x - 40, 0, m.x + 40, 0, [[0, '#ab9987'], [0.6, '#75624f'], [1, '#4c3c31']]));
  pen.hair(stache, 2.2, INK, 0.7);
  pen.stroke(face.slice(8, face.length - 8), 4.4, INK, 1, false);
  drawCap(ctx, pen, f.yaw);
  ctx.restore();
}

function drawCap(ctx: CanvasRenderingContext2D, pen: Pen, yaw: number): void {
  const y = yaw * 20;
  const dome = spline([{ x: -110, y: -54 }, { x: -108, y: -110 }, { x: -82, y: -164 }, { x: -20, y: -192 }, { x: 44, y: -188 }, { x: 94, y: -150 }, { x: 110, y: -100 }, { x: 110, y: -54 }, { x: 60, y: -76 }, { x: 0, y: -82 }, { x: -60, y: -76 }, { x: -110, y: -54 }], 5);
  const g = ctx.createRadialGradient(-46, -150, 10, 0, -110, 170);
  g.addColorStop(0, '#5c93ac');
  g.addColorStop(0.45, '#2b5f7c');
  g.addColorStop(1, '#0d2a40');
  poly(ctx, dome, g);
  for (const x of [-46, 0, 46]) pen.hair(spline([{ x: x * 0.2 + y * 0.4, y: -190 }, { x: x * 0.9 + y * 0.6, y: -140 }, { x: x + y, y: -80 }], 5), 2, '#0b2234', 0.6);
  pen.stroke(dome, 4, INK, 1, false);
  const brim = spline([{ x: -112 + y * 0.5, y: -62 }, { x: -70 + y, y: -86 }, { x: y, y: -94 }, { x: 70 + y, y: -86 }, { x: 112 + y * 0.5, y: -62 }, { x: 84 + y * 1.6, y: -44 }, { x: y * 1.8, y: -36 }, { x: -84 + y * 1.6, y: -44 }, { x: -112 + y * 0.5, y: -62 }], 5);
  poly(ctx, brim, wash(ctx, 0, -94, 0, -36, [[0, '#3f7792'], [0.5, '#23536f'], [1, '#0f2f47']]));
  pen.hair(spline([{ x: -86 + y, y: -60 }, { x: y * 1.4, y: -54 }, { x: 86 + y, y: -60 }], 5), 1.8, '#8fc0d4', 0.5);
  pen.stroke(brim, 4, INK, 1, false);
}

/** A hand: palm at `at`, fingers along `angle` (radians), `size` px from wrist to fingertips. `thumb` which side. */
export function drawHand(ctx: CanvasRenderingContext2D, at: Pt, angle: number, size: number, thumb: 1 | -1, boil: number, curl = 0): void {
  const dir = (a: number, d: number): Pt => ({ x: Math.cos(angle + a) * d, y: Math.sin(angle + a) * d });
  const from = (p: Pt, q: Pt): Pt => ({ x: p.x + q.x, y: p.y + q.y });
  const side = { x: -Math.sin(angle) * thumb, y: Math.cos(angle) * thumb };
  const finger = (root: Pt, a: number, len: number, w: number, seed: number): void => {
    const bend = curl * thumb;
    const p1 = from(root, dir(a, len * 0.5));
    const p2 = from(p1, dir(a + bend * 0.5, len * 0.32));
    const p3 = from(p2, dir(a + bend, len * 0.24));
    drawTube(ctx, { path: spline([root, p1, p2, p3], 8), radius: (s) => w * (1 - 0.22 * s) * (s > 0.85 ? Math.sqrt(Math.max(0.02, 1 - ((s - 0.85) / 0.15) ** 2)) : 1), n: 26, seed, boil, ramp: FLESH, detail: 0, line: Math.max(1.6, size * 0.02) }, DAY);
  };
  const w = size * 0.085;
  // Thumb, then the fingers fanned, then the palm over their roots.
  finger({ x: at.x - dir(0, size * 0.1).x - side.x * size * 0.2, y: at.y - dir(0, size * 0.1).y - side.y * size * 0.2 }, -0.85 * thumb, size * 0.42, w * 1.12, 1601);
  [-1.5, -0.5, 0.5, 1.5].forEach((q, i) => {
    const root = { x: at.x + dir(0, size * 0.16).x + side.x * size * 0.115 * q, y: at.y + dir(0, size * 0.16).y + side.y * size * 0.115 * q };
    finger(root, 0.13 * q * thumb, size * [0.44, 0.5, 0.47, 0.37][i]!, w * [1, 1.02, 1, 0.86][i]!, 1610 + i);
  });
  drawTube(ctx, { path: [from(at, dir(0, -size * 0.34)), at, from(at, dir(0, size * 0.22))], radius: (s) => size * (0.15 + 0.1 * Math.sin(Math.min(1, s * 1.25) * Math.PI * 0.5)) * (s > 0.8 ? 1 - 0.25 * ((s - 0.8) / 0.2) : 1), n: 26, seed: 1620, boil, ramp: FLESH, detail: 0, line: Math.max(1.6, size * 0.02) }, DAY);
  const pen = new Pen(ctx, 1630 + (boil % 3) * 977, 0.6);
  for (const [a, b] of [[-0.12, 0.05], [0.02, 0.15]] as const) {
    pen.hair([from(at, { x: side.x * -size * 0.17 + dir(0, size * a).x, y: side.y * -size * 0.17 + dir(0, size * a).y }), from(at, dir(0, size * (a + b) * 0.6)), from(at, { x: side.x * size * 0.15 + dir(0, size * b).x, y: side.y * size * 0.15 + dir(0, size * b).y })], Math.max(1.2, size * 0.014), '#8a4a30', 0.55);
  }
}

export interface ArmPose {
  readonly shoulder: Pt;
  readonly elbow: Pt;
  readonly wrist: Pt;
}

/** Sleeve over a rounded shoulder, bare forearm bending softly at the elbow. `w` the upper arm's half-width. */
export function drawSleevedArm(ctx: CanvasRenderingContext2D, p: ArmPose, w: number, boil: number, seed: number): void {
  const on = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  // The bend is rounded: the corner's cut either side of the elbow.
  const [e0, e1, e2] = [on(p.shoulder, p.elbow, 0.82), p.elbow, on(p.elbow, p.wrist, 0.24)];
  const soft = { x: (e0.x + 2 * e1.x + e2.x) / 4, y: (e0.y + 2 * e1.y + e2.y) / 4 };
  const fore = spline([on(p.shoulder, p.elbow, 0.5), e0, soft, e2, on(p.elbow, p.wrist, 0.6), p.wrist], 10);
  drawTube(ctx, { path: fore, radius: (s) => w * (0.84 + 0.1 * Math.exp(-(((s - 0.5) / 0.2) ** 2)) - 0.36 * Math.max(0, s - 0.35) / 0.65), n: 60, seed, boil, ramp: FLESH, detail: 0, line: Math.max(1.8, w * 0.07) }, DAY);
  const cuff = on(p.shoulder, p.elbow, 0.74);
  const inner = on(p.shoulder, cuff, -0.2);
  // The sleeve: full and round over the shoulder, a little looser at the cuff.
  drawTube(ctx, { path: spline([inner, p.shoulder, on(p.shoulder, cuff, 0.5), cuff], 8), radius: (s) => w * (s < 0.28 ? 1.2 * Math.sqrt(Math.max(0.03, 1 - ((0.28 - s) / 0.28) ** 2)) : 1.2 - 0.06 * ((s - 0.28) / 0.72) + 0.04 * Math.sin(s * 9)), n: 60, seed: seed + 1, boil, ramp: CLOTH, detail: 0, line: Math.max(1.8, w * 0.075), inkFrom: 0.16 }, DAY);
  const d = Math.atan2(cuff.y - p.shoulder.y, cuff.x - p.shoulder.x);
  const pen = new Pen(ctx, seed + 2 + (boil % 3) * 977, 0.6);
  const rim = Array.from({ length: 13 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 12) * Math.PI;
    const across = Math.sin(a) * w * 1.15;
    const along = Math.cos(a) * w * 0.22;
    return { x: cuff.x + Math.cos(d) * along - Math.sin(d) * across, y: cuff.y + Math.sin(d) * along + Math.cos(d) * across };
  });
  poly(ctx, rim, 'rgb(34,104,116)');
  pen.stroke(rim, Math.max(2, w * 0.09), INK, 0.95, false);
  pen.hair(rim.map((q) => ({ x: q.x - Math.cos(d) * w * 0.2, y: q.y - Math.sin(d) * w * 0.2 })), Math.max(1.2, w * 0.04), '#06222c', 0.6);
  const fold = on(p.shoulder, cuff, 0.45);
  for (const k of [-0.5, 0.2]) pen.hair(spline([{ x: fold.x - Math.sin(d) * w * (k - 0.3), y: fold.y + Math.cos(d) * w * (k - 0.3) }, { x: fold.x + Math.cos(d) * w * 0.25 - Math.sin(d) * w * k, y: fold.y + Math.sin(d) * w * 0.25 + Math.cos(d) * w * k }, { x: fold.x - Math.sin(d) * w * (k + 0.5), y: fold.y + Math.cos(d) * w * (k + 0.5) }], 5), Math.max(1.3, w * 0.05), '#06222c', 0.45);
}

/** Neck and polo: `neck` the pit of the neck, `h` one head's height, `lift` shrugged shoulders (0..1). */
export function drawTorso(ctx: CanvasRenderingContext2D, neck: Pt, h: number, lift: number, boil: number, hip = 2.35, head: Pt = { x: neck.x, y: neck.y - 0.74 * h }): void {
  const pen = new Pen(ctx, 161 + (boil % 3) * 977, 0.9);
  const at = (x: number, y: number): Pt => ({ x: neck.x + x * h, y: neck.y + y * h });
  drawTube(ctx, { path: spline([{ x: head.x, y: head.y + 0.3 * h }, at((head.x - neck.x) / h * 0.4, -0.12), at(0, 0.16)], 8), radius: (s) => h * (0.2 + 0.08 * s * s), n: 24, seed: 1640, boil, ramp: FLESH, detail: 0, line: h * 0.014 }, { ...DAY, ambient: 0.2 });
  const up = -0.13 * lift;
  const half = [at(0.2, -0.06), at(0.4, 0.05 + up * 0.7), at(0.58, 0.13 + up), at(0.68, 0.34 + up * 0.6), at(0.66, 0.8), at(0.58, 1.3), at(0.58, hip * 0.8), at(0.63, hip)];
  const shape = spline([...half, ...[...half].reverse().map((p) => ({ x: 2 * neck.x - p.x, y: p.y }))], 6);
  poly(ctx, shape, wash(ctx, neck.x - 0.8 * h, neck.y, neck.x + 0.8 * h, neck.y + 0.6 * h, [[0, '#3f96a2'], [0.3, '#2b7c8b'], [0.65, '#175564'], [1, '#093340']]));
  pen.clipped(shape, () => {
    glow(ctx, neck.x - 0.36 * h, neck.y + 0.5 * h, 0.4 * h, 0.5 * h, [150, 214, 214], 0.35);
    glow(ctx, neck.x + 0.5 * h, neck.y + 1.4 * h, 0.5 * h, 1.1 * h, [2, 20, 28], 0.5);
    for (const [a, b, c] of [[[-0.66, 0.5], [-0.4, 0.62], [-0.2, 0.6]], [[0.66, 0.52], [0.44, 0.66], [0.26, 0.64]], [[-0.6, 1.5], [-0.2, 1.62], [0.1, 1.55]], [[0.58, 1.7], [0.2, 1.8], [-0.05, 1.74]]] as const) pen.hair(spline([at(a[0], a[1]), at(b[0], b[1]), at(c[0], c[1])], 5), h * 0.014, '#06222c', 0.6);
    pen.hatch([at(0.3, 0.2), at(0.9, 0.2), at(0.9, hip), at(0.2, hip)], h * 0.05, 1.1, h * 0.007, { color: '#041a22', alpha: 0.3 });
  });
  pen.stroke([...shape, shape[0]!], h * 0.016, INK, 1, false);
  // Collar, placket, lanyard with a blank card.
  for (const s of [-1, 1]) {
    const c = [at(s * 0.24, -0.1), at(s * 0.34, 0.06), at(s * 0.2, 0.26), at(0, 0.16)];
    poly(ctx, c, s < 0 ? '#4fa6b0' : '#1f6876');
    pen.closed(c, h * 0.014, INK);
  }
  pen.hair([at(0, 0.18), at(0.01, 0.62)], h * 0.014, '#06222c', 0.8);
  for (const y of [0.3, 0.46]) pen.dot(neck.x + 0.03 * h, neck.y + y * h, h * 0.018, '#d8f0ee', 0.9);
  for (const s of [-1, 1]) pen.stroke(spline([at(s * 0.26, 0.02), at(s * 0.2, 0.5), at(0.02, 1.0)], 6), h * 0.03, '#e2a43a', 1, false);
  const card = [at(-0.12, 1.0), at(0.16, 1.0), at(0.16, 1.34), at(-0.12, 1.34)];
  poly(ctx, card, wash(ctx, 0, neck.y + h, 0, neck.y + 1.34 * h, [[0, '#f7f2e6'], [1, '#cfc7b6']]));
  pen.closed(card, h * 0.012, INK);
}

/** The closed outline of a tube. */
const outlineOf = (f: Frame): Pt[] => [
  ...f.pts.map((p, i) => ({ x: p.x + f.nrm[i]!.x * f.r[i]!, y: p.y + f.nrm[i]!.y * f.r[i]! })),
  ...f.pts.map((p, i) => ({ x: p.x - f.nrm[i]!.x * f.r[i]!, y: p.y - f.nrm[i]!.y * f.r[i]! })).reverse(),
];

/** A soft fold in cloth: a dark hollow along `pts` with a lit ridge over it. */
function fold(ctx: CanvasRenderingContext2D, pen: Pen, pts: readonly Pt[], w: number): void {
  const line = spline(pts, 6);
  const belly = line.map((p, i) => ({ x: p.x, y: p.y + w * Math.sin((i / (line.length - 1)) * Math.PI) }));
  poly(ctx, [...line, ...belly.reverse()], 'rgba(8,11,24,0.5)');
  const ridge = line.map((p, i) => ({ x: p.x, y: p.y - w * 0.8 * Math.sin((i / (line.length - 1)) * Math.PI) }));
  poly(ctx, [...line, ...ridge.reverse()], 'rgba(196,208,228,0.3)');
  pen.hair(line, Math.max(1.4, w * 0.2), '#0c101c', 0.75);
}

/** Trousers and rubber boots, from the hips at `hip` down to the floor `foot` px below; one knee eased. */
export function drawLegs(ctx: CanvasRenderingContext2D, hip: Pt, foot: number, h: number, boil: number): void {
  const pen = new Pen(ctx, 1649 + (boil % 3) * 977, 0.8);
  for (const s of [1, -1]) {
    const ease = s < 0 ? 0.16 : 0;
    const top = { x: hip.x + s * 0.28 * h, y: hip.y - 0.12 * h };
    const knee = { x: hip.x + s * (0.36 + ease) * h, y: hip.y + foot * 0.44 };
    const ankle = { x: hip.x + s * (0.4 + ease * 0.4) * h, y: hip.y + foot * 0.84 };
    const at = (p: Pt, x: number, y: number): Pt => ({ x: p.x + x * h, y: p.y + y * h });
    const leg = drawTube(ctx, { path: spline([top, { x: (top.x + knee.x) / 2 + s * 0.03 * h, y: (top.y + knee.y) / 2 }, knee, { x: (knee.x + ankle.x) / 2 + s * 0.02 * h, y: (knee.y + ankle.y) / 2 }, ankle], 8), radius: (q) => h * (0.36 - 0.14 * q + 0.03 * Math.exp(-(((q - 0.72) / 0.12) ** 2))), n: 60, seed: 1650 + s, boil, ramp: TROUSER, detail: 0, line: h * 0.016 }, { ...DAY, ambient: 0.16 });
    pen.clipped(outlineOf(leg), () => {
      // The shirt's shadow, the light down the thigh and shin, the dark inner and far sides.
      ctx.fillStyle = wash(ctx, 0, hip.y - 0.05 * h, 0, hip.y + 0.62 * h, [[0, 'rgba(6,9,22,0.72)'], [1, 'rgba(6,9,22,0)']]);
      ctx.fillRect(hip.x - 2 * h, hip.y - 0.2 * h, 4 * h, 0.85 * h);
      glow(ctx, knee.x - 0.1 * h, (top.y + knee.y) / 2 + 0.1 * h, 0.13 * h, 0.62 * h, [214, 222, 238], 0.5);
      glow(ctx, knee.x - 0.1 * h, knee.y + 0.02 * h, 0.17 * h, 0.15 * h, [232, 236, 246], 0.55);
      glow(ctx, ankle.x - 0.09 * h, (knee.y + ankle.y) / 2, 0.09 * h, 0.5 * h, [204, 214, 232], 0.42);
      glow(ctx, knee.x + 0.3 * h, (knee.y + top.y) / 2 + 0.2 * h, 0.2 * h, 1.2 * h, [6, 9, 22], 0.75);
      glow(ctx, ankle.x + 0.24 * h, (knee.y + ankle.y) / 2, 0.17 * h, 0.8 * h, [6, 9, 22], 0.7);
      if (s > 0) glow(ctx, hip.x + 0.05 * h, hip.y + 0.5 * h, 0.16 * h, 0.7 * h, [4, 6, 16], 0.7);
      // Pulls from the crotch, bunching at the knee, stacking over the boot.
      const inner = { x: hip.x + s * 0.03 * h, y: hip.y + 0.34 * h };
      fold(ctx, pen, [inner, { x: inner.x + s * 0.2 * h, y: inner.y + 0.05 * h }, { x: inner.x + s * 0.42 * h, y: inner.y - 0.06 * h }], 0.05 * h);
      fold(ctx, pen, [at(inner, 0, 0.12), at(inner, s * 0.18, 0.26), at(inner, s * 0.4, 0.28)], 0.045 * h);
      fold(ctx, pen, [at(knee, -0.3, -0.16), at(knee, -0.08, -0.1), at(knee, 0.16, -0.17)], 0.04 * h);
      fold(ctx, pen, [at(knee, -0.28, 0.17), at(knee, 0, 0.26), at(knee, 0.28, 0.14)], 0.06 * h);
      fold(ctx, pen, [at(knee, -0.1, 0.36), at(knee, 0.1, 0.42), at(knee, 0.28, 0.32)], 0.045 * h);
      const cuff = { x: knee.x + (ankle.x - knee.x) * 0.5, y: knee.y + (ankle.y - knee.y) * 0.5 };
      fold(ctx, pen, [at(cuff, -0.3, -0.2), at(cuff, -0.04, -0.12), at(cuff, 0.26, -0.22)], 0.055 * h);
      fold(ctx, pen, [at(cuff, -0.3, -0.04), at(cuff, 0.02, 0.05), at(cuff, 0.28, -0.07)], 0.055 * h);
      pen.hatch([at(knee, 0.08, -1.3), at(knee, 0.5, -1.3), at(ankle, 0.5, 0.2), at(ankle, 0.06, 0.2)], h * 0.05, 1.05, h * 0.007, { color: '#0a0e1c', alpha: 0.28 });
    });
    drawBoot(ctx, pen, knee, ankle, s, h, boil);
  }
}

/** A wet rubber boot: shaft with a rolled top, creases over the ankle, rounded toe turned out, a pale sole. */
function drawBoot(ctx: CanvasRenderingContext2D, pen: Pen, knee: Pt, ankle: Pt, s: number, h: number, boil: number): void {
  const at = (p: Pt, x: number, y: number): Pt => ({ x: p.x + x * h, y: p.y + y * h });
  const b0 = { x: knee.x + (ankle.x - knee.x) * 0.55, y: knee.y + (ankle.y - knee.y) * 0.55 };
  const shaft = drawTube(ctx, { path: [b0, { x: (b0.x + ankle.x) / 2, y: (b0.y + ankle.y) / 2 }, ankle, { x: ankle.x + s * 0.02 * h, y: ankle.y + 0.2 * h }], radius: (q) => h * (0.29 - 0.07 * q), n: 40, seed: 1655 + s, boil, ramp: RUBBER, detail: 0, line: h * 0.018 }, { ...DAY, ambient: 0.16, wet: 0.4 });
  const a = { x: ankle.x, y: ankle.y + 0.18 * h };
  const shoe = spline([{ x: a.x - s * 0.22 * h, y: a.y - 0.04 * h }, { x: a.x - s * 0.25 * h, y: a.y + 0.22 * h }, { x: a.x - s * 0.1 * h, y: a.y + 0.28 * h }, { x: a.x + s * 0.3 * h, y: a.y + 0.28 * h }, { x: a.x + s * 0.58 * h, y: a.y + 0.22 * h }, { x: a.x + s * 0.56 * h, y: a.y + 0.06 * h }, { x: a.x + s * 0.34 * h, y: a.y - 0.04 * h }, { x: a.x + s * 0.2 * h, y: a.y - 0.14 * h }], 5);
  poly(ctx, shoe, wash(ctx, 0, a.y - 0.14 * h, 0, a.y + 0.28 * h, [[0, '#6f8d77'], [0.3, '#47634f'], [0.65, '#22332a'], [1, '#0c1410']]));
  pen.clipped(shoe, () => {
    glow(ctx, a.x + s * 0.36 * h, a.y + 0.01 * h, 0.2 * h, 0.09 * h, [206, 226, 208], 0.75);
    glow(ctx, a.x - s * 0.02 * h, a.y + 0.2 * h, 0.24 * h, 0.16 * h, [4, 8, 6], 0.75);
    poly(ctx, [at(a, -s * 0.3, 0.21), at(a, s * 0.1, 0.235), at(a, s * 0.62, 0.18), at(a, s * 0.62, 0.34), at(a, -s * 0.3, 0.34)], '#b9b08f');
    pen.hair([at(a, -s * 0.26, 0.21), at(a, s * 0.1, 0.235), at(a, s * 0.58, 0.18)], h * 0.016, INK, 0.85);
  });
  pen.stroke(shoe, h * 0.018, INK, 1, false);
  pen.clipped(outlineOf(shaft), () => {
    ctx.fillStyle = wash(ctx, 0, b0.y, 0, b0.y + 0.2 * h, [[0, 'rgba(3,7,5,0.6)'], [1, 'rgba(3,7,5,0)']]);
    ctx.fillRect(b0.x - h, b0.y, 2 * h, 0.2 * h);
    glow(ctx, ankle.x - 0.09 * h, (b0.y + ankle.y) / 2 + 0.05 * h, 0.06 * h, 0.36 * h, [220, 236, 220], 0.7);
    glow(ctx, ankle.x + 0.2 * h, (b0.y + ankle.y) / 2, 0.14 * h, 0.6 * h, [3, 8, 6], 0.75);
    for (const dy of [-0.06, 0.05]) pen.hair(spline([at(ankle, -0.22, dy), at(ankle, 0, dy + 0.06), at(ankle, 0.22, dy - 0.01)], 5), h * 0.016, '#0a120d', 0.7);
  });
  // The rolled top.
  const roll = Array.from({ length: 25 }, (_, i) => ({ x: b0.x + Math.cos((i / 24) * 6.283) * 0.3 * h, y: b0.y + Math.sin((i / 24) * 6.283) * 0.06 * h }));
  poly(ctx, roll, wash(ctx, b0.x - 0.3 * h, 0, b0.x + 0.3 * h, 0, [[0, '#9cb5a2'], [0.4, '#587562'], [1, '#1a2820']]));
  pen.stroke(roll, h * 0.015, INK, 0.95, false);
}

/** A mop: pole from `top` to `foot`, strands splayed on the floor. */
export function drawMop(ctx: CanvasRenderingContext2D, top: Pt, foot: Pt, w: number, boil: number): void {
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.06 + 0.88 * (i / 12));
    const tip = { x: foot.x + Math.cos(a) * w * 9, y: foot.y + Math.sin(a) * w * 3.6 + w * 3 };
    drawTube(ctx, { path: spline([foot, { x: foot.x + Math.cos(a) * w * 4, y: foot.y + w * 2.2 }, tip], 6), radius: (s) => w * (0.75 - 0.3 * s), n: 20, seed: 1660 + i, boil, ramp: [[70, 84, 96], [120, 136, 146], [176, 188, 192], [222, 228, 226], [250, 250, 244]], detail: 0, line: 2 }, DAY);
  }
  drawTube(ctx, { path: [top, { x: (top.x + foot.x) / 2, y: (top.y + foot.y) / 2 }, foot], radius: () => w * 0.62, n: 30, seed: 1680, boil, ramp: WOOD, detail: 0, line: 2.6 }, DAY);
}
