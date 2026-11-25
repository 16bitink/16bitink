import { Pen } from '../../../src/art/pen';
import { BIRD as B, clipTo, curve, feather, fillShape, hair, lens, linear, loop, pathOf, pt, type Pt, rngOf, scatter, soft, type Tone, underlay } from './paint';

/**
 * The greater roadrunner's head, side on and facing +x, painted: a shaggy
 * blackish-brown crest with buff-edged feathers, a streaked buff face and
 * pale throat, a pale yellow eye, the bare skin behind it (pale blue running
 * to orange-red), and the long stout dark bill with its hooked tip, opened by
 * `gape` about the corner of the mouth. Units: the bill is about 340 long, the
 * origin is the eye's centre.
 *
 * Passes, so a snake can lie in the mouth: `headUnder` (the outline, under
 * the neck), `mouthInside`, [the snake], `headOver` (both mandibles, skull,
 * crest).
 */
export interface HeadLook {
  /** 0 crest flat .. 1 raised. */
  readonly crest: number;
  /** Turn of each mandible off the gape line, radians. */
  readonly gape: number;
  /** 0 open .. 1 shut. */
  readonly lid: number;
  /** Where the eye looks, −1 .. 1 forward. */
  readonly gaze?: number;
}

export const CORNER: Pt = pt(66, 34);
/** Where a held snake leaves the bill, between the tips. */
export const GRIP: Pt = pt(412, 48);
const LINE = 7;
const SEED = 4100;

const SKULL: readonly Pt[] = loop([
  pt(128, 2), pt(112, -50), pt(72, -92), pt(10, -120), pt(-64, -124), pt(-130, -104), pt(-182, -56), pt(-204, 12), pt(-196, 80),
  pt(-150, 130), pt(-70, 152), pt(10, 140), pt(72, 106), pt(112, 60),
], 7);
const TOP: readonly Pt[] = [...curve([pt(94, -52), pt(170, -48), pt(280, -32), pt(372, -8), pt(428, 22), pt(448, 62)], 8), ...curve([pt(448, 62), pt(440, 66), pt(424, 46), pt(392, 38), pt(260, 38), pt(150, 38), pt(48, 34)], 8).slice(1)];
const LOW: readonly Pt[] = [...curve([pt(46, 34), pt(150, 38), pt(270, 40), pt(370, 44), pt(424, 52)], 8), ...curve([pt(424, 52), pt(380, 64), pt(290, 78), pt(190, 86), pt(84, 88)], 8).slice(1)];

const turn = (p: Pt, a: number): Pt => {
  const [c, s, x, y] = [Math.cos(a), Math.sin(a), p.x - CORNER.x, p.y - CORNER.y];
  return pt(CORNER.x + x * c - y * s, CORNER.y + x * s + y * c);
};
const topAt = (gape: number): Pt[] => TOP.map((p) => turn(p, -gape * 0.75));
const lowAt = (gape: number): Pt[] => LOW.map((p) => turn(p, gape * 1.25));

/** The crest's feathers: root, length, its angle lying flat and raised. */
const CREST = Array.from({ length: 28 }, (_, i) => {
  const rng = rngOf(SEED + 200 + i * 7);
  const u = i / 27;
  const root = pt(70 - u * 250 + (rng() - 0.5) * 18, -78 - Math.sin(u * Math.PI * 0.92 + 0.25) * 34 + u * 74);
  const up = -1.85 - u * 1.05 + (rng() - 0.5) * 0.5;
  return { root, len: 96 + Math.sin(Math.min(1, u * 1.1) * Math.PI) * 88 + rng() * 74, up, flat: -Math.PI + 0.1 - u * 0.12 + (rng() - 0.5) * 0.15, w: 26 + rng() * 14, bend: 0.1 + rng() * 0.3, r: rng() };
});

const FACE = scatter(SKULL, 17, SEED, Math.PI);

function crestFeather(ctx: CanvasRenderingContext2D, f: (typeof CREST)[number], look: HeadLook): void {
  const ang = f.flat + (f.up - f.flat) * look.crest;
  ctx.fillStyle = B.crestTip;
  lens(ctx, f.root.x, f.root.y, ang, f.len, f.w, -f.bend);
  ctx.fill();
  ctx.fillStyle = f.r < 0.5 ? B.crest : B.core;
  lens(ctx, f.root.x, f.root.y, ang, f.len * 0.97, f.w * 0.74, -f.bend);
  ctx.fill();
  hair(ctx, f.root.x + Math.cos(ang) * 14, f.root.y + Math.sin(ang) * 14, ang - 0.04, f.len * 0.7, 6, B.crestLit, 0.75, -f.bend);
}

function crestUnder(ctx: CanvasRenderingContext2D, look: HeadLook, w: number): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = B.ink;
  ctx.lineWidth = w * 2;
  for (const f of CREST) {
    lens(ctx, f.root.x, f.root.y, f.flat + (f.up - f.flat) * look.crest, f.len, f.w, -f.bend);
    ctx.stroke();
  }
  ctx.restore();
}

/** The outline of the skull and crest: goes under the neck's fill. `k` thickens the line for a small head. */
export function headUnder(ctx: CanvasRenderingContext2D, look: HeadLook, k = 1): void {
  underlay(ctx, SKULL, LINE * k, B.ink);
  crestUnder(ctx, look, LINE * 0.75 * k);
  for (const s of [topAt(look.gape), lowAt(look.gape)]) underlay(ctx, s, LINE * 0.9 * k, B.ink);
  fillShape(ctx, SKULL, B.face);
}

/** The inside of the mouth, seen in the gape. */
export function mouthInside(ctx: CanvasRenderingContext2D, look: HeadLook): void {
  if (look.gape <= 0.01) return;
  const t = turn(pt(412, 42), -look.gape * 0.75);
  const l = turn(pt(404, 50), look.gape * 1.25);
  const shape = [CORNER, turn(pt(200, 20), -look.gape * 0.75), t, l, turn(pt(200, 60), look.gape * 1.25)];
  fillShape(ctx, shape, linear(ctx, CORNER, pt(380, 44), [[0, B.mouth], [0.6, '#5a2022'], [1, B.mouthLit]]));
}

function mandible(ctx: CanvasRenderingContext2D, shape: readonly Pt[], upper: boolean, gape: number, boil: number, k: number): void {
  const a = upper ? -gape * 0.75 : gape * 1.25;
  fillShape(ctx, shape, upper
    ? linear(ctx, turn(pt(240, -62), a), turn(pt(240, 40), a), [[0, B.billMid], [0.22, B.billLit], [0.5, B.billMid], [1, B.billDeep]])
    : linear(ctx, turn(pt(240, 36), a), turn(pt(240, 100), a), [[0, B.billMid], [0.4, B.billPale], [1, B.billDeep]]));
  clipTo(ctx, shape, () => {
    const at = (x: number, y: number): Pt => turn(pt(x, y), a);
    if (upper) {
      const tip = at(424, 36);
      soft(ctx, tip.x, tip.y, 86, 62, 0.5, B.billDeep, 0.85);
      const base = at(96, 0);
      soft(ctx, base.x, base.y, 90, 70, 0, B.brownDeep, 0.5);
      // The long light on the culmen's side, and fine growth lines.
      const lit = curve([at(130, -34), at(240, -24), at(340, -4), at(398, 22)], 8);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,250,240,0.5)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      lit.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 9; i++) {
        const p = at(150 + i * 27, -20 + i * 5);
        hair(ctx, p.x, p.y, a + 0.2, 60, 3, B.billDeep, 0.4);
      }
      // The slit nostril.
      const n = at(146, -10);
      hair(ctx, n.x, n.y, a + 0.12, 52, 12, B.ink, 0.95);
    } else {
      const tip = at(396, 56);
      soft(ctx, tip.x, tip.y, 80, 40, 0.2, B.billDeep, 0.7);
      for (let i = 0; i < 6; i++) {
        const p = at(120 + i * 36, 62 - i * 2);
        hair(ctx, p.x, p.y, a + 0.06, 60, 3, B.billDeep, 0.35);
      }
    }
  });
  const pen = new Pen(ctx, SEED + boil * 31 + (upper ? 1 : 2), 1.1);
  pen.stroke([...shape.slice(0, -1)], 5 * k, B.ink, 0.95, false);
}

function bareSkin(ctx: CanvasRenderingContext2D, boil: number, k: number): void {
  const shape = [...curve([pt(52, -14), pt(30, -42), pt(-14, -46), pt(-60, -34), pt(-112, -22), pt(-158, -4)], 8), ...curve([pt(-158, -4), pt(-138, 22), pt(-92, 28), pt(-44, 34), pt(8, 46), pt(40, 30), pt(52, -14)], 8).slice(1)];
  fillShape(ctx, shape, linear(ctx, pt(50, 0), pt(-156, 4), [[0, B.skinBlue], [0.3, '#86b2dc'], [0.5, B.skinPale], [0.62, '#f0c6a4'], [0.78, B.skinRed], [1, B.skinDeep]]));
  clipTo(ctx, shape, () => {
    soft(ctx, -20, -34, 70, 16, -0.1, '#ffffff', 0.5);
    soft(ctx, -60, 30, 90, 16, -0.1, B.skinDeep, 0.35);
    const rng = rngOf(SEED + 9);
    for (let i = 0; i < 26; i++) hair(ctx, 10 - rng() * 150, -26 + rng() * 52, Math.PI + (rng() - 0.5) * 0.5, 22, 3, '#33465e', 0.28);
  });
  new Pen(ctx, SEED + 40 + boil * 17, 0.8).stroke([...shape, shape[0]!], 3.4 * k, B.ink, 0.8, false);
}

function eye(ctx: CanvasRenderingContext2D, look: HeadLook, boil: number, k: number): void {
  const r = 34;
  const ball = loop(Array.from({ length: 16 }, (_, i) => pt(Math.cos((i / 16) * 6.2832) * r * 1.04, Math.sin((i / 16) * 6.2832) * r * 0.96)), 3);
  underlay(ctx, ball, 7, B.ink);
  const g = ctx.createRadialGradient(-4, -6, 4, 0, 0, r * 1.05);
  g.addColorStop(0, B.irisLit);
  g.addColorStop(0.62, B.iris);
  g.addColorStop(0.9, B.irisDeep);
  g.addColorStop(1, '#4a3512');
  fillShape(ctx, ball, g);
  clipTo(ctx, ball, () => {
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      hair(ctx, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, a, r * 0.42, 2.2, B.irisDeep, 0.35);
    }
    const x = 3 + (look.gaze ?? 0) * 6;
    ctx.fillStyle = B.pupil;
    ctx.beginPath();
    ctx.arc(x, 0, r * 0.5, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,10,4,0.34)';
    ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 0.75);
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath();
    ctx.ellipse(x - 11, -11, 8, 6.4, -0.5, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x + 12, 12, 3, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (look.lid > 0.01) {
      const y = -r * 1.1 + look.lid * r * 2.25;
      fillShape(ctx, [pt(-r * 1.3, -r * 1.4), pt(r * 1.3, -r * 1.4), ...curve([pt(r * 1.3, y - 10), pt(0, y + 4), pt(-r * 1.3, y - 10)], 6)], linear(ctx, pt(0, -r), pt(0, r), [[0, B.skinBlue], [1, B.skinPale]]));
    }
  });
  // A hard brow over the eye: the bird's fierce, unbothered look.
  const pen = new Pen(ctx, SEED + 60 + boil * 13, 0.7);
  pen.stroke(curve([pt(-46, -22), pt(-16, -40), pt(22, -36), pt(50, -12)], 6), 9 * k, B.ink, 0.95, false);
  if (look.lid > 0.3) pen.stroke(curve([pt(-36, 2), pt(0, 12), pt(36, 2)], 5), 4 * k, B.ink, look.lid, false);
}

function faceTone(x: number, y: number, r: number): Tone {
  // Dark crown spotted buff, a streaked buff cheek, a pale throat.
  if (y < -52 + x * 0.06) return { edge: r < 0.4 ? B.crestTip : B.coreSoft, core: B.crest, k: 0.8 };
  if (y > 78) return { edge: r < 0.7 ? B.throat : B.edgeLit, core: B.coreSoft, k: r < 0.3 ? 0.3 : 0 };
  return { edge: r < 0.5 ? B.edge : B.face, core: r < 0.4 ? B.core : B.brownDeep, k: r < 0.62 ? 0.42 : 0.2 };
}

/** Everything over the snake in the bill: mandibles, skull, crest, face. `k` thickens lines for a small head. */
export function headOver(ctx: CanvasRenderingContext2D, look: HeadLook, boil: number, k = 1): void {
  mandible(ctx, lowAt(look.gape), false, look.gape, boil, k);
  mandible(ctx, topAt(look.gape), true, look.gape, boil, k);
  for (let i = CREST.length - 1; i >= 0; i -= 2) crestFeather(ctx, CREST[i]!, look);
  fillShape(ctx, SKULL, linear(ctx, pt(0, -120), pt(0, 150), [[0, B.coreSoft], [0.36, B.brown], [0.6, B.face], [1, B.throat]]));
  for (const s of FACE) {
    if (s.x > 96 && s.y > -44 && s.y < 70) continue;
    const ang = Math.PI + (s.y - 10) * -0.0022 + (s.y > 70 ? -(s.y - 70) * 0.012 : 0) + (s.x > 40 ? (s.y > 20 ? -0.5 : 0.5) * ((s.x - 40) / 90) : 0) + (s.r2 - 0.5) * 0.3;
    const small = s.x > 30 ? 0.72 : s.x < -120 ? 1.35 : 1;
    feather(ctx, s.x, s.y, ang, (36 + s.r2 * 16) * small, (15 + s.r * 5) * small, faceTone(s.x, s.y, s.r), 0.92, 0.1);
  }
  ctx.save();
  pathOf(ctx, SKULL);
  ctx.clip();
  soft(ctx, 20, 150, 190, 60, 0, B.bellyShade, 0.45);
  soft(ctx, -40, -110, 150, 44, 0, '#ffe9c0', 0.18);
  // The dark line through the lores to the bill.
  soft(ctx, 78, 4, 56, 26, 0.1, B.core, 0.7);
  ctx.restore();
  for (let i = CREST.length - 2; i >= 0; i -= 2) crestFeather(ctx, CREST[i]!, look);
  bareSkin(ctx, boil, k);
  eye(ctx, look, boil, k);
  // Small feathers over the bill's root, so the skull has no hard edge there.
  const edge = rngOf(SEED + 71);
  for (let i = 0; i < 46; i++) {
    const u = edge();
    const x = 112 - 34 * u * u + (edge() - 0.5) * 22;
    const y = -10 + u * 116 + (edge() - 0.5) * 10;
    feather(ctx, x - 12, y, 0.25 + u * 0.75 + (edge() - 0.5) * 0.5, 30 + edge() * 14, 11, u > 0.62 ? { edge: B.throat, core: B.coreSoft, k: 0 } : { edge: edge() < 0.5 ? B.edge : B.face, core: B.core, k: edge() < 0.5 ? 0.36 : 0 }, 0.95, 0.1);
  }
  // Rictal bristles over the bill's base.
  const rng = rngOf(SEED + 77);
  for (let i = 0; i < 16; i++) hair(ctx, 84 + rng() * 26, -58 + rng() * 64, 0.15 + (rng() - 0.5) * 0.7, 46 + rng() * 26, 4.4, B.ink, 0.85);
  for (let i = 0; i < 8; i++) hair(ctx, 76 + rng() * 24, 60 + rng() * 34, 0.2 + (rng() - 0.5) * 0.5, 34 + rng() * 18, 4, B.brownDeep, 0.7);
}
