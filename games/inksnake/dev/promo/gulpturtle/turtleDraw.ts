import { INK, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { bakeSprite, drawSprite, type Pt, type Sprite } from '../sprites';
import { toScreen, type View } from '../gulpcapy/camera';
import { domeTop } from './shape';
import { headU, type TurtlePose } from './story';
import { NECK_A, TURTLE_HEAD, TURTLE_LEG, TURTLE_TAIL, WATER_DROP } from './turtleLimbs';
import { PER_ART, SHELL_A, TURTLE_SHELL } from './turtleShell';
import { alarmAt, dropsAt, knockAt } from './words';

/** Draws the turtle, the water it sheds, the knocks on its shell and its "!" (story.ts has the poses). */

export interface TurtleCast {
  readonly carapace: Sprite;
  readonly under: Sprite;
  readonly calm: Sprite;
  readonly alarm: Sprite;
  readonly fore: Sprite;
  readonly hind: Sprite;
  readonly foreFar: Sprite;
  readonly hindFar: Sprite;
  readonly tail: Sprite;
  readonly drop: Sprite;
}

export function bakeTurtle(): TurtleCast {
  return {
    carapace: bakeSprite(TURTLE_SHELL, 'carapace', 7, 500),
    under: bakeSprite(TURTLE_SHELL, 'under', 7, 505),
    calm: bakeSprite(TURTLE_HEAD, 'calm', 7, 510),
    alarm: bakeSprite(TURTLE_HEAD, 'alarm', 7, 510),
    fore: bakeSprite(TURTLE_LEG, 'fore', 7, 520),
    hind: bakeSprite(TURTLE_LEG, 'hind', 7, 530),
    foreFar: bakeSprite(TURTLE_LEG, 'foreFar', 7, 525),
    hindFar: bakeSprite(TURTLE_LEG, 'hindFar', 7, 535),
    tail: bakeSprite(TURTLE_TAIL, 'tail', 7, 540),
    drop: bakeSprite(WATER_DROP, 'drop', 8, 550),
  };
}

/** Where the legs and the tail grow from: along the axis and above it (world units). */
const ROOT = {
  foreNear: { a: 318, h: -78 }, foreFar: { a: 280, h: -74 },
  hindNear: { a: 600, h: -74 }, hindFar: { a: 562, h: -70 },
  tail: { a: 692, h: -6 },
} as const;

/** Its axis place (a back from the nose, h up) to the world. */
function placer(c: TurtlePose): (a: number, h: number) => Pt {
  const rot = -c.tilt;
  const [cos, sin] = [Math.cos(rot), Math.sin(rot)];
  return (a, h) => ({ x: c.x - a * cos + h * sin, y: c.y - a * sin - h * cos });
}

export function drawTurtleShadow(ctx: CanvasRenderingContext2D, c: TurtlePose, view: View): void {
  const p = toScreen(view, placer(c)(455, -195 - c.lifted));
  ctx.save();
  ctx.globalAlpha = 0.28 * c.shadow;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(p.x + 10, p.y + 6, (330 - 0.5 * c.lifted) * view.zoom, 52 * view.zoom, -c.tilt * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawTurtle(ctx: CanvasRenderingContext2D, cast: TurtleCast, c: TurtlePose, boil: number, view: View): void {
  const at = placer(c);
  const rot = -c.tilt;
  const k = PER_ART * view.zoom;
  const place = (s: Sprite, a: number, h: number, rotation: number, extra = 1): void => {
    const q = toScreen(view, at(a, h));
    drawSprite(ctx, s, boil, { x: q.x, y: q.y, rotation, scale: k * extra });
  };
  // Trailing legs come up level with the body, so the lips can close round them.
  const lift = c.hindBack * 0.34;
  place(cast.hindFar, ROOT.hindFar.a + c.hindBack, ROOT.hindFar.h + lift, rot + c.hindFar, 0.96);
  place(cast.foreFar, ROOT.foreFar.a, ROOT.foreFar.h, rot + c.foreFar, 0.96);
  place(cast.tail, ROOT.tail.a + c.hindBack * 0.5, ROOT.tail.h + c.hindBack * 0.2, rot + c.tail);
  place(cast.under, SHELL_A, 0, rot);
  place(cast.hind, ROOT.hindNear.a + c.hindBack, ROOT.hindNear.h + lift, rot + c.hindNear);
  place(cast.fore, ROOT.foreNear.a, ROOT.foreNear.h, rot + c.foreNear);
  place(c.alarm ? cast.alarm : cast.calm, NECK_A + c.drawnIn, 0, rot + c.neck);
  place(cast.carapace, SHELL_A, 0, rot);
}

export function drawDrops(ctx: CanvasRenderingContext2D, cast: TurtleCast, t: number, boil: number, view: View): void {
  for (const f of dropsAt(t)) {
    const q = toScreen(view, f);
    drawSprite(ctx, cast.drop, boil, { x: q.x, y: q.y, rotation: f.rot, scale: PER_ART * view.zoom * 0.62 * f.size, alpha: f.alpha });
  }
}

/** Short ink strokes springing off the shell just ahead of the upper lip. */
export function drawKnock(ctx: CanvasRenderingContext2D, t: number, c: TurtlePose | null, view: View): void {
  const k = knockAt(t);
  if (!k || !c) return;
  const a = headU(t) + 75;
  const p = toScreen(view, placer(c)(a, domeTop(Math.min(690, a)) + 26));
  ctx.save();
  ctx.globalAlpha = k.alpha;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const th = -2.75 + i * 0.5;
    const [r0, r1] = [(22 + 60 * k.out) * view.zoom, (40 + (110 + (i % 2) * 24) * k.out) * view.zoom];
    ctx.lineWidth = (14 - 8 * k.out) * view.zoom;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(th) * r0, p.y + Math.sin(th) * r0);
    ctx.lineTo(p.x + Math.cos(th) * r1, p.y + Math.sin(th) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawAlarm(ctx: CanvasRenderingContext2D, t: number, c: TurtlePose | null, view: View): void {
  const a = alarmAt(t);
  if (a <= 0 || !c) return;
  const q = toScreen(view, placer(c)(425, 300));
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(-0.14);
  ctx.scale(a, a);
  drawTextLine(ctx, '!', 0, 0, 205 * view.zoom, 700, 1, { fill: RED, halo: '#fffaf0' });
  ctx.restore();
}
