import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import { drawYou } from '../everysize/hud';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { caption, FULL, RED, RED_MOUTH, sticker, water, YELLOW } from '../thumbnailKit';
import { traceShark } from './art/contract';
import { prepareSharks, sharks } from './art/roster';
import { drawYouFigure } from './art/you';

/**
 * The thumbnails for the tenth long-form video, "Shark Size Comparison… But
 * Every Shark Is Real" (script.md's Packaging: Test & Compare takes all
 * three). Captions in the cartoon face, X not ×.
 * - giant: the whale shark's head and open mouth filling the frame, cropped
 *          by the right edge, a tiny "you" diver under the yellow arrow, "41 FT";
 * - myth:  the great white (the game's light-ink shark, red mouth) in front of
 *          a dashed 30 ft ghost that gets a red cross, "NOT 30 FT";
 * - age:   the Greenland shark's head close up, dark teal on a hot orange
 *          rim light, its pale eye near the middle, "512 YEARS?".
 */
export const SHARKSIZE_THUMBNAILS = ['giant', 'myth', 'age'] as const;
export type SharksizeThumbnail = (typeof SHARKSIZE_THUMBNAILS)[number];

const W = 1280;
const H = 720;
const CARTOON = '400 46px "Luckiest Guy"';
const BLACK = '#111014';

/** Two words side by side in the cartoon face, each its own colour, centred on x. */
function twoTone(ctx: CanvasRenderingContext2D, a: string, aFill: string, b: string, bFill: string, x: number, y: number, size: number): void {
  ctx.save();
  ctx.font = `400 ${size}px "Luckiest Guy"`;
  const gap = size * 0.25;
  const wa = ctx.measureText(a).width;
  const wb = ctx.measureText(b).width;
  ctx.restore();
  const left = x - (wa + gap + wb) / 2;
  caption(ctx, a, left + wa / 2, y, size, wa + 4, aFill, 'cartoon');
  caption(ctx, b, left + wa + gap + wb / 2, y, size, wb + 4, bFill, 'cartoon');
}

/** A fat red X, black-edged, centred at (x, y). */
function cross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const s = size / 2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,10,30,0.6)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  for (const [w, colour] of [[size * 0.26, BLACK], [size * 0.17, RED]] as const) {
    ctx.lineWidth = w;
    ctx.strokeStyle = colour;
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.stroke();
    ctx.shadowColor = 'transparent';
  }
  ctx.restore();
}

/** Rewrites the pixels of `c` inside `box` that `pick` accepts with what `paint` returns (r, g, b), alpha kept. */
function recolor(
  c: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number },
  pick: (r: number, g: number, b: number) => boolean, paint: (x: number, y: number, r: number, g: number, b: number) => readonly [number, number, number],
): void {
  const image = c.getImageData(box.x, box.y, box.w, box.h);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3]! < 10 || !pick(px[i]!, px[i + 1]!, px[i + 2]!)) continue;
    const k = i / 4;
    const [r, g, b] = paint(box.x + (k % box.w), box.y + Math.floor(k / box.w), px[i]!, px[i + 1]!, px[i + 2]!);
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  }
  c.putImageData(image, box.x, box.y);
}

const lum = (r: number, g: number, b: number): number => (0.3 * r + 0.59 * g + 0.11 * b) / 255;

const GIANT_POSE = { x: 420, y: 300, length: 4200, gulp: 1, t: 0, beat: 0, tilt: 0.06 } as const;
/** Round the open mouth at GIANT_POSE (found on the render). */
const MOUTH_BOX = { x: 395, y: 351, w: 330, h: 230 } as const;

function drawGiant(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 300, y: 0 });
  // The whale shark faces left, its snout tip placed; the body runs off the right edge.
  const whale = sharks().whaleShark;
  sticker(ctx, (c) => {
    whale.draw(c, GIANT_POSE);
    // The throat painted warm red, darkest deep inside, so the open mouth reads at 168 px.
    recolor(c, MOUTH_BOX, (r, g, b) => lum(r, g, b) < 0.32, (x, y, r, g, b) => {
      const deep = Math.min(1, Math.max(0, (x - MOUTH_BOX.x) / MOUTH_BOX.w));
      const shade = 0.55 + 1.6 * lum(r, g, b);
      return [Math.min(255, (235 - 120 * deep) * shade), Math.min(255, (60 - 30 * deep) * shade), Math.min(255, (78 - 30 * deep) * shade)];
    });
  }, { outline: 6 });
  // The tiny diver in front of the mouth, under the fat arrow.
  const feet = { x: 200, y: 640 };
  ctx.save();
  const glow = ctx.createRadialGradient(feet.x, feet.y - 60, 10, feet.x, feet.y - 60, 170);
  glow.addColorStop(0, 'rgba(255,226,80,0.75)');
  glow.addColorStop(1, 'rgba(255,210,31,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 380, 420, 340);
  ctx.restore();
  sticker(ctx, (c) => drawYouFigure(c, feet.x, feet.y, 125, 0), { outline: 4 });
  drawYou(ctx, feet.x, feet.y - 140, 0, 1, 0.85, CARTOON);
  caption(ctx, '41 FT', 300, 110, 150, 520, YELLOW, 'cartoon');
}

let white: Sprite | null = null;

function drawMyth(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 0 });
  // The 30 ft ghost: a dashed white outline, 1.54 times the real record, behind it.
  ghost(ctx, 40, 250, 1950);
  // The real great white, mouth wide open, in front.
  white ??= makeSprite('shark', 8, 'light', { ...ANATOMY.shark, wash: '#6f93b4' });
  const pose: Pose = { j: 0, age: 0, shape: 'shark', x: 960, y: 400, length: 1270, facing: -1, tilt: 0.05, beat: 0.6, effort: 0.4 };
  sticker(ctx, (c) => drawSwimmer(c, white!, pose, 0, { jaw: 1, mouth: { ...RED_MOUTH, teeth: true } }), { outline: 6 });
  cross(ctx, 190, 215, 190);
  twoTone(ctx, 'NOT', '#ffffff', '30 FT', YELLOW, 520, 645, 130);
}

/** The ghost outline facing left, snout tip at (x, y): a pale fill and a fat dashed white line. */
function ghost(ctx: CanvasRenderingContext2D, x: number, y: number, len: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  traceShark(ctx, len, { depth: 0.22, head: 'long' });
  ctx.fillStyle = 'rgba(230,248,255,0.22)';
  ctx.fill('evenodd');
  ctx.setLineDash([46, 26]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 22;
  ctx.strokeStyle = BLACK;
  ctx.stroke();
  ctx.lineWidth = 13;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}

const AGE_POSE = { x: 250, y: 470, length: 5000, gulp: 0, t: 0, beat: 0, tilt: 0.04 } as const;
/** The eye at AGE_POSE (found on the render): centre and radius. */
const AGE_EYE = { x: 629, y: 341, r: 58 } as const;

function drawAge(ctx: CanvasRenderingContext2D): void {
  // Cold teal water, a hot orange rim light from the top right.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, '#2ab4dc');
  wash.addColorStop(1, '#0d5f86');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  const hot = ctx.createRadialGradient(1100, 40, 30, 1100, 40, 820);
  hot.addColorStop(0, 'rgba(255,160,40,1)');
  hot.addColorStop(0.5, 'rgba(255,110,30,0.6)');
  hot.addColorStop(1, 'rgba(255,110,30,0)');
  ctx.fillStyle = hot;
  ctx.fillRect(0, 0, W, H);
  const greenland = sharks().greenland;
  sticker(ctx, (c) => {
    greenland.draw(c, AGE_POSE);
    // No copepod (no parasites on this channel): its pale strand under the eye becomes skin.
    const e = AGE_EYE;
    recolor(c, { x: Math.round(e.x - e.r * 2.5), y: Math.round(e.y - e.r), w: Math.round(e.r * 5), h: Math.round(e.r * 5) },
      (r, g, b) => lum(r, g, b) > 0.4, () => [44, 47, 46]);
    recolor(c, { x: Math.round(e.x - e.r), y: Math.round(e.y + e.r * 1.1), w: Math.round(e.r * 2.5), h: Math.round(e.r * 3) },
      (r, g, b) => lum(r, g, b) > 0.21, () => [44, 47, 46]);
    // Cold teal over the skin, the orange rim along the back.
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(40,110,125,0.3)';
    c.fillRect(0, 0, W, H);
    const rim = c.createLinearGradient(0, 40, 0, 260);
    rim.addColorStop(0, 'rgba(255,140,40,0.7)');
    rim.addColorStop(1, 'rgba(255,140,40,0)');
    c.fillStyle = rim;
    c.fillRect(0, 0, W, H);
    c.restore();
    eye(c, e.x, e.y, e.r);
  }, { outline: 8 });
  caption(ctx, '512 YEARS?', 560, 630, 150, 940, YELLOW, 'cartoon');
}

/** The old eye, pale and clouded but glowing: a halo, a milky iris, a dark pupil, a catchlight. */
function eye(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.save();
  const halo = c.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
  halo.addColorStop(0, 'rgba(210,255,250,0.85)');
  halo.addColorStop(1, 'rgba(200,255,250,0)');
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = halo;
  c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  c.globalCompositeOperation = 'source-over';
  c.lineWidth = r * 0.16;
  c.strokeStyle = BLACK;
  const iris = c.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
  iris.addColorStop(0, '#f2fffc');
  iris.addColorStop(1, '#8fc9cf');
  c.fillStyle = iris;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = 'rgba(20,40,50,0.85)';
  c.beginPath();
  c.arc(x + r * 0.08, y + r * 0.05, r * 0.42, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(x - r * 0.3, y - r * 0.32, r * 0.2, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export async function drawSharksizeThumbnail(ctx: CanvasRenderingContext2D, id: SharksizeThumbnail): Promise<void> {
  await prepareSharks();
  ctx.save();
  if (id === 'giant') drawGiant(ctx);
  else if (id === 'myth') drawMyth(ctx);
  else drawAge(ctx);
  ctx.restore();
}
