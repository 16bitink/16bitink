import { SNAKE_W } from '../../../src/art/types';
import { edges, strokeLine } from '../cobra/lay';
import { lengths, spineOf } from '../pythonbear/python';
import { drawBody, drawBodyShadow, drawSprite, type Pt, type Sprite, type Strip } from '../sprites';
import { ADDER } from './adderArt';
import { type BodyPose, NECK } from './badgerBody';
import type { HeadPose } from './badgerHead';

/**
 * Placing the two animals on screen. The badger: its body sprite with the
 * head drawn on at the nape (badgerBody.ts NECK), the whole thing standing
 * on `at` (the ground under the body's origin), facing right unless
 * mirrored. The adder: its painted back laid along a spine from the head
 * back, thick and short, the head at the front.
 */
export interface BadgerSprites {
  readonly body: Readonly<Record<BodyPose, Sprite>>;
  readonly head: Readonly<Record<HeadPose, Sprite>>;
}

export interface BadgerPose {
  readonly at: Pt;
  readonly scale: number;
  readonly body: BodyPose;
  readonly head: HeadPose;
  /** Extra head turn about the nape (radians, + = nose down). */
  readonly nod?: number;
  /** The whole animal turned about `at` (radians). */
  readonly roll?: number;
  /** Face left. */
  readonly mirror?: boolean;
  readonly alpha?: number;
  /** Stretch across (1 = as drawn), for a squash-and-stretch shake. */
  readonly squash?: number;
}

/** The body art's ground sits this far below its origin (badgerBody.ts GROUND). */
const GROUND = 80;
/** The body and head as painted (kept as factors for tuning their proportions on screen). */
const BODY_SX = 1;
const HEAD_K = 1.08;

/** Screen point of a body-art point under a pose. */
export function badgerPoint(p: BadgerPose, art: Pt): Pt {
  const k = p.scale;
  const sx = p.mirror ? -1 : 1;
  const x = art.x * BODY_SX * k * sx;
  const y = (art.y - GROUND) * k * (p.squash ?? 1);
  const r = p.roll ?? 0;
  return { x: p.at.x + x * Math.cos(r) - y * Math.sin(r), y: p.at.y + x * Math.sin(r) + y * Math.cos(r) };
}

/** Screen point of a head-art point (from the nape) under a pose. */
export function headPoint(p: BadgerPose, art: Pt): Pt {
  const neck = NECK[p.body];
  const a = neck.tilt + (p.nod ?? 0);
  const hx = art.x * HEAD_K;
  const hy = art.y * HEAD_K;
  const k = p.scale;
  const sx = p.mirror ? -1 : 1;
  const x = (neck.x * BODY_SX + (hx * Math.cos(a) - hy * Math.sin(a))) * k * sx;
  const y = (neck.y - GROUND + hx * Math.sin(a) + hy * Math.cos(a)) * k * (p.squash ?? 1);
  const r = p.roll ?? 0;
  return { x: p.at.x + x * Math.cos(r) - y * Math.sin(r), y: p.at.y + x * Math.sin(r) + y * Math.cos(r) };
}

/** The body, its shadow on the ground; then the head (or only the head's `layer`). */
export function drawBadger(ctx: CanvasRenderingContext2D, s: BadgerSprites, boil: number, p: BadgerPose, layer: 'all' | 'body' | 'head' = 'all'): void {
  const k = p.scale;
  ctx.save();
  ctx.globalAlpha *= p.alpha ?? 1;
  ctx.translate(p.at.x, p.at.y);
  ctx.rotate(p.roll ?? 0);
  ctx.scale(p.mirror ? -1 : 1, p.squash ?? 1);
  if (layer !== 'head') {
    const sh = ctx.createRadialGradient(0, 0, 4, 0, 0, 260 * k);
    sh.addColorStop(0, 'rgba(40,14,6,0.42)');
    sh.addColorStop(1, 'rgba(40,14,6,0)');
    ctx.save();
    ctx.scale(1, 0.12);
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(-20 * k, 0, 230 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.scale(BODY_SX, 1);
    drawSprite(ctx, s.body[p.body], boil, { x: 0, y: -GROUND * k, scale: k });
    ctx.restore();
  }
  if (layer !== 'body') {
    const neck = NECK[p.body];
    drawSprite(ctx, s.head[p.head], boil, { x: neck.x * BODY_SX * k, y: (neck.y - GROUND) * k, scale: k * HEAD_K, rotation: neck.tilt + (p.nod ?? 0) });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the adder

export interface AdderSprites {
  readonly strip: Strip;
  readonly head: Readonly<Record<'top' | 'strike', Sprite>>;
}

export interface AdderLay {
  /** Head first. */
  readonly spine: readonly Pt[];
  /** The body's full width, screen px. */
  readonly base: number;
  /** How the width runs, 0 head .. 1 tail; by default an adder's: a thin neck, a fat body, a short tapering tail. */
  readonly share?: (u: number) => number;
  /** Pattern slid along the body (strip units). */
  readonly offset?: number;
  /** Draw only from this far along (0..1): the front part gone into a mouth. */
  readonly from?: number;
  /** Draw only up to this far along. */
  readonly to?: number;
}

/** The puff adder's width along its body: the neck narrow behind the broad head, thickest mid-body, a short stubby tail. */
export function adderShare(u: number): number {
  if (u < 0.07) return 0.58 + 0.42 * (u / 0.07) ** 0.8 * 0.9;
  if (u < 0.3) return 0.96 + 0.04 * ((u - 0.07) / 0.23);
  if (u < 0.78) return 1;
  const x = (u - 0.78) / 0.22;
  return 1 - 0.9 * x ** 1.3;
}

export const smoothSpine = (knots: readonly Pt[], step = 3): Pt[] => spineOf(knots, step);

/** The body: shadow, painted back, a firm contour down both sides (and round the tail's tip, if shown). */
export function drawAdderBody(ctx: CanvasRenderingContext2D, s: AdderSprites, boil: number, l: AdderLay, shadow = 1): void {
  const s0 = lengths(l.spine);
  const total = s0[s0.length - 1]!;
  const share = l.share ?? adderShare;
  const from = l.from ?? 0;
  const to = l.to ?? 1;
  const keep = l.spine.map((_, i) => s0[i]! / total).map((u, i) => [u, i] as const).filter(([u]) => u >= from - 1e-6 && u <= to + 1e-6);
  if (keep.length < 2) return;
  const spine = keep.map(([, i]) => l.spine[i]!);
  const widths = keep.map(([u]) => l.base * share(u));
  const along = l.base / SNAKE_W;
  const pose = { spine, widths, along, offset: (l.offset ?? 0) + (s0[keep[0]![1]]! / along) };
  if (shadow > 0) drawBodyShadow(ctx, pose, l.base, shadow);
  drawBody(ctx, s.strip, boil, pose);
  const lay = { spine, widths, base: l.base, headRight: true };
  const { a, b } = edges(lay, 0.985);
  const w = Math.max(2.4, l.base * 0.03);
  if (to >= 1) strokeLine(ctx, [...a, ...[...b].reverse()], w, ADDER.line);
  else {
    strokeLine(ctx, a, w, ADDER.line);
    strokeLine(ctx, b, w, ADDER.line);
  }
}

/** The head at the front of the spine, facing along its first stretch; `lift` turns it, `k` scales it. */
export function drawAdderHead(ctx: CanvasRenderingContext2D, s: AdderSprites, boil: number, l: AdderLay, pose: 'top' | 'strike', lift = 0, k = 1): void {
  const a = l.spine[0]!;
  const b = l.spine[Math.min(l.spine.length - 1, 4)]!;
  const forward = Math.atan2(a.y - b.y, a.x - b.x);
  const right = Math.cos(forward) >= 0;
  const share = l.share ?? adderShare;
  const neck = l.base * share(0);
  drawSprite(ctx, s.head[pose], boil, { x: a.x, y: a.y, scale: (neck / SNAKE_W) * k, rotation: right ? forward - lift : forward + lift, flip: right ? 1 : -1 });
}

export function drawAdder(ctx: CanvasRenderingContext2D, s: AdderSprites, boil: number, l: AdderLay, pose: 'top' | 'strike' = 'top', lift = 0, shadow = 1): void {
  drawAdderBody(ctx, s, boil, l, shadow);
  if ((l.from ?? 0) <= 0) drawAdderHead(ctx, s, boil, l, pose, lift);
}
