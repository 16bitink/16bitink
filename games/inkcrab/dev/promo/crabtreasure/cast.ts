import { FOOT, FRAME, SHELL_MID, SHELL_UNITS } from '../../../src/art/frame';
import { drawPuff } from '../../../src/art/itemArt';
import { crabShift } from '../../../src/art/mouth';
import { HIGHLIGHT, INK } from '../../../src/art/palette';
import { Pen } from '../../../src/art/pen';
import { fitFor } from '../../../src/art/shellFit';
import type { ShellKind } from '../../../src/logic/shells';
import { bakeSprite, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';

/**
 * The player's hermit crab and its shells, drawn as the game draws them
 * (crabView.ts): far legs, the shell, then head, near legs and claw, the
 * body sized against its shell and slid so it comes out of the opening.
 * Moving house is the game's swap: the new shell set mouth to mouth with the
 * old, the soft (red) crab reaching out of the old one, a puff of sand over
 * the switch, and it peeks out of the new mouth facing back.
 */
const RES = 4;
/** Local x of FOOT (the shell's opening) in a sprite: drawSprite places local x 0. */
const FOOT_LOCAL = FOOT.x - FRAME / 2;
/** A crab fills its shell this much at its cap (the game's bodyFill max). */
export const FULL = 0.95;
/** The game's swap: where the crab slips across, and how long the puff hides it (swap progress units). */
const SWITCH = 0.5;
const PUFF_SPAN = 0.16;

/** The small shell the crab starts in, and the treasure: a pearly top shell, beach 1's next size up. */
export const SMALL: ShellKind = 'snail';
export const BIG: ShellKind = 'whelk';

export interface Cast {
  readonly back: Sprite;
  readonly front: Sprite;
  readonly nakedBack: Sprite;
  readonly nakedFront: Sprite;
  readonly shells: Readonly<Record<'small' | 'big', Sprite>>;
  readonly fits: Readonly<Record<'small' | 'big', number>>;
  readonly puff: Sprite;
}

/** How much to scale a kind's drawing so it is drawn to its size, as the game's measureShell does. */
function measuredFit(sprite: Sprite): number {
  const canvas = sprite.frames[0]!;
  const { width: W, height: H } = canvas;
  const px = canvas.getContext('2d')!.getImageData(0, 0, W, H).data;
  let [x0, x1, y0, y1] = [W, -1, H, -1];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3]! <= 40) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < x0 ? 1 : fitFor((x1 - x0 + 1) / sprite.res, (y1 - y0 + 1) / sprite.res);
}

/**
 * The treasure's mother-of-pearl: a soft rainbow sheen laid over the game's
 * shell with soft-light, so its ink and shading stay as drawn.
 */
function pearly(sprite: Sprite): Sprite {
  const frames = sprite.frames.map((frame) => {
    const { width: w, height: h } = frame;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const o = out.getContext('2d')!;
    o.drawImage(frame, 0, 0);
    // Only inside the shell's own pixels: a faint rainbow tint, then a few white highlights along its whorls.
    o.globalCompositeOperation = 'source-atop';
    const g = o.createLinearGradient(w * 0.3, h * 0.25, w * 0.75, h * 0.7);
    g.addColorStop(0, '#ffc7e4');
    g.addColorStop(0.4, '#cdeeff');
    g.addColorStop(0.7, '#ddd0ff');
    g.addColorStop(1, '#fff0c8');
    o.globalAlpha = 0.2;
    o.fillStyle = g;
    o.fillRect(0, 0, w, h);
    o.globalAlpha = 0.75;
    o.strokeStyle = '#ffffff';
    o.lineCap = 'round';
    o.lineWidth = w * 0.012;
    for (const [x, y, r, a0, a1] of [[0.47, 0.5, 0.12, 3.6, 4.4], [0.55, 0.42, 0.08, 3.5, 4.3], [0.42, 0.58, 0.06, 2.4, 3.0]] as const) {
      o.beginPath();
      o.arc(w * x, h * y, w * r, a0, a1);
      o.stroke();
    }
    return out;
  });
  return { ...sprite, frames };
}

/**
 * Makes a drawing solid: wherever it is drawn at all (its washes are laid on
 * thin, so other art could show through), paper goes under it first. Only
 * its contact shadow on the ground stays see-through.
 */
function solid(sprite: Sprite): Sprite {
  const frames = sprite.frames.map((frame) => {
    const { width: w, height: h } = frame;
    const back = document.createElement('canvas');
    back.width = w;
    back.height = h;
    const b = back.getContext('2d')!;
    b.drawImage(frame, 0, 0);
    const img = b.getImageData(0, 0, w, h);
    const px = img.data;
    // The drawing's ground line, where its faint contact shadow lies: that stays see-through.
    const groundRow = (sprite.units / 2 + sprite.ground - 4.5) * sprite.res;
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3]!;
      const on = a > 40 && (i / 4 / w < groundRow || a > 110);
      px[i] = 0xff;
      px[i + 1] = 0xfa;
      px[i + 2] = 0xf0;
      px[i + 3] = on ? 255 : 0;
    }
    b.putImageData(img, 0, 0);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const o = out.getContext('2d')!;
    o.drawImage(back, 0, 0);
    o.drawImage(frame, 0, 0);
    return out;
  });
  return { ...sprite, frames };
}

export function makeCast(): Cast {
  const small = solid(shellSprite(SMALL, RES));
  const big = solid(pearly(shellSprite(BIG, RES)));
  return {
    back: solid(crabSprite('back', RES)),
    front: solid(crabSprite('front', RES)),
    nakedBack: solid(crabSprite('back', RES, true)),
    nakedFront: solid(crabSprite('front', RES, true)),
    shells: { small, big },
    fits: { small: measuredFit(small), big: measuredFit(big) },
    puff: bakeSprite(64, 4, 0, 700, (d) => drawPuff(d, 64 * 0.36)),
  };
}

/** A sprite with its FOOT at (x, y), facing `facing`, optionally rocked about its bottom. */
function atFoot(ctx: CanvasRenderingContext2D, sprite: Sprite, frame: number, x: number, y: number, scale: number, facing: number, alpha = 1, sx = 1, sy = 1): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  drawSprite(ctx, sprite, frame, { x: -facing * FOOT_LOCAL * scale, y: 0, scale, facing, alpha });
  ctx.restore();
}

/** A soft contact shadow on the sand. */
export function drawShadow(ctx: CanvasRenderingContext2D, cx: number, y: number, rx: number, alpha = 0.14): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(cx, y + 3, rx, Math.max(4, rx * 0.1), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The game's highlighter swipe behind something the crab can take. */
export function drawHighlight(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, alpha: number, boil: number): void {
  if (alpha <= 0) return;
  const pen = new Pen(ctx, 600 + boil, 0.5);
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = 0.86 + pen.rng() * 0.14;
    return { x: cx + Math.cos(a) * (w / 2) * r, y: cy + Math.sin(a) * (h / 2) * r };
  });
  pen.fill(pts, HIGHLIGHT, 0.55 * alpha);
}

export type ShellId = 'small' | 'big';

/** A shell lying on the sand, its opening (FOOT) at (x, y). `width` is its size in screen px (the game's shellPx). */
export interface ShellPlace {
  readonly id: ShellId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly facing: number;
  readonly rotation?: number;
  readonly alpha?: number;
  /** Up in the air: its drawing's contact shadow on the ground is left out. */
  readonly lifted?: boolean;
}

const unitOf = (width: number): number => width / SHELL_UNITS;
const drawnOf = (cast: Cast, id: ShellId, width: number): number => unitOf(width) * cast.fits[id];
const kindOf = (id: ShellId): ShellKind => (id === 'small' ? SMALL : BIG);

/** Where a shell's middle sits, from its opening. */
export function shellMiddle(cast: Cast, s: ShellPlace): number {
  return s.x - s.facing * (FOOT.x - SHELL_MID) * drawnOf(cast, s.id, s.width);
}

export function drawShell(ctx: CanvasRenderingContext2D, cast: Cast, s: ShellPlace, boil: number): void {
  const drawn = drawnOf(cast, s.id, s.width);
  if (s.lifted) {
    const mid = shellMiddle(cast, s);
    ctx.save();
    ctx.translate(mid, s.y);
    ctx.rotate(s.rotation ?? 0);
    ctx.beginPath();
    ctx.rect(-4000, -4000, 8000, 4000 - s.width * 0.02);
    ctx.clip();
    atFoot(ctx, cast.shells[s.id], boil, s.x - mid, 0, drawn, s.facing, s.alpha ?? 1);
    ctx.restore();
    return;
  }
  if (!s.rotation) {
    atFoot(ctx, cast.shells[s.id], boil, s.x, s.y, drawn, s.facing, s.alpha ?? 1);
    return;
  }
  // Rocked about the middle of its base.
  const mid = shellMiddle(cast, s);
  ctx.save();
  ctx.translate(mid, s.y);
  ctx.rotate(s.rotation);
  atFoot(ctx, cast.shells[s.id], boil, s.x - mid, 0, drawn, s.facing, s.alpha ?? 1);
  ctx.restore();
}

/** The crab in a shell: `fill` is its body against the shell (FULL at its cap, more when it has outgrown it), `reach` how far it is out (0 tucked in, 1 all out). */
export interface CrabPlace {
  readonly shell: ShellPlace;
  readonly fill: number;
  readonly reach: number;
  /** Leg pose 0..2 (the boil frame, or the walk cycle). */
  readonly legs: number;
  /** Squash of the body (scale-y deviation), for a crab crammed in its shell. */
  readonly squash?: number;
  readonly hidden?: boolean;
}

/** Body scale and its slide into the opening. */
function bodyOf(cast: Cast, c: CrabPlace): { readonly body: number; readonly shift: number } {
  const unit = unitOf(c.shell.width);
  const body = unit * c.fill * (0.55 + 0.45 * c.reach);
  return { body, shift: crabShift(kindOf(c.shell.id), drawnOf(cast, c.shell.id, c.shell.width), body) };
}

export function drawCrabBack(ctx: CanvasRenderingContext2D, cast: Cast, c: CrabPlace): void {
  if (c.hidden) return;
  const { body, shift } = bodyOf(cast, c);
  const sq = c.squash ?? 0;
  atFoot(ctx, cast.back, c.legs, c.shell.x + c.shell.facing * shift, c.shell.y, body, c.shell.facing, 1, 1 - sq * 0.5, 1 + sq);
}

export function drawCrabFront(ctx: CanvasRenderingContext2D, cast: Cast, c: CrabPlace): void {
  if (c.hidden) return;
  const { body, shift } = bodyOf(cast, c);
  const sq = c.squash ?? 0;
  atFoot(ctx, cast.front, c.legs, c.shell.x + c.shell.facing * shift, c.shell.y, body, c.shell.facing, 1, 1 - sq * 0.5, 1 + sq);
}

/** A crab at home: far legs, its shell, the rest. */
export function drawCrab(ctx: CanvasRenderingContext2D, cast: Cast, c: CrabPlace, boil: number): void {
  drawCrabBack(ctx, cast, c);
  drawShell(ctx, cast, c.shell, boil);
  drawCrabFront(ctx, cast, c);
}

/**
 * Moving house (crabView.drawSwap): `from` where it is, `to` mirrored with
 * its mouth on the same spot, `p` 0..1 through the swap. Before the switch
 * the soft crab reaches out of the old mouth; after it, it peeks out of the
 * new one facing back. A puff of sand hides the switch.
 */
export function drawSwap(
  ctx: CanvasRenderingContext2D, cast: Cast, from: ShellPlace, to: ShellPlace, bodyWidth: number, p: number, legs: number, boil: number, mouth: ShellPlace = from,
): void {
  const before = p < SWITCH;
  const reach = before ? Math.min(1, p / (SWITCH - PUFF_SPAN / 2)) : Math.min(1, (p - SWITCH) / (SWITCH - PUFF_SPAN / 2));
  const s = unitOf(bodyWidth) * FULL * (0.55 + 0.45 * reach);
  const host = before ? mouth : to;
  const shift = crabShift(kindOf(host.id), drawnOf(cast, host.id, host.width), s);
  const hidden = Math.abs(p - SWITCH) < PUFF_SPAN / 2;
  const x = host.x + host.facing * shift;
  if (!hidden) atFoot(ctx, cast.nakedBack, legs, x, host.y, s, host.facing);
  drawShell(ctx, cast, from, boil);
  drawShell(ctx, cast, to, boil);
  if (!hidden) atFoot(ctx, cast.nakedFront, legs, x, host.y, s, host.facing);
  const puff = Math.max(0, 1 - Math.abs(p - SWITCH) / PUFF_SPAN);
  if (puff > 0) {
    const size = (Math.max(from.width, to.width) * 0.75) / 64;
    drawSprite(ctx, cast.puff, boil, { x: mouth.x, y: mouth.y - size * 64 * 0.3, scale: size * (0.6 + 0.4 * puff), alpha: puff });
  }
}
