import { C, xAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import { drawSwimmer, pointOn, type SwimLook } from '../gape/swimmer';
import { ramp, VIDEO } from '../short';
import type { Sprite } from '../sprites';
import { type LobsterPose, paintLobster } from './lobster';
import type { LobsterParts } from './parts';
import { cubic, type Pt } from './shell';

/** How strongly the lobster shows through the stretched skin. */
const SHOW = 0.5;
/** Its curled-up size, body units, fitted into the belly. */
const FIT = { w: 640, h: 440, cx: 104, cy: 34 } as const;

export interface BellyLayers {
  /** The lobster is painted here, then cut to the viper's silhouette. */
  readonly paint: CanvasRenderingContext2D;
  readonly mask: CanvasRenderingContext2D;
}

export function makeBellyLayers(): BellyLayers {
  const make = (): CanvasRenderingContext2D => {
    const c = document.createElement('canvas');
    c.width = VIDEO.width;
    c.height = VIDEO.height;
    return c.getContext('2d')!;
  };
  return { paint: make(), mask: make() };
}

/** Folded up in the belly: the tail tucked under, both claws in front of its face; now and then one snips. */
function curled(t: number, snip: number): LobsterPose {
  const breath = Math.sin(2 * Math.PI * 0.8 * t);
  return {
    joint: { x: 0, y: -10 },
    heading: 0.05 + 0.02 * breath,
    tailBend: -3.6,
    spread: 0.5,
    phase: 2 * Math.PI * t,
    tuck: [0.8, 0.8, 0.7, 0.7],
    claws: [
      { wrist: { x: 196, y: -6 }, angle: 0.1 + 0.05 * breath, open: 0.3, bend: -1 },
      { wrist: { x: 150, y: 96 }, angle: 0.12 - 0.05 * breath, open: 0.5 * (1 - snip) + 0.05, bend: 1 },
    ],
    antennae: [
      cubic({ x: 200, y: -12 }, { x: 240, y: -60 }, { x: 140, y: -150 }, { x: 0, y: -120 }, 24),
      cubic({ x: 206, y: 2 }, { x: 260, y: -40 }, { x: 180, y: -140 }, { x: 20, y: -100 }, 24),
    ],
    eyeTurn: 0,
    wide: 0,
  };
}

/** The swallowed lobster, seen faintly through the stretched skin, with a sheen over it. Cut to the viper's silhouette on its own canvas. */
export function drawBellyLobster(
  ctx: CanvasRenderingContext2D, layers: BellyLayers, parts: LobsterParts, viper: Sprite, you: Pose, look: SwimLook, t: number, boil: number, fade: number, snip: number,
): void {
  const b = look.belly;
  if (!b) return;
  const show = fade * ramp(b.size, 0.15, 0.7);
  if (show <= 0.01) return;
  const a = ANATOMY.viperfish;
  const x0 = xAt(a, b.at + b.width * 0.4);
  const x1 = xAt(a, b.at - b.width * 0.4);
  const cx = (x0 + x1) / 2;
  const rx = Math.abs(x1 - x0) / 2;
  const cy = C + a.hh * 0.22;
  const ry = a.hh * 0.66;
  const at = (x: number, y: number): Pt => pointOn(viper, you, look, { x, y });
  const top = at(cx, cy - ry);
  const bottom = at(cx, cy + ry);
  const front = at(cx + rx, cy);
  const back = at(cx - rx, cy);
  const centre = at(cx, cy);
  const half = Math.hypot(bottom.x - top.x, bottom.y - top.y) / 2;
  const long = Math.hypot(front.x - back.x, front.y - back.y) / 2;
  const angle = Math.atan2(front.y - back.y, front.x - back.x);

  const { paint, mask } = layers;
  mask.setTransform(1, 0, 0, 1, 0, 0);
  mask.clearRect(0, 0, VIDEO.width, VIDEO.height);
  drawSwimmer(mask, viper, you, boil, { ...look, part: 'body' });
  paint.clearRect(0, 0, VIDEO.width, VIDEO.height);
  paint.save();
  paint.translate(centre.x, centre.y);
  paint.rotate(angle);
  const k = Math.min((2 * long) / FIT.w, (2 * half) / FIT.h);
  paint.scale(k, k);
  paint.translate(-FIT.cx, -FIT.cy);
  paintLobster(paint, parts, curled(t, snip), boil);
  paint.restore();
  cut(paint, mask, centre, angle, long * 1.05, half * 1.0);
  ctx.save();
  ctx.globalAlpha = SHOW * show;
  ctx.drawImage(paint.canvas, 0, 0);
  ctx.restore();

  // The stretched skin's sheen over it, high on the belly.
  paint.clearRect(0, 0, VIDEO.width, VIDEO.height);
  const lit = at(cx + rx * 0.1, cy - ry * 0.55);
  const g = paint.createRadialGradient(lit.x, lit.y, 0, lit.x, lit.y, half * 1.3);
  g.addColorStop(0, 'rgba(232,240,255,0.5)');
  g.addColorStop(0.5, 'rgba(232,240,255,0.16)');
  g.addColorStop(1, 'rgba(232,240,255,0)');
  paint.fillStyle = g;
  paint.fillRect(0, 0, VIDEO.width, VIDEO.height);
  cut(paint, mask, centre, angle, long * 1.05, half * 1.0);
  ctx.save();
  ctx.globalAlpha = 0.5 * show;
  ctx.drawImage(paint.canvas, 0, 0);
  ctx.restore();
}

/** Keeps only what lies inside the viper and the belly, softly faded at the belly's edge. */
function cut(paint: CanvasRenderingContext2D, mask: CanvasRenderingContext2D, centre: Pt, angle: number, rx: number, ry: number): void {
  paint.save();
  paint.globalCompositeOperation = 'destination-in';
  paint.drawImage(mask.canvas, 0, 0);
  paint.translate(centre.x, centre.y);
  paint.rotate(angle);
  paint.scale(rx, ry);
  const g = paint.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.78, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  paint.fillStyle = g;
  paint.fillRect(-2, -2, 4, 4);
  paint.restore();
}
