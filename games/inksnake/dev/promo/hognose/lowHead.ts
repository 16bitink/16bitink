import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, makeDraw, oval, pt } from '../../../src/art/kit';
import { BOIL, PAPER_FILL } from '../../../src/art/palette';
import { makeCanvas, type Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { blotch, fleck, HOG, snakeEye, washV } from './lowPaint';

/**
 * The eastern hognose's head side on, for the low, ground-level shots,
 * facing +x, in screen px for a neck NECK_R × 2 deep (it meets the body at
 * x = 0, its back melting into the neck drawn under it). Stocky and short;
 * the snout's tip a broad shovel turned sharply up (the rostral, keeled);
 * tan-olive, darker over the crown, pale along the lips and throat; the dark
 * bar across the crown in front of the eyes and the dark stripe from the eye
 * back to the jaw's angle; the big umber blotch on the neck; a brown eye
 * with a round pupil. Poses: 'shut', and 'gape' (playing dead): the lower
 * jaw dropped wide from the hinge at the back of the head, two thin jaws,
 * the pink-white lining between them, no teeth showing. Drawn upside down
 * (flipped top to bottom) when the snake lies belly up.
 */
export type HeadPose = 'shut' | 'gape';

export const NECK_R = 75;
/** The baked canvas in head px, where the head's origin sits in it, and canvas px per head px (it is drawn up to twice size). */
export const HEAD_CANVAS = { w: 560, h: 560, ox: 170, oy: 250, res: 2 } as const;

const TIP = pt(266, -82);
const RICTUS = pt(72, 12);
/** The hinge the lower jaw swings from (the quadrate, at the back of the head). */
const HINGE = pt(44, 10);
/**
 * Where the limp tongue shows in the gape (head units, as painted right side up): lying along the roof of the
 * upside-down mouth just inside the front of the jaw that lies lowest on screen, from where it spills over the
 * lip onto the sand.
 */
export const TONGUE_ROOT = pt(178, 8);
/** The snout's front, under the rostral (head units), where a flicked tongue comes out. */
export const SNOUT = pt(246, -14);
/** The gape, about 72° between the jaws: the skull barely tilted (it lies on the sand), the lower jaw swung wide (radians, about HINGE). */
const UP = -0.04;
const DOWN = 1.22;

const TOP: readonly Pt[] = [
  ...cub(pt(-80, -NECK_R), pt(20, -NECK_R - 2), pt(100, -NECK_R + 1), pt(150, -67), 14),
  ...cub(pt(150, -67), pt(186, -61), pt(206, -50), pt(224, -48), 8).slice(1),
  ...cub(pt(224, -48), pt(240, -48), pt(254, -62), TIP, 8).slice(1),
];
const ROSTRAL: readonly Pt[] = cub(TIP, pt(266, -60), pt(258, -30), SNOUT, 10);
const LIP: readonly Pt[] = cub(SNOUT, pt(200, -6), pt(130, 4), RICTUS, 16);
const CHIN: readonly Pt[] = [
  ...cub(pt(238, -8), pt(236, 8), pt(216, 22), pt(182, 32), 8),
  ...cub(pt(182, 32), pt(130, 48), pt(40, 66), pt(-80, NECK_R), 16).slice(1),
];
const HEAD: readonly Pt[] = [...TOP, ...ROSTRAL.slice(1), ...CHIN];
/** The skull alone: down to the upper lip and back from the mouth's corner to the neck. */
const SKULL: readonly Pt[] = [...TOP, ...ROSTRAL.slice(1), ...LIP.slice(1), ...cub(RICTUS, pt(30, 18), pt(-20, 22), pt(-80, 26), 8).slice(1)];

const turn = (pts: readonly Pt[], a: number, c: Pt): Pt[] =>
  pts.map((p) => pt(c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a), c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a)));

/** The skull's skin: the countershaded wash, the head's markings, the shields and keeled neck scales. */
function paintSkull(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  washV(pen, shape, [[-82, HOG.crown], [-60, HOG.back], [-30, HOG.flank], [-4, HOG.low], [12, HOG.lip], [30, HOG.throat]]);
  pen.clipped(shape, () => {
    glaze(ctx, 60, -40, 120, 30, 0, HOG.olive, 0.3);
    glaze(ctx, 236, -40, 26, 30, 0, HOG.ochre, 0.3);
    // The neck's big umber blotch and the crown's dark bar in front of the eyes.
    blotch(pen, [pt(-80, -78), pt(-6, -78), pt(4, -60), pt(-4, -22), pt(-30, -14), pt(-80, -20)]);
    blotch(pen, [pt(160, -72), pt(196, -64), pt(200, -50), pt(184, -42), pt(166, -48)], 0.9);
    // The stripe from the eye down and back to the jaw's angle.
    blotch(pen, [pt(150, -22), pt(132, -6), pt(96, 12), pt(70, 16), pt(78, 2), pt(118, -16), pt(138, -36)], 0.95);
    // The light over the crown and the snout's upturned tip; the throat side turning away.
    glaze(ctx, 120, -66, 110, 9, 0, PAPER_FILL, 0.3);
    glaze(ctx, 252, -64, 14, 8, -0.8, PAPER_FILL, 0.4);
    glaze(ctx, 40, 20, 120, 18, 0, HOG.shadow, 0.16);
    fleck(pen, shape, 260, 41011, 1.1, HOG.blotchDeep, 0.35);
  });
  shields(d);
}

/** The head's shields: the keeled rostral, internasals, the brow over the eye, the big crown plates, lip scales and the keeled scales of the neck. */
function shields(d: Draw): void {
  const { pen } = d;
  const ink = HOG.line;
  pen.hair(cub(pt(226, -50), pt(240, -54), pt(254, -66), pt(264, -80), 6), 1.3, ink, 0.6);
  pen.hair(cub(pt(242, -44), pt(250, -40), pt(254, -30), pt(250, -18), 6), 1.1, ink, 0.45);
  for (const [x0, y0, x1, y1] of [[220, -50, 224, -30], [200, -56, 206, -34], [176, -64, 180, -50], [120, -72, 126, -52], [84, -75, 92, -50], [40, -76, 50, -46]] as const) {
    pen.hair(cub(pt(x0, y0), pt(x0 + 2, y0 + 8), pt(x1 - 2, y1 - 6), pt(x1, y1), 5), 1.1, ink, 0.45);
  }
  pen.hair(cub(pt(134, -50), pt(146, -58), pt(164, -56), pt(172, -46), 8), 1.6, ink, 0.7);
  pen.fill(oval(236, -32, 4.5, 3.2, 12), ink, 0.85);
  for (let x = 228; x > 90; x -= 17) {
    const y = -10 + ((228 - x) / 140) * 18;
    pen.hair([pt(x, y), pt(x - 3, y - 13)], 1.1, ink, 0.5);
  }
  const rng = createRng(41020);
  for (let i = 0; i < 70; i++) {
    const x = -78 + rng() * 120;
    const y = -70 + rng() * 80;
    pen.hair([pt(x, y), pt(x + 7, y + 1.5), pt(x + 12, y + 0.5)], 0.8, ink, 0.22);
  }
}

/** The lower jaw and throat: a slender pale jaw, its lip edged, the throat's cream skin. */
function paintJaw(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  washV(pen, shape, [[-10, HOG.lip], [26, HOG.throat], [60, HOG.bellyCool], [80, '#a39a82']]);
  pen.clipped(shape, () => {
    glaze(pen.ctx, 120, 30, 120, 16, 0.3, PAPER_FILL, 0.3);
    fleck(pen, shape, 90, 41031, 1, HOG.mottle, 0.3);
  });
}

function eye(d: Draw, c: Pt): void {
  snakeEye(d.pen, c, 17, oval);
}

/** The point a share u of the way along a polyline (by index, its points being evenly spaced). */
const at = (line: readonly Pt[], u: number): Pt => {
  const f = Math.max(0, Math.min(1, u)) * (line.length - 1);
  const i = Math.min(line.length - 2, Math.floor(f));
  const k = f - i;
  return pt(line[i]!.x + (line[i + 1]!.x - line[i]!.x) * k, line[i]!.y + (line[i + 1]!.y - line[i]!.y) * k);
};

/**
 * The open mouth, between the upper lip (snout to hinge) and the lower jaw's lip (hinge to chin): the lining
 * pale pink at the lips, deepening to the dark red-brown gullet in the hinge's corner; the upper jaw's soft
 * shadow on it; a few faint folds running its length; the glottis's little tube on the floor; a wet sheen.
 * Its front is the far side's lips curving back between the two jaw tips, so it reads as a hollow. No teeth.
 */
function drawMouth(d: Draw, upper: readonly Pt[], lower: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  const roof = [...upper].reverse();
  const tipU = upper[0]!;
  const tipL = lower[lower.length - 1]!;
  const corner = pt(HINGE.x + 14, HINGE.y + 8);
  const mid = pt((tipU.x + tipL.x) / 2, (tipU.y + tipL.y) / 2);
  // The far lips bow back towards the hinge between the two tips.
  const front = cub(tipL, pt(tipL.x + (corner.x - tipL.x) * 0.28 + 10, tipL.y + (corner.y - tipL.y) * 0.28), pt(mid.x + (corner.x - mid.x) * 0.3, mid.y + (corner.y - mid.y) * 0.3), tipU, 12);
  const inside = [...upper, ...lower.slice(1), ...front.slice(1, -1)];
  const reach = Math.hypot(mid.x - corner.x, mid.y - corner.y);
  pen.fill(inside, PAPER_FILL, 1);
  pen.clipped(inside, () => {
    const g = ctx.createRadialGradient(corner.x, corner.y, 2, corner.x, corner.y, reach * 1.05);
    g.addColorStop(0, '#2e1010');
    g.addColorStop(0.12, '#5a1f24');
    g.addColorStop(0.3, '#93454f');
    g.addColorStop(0.55, '#d98f96');
    g.addColorStop(0.8, '#f0c8c6');
    g.addColorStop(1, '#f8e4e0');
    ctx.fillStyle = g;
    ctx.fillRect(-200, -300, 700, 700);
    // Pale where the lining turns over the lips.
    pen.hair(upper.slice(0, -2), 10, '#f7dcd8', 0.55);
    pen.hair(lower.slice(2), 10, '#f7dcd8', 0.55);
    // The upper jaw's soft shadow cast on the lining under it.
    for (const [off, w, a] of [[12, 26, 0.18], [8, 14, 0.22]] as const) {
      pen.hair(upper.slice(0, -3).map((p) => pt(p.x, p.y + off)), w, '#6a2a32', a);
    }
    // Faint folds running the mouth's length, each with a lit edge.
    for (const f of [0.3, 0.55, 0.78]) {
      const fold = Array.from({ length: 9 }, (_, i) => {
        const u = 0.16 + (i / 8) * 0.66;
        const bow = Math.sin((i / 8) * Math.PI) * 0.06;
        const a = at(roof, u);
        const b = at(lower, u);
        return pt(a.x + (b.x - a.x) * (f + bow), a.y + (b.y - a.y) * (f + bow));
      });
      pen.hair(fold, 2, '#8e3f48', 0.2);
      pen.hair(fold.map((p) => pt(p.x + 2, p.y - 2)), 1.6, '#fbe9e6', 0.22);
    }
    // The glottis: a little pale tube lying forward on the floor of the mouth.
    const gl = at(lower, 0.62);
    const glottis = oval(0, 0, 15, 5.5, 14).map((p) => pt(gl.x + p.x * Math.cos(DOWN) - (p.y - 8) * Math.sin(DOWN), gl.y + p.x * Math.sin(DOWN) + (p.y - 8) * Math.cos(DOWN)));
    pen.fill(glottis, '#eaa7ab', 0.6);
    pen.hair(closed(glottis), 1, '#9a4a54', 0.4);
    glaze(ctx, mid.x + (corner.x - mid.x) * 0.3, mid.y + (corner.y - mid.y) * 0.3, reach * 0.22, reach * 0.08, Math.atan2(mid.y - corner.y, mid.x - corner.x) + 1.4, PAPER_FILL, 0.4);
  });
  // The far side's lips at the front: a slim pale strip, inked.
  pen.hair(front, 7, HOG.lip, 0.9);
  pen.hair(front, 1.4, HOG.line, 0.7);
}

/** The back of the head melts into the neck drawn under it. */
function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-80, 0, -10, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-200, -300, 190, 600);
  ctx.restore();
}

function drawShut(d: Draw): void {
  const { pen } = d;
  paintSkull(d, HEAD);
  pen.clipped(HEAD, () => paintJaw(d, [...LIP, ...cub(RICTUS, pt(30, 18), pt(-20, 22), pt(-80, 26), 8).slice(1), pt(-80, NECK_R + 4), ...[...CHIN].reverse()]));
  eye(d, pt(150, -32));
  pen.hair(LIP, 2.4, HOG.line, 0.95);
  pen.stroke(TOP, 3.4, HOG.line, 1);
  pen.stroke(ROSTRAL, 3, HOG.line, 1);
  pen.stroke(CHIN, 3, HOG.line, 1);
}

/** The throat's skin, stretched from under the middle of the dropped jaw straight back to the neck's underside. */
const throatLine = (from: Pt): Pt[] => cub(from, pt(40, NECK_R + 2), pt(-20, NECK_R + 1), pt(-80, NECK_R), 10);

interface Gape {
  /** The lower jaw: a slender bone, its lip from the hinge to the chin, the chin, its underside back. */
  readonly jaw: Pt[];
  readonly lip: Pt[];
  readonly throat: Pt[];
  /** The outer contour: round the chin, along the jaw's underside, back along the throat to the neck. */
  readonly outline: Pt[];
}

function gapeJaw(): Gape {
  // The mandible: slim and slightly curved, its lip (inner edge) from the hinge to the chin, its scaled outer edge back again.
  const lip = turn(cub(HINGE, pt(100, 22), pt(170, 16), pt(230, -2), 16), DOWN, HINGE);
  const chin = lip[lip.length - 1]!;
  const under = turn(cub(pt(236, 12), pt(190, 30), pt(120, 36), pt(52, 30), 14), DOWN, HINGE);
  const front = cub(chin, pt(chin.x + 9, chin.y + 3), pt(under[0]!.x + 7, under[0]!.y - 3), under[0]!, 5);
  const k = Math.round(under.length * 0.6);
  const neck = throatLine(under[k]!);
  return {
    jaw: [...lip, ...front.slice(1, -1), ...under],
    lip,
    throat: [...neck, pt(-80, 20), HINGE, ...[...under.slice(k)].reverse()],
    outline: [...front, ...under.slice(1, k + 1), ...neck.slice(1)],
  };
}

/** A jaw's scales along its edge: short inked ticks between the labial scales, a pale strip along the lip. */
function jawScales(d: Draw, edge: readonly Pt[], inward: number, every: number): void {
  for (let i = 2; i < edge.length - 2; i += every) {
    const a = edge[i - 1]!;
    const b = edge[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = pt((-(b.y - a.y) / len) * inward, ((b.x - a.x) / len) * inward);
    const p = edge[i]!;
    d.pen.hair([p, pt(p.x + n.x * 11, p.y + n.y * 11)], 1.2, HOG.line, 0.55);
  }
}

function drawGape(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const { jaw, lip, throat, outline } = gapeJaw();
  // The throat's skin stretched from the dropped jaw back to the neck.
  washV(pen, throat, [[20, HOG.throat], [60, HOG.belly], [100, HOG.bellyCool]]);
  pen.clipped(throat, () => {
    glaze(ctx, 30, 50, 60, 30, 0.6, HOG.shadow, 0.22);
    for (let i = 0; i < 5; i++) pen.hair(cub(pt(-60 + i * 22, 72), pt(-40 + i * 20, 62), pt(-10 + i * 16, 50), pt(10 + i * 12, 34), 6), 1.1, HOG.mottle, 0.3);
    fleck(pen, throat, 80, 41041, 1.2, HOG.mottle, 0.3);
  });
  // The mandible: a slim bone in skin, pale along its lip, darker along its scaled outer edge.
  washV(pen, jaw, [[0, HOG.lip], [120, HOG.throat], [200, HOG.bellyCool]]);
  pen.clipped(jaw, () => {
    const under = jaw.slice(lip.length + 3);
    pen.hair(under, 12, HOG.shadow, 0.2);
    pen.hair(lip.map((p) => pt(p.x + 4, p.y - 1)), 6, PAPER_FILL, 0.4);
    fleck(pen, jaw, 40, 41051, 1, HOG.mottle, 0.3);
  });
  jawScales(d, jaw.slice(lip.length + 3), 1, 3);
  const upperLip = turn(LIP, UP, HINGE);
  drawMouth(d, [...upperLip, ...turn(cub(RICTUS, pt(60, 12), pt(52, 11), HINGE, 3), UP, HINGE).slice(1)], lip);
  pen.stroke(lip, 2.2, HOG.line, 1);
  pen.stroke(outline, 3, HOG.line, 1);
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(UP);
  ctx.translate(-HINGE.x, -HINGE.y);
  paintSkull(d, SKULL);
  // The upper jaw's lip: a slim pale strip of scales along the mouth's edge.
  pen.clipped(SKULL, () => pen.hair(LIP.map((p) => pt(p.x, p.y - 5)), 10, HOG.lip, 0.85));
  jawScales(d, LIP, 1, 2);
  eye(d, pt(150, -32));
  pen.stroke(TOP, 3.4, HOG.line, 1);
  pen.stroke(ROSTRAL, 3, HOG.line, 1);
  pen.stroke(LIP, 2.2, HOG.line, 1);
  ctx.restore();
}

/** Bakes a pose once per boil frame. */
export function bakeHead(pose: HeadPose, seed: number): HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(HEAD_CANVAS.w * HEAD_CANVAS.res, HEAD_CANVAS.h * HEAD_CANVAS.res);
    ctx.scale(HEAD_CANVAS.res, HEAD_CANVAS.res);
    ctx.translate(HEAD_CANVAS.ox, HEAD_CANVAS.oy);
    const d = makeDraw(ctx, seed + f, f, 0, HOG.line);
    if (pose === 'shut') drawShut(d);
    else drawGape(d);
    dissolveBack(ctx);
    return canvas;
  });
}
