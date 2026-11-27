import { HIGHLIGHT, INK, PAPER, SAND_DRY } from '../../../src/art/palette';
import { Pen } from '../../../src/art/pen';
import { CAPTION_FONT } from '../captions';
import { VIDEO } from '../short';

/** Small hand-drawn marks: the glint of treasure, sparkles, the crab's "?", flying sand, the wipe into the game. */

const hash = (i: number, salt: number): number => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** A four-pointed star of light, in highlighter yellow with a white heart and an ink edge. */
export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, spin = 0): void {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(spin);
  const path = new Path2D();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.26;
    if (i === 0) path.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else path.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  path.closePath();
  ctx.fillStyle = HIGHLIGHT;
  ctx.fill(path);
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.strokeStyle = INK;
  ctx.globalAlpha = alpha * 0.8;
  ctx.stroke(path);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A glint: one star pulsing with a couple of small ones round it. */
export function drawGlint(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, t: number): void {
  if (alpha <= 0) return;
  const pulse = 0.8 + 0.2 * Math.sin(t * 2 * Math.PI * 2.5);
  drawStar(ctx, x, y, size * pulse, alpha, 0.15 * Math.sin(t * 3));
  drawStar(ctx, x + size * 0.9, y - size * 0.7, size * 0.4 * (1.2 - pulse), alpha * 0.9);
  drawStar(ctx, x - size * 0.8, y - size * 0.3, size * 0.3 * pulse, alpha * 0.8);
}

/** Sparkles twinkling round a point: `n` stars at seeded spots, each blinking in turn. */
export function drawSparkles(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number, t: number, n = 6): void {
  if (alpha <= 0) return;
  for (let i = 0; i < n; i++) {
    const a = hash(i, 1) * Math.PI * 2;
    const d = radius * (0.55 + 0.45 * hash(i, 2));
    const blink = Math.max(0, Math.sin(t * 2 * Math.PI * 1.6 + i * 1.9));
    drawStar(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 10 + 16 * hash(i, 3) * blink + 6, alpha * (0.35 + 0.65 * blink), i);
  }
}

/** The crab's puzzled "?", hand-written in ink, wobbling with the line boil. */
export function drawQuestion(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(-0.12 + 0.05 * (boil - 1));
  ctx.scale(0.7 + 0.3 * alpha, 0.7 + 0.3 * alpha);
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = size * 0.14;
  ctx.strokeText('?', 0, 0);
  ctx.fillStyle = INK;
  ctx.fillText('?', 0, 0);
  ctx.restore();
}

/** One grain clump of sand, inked round, at a point. */
function clump(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, seed: number): void {
  if (alpha <= 0 || r <= 0) return;
  const pen = new Pen(ctx, seed, 0.6);
  const pts = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const rr = r * (0.75 + 0.25 * hash(seed, i));
    return { x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.85 };
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  pen.fill(pts, SAND_DRY, 1);
  pen.stroke([...pts, pts[0]!], Math.max(1, r * 0.16), INK, 0.55, false);
  ctx.restore();
}

/**
 * Sand thrown up off the spade with every stroke: each stroke `k` throws a
 * few seeded clumps up and to the right, falling under gravity. `phase` and
 * `k` come from the dig clock, so it runs straight across the loop point.
 */
export function drawSpray(ctx: CanvasRenderingContext2D, x: number, y: number, strokeS: number, tau: number, effort: number, scale = 1): void {
  if (effort <= 0) return;
  const k0 = Math.floor(tau / strokeS);
  for (let k = k0 - 1; k <= k0; k++) {
    const age = tau - (k * strokeS + strokeS * 0.32);
    if (age < 0 || age > 0.62) continue;
    for (let i = 0; i < 7; i++) {
      const s = k * 13 + i;
      const vx = (160 + 260 * hash(s, 4)) * scale;
      const vy = -(420 + 380 * hash(s, 5)) * scale;
      const px = x + vx * age;
      const py = y + vy * age + 0.5 * 2200 * scale * age * age;
      clump(ctx, px, py, (7 + 9 * hash(s, 6)) * scale, effort * (1 - age / 0.62), 50 + ((s % 40) + 40) % 40);
    }
  }
}

/** Clumps kicked up out of a fresh hole in the game, `age` seconds after the dig. */
export function drawDigClumps(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, seed: number, scale: number): void {
  if (age < 0 || age > 0.5) return;
  for (let i = 0; i < 6; i++) {
    const s = seed * 7 + i;
    const vx = (hash(s, 7) - 0.5) * 520 * scale;
    const vy = -(300 + 260 * hash(s, 8)) * scale;
    clump(ctx, x + vx * age, y + vy * age + 0.5 * 2600 * scale * age * age, (5 + 6 * hash(s, 9)) * scale, 1 - age / 0.5, 30 + (s % 30));
  }
}

/** The iris into the game: `over` shows inside a circle growing from (x, y), its rim inked. */
export function iris(ctx: CanvasRenderingContext2D, over: HTMLCanvasElement, x: number, y: number, u: number): void {
  const far = Math.hypot(Math.max(x, VIDEO.width - x), Math.max(y, VIDEO.height - y));
  const r = far * u;
  if (r <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(over, 0, 0);
  ctx.restore();
  if (u >= 1) return;
  const pen = new Pen(ctx, 3 + Math.floor(u * 20), 1.4);
  pen.stroke(Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
  }), 5, INK, 0.75 * (1 - u), false);
}

/** Strain marks round a crab crammed in its shell: short ink dashes flicking out, boiling. */
export function drawStrain(ctx: CanvasRenderingContext2D, x: number, y: number, amount: number, boil: number): void {
  if (amount <= 0.05) return;
  const pen = new Pen(ctx, 90 + boil, 0.8);
  for (const [a, r] of [[-2.6, 165], [-2.1, 175], [-1.0, 170], [-0.5, 165]] as const) {
    const aa = a + 0.06 * (boil - 1);
    const r0 = r + 8 * boil;
    pen.stroke([{ x: x + Math.cos(aa) * r0, y: y - 80 + Math.sin(aa) * r0 }, { x: x + Math.cos(aa) * (r0 + 60), y: y - 80 + Math.sin(aa) * (r0 + 60) }], 8, INK, 0.9 * amount, false);
  }
}
