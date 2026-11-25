import { Pen } from '../../../src/art/pen';
import { type CoyotePose } from './coyoteGait';
import { clipTo, coatOf, curve, fillShape, hair, linear, loop, type Plume, pt, type Pt, rngOf, soft, underlay } from './paint';

/**
 * The coyote's head side on, facing +x: a broad crown and cheek ruff, a long
 * narrow muzzle, grey-tan above with a warm cast, white lips and throat, a
 * yellow eye with a dark rim, big pointed ears. Units as the body's; origin
 * where the neck meets the skull.
 */
const H = {
  ink: '#1d1713', tan: '#c8aa82', tanLit: '#ecd8b4', grey: '#9a8c76', rust: '#ad7d52', rustLit: '#cfa278', cream: '#f8eed9', creamDeep: '#d2bf9f', black: '#1a1513',
  iris: '#e6b83a', irisDeep: '#8c5c17', ear: '#eedcbc', earDeep: '#7a5a40',
} as const;
const SEED = 8800;
const K = 1.14;

const SKULL: readonly Pt[] = loop([
  pt(-52, 20), pt(-50, -24), pt(-24, -58), pt(20, -68), pt(56, -56), pt(80, -32), pt(122, -20), pt(168, -11), pt(192, -4), pt(198, 10), pt(188, 24), pt(140, 30), pt(88, 38), pt(50, 58), pt(4, 70), pt(-34, 58),
], 6);
const JAW: readonly Pt[] = loop([pt(24, 40), pt(84, 34), pt(136, 28), pt(176, 26), pt(180, 35), pt(146, 45), pt(94, 56), pt(44, 66)], 6);
const EYE = pt(78, -20);

/** An ear: the outline, from its front base round the tip to its back base. */
function ear(flat: number, far: boolean): { out: Pt[]; inner: Pt[]; a: number; root: Pt } {
  const a = -1.62 - flat * 1.4 + (far ? 0.3 - flat * 0.1 : 0);
  const root = far ? pt(24, -54) : pt(-8, -48);
  const w = 1 - flat * 0.3;
  const at = (l: number, n: number): Pt => pt(root.x + Math.cos(a) * l - Math.sin(a) * n * w, root.y + Math.sin(a) * l + Math.cos(a) * n * w);
  const out = [...curve([at(-14, 26), at(18, 38), at(58, 28), at(96, 10), at(116, -2)], 6), ...curve([at(116, -2), at(86, -22), at(44, -38), at(8, -38), at(-14, -28)], 6).slice(1)];
  const inner = [...curve([at(2, 24), at(32, 27), at(66, 18), at(98, 2)], 6), ...curve([at(98, 2), at(66, -6), at(30, -10), at(2, -4)], 6).slice(1)];
  return { out, inner, a, root };
}

function inHead(ctx: CanvasRenderingContext2D, at: Pt, p: CoyotePose, draw: () => void): void {
  const facing = Math.cos(p.turn * Math.PI);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(K * (Math.abs(facing) < 0.3 ? 0.3 * Math.sign(facing || 1) : facing), K);
  ctx.rotate(p.head);
  draw();
  ctx.restore();
}

/** The cheek ruff: long soft fur off the jaw's corner and the back of the skull. */
const RUFF: readonly Plume[] = (() => {
  const rng = rngOf(SEED + 21);
  return Array.from({ length: 40 }, (_, i) => {
    const u = i / 39;
    const p = pt(28 - u * 62 + (rng() - 0.5) * 18, 56 - Math.abs(u - 0.2) * 62 + (rng() - 0.5) * 16);
    const r = rng();
    return { x: p.x, y: p.y, ang: Math.PI * (0.72 + u * 0.28) + (rng() - 0.5) * 0.3, len: 50 + r * 22, w: 16, tone: { edge: u < 0.4 ? (r < 0.7 ? H.cream : H.creamDeep) : u > 0.8 ? (r < 0.6 ? H.grey : H.tan) : r < 0.5 ? H.tanLit : r < 0.8 ? H.tan : H.grey, core: H.ink, k: 0 }, bend: 0.1 };
  });
})();

function paintEar(ctx: CanvasRenderingContext2D, flat: number, far: boolean): void {
  const e = ear(flat, far);
  underlay(ctx, e.out, 5.5, H.ink);
  const tip = pt(e.root.x + Math.cos(e.a) * 112, e.root.y + Math.sin(e.a) * 112);
  fillShape(ctx, e.out, linear(ctx, e.root, tip, [[0, H.tan], [0.6, H.rust], [1, '#54382a']]));
  const rng = rngOf(SEED + (far ? 31 : 33));
  clipTo(ctx, e.out, () => {
    for (let i = 0; i < 80; i++) {
      const l = rng() * 106;
      const n = (rng() - 0.5) * 70;
      hair(ctx, e.root.x + Math.cos(e.a) * l - Math.sin(e.a) * n, e.root.y + Math.sin(e.a) * l + Math.cos(e.a) * n, e.a + (rng() - 0.5) * 0.4, 20, 4, rng() < 0.5 ? H.rustLit : rng() < 0.6 ? H.rust : H.tanLit, 0.55, 0.1);
    }
    if (far) fillShape(ctx, e.out, '#2a1f2a', 0.3);
  });
  if (far) return;
  // The shell: a dark hollow edged with long pale hairs.
  fillShape(ctx, e.inner, linear(ctx, e.root, tip, [[0, '#6a4a38'], [0.5, '#a9846a'], [1, '#8a6148']]));
  clipTo(ctx, e.inner, () => {
    for (let i = 0; i < 46; i++) {
      const l = -4 + rng() * 66;
      const n = -6 + rng() * 32;
      hair(ctx, e.root.x + Math.cos(e.a) * l - Math.sin(e.a) * n, e.root.y + Math.sin(e.a) * l + Math.cos(e.a) * n, e.a + 0.12 + (rng() - 0.5) * 0.3, 34, 4.2, H.ear, 0.8, 0.12);
    }
  });
}

export function coyoteHeadUnder(ctx: CanvasRenderingContext2D, at: Pt, p: CoyotePose, line: number): void {
  inHead(ctx, at, p, () => {
    paintEar(ctx, p.ears, true);
    underlay(ctx, SKULL, line, H.ink);
    coatOf(ctx, RUFF, line * 0.8);
    underlay(ctx, ear(p.ears, false).out, line, H.ink);
  });
}

function mouth(ctx: CanvasRenderingContext2D, p: CoyotePose): void {
  const drop = p.jaw * 0.2;
  ctx.save();
  ctx.translate(44, 40);
  ctx.rotate(drop);
  ctx.translate(-44, -40);
  if (drop > 0.02) {
    fillShape(ctx, [pt(64, 18), pt(176, 14), pt(176, 32), pt(64, 44)], '#5a1d22');
    fillShape(ctx, loop([pt(84, 34), pt(126, 24), pt(168, 20), pt(186, 28), pt(158, 34), pt(114, 38)], 5), '#d9807c');
    for (const x of [148, 166]) fillShape(ctx, [pt(x, 27), pt(x + 4, 14), pt(x + 9, 27)], '#fbf4e2');
  }
  underlay(ctx, JAW, 5.5, H.ink);
  fillShape(ctx, JAW, linear(ctx, pt(0, 26), pt(0, 66), [[0, H.cream], [1, H.creamDeep]]));
  ctx.restore();
}

function face(ctx: CanvasRenderingContext2D, rng: () => number): void {
  fillShape(ctx, SKULL, linear(ctx, pt(30, -68), pt(40, 70), [[0, H.grey], [0.34, H.tan], [0.58, H.rustLit], [0.72, H.cream], [1, H.cream]]));
  clipTo(ctx, SKULL, () => {
    for (let i = 0; i < 420; i++) {
      const x = -52 + rng() * 244;
      const y = -68 + rng() * 138;
      const muzzle = x > 88;
      const below = y > (muzzle ? 10 : 26 - x * 0.06);
      const col = below ? (rng() < 0.75 ? H.cream : H.creamDeep) : muzzle ? (rng() < 0.4 ? H.rust : rng() < 0.6 ? H.rustLit : H.tan) : y < -34 ? (rng() < 0.45 ? '#5d5041' : H.grey) : rng() < 0.3 ? H.rustLit : rng() < 0.6 ? H.tan : H.tanLit;
      // Fur lies back from the nose and down the cheek.
      hair(ctx, x, y, Math.PI + (y + 8) * -0.012 + (rng() - 0.5) * 0.4, (muzzle ? 11 : 19) + rng() * 8, muzzle ? 3 : 4.4, col, 0.6, 0.12);
    }
    soft(ctx, 108, -20, 60, 9, 0.18, '#fff2d6', 0.5);
    soft(ctx, 50, 8, 40, 26, 0, H.rust, 0.26);
    soft(ctx, 120, 12, 70, 10, 0, H.rust, 0.25);
  });
}

function eye(ctx: CanvasRenderingContext2D, p: CoyotePose, pen: Pen): void {
  const r = 11 + p.wide * 5;
  const lift = p.wide * 6;
  fillShape(ctx, [...curve([pt(EYE.x - 21, EYE.y + 2), pt(EYE.x - 10, EYE.y - 14 - lift), pt(EYE.x + 9, EYE.y - 13 - lift), pt(EYE.x + 21, EYE.y + 5)], 5), ...curve([pt(EYE.x + 21, EYE.y + 5), pt(EYE.x + 2, EYE.y + 14 + lift * 0.7), pt(EYE.x - 21, EYE.y + 2), pt(EYE.x - 34, EYE.y + 5)], 4)], H.ink);
  const ball = (c: string, q: number, x = EYE.x, y = EYE.y): void => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, q, 0, 7);
    ctx.fill();
  };
  ball(H.irisDeep, r);
  ball(H.iris, r * 0.86);
  const px = EYE.x + p.look.x * r * 0.34;
  const py = EYE.y + p.look.y * r * 0.34;
  ball(H.black, r * (0.5 - p.wide * 0.16), px, py);
  ball('#fffdf2', r * 0.24, EYE.x - r * 0.34, EYE.y - r * 0.4);
  if (p.wide < 0.6) fillShape(ctx, [pt(EYE.x - 18, EYE.y - 16), pt(EYE.x + 18, EYE.y - 12), pt(EYE.x + 15, EYE.y - 4), pt(EYE.x - 16, EYE.y - 7)], H.tan, 1 - p.wide);
  pen.stroke(curve([pt(EYE.x - 22, EYE.y), pt(EYE.x - 10, EYE.y - 12 - lift), pt(EYE.x + 8, EYE.y - 12 - lift), pt(EYE.x + 21, EYE.y + 3)], 5), 5, H.ink, 1, false);
  // The pale brow mark.
  for (let i = 0; i < 8; i++) hair(ctx, EYE.x - 14 + i * 4, EYE.y - 22 - lift, Math.PI + 0.4, 16, 4, H.cream, 0.75, 0.1);
}

export function coyoteHead(ctx: CanvasRenderingContext2D, at: Pt, p: CoyotePose, boil: number): void {
  inHead(ctx, at, p, () => {
    const pen = new Pen(ctx, SEED + boil * 13, 0.6);
    const rng = rngOf(SEED + 3);
    mouth(ctx, p);
    paintEar(ctx, p.ears, false);
    face(ctx, rng);
    coatOf(ctx, RUFF, 0);
    // The crown's fur over the ear's base.
    for (let i = 0; i < 60; i++) hair(ctx, -44 + rng() * 78, -50 + rng() * 18, -2.2 + (rng() - 0.5) * 0.9, 18 + rng() * 10, 4.4, rng() < 0.35 ? '#6b5d4c' : rng() < 0.5 ? H.grey : H.tanLit, 0.75, 0.15);
    eye(ctx, p, pen);
    const nose = loop([pt(180, -11), pt(196, -11), pt(205, -1), pt(200, 9), pt(188, 7), pt(180, -2)], 5);
    fillShape(ctx, nose, H.black);
    soft(ctx, 191, -7, 8, 4, 0, '#c9c2bc', 0.8);
    pen.stroke(curve([pt(194, 12), pt(184, 22), pt(138, 26), pt(90, 33), pt(62, 44)], 5), 4.4, H.ink, 0.95, false);
    for (let i = 0; i < 5; i++) pen.hair([pt(158 - i * 8, 10 + i), pt(140 - i * 10, 22 + i * 3), pt(116 - i * 10, 38 + i * 4)], 1.8, H.ink, 0.5);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = H.ink;
      ctx.beginPath();
      ctx.arc(140 + (i % 3) * 12, 6 + Math.floor(i / 3) * 6, 1.6, 0, 7);
      ctx.fill();
    }
    pen.stroke(curve([pt(80, -35), pt(124, -21), pt(178, -11)], 6), 4.6, H.ink, 0.85, false);
  });
}
