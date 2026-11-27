import { INK } from '../../../src/art/palette';
import { Pen } from '../../../src/art/pen';
import { PLANKTON, PLANKTON_CORE, PLANKTON_DEEP } from '../../../src/art/backdrop/glowSea';
import type { ShellKind } from '../../../src/logic/shells';
import { VIDEO } from '../short';
import { crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { drawSon, type SonImages, type SonKey } from '../son/son';
import { footprintGlow, footprintsAt } from './game';
import { type CrabState, FOOTPRINTS, GAME_SURFACE, SHORE_Y } from './story';

/** The hermit crabs, the son and the marks they make: drawn with the game's sprites and the son's painted poses. */

export interface Cast {
  readonly back: Sprite;
  readonly front: Sprite;
  readonly shells: ReadonlyMap<ShellKind, Sprite>;
}

export const CAST_KINDS: readonly ShellKind[] = ['whelk', 'moonsnail', 'topshell', 'nerite', 'conch', 'snail'];

export function makeCast(): Cast {
  return {
    back: crabSprite('back', 5),
    front: crabSprite('front', 5),
    shells: new Map(CAST_KINDS.map((k) => [k, shellSprite(k, 5)] as const)),
  };
}

/** Local px from a crab sprite's ground line down to its leg tips. */
const LEG_DROP = 7;

/** A soft contact shadow on the sand. */
export function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, alpha = 0.16): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x, y, rx * 0.1, x, y, rx);
  g.addColorStop(0, INK);
  g.addColorStop(1, 'rgba(38,49,106,0)');
  ctx.fillStyle = g;
  ctx.translate(x, y);
  ctx.scale(1, 0.16);
  ctx.translate(-x, -y);
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * A hermit crab in its shell: far legs, the shell, then head, eyes, near legs
 * and claw over it, all on one placement so the legs come out of the
 * opening. `out` 0 is tucked in: only the shell shows.
 */
export function drawCrab(ctx: CanvasRenderingContext2D, cast: Cast, c: CrabState, scale: number, boil: number, kind: ShellKind = 'whelk'): void {
  // The sprite's ground line sits a little above its leg tips: set the tips on the sand.
  const y = c.y - c.bob + LEG_DROP * scale;
  shadow(ctx, c.x - 12 * scale, c.y + 2, 70 * scale, 0.18);
  const tuck = 1 - c.out;
  const inward = -c.facing * tuck * 14 * scale;
  if (c.out > 0.02) drawSprite(ctx, cast.back, boil, { x: c.x + inward, y: y + tuck * 6 * scale, scale, facing: c.facing, alpha: c.out });
  drawSprite(ctx, cast.shells.get(kind)!, boil, { x: c.x, y, scale, facing: c.facing });
  if (c.out > 0.02) drawSprite(ctx, cast.front, boil, { x: c.x + inward, y: y + tuck * 6 * scale, scale, facing: c.facing, alpha: c.out });
}

/** A still shell lying on the sand, a little tipped. */
export function drawShellOnly(ctx: CanvasRenderingContext2D, cast: Cast, kind: ShellKind, x: number, y: number, scale: number, facing: 1 | -1, tilt: number, boil: number): void {
  shadow(ctx, x, y + 2, 66 * scale, 0.16);
  drawSprite(ctx, cast.shells.get(kind)!, boil, { x, y, scale, facing, rotation: tilt });
}

/** The son, standing on his painted patch of sand, with a soft shadow so the patch sits into our sand. */
export function drawSonOn(ctx: CanvasRenderingContext2D, son: SonImages, key: SonKey, x: number, y: number, h: number, opts: { lift?: number; tilt?: number; flip?: boolean; alpha?: number } = {}): void {
  const alpha = opts.alpha ?? 1;
  if (alpha <= 0) return;
  shadow(ctx, x + 10, y - h * 0.07, h * 0.36, 0.2 * alpha);
  drawSon(ctx, son, { key, x, y: y - (opts.lift ?? 0), height: h, tilt: opts.tilt, flip: opts.flip, alpha });
}

/** Paw prints left in the sand behind the son, up to just behind where he stands now. */
export function drawFootprints(ctx: CanvasRenderingContext2D, upTo: number): void {
  const pen = new Pen(ctx, 515, 1);
  ctx.save();
  for (const f of FOOTPRINTS) {
    if (f.x > upTo) continue;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#c9ad78';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 26, 11, -0.08, 0, Math.PI * 2);
    ctx.fill();
    pen.hair(Array.from({ length: 9 }, (_, i) => ({ x: f.x + 26 * Math.cos(Math.PI * (0.1 + 0.8 * (i / 8))), y: f.y + 11 * Math.sin(Math.PI * (0.1 + 0.8 * (i / 8))) })), 1.4, INK, 0.35);
    for (const dx of [-14, -4, 6, 16]) {
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(f.x + dx + 14, f.y - 14 + Math.abs(dx - 1) * 0.2, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * The wave, seen from up the beach: a thin sheet of water running down the
 * sand from the sea to `front`, clear and bright at its edge, with lacy
 * foam along the front and a second, fainter lace behind it.
 */
export function drawWave(ctx: CanvasRenderingContext2D, front: number, water: number, boil: number, sea: number = SHORE_Y, k = 1): void {
  if (water <= 0.01 || front <= sea - 10) return;
  const top = sea - 40;
  const edge = (x: number, back = 0): number => front - back * k + k * (12 * Math.sin(x / (80 * k) + boil * 0.6 + back * 0.02) + 7 * Math.sin(x / (29 * k) + 1.3 + back * 0.05));
  const xs = Array.from({ length: 56 }, (_, i) => -30 + i * 21);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-30, top);
  for (const x of xs) ctx.lineTo(x, edge(x));
  ctx.lineTo(VIDEO.width + 40, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, top, 0, front + 12);
  g.addColorStop(0, `rgba(70,165,185,${0.8 * water})`);
  g.addColorStop(0.7, `rgba(140,210,215,${0.5 * water})`);
  g.addColorStop(1, `rgba(220,245,240,${0.6 * water})`);
  ctx.fillStyle = g;
  ctx.fill();
  const pen = new Pen(ctx, 70 + boil, 1);
  ctx.globalAlpha = water;
  for (const [back, w, a] of [[34, 5, 0.45], [70, 3, 0.3]] as const) {
    pen.stroke(xs.map((x) => ({ x, y: edge(x, back) + 6 * k * Math.sin(x / 17) })), w * k, '#ffffff', a, false);
  }
  const lace = xs.map((x) => ({ x, y: edge(x) }));
  pen.stroke(lace, 12 * k, '#ffffff', 0.9, false);
  pen.stroke(lace.map((p) => ({ x: p.x, y: p.y + 5 * k })), 2.2 * Math.sqrt(k), INK, 0.6, false);
  // Bubbles of foam just behind the edge.
  for (let i = 0; i < 60; i++) {
    const x = ((i * 97) % 1100) - 10;
    const y = edge(x) - (8 + ((i * 37) % 30)) * k;
    pen.dot(x, y, (2 + (i % 3)) * k, '#ffffff', 0.8);
  }
  ctx.restore();
}

/** Sand thrown up where a crab digs out. `u` 0..1 over its life. */
export function drawSandPuff(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, seed: number): void {
  if (u <= 0 || u >= 1) return;
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (1.1 + 0.8 * ((i * 0.618 + seed) % 1));
    const r = 30 + 90 * u * (0.5 + ((i * 0.37) % 0.5));
    ctx.globalAlpha = 0.7 * (1 - u);
    ctx.fillStyle = i % 2 ? '#d8bf8c' : '#e8d4a6';
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7 + 60 * u * u, 5 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The plankton in the strand, in world px (the caller sets the camera): a
 * wide, soft bloom of cold blue light where each step came down, white-hot
 * at its heart, with sparks splashing up out of it; fading over 3 s. A few
 * idle sparks wink along the rest of the strand, as nightView.ts does.
 */
export function drawPlankton(ctx: CanvasRenderingContext2D, t: number, boost = 1): void {
  const y = GAME_SURFACE + 4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of footprintsAt(t)) {
    const b = footprintGlow(f.age) * boost;
    if (b <= 0.01) continue;
    // A wide soft bloom, then the footprint itself: a bright oval, white-hot at its heart.
    for (const [rx, ry, a, c] of [[180, 64, 0.55, PLANKTON_DEEP], [72, 24, 1, PLANKTON], [38, 12, 1, PLANKTON_CORE]] as const) {
      ctx.globalAlpha = Math.min(1, a * b);
      glowBlob(ctx, f.x, y, rx * (1 + 0.12 * Math.min(1, f.age)), ry, c);
    }
    // A ring of light spreading out from the step.
    if (f.age < 0.6) {
      ctx.globalAlpha = (1 - f.age / 0.6) * 0.9 * boost;
      ctx.strokeStyle = PLANKTON;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(f.x, y, 20 + 110 * f.age, 6 + 30 * f.age, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The splash: sparks thrown up as the foot comes down, falling back.
    if (f.age < 0.8) {
      for (let i = 0; i < 12; i++) {
        const ang = Math.PI * (0.12 + 0.76 * hash(f.seed, i));
        const v = 140 + 160 * hash(f.seed, i + 20);
        const px = f.x + Math.cos(ang) * v * f.age * 1.2;
        const py = y - Math.sin(ang) * v * f.age + 260 * f.age * f.age;
        ctx.globalAlpha = (1 - f.age / 0.8) * boost;
        glowBlob(ctx, px, py, 14, 14, PLANKTON);
        ctx.fillStyle = PLANKTON_CORE;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Idle sparks along the strand, a few a beat.
  const beat = Math.floor(t * 4);
  for (let col = 0; col < 60; col++) {
    if (hash(col, beat) > 0.25) continue;
    ctx.globalAlpha = 0.8 * boost;
    glowBlob(ctx, col * 18 + hash(col, beat + 1) * 18, y - hash(col, beat + 2) * 6, 7, 5, PLANKTON);
  }
  ctx.restore();
}

/** A soft round glow, `rx` by `ry`. */
function glowBlob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

function hash(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
