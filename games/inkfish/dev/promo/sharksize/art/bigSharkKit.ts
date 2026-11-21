import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { blit, type Box, type Brush, type Bucket, bucketFor, frames, lazily, path, screenScale, taper, turn } from '../../seal/art/paint';

/**
 * What the size video's painted sharks (mako.ts, hammerhead.ts) share, in the
 * manner of ../../seal/art/blueShark.ts and ../../foodchain/art/greatWhite.ts:
 * a body sprite per line-boil frame whose rear half bends in thin columns, a
 * lower jaw cut out of that same painting and turned about the mouth's corner
 * for the gulp, the inside of the mouth and its rows of teeth drawn live in
 * the gap, a live eye with a catchlight, and the pectorals turned at their
 * roots. Own units: about 310 long, the middle at 0,0, nose to the right (+x),
 * belly down (+y), the sprites baked at seal/art/paint.ts's BUCKETS.
 */

export interface Teeth {
  /** How many along each jaw, how long (units) at the front, and how far each leans back (0 upright). */
  readonly upper: number;
  readonly lower: number;
  readonly long: number;
  readonly lean: number;
  /** Width over length: slim for a mako's awls, broader for a hammerhead's. */
  readonly slim: number;
}

export interface Gape {
  /** The mouth line under the snout, front to corner; the corner is the hinge the jaw turns on. */
  readonly upper: readonly Pt[];
  /** The jaw's underside, front to back, ending under the hinge just outside the outline (so the cut takes the ink with it). */
  readonly chin: readonly Pt[];
  /** A point on the belly behind the hinge: the throat stretches from here to the dropped jaw. */
  readonly throat: Pt;
  /** The widest drop, radians. */
  readonly max: number;
  readonly teeth: Teeth;
  /** The throat skin's colour, seen as the jaw drops. */
  readonly skin: string;
}

export interface EyeLook {
  readonly at: Pt;
  readonly r: number;
  /** The iris ring round the pupil (barely there on a mako's black eye). */
  readonly iris: string;
  /** The lid over the top of the eye, the body's colour there. */
  readonly lid: string;
  /** The pale lit rim under the eye. */
  readonly rim: string;
}

export interface Fin {
  readonly root: Pt;
  readonly angle: number;
  readonly stretch: number;
}

export interface Bend {
  /** The head stays rigid in front of this; the tail fin turns as one piece behind `rigid`. */
  readonly from: number;
  readonly rigid: number;
  readonly to: number;
  readonly wag: number;
}

export interface SharkPaint {
  readonly box: Box;
  readonly pecBox: Box;
  readonly seed: number;
  readonly gape: Gape;
  /** Everything on the body sprite that belongs to the jaw as well (washes, ink). */
  readonly body: (k: Brush) => void;
  /** Painted after the jaw is cut out: parts nearer the eye than the jaw (the hammer's near blade). */
  readonly over?: (k: Brush) => void;
  readonly pectoral: (k: Brush, far: boolean) => void;
}

export interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly near: readonly HTMLCanvasElement[];
  readonly far: readonly HTMLCanvasElement[];
}

export const hingeOf = (g: Gape): Pt => g.upper[g.upper.length - 1]!;
export const jawShape = (g: Gape): Pt[] => [...g.upper, ...[...g.chin].reverse()];

function boxOf(shape: readonly Pt[], pad: number): Box {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad };
}

/** The sprite sets of one painted shark, baked the first time each size is needed. */
export function spriteMaker(p: SharkPaint): { readonly jawBox: Box; readonly at: (b: Bucket) => Sprites } {
  const jaw = jawShape(p.gape);
  const jawBox = boxOf(jaw, 2);
  const at = lazily((b: Bucket): Sprites => ({
    res: b.res,
    body: frames(p.box, b, p.seed, (k) => {
      p.body(k);
      k.ctx.save();
      k.ctx.globalCompositeOperation = 'destination-out';
      path(k.ctx, jaw);
      k.ctx.fill();
      k.ctx.restore();
      p.over?.(k);
    }),
    jaw: frames(jawBox, b, p.seed, (k) => {
      k.ctx.save();
      path(k.ctx, jaw);
      k.ctx.clip();
      p.body(k);
      k.ctx.restore();
    }),
    near: frames(p.pecBox, b, p.seed + 13, (k) => p.pectoral(k, false)),
    far: frames(p.pecBox, b, p.seed + 17, (k) => p.pectoral(k, true)),
  }));
  return { jawBox, at };
}

// ---------------------------------------------------------------- the tail beat

function curveAt(x: number, bend: Bend, beat: number): number {
  const u = Math.max(0, Math.min(1, (x - bend.from) / (bend.to - bend.from)));
  return bend.wag * u * u * Math.sin(beat - 2.6 * u);
}

function bentAt(x: number, bend: Bend, beat: number): number {
  if (x >= bend.rigid) return curveAt(x, bend, beat);
  const at = curveAt(bend.rigid, bend, beat);
  return at + (at - curveAt(bend.rigid + 1, bend, beat)) * (bend.rigid - x);
}

/** The body: the head as it is, the rest in thin columns moved onto the beating midline and turned with it. */
export function drawBent(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, scale: number, bend: Bend, beat: number): void {
  const k = 1 / res;
  const split = Math.max(0, Math.min(c.width, Math.round((bend.from - box.x0) * res)));
  ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
  const step = Math.max(2, Math.round((2.5 * res) / scale));
  const overlap = 0.7 / scale;
  for (let sx = 0; sx < split; sx += step) {
    const w = Math.min(step, split - sx);
    const x = box.x0 + (sx + w / 2) * k;
    const dy = bentAt(x, bend, beat);
    const slope = bentAt(x + 0.5, bend, beat) - bentAt(x - 0.5, bend, beat);
    ctx.save();
    ctx.translate(x, dy);
    ctx.rotate(Math.atan(slope));
    ctx.drawImage(c, sx, 0, w, c.height, -(w * k) / 2 - overlap, box.y0, w * k + 2 * overlap, c.height * k);
    ctx.restore();
  }
}

function fin(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, f: Fin, paddle: number): void {
  ctx.save();
  ctx.translate(f.root.x, f.root.y);
  ctx.rotate(f.angle + paddle);
  ctx.scale(f.stretch, 1);
  blit(ctx, c, box, res);
  ctx.restore();
}

// ---------------------------------------------------------------- the gulp

/** One tooth from `base`, pointing along `dir` (radians), `h` long, curving back toward the throat. */
function tooth(ctx: CanvasRenderingContext2D, base: Pt, dir: number, h: number, t: Teeth, back: number, lw: number): void {
  const w = h * t.slim;
  const [c, s] = [Math.cos(dir), Math.sin(dir)];
  const along = (u: number, v: number): Pt => ({ x: base.x + c * u - s * v, y: base.y + s * u + c * v });
  // "Back" is toward the hinge: lean the tip that way, then flick it out a touch (the mako's hooked awl).
  const lean = t.lean * back;
  ctx.beginPath();
  const a = along(0, -w / 2);
  const tip = along(h, lean * h);
  ctx.moveTo(a.x, a.y);
  const c1 = along(h * 0.6, -w * 0.25 + lean * h * 0.15);
  ctx.quadraticCurveTo(c1.x, c1.y, tip.x, tip.y);
  const c2 = along(h * 0.45, w * 0.55 + lean * h * 0.35);
  const b = along(0, w / 2);
  ctx.quadraticCurveTo(c2.x, c2.y, b.x, b.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
  g.addColorStop(0, '#d9cdb8');
  g.addColorStop(0.35, '#f7f2e6');
  g.addColorStop(1, '#fffdf8');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,24,20,0.55)';
  ctx.lineWidth = 0.7 * lw;
  ctx.stroke();
}

/** A row of teeth along `line` (front to back), pointing `dir`, longest at the front. */
function row(ctx: CanvasRenderingContext2D, line: readonly Pt[], n: number, dir: number, t: Teeth, grow: number, lw: number, side: 1 | -1): void {
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const at = line[Math.min(line.length - 1, Math.round(u * (line.length - 1) * 0.86))]!;
    const h = t.long * grow * (1 - 0.55 * u) * (0.9 + 0.2 * Math.sin(i * 2.7));
    if (h > 0.2) tooth(ctx, at, dir, h, t, side, lw);
  }
}

/** The mouth open by `a` radians: throat skin, the dark inside, gums and both rows of teeth. Drawn under the jaw and body. */
function drawInside(ctx: CanvasRenderingContext2D, g: Gape, a: number, lw: number): void {
  const hinge = hingeOf(g);
  const lower = g.upper.map((p) => turn(p, hinge, a));
  const chinBack = turn(g.chin[g.chin.length - 1]!, hinge, a);
  // The stretched throat behind the dropped jaw.
  ctx.save();
  ctx.fillStyle = g.skin;
  path(ctx, [hinge, g.throat, chinBack]);
  ctx.fill();
  ctx.restore();
  taper(ctx, [g.throat, { x: (g.throat.x + chinBack.x) / 2, y: (g.throat.y + chinBack.y) / 2 + 0.6 }, chinBack], 1.6 * lw, 1.2 * lw, INK, 0.8);
  const mouth = [...g.upper, ...[...lower].reverse()];
  const front = g.upper[0]!;
  ctx.save();
  path(ctx, mouth);
  const fill = ctx.createRadialGradient(hinge.x, hinge.y, 0, hinge.x, hinge.y, Math.hypot(front.x - hinge.x, front.y - hinge.y) * 1.2);
  fill.addColorStop(0, '#120406');
  fill.addColorStop(0.55, '#3b1016');
  fill.addColorStop(1, '#7a2c34');
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  // Gums: pink bands along both jaws, the tongue low in the floor of the mouth.
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(196,96,106,0.85)';
  ctx.lineWidth = 2.4;
  for (const line of [g.upper, lower]) {
    ctx.beginPath();
    line.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  const open = Math.min(1, a / g.max);
  const t = g.teeth;
  row(ctx, g.upper, t.upper, Math.PI / 2, t, 0.55 + 0.45 * open, lw, 1);
  row(ctx, lower, t.lower, Math.PI / 2 + a + Math.PI, t, 0.7 + 0.3 * open, lw, -1);
  ctx.restore();
}

// ---------------------------------------------------------------- the eye

/** A shark's eye: dark and glossy, a soft socket shadow, a faint iris ring, a catchlight, the lid over its top. */
export function drawEye(ctx: CanvasRenderingContext2D, e: EyeLook, lw: number): void {
  const { x, y } = e.at;
  const r = e.r;
  const socket = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.2);
  socket.addColorStop(0, 'rgba(8,10,20,0.55)');
  socket.addColorStop(1, 'rgba(8,10,20,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.1, y + r * 0.4, 0.1, x, y, r);
  g.addColorStop(0, e.iris);
  g.addColorStop(0.6, '#0e1118');
  g.addColorStop(1, '#030405');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.05, y, r * 0.4, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.32, y - r * 0.36, r * 0.22, r * 0.17, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(x - r * 0.36, y + r * 0.4, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = e.lid;
  ctx.beginPath();
  ctx.ellipse(x + r * 0.1, y - r * 1.4, r * 1.6, r, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1 * lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = e.rim;
  ctx.beginPath();
  ctx.arc(x, y, r + 0.9 * lw, 0.35, Math.PI - 0.35);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- on screen

export interface SharkDraw {
  readonly sprites: (b: Bucket) => Sprites;
  readonly paint: SharkPaint;
  readonly jawBox: Box;
  readonly bend: Bend;
  readonly eye: EyeLook;
  readonly near: Fin;
  readonly far: Fin;
  /** Own units, nose to the upper tail tip (for the scale from `len`). */
  readonly units: number;
}

let scratch: HTMLCanvasElement | null = null;

/**
 * Fading (globalAlpha under 1), the bent body's overlapping columns would show
 * as stripes: paint the shark whole on a scratch canvas, then lay it down at
 * the alpha in one go (the target's clip still applies).
 */
function drawFaded(ctx: CanvasRenderingContext2D, d: SharkDraw, len: number, gulp: number, t: number, beat: number): void {
  const { width, height } = ctx.canvas;
  scratch ??= document.createElement('canvas');
  if (scratch.width !== width || scratch.height !== height) {
    scratch.width = width;
    scratch.height = height;
  }
  const g = scratch.getContext('2d')!;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, width, height);
  g.setTransform(ctx.getTransform());
  drawShark(g, d, len, gulp, t, beat);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}

/** Draws a painted shark facing right around the origin, `len` px long, the jaw dropped by `gulp`. */
export function drawShark(ctx: CanvasRenderingContext2D, d: SharkDraw, len: number, gulp: number, t: number, beat: number): void {
  if (ctx.globalAlpha < 0.999) {
    drawFaded(ctx, d, len, gulp, t, beat);
    return;
  }
  const k = len / d.units;
  ctx.save();
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const s = d.sprites(bucketFor(scale));
  const f = ((Math.floor(t * 8) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const lw = 1 / scale;
  const g = d.paint.gape;
  const hinge = hingeOf(g);
  const open = gulp * gulp * (3 - 2 * gulp);
  const a = open * g.max;
  const paddle = 0.05 * Math.sin(beat * 0.5);
  fin(ctx, s.far[f]!, d.paint.pecBox, s.res, d.far, paddle);
  if (a > 0.004) drawInside(ctx, g, a, lw);
  ctx.save();
  ctx.translate(hinge.x, hinge.y);
  ctx.rotate(a);
  ctx.translate(-hinge.x, -hinge.y);
  blit(ctx, s.jaw[f]!, d.jawBox, s.res);
  ctx.restore();
  drawBent(ctx, s.body[f]!, d.paint.box, s.res, scale, d.bend, beat);
  drawEye(ctx, d.eye, lw);
  // The lips, inked live (the cut halved the painted line).
  taper(ctx, g.upper, 1.1 * lw, 1.8 * lw, INK, 0.9);
  if (a > 0.004) taper(ctx, g.upper.map((p) => turn(p, hinge, a)), 1.1 * lw, 1.6 * lw, INK, 0.85);
  fin(ctx, s.near[f]!, d.paint.pecBox, s.res, d.near, paddle);
  ctx.restore();
}
