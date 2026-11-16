import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import { drawBlueWhale } from '../foodchain/art/blueWhale';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { caption, divider, FULL, RED_MOUTH, sticker, water, YELLOW, type Rect } from '../thumbnailKit';
import { LARVA } from './art/larva';
import { prepareHeroes } from './heroes';
import { drawYou } from './hud';
import { drawAt } from './scenes';

/**
 * The thumbnails for the ninth long-form video, "How Long You'd Last at
 * Every Size in the Ocean" (plan.md's Packaging: Test & Compare takes all
 * three). Captions in the cartoon face, X not ×.
 * - ends:   the two ends split: the larva tiny on a giant stopwatch, "12 DAYS" |
 *           the blue whale's eye cropped by the frame, "47 YEARS";
 * - you:    a giant red mouth cropped by the frame, a small bright sardine in
 *           front of it under the fat yellow YOU arrow, "HOW LONG?";
 * - ladder: five animals smallest to biggest on one line, each with a
 *           stopwatch tag, the whale cut off by the frame, "0.2 IN → 100 FT".
 */
export const EVERYSIZE_THUMBNAILS = ['ends', 'you', 'ladder'] as const;
export type EverysizeThumbnail = (typeof EVERYSIZE_THUMBNAILS)[number];

const W = 1280;
const H = 720;
const CARTOON = '400 46px "Luckiest Guy"';

/** A thumbnail stopwatch: steel case, paper face, red hand, a label under it. */
function stopwatch(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hand: number, label?: string): void {
  ctx.save();
  ctx.lineWidth = Math.max(3, r * 0.08);
  ctx.strokeStyle = '#111';
  ctx.fillStyle = '#c9ccd2';
  ctx.beginPath();
  ctx.roundRect(x - r * 0.2, y - r * 1.38, r * 0.4, r * 0.32, r * 0.06);
  ctx.fill();
  ctx.stroke();
  const steel = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  steel.addColorStop(0, '#f4f6f8');
  steel.addColorStop(1, '#7d838c');
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4eddc';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a) * r * 0.78, y - Math.cos(a) * r * 0.78);
    ctx.lineTo(x + Math.sin(a) * r * 0.92, y - Math.cos(a) * r * 0.92);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(216,49,43,0.3)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r * 0.72, -Math.PI / 2, -Math.PI / 2 + hand);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d8312b';
  ctx.lineWidth = Math.max(3, r * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(hand) * r * 0.8, y - Math.cos(hand) * r * 0.8);
  ctx.stroke();
  ctx.restore();
  if (label) caption(ctx, label, x, y + r * 1.55, Math.max(22, r * 0.5), r * 3, '#ffffff', 'cartoon');
}

function drawEnds(ctx: CanvasRenderingContext2D): void {
  const left: Rect = { x: 0, y: 0, width: W / 2, height: H };
  const right: Rect = { x: W / 2, y: 0, width: W / 2, height: H };
  water(ctx, left, { x: 300, y: 0 });
  water(ctx, right, { x: 900, y: 0 });
  // Left: the stopwatch, huge, the larva tiny on its face.
  stopwatch(ctx, 320, 410, 215, Math.PI * 0.3);
  sticker(ctx, (c) => LARVA.draw(c, 300, 470, 250, -0.1, 0, { beat: 1, frame: 0 }), { outline: 6, clip: left });
  // Right: the blue whale's eye, the head cropped by the frame.
  ctx.save();
  ctx.beginPath();
  ctx.rect(right.x, right.y, right.width, right.height);
  ctx.clip();
  drawBlueWhale(ctx, 3450, 300, 9000, Math.PI - 0.05, 0, { tail: 0 }, true);
  ctx.restore();
  divider(ctx, W / 2);
  caption(ctx, '12 DAYS', 320, 110, 112, 560, YELLOW, 'cartoon');
  caption(ctx, '47 YEARS', 960, 110, 112, 560, YELLOW, 'cartoon');
}

let shark: Sprite | null = null;
let sardine: Sprite | null = null;

function drawYouThumb(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 400, y: 0 });
  // The giant mouth, cropped by the frame on the right.
  shark ??= makeSprite('shark', 8, 'light', { ...ANATOMY.shark, wash: '#6f93b4' });
  const pose: Pose = { j: 0, age: 0, shape: 'shark', x: 1330, y: 330, length: 1750, facing: -1, tilt: -0.08, beat: 0.6, effort: 0.4 };
  drawSwimmer(ctx, shark, pose, 0, { jaw: 1, mouth: { ...RED_MOUTH, teeth: true } });
  // The small bright fish in front of it.
  sardine ??= makeSprite('sardine', 6);
  const glow = ctx.createRadialGradient(260, 520, 20, 260, 520, 220);
  glow.addColorStop(0, 'rgba(255,226,80,0.85)');
  glow.addColorStop(1, 'rgba(255,210,31,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 200, 700, 520);
  sticker(ctx, (c) => drawSwimmer(c, sardine!, { j: 0, age: 0, shape: 'sardine', x: 260, y: 520, length: 260, facing: 1, tilt: 0.06, beat: 1.2, effort: 0.8 }, 0), { outline: 7 });
  drawYou(ctx, 260, 450, 0, 1, 1.05, CARTOON);
  caption(ctx, 'HOW LONG?', 400, 110, 120, 700, '#ffffff', 'cartoon');
}

function drawLadder(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 0 });
  const y = 440;
  const slots = [
    { body: 'larva', x: 95, len: 140, tag: '12 DAYS', hand: 5.6 },
    { body: 'sardine', x: 285, len: 180, tag: '5 MO', hand: 4.2 },
    { body: 'tuna', x: 520, len: 260, tag: '3 YRS', hand: 3 },
    { body: 'white', x: 850, len: 360, tag: '12 YRS', hand: 1.8 },
    { body: 'whale', x: 1450, len: 1050, tag: '47 YRS', hand: 0.7 },
  ] as const;
  for (const s of slots) {
    sticker(ctx, (c) => drawAt(c, s.body, s.x, y, s.len, s.body === 'whale' ? -1 : 1, 0.4), { outline: 5 });
  }
  slots.forEach((s, i) => stopwatch(ctx, i === 4 ? 1150 : s.x, 210, 56, s.hand, s.tag));
  caption(ctx, '0.2 IN → 100 FT', 560, 640, 96, 1000, YELLOW, 'cartoon');
}

export async function drawEverysizeThumbnail(ctx: CanvasRenderingContext2D, id: EverysizeThumbnail): Promise<void> {
  await prepareHeroes();
  ctx.save();
  if (id === 'ends') drawEnds(ctx);
  else if (id === 'you') drawYouThumb(ctx);
  else drawLadder(ctx);
  ctx.restore();
}
