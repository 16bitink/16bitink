import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, makeCanvas, Pen, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import {
  blit, type Box, type Brush, type Bucket, bucketFor, columnWash, contour, curve, type Edge, edgeAt, frames, lazily, path, px, screenScale, shade,
  softLine, type Stops, taper,
} from '../../seal/art/paint';
import type { RawShark } from './contract';
import { drawEye, drawGape, jawShape } from './paintedHead';
import type { SharkId } from './ids';

/**
 * The shared brushwork for the sharks this video paints new (the dwarf
 * lanternshark, the blacktip reef shark and the spiny dogfish), in the manner
 * of ../../seal/art/blueShark.ts: a species gives its outline, fins,
 * countershading and markings, and this paints and bakes it. The body (with
 * its midline fins and tail) is baked once per line-boil frame at the
 * paint.ts BUCKETS and drawn in columns so the tail beats; the pectorals are
 * baked apart and turned at their roots; the lower jaw is the body's own paint
 * cut along the mouth and swung open about the mouth's corner for `gulp`,
 * over a live dark mouth with small teeth. The eye is live (a real eye with a
 * catchlight, never cartoon whites).
 *
 * Units: about 310 long, the nose to the right (+x) at about x = 160, belly
 * down (+y). fitShark (contract.ts) measures the drawing, so the exact length
 * doesn't matter.
 */

export interface Fin { readonly shape: readonly Pt[]; readonly root: Pt; readonly tip: Pt }
export interface Dorsal { readonly fin: readonly Pt[]; readonly foot0: number; readonly foot1: number }

export interface EyeSpec {
  readonly at: Pt;
  readonly r: number;
  /** Iris gradient, centre to rim. */
  readonly iris: readonly [string, string, string];
  /** The pupil's half width and half height over r. */
  readonly pupil: readonly [number, number];
  /** The skin colour the lid is painted in. */
  readonly lid: string;
  /** The rim light under the eye. */
  readonly rim: string;
}

export interface Body {
  readonly topAt: Edge;
  readonly bottomAt: Edge;
  readonly lineAt: Edge;
  readonly along: (v: number, x0: number, x1: number, step?: number) => Pt[];
  readonly outline: readonly Pt[];
  /** The back with its dorsals, nose to tail. */
  readonly topline: readonly Pt[];
}

export interface Spec {
  readonly id: SharkId;
  readonly name: string;
  readonly mouth: RawShark['mouth'];
  readonly seed: number;
  /** Nose to tail stock, the top and the bottom edge (no fins). */
  readonly back: readonly Pt[];
  readonly belly: readonly Pt[];
  /** Where the dark back breaks to the pale belly. */
  readonly line: readonly Pt[];
  readonly dorsals: readonly Dorsal[];
  readonly caudal: Fin;
  /** Fins under the body drawn behind it (pelvics, anal). */
  readonly under: readonly Fin[];
  /** The body's paint fades into the caudal from here back. */
  readonly stock: number;
  readonly pectoral: Fin;
  readonly pecNear: Pt;
  readonly pecFar: Pt;
  readonly pecAngle: number;
  readonly eye: EyeSpec;
  /** The upper jaw's edge, front to corner; the jaw hangs under it. */
  readonly mouthLine: readonly Pt[];
  readonly jawMax: number;
  readonly teeth: { readonly n: number; readonly size: number; readonly colour: string };
  readonly gills: readonly number[];
  /** The gill slits' top and bottom, as fractions of the body's depth from its top. */
  readonly gillSpan: readonly [number, number];
  readonly nostril: readonly Pt[];
  readonly stops: (x: number, line: number) => Stops;
  readonly ink: { readonly fin: readonly [string, string, string]; readonly sheen: string; readonly dark: string; readonly cool: string; readonly belly: number };
  readonly box: Box;
  readonly pecBox: Box;
  /** Markings over the body's wash, clipped to the body. */
  readonly decorate?: (k: Brush, b: Body) => void;
  /** Markings over a fin's wash, clipped to the fin (`dorsal` for the back's fins). */
  readonly decorateFin?: (k: Brush, fin: Fin, kind: 'caudal' | 'under' | 'pectoral' | 'dorsal', b: Body) => void;
  /** Painted over everything on the body sprite, unclipped (glows). */
  readonly over?: (k: Brush, b: Body) => void;
}

export const boilOf = (t: number): number => ((Math.floor(t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;

// ---------------------------------------------------------------- painting

function bodyOf(s: Spec): Body {
  const topAt = (x: number): number => edgeAt(s.back, x);
  const bottomAt = (x: number): number => edgeAt(s.belly, x);
  const lineAt = (x: number): number => edgeAt(s.line, x);
  const tops: Pt[] = [];
  let rest = s.back.filter((p) => p.x > s.dorsals[0]!.foot0);
  tops.push(...rest);
  s.dorsals.forEach((d, i) => {
    tops.push(...d.fin);
    const next = s.dorsals[i + 1];
    rest = s.back.filter((p) => p.x < d.foot1 && (!next || p.x > next.foot0));
    tops.push(...rest);
  });
  return {
    topAt, bottomAt, lineAt,
    along: (v, x0, x1, step = 4) => contour(topAt, bottomAt, v, x0, x1, step),
    outline: [...tops, ...[...s.belly].reverse().slice(1, -1)],
    topline: tops,
  };
}

function paintFin(k: Brush, s: Spec, b: Body, f: Fin, kind: 'caudal' | 'under' | 'pectoral', far = false): void {
  const { pen, ctx } = k;
  const [lit, base, dark] = s.ink.fin;
  pen.fill(f.shape, PAPER_FILL, 1);
  pen.clipped(f.shape, () => {
    ctx.save();
    ctx.translate(px(k, 0.7), px(k, 0.7));
    shade(ctx, f.shape, Math.min(f.root.y, f.tip.y) - 10, Math.max(f.root.y, f.tip.y) + 10, [[0, lit], [0.5, base], [1, dark]], f.root.x - 10, f.tip.x);
    ctx.restore();
    const g = ctx.createLinearGradient(f.root.x, f.root.y, f.tip.x, f.tip.y);
    g.addColorStop(0, 'rgba(255,255,255,0.08)');
    g.addColorStop(0.6, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(-300, -200, 600, 400);
    // Fine rays from the root.
    const span = Math.hypot(f.tip.x - f.root.x, f.tip.y - f.root.y);
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      const to = { x: f.tip.x + (u - 0.5) * span * 0.35, y: f.tip.y + (u - 0.5) * span * 0.3 };
      pen.hair([f.root, to], px(k, 0.7), s.ink.dark, 0.12 + 0.12 * u);
    }
    s.decorateFin?.(k, f, kind, b);
    if (far) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-300, -200, 600, 400);
    }
  });
  pen.stroke(f.shape, px(k, far ? 1.1 : 1.4), INK, 1, true);
}

function paintDorsals(k: Brush, s: Spec, b: Body): void {
  const { pen, ctx } = k;
  for (const d of s.dorsals) {
    const apex = d.fin.reduce((a, p) => (p.y < a.y ? p : a));
    const shape = [...d.fin, { x: d.foot1, y: b.topAt(d.foot1) + 3 }, { x: d.foot0, y: b.topAt(d.foot0) + 3 }];
    pen.clipped(shape, () => {
      for (let i = 0; i < 10; i++) {
        const u = i / 9;
        const x = d.foot0 + (d.foot1 - d.foot0) * u;
        pen.hair([{ x, y: b.topAt(x) }, { x: apex.x + u * 2, y: apex.y + 2 + u * 5 }], px(k, 0.7), u < 0.3 ? s.ink.sheen : s.ink.dark, u < 0.3 ? 0.25 : 0.12 + 0.2 * u);
      }
      softLine(ctx, d.fin.filter((p) => p.x < apex.x), 4, '#000000', 0.25);
      softLine(ctx, d.fin.filter((p) => p.x >= apex.x), 2.5, s.ink.sheen, 0.25);
      s.decorateFin?.(k, { shape, root: { x: (d.foot0 + d.foot1) / 2, y: b.topAt((d.foot0 + d.foot1) / 2) }, tip: apex }, 'dorsal', b);
    });
  }
}

function paintWash(k: Brush, s: Spec, b: Body): void {
  const { pen, ctx } = k;
  const x0 = s.back[s.back.length - 1]!.x - 2;
  const x1 = s.box.x1;
  ctx.save();
  ctx.translate(px(k, 1), px(k, 1.2));
  columnWash(ctx, x0, x1, 1, b.topAt, b.bottomAt, (x) => {
    const t = b.topAt(x);
    return s.stops(x, Math.max(0.25, Math.min(0.92, (b.lineAt(x) - t) / Math.max(1, b.bottomAt(x) - t))));
  }, 50);
  ctx.restore();
  // Light from above along the back, broken into hairs; the shade low on the flank; the belly cooling to its underside.
  softLine(ctx, b.along(0.08, x1 - 8, s.stock), 6, s.ink.sheen, 0.22);
  for (let r = 0; r < 9; r++) {
    const v = 0.03 + (0.26 * (r + pen.rng() * 0.7)) / 9;
    let x = x1 - 10 - pen.rng() * 25;
    while (x > s.stock) {
      const end = Math.max(s.stock, x - 10 - pen.rng() * 36);
      pen.hair(b.along(v, x, end, 3), px(k, 0.8 + pen.rng() * 0.5), s.ink.sheen, 0.24 * (1 - v / 0.32));
      x = end - 4 - pen.rng() * 16;
    }
  }
  softLine(ctx, b.along(0.45, x1 - 40, s.stock), 8, '#000000', 0.1);
  pen.stipple(b.outline, 1100, (x, y) => 0.45 * Math.max(0, 1 - (y - b.topAt(x)) / 12), px(k, 0.6), 'rgba(255,255,255,0.35)');
  pen.hair(b.along(0.38, x1 - 64, s.stock, 5), px(k, 0.8), s.ink.sheen, 0.16);
  for (let r = 1; r <= 3; r++) pen.hair(b.along(1 - r * 0.05, x1 - 40, s.stock + 30, 5), px(k, 0.7), s.ink.cool, 0.15 - r * 0.03);
  softLine(ctx, b.along(0.985, x1 - 30, s.stock + 20), 4, s.ink.cool, s.ink.belly);
  pen.hair(s.line.filter((p) => p.x < x1 - 12), px(k, 0.9), s.ink.dark, 0.25);
}

function paintGills(k: Brush, s: Spec, b: Body): void {
  const { pen } = k;
  for (const x of s.gills) {
    const t = b.topAt(x);
    const d = b.bottomAt(x) - t;
    const [y0, y1] = [t + d * s.gillSpan[0], t + d * s.gillSpan[1]];
    const slit = curve({ x: x + 1.6, y: y0 }, { x: x - 1.2, y: (y0 + y1) / 2 }, { x: x + 1.2, y: y1 }, 8);
    pen.stroke(slit, px(k, 1.1), INK, 0.85, false);
    pen.hair(slit.slice(1, -1).map((p) => ({ x: p.x - 1.2, y: p.y })), px(k, 0.8), s.ink.sheen, 0.3);
  }
}

function paintBody(k: Brush, s: Spec, b: Body): void {
  const { pen, ctx } = k;
  paintFin(k, s, b, s.caudal, 'caudal');
  for (const f of s.under) paintFin(k, s, b, f, 'under');
  pen.fill(b.outline, PAPER_FILL, 1);
  pen.clipped(b.outline, () => {
    paintWash(k, s, b);
    paintDorsals(k, s, b);
    s.decorate?.(k, b);
  });
  // The stock runs on into the caudal: erase the body's back end, ramping in, so the fin painted under it shows through.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  path(ctx, b.outline);
  ctx.clip();
  const end = s.back[s.back.length - 1]!.x - 2;
  for (let x = s.stock; x > end; x -= 0.6) {
    ctx.globalAlpha = Math.min(1, (s.stock - x) / 12);
    ctx.fillRect(x - 0.6, b.topAt(x) - 4, 0.7, b.bottomAt(x) - b.topAt(x) + 8);
  }
  ctx.restore();
  // The erase took the caudal under it too: lay the caudal in again behind what's left.
  behind(k, s.seed + 29, (k2) => paintFin(k2, s, b, s.caudal, 'caudal'));
  paintGills(k, s, b);
  pen.stroke(s.nostril, px(k, 1.1), INK, 0.85, false);
  pen.stroke(b.topline.filter((p) => p.x > s.stock - 4), px(k, 1.4), INK, 1, true);
  pen.stroke(s.belly.filter((p) => p.x > s.stock - 4), px(k, 1.9), INK, 1, true);
  s.over?.(k, b);
}

/** Paints into a copy of the sheet and lays it in behind what's already there. */
function behind(k: Brush, seed: number, paint: (k2: Brush) => void): void {
  const c = k.ctx.canvas;
  const { canvas, ctx } = makeCanvas(c.width, c.height);
  ctx.setTransform(k.ctx.getTransform());
  paint({ ...k, ctx, pen: new Pen(ctx, seed, 0.55 / k.res) });
  k.ctx.save();
  k.ctx.setTransform(1, 0, 0, 1, 0, 0);
  k.ctx.globalCompositeOperation = 'destination-over';
  k.ctx.drawImage(canvas, 0, 0);
  k.ctx.restore();
}

function paintPectoral(k: Brush, s: Spec, b: Body, far: boolean): void {
  paintFin(k, s, b, s.pectoral, 'pectoral', far);
}

// ---------------------------------------------------------------- on screen

const BEND_FROM = 60;
const WAG_FROM = -10;
const WAG = 7;

function wag(x: number, tail: number, beat: number, rigid: number): number {
  const at = (u: number): number => {
    const b = Math.max(0, Math.min(1, (u - WAG_FROM) / (tail - WAG_FROM)));
    return WAG * b * b * Math.sin(beat - 2.6 * b);
  };
  if (x >= rigid) return at(x);
  return at(rigid) + (at(rigid) - at(rigid + 1)) * (rigid - x);
}

/** The body: the head as it is, the rest in thin columns, each moved onto the beating midline and turned with it. */
function drawBent(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, scale: number, beat: number, tail: number, rigid: number): void {
  const k = 1 / res;
  const split = Math.round((BEND_FROM - box.x0) * res);
  ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
  const step = Math.max(2, Math.round((2.5 * res) / scale));
  const overlap = 0.7 / scale;
  for (let sx = 0; sx < split; sx += step) {
    const w = Math.min(step, split - sx);
    const x = box.x0 + (sx + w / 2) * k;
    const dy = wag(x, tail, beat, rigid);
    const slope = wag(x + 0.5, tail, beat, rigid) - wag(x - 0.5, tail, beat, rigid);
    ctx.save();
    ctx.translate(x, dy);
    ctx.rotate(Math.atan(slope));
    ctx.drawImage(c, sx, 0, w, c.height, -(w * k) / 2 - overlap, box.y0, w * k + 2 * overlap, c.height * k);
    ctx.restore();
  }
}

function fin(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, box: Box, res: number, root: Pt, angle: number, stretch = 1): void {
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(angle);
  ctx.scale(stretch, 1);
  blit(ctx, c, box, res);
  ctx.restore();
}

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
  readonly near: readonly HTMLCanvasElement[];
  readonly far: readonly HTMLCanvasElement[];
}

/** Inks a fin's tip: everything past `frac` of the way back from its tip, square across the fin, with a pale band before it. Clip first. */
export function inkTip(ctx: CanvasRenderingContext2D, root: Pt, tip: Pt, frac: number, colour: string, alpha = 1, band = 0.35): void {
  const len = Math.hypot(tip.x - root.x, tip.y - root.y);
  const a = Math.atan2(tip.y - root.y, tip.x - root.x);
  const cut = len * (1 - frac);
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(cut - len * 0.03, 0, cut + len * 0.04, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, colour);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(cut - len * 0.03, -len, len * 2, len * 2);
  if (band > 0) {
    const w = len * 0.07;
    const p = ctx.createLinearGradient(cut - w * 1.6, 0, cut, 0);
    p.addColorStop(0, 'rgba(255,255,250,0)');
    p.addColorStop(0.7, `rgba(255,255,250,${band})`);
    p.addColorStop(1, 'rgba(255,255,250,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = p;
    ctx.fillRect(cut - w * 1.6, -len, w * 1.6, len * 2);
  }
  ctx.restore();
}

/** A RawShark from a species spec. */
export function paintedShark(s: Spec, units: number): RawShark {
  const b = bodyOf(s);
  const jaw = jawShape(s, b);
  const xs = jaw.map((p) => p.x);
  const ys = jaw.map((p) => p.y);
  const jawBox: Box = { x0: Math.min(...xs) - 3, x1: Math.max(...xs) + 3, y0: Math.min(...ys) - 3, y1: Math.max(...ys) + 3 };
  const tail = s.caudal.tip.x;
  const rigid = s.stock - 6;
  const spritesFor = lazily((bk: Bucket): Sprites => ({
    res: bk.res,
    body: frames(s.box, bk, s.seed, (k) => paintBody(k, s, b)),
    // The same paint (the same seed, so the same strokes), cut to the jaw.
    jaw: frames(jawBox, bk, s.seed, (k) => {
      k.ctx.save();
      path(k.ctx, jaw);
      k.ctx.clip();
      paintBody(k, s, b);
      k.ctx.restore();
    }),
    near: frames(s.pecBox, bk, s.seed + 13, (k) => paintPectoral(k, s, b, false)),
    far: frames(s.pecBox, bk, s.seed + 17, (k) => paintPectoral(k, s, b, true)),
  }));
  return {
    id: s.id, name: s.name, painted: true, mouth: s.mouth,
    prepare: () => {
      spritesFor(bucketFor(1000 / units));
    },
    draw(ctx, len, gulp, t, beat) {
      ctx.save();
      ctx.scale(len / units, len / units);
      const scale = screenScale(ctx);
      const lw = 1 / scale;
      const sp = spritesFor(bucketFor(scale));
      const f = boilOf(t);
      const paddle = 0.05 * Math.sin(beat * 0.5);
      fin(ctx, sp.far[f]!, s.pecBox, sp.res, s.pecFar, s.pecAngle + 0.3 + paddle, 0.8);
      drawBent(ctx, sp.body[f]!, s.box, sp.res, scale, beat, tail, rigid);
      const open = Math.max(0, Math.min(1, gulp)) * s.jawMax;
      if (open > 0.01) {
        const corner = s.mouthLine[s.mouthLine.length - 1]!;
        const low = drawGape(ctx, s, open, lw);
        ctx.save();
        ctx.translate(corner.x, corner.y);
        ctx.rotate(open);
        ctx.translate(-corner.x, -corner.y);
        blit(ctx, sp.jaw[f]!, jawBox, sp.res);
        ctx.restore();
        taper(ctx, low, 1.4 * lw, 1.8 * lw, INK, 0.85);
      }
      drawEye(ctx, s.eye, lw);
      taper(ctx, s.mouthLine, 1.1 * lw, 1.9 * lw, INK, 0.9);
      fin(ctx, sp.near[f]!, s.pecBox, sp.res, s.pecNear, s.pecAngle + paddle);
      ctx.restore();
    },
  };
}
