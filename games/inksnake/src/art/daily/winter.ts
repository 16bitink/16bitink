import type { CoverDef, LevelDef, Place, SolidDef } from '../../level/types';
import { createRng, type Rng } from '../../logic/rng';
import { blob, edgeWash, outline, softBand } from '../groundKit';
import { closed, makeDraw, oval, pt, type Draw } from '../kit';
import { makeCanvas, shrink, type Pt } from '../pen';
import { erase, mix, rgba } from '../wash';

/**
 * Winter over a place (season 'winter'): snow laid over the painted
 * ground with the ground showing through where it has thawed, drifts and
 * sparkle, snow caps on the solid things, hoarfrost on the cover, and for
 * the Ice rule a frozen pond over the open ground. Painted over the
 * place's own art, so every winter place keeps its character.
 */

export const SNOW = '#f7f9fc';
const SNOW_SHADOW = '#9fb4d4';
const COLD = '#dfe8f2';

/** How each winter place takes its snow: how much of the ground is covered, and whether it is frost rather than snow. */
export const WINTER_LOOKS: Partial<Record<Place, { readonly cover: number; readonly thaws: number; readonly frost: boolean }>> = {
  farm: { cover: 0.82, thaws: 14, frost: false },
  barrens: { cover: 0.74, thaws: 18, frost: false },
  mountains: { cover: 0.9, thaws: 9, frost: false },
  heath: { cover: 0.6, thaws: 22, frost: true },
};

const W = 960;
const H = 540;

/** Snow over the whole board, the place's ground showing in thaw holes (and wherever there's water). */
export function winterGround(d: Draw, level: LevelDef, place: Place): void {
  const look = WINTER_LOOKS[place] ?? WINTER_LOOKS.farm!;
  const { ctx } = d.pen;
  const rng = createRng(1700 + level.id.length * 13 + Math.round(level.start.x));
  ctx.save();
  ctx.fillStyle = rgba(COLD, 0.32);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const res = Math.abs(ctx.getTransform().a) || 1;
  const { canvas: layer, ctx: lctx } = makeCanvas(Math.round(W * res), Math.round(H * res));
  lctx.scale(res, res);
  lctx.fillStyle = rgba(SNOW, look.frost ? 0.62 : 0.9);
  lctx.fillRect(0, 0, W, H);
  const holes = thawHoles(level, look.thaws, rng);
  for (const h of holes) erase(lctx, h);
  for (const z of level.zones ?? []) if (z.kind === 'water') erase(lctx, zoneShape(z));
  const ld = makeDraw(lctx, 1750, d.f, d.g, d.ink);
  drifts(ld, rng);
  for (const h of holes) holeEdge(ld, h);
  sparkle(ld, rng, look.frost ? 1400 : 900);
  ctx.drawImage(layer, 0, 0, W, H);
  shrink(layer);
  edgeWash(d, W, H, SNOW_SHADOW, 0.22, 200);
}

/** Thawed patches: irregular holes in the snow, kept off the snake's start (it should begin on snow). */
function thawHoles(level: LevelDef, n: number, rng: Rng): Pt[][] {
  const out: Pt[][] = [];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const c = pt(30 + rng() * (W - 60), 30 + rng() * (H - 60));
    if (Math.hypot(c.x - level.start.x, c.y - level.start.y) < 120) continue;
    const r = 16 + rng() * 38;
    out.push(blob(c, r * (1.2 + rng() * 0.8), r, rng, 0.32, 26, rng() * Math.PI));
  }
  return out;
}

function zoneShape(z: NonNullable<LevelDef['zones']>[number]): Pt[] {
  if (z.shape === 'circle') return oval(z.x, z.y, z.r, z.r, 32);
  if (z.shape === 'rect') return [pt(z.x, z.y), pt(z.x + z.w, z.y), pt(z.x + z.w, z.y + z.h), pt(z.x, z.y + z.h)];
  return [...z.points];
}

/** The snow's surface: long soft blue hollows and pale crests, and a few wind ripples. */
function drifts(d: Draw, rng: Rng): void {
  for (let i = 0; i < 9; i++) {
    const y0 = rng() * H;
    const tilt = (rng() - 0.5) * 160;
    const pts = Array.from({ length: 9 }, (_, k) => pt(-40 + (k * (W + 80)) / 8, y0 + tilt * (k / 8) + Math.sin(k * 0.9 + i) * 22));
    softBand(d, pts, 46 + rng() * 60, SNOW_SHADOW, 0.2);
    softBand(d, pts.map((p) => pt(p.x + 6, p.y + 10)), 18, '#8ea6c8', 0.12);
    softBand(d, pts.map((p) => pt(p.x - 8, p.y - 16)), 30, '#ffffff', 0.4);
  }
  for (let i = 0; i < 46; i++) {
    const c = pt(rng() * W, rng() * H);
    const a = -0.35 + (rng() - 0.5) * 0.3;
    const l = 10 + rng() * 22;
    const ripple = [pt(c.x - Math.cos(a) * l, c.y - Math.sin(a) * l), pt(c.x, c.y + 2), pt(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l)];
    d.pen.hair(ripple, 0.7, d.ink, 0.16);
  }
}

/** A thaw hole's rim: the snow bank's pen edge, its shadow falling in on the side away from the light. */
function holeEdge(d: Draw, hole: readonly Pt[]): void {
  const c = hole.reduce((a, p) => pt(a.x + p.x / hole.length, a.y + p.y / hole.length), pt(0, 0));
  // The bank on the light's side shades the hole's near edge; the far bank is lit.
  const shaded = hole.filter((p) => (p.x - c.x) * 0.55 + (p.y - c.y) * 0.84 < 0);
  if (shaded.length > 2) softBand(d, shaded, 7, SNOW_SHADOW, 0.5);
  d.pen.hair(closed(hole), 0.7, d.ink, 0.3);
  // Crumbs of snow round the rim, as melt leaves it.
  for (let i = 0; i < hole.length; i += 2) {
    const p = hole[i]!;
    const k = 1.06 + ((i * 37) % 10) / 60;
    d.pen.dot(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k, 1 + ((i * 13) % 5) / 4, SNOW, 0.9);
  }
}

function sparkle(d: Draw, rng: Rng, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = rng() * W;
    const y = rng() * H;
    d.pen.dot(x, y, 0.35 + rng() * 0.5, rng() < 0.75 ? '#ffffff' : SNOW_SHADOW, 0.5 + rng() * 0.4);
  }
}

/** The Ice rule: a frozen pond over the open middle of the board, glossy, cracked and dusted, with a snow bank round it. */
export function frozenPond(d: Draw, level: LevelDef): void {
  const rng = createRng(2900 + Math.round(level.start.y));
  const pond = blob(pt(W / 2, H / 2), 395, 215, rng, 0.1, 48);
  const { ctx } = d.pen;
  ctx.save();
  const g = ctx.createRadialGradient(W * 0.42, H * 0.4, 30, W / 2, H / 2, 420);
  g.addColorStop(0, rgba('#eef5f9', 0.92));
  g.addColorStop(0.6, rgba('#cfe0ea', 0.9));
  g.addColorStop(1, rgba('#a9c3d8', 0.92));
  ctx.fillStyle = g;
  d.pen.clipped(pond, () => ctx.fillRect(0, 0, W, H));
  ctx.restore();
  d.pen.clipped(pond, () => {
    // Gloss: long pale streaks on the diagonal, and deeper blue where the ice is clear.
    for (let i = 0; i < 12; i++) {
      const x = 120 + rng() * 720;
      const y = 80 + rng() * 380;
      const l = 60 + rng() * 140;
      softBand(d, [pt(x - l, y + l * 0.45), pt(x + l, y - l * 0.45)], 8 + rng() * 14, '#ffffff', 0.45);
    }
    for (let i = 0; i < 5; i++) {
      const c = pt(200 + rng() * 560, 120 + rng() * 300);
      d.pen.fill(blob(c, 60 + rng() * 60, 26 + rng() * 20, rng, 0.3, 22, -0.45), '#86a9c6', 0.16);
    }
    cracks(d, rng);
    for (let i = 0; i < 10; i++) d.pen.fill(blob(pt(100 + rng() * 760, 70 + rng() * 400), 14 + rng() * 26, 8 + rng() * 12, rng, 0.4, 18, rng()), SNOW, 0.55);
  });
  d.pen.stroke(pond, 11, SNOW, 0.85, false);
  d.pen.hair(pond.map((p) => pt(p.x + (W / 2 - p.x) * 0.012, p.y + (H / 2 - p.y) * 0.02)), 0.9, d.ink, 0.5);
}

/** Cracks in the ice: a few long ones branching into fine ones. */
function cracks(d: Draw, rng: Rng): void {
  const grow = (p: Pt, a: number, len: number, w: number, depth: number): void => {
    const pts = [p];
    let q = p;
    let ang = a;
    for (let i = 0; i < 6; i++) {
      ang += (rng() - 0.5) * 0.7;
      q = pt(q.x + Math.cos(ang) * (len / 6), q.y + Math.sin(ang) * (len / 6));
      pts.push(q);
      if (depth > 0 && rng() < 0.3) grow(q, ang + (rng() < 0.5 ? 0.8 : -0.8), len * 0.45, w * 0.6, depth - 1);
    }
    d.pen.hair(pts, w, mix('#4a6f93', d.ink, 0.5), 0.5);
  };
  for (let i = 0; i < 6; i++) grow(pt(150 + rng() * 660, 100 + rng() * 340), rng() * Math.PI * 2, 120 + rng() * 140, 0.9, 2);
}

function solidShape(s: SolidDef): Pt[] {
  return s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 28) : outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 6).slice(0, -1);
}

/** Snow lying on a solid thing: a cap on its lit side, shaded and inked, drifting over its edge. */
export function snowOnSolid(d: Draw, s: SolidDef): void {
  const shape = solidShape(s);
  const rng = createRng(3300 + Math.round(s.x * 7 + s.y));
  const cap = s.kind === 'circle'
    ? blob(pt(s.x - s.r * 0.24, s.y - s.r * 0.3), s.r * 0.66, s.r * 0.58, rng, 0.2, 26)
    : wavyTop(s, rng);
  d.pen.clipped(shape, () => {
    d.pen.fill(cap, SNOW, 0.95);
    d.pen.crescent(cap, pt(-4, -6), () => d.pen.fill(cap, SNOW_SHADOW, 0.4));
    sparkleIn(d, cap, rng);
  });
  d.pen.hair(closed(cap), 0.85, d.ink, 0.55);
}

/** A rectangle's snow: its top half, the lower edge wavy where the snow drifts over. */
function wavyTop(s: Extract<SolidDef, { kind: 'rect' }>, rng: Rng): Pt[] {
  const n = Math.max(4, Math.round(s.w / 10));
  const bottom = Array.from({ length: n + 1 }, (_, i) => pt(s.x + s.w - (i * s.w) / n, s.y + s.h * (0.5 + 0.12 * Math.sin(i * 1.7 + rng() * 2))));
  return [pt(s.x - 3, s.y - 3), pt(s.x + s.w + 3, s.y - 3), ...bottom.map((p) => pt(p.x, s.y + (p.y - s.y) * 0.75))];
}

function sparkleIn(d: Draw, shape: readonly Pt[], rng: Rng): void {
  d.pen.stipple(shape, 40, () => 0.6, 0.4, '#ffffff');
  if (rng() < 0.5) d.pen.stipple(shape, 10, () => 0.5, 0.35, SNOW_SHADOW);
}

/** Hoarfrost over a patch of cover (on its own layer): paled, rimed with white, a few clumps of snow on top. */
export function frostOnCover(d: Draw, c: CoverDef): void {
  const { ctx } = d.pen;
  const rng = createRng(4100 + Math.round(c.x + c.y * 3));
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const rim = oval(c.x, c.y, c.r + 12, c.r + 12, 32);
  d.pen.fill(rim, '#e9eff7', 0.42);
  d.pen.stipple(rim, Math.round(c.r * 9), () => 0.7, 0.45, '#ffffff');
  // Snow dusted over the lit side, thinning towards the shade.
  const dust = blob(pt(c.x - c.r * 0.25, c.y - c.r * 0.3), c.r * 0.75, c.r * 0.6, rng, 0.3, 22);
  d.pen.stipple(dust, Math.round(c.r * 14), (x, y) => Math.max(0, 1 - Math.hypot(x - c.x + c.r * 0.4, y - c.y + c.r * 0.4) / (c.r * 1.3)), 0.9, SNOW);
  d.pen.fill(dust, SNOW, 0.18);
  ctx.restore();
}

/** Whether a winter look exists for this place (else its campaign look shows). */
export function hasWinterLook(place: Place): boolean {
  return place in WINTER_LOOKS;
}
