import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import { B, BLACK_TONES, blackWash, claws, contour, furEdge, hairs, jointedLimb, paintMantle } from './badgerPaint';

/**
 * The honey badger's body side on, facing +x, without its head (badgerHead.ts
 * is drawn on at NECK): a real mustelid build, about 2.3 times as long as it
 * is tall at the shoulder: heavy rounded shoulders with a hump over the
 * forequarters, a thick neck, a slightly lower, narrower waist, rounded
 * haunches and a deep chest. The silver-white mantle covers the top from the
 * nape to the root of the tail, its edge a soft curve along the flank. The
 * black fur is shaded (a cool sheen on the rounds, the underside sinking into
 * shadow) and its outline broken by tufts. Short, thick, slightly bowed
 * forelegs with the elbow showing, broad forefeet with five long pale digging
 * claws splayed on the sand; hind legs with a bent hock and flat
 * (plantigrade) feet with short claws; a short thick tail.
 *
 *   'stand'  four-square, the ground at y = GROUND
 *   'lunge'  the forelegs thrown forward to grab
 *   'flop'   collapsed on its side: the trunk down on the ground, the legs
 *            limp towards us with their soles showing, the tail lying flat
 */
export type BodyPose = 'stand' | 'lunge' | 'flop';

export const GROUND = 80;

/** Where the head's nape pivot sits on each pose (body art units), and its resting tilt (radians, + = nose down). */
export const NECK: Readonly<Record<BodyPose, { readonly x: number; readonly y: number; readonly tilt: number }>> = {
  stand: { x: 98, y: -44, tilt: 0.26 },
  lunge: { x: 100, y: -42, tilt: 0.16 },
  flop: { x: 96, y: 4, tilt: 0.34 },
};

/** The trunk: nape over the shoulder hump, down to the waist, up over the haunch, round the rump, under the tucked belly to the deep chest. */
const TRUNK: readonly Pt[] = [
  ...cub(pt(102, -46), pt(88, -62), pt(70, -70), pt(46, -69), 10),
  ...cub(pt(46, -69), pt(20, -68), pt(-8, -56), pt(-34, -54), 10).slice(1),
  ...cub(pt(-34, -54), pt(-62, -54), pt(-92, -64), pt(-112, -52), 10).slice(1),
  ...cub(pt(-112, -52), pt(-132, -40), pt(-140, -14), pt(-134, 6), 8).slice(1),
  ...cub(pt(-134, 6), pt(-128, 22), pt(-112, 30), pt(-96, 28), 8).slice(1),
  ...cub(pt(-96, 28), pt(-70, 22), pt(-36, 18), pt(-6, 22), 10).slice(1),
  ...cub(pt(-6, 22), pt(20, 28), pt(46, 42), pt(70, 40), 10).slice(1),
  ...cub(pt(70, 40), pt(96, 36), pt(112, 14), pt(114, -6), 8).slice(1),
  ...cub(pt(114, -6), pt(116, -24), pt(112, -38), pt(102, -46), 6).slice(1),
];
/** The mantle's border: a soft curve from the neck along the flank, rising to the root of the tail. */
const BORDER: readonly Pt[] = [
  ...cub(pt(120, -20), pt(96, -26), pt(66, -30), pt(36, -24), 10),
  ...cub(pt(36, -24), pt(6, -18), pt(-36, -14), pt(-76, -20), 10).slice(1),
  ...cub(pt(-76, -20), pt(-104, -26), pt(-122, -36), pt(-136, -44), 8).slice(1),
];
const MANTLE: readonly Pt[] = [pt(-150, -46), pt(-150, -110), pt(130, -110), pt(130, -22), ...BORDER];
/** The rounds the light catches: the shoulder hump, the haunch, the chest. */
const SHOULDER = { x: 56, y: -6, rx: 44, ry: 40 } as const;
const HAUNCH = { x: -98, y: -6, rx: 42, ry: 38 } as const;

interface LegSpec {
  readonly joints: readonly Pt[];
  readonly widths: readonly number[];
  /** Which way the foot points (radians, 0 = forward along the ground). */
  readonly dir: number;
  readonly fore: boolean;
  /** Lying on its side: the leg out towards us, its sole showing. */
  readonly sole?: boolean;
}

interface Spec {
  readonly dy: number;
  readonly squash: number;
  readonly farFore: LegSpec;
  readonly farHind: LegSpec;
  readonly nearFore: LegSpec;
  readonly nearHind: LegSpec;
  readonly tail: readonly Pt[];
}

const leg = (joints: readonly Pt[], widths: readonly number[], dir: number, fore: boolean, sole = false): LegSpec => ({ joints, widths, dir, fore, sole });

/** Forelegs: shoulder, elbow (bulging back), the bowed forearm, wrist. Hind legs: hip, knee, hock (bent back), heel. */
const SPECS: Readonly<Record<BodyPose, Spec>> = {
  stand: {
    dy: 0, squash: 1,
    farFore: leg([pt(40, 4), pt(22, 34), pt(26, 52), pt(34, 66)], [38, 32, 26, 22], 0.04, true),
    farHind: leg([pt(-74, 6), pt(-58, 32), pt(-86, 56), pt(-90, 68)], [40, 32, 22, 19], 0.02, false),
    nearHind: leg([pt(-98, 8), pt(-80, 34), pt(-110, 56), pt(-114, 68)], [50, 38, 25, 21], 0.02, false),
    nearFore: leg([pt(64, 6), pt(44, 36), pt(48, 52), pt(58, 66)], [46, 38, 30, 25], 0.06, true),
    tail: [pt(-124, -40), pt(-142, -46), pt(-156, -44), pt(-164, -38)],
  },
  lunge: {
    dy: 0, squash: 1,
    farFore: leg([pt(44, 4), pt(46, 34), pt(70, 50), pt(92, 58)], [38, 32, 26, 22], 0.3, true),
    farHind: leg([pt(-74, 6), pt(-70, 34), pt(-100, 54), pt(-108, 68)], [40, 32, 22, 19], 0.02, false),
    nearHind: leg([pt(-98, 8), pt(-94, 36), pt(-128, 54), pt(-136, 68)], [50, 38, 25, 21], 0.02, false),
    nearFore: leg([pt(66, 6), pt(68, 34), pt(94, 50), pt(118, 56)], [46, 38, 30, 25], 0.34, true),
    tail: [pt(-124, -40), pt(-146, -42), pt(-160, -36), pt(-168, -28)],
  },
  flop: {
    dy: 40, squash: 0.94,
    farFore: leg([pt(40, 30), pt(60, 46), pt(78, 56)], [34, 28, 22], Math.PI / 2, true, true),
    farHind: leg([pt(-104, 30), pt(-124, 46), pt(-138, 56)], [38, 30, 22], Math.PI / 2, false, true),
    nearHind: leg([pt(-92, 44), pt(-100, 64), pt(-104, 80)], [48, 36, 26], Math.PI / 2, false, true),
    nearFore: leg([pt(52, 46), pt(64, 64), pt(70, 80)], [44, 34, 25], Math.PI / 2, true, true),
    tail: [pt(-128, 8), pt(-150, 26), pt(-164, 48), pt(-170, 66)],
  },
};

/**
 * A forefoot: a broad black paw on the sand, its toes rounded along the
 * front, and five long pale digging claws (about 1.5 times the foot's
 * length) splayed forward along the ground, each curving down to its tip.
 * A hind foot: a long flat sole from the heel to the toes, short claws.
 */
function foot(d: Draw, l: LegSpec, dark: boolean): void {
  const { pen } = d;
  const wrist = l.joints[l.joints.length - 1]!;
  const c = Math.cos(l.dir);
  const s = Math.sin(l.dir);
  const len = l.fore ? 20 : 30;
  const h = GROUND - wrist.y;
  const back = l.fore ? 8 : 12;
  const to = (x: number, y: number): Pt => pt(wrist.x + x * c - y * s, wrist.y + x * s + y * c);
  const shape = [
    to(-back, -3),
    ...cub(to(-back * 0.2, -6), to(len * 0.5, h * 0.2), to(len * 0.85, h * 0.35), to(len + 3, h * 0.62), 8),
    ...cub(to(len + 3, h * 0.62), to(len + 5, h * 0.85), to(len + 2, h), to(len - 3, h), 6).slice(1),
    ...cub(to(len - 3, h), to(len * 0.4, h + 0.5), to(-back * 0.5, h), to(-back - 2, h - 3), 8).slice(1),
    ...cub(to(-back - 2, h - 3), to(-back - 3, h * 0.5), to(-back - 1, 2), to(-back, -3), 6).slice(1),
  ];
  blackWash(d, shape, to(len * 0.3, h * 0.3), dark ? 0.12 : 0.38);
  hairs(d, shape, 30, 6500 + Math.round(wrist.x), 4, () => l.dir + 0.5, BLACK_TONES, 0.4);
  // The toes: little rounds along the front of the foot.
  const toes = l.fore ? 4 : 4;
  for (let i = 0; i < toes; i++) {
    const u = 0.42 + i * 0.16;
    const p = to(len * u, h * (0.3 + u * 0.38));
    pen.hair(oval(p.x, p.y, 3.4, 2.6, 10).slice(10, 20), 0.7, dark ? B.coal : B.sheen, 0.8);
  }
  pen.stroke(shape.slice(1), 1.3, B.line, dark ? 0.7 : 0.95, false);
  furEdge(d, shape, 14, 3, 6600 + Math.round(wrist.x), B.black, 0, 0.45);
  if (l.fore) {
    // Five long claws, splayed a little, out along the sand.
    // Fanned: the far toes' claws higher and shorter, the near ones lower, longer and lying on the sand.
    for (let i = 0; i < 5; i++) {
      const root = to(len - 6 + i * 2.2, h * 0.22 + i * h * 0.15);
      claws(d, root, l.dir - 0.12 + i * 0.1, 1, 25 + i * 1.6, 3.8, 0);
    }
  } else {
    for (let i = 3; i >= 0; i--) claws(d, to(len + 1 + i * 0.5, h * 0.55 + i * 1.4), l.dir + 0.2 - i * 0.05, 1, 10, 3.2, 0);
  }
}

/** A paw seen from below, its sole turned to us (the badger lying on its side): the broad pad, the toe pads, the claws curling out past them. */
function soleOn(d: Draw, l: LegSpec, dark: boolean): void {
  const { pen } = d;
  const end = l.joints[l.joints.length - 1]!;
  const prev = l.joints[l.joints.length - 2]!;
  const a = Math.atan2(end.y - prev.y, end.x - prev.x);
  const r = l.widths[l.widths.length - 1]! * (l.fore ? 0.78 : 0.72);
  const c = pt(end.x + Math.cos(a) * r * 0.5, end.y + Math.sin(a) * r * 0.5);
  const rim = oval(c.x, c.y, r, r * 0.86, 22);
  blackWash(d, rim, pt(c.x - r * 0.3, c.y - r * 0.3), dark ? 0.15 : 0.4);
  const padTone = dark ? '#2e2729' : '#4a3f41';
  pen.fill(oval(c.x - Math.cos(a) * r * 0.15, c.y - Math.sin(a) * r * 0.15, r * 0.56, r * 0.42, 18), padTone, 1);
  glaze(pen.ctx, c.x - r * 0.2, c.y - r * 0.25, r * 0.3, r * 0.16, 0, '#ffffff', 0.18);
  const n = l.fore ? 5 : 4;
  for (let i = 0; i < n; i++) {
    const ang = a + (i - (n - 1) / 2) * 0.36;
    const tp = pt(c.x + Math.cos(ang) * r * 0.66, c.y + Math.sin(ang) * r * 0.66);
    pen.fill(oval(tp.x, tp.y, r * 0.16, r * 0.14, 12), padTone, 1);
  }
  contour(d, rim, 1.3, dark ? 0.7 : 0.95);
  for (let i = 0; i < n; i++) {
    const ang = a + (i - (n - 1) / 2) * 0.36;
    claws(d, pt(c.x + Math.cos(ang) * r * 0.86, c.y + Math.sin(ang) * r * 0.86), ang - 0.25, 1, l.fore ? 22 : 9, l.fore ? 4 : 3, 0);
  }
}

function drawLeg(d: Draw, l: LegSpec, dark: boolean): void {
  const { pen } = d;
  const shape = jointedLimb(l.joints, l.widths);
  blackWash(d, shape, l.joints[1]!, dark ? 0.1 : 0.42);
  pen.clipped(shape, () => {
    // The round of the elbow (or knee) and the shadowed back of the forearm (or shin).
    const j = l.joints[1]!;
    glaze(pen.ctx, j.x - 2, j.y + 4, l.widths[1]! * 0.32, l.widths[1]! * 0.6, 0.3, dark ? B.coal : B.sheen, dark ? 0.15 : 0.28);
  });
  const along = Math.atan2(l.joints[l.joints.length - 1]!.y - l.joints[0]!.y, l.joints[l.joints.length - 1]!.x - l.joints[0]!.x);
  hairs(d, shape, 90, 6200 + Math.round(l.joints[0]!.x), 6, () => along + 0.15, BLACK_TONES, 0.45);
  // Open at the top, where the limb grows out of the trunk: no seam across the body.
  const half = Math.floor(shape.length / 2);
  pen.stroke(shape.slice(4, half), 1.5, B.line, dark ? 0.6 : 0.9, false);
  pen.stroke(shape.slice(half, shape.length - 4), 1.5, B.line, dark ? 0.6 : 0.9, false);
  furEdge(d, shape, 26, 4, 6300 + Math.round(l.joints[0]!.x), dark ? B.deep : B.black, 0.1, 0.9);
  if (l.sole) soleOn(d, l, dark);
  else foot(d, l, dark);
}

function drawTail(d: Draw, tail: readonly Pt[]): void {
  const shape = jointedLimb(tail, [26, 22, 15, 6]);
  blackWash(d, shape, tail[1]!, 0.35);
  hairs(d, shape, 60, 6300, 7, () => Math.atan2(tail[3]!.y - tail[0]!.y, tail[3]!.x - tail[0]!.x), BLACK_TONES);
  d.pen.stroke(shape.slice(3, -3), 1.5, B.line, 0.9, false);
  furEdge(d, shape, 30, 5, 6310);
}

function drawTrunk(d: Draw, spec: Spec): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(0, spec.dy);
  ctx.translate(0, 40);
  ctx.scale(1, spec.squash);
  ctx.translate(0, -40);
  blackWash(d, TRUNK, pt(0, 0), 0.2);
  pen.clipped(TRUNK, () => {
    glaze(ctx, SHOULDER.x, SHOULDER.y, SHOULDER.rx, SHOULDER.ry, 0.4, B.sheen, 0.45);
    glaze(ctx, HAUNCH.x, HAUNCH.y, HAUNCH.rx, HAUNCH.ry, -0.4, B.sheen, 0.42);
    // The underside turning away into shadow, with a faint cool reflected light along its very edge.
    glaze(ctx, -20, 26, 110, 16, 0.05, B.deep, 0.75);
    glaze(ctx, -30, 30, 70, 4, 0.08, B.sheen, 0.25);
    // The waist a little hollow between the two rounds.
    glaze(ctx, -24, 0, 20, 30, 0, B.deep, 0.35);
  });
  hairs(d, TRUNK, 640, 6100, 8, (x, y) => Math.PI - 0.15 + (y > 0 ? 0.3 : 0) + (x < -110 ? 0.6 : 0) + (x > 80 ? -0.4 : 0), BLACK_TONES);
  pen.clipped(TRUNK, () => paintMantle(d, MANTLE, BORDER, 6400, (x) => Math.PI + 0.05 + (x < -110 ? 0.6 : 0) + (x > 70 ? -0.35 : 0), 700));
  pen.clipped(TRUNK, () => {
    // The light along the hump and the haunch's top; the mantle greying where it turns away.
    glaze(ctx, 40, -62, 50, 9, 0, '#ffffff', 0.22);
    glaze(ctx, -96, -54, 34, 8, 0, '#ffffff', 0.16);
    glaze(ctx, -24, -50, 26, 10, 0, B.mantleDeep, 0.3);
    glaze(ctx, -128, -30, 22, 18, 0.5, B.grizzle, 0.35);
  });
  // The folds: the shoulder blade's back edge, the haunch's front.
  pen.hair(cub(pt(26, -10), pt(20, 6), pt(24, 22), pt(32, 34), 8), 0.8, B.sheen, 0.35);
  pen.hair(cub(pt(-62, -8), pt(-58, 6), pt(-62, 18), pt(-70, 26), 8), 0.8, B.sheen, 0.35);
  pen.stroke(closed(TRUNK), 1.7, B.line, 0.95, false);
  furEdge(d, TRUNK, 160, 5, 6700, B.black, 0.3, 1);
  furEdge(d, TRUNK, 90, 4, 6710, B.mantleMid, 0, 0.36);
  ctx.restore();
}

/** Runs `draw` with the trunk (as posed) masked out, so a near leg grows from under the belly fur rather than being pasted over the flank. */
function underTrunk(d: Draw, spec: Spec, draw: () => void): void {
  const { ctx } = d.pen;
  const trunk = TRUNK.map((p) => pt(p.x, spec.dy + 40 + spec.squash * (p.y - 40)));
  ctx.save();
  ctx.beginPath();
  ctx.rect(-300, -300, 600, 600);
  trunk.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip('evenodd');
  draw();
  ctx.restore();
  // The belly's fur hanging over the tops of the legs.
  const belly = trunk.map((p) => pt(p.x, p.y));
  furEdge(d, belly, 70, 5, 6720, B.black, 0.45, 0.8);
}

function drawBody(d: Draw, pose: BodyPose): void {
  const spec = SPECS[pose];
  drawLeg(d, spec.farHind, true);
  drawLeg(d, spec.farFore, true);
  drawTail(d, spec.tail);
  drawTrunk(d, spec);
  // Standing, the near legs grow from under the belly fur; lying on its side they lie out over the body towards us.
  if (spec.nearFore.sole) {
    drawLeg(d, spec.nearHind, false);
    drawLeg(d, spec.nearFore, false);
  } else {
    underTrunk(d, spec, () => {
      drawLeg(d, spec.nearHind, false);
      drawLeg(d, spec.nearFore, false);
    });
  }
}

export const BADGER_BODY: SpriteArt<BodyPose> = { frame: 400, res: 3, poses: ['stand', 'lunge', 'flop'], draw: drawBody };
