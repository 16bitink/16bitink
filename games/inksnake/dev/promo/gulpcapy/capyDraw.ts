import { INK, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { bakeSprite, drawSprite, type Pt, type Sprite } from '../sprites';
import { CAPY_BODY, CAPY_HEAD, CAPY_LEG, CAPY_TUFT, JOINTS, PER_ART } from './capyArt';
import { toScreen, type View } from './camera';
import type { CapyPose } from './story';
import { alarmAt, tuftsAt } from './words';

/** Draws the capybara, the fur it loses and its "!" (story.ts has the poses). */

export interface CapyCast {
  readonly body: Sprite;
  readonly calm: Sprite;
  readonly alarm: Sprite;
  readonly fore: Sprite;
  readonly hind: Sprite;
  readonly tuft: Sprite;
}

export function bakeCapy(): CapyCast {
  return {
    body: bakeSprite(CAPY_BODY, 'body', 7, 500),
    calm: bakeSprite(CAPY_HEAD, 'calm', 7, 510),
    alarm: bakeSprite(CAPY_HEAD, 'alarm', 7, 510),
    fore: bakeSprite(CAPY_LEG, 'fore', 7, 520),
    hind: bakeSprite(CAPY_LEG, 'hind', 7, 530),
    tuft: bakeSprite(CAPY_TUFT, 'tuft', 8, 540),
  };
}

/** Its axis place `a` (world units from the nose), `y` art units down from it, to the world. */
function placer(c: CapyPose): (a: number, y: number) => Pt {
  const rot = -c.tilt;
  const [cos, sin] = [Math.cos(rot), Math.sin(rot)];
  return (a, y) => {
    const lx = -a;
    const ly = y * PER_ART;
    return { x: c.x + lx * cos - ly * sin, y: c.y + lx * sin + ly * cos };
  };
}

export function drawCapyShadow(ctx: CanvasRenderingContext2D, c: CapyPose, view: View): void {
  const at = placer(c);
  const p = toScreen(view, at(430, 30));
  ctx.save();
  ctx.globalAlpha = 0.26 * c.shadow;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(p.x + 12, p.y + 16, 360 * view.zoom, 60 * view.zoom, -c.tilt * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCapy(ctx: CanvasRenderingContext2D, cast: CapyCast, c: CapyPose, boil: number, view: View): void {
  const at = placer(c);
  const rot = -c.tilt;
  const k = PER_ART * view.zoom;
  const place = (s: Sprite, a: number, y: number, rotation: number, extra = 1, alpha = 1): void => {
    const q = toScreen(view, at(a, y));
    drawSprite(ctx, s, boil, { x: q.x, y: q.y, rotation, scale: k * extra, alpha });
  };
  const shudder = 1 + 0.02 * c.shudder;
  const hindA = (j: { a: number }): number => j.a + c.hindBack;
  // The far legs, in shade behind the body.
  ctx.save();
  ctx.filter = 'brightness(0.72)';
  place(cast.hind, hindA(JOINTS.hindFar), JOINTS.hindFar.y, rot + c.hindFar, 0.96);
  place(cast.fore, JOINTS.foreFar.a, JOINTS.foreFar.y, rot + c.foreFar, 0.96);
  ctx.restore();
  place(cast.body, JOINTS.body.a, JOINTS.body.y, rot, shudder);
  place(cast.hind, hindA(JOINTS.hindNear), JOINTS.hindNear.y, rot + c.hindNear);
  place(cast.fore, JOINTS.foreNear.a, JOINTS.foreNear.y, rot + c.foreNear);
  place(c.alarm ? cast.alarm : cast.calm, JOINTS.neck.a, JOINTS.neck.y, rot + c.neck);
}

export function drawTufts(ctx: CanvasRenderingContext2D, cast: CapyCast, t: number, boil: number, view: View): void {
  for (const f of tuftsAt(t)) {
    const q = toScreen(view, f);
    drawSprite(ctx, cast.tuft, boil, { x: q.x, y: q.y, rotation: f.rot, scale: PER_ART * view.zoom * f.size, alpha: f.alpha });
  }
}

export function drawAlarm(ctx: CanvasRenderingContext2D, t: number, c: CapyPose | null, view: View): void {
  const a = alarmAt(t);
  if (a <= 0 || !c) return;
  const q = toScreen(view, { x: c.x - 470, y: c.y - 250 });
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(-0.14);
  ctx.scale(a, a);
  drawTextLine(ctx, '!', 0, 80, 280 * view.zoom, 700, 1, { fill: RED, halo: '#fffaf0' });
  ctx.restore();
}
