import type { Pt } from '../../../../src/art/pen';
import { flecks, seeded, spline } from '../../crabbird/art/paint';
import { band, curve, dab, fillShape, inkLine, softLine, turn, within } from '../../heroncrab/art/ink';
import { paintHeronHead, paintMouthInside } from './heronHead';

export { BILL_TIP, EYE, GAPE_MAX, HINGE } from './heronHead';

/**
 * A great blue heron, painted to the bar of heroncrab's night heron (and
 * InkFish's great white): slate blue-grey above, a white face with a black
 * stripe over the eye running back into black nape plumes, a long
 * yellow-orange dagger bill, a yellow eye with a catchlight, a long grey
 * S-neck with a streaked white foreneck and pale plumes over the breast,
 * rusty thighs and long dark legs. Layered washes, flecks, then thin ink.
 *
 * Body units: facing right (+x), y down, feet at 0,0, about 520 tall standing.
 * The head has its own frame (bill along +x, head middle at 0,0), drawn
 * HEAD_SCALE the body's units. The neck can carry a swallowed lump.
 */
export interface HeronHead {
  /** Head middle in body units. */
  readonly x: number;
  readonly y: number;
  /** Bill direction, body radians (0 ahead, negative up). */
  readonly a: number;
  /** 0 shut .. 1 wide open. */
  readonly gape: number;
  /** 0 a slim throat .. 1 bulging round something swallowed. */
  readonly throat: number;
}

export interface HeronPose {
  readonly x: number;
  readonly y: number;
  /** Screen px per body unit. */
  readonly k: number;
  readonly face: number;
  /** Body tilt about the hips, radians. */
  readonly lean: number;
  readonly head: HeronHead;
  /** How S-shaped the neck is (0 a plain curve .. 1 a tight S). */
  readonly kink: number;
  /** A lump in the neck: where (0 at the head .. 1 at the body) and how big (0 .. 1). */
  readonly lump: { readonly at: number; readonly size: number };
  /** False leaves the legs out (close-ups). */
  readonly legs: boolean;
  /** Walking phase (radians) and amount. */
  readonly step: number;
  readonly walk: number;
}

export const HEAD_SCALE = 0.5;
const SLATE = '#5d6f84';
const SLATE_LIT = '#93a3b4';
const SLATE_DEEP = '#36435a';
const NECK = '#8f969f';
const NECK_WARM = '#a39488';
const WHITE = '#f8f5ee';
const BLACK = '#1d1e26';
const RUST = '#9a5a36';
const LEG = '#4c4a3a';
const LEG_LIT = '#7d7a60';

const PIVOT: Pt = { x: 0, y: -290 };
export const NECK_BASE: Pt = { x: 74, y: -336 };
const HIPS: readonly Pt[] = [{ x: -6, y: -282 }, { x: 14, y: -280 }];

const BODY: readonly Pt[] = spline([
  { x: 100, y: -330 }, { x: 88, y: -292 }, { x: 52, y: -262 }, { x: 0, y: -248 }, { x: -70, y: -254 }, { x: -130, y: -276 }, { x: -176, y: -290 },
  { x: -168, y: -302 }, { x: -110, y: -336 }, { x: -40, y: -368 }, { x: 30, y: -378 }, { x: 80, y: -362 },
], 6, true);
const WING: readonly Pt[] = spline([
  { x: 74, y: -350 }, { x: 20, y: -362 }, { x: -50, y: -350 }, { x: -120, y: -326 }, { x: -186, y: -296 }, { x: -194, y: -288 },
  { x: -150, y: -284 }, { x: -80, y: -292 }, { x: -10, y: -306 }, { x: 46, y: -318 }, { x: 72, y: -334 },
], 6, true);

function paintBody(ctx: CanvasRenderingContext2D, boil: number): void {
  const g = ctx.createLinearGradient(0, -366, 10, -258);
  g.addColorStop(0, SLATE_LIT);
  g.addColorStop(0.45, SLATE);
  g.addColorStop(1, '#3c4656');
  fillShape(ctx, BODY, g);
  within(ctx, BODY, () => {
    // The belly: dark with long white streaks, as on the real bird.
    const rnd = seeded(71);
    for (let i = 0; i < 40; i++) {
      const x = -60 + rnd() * 150;
      const y = -300 + rnd() * 40;
      softLine(ctx, [{ x, y }, { x: x - 3, y: y + 10 + rnd() * 8 }], 2 + rnd() * 2, WHITE, 0.1 + rnd() * 0.12, 3);
    }
    dab(ctx, 90, -320, 40, '240,236,226', 0.35);
    flecks(ctx, { x0: -170, y0: -366, x1: 100, y1: -258 }, 120, rnd, [SLATE_DEEP, SLATE_LIT], 0.8, 3.5, 0.3);
  });
  inkLine(ctx, BODY, 2, 0.85, boil, true);
}

function paintWing(ctx: CanvasRenderingContext2D, boil: number): void {
  const g = ctx.createLinearGradient(0, -362, 0, -284);
  g.addColorStop(0, '#a6b3c0');
  g.addColorStop(0.4, SLATE);
  g.addColorStop(1, SLATE_DEEP);
  fillShape(ctx, WING, g);
  within(ctx, WING, () => {
    // Dark flight feathers at the back, each edged a little paler.
    for (let i = 0; i < 6; i++) {
      const line = [{ x: -30 - i * 10, y: -318 + i * 3 }, { x: -110, y: -304 + i * 2 }, { x: -190 + i * 6, y: -292 + i }];
      softLine(ctx, line, 11, '#252c3c', 0.45, 3);
      inkLine(ctx, line, 0.9, 0.45, boil);
    }
    // Coverts: rows of soft scallops.
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 7 - row; i++) {
        const x = 50 - i * 26 - row * 16;
        const y = -346 + row * 14 + i * 3;
        inkLine(ctx, curve({ x: x + 10, y: y - 5 }, { x: x - 2, y: y + 8 }, { x: x - 14, y: y - 2 }, 5), 1, 0.4, boil, false, SLATE_DEEP);
      }
    }
    // The black shoulder patch with its rusty edge at the bend of the wing.
    softLine(ctx, [{ x: 68, y: -348 }, { x: 58, y: -334 }], 12, BLACK, 0.55, 4);
    softLine(ctx, [{ x: 76, y: -348 }, { x: 68, y: -334 }], 5, RUST, 0.5, 3);
    flecks(ctx, { x0: -190, y0: -362, x1: 74, y1: -284 }, 80, seeded(42), [SLATE_DEEP, '#c3ccd6'], 0.8, 3, 0.3);
  });
  inkLine(ctx, WING, 1.7, 0.85, boil, true);
}

function paintLeg(ctx: CanvasRenderingContext2D, hip: Pt, p: HeronPose, i: number, boil: number): void {
  const ph = p.step + i * Math.PI;
  const lift = Math.max(0, Math.sin(ph)) * p.walk;
  const foot = { x: hip.x + 10 + 40 * Math.cos(ph) * p.walk, y: -lift * 40 };
  // The heel (the joint that bends backwards) sits about halfway down.
  const heel = { x: (hip.x + foot.x) / 2 + 14 + 10 * lift, y: (hip.y + foot.y) / 2 + 6 };
  const far = i === 0;
  const thigh = spline([hip, { x: hip.x + 6, y: hip.y + 50 }, heel], 5);
  const shank = spline([heel, foot], 5);
  const t = band(thigh, far ? 22 : 26, far ? 9 : 10).shape;
  const s = band(shank, far ? 9 : 10, far ? 8 : 9).shape;
  fillShape(ctx, s, far ? '#3a382c' : LEG);
  fillShape(ctx, t, far ? '#3f3d30' : LEG);
  // Rusty feathered thighs at the top of the leg.
  // Rusty feathered thighs where the leg leaves the belly: soft, no outline.
  softLine(ctx, thigh.slice(0, 5), far ? 22 : 26, far ? '#6e4430' : RUST, 0.9, 4);
  for (let k = 0; k < 4; k++) softLine(ctx, [thigh[k]!, { x: thigh[k]!.x + 3, y: thigh[k]!.y + 10 }], 2, '#5a3220', 0.5, 2);
  if (!far) softLine(ctx, thigh.slice(3), 3, LEG_LIT, 0.6, 2);
  inkLine(ctx, t.slice(Math.floor(t.length * 0.1)), 1.2, far ? 0.5 : 0.8, boil);
  inkLine(ctx, s, 1.1, far ? 0.5 : 0.8, boil, true);
  // Long toes: three forward, one back.
  for (const [reach, drop] of [[54, 2], [44, 8], [-26, 1]] as const) {
    const tip = { x: foot.x + reach, y: foot.y + drop + 10 * lift };
    const toe = curve(foot, { x: (foot.x + tip.x) / 2, y: foot.y - 2 }, tip, 6);
    softLine(ctx, toe, 7, far ? '#3a382c' : LEG, 1, 2);
    inkLine(ctx, toe, 1, far ? 0.5 : 0.8, boil);
  }
}

// ---------------------------------------------------------------- neck

/** The neck's middle line from the body to the back of the head, in body units. */
export function neckLine(p: HeronPose): Pt[] {
  const base = turn(NECK_BASE, PIVOT, p.lean);
  const h = p.head;
  const attach = { x: h.x + turn({ x: -8, y: 6 }, { x: 0, y: 0 }, h.a).x * HEAD_SCALE, y: h.y + turn({ x: -8, y: 6 }, { x: 0, y: 0 }, h.a).y * HEAD_SCALE };
  const len = Math.hypot(attach.x - base.x, attach.y - base.y);
  // Out forwards from the breast, back in the middle, forwards again to the head: the S.
  const c1 = { x: base.x + len * (0.1 + 0.35 * p.kink), y: base.y - len * 0.3 };
  const c2 = { x: attach.x - len * (0.15 + 0.45 * p.kink) * Math.cos(h.a), y: attach.y + len * 0.3 - len * 0.2 * Math.sin(h.a) };
  return Array.from({ length: 25 }, (_, i) => {
    const u = i / 24;
    const v = 1 - u;
    return {
      x: v * v * v * base.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * attach.x,
      y: v * v * v * base.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * attach.y,
    };
  });
}

function paintNeck(ctx: CanvasRenderingContext2D, p: HeronPose, boil: number): void {
  const line = neckLine(p);
  const n = line.length - 1;
  // Width along the neck, with the lump (0 at the head end, 1 at the body).
  const widths = line.map((_, i) => {
    const s = 1 - i / n;
    const w = 21 + 25 * s * s;
    const lump = p.lump.size * 34 * Math.exp(-(((s - p.lump.at) / 0.12) ** 2));
    return w + lump;
  });
  const left: Pt[] = [];
  const right: Pt[] = [];
  line.forEach((q, i) => {
    const a = line[Math.max(0, i - 1)]!;
    const b = line[Math.min(n, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    left.push({ x: q.x + (nx * widths[i]!) / 2, y: q.y + (ny * widths[i]!) / 2 });
    right.push({ x: q.x - (nx * widths[i]!) / 2, y: q.y - (ny * widths[i]!) / 2 });
  });
  const shape = [...left, ...[...right].reverse()];
  const [front, back] = p.face > 0 ? [right, left] : [left, right];
  fillShape(ctx, shape, NECK);
  within(ctx, shape, () => {
    // Rounded: shadow down the back of the neck, light down the middle, a warm lilac cast.
    const avg = widths.reduce((sum, w) => sum + w, 0) / widths.length;
    softLine(ctx, back, avg * 0.9, '#5a606d', 0.55, 6);
    softLine(ctx, line.map((q, i) => ({ x: (q.x * 2 + front[i]!.x) / 3, y: (q.y * 2 + front[i]!.y) / 3 })), avg * 0.45, '#c3c6cc', 0.5, 6);
    softLine(ctx, line, avg * 0.7, NECK_WARM, 0.18, 4);
    // Feather streaks lying down the neck.
    const rnd = seeded(97);
    for (let i = 1; i < n; i++) {
      const a = line[i - 1]!;
      const b = line[i]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const [tx, ty] = [(a.x - b.x) / len, (a.y - b.y) / len];
      for (let k = 0; k < 10; k++) {
        const u = rnd() * 2 - 1;
        const w = widths[i]! / 2;
        const q = { x: b.x - ty * u * w * 0.9, y: b.y + tx * u * w * 0.9 };
        softLine(ctx, [q, { x: q.x + tx * 3 + ty, y: q.y + ty * 3 - tx }], 0.6, '#5f6571', 0.06 + rnd() * 0.08, 1);
      }
    }
    // The front: a white stripe streaked with dark.
    softLine(ctx, front, 13, WHITE, 0.75, 4);
    for (let i = 3; i < n - 2; i += 2) {
      const q = front[i]!;
      const j = (rnd() - 0.5) * 5;
      softLine(ctx, [{ x: q.x + j, y: q.y - 2 }, { x: q.x + j + 1, y: q.y + 3 }], 2.4, '#3b3f4a', 0.14 + rnd() * 0.14, 2);
    }
    if (p.lump.size > 0.02) {
      const at = line[Math.round((1 - p.lump.at) * n)]!;
      dab(ctx, at.x - 6, at.y - 8, 26, '230,226,220', 0.45 * p.lump.size);
    }
  });
  inkLine(ctx, left.slice(1, -1), 1.6, 0.8, boil);
  inkLine(ctx, right.slice(1, -1), 1.6, 0.8, boil);
  // Shaggy pale plumes falling from the lower front of the neck over the breast.
  const rnd = seeded(131);
  for (let i = 0; i < 14; i++) {
    const r = front[Math.floor(n * (0.08 + rnd() * 0.42))]!;
    const len = 26 + rnd() * 40;
    const sway = (rnd() - 0.3) * 14;
    const plume = curve(r, { x: r.x + 6 + sway * 0.5, y: r.y + len * 0.5 }, { x: r.x + 4 + sway, y: r.y + len }, 8);
    softLine(ctx, plume, 5 + rnd() * 3, i % 3 ? '#e3e4e6' : '#c9cbd0', 0.75, 3);
    inkLine(ctx, plume, 0.7, 0.35, boil);
  }
}

// ---------------------------------------------------------------- the whole bird

function inBody(ctx: CanvasRenderingContext2D, p: HeronPose, paint: () => void): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face * p.k, p.k);
  paint();
  ctx.restore();
}

/** Everything but the head: legs, body, neck and wing. Draw what the bill holds next, then drawHeronHead. */
export function drawHeronBody(ctx: CanvasRenderingContext2D, p: HeronPose, boil: number): void {
  inBody(ctx, p, () => {
    const hips = HIPS.map((h) => turn(h, PIVOT, p.lean));
    if (p.legs) paintLeg(ctx, hips[0]!, p, 0, boil);
    ctx.save();
    ctx.translate(PIVOT.x, PIVOT.y);
    ctx.rotate(p.lean);
    ctx.translate(-PIVOT.x, -PIVOT.y);
    paintBody(ctx, boil);
    ctx.restore();
    paintNeck(ctx, p, boil);
    ctx.save();
    ctx.translate(PIVOT.x, PIVOT.y);
    ctx.rotate(p.lean);
    ctx.translate(-PIVOT.x, -PIVOT.y);
    paintWing(ctx, boil);
    ctx.restore();
    if (p.legs) paintLeg(ctx, hips[1]!, p, 1, boil);
  });
}

/** Transforms ctx into the head's frame (bill along +x), runs `paint`, restores. */
export function inHead(ctx: CanvasRenderingContext2D, p: HeronPose, paint: () => void): void {
  inBody(ctx, p, () => {
    ctx.translate(p.head.x, p.head.y);
    ctx.rotate(p.head.a);
    ctx.scale(HEAD_SCALE, HEAD_SCALE);
    paint();
  });
}

export function drawHeronHead(ctx: CanvasRenderingContext2D, p: HeronPose, boil: number): void {
  inHead(ctx, p, () => paintHeronHead(ctx, p.head.gape, p.head.throat, boil));
}

/** The inside of the open mouth, drawn before what the bill holds. */
export function drawHeronMouth(ctx: CanvasRenderingContext2D, p: HeronPose): void {
  inHead(ctx, p, () => paintMouthInside(ctx, p.head.gape));
}

/** A point in the head's frame, in world px. */
export function headToWorld(p: HeronPose, q: Pt): Pt {
  const h = turn({ x: p.head.x + q.x * HEAD_SCALE, y: p.head.y + q.y * HEAD_SCALE }, { x: p.head.x, y: p.head.y }, p.head.a);
  return { x: p.x + h.x * p.face * p.k, y: p.y + h.y * p.k };
}
