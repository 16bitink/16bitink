import { createRng } from '../../../src/logic/rng';
import { makeDraw, pt, ribbon } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { cub } from '../../../src/art/kit';
import { glaze } from '../../../src/art/critters/birdKit';
import { greyPlumage } from '../../../src/art/chapters/savannaBossPaint';
import { VIDEO } from '../short';
import { drawBird } from './bird';
import { BG_PAD, type Cast } from './cast';
import { type HeadLook, NAPE, paintSecHead } from './head';
import { SB } from './paint';
import { blinkLidAt, bobAt, crestAt, eyeZoom, faceZoom, lashLidAt, legArrowAt, sparkleAt, streakAt, tiltAt, wrap } from './story';
import { golden, vignette } from './world';

/**
 * The other shots: meeting the bird standing tall (the camera tilting down
 * its long legs), its face close with the lashes fluttering, and the eye
 * huge for the blink.
 */
const MEET_AT = pt(630, 1200);
const MEET_SCALE = 5.4;

function inkArrow(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, k: number): void {
  if (k <= 0) return;
  const end = pt(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
  const head = (p: Pt, dir: number): Pt[] => [pt(p.x + Math.cos(dir + 2.5) * 40, p.y + Math.sin(dir + 2.5) * 40), p, pt(p.x + Math.cos(dir - 2.5) * 40, p.y + Math.sin(dir - 2.5) * 40)];
  const dir = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [w, c] of [[20, '#fff6e4'], [9, '#1b1a1f']] as const) {
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    for (const line of [[a, end], head(a, dir + Math.PI), ...(k > 0.97 ? [head(b, dir)] : [])]) {
      ctx.beginPath();
      line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** "Meet the secretary bird. Long legs,": standing tall at golden hour, then the camera tilting down to its legs. */
export function drawMeet(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  const tilt = tiltAt(t);
  ctx.save();
  const zoom = 1 + 0.12 * tilt;
  ctx.translate(540, 1300 - 360 * tilt);
  ctx.scale(zoom, zoom);
  ctx.translate(-540, -1300);
  ctx.drawImage(cast.bg.meet, -BG_PAD, -BG_PAD);
  // The ground carried on below the backdrop for the tilt down.
  ctx.drawImage(cast.bg.meet, 0, cast.bg.meet.height - 4, cast.bg.meet.width, 4, -BG_PAD, cast.bg.meet.height - BG_PAD - 2, cast.bg.meet.width, 900);
  const breathe = Math.sin(u * 3) * 0.6;
  drawBird(ctx, {
    at: pt(MEET_AT.x, MEET_AT.y + breathe), scale: MEET_SCALE, tilt: -0.1, wings: 0, ground: 66 - breathe / MEET_SCALE,
    head: { at: pt(34, -49 - 4 * bobAt(t)), ang: -0.06 - 0.12 * bobAt(t), look: { lid: 0, crest: crestAt(t) } },
    near: { foot: pt(10, 66), grip: 'flat' }, far: { foot: pt(-9, 66), grip: 'flat', toe: 0.05 },
  }, boil);
  const x = MEET_AT.x + 34 * MEET_SCALE;
  inkArrow(ctx, pt(x, MEET_AT.y + 14 * MEET_SCALE), pt(x, MEET_AT.y + 64 * MEET_SCALE), legArrowAt(t));
  ctx.restore();
  golden(ctx, 0.3);
  vignette(ctx, 0.4);
}

/** A warm, soft backdrop for the close-ups: sky glow and out-of-focus light. */
function glow(ctx: CanvasRenderingContext2D, seed: number, pink: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#f3b36c');
  g.addColorStop(0.5, pink > 0 ? '#f0a08a' : '#e89a5c');
  g.addColorStop(1, '#a7543a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const rng = createRng(seed);
  for (let i = 0; i < 16; i++) {
    const r = 40 + rng() * 90;
    ctx.fillStyle = `rgba(255,236,190,${0.12 + rng() * 0.18})`;
    ctx.beginPath();
    ctx.arc(rng() * VIDEO.width, rng() * VIDEO.height, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The head close, eye at `eye`, `scale` px per unit, with its neck running off the bottom of the frame. */
function closeHead(ctx: CanvasRenderingContext2D, eye: Pt, scale: number, ang: number, look: HeadLook, boil: number): void {
  ctx.save();
  ctx.translate(eye.x, eye.y);
  ctx.scale(scale, scale);
  ctx.rotate(ang);
  const d = makeDraw(ctx, 8801 + boil * 17, boil, 0, SB.line);
  const neck = ribbon(cub(pt(NAPE.x + 1, NAPE.y - 2), pt(NAPE.x - 3, NAPE.y + 12), pt(-16, 34), pt(-22, 60), 14), (u) => 13 + u * 8).shape;
  greyPlumage(d, neck, createRng(8802), { n: 70, size: 3.4, dir: () => Math.PI / 2 + 0.5, line: 0.4 });
  d.pen.clipped(neck, () => glaze(d, -6, 20, 8, 16, 0.4, SB.white, 0.4));
  paintSecHead(d, look);
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, at: Pt, r: number, k: number): void {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(k, k);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.22;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#fffbea';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#c98a2a';
  ctx.stroke();
  ctx.restore();
}

/** "movie-star eyelashes…": the face close, the lashes fluttering, a twinkle off them. */
export function drawFace(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const u = wrap(t);
  glow(ctx, 41, 1);
  const s = 34 * faceZoom(t);
  const eye = pt(430, 900);
  closeHead(ctx, eye, s, 0.05, { lid: lashLidAt(t), crest: 1 }, boil);
  const k = sparkleAt(t);
  const tw = (i: number): number => k * (0.75 + 0.25 * Math.sin(u * 9 + i * 2));
  sparkle(ctx, pt(eye.x + 2.6 * s, eye.y - 5.2 * s), 46, tw(0));
  sparkle(ctx, pt(eye.x - 1.4 * s, eye.y - 5.8 * s), 34, tw(1));
  sparkle(ctx, pt(eye.x + 4.4 * s, eye.y - 3.0 * s), 28, tw(2));
  vignette(ctx, 0.35);
}

/** "That's ten times faster than a blink!": the eye huge, speed streaks on "faster", and the blink. */
export function drawBlink(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  glow(ctx, 43, 0);
  const z = eyeZoom(t);
  closeHead(ctx, pt(400, 930), 40 * z, 0.04, { lid: blinkLidAt(t), crest: 1 }, boil);
  const k = streakAt(t);
  if (k > 0) {
    const rng = createRng(77);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const y = i % 2 === 0 ? 600 + rng() * 110 : 1180 + rng() * 160;
      const x = 40 + rng() * 260;
      const len = (220 + rng() * 300) * k;
      ctx.globalAlpha = 0.85 * k;
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#fff6e4';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#1b1a1f';
      ctx.stroke();
    }
    ctx.restore();
  }
  vignette(ctx, 0.4);
}
