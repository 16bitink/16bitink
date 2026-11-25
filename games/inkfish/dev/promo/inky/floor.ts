import { INK, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp, ramp, smooth, VIDEO } from '../short';
import { curlArm, type Pt, shareAt, spline } from '../octopus/geom';
import { drawLid, drawTankBack, drawTankFront, NIGHT_LIGHT, type Tank } from './hall';
import { drawArm, natural } from './octo';
import { glow, poly, type Rgb, rgb, wash } from './paint';
import { drawRig, rigArms, type RigArm } from './rig';
import { CROSSED_AT, DRAIN_AT, FOUND_AT, PIPE_AT, SIX_AT, WIDE_AT } from './story';

/** "crossed the floor… and found a drain, SIX inches wide.": wet tiles at night, the trail, the drain with a ruler beside it. */

interface Ground {
  readonly horizon: number;
  readonly f: number;
  readonly h: number;
}
const onGround = (g: Ground, X: number, d: number): Pt => ({ x: 540 + (X * g.f) / d, y: g.horizon + g.h / d });

/** Wet tiles in perspective. `warm` lights them warmer. */
export function drawTiles(ctx: CanvasRenderingContext2D, g: Ground, boil: number, opts: { x0: number; x1: number; d0: number; d1: number; day?: boolean }): void {
  const rng = createRng(909);
  const base: readonly Rgb[] = opts.day ? [[156, 150, 138], [146, 140, 130], [166, 160, 148]] : [[28, 52, 78], [24, 46, 72], [33, 58, 86]];
  for (let d = opts.d1; d > opts.d0; d -= 0.5) {
    for (let X = opts.x0; X < opts.x1; X += 0.5) {
      const q = [onGround(g, X, d), onGround(g, X + 0.5, d), onGround(g, X + 0.5, d - 0.5), onGround(g, X, d - 0.5)];
      const c = base[Math.floor(rng() * 3)]!;
      const k = 0.85 + rng() * 0.3;
      const ga = wash(ctx, q[0]!.x, q[0]!.y, q[2]!.x, q[2]!.y, [[0, rgb([c[0] * k * 1.18, c[1] * k * 1.18, c[2] * k * 1.18])], [1, rgb([c[0] * k * 0.82, c[1] * k * 0.82, c[2] * k * 0.82])]]);
      poly(ctx, q, ga);
    }
  }
  const pen = new Pen(ctx, 111 + (boil % 3) * 977, 0.6);
  const grout = opts.day ? '#5f5a52' : '#081322';
  for (let d = opts.d1; d >= opts.d0; d -= 0.5) pen.hair([onGround(g, opts.x0, d), onGround(g, opts.x1, d)], 5 / d + 1, grout, 0.75);
  for (let X = opts.x0; X <= opts.x1; X += 0.5) {
    const [a, b] = [onGround(g, X, opts.d1), onGround(g, X, opts.d0)];
    poly(ctx, [{ x: a.x - 1, y: a.y }, { x: a.x + 1, y: a.y }, { x: b.x + 3, y: b.y }, { x: b.x - 3, y: b.y }], opts.day ? 'rgba(95,90,82,0.75)' : 'rgba(8,19,34,0.75)');
  }
}

/** A shiny wet trail along screen points, with a half-width at each. */
export function drawTrail(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number; w: number }[], day = false): void {
  if (pts.length < 2) return;
  const side = (k: number, off = 0): Pt[] => pts.map((p, i) => ({ x: p.x + k * p.w * (1 + 0.12 * Math.sin(i * 0.5 + k) + 0.06 * Math.sin(i * 1.1 + 2 * k)), y: p.y + k * p.w * 0.22 + off }));
  poly(ctx, [...side(-1), ...side(1).reverse()], day ? 'rgba(60,84,100,0.42)' : 'rgba(6,16,34,0.5)');
  poly(ctx, [...side(-0.86), ...side(0.86).reverse()], day ? 'rgba(150,190,206,0.38)' : 'rgba(74,170,196,0.3)');
  poly(ctx, [...side(-0.62), ...side(-0.2).reverse()], day ? 'rgba(250,254,255,0.62)' : 'rgba(190,240,250,0.42)');
  poly(ctx, [...side(0.36), ...side(0.5).reverse()], day ? 'rgba(250,254,255,0.5)' : 'rgba(190,240,250,0.32)');
  // Round sucker prints along its edges.
  pts.forEach((p, i) => {
    if (i % 3) return;
    for (const k of [-1.25, 1.22]) {
      const r = p.w * 0.14;
      ctx.strokeStyle = day ? 'rgba(240,250,255,0.7)' : 'rgba(150,220,236,0.45)';
      ctx.lineWidth = Math.max(1, r * 0.3);
      ctx.beginPath();
      ctx.ellipse(p.x + k * p.w + 6 * Math.sin(i * 4), p.y + (i % 2) * 8, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

/** The far glowing tank he left, its lid ajar. */
function drawFarTank(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const k: Tank = { xL: 70, xR: 520, rim: 190, base: 440, inset: 54, rise: 38, water: 24, frame: 18 };
  const pen = new Pen(ctx, 113 + (boil % 3) * 977, 0.8);
  const plinth = [{ x: k.xL - 14, y: k.base }, { x: k.xR + 14, y: k.base }, { x: k.xR + 8, y: k.base + 120 }, { x: k.xL - 8, y: k.base + 120 }];
  poly(ctx, plinth, wash(ctx, 0, k.base, 0, k.base + 120, [[0, '#26415e'], [1, '#0b182b']]));
  pen.closed(plinth, 3, INK);
  drawTankBack(ctx, k, t, boil, { rocks: true });
  drawLid(ctx, { x: 530, y: 182 }, { x: 70, y: 128 }, { x: 60, y: -40 }, 16, boil);
  drawTankFront(ctx, k, t, boil);
}

// ---------------------------------------------------------------- "crossed the floor…"

const WALK: Ground = { horizon: 150, f: 720, h: 1560 };
const WALK_FROM = CROSSED_AT - 0.08;
const WALK_TO = FOUND_AT - 0.08;

const groundAt = (u: number): { X: number; d: number } => ({ X: lerp(-1.55, 0.3, u) - 0.22 * Math.sin(u * Math.PI * 2), d: lerp(4.4, 1.9, u) });

export function walkerAt(t: number): { x: number; y: number; size: number; u: number } {
  const u = lerp(0.5, 1, clamp01((t - WALK_FROM) / (WALK_TO - WALK_FROM)));
  const q = groundAt(u);
  const p = onGround(WALK, q.X, q.d);
  return { x: p.x, y: p.y - 190 / q.d - 10 * Math.abs(Math.sin(t * 11)), size: 385 / q.d, u };
}

/** Arms splayed flat on the floor, stepping in turn. */
export function floorArms(x: number, y: number, size: number, p: number, reach = 1): RigArm[] {
  return [1.0, 0.0, 0.93, 0.74, 0.55, 0.36, 0.2, 0.06].map((k, i) => {
    const step = Math.sin(p + i * 2.4);
    const a = Math.PI * k + 0.1 * step;
    const root = { x: x + Math.cos(a) * size * 0.42, y: y + Math.sin(a) * size * 0.28 };
    const curl = (k > 0.5 ? -1 : 1) * (2.1 + 0.4 * step);
    const raw = curlArm(root, a, size * reach * (3.3 + 0.35 * step), curl, 0.3, p * 0.7 + i, 44);
    // Flat on the floor, seen from above: squashed, and lifted a little mid-step.
    const path = raw.map((q, j) => ({ x: q.x, y: root.y + (q.y - root.y) * 0.62 + size * 0.5 * (1 - Math.cos(Math.min(1, j / 14) * Math.PI)) * 0.5 - Math.max(0, step) * size * 0.2 * Math.sin((j / 44) * Math.PI) }));
    return { a, len: 3, curl, near: i > 1, path };
  });
}

export function drawFloorScene(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const { width: W, height: H } = VIDEO;
  ctx.fillStyle = wash(ctx, 0, 0, 0, 520, [[0, '#060d1e'], [1, '#10264a']]);
  ctx.fillRect(-60, -60, W + 120, H + 120);
  drawTiles(ctx, WALK, boil, { x0: -7, x1: 7, d0: 0.5, d1: 7.5 });
  // A wall at the back.
  ctx.fillStyle = wash(ctx, 0, 0, 0, 360, [[0, '#081226'], [1, '#12294c']]);
  ctx.fillRect(-60, -60, W + 120, 418);
  ctx.fillStyle = '#050b18';
  ctx.fillRect(-60, 350, W + 120, 12);
  drawFarTank(ctx, t, boil);
  glow(ctx, 330, 560, 520, 170, [60, 190, 210], 0.3, 'lighter');
  glow(ctx, 640, 1000, 620, 420, [255, 170, 90], 0.22, 'lighter');
  const w = walkerAt(t);
  const trail = Array.from({ length: 26 }, (_, i) => {
    const u = (w.u * i) / 25;
    const q = groundAt(u);
    const p = onGround(WALK, q.X, q.d);
    return { x: p.x, y: p.y, w: 215 / q.d };
  });
  drawTrail(ctx, trail);
  glow(ctx, w.x, w.y + w.size * 0.9, w.size * 3.2, w.size * 0.9, [2, 6, 14], 0.75);
  drawRig(ctx, {
    x: w.x, y: w.y, size: w.size, up: -Math.PI / 2 + 0.36 + 0.06 * Math.sin(t * 11), bend: 0.6, length: 3.4, turn: 0.28, gaze: { x: -0.55, y: 0.5 }, lid: 0.1,
    breathe: 1 + 0.03 * Math.sin(t * 9), arms: floorArms(w.x, w.y, w.size, t * 11), seed: 6101, web: 0.26,
  }, NIGHT_LIGHT, boil);
  // Seen by the night camera: faint lines and dark corners.
  ctx.fillStyle = 'rgba(2,8,18,0.16)';
  for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 3);
  const v = ctx.createRadialGradient(540, 840, 520, 540, 860, 1180);
  v.addColorStop(0, 'rgba(1,4,10,0)');
  v.addColorStop(1, 'rgba(1,4,10,0.85)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- "a drain, SIX inches wide."

const STEEP: Ground = { horizon: -900, f: 760, h: 3300 };
export const HOLE = { x: 540, y: 730, rx: 258, ry: 138 } as const;
/** The ruler: exactly as long as the drain is wide. */
export const RULER = { y: 926, h: 74 } as const;

/** How far out from the drain's middle an arm is clear of the body, px. */
const CLEAR_OF_BODY = 236;

/** 0 sitting over the drain .. 1 all the way down. */
export const pourAt = (t: number): number => smooth((t - (DRAIN_AT + 0.05)) / (WIDE_AT + 0.08 - DRAIN_AT - 0.05));
/** The eye's last look out of the hole: 0 hidden .. 1 up. */
export const lastLook = (t: number): number => ramp(t, WIDE_AT, WIDE_AT + 0.16) * (1 - ramp(t, WIDE_AT + 0.4, PIPE_AT - 0.06));
export const rulerAlpha = (t: number): number => ramp(t, SIX_AT - 0.06, SIX_AT + 0.1);

/** The drain ring's brushed steel. */
const STEEL = [[0, '#d9e6ea'], [0.3, '#8ea3ad'], [0.5, '#6c808a'], [0.8, '#b3c5cc'], [1, '#e6f0f2']] as const;

function drawHole(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 117 + (boil % 3) * 977, 0.8);
  const { x, y, rx, ry } = HOLE;
  const ring = (k: number, dy = 0): Pt[] => Array.from({ length: 49 }, (_, i) => ({ x: x + Math.cos((i / 48) * Math.PI * 2) * rx * k, y: y + dy + Math.sin((i / 48) * Math.PI * 2) * ry * k }));
  poly(ctx, ring(1.3, 10), 'rgba(3,8,16,0.5)');
  poly(ctx, ring(1.24), wash(ctx, x - rx, y - ry, x + rx, y + ry, STEEL));
  pen.closed(ring(1.24), 3.4, INK);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4;
    const q = { x: x + Math.cos(a) * rx * 1.12, y: y + Math.sin(a) * ry * 1.12 };
    ctx.fillStyle = '#39474f';
    ctx.beginPath();
    ctx.ellipse(q.x, q.y, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    pen.hair([{ x: q.x - 8, y: q.y }, { x: q.x + 8, y: q.y }], 2, '#e6f0f2', 0.8);
  }
  const g = ctx.createRadialGradient(x, y + ry * 0.5, 10, x, y, rx);
  g.addColorStop(0, '#01060c');
  g.addColorStop(0.7, '#04121e');
  g.addColorStop(1, '#12384a');
  poly(ctx, ring(1), g);
  // The pipe's far wall, wet.
  ctx.save();
  ctx.beginPath();
  ring(1).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.clip();
  for (let k = 0; k < 4; k++) pen.hair(ring(1, 26 + 24 * k), 4, '#3f8296', 0.35 - 0.07 * k);
  ctx.restore();
  pen.closed(ring(1), 4, INK);
}

/** The pushed-aside grate, lying on the tiles. */
function drawGrate(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 119 + (boil % 3) * 977, 0.8);
  const c = { x: 975, y: 510 };
  const disc = Array.from({ length: 41 }, (_, i) => ({ x: c.x + Math.cos((i / 40) * Math.PI * 2) * 210, y: c.y + Math.sin((i / 40) * Math.PI * 2) * 108 }));
  poly(ctx, disc.map((p) => ({ x: p.x + 8, y: p.y + 16 })), 'rgba(2,6,14,0.55)');
  poly(ctx, disc, wash(ctx, c.x - 200, c.y - 100, c.x + 200, c.y + 100, [[0, '#b9cad2'], [0.5, '#6d808a'], [1, '#a7bac2']]));
  ctx.save();
  ctx.beginPath();
  disc.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.clip();
  for (let k = -4; k <= 4; k++) {
    ctx.fillStyle = '#0a1a28';
    ctx.beginPath();
    ctx.roundRect(c.x + k * 42 - 9, c.y - 78 + Math.abs(k) * 9, 18, 156 - Math.abs(k) * 18, 9);
    ctx.fill();
  }
  ctx.restore();
  pen.closed(disc, 3.2, INK);
}

function drawRuler(ctx: CanvasRenderingContext2D, u: number, boil: number): void {
  if (u <= 0) return;
  const pen = new Pen(ctx, 121 + (boil % 3) * 977, 0.6);
  const w = HOLE.rx * 2;
  const y = RULER.y + 60 * (1 - u);
  ctx.save();
  ctx.globalAlpha = u;
  const box = [{ x: HOLE.x - w / 2, y }, { x: HOLE.x + w / 2, y }, { x: HOLE.x + w / 2, y: y + RULER.h }, { x: HOLE.x - w / 2, y: y + RULER.h }];
  poly(ctx, box.map((p) => ({ x: p.x + 5, y: p.y + 12 })), 'rgba(2,6,14,0.5)');
  poly(ctx, box, wash(ctx, 0, y, 0, y + RULER.h, [[0, '#ffe7a6'], [0.6, '#f2c766'], [1, '#c8923c']]));
  for (let i = 0; i <= 48; i++) {
    const x = HOLE.x - w / 2 + (w * i) / 48;
    const len = i % 8 === 0 ? 34 : i % 4 === 0 ? 24 : 14;
    ctx.fillStyle = '#4a2c0c';
    ctx.fillRect(x - (i % 8 === 0 ? 1.8 : 1), y, i % 8 === 0 ? 3.6 : 2, len);
  }
  pen.closed(box, 3.2, INK);
  ctx.restore();
}

export function drawDrainScene(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const { width: W, height: H } = VIDEO;
  const z = lerp(1, 1.07, ramp(t, FOUND_AT - 0.08, PIPE_AT));
  ctx.save();
  ctx.translate(540, 800);
  ctx.scale(z, z);
  ctx.translate(-540, -800);
  ctx.fillStyle = '#10233f';
  ctx.fillRect(-60, -60, W + 120, H + 120);
  drawTiles(ctx, STEEP, boil, { x0: -4, x1: 4, d0: 1, d1: 4 });
  glow(ctx, 540, 720, 760, 680, [255, 176, 96], 0.34, 'lighter');
  drawTrail(ctx, spline([{ x: 190, y: -40 }, { x: 250, y: 130 }, { x: 330, y: 260 }, { x: 350, y: 420 }, { x: 450, y: 560 }, { x: 500, y: 640 }], 5).map((p) => ({ ...p, w: 66 + p.y * 0.06 })));
  drawGrate(ctx, boil);
  drawHole(ctx, boil);
  const u = pourAt(t);
  const arrive = ramp(t, FOUND_AT - 0.08, FOUND_AT + 0.3);
  const size = 178;
  // Everything sinks straight down the hole; whatever is at its lip squeezes to fit.
  const drop = lerp(20, 80, arrive) + 600 * u;
  const arms = u < 0.48 ? rigArms({ x: HOLE.x, y: HOLE.y, size, up: 0, bend: 0, turn: 0, gaze: { x: 0, y: 0 }, lid: 0, seed: 6201, arms: drainArms(t, u, arrive) }) : [];
  for (const a of arms) drawArm(ctx, a.arm, NIGHT_LIGHT, boil, 0);
  if (u < 0.995) {
    ctx.save();
    // Only what's above the hole's front lip shows.
    ctx.beginPath();
    ctx.moveTo(-200, -400);
    ctx.lineTo(1280, -400);
    ctx.lineTo(1280, HOLE.y);
    ctx.lineTo(HOLE.x + HOLE.rx, HOLE.y);
    ctx.ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, 0, 0, Math.PI);
    ctx.lineTo(-200, HOLE.y);
    ctx.closePath();
    ctx.clip();
    const crownY = HOLE.y - 30 + drop;
    const len = 3.6;
    const bodyPx = len * size;
    const profile = (s: number): number => {
      const y = crownY + 0.45 * size - s * bodyPx;
      const bulge = natural(s) * (1 + 0.16 * Math.sin(u * Math.PI));
      const atLip = clamp01((y - (HOLE.y - 240)) / 190);
      const fit = (HOLE.rx * 0.98) / size;
      return lerp(bulge, Math.min(bulge, fit * lerp(1, 0.93, atLip)), smooth(atLip));
    };
    drawRig(ctx, {
      x: HOLE.x, y: crownY, size, up: -Math.PI / 2, bend: lerp(-0.2, 0, smooth(u / 0.3)), length: len, turn: 0.12 * Math.sin(t * 3), gaze: { x: 0.1, y: lerp(0.9, 0.2, u) }, lid: 0.08 + 0.3 * Math.sin(u * Math.PI),
      // The soft face rides up the body as it drains: the eyes go last.
      profile, eyeS: lerp(0.24, 0.72, smooth(u / 0.5)), arms: [], seed: 6201,
    }, NIGHT_LIGHT, boil);
    ctx.restore();
  }
  drawLastEye(ctx, t, boil);
  drawFrontLip(ctx, boil);
  // Past the body, the arms lie over the rim.
  for (const a of arms) {
    const out = a.arm.path.find((p) => Math.abs(p.x - HOLE.x) > CLEAR_OF_BODY);
    if (out) drawArm(ctx, { ...a.arm, from: shareAt(a.arm.path, out) }, NIGHT_LIGHT, boil, 0);
  }
  drawRuler(ctx, rulerAlpha(t), boil);
  const v = ctx.createRadialGradient(540, 760, 520, 540, 800, 1250);
  v.addColorStop(0, 'rgba(1,4,10,0)');
  v.addColorStop(1, 'rgba(1,4,10,0.8)');
  ctx.fillStyle = v;
  ctx.fillRect(-60, -60, W + 120, H + 120);
  ctx.restore();
}

/** Arms over the rim and the floor round it, drawn in down the hole as it goes. */
function drainArms(t: number, u: number, arrive: number): RigArm[] {
  const pull = 1 - smooth(u / 0.5);
  return [1.3, -0.3, 1.12, -0.12, 0.98, 0.02].map((k, i) => {
    const a = Math.PI * k;
    const left = Math.cos(a) < 0;
    const root = { x: HOLE.x + Math.cos(a) * 60, y: HOLE.y - 10 + Math.sin(a) * 30 };
    const raw = curlArm(root, a + 0.08 * Math.sin(t * 6 + i), 120 + 450 * pull * lerp(0.75, 1, arrive), (left ? -1 : 1) * (1.7 + 0.2 * i), 0.3, t * 5 + i, 44);
    const path = raw.map((q) => ({ x: q.x, y: root.y + (q.y - root.y) * 0.62 }));
    return { a, len: 2, curl: left ? -2 : 2, near: false, path, w: 0.85 * lerp(0.4, 1, pull) };
  });
}

/** The eye, last of all, over the lip of the drain. */
function drawLastEye(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const k = lastLook(t);
  if (k <= 0.01) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -200, 1080, 200 + HOLE.y);
  ctx.ellipse(HOLE.x, HOLE.y, HOLE.rx, HOLE.ry, 0, 0, Math.PI);
  ctx.clip();
  const y = HOLE.y + 190 - 265 * k;
  drawRig(ctx, {
    x: HOLE.x, y: y + 150, size: 165, up: -Math.PI / 2, bend: 0, length: 1.7, turn: 0.1, gaze: { x: Math.sin((t - WIDE_AT) * 14) * 0.7, y: 0.1 }, lid: 0.12,
    profile: (s) => 1.15 * Math.sqrt(Math.max(0, 1 - Math.max(0, (s - 0.3) / 0.7) ** 2.2)), arms: [], seed: 6301,
  }, NIGHT_LIGHT, boil);
  ctx.restore();
}

/** The near rim of the ring, over whatever's in the hole. */
function drawFrontLip(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 123 + (boil % 3) * 977, 0.7);
  const arc = (k: number): Pt[] => Array.from({ length: 25 }, (_, i) => ({ x: HOLE.x + Math.cos((i / 24) * Math.PI) * HOLE.rx * k, y: HOLE.y + Math.sin((i / 24) * Math.PI) * HOLE.ry * k }));
  poly(ctx, [...arc(1), ...arc(1.24).reverse()], wash(ctx, HOLE.x - HOLE.rx, HOLE.y - HOLE.ry, HOLE.x + HOLE.rx, HOLE.y + HOLE.ry, STEEL));
  pen.stroke(arc(1), 4, INK, 1, false);
  pen.stroke(arc(1.24), 3.4, INK, 1, false);
}

