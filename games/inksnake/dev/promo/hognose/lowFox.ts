import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, makeDraw, oval, pt } from '../../../src/art/kit';
import { BOIL, PAPER_FILL } from '../../../src/art/palette';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/critters/tomcatKit';
import { hairs } from '../../../src/art/critters/tomcatFur';
import { blackHair, FOX, model, redHair, wash, whiteHair } from '../../../src/art/chapters/barrensFoxArtFur';

/**
 * The Red Fox's head side on at ground level, facing left (the nose at the
 * origin, the neck running off to the right), in the game fox's colours
 * (barrensFoxArtFur.ts FOX): the long tapering muzzle with its black nose,
 * the rufous bridge and crown, the white upper lip, chin, cheek ruff and
 * throat, the dark tear line, an amber eye with a slit pupil and a
 * catchlight, tall ears with black backs and pale inner tufts, whiskers.
 * Poses: 'calm' (sniffing), 'wince' (a whiff of the musk: eye screwed shut,
 * ears flattened back, the bridge wrinkled).
 */
export type FoxFace = 'calm' | 'wince';

/** The baked canvas in head px, where the nose sits in it, canvas px per head px, and the size it is drawn at on screen. */
export const FOX_CANVAS = { w: 1200, h: 1000, ox: 40, oy: 420, res: 1.5, scale: 1.08 } as const;
/** The eye's middle, head px (for the "!" over it). */
export const FOX_EYE = pt(264, -56);

const LINE = '#1d1210';
const LIGHT_SHIFT = pt(-6, -9);

const HEAD: readonly Pt[] = [
  ...cub(pt(6, -16), pt(60, -30), pt(150, -50), pt(228, -66), 14),
  ...cub(pt(228, -66), pt(250, -92), pt(280, -124), pt(330, -140), 8).slice(1),
  ...cub(pt(330, -140), pt(380, -152), pt(440, -146), pt(490, -126), 10).slice(1),
  ...cub(pt(490, -126), pt(590, -96), pt(720, -50), pt(860, 30), 14).slice(1),
  ...cub(pt(860, 30), pt(960, 90), pt(1060, 170), pt(1150, 260), 10).slice(1),
  pt(1150, 560), pt(760, 560),
  ...cub(pt(700, 420), pt(560, 310), pt(450, 236), pt(370, 178), 12),
  ...cub(pt(370, 178), pt(330, 168), pt(300, 150), pt(286, 136), 5).slice(1),
  ...cub(pt(286, 136), pt(262, 128), pt(236, 104), pt(206, 82), 6).slice(1),
  ...cub(pt(206, 82), pt(150, 72), pt(80, 54), pt(40, 40), 10).slice(1),
  ...cub(pt(40, 40), pt(20, 36), pt(4, 26), pt(-2, 14), 5).slice(1),
  ...cub(pt(-2, 14), pt(-12, 6), pt(-8, -8), pt(6, -16), 5).slice(1),
];
/** The pale fur: upper lip, chin, cheek ruff and throat. */
const WHITE: readonly Pt[] = [
  ...cub(pt(20, 18), pt(80, 26), pt(150, 30), pt(214, 24), 10),
  ...cub(pt(214, 24), pt(250, 10), pt(300, 0), pt(340, 30), 8).slice(1),
  ...cub(pt(340, 30), pt(380, 70), pt(420, 150), pt(480, 230), 8).slice(1),
  pt(760, 560), pt(300, 560),
  ...cub(pt(206, 90), pt(150, 78), pt(60, 56), pt(10, 36), 8),
];
const MOUTH: readonly Pt[] = cub(pt(26, 28), pt(80, 38), pt(140, 46), pt(196, 54), 12);
const NOSE: readonly Pt[] = oval(10, 2, 23, 18, 26);

interface Ear {
  readonly shape: Pt[];
  readonly inner: Pt[];
}

/** An ear from its base (front, back) to its tip, laid back by `back` radians about the base's middle. */
function ear(front: Pt, backBase: Pt, tip: Pt, back: number): Ear {
  const c = pt((front.x + backBase.x) / 2, (front.y + backBase.y) / 2);
  const rot = (p: Pt): Pt => pt(c.x + (p.x - c.x) * Math.cos(back) - (p.y - c.y) * Math.sin(back), c.y + (p.x - c.x) * Math.sin(back) + (p.y - c.y) * Math.cos(back));
  const shape = [...cub(front, pt(front.x - 6, front.y - 90), pt(tip.x - 26, tip.y + 60), tip, 12), ...cub(tip, pt(tip.x + 30, tip.y + 70), pt(backBase.x + 6, backBase.y - 90), backBase, 12).slice(1)].map(rot);
  const inner = [...cub(pt(front.x + 10, front.y - 4), pt(front.x + 4, front.y - 80), pt(tip.x - 14, tip.y + 80), pt(tip.x - 2, tip.y + 46), 10), ...cub(pt(tip.x - 2, tip.y + 46), pt(tip.x + 10, tip.y + 100), pt(front.x + 50, front.y - 50), pt(front.x + 56, front.y - 6), 10).slice(1)].map(rot);
  return { shape, inner };
}

const inside = (poly: readonly Pt[], p: Pt): boolean => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
};

function paintEar(d: Draw, e: Ear, far: boolean, seed: number): void {
  const { pen } = d;
  wash(d, e.shape, far ? FOX.blackSoft : FOX.base, LIGHT_SHIFT, 0.5);
  pen.clipped(e.shape, () => {
    const xs = e.shape.map((p) => p.x);
    const back = Math.max(...xs);
    // The ear's back and tip black, the front's rufous edge, the pale tufts inside.
    hairs(d, e.shape, { dir: () => -1.45, color: (p, r) => (p.x > back - 46 || p.y < Math.min(...e.shape.map((q) => q.y)) + 70 || far ? blackHair(r) : redHair(r, 0.12)) }, 900, seed, 16, 1.3);
    if (!far) {
      pen.fill(e.inner, FOX.cream, 0.55);
      hairs(d, e.inner, { dir: () => -1.2, color: (_, r) => whiteHair(r) }, 260, seed + 1, 22, 1.1);
    }
  });
  pen.stroke(closed(e.shape), 3, LINE, 0.9);
}

function eye(d: Draw, face: FoxFace): void {
  const { pen } = d;
  const { ctx } = pen;
  const c = FOX_EYE;
  const lid = (k: number): Pt[] => oval(0, 0, 32, 16 * k, 30).map((p) => pt(c.x + p.x * Math.cos(-0.24) - p.y * Math.sin(-0.24), c.y + p.x * Math.sin(-0.24) + p.y * Math.cos(-0.24)));
  // The dark tear line from the eye's front corner down the muzzle's side.
  pen.hair(cub(pt(238, -42), pt(222, -30), pt(206, -14), pt(186, 6), 8), 5, FOX.black, 0.75);
  if (face === 'wince') {
    const shut = cub(pt(236, -44), pt(252, -38), pt(274, -46), pt(290, -62), 10);
    pen.stroke(shut, 4.2, LINE, 1);
    for (const [x, y, dx, dy] of [[290, -62, 14, -6], [292, -58, 14, 4], [236, -44, -10, -10]] as const) pen.hair([pt(x, y), pt(x + dx, y + dy)], 2, LINE, 0.8);
    return;
  }
  const ball = lid(1);
  pen.fill(lid(1.25), FOX.black, 0.9);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 3, c.y + 3, 2, c.x, c.y, 28);
    g.addColorStop(0, '#f7c64e');
    g.addColorStop(0.55, FOX.eye);
    g.addColorStop(1, FOX.eyeDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 30, c.y - 20, 60, 40);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      pen.hair([pt(c.x + Math.cos(a) * 5, c.y + Math.sin(a) * 5), pt(c.x + Math.cos(a) * 17, c.y + Math.sin(a) * 12)], 0.8, FOX.eyeDeep, 0.4);
    }
    pen.fill(oval(c.x + 1, c.y, 4.2, 14.5, 16), '#0d0807', 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - 15)), FOX.deep, 0.45);
  });
  pen.stroke(closed(ball), 3.2, LINE, 1, false);
  pen.dot(c.x - 8, c.y - 6, 4.4, PAPER_FILL, 1);
  pen.dot(c.x + 7, c.y + 5, 1.4, PAPER_FILL, 0.6);
}

function nose(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.clipped(NOSE, () => {
    const g = ctx.createRadialGradient(4, -6, 2, 10, 2, 26);
    g.addColorStop(0, '#5a4c48');
    g.addColorStop(0.45, '#2a201e');
    g.addColorStop(1, FOX.nose);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, 60, 50);
  });
  pen.fill(oval(-2, 6, 6, 4, 12), '#060403', 0.9);
  pen.dot(2, -8, 4, PAPER_FILL, 0.75);
  pen.stroke(closed(NOSE), 2.4, LINE, 1);
}

function whiskers(d: Draw): void {
  const rng = createRng(61051);
  for (let i = 0; i < 9; i++) {
    const o = pt(70 + rng() * 70, 6 + rng() * 22);
    const a = Math.PI - 0.25 + rng() * 0.75;
    const l = 90 + rng() * 80;
    d.pen.hair(cub(o, pt(o.x + Math.cos(a) * l * 0.4, o.y + Math.sin(a) * l * 0.4), pt(o.x + Math.cos(a + 0.1) * l * 0.8, o.y + Math.sin(a + 0.1) * l * 0.8 + 6), pt(o.x + Math.cos(a + 0.18) * l, o.y + Math.sin(a + 0.18) * l + 12), 6), 1.2, LINE, 0.7);
  }
}

function drawFace(d: Draw, face: FoxFace): void {
  const { pen } = d;
  const lay = face === 'wince' ? 0.55 : 0;
  paintEar(d, ear(pt(450, -134), pt(536, -110), pt(520, -350), lay), true, 61011);
  // The coat: rufous wash, the paler cheek and muzzle side, the hairs brushed back from the nose and down the neck.
  wash(d, HEAD, FOX.base, LIGHT_SHIFT, 0.45);
  pen.clipped(HEAD, () => {
    glaze(d, 150, -30, 140, 26, -0.15, FOX.light, 0.4);
    glaze(d, 360, -70, 110, 50, 0, FOX.rich, 0.3);
    glaze(d, 560, -40, 160, 70, 0.3, FOX.grizzle, 0.25);
    glaze(d, 900, 200, 260, 160, 0.6, FOX.rich, 0.35);
    pen.fill(WHITE, FOX.white, 0.9);
    glaze(d, 330, 110, 90, 60, 0.6, FOX.whiteDeep, 0.35);
  });
  const dir = (p: Pt): number => (p.x < 240 ? -0.12 + (p.y > 10 ? 0.25 : 0) : p.y > 60 ? 0.9 : 0.25 + (p.x - 240) * 0.0009);
  hairs(d, HEAD, { dir, color: (p, r) => (inside(WHITE, p) ? whiteHair(r) : redHair(r, p.y < -90 ? 0.18 : 0.05)) }, 8200, 61001, 20, 1.3);
  model(d, HEAD, pt(260, -40), 260, 110, LIGHT_SHIFT, 0.25);
  if (face === 'wince') for (const x of [120, 146, 172]) pen.hair(cub(pt(x, -44), pt(x + 6, -36), pt(x + 10, -30), pt(x + 8, -22), 5), 2, LINE, 0.6);
  pen.hair(MOUTH, 3.2, FOX.black, 0.9);
  eye(d, face);
  nose(d);
  whiskers(d);
  pen.stroke(HEAD.slice(0, 57), 3.4, LINE, 1);
  pen.stroke(HEAD.slice(59), 3, LINE, 0.95);
  paintEar(d, ear(pt(338, -138), pt(446, -138), pt(410, -372), lay), false, 61021);
}

/** Bakes a face once per boil frame. */
export function bakeFox(face: FoxFace, seed: number): HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(FOX_CANVAS.w * FOX_CANVAS.res, FOX_CANVAS.h * FOX_CANVAS.res);
    ctx.scale(FOX_CANVAS.res, FOX_CANVAS.res);
    ctx.translate(FOX_CANVAS.ox, FOX_CANVAS.oy);
    drawFace(makeDraw(ctx, seed + f, f, 0, LINE), face);
    return canvas;
  });
}
