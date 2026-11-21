import type { Pt } from '../../../../src/art/pen';
import { flecks, seeded, spline } from '../../crabbird/art/paint';
import { band, curve, dab, fillShape, inkLine, softLine, within } from '../../heroncrab/art/ink';

/**
 * A big brown Norway rat, painted like the heron: a shaggy brown back over a
 * pale grey-buff belly (countershaded), a blunt snout with a pink nose,
 * round pink-lined ears, a dark bead eye with a catchlight, whiskers, pink
 * hands and feet, and a long, scaly, pinkish tail. Mouth shut, no wounds.
 * Wet, its fur clumps into darker spikes.
 *
 * Local units: snout at +x (about 104), rump at −100, back at −30, belly at +28;
 * the tail runs back from the rump about 190 more.
 */
export interface RatPose {
  /** Leg paddling phase, radians, and how hard (0 .. 1). */
  readonly kick: number;
  readonly paddle: number;
  /** Which way is down, as a unit vector in the rat's frame (for the hanging tail and legs). */
  readonly down: Pt;
  /** 0 dry .. 1 soaked. */
  readonly wet: number;
  /** 0 the tail hangs .. 1 pulled straight back along the body (being swallowed). */
  readonly taut: number;
  /** A wave running down the tail, radians. */
  readonly swish: number;
}

export const RAT_LEN = 204;
export const TAIL_LEN = 190;
export const RUMP: Pt = { x: -98, y: 4 };

const FUR = '#7d5e44';
const BACK = '#4f3a2a';
const WARM = '#94693f';
const BELLY = '#c8b9a2';
const DEEP = '#2a1f18';
const PINK = '#d9a096';
const PINK_DEEP = '#a46a62';

const BODY: readonly Pt[] = spline([
  { x: 102, y: 6 }, { x: 97, y: -7 }, { x: 82, y: -19 }, { x: 62, y: -29 }, { x: 36, y: -39 }, { x: 0, y: -46 }, { x: -44, y: -46 },
  { x: -80, y: -34 }, { x: -98, y: -10 }, { x: -94, y: 16 }, { x: -70, y: 33 }, { x: -30, y: 37 }, { x: 10, y: 34 }, { x: 40, y: 27 },
  { x: 66, y: 21 }, { x: 90, y: 15 },
], 6, true);

function paintTail(ctx: CanvasRenderingContext2D, p: RatPose, boil: number): void {
  const n = 18;
  const seg = TAIL_LEN / n;
  const pts: Pt[] = [RUMP];
  let dir = Math.PI + 0.1;
  const fall = Math.atan2(p.down.y, p.down.x);
  for (let i = 1; i <= n; i++) {
    // Each piece leans further towards the ground, unless the tail is pulled taut.
    const pull = (1 - p.taut) * Math.min(1, i / 2) * 0.62;
    let d = fall - dir;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    dir += d * pull + (1 - p.taut) * 0.09 * Math.sin(p.swish - i * 0.5);
    const last = pts[i - 1]!;
    pts.push({ x: last.x + Math.cos(dir) * seg, y: last.y + Math.sin(dir) * seg });
  }
  const line = spline(pts, 3);
  const { shape } = band(line, 15, 3);
  const g = ctx.createLinearGradient(RUMP.x, RUMP.y - 8, RUMP.x, RUMP.y + 8);
  g.addColorStop(0, '#e6bcb2');
  g.addColorStop(0.5, '#c99a90');
  g.addColorStop(1, '#8d665f');
  fillShape(ctx, shape, g);
  // Scaly rings all the way down.
  for (let i = 2; i < line.length - 2; i += 2) {
    const a = line[i - 1]!;
    const b = line[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = (15 - 12 * (i / line.length)) / 2;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    const c = line[i]!;
    inkLine(ctx, [{ x: c.x + nx * w, y: c.y + ny * w }, { x: c.x - nx * w * 0.9 + (b.x - a.x) * 0.15, y: c.y - ny * w * 0.9 + (b.y - a.y) * 0.15 }], 0.8, 0.45, boil, false, '#6b4a44');
  }
  inkLine(ctx, shape, 1.2, 0.85, boil, true);
}

function paintLeg(ctx: CanvasRenderingContext2D, at: Pt, p: RatPose, phase: number, far: boolean, boil: number): void {
  const swing = Math.sin(p.kick + phase) * p.paddle;
  const reach = 22;
  const dx = p.down.x * reach + 12 * swing;
  const dy = p.down.y * reach + 6 * swing;
  const knee = { x: at.x + dx * 0.5 - 6, y: at.y + dy * 0.5 };
  const foot = { x: at.x + dx, y: at.y + dy };
  const line = spline([{ x: at.x - p.down.x * 8, y: at.y - p.down.y * 8 }, at, knee, foot], 5);
  const { shape } = band(line, far ? 20 : 24, 6);
  const g = ctx.createLinearGradient(at.x, at.y, foot.x, foot.y);
  g.addColorStop(0, far ? '#4a3729' : '#8a6a4c');
  g.addColorStop(0.7, far ? '#5a4332' : FUR);
  g.addColorStop(1, far ? '#6e5a4e' : '#b39a86');
  fillShape(ctx, shape, g);
  within(ctx, shape, () => {
    for (let k = 1; k < line.length - 1; k += 2) softLine(ctx, [line[k]!, { x: line[k]!.x - 4, y: line[k]!.y + 1 }], 1, DEEP, 0.3, 1);
  });
  inkLine(ctx, shape, 0.9, far ? 0.45 : 0.7, boil, true);
  // A pink hand with little toes.
  for (let k = -1; k <= 1; k++) {
    const toe = { x: foot.x + 7 + k * 2 + p.down.x * 5, y: foot.y + k * 4 + p.down.y * 5 };
    softLine(ctx, [foot, toe], 5, far ? PINK_DEEP : PINK, 1, 2);
    inkLine(ctx, [foot, toe], 0.8, far ? 0.4 : 0.7, boil);
  }
}

function paintBody(ctx: CanvasRenderingContext2D, p: RatPose, boil: number): void {
  const g = ctx.createLinearGradient(0, -36, 0, 30);
  g.addColorStop(0, BACK);
  g.addColorStop(0.35, FUR);
  g.addColorStop(0.62, WARM);
  g.addColorStop(0.8, BELLY);
  g.addColorStop(1, '#a8998a');
  fillShape(ctx, BODY, g);
  within(ctx, BODY, () => {
    const rnd = seeded(503);
    // Fur strokes lying back from the nose; clumped and darker when wet.
    const n = 900;
    for (let i = 0; i < n; i++) {
      const x = -100 + rnd() * 204;
      const y = -48 + rnd() * 86;
      const len = 4 + rnd() * 5 + 4 * p.wet;
      const c = y < -14 ? [BACK, DEEP, FUR, '#6b4f39'][i % 4]! : y < 14 ? [FUR, WARM, BACK, '#a07a55'][i % 4]! : [BELLY, '#e3d8c6', '#9e8e7a'][i % 3]!;
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * p.wet;
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.1 + 0.8 * p.wet;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len, y + 0.8 + 0.05 * y + (rnd() - 0.5) * 2);
      ctx.stroke();
      ctx.restore();
    }
    // The haunch: a rounded thigh, lit on top.
    dab(ctx, -58, -4, 34, '170,130,90', 0.35);
    dab(ctx, -50, 22, 30, '40,28,20', 0.3);
    // Light along the back, a soft shadow along the belly.
    softLine(ctx, [{ x: 60, y: -24 }, { x: -10, y: -32 }, { x: -70, y: -24 }], 10, '#b18c66', 0.35);
    dab(ctx, -20, 30, 70, '40,30,24', 0.3, 0.3);
    if (p.wet > 0) dab(ctx, -10, -10, 110, '30,26,30', 0.3 * p.wet, 0.5);
    flecks(ctx, { x0: -100, y0: -36, x1: 100, y1: 30 }, 90, rnd, [DEEP, '#a98462'], 0.8, 2.5, 0.35);
  });
  inkLine(ctx, BODY, 1.6, 0.9, boil, true);
  // A rough edge of guard hairs along the back.
  const rnd = seeded(509);
  for (let i = 0; i < 26; i++) {
    const q = BODY[6 + Math.floor(rnd() * 40)]!;
    if (q.y > -8) continue;
    inkLine(ctx, [q, { x: q.x - 6 - 4 * p.wet, y: q.y - 3 - 2 * p.wet }], 0.9, 0.6, boil);
  }
}

function paintFace(ctx: CanvasRenderingContext2D, boil: number): void {
  // A round ear, pink inside.
  const ear = Array.from({ length: 24 }, (_, i) => ({ x: 48 + Math.cos((i / 24) * Math.PI * 2) * 15, y: -36 + Math.sin((i / 24) * Math.PI * 2) * 16 }));
  const inner = ear.map((q) => ({ x: 48 + (q.x - 48) * 0.66 + 1, y: -36 + (q.y + 36) * 0.66 + 1 }));
  fillShape(ctx, ear, FUR);
  fillShape(ctx, inner, PINK, 0.95);
  within(ctx, inner, () => dab(ctx, 50, -30, 10, '150,90,84', 0.7));
  inkLine(ctx, ear, 1.1, 0.9, boil, true);
  // A dark bead eye with a catchlight.
  ctx.save();
  const eg = ctx.createRadialGradient(72, -14, 0.5, 73, -13, 5.6);
  eg.addColorStop(0, '#3a2a26');
  eg.addColorStop(1, '#0c0807');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.ellipse(73, -13, 5.6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(71, -15, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // The blunt pink nose and the shut mouth line.
  fillShape(ctx, spline([{ x: 100, y: -2 }, { x: 107, y: 3 }, { x: 104, y: 10 }, { x: 97, y: 8 }], 4, true), PINK);
  // Whiskers.
  for (let i = 0; i < 6; i++) {
    const a = { x: 94, y: 4 + i * 1.6 };
    const b = { x: 124 + i * 3, y: -12 + i * 9 };
    softLine(ctx, curve(a, { x: 112, y: a.y - 4 + i }, b, 6), 1.1, '#f3ece0', 0.8, 1);
  }
}

/** The whole rat in its own frame (translate and rotate ctx first). */
export function paintRat(ctx: CanvasRenderingContext2D, p: RatPose, boil: number): void {
  paintTail(ctx, p, boil);
  paintLeg(ctx, { x: 50, y: 18 }, p, 0.9, true, boil);
  paintLeg(ctx, { x: -64, y: 16 }, p, 2.6, true, boil);
  paintBody(ctx, p, boil);
  inkLine(ctx, curve({ x: -86, y: 10 }, { x: -64, y: -30 }, { x: -30, y: 18 }, 10), 1.1, 0.55, boil);
  paintLeg(ctx, { x: 40, y: 22 }, p, 0, false, boil);
  paintLeg(ctx, { x: -50, y: 24 }, p, Math.PI, false, boil);
  paintFace(ctx, boil);
}

/** The rat at a world point and angle (its frame scaled by `k`), `facing` −1 mirrors it top to bottom. */
export function drawRat(ctx: CanvasRenderingContext2D, at: Pt, angle: number, k: number, p: Omit<RatPose, 'down'>, boil: number, facing = 1): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  ctx.scale(k, k * facing);
  // World down in the rat's frame.
  const down = { x: Math.sin(angle), y: Math.cos(angle) * facing };
  paintRat(ctx, { ...p, down }, boil);
  ctx.restore();
}
