import type { Pt } from '../../../src/art/pen';
import { INK, PAPER } from '../../../src/art/pen';
import { blob, hash } from '../alvin/art/draw';
import { drawTextLine } from '../captions';
import { lerp, ramp, VIDEO } from '../short';
import { drawEel, drop } from './art/eel';
import { glasses } from './art/props';
import { drawResearcher, glove, type Person } from './art/researcher';
import { drawSeal, type SealPose } from './art/seal';
import { EEL_W } from './art/sealFace';
import { drawBeach } from './scenery';
import { TEXT } from './script';
import {
  CATCH_AT, fineAt, FINE_AT, hookAt, pullAt, PULL2_AT, questionAt, rowAt, rowUp, SCIENTISTS_AT, SEEN_AT, sneezeAge, STARTS, trendAt, TREND_AT, wrap,
} from './story';

/** The beach scenes: the hook, the line-up, the pull, "Totally fine" and the trend (the other two are in ./cutaways). */

const W = VIDEO.width;

export const ANA = { skin: '#c98a5e', hair: '#2b1a12', shirt: '#2f8f8a', cap: '#2b4f7e', style: 'ponytail' } as const;
export const BEN = { skin: '#eebf98', hair: '#6a3d20', shirt: '#e0d2ac', cap: '#a94f2c', style: 'beard' } as const;

/** A screen point in a seal's head units (through its head's tilt and shift). */
export function toHead(p: SealPose, q: Pt): Pt {
  const u = { x: (q.x - p.x) / p.scale - (p.dx ?? 0), y: (q.y - p.y) / p.scale - (p.dy ?? 0) - 120 };
  const [c, s] = [Math.cos(-(p.tilt ?? 0)), Math.sin(-(p.tilt ?? 0))];
  return { x: u.x * c - u.y * s, y: u.x * s + u.y * c + 120 };
}

export function drawHook(ctx: CanvasRenderingContext2D, t: number): void {
  drawBeach(ctx, t, { horizon: 560, shore: 872 });
  drawSeal(ctx, hookAt(t));
  const q = questionAt(t);
  if (q > 0) {
    ctx.save();
    ctx.translate(946, TEXT.question.y);
    ctx.rotate(0.16);
    drawTextLine(ctx, '?', 0, 0, TEXT.question.size, 700, q, { fill: INK, halo: PAPER });
    ctx.restore();
  }
}

export function drawRow(ctx: CanvasRenderingContext2D, t: number): void {
  const u = wrap(t);
  const back = ramp(u, STARTS.row, STARTS.row + 0.55);
  drawBeach(ctx, t, { horizon: lerp(560, 520, back), shore: lerp(872, 690, back) });
  // Two scientists step in behind them, amazed.
  const inA = ramp(u, SCIENTISTS_AT - 0.2, SCIENTISTS_AT + 0.3);
  const wow = u > SEEN_AT;
  const people: readonly Person[] = [
    { ...BEN, x: 340 - 60 * (1 - inA), y: 566 + 190 * (1 - inA), scale: 0.92, turn: u > SEEN_AT + 0.5 ? 0.8 : -0.1, down: 0.7, mood: wow ? 'oh' : 'smile', tilt: 0.05 },
    { ...ANA, x: 132 - 60 * (1 - inA), y: 590 + 200 * (1 - inA), scale: 1.12, turn: u > SEEN_AT + 0.4 ? 0.8 : 0.2, down: 0.8, mood: wow ? 'oh' : 'smile', tilt: -0.05 },
  ];
  for (const p of people) drawResearcher(ctx, p);
  const row = rowAt(t);
  for (let k = row.length - 1; k >= 0; k--) {
    const up = rowUp(k, t);
    if (up <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = up;
    drawSeal(ctx, row[k]!);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the pull

export function drawPull(ctx: CanvasRenderingContext2D, t: number): void {
  const u = wrap(t);
  const p = pullAt(t);
  const shake = p.popAge > 0 ? 12 * Math.exp(-p.popAge * 9) * Math.sin(p.popAge * 70) : 0;
  ctx.save();
  ctx.translate(shake, 0);
  drawBeach(ctx, t, { horizon: 520, shore: 760 });
  // The holder leans in behind the seal, a hand on each side of its neck.
  const come = 1 - p.hold;
  const holder: Person = {
    ...ANA, x: 300 + 8 * p.tug, y: 552 + 150 * come, scale: 1.36, turn: 0.5, down: 0.9, tilt: 0.06 * p.tug, mood: p.popAge > 0 ? 'oh' : 'smile',
    handL: { x: lerp(10, 70, p.hold) + 22 * p.tug, y: lerp(700, 880, p.hold) }, handR: { x: lerp(640, 552, p.hold) + 22 * p.tug, y: lerp(700, 860, p.hold) }, bowL: 30, bowR: 30,
  };
  const puller: Person = {
    ...BEN, x: 884 + 10 * p.tug + 380 * p.fall, y: 742 + 330 * p.fall, scale: 1.68, kneel: true, turn: -0.85, down: p.popAge > 0 ? -0.4 : 0.8, tilt: -0.06 + 0.1 * p.tug, lean: p.lean,
    mood: p.popAge > 0 ? 'oh' : p.tug > 0.1 && u > PULL2_AT - 0.1 ? 'strain' : 'smile', handL: p.handA, handR: p.handB, grip: true, bowL: 12, bowR: 20,
  };
  drawResearcher(ctx, holder);
  drawResearcher(ctx, puller, 'behind');
  if (p.eelHead) {
    drawSeal(ctx, p.seal);
    drawEel(ctx, p.eel, { width: EEL_W * p.seal.scale, ink: 3.6, head: true, alarm: 1, slide: 10 });
    popBurst(ctx, p.nostril, p.popAge);
  } else {
    drawSeal(ctx, { ...p.seal, eel: { spine: p.eel.map((q) => toHead(p.seal, q)), slide: (p.out / p.seal.scale) % 1e6 } });
  }
  // Her fingers come round the sides of its head from behind.
  if (p.hold > 0.6) {
    const a = p.seal.tilt ?? 0;
    glove(ctx, { x: 52 + 22 * p.tug, y: 946 }, 0.55 + a, 1.5, false, 1);
    glove(ctx, { x: 580 + 22 * p.tug, y: 936 }, Math.PI - 0.5 + a, 1.5, false, -1);
  }
  drawResearcher(ctx, puller, 'arms');
  ctx.restore();
}

function popBurst(ctx: CanvasRenderingContext2D, at: Pt, age: number): void {
  if (age > 0.6) return;
  const k = age / 0.6;
  ctx.save();
  ctx.strokeStyle = `rgba(255,252,238,${0.95 * (1 - k)})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const a = -2.5 + i * 0.36;
    const [r0, r1] = [60 + 190 * k, 100 + 280 * k];
    ctx.lineWidth = 13 * (1 - k);
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
    ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 8; i++) {
    const a = -2.2 + i * 0.42;
    const r = 60 + (330 + 60 * (i % 3)) * k;
    drop(ctx, at.x + Math.cos(a) * r, at.y + Math.sin(a) * r + 220 * k * k, 9 + (i % 3) * 3, a, 1 - k * k);
  }
}

// ---------------------------------------------------------------- "Totally fine."

export function drawFine(ctx: CanvasRenderingContext2D, t: number): void {
  const u = wrap(t);
  drawBeach(ctx, t, { horizon: 560, shore: 872 });
  // Sunshine behind a happy seal.
  const sun = ramp(u, FINE_AT - 0.5, FINE_AT);
  blob(ctx, W / 2, 640, 760, 620, 0, '255,244,190', 0.75 * sun);
  const pose = fineAt(t);
  drawSeal(ctx, pose);
  const age = sneezeAge(t);
  if (age > 0) {
    blob(ctx, W / 2, 1010 + 500 * age, 260 + 900 * age, 120 + 520 * age, 0, '240,250,252', 0.8 * Math.max(0, 1 - age * 2.4));
    for (let i = 0; i < 44; i++) {
      const [q, r] = [hash(i * 3.1 + 2), hash(i * 7.7 + 5)];
      const a = Math.PI * (0.06 + 0.88 * q);
      const d = 50 + (500 + 2700 * r) * age;
      drop(ctx, W / 2 + Math.cos(a) * d, 915 + Math.sin(a) * d * 0.72 + 400 * age * age, 7 + 17 * ((i * 0.73) % 1), a, Math.max(0, 1 - age * 1.5));
    }
  }
}

// ---------------------------------------------------------------- the trend

export function drawTrend(ctx: CanvasRenderingContext2D, t: number): void {
  const p = trendAt(t);
  drawBeach(ctx, t, { horizon: 540, shore: 760 });
  const s = p.shrug;
  drawResearcher(ctx, {
    ...BEN, x: 520, y: 640, scale: 1.55, turn: lerp(0.1, 0.8, s), down: 0.5, tilt: 0.1 * s, mood: 'smirk', blink: 0.25,
    handL: { x: lerp(370, 250, s), y: lerp(1180, 776, s) }, handR: { x: lerp(680, 800, s), y: lerp(1180, 770, s) }, bowL: 58, bowR: 58,
  });
  drawSeal(ctx, p.friend);
  drawSeal(ctx, { ...p.cool, over: (c, lw) => glasses(c, p.glasses, lw) });
  // A wink of light off the sunglasses.
  const shine = Math.max(0, 1 - Math.abs(wrap(t) - TREND_AT) / 0.26);
  if (shine > 0) star(ctx, 930, 944, 130 * shine, shine);
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = a;
  ctx.fillStyle = '#fffdf0';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const k = i % 2 ? r * 0.16 : r;
    const an = (i * Math.PI) / 4;
    ctx.lineTo(Math.cos(an) * k, Math.sin(an) * k);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
