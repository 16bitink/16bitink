import { INK, makeCanvas, Pen } from '../../../src/art/pen';
import { VIDEO } from '../short';
import { type Pt, resample } from '../octopus/geom';
import { drawMound, drawSucker, drawTube, glow, type Frame, lit, type Light, mix, onTube, poly, type Rgb, rgb, SKIN, type Tube, tubeFrame } from './paint';

/**
 * Inky, the common New Zealand octopus: rusty orange-brown, mottled and
 * bumpy, with golden slit-pupilled eyes on mounds of the head, a soft mantle,
 * skin webs between the arms and two rows of pale-rimmed suckers. Head and
 * mantle are one soft tube along an axis (crown of arms → mantle tip), so any
 * squeeze stays in one piece; arms are tubes along any path.
 */

export interface Octo {
  /** From the crown of the arms up through the head to the tip of the mantle. */
  readonly axis: readonly Pt[];
  /** The head's half-width, px. */
  readonly size: number;
  /** Turned: 0 faces us, + shows its left eye towards the middle (radians). */
  readonly turn: number;
  readonly gaze: Pt;
  /** 0 wide open .. 1 shut. */
  readonly lid: number;
  readonly breathe?: number;
  /** Radius along the axis (shares of size) when it isn't the natural one. */
  readonly profile?: (s: number) => number;
  /** Where along the axis the eyes sit. */
  readonly eyeS?: number;
  readonly eyeK?: number;
  readonly detail?: number;
}

const KEYS: readonly (readonly [number, number])[] = [[0, 0.7], [0.14, 0.98], [0.26, 1.02], [0.36, 0.98], [0.66, 1.36]];

/** The natural body: head, a slight neck, the full mantle, its rounded end. */
export function natural(s: number): number {
  if (s >= 0.66) return 1.36 * Math.sqrt(Math.max(0, 1 - ((s - 0.66) / 0.34) ** 2.15));
  let i = 0;
  while (i < KEYS.length - 2 && s > KEYS[i + 1]![0]) i++;
  const [a, va] = KEYS[i]!;
  const [b, vb] = KEYS[i + 1]!;
  const u = (s - a) / (b - a);
  return va + (vb - va) * u * u * (3 - 2 * u);
}

/** Along the body, finer near the rounded end so the cap stays round. */
export function bodyTube(o: Octo, boil: number): Tube {
  const prof = o.profile ?? natural;
  const br = o.breathe ?? 1;
  return { path: o.axis, radius: (s) => o.size * prof(s) * (s > 0.42 ? 1 + (br - 1) * Math.min(1, (s - 0.42) / 0.2) : 1), n: 150, seed: 4101, boil, bumps: 0.012, detail: o.detail ?? 1.25, inkFrom: 0.1 };
}

export interface EyeSpot {
  readonly c: Pt;
  readonly r: number;
  readonly face: number;
  readonly angle: number;
}

/** Where its eyes are on screen (the near one first). */
export function eyesOf(o: Octo, f: Frame): EyeSpot[] {
  const i = Math.round((o.eyeS ?? 0.24) * (f.pts.length - 1));
  const n = f.nrm[i]!;
  return [-0.86 + o.turn, 0.86 + o.turn]
    .map((phi) => ({ c: onTube(f, i, Math.max(-1.45, Math.min(1.45, phi)), 1.0), r: o.size * 0.34 * (o.eyeK ?? 1), face: Math.cos(phi), angle: Math.atan2(n.y, n.x) }))
    .filter((e) => e.face > 0.12)
    .sort((a, b) => a.face - b.face);
}

/** A golden eye with a horizontal slit pupil, a catchlight and heavy soft lids. */
export function drawEye(ctx: CanvasRenderingContext2D, e: EyeSpot, gaze: Pt, lid: number, light: Light, boil: number, seed = 1): void {
  const { c, r } = e;
  const tone = (col: Rgb): Rgb => (light.tint ? mix(col, light.tint, (light.tintK ?? 0) * 0.6) : col);
  const pen = new Pen(ctx, 61 + seed + (boil % 3) * 977, 0.6);
  const across = Math.abs(Math.cos(e.angle));
  const thin = Math.max(0.62, e.face);
  drawMound(ctx, c, r * 1.7 * (1 - (1 - thin) * across), r * 1.6 * (1 - (1 - thin) * (1 - across)), light, 0.9);
  ctx.save();
  ctx.translate(c.x, c.y);
  const squash = Math.max(0.5, Math.min(1, e.face + 0.12));
  // Foreshortened along the head's width; the slit itself always stays level.
  ctx.rotate(e.angle);
  ctx.scale(squash, 1);
  ctx.rotate(-e.angle);
  // Folds of skin round the eye.
  for (let k = 0; k < 4; k++) {
    const q = 1.22 + k * 0.17;
    ctx.strokeStyle = rgb(tone([58, 16, 8]), 0.5 - k * 0.1);
    ctx.lineWidth = r * 0.045;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * q, r * q * 0.88, 0, Math.PI * (0.08 + 0.06 * k), Math.PI * (0.92 - 0.05 * k));
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.05, r * q, r * q * 0.92, 0, Math.PI * (1.1 + 0.05 * k), Math.PI * (1.9 - 0.06 * k));
    ctx.stroke();
  }
  ctx.fillStyle = rgb(tone([34, 8, 8]), 0.9);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.1, r * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();
  // The gold of the eye.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.84, 0, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(r * 0.05, r * 0.2, r * 0.1, 0, 0, r * 1.02);
  g.addColorStop(0, rgb(tone([255, 226, 120])));
  g.addColorStop(0.45, rgb(tone([240, 176, 56])));
  g.addColorStop(0.8, rgb(tone([176, 98, 24])));
  g.addColorStop(1, rgb(tone([80, 34, 12])));
  ctx.fillStyle = g;
  ctx.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
  for (let a = 0; a < 46; a++) {
    const th = (a / 46) * Math.PI * 2 + 0.05 * Math.sin(a * 5);
    ctx.strokeStyle = a % 2 ? rgb(tone([118, 58, 14]), 0.5) : rgb(tone([255, 238, 160]), 0.5);
    ctx.lineWidth = r * 0.028;
    ctx.beginPath();
    ctx.moveTo(Math.cos(th) * r * 0.42, Math.sin(th) * r * 0.3);
    ctx.lineTo(Math.cos(th) * r * (0.8 + 0.12 * Math.sin(a * 3)), Math.sin(th) * r * (0.7 + 0.1 * Math.sin(a * 3)));
    ctx.stroke();
  }
  // The slit: a horizontal bar, a touch fuller at its ends.
  const px = gaze.x * r * 0.2;
  const py = gaze.y * r * 0.2;
  const w = r * 0.66;
  const h = r * 0.16;
  ctx.fillStyle = '#080509';
  ctx.beginPath();
  ctx.moveTo(px - w, py);
  ctx.bezierCurveTo(px - w, py - h * 1.35, px - w * 0.45, py - h * 0.95, px, py - h * 0.82);
  ctx.bezierCurveTo(px + w * 0.45, py - h * 0.95, px + w, py - h * 1.35, px + w, py);
  ctx.bezierCurveTo(px + w, py + h * 1.5, px + w * 0.45, py + h * 1.15, px, py + h * 1.05);
  ctx.bezierCurveTo(px - w * 0.45, py + h * 1.15, px - w, py + h * 1.5, px - w, py);
  ctx.fill();
  ctx.strokeStyle = rgb(tone([255, 230, 150]), 0.6);
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
  // The lid's shadow, and the light in it.
  const sh = ctx.createLinearGradient(0, -r * 0.84, 0, r * 0.1);
  sh.addColorStop(0, 'rgba(24,6,6,0.75)');
  sh.addColorStop(1, 'rgba(24,6,6,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(-r, -r, r * 2, r * 1.2);
  ctx.fillStyle = 'rgba(255,252,240,0.96)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.34, r * 0.15, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,220,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(r * 0.36, r * 0.36, r * 0.14, r * 0.07, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const ring = Array.from({ length: 33 }, (_, j) => ({ x: Math.cos((j / 32) * Math.PI * 2) * r * 1.02, y: Math.sin((j / 32) * Math.PI * 2) * r * 0.86 }));
  pen.stroke(ring, Math.max(1.2, r * 0.045), INK, 0.9, false);
  // The lids: soft folds of its own skin, over the eye's rim.
  const lidShape = (from: number, to: number, edge: number): Pt[] => {
    const arc = Array.from({ length: 19 }, (_, j) => {
      const a = from + ((to - from) * j) / 18;
      return { x: Math.cos(a) * r * 1.16, y: Math.sin(a) * r * 1.02 };
    });
    const [p, q] = [arc[18]!, arc[0]!];
    const rim = Array.from({ length: 13 }, (_, j) => ({ x: p.x + ((q.x - p.x) * j) / 12, y: p.y + ((q.y - p.y) * j) / 12 + (edge - (p.y + q.y) / 2) * Math.sin((j / 12) * Math.PI) }));
    return [...arc, ...rim];
  };
  const top = -r * 0.66 + r * 1.36 * lid;
  const upper = lidShape(Math.PI * 1.04, Math.PI * 1.96, top);
  const lidG = ctx.createLinearGradient(0, -r * 1.02, 0, Math.max(-r * 0.5, top));
  lidG.addColorStop(0, rgb(lit(SKIN, [0, -0.35, 0.94], light), 0.55));
  lidG.addColorStop(0.35, rgb(lit(SKIN, [0, -0.5, 0.86], light)));
  lidG.addColorStop(0.8, rgb(lit(SKIN, [0, 0.2, 0.98], light)));
  lidG.addColorStop(1, rgb(tone([96, 32, 12])));
  poly(ctx, upper, lidG);
  pen.hair(upper.slice(19), Math.max(1.6, r * 0.07), INK, 0.95);
  pen.hair(upper.slice(19).map((p) => ({ x: p.x * 0.96, y: p.y - r * 0.15 })), Math.max(1, r * 0.03), '#6a1f0a', 0.6);
  const bot = r * 0.74 - r * 0.5 * lid;
  const lower = lidShape(Math.PI * 0.06, Math.PI * 0.94, bot);
  const lowG = ctx.createLinearGradient(0, bot, 0, r * 1.02);
  lowG.addColorStop(0, rgb(lit(SKIN, [0, -0.3, 0.95], light)));
  lowG.addColorStop(1, rgb(lit(SKIN, [0, 0.4, 0.9], light), 0.5));
  poly(ctx, lower, lowG);
  pen.hair(lower.slice(19), Math.max(1.2, r * 0.045), INK, 0.9);
  ctx.restore();
}

/** Head and mantle with the eyes. */
export function drawOctoBody(ctx: CanvasRenderingContext2D, o: Octo, light: Light, boil: number): Frame {
  const tube = bodyTube(o, boil);
  // The eye mounds standing out past the head's edge go under it.
  const f0 = tubeFrame(tube);
  const pen = new Pen(ctx, 4111 + (boil % 3) * 977, 0.8);
  for (const e of eyesOf(o, f0)) {
    const [cos, sin] = [Math.cos(e.angle), Math.sin(e.angle)];
    const ball = Array.from({ length: 41 }, (_, j) => {
      const across = Math.cos((j / 40) * Math.PI * 2) * e.r * 1.36 * Math.max(0.72, e.face);
      const along = Math.sin((j / 40) * Math.PI * 2) * e.r * 1.32;
      return { x: e.c.x + across * cos - along * sin, y: e.c.y + across * sin + along * cos };
    });
    poly(ctx, ball, rgb(lit(SKIN, [0, -0.1, 0.99], light)));
    pen.stroke(ball, Math.max(1.6, e.r * 0.1), INK, 0.95, false);
  }
  return drawTube(ctx, tube, light);
}

export function drawOctoEyes(ctx: CanvasRenderingContext2D, o: Octo, light: Light, boil: number): void {
  const f = tubeFrame(bodyTube(o, boil));
  eyesOf(o, f).forEach((e, k) => drawEye(ctx, e, o.gaze, o.lid, light, boil, k));
}

// ---------------------------------------------------------------- arms

export interface Arm {
  readonly path: readonly Pt[];
  readonly w: number;
  readonly band: (s: number) => number;
  readonly seed: number;
  readonly pressed?: boolean;
  readonly detail?: number;
  readonly from?: number;
  readonly to?: number;
  /** The arm's end: share of w left at the tip. */
  readonly end?: number;
  readonly n?: number;
}

export const armRadius = (w: number, end = 0.05) => (s: number): number => w * (end + (1 - end) * Math.pow(Math.max(0, 1 - s), 0.82)) * (1 + 0.45 * Math.max(0, 1 - s / 0.16) ** 1.4);

export function drawArm(ctx: CanvasRenderingContext2D, a: Arm, light: Light, boil: number, inkFrom = 0.06): void {
  drawTube(ctx, { path: a.path, radius: armRadius(a.w, a.end), band: a.band, seed: a.seed, boil, pressed: a.pressed, detail: a.detail ?? 0.9, n: a.n ?? 110, from: a.from, to: a.to, inkFrom, bumps: 0.02 }, light);
}

/** The skin web between two arms, out to `depth` of their length. */
export function drawWeb(ctx: CanvasRenderingContext2D, a: readonly Pt[], b: readonly Pt[], depth: number, light: Light, boil: number, seed: number, oral = false): void {
  const n = 40;
  const ra = resample(a, n);
  const rb = resample(b, n);
  const k = Math.max(2, Math.round(depth * (n - 1)));
  const [ea, eb] = [ra[k]!, rb[k]!];
  const crown = { x: (ra[0]!.x + rb[0]!.x) / 2, y: (ra[0]!.y + rb[0]!.y) / 2 };
  const dip = { x: (ea.x + eb.x) / 2 + (crown.x - (ea.x + eb.x) / 2) * 0.4, y: (ea.y + eb.y) / 2 + (crown.y - (ea.y + eb.y) / 2) * 0.4 };
  const edge = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return { x: (1 - t) ** 2 * ea.x + 2 * t * (1 - t) * dip.x + t * t * eb.x, y: (1 - t) ** 2 * ea.y + 2 * t * (1 - t) * dip.y + t * t * eb.y };
  });
  const shape = [...ra.slice(0, k + 1), ...edge, ...rb.slice(0, k + 1).reverse()];
  const tone = (c: Rgb): string => rgb(light.tint ? mix(c, light.tint, light.tintK ?? 0) : c);
  const R = Math.hypot(edge[8]!.x - crown.x, edge[8]!.y - crown.y) || 1;
  const g = ctx.createRadialGradient(crown.x, crown.y, R * 0.1, crown.x, crown.y, R * 1.7);
  g.addColorStop(0, tone(oral ? [120, 56, 40] : [110, 38, 18]));
  g.addColorStop(0.55, tone(oral ? [196, 120, 84] : [164, 64, 24]));
  g.addColorStop(1, tone(oral ? [236, 176, 130] : [222, 122, 58]));
  poly(ctx, shape, g);
  const pen = new Pen(ctx, seed + (boil % 3) * 977, 0.8);
  for (let i = 2; i < 15; i += 2) pen.hair([{ x: crown.x + (edge[i]!.x - crown.x) * 0.35, y: crown.y + (edge[i]!.y - crown.y) * 0.35 }, edge[i]!], 1.6, '#571c0c', 0.35);
  for (let i = 3; i < 15; i += 4) pen.hair([{ x: crown.x + (edge[i]!.x - crown.x) * 0.5, y: crown.y + (edge[i]!.y - crown.y) * 0.5 }, edge[i]!], 2.4, '#ffc58a', 0.22);
  pen.stroke(edge, 3, INK, 0.9, false);
}

// ---------------------------------------------------------------- a layer to melt arms into the head

/** The web's hub: the skin the arms grow out of. */
export function drawHub(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, light: Light): void {
  const tone = (c: Rgb, a: number): string => rgb(light.tint ? mix(c, light.tint, light.tintK ?? 0) : c, a);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, -0.2, 0.1, 0, 0, 1);
  g.addColorStop(0, tone([196, 84, 32], 1));
  g.addColorStop(0.7, tone([150, 54, 20], 1));
  g.addColorStop(1, tone([104, 34, 14], 1));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

let layer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

/** Draws on a spare layer, rubs it out softly round `face` (rx, ry), and lays it over the frame: the arms grow out of the head with no seam. */
export function meltInto(ctx: CanvasRenderingContext2D, face: { x: number; y: number; rx: number; ry: number; core?: number }, draw: (layerCtx: CanvasRenderingContext2D) => void): void {
  layer ??= makeCanvas(VIDEO.width, VIDEO.height);
  const l = layer.ctx;
  l.save();
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = 'source-over';
  l.globalAlpha = 1;
  l.clearRect(0, 0, VIDEO.width, VIDEO.height);
  const m = ctx.getTransform();
  l.setTransform(m);
  draw(l);
  l.globalCompositeOperation = 'destination-out';
  l.translate(face.x, face.y);
  l.scale(face.rx, face.ry);
  const g = l.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(face.core ?? 0.55, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  l.fillStyle = g;
  l.beginPath();
  l.arc(0, 0, 1, 0, Math.PI * 2);
  l.fill();
  l.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

/** Drops falling from a point, `n` of them, phased; `len` how far they fall. */
export function drips(ctx: CanvasRenderingContext2D, at: Pt, t: number, rate: number, len: number, seed: number, colour: Rgb = [190, 232, 240]): void {
  for (let k = 0; k < 2; k++) {
    const u = (((t * rate + seed * 0.37 + k * 0.5) % 1) + 1) % 1;
    const grow = Math.min(1, u / 0.35);
    const fall = u > 0.35 ? ((u - 0.35) / 0.65) ** 2 * len : 0;
    const r = 6.5 * grow;
    const y = at.y + 6 * grow + fall;
    ctx.fillStyle = rgb(colour, 0.85 * (1 - Math.max(0, u - 0.85) / 0.15));
    ctx.beginPath();
    ctx.moveTo(at.x, y - r * (u > 0.35 ? 2.6 : 2));
    ctx.quadraticCurveTo(at.x + r * 1.3, y, at.x, y + r);
    ctx.quadraticCurveTo(at.x - r * 1.3, y, at.x, y - r * (u > 0.35 ? 2.6 : 2));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(at.x - r * 0.25, y, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }
}

export { drawSucker, glow };
