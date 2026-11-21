import { INK, RED } from '../../../src/art/palette';
import { makeCanvas } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { VIDEO } from '../short';
import { bakeSprite, drawSprite, type Pt, type Sprite } from '../sprites';
import { CAIMAN_BODY, CAIMAN_LEG, CAIMAN_TAIL, JOINTS, PER_ART } from './caimanArt';
import { CAIMAN_HEAD } from './caimanHead';
import type { CaimanPose } from './caimanPose';
import { toScreen, type View } from './camera';
import { CAIMAN_LEN, U } from './story';
import { alarmAt, splashesAt } from './words';

/** Draws the caiman, half in the water, the water it throws and its "!" (caimanPose.ts has the poses). */

export interface CaimanCast {
  readonly body: Sprite;
  readonly calm: Sprite;
  readonly alarm: Sprite;
  readonly fore: Sprite;
  readonly hind: Sprite;
  readonly tailBase: Sprite;
  readonly tailTip: Sprite;
  /** A frame-sized layer the caiman is painted on, so the water can tint only it. */
  readonly layer: HTMLCanvasElement;
}

export function bakeCaiman(): CaimanCast {
  return {
    body: bakeSprite(CAIMAN_BODY, 'body', 7, 500),
    calm: bakeSprite(CAIMAN_HEAD, 'calm', 8, 510),
    alarm: bakeSprite(CAIMAN_HEAD, 'alarm', 8, 510),
    fore: bakeSprite(CAIMAN_LEG, 'fore', 8, 520),
    hind: bakeSprite(CAIMAN_LEG, 'hind', 8, 530),
    tailBase: bakeSprite(CAIMAN_TAIL, 'base', 7, 540),
    tailTip: bakeSprite(CAIMAN_TAIL, 'tip', 7, 545),
    layer: makeCanvas(VIDEO.width, VIDEO.height).canvas,
  };
}

/** Its axis place `a` (world units from the snout), `y` art units down from it, to the world. */
function placer(c: CaimanPose): (a: number, y: number) => Pt {
  const rot = -c.tilt;
  const [cos, sin] = [Math.cos(rot), Math.sin(rot)];
  return (a, y) => {
    const lx = -a;
    const ly = y * PER_ART;
    return { x: c.x + lx * cos - ly * sin, y: c.y + lx * sin + ly * cos };
  };
}

export function drawCaimanShadow(ctx: CanvasRenderingContext2D, c: CaimanPose, view: View): void {
  if (c.shadow <= 0) return;
  const p = toScreen(view, placer(c)(300, 16));
  ctx.save();
  ctx.globalAlpha = 0.24 * c.shadow;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(p.x + 10, p.y + 10, 170 * view.zoom, 40 * view.zoom, -c.tilt * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The art y of the water's surface along it, about its axis: at its flank wading, just under its back swimming. */
const surfaceY = (c: CaimanPose): number => 4.5 + (-6.6 - 4.5) * c.sink;

function paintParts(ctx: CanvasRenderingContext2D, cast: CaimanCast, c: CaimanPose, boil: number, view: View): void {
  const at = placer(c);
  const rot = -c.tilt;
  const k = PER_ART * view.zoom;
  const put = (s: Sprite, p: Pt, rotation: number, extra = 1): void => {
    const q = toScreen(view, p);
    drawSprite(ctx, s, boil, { x: q.x, y: q.y, rotation, scale: k * extra });
  };
  const place = (s: Sprite, a: number, y: number, rotation: number, extra = 1): void => put(s, at(a, y), rotation, extra);
  // The tail, bent at its base and again further on; negative bends lift it.
  const base = at(JOINTS.tail.a * U, 0);
  const r1 = rot - c.tailBase;
  const reach = (JOINTS.tip.a - JOINTS.tail.a) * U;
  const tip = { x: base.x - reach * Math.cos(r1), y: base.y - reach * Math.sin(r1) };
  put(cast.tailTip, tip, r1 - c.tailTip);
  put(cast.tailBase, base, r1);
  const hindA = (j: { a: number }): number => j.a * U + c.hindBack;
  ctx.save();
  ctx.filter = 'brightness(0.7)';
  place(cast.hind, hindA(JOINTS.hindFar), JOINTS.hindFar.y, rot + c.hindFar, 0.95);
  place(cast.fore, JOINTS.foreFar.a * U, JOINTS.foreFar.y, rot + c.foreFar, 0.95);
  ctx.restore();
  place(cast.body, JOINTS.body.a * U, JOINTS.body.y, rot, 1 + 0.025 * c.shudder);
  place(cast.hind, hindA(JOINTS.hindNear), JOINTS.hindNear.y, rot + c.hindNear);
  place(cast.fore, JOINTS.foreNear.a * U, JOINTS.foreNear.y, rot + c.foreNear);
  place(c.alarm ? cast.alarm : cast.calm, JOINTS.neck.a * U, JOINTS.neck.y, rot + c.neck);
}

/** The part of it under the water, on screen: behind waterA, below the surface. */
function underwater(c: CaimanPose, view: View): Pt[] {
  const at = placer(c);
  const a0 = Math.max(-60, c.waterA);
  const y = surfaceY(c);
  return [at(a0, y), at(CAIMAN_LEN + 300, y), at(CAIMAN_LEN + 300, 40), at(a0, 40)].map((p) => toScreen(view, p));
}

/** Tints what's under the water the tea-dark blackwater's colour, on the caiman's own layer. */
function sink(ctx: CanvasRenderingContext2D, c: CaimanPose, view: View): void {
  if (c.waterA > CAIMAN_LEN) return;
  const poly = underwater(c, view);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(poly[0]!.x, poly[0]!.y, poly[3]!.x, poly[3]!.y);
  g.addColorStop(0, 'rgba(70,56,36,0.5)');
  g.addColorStop(0.12, 'rgba(52,40,26,0.68)');
  g.addColorStop(1, 'rgba(40,30,20,0.85)');
  ctx.fillStyle = g;
  ctx.beginPath();
  poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The waterline lapping along its side, and the wake as it swims. */
function waterline(ctx: CanvasRenderingContext2D, c: CaimanPose, t: number, view: View): void {
  if (c.waterA > CAIMAN_LEN) return;
  const at = placer(c);
  const y = surfaceY(c);
  const a0 = Math.max(-10, c.waterA);
  const line = (dy: number, color: string, w: number): void => {
    ctx.beginPath();
    for (let a = a0; a <= CAIMAN_LEN + 20; a += 12) {
      const p = toScreen(view, at(a, y + dy + 0.35 * Math.sin(a * 0.05 + t * 7)));
      if (a === a0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = w * view.zoom;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  ctx.save();
  line(0.5, 'rgba(30,22,14,0.5)', 5);
  line(0, 'rgba(236,232,212,0.75)', 3);
  if (c.sink > 0.3) {
    // A V of ripples spreading back from the snout.
    const nose = toScreen(view, at(-6, y));
    ctx.globalAlpha = c.sink * 0.7;
    ctx.strokeStyle = 'rgba(236,232,212,0.8)';
    ctx.lineWidth = 2.4 * view.zoom;
    for (const side of [-1, 1]) {
      for (const [d, s] of [[60, 0.5], [130, 0.85], [210, 1.2]] as const) {
        const back = toScreen(view, at(d, y + side * 6 * s));
        const out = toScreen(view, at(d + 50, y + side * 11 * s));
        ctx.beginPath();
        ctx.moveTo(nose.x + (back.x - nose.x) * 0.9, nose.y + (back.y - nose.y) * 0.9);
        ctx.quadraticCurveTo(back.x, back.y, out.x, out.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** The caiman, its under-water part tinted, on the frame (the caller may have clipped it). */
export function drawCaiman(ctx: CanvasRenderingContext2D, cast: CaimanCast, c: CaimanPose, t: number, boil: number, view: View): void {
  const layer = cast.layer.getContext('2d')!;
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.clearRect(0, 0, VIDEO.width, VIDEO.height);
  paintParts(layer, cast, c, boil, view);
  sink(layer, c, view);
  ctx.drawImage(cast.layer, 0, 0);
  waterline(ctx, c, t, view);
}

/** The drops of water thrown up: small pale beads, stretched along their flight. */
export function drawSplashes(ctx: CanvasRenderingContext2D, t: number, view: View): void {
  for (const d of splashesAt(t)) {
    const q = toScreen(view, d);
    ctx.save();
    const r = d.r * view.zoom;
    ctx.globalAlpha = d.alpha;
    ctx.translate(q.x, q.y);
    ctx.rotate(d.dir);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.5, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#dfe8de';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawAlarm(ctx: CanvasRenderingContext2D, t: number, c: CaimanPose | null, view: View): void {
  const a = alarmAt(t);
  if (a <= 0 || !c) return;
  const q = toScreen(view, { x: c.x - 400, y: c.y - 200 });
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(-0.14);
  ctx.scale(a, a);
  drawTextLine(ctx, '!', 0, 80, 280 * view.zoom, 700, 1, { fill: RED, halo: '#fffaf0' });
  ctx.restore();
}
