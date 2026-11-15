import { createRng } from '../../../src/logic/rng';
import {
  add, child, compose, cross, mix3, norm, place, type Rig, rotX, rotY, rotZ, scale, sub, turnBy, unplace, v3, type V3,
} from './geo';

/**
 * A gentoo penguin (Pygoscelis papua) as a few smooth surfaces in
 * centimetres, standing about 70 cm tall with its feet at the origin, facing
 * +z: an egg of a body, a thick neck, a round head with the white bonnet
 * (a patch over each eye joined by a band across the crown), stiff flippers,
 * a long tail and orange feet. The bill is hinged at the back like a real
 * bird's: the upper and lower mandibles each turn about the jaw joint behind
 * the corner of the mouth, so the mouth opens as a wedge, the tongue lying in
 * the lower jaw, the palate under the upper, the throat dark behind them.
 *
 * Penguins have no teeth. The tongue and the palate are covered in stiff,
 * pale, backward-pointing spines (papillae, made of keratin), all raking
 * towards the throat: `spinesOf` places them. Nothing here is drawn; paint.ts
 * renders the surfaces and spines through a camera.
 */

export type RGB = readonly [number, number, number];

export interface Pose {
  /** Between the feet, on the ice. */
  readonly at: V3;
  /** Heading, radians (0 faces +z). */
  readonly yaw: number;
  /** The waddle's sway side to side, and a lean forward, radians. */
  readonly roll: number;
  readonly lean: number;
  /** The body lifted, cm (the bounce of each step). */
  readonly bob: number;
  readonly headYaw: number;
  readonly headPitch: number;
  readonly headRoll: number;
  /** The bill, 0 shut .. 1 wide open. */
  readonly open: number;
  /** Flippers, 0 at the sides .. 1 held out. */
  readonly flap: number;
  /** Each foot lifted, 0 .. 1. */
  readonly stepL: number;
  readonly stepR: number;
  /** Feathers fluffed up, 0 .. 1. */
  readonly puff: number;
  /** Eyes shut, 0 .. 1. */
  readonly blink: number;
}

export const POSE0: Pose = {
  at: v3(0, 0, 0), yaw: 0, roll: 0, lean: 0, bob: 0, headYaw: 0, headPitch: 0, headRoll: 0, open: 0, flap: 0.15, stepL: 0, stepR: 0, puff: 0, blink: 0,
};

// ---------------------------------------------------------------- measurements (cm)

/**
 * The body, neck and head as one smooth loft from the bottom to the crown:
 * at each height y, an ellipse `a` wide (half, x) and `b` deep (half, z)
 * centred at z = `cz`. Above the neck it turns with the head.
 */
interface Ring { readonly y: number; readonly a: number; readonly b: number; readonly cz: number }
const LOFT: readonly Ring[] = [
  { y: 2, a: 0, b: 0, cz: -1 },
  { y: 2.5, a: 6.5, b: 6.8, cz: -1 },
  { y: 4.5, a: 11.5, b: 12, cz: -1 },
  { y: 10, a: 15.5, b: 16, cz: -0.6 },
  { y: 20, a: 16.8, b: 17.4, cz: 0 },
  { y: 30, a: 16, b: 16.8, cz: -0.4 },
  { y: 39, a: 13.6, b: 14, cz: 0 },
  { y: 46, a: 10.4, b: 10.9, cz: 0.6 },
  { y: 49, a: 8.4, b: 9, cz: 0.9 },
  { y: 52, a: 6.3, b: 7, cz: 1.5 },
  { y: 55.5, a: 5.3, b: 6.3, cz: 2 },
  { y: 58, a: 5.2, b: 6.2, cz: 2.2 },
  { y: 60.8, a: 4.6, b: 5.6, cz: 1.9 },
  { y: 63, a: 3.2, b: 3.9, cz: 1.4 },
  { y: 64, a: 1.8, b: 2.2, cz: 1.1 },
  { y: 64.4, a: 0, b: 0, cz: 1 },
];
/** The head turns about this point on the neck; the head's round part, centre and radii in that frame. */
const HEAD_PIVOT = v3(0, 50, 1.2);
export const HEAD_C = v3(0, 8, 1.0);
export const HEAD_R = v3(5.2, 5.6, 6.2);
/** Above the neck the loft goes with the head (0 .. 1 by height). */
const headWeight = (y: number): number => smoothstep(47, 54, y);
/** The bill's frame in the head's: its base (where the feathers end) at the origin, z along the bill. */
const BILL_AT = v3(0, 7.6, 6.85);
const BILL_DIP = 0.14;
/** Bill length (upper mandible), half-width and the mandibles' depth at the base. */
export const BILL_L = 6.2;
const HW0 = 1.45;
const HU0 = 1.35;
const HL0 = 1.05;
/** The jaw joint, behind the corner of the mouth, and the throat, bill frame z. */
export const HINGE = v3(0, 0, -1.5);
export const THROAT_Z = -0.8;
/** How far each mandible turns when wide open, radians. */
const UPPER_OPEN = 0.46;
const LOWER_OPEN = 0.62;

// ---------------------------------------------------------------- colours

export const FEATHER: RGB = [27, 33, 46];
export const WHITE: RGB = [247, 244, 236];
const BILL_RED: RGB = [228, 76, 38];
const BILL_DARK: RGB = [34, 26, 28];
const FOOT: RGB = [238, 128, 66];
const PALATE: RGB = [218, 132, 138];
const FLOOR: RGB = [176, 86, 98];
const TONGUE: RGB = [212, 116, 126];
const CHEEK: RGB = [196, 100, 112];
export const SPINE: RGB = [244, 230, 214];

export interface Paint {
  readonly rgb: RGB;
  /** Sheen (feathers) or shine, 0 .. 1. */
  readonly gloss: number;
  /** Wet: a sharp, bright highlight (the mouth). */
  readonly wet?: number;
}

export type Group = 'feather' | 'mouth' | 'bill';

/** Ink on a surface's edges: where it turns away (its silhouette) and, if `borders`, round its open edges. */
export interface Ink {
  readonly width: number;
  readonly alpha: number;
  readonly borders: boolean;
}

/** A surface patch over (u, v) in [0, 1]², in world cm. */
export interface Surf {
  readonly name: string;
  readonly group: Group;
  readonly nu: number;
  readonly nv: number;
  at(u: number, v: number): V3;
  paint(u: number, v: number): Paint;
  /** Outward is sign × (d/du × d/dv). */
  readonly sign: 1 | -1;
  /** In the mouth: 0 at the throat .. 1 at the bill tip, for the dark deep inside. */
  depth?(u: number, v: number): number;
  /** Quads to leave out (the head's opening behind the bill). */
  skip?(u: number, v: number): boolean;
  /** Feather strokes over it (sheen on black, cool shade on white). */
  readonly feathers?: boolean;
  /** v wraps round (0 and 1 are the same seam). */
  readonly wrapV?: boolean;
  readonly ink?: Ink;
  /** Ink where the paint's lightness crosses this (0 .. 1): the edges of markings. */
  readonly markEdge?: number;
}

export const OUTLINE: Ink = { width: 2.4, alpha: 0.95, borders: false };
const EDGE: Ink = { width: 2.4, alpha: 0.95, borders: true };
const SOFT_EDGE: Ink = { width: 1.4, alpha: 0.45, borders: true };

// ---------------------------------------------------------------- small helpers

export const smoothstep = (a: number, b: number, x: number): number => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
export const mixRGB = (a: RGB, b: RGB, u: number): RGB => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

/** A point on an ellipsoid at latitude `lat` (-π/2 bottom .. π/2 top) and longitude `lon` (0 the front, +z). */
export function onEllipsoid(c: V3, r: V3, lat: number, lon: number): V3 {
  return v3(c.x + r.x * Math.cos(lat) * Math.sin(lon), c.y + r.y * Math.sin(lat), c.z + r.z * Math.cos(lat) * Math.cos(lon));
}
const unitDir = (lat: number, lon: number): V3 => v3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
const latOf = (u: number): number => -Math.PI / 2 + u * Math.PI;
const lonOf = (v: number): number => -Math.PI + v * 2 * Math.PI;

/** Where the loft is cut into body and head pieces (loft s, at the neck). */
const NECK_S = 0.58;

/** The loft's ring at s (0 bottom .. 1 crown), Catmull-Rom through the rings. */
export function ringAt(s: number): Ring {
  const k = Math.max(0, Math.min(1, s)) * (LOFT.length - 1);
  const i = Math.min(LOFT.length - 2, Math.floor(k));
  const f = k - i;
  const at = (j: number): Ring => LOFT[Math.max(0, Math.min(LOFT.length - 1, j))]!;
  const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
  const cr = (a: number, b: number, c: number, d: number): number =>
    0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
  return { y: cr(p0.y, p1.y, p2.y, p3.y), a: Math.max(0, cr(p0.a, p1.a, p2.a, p3.a)), b: Math.max(0, cr(p0.b, p1.b, p2.b, p3.b)), cz: cr(p0.cz, p1.cz, p2.cz, p3.cz) };
}

// ---------------------------------------------------------------- the rigs

export interface Rigs {
  readonly ground: Rig;
  readonly body: Rig;
  readonly head: Rig;
  readonly bill: Rig;
  /** The upper and lower mandibles: bill-frame points (closed) to world, turned about the jaw joint. */
  readonly upper: Rig;
  readonly lower: Rig;
}

/** A bill-frame point on a mandible, to its world place. */
export const onJaw = (jaw: Rig, p: V3): V3 => place(jaw, sub(p, HINGE));

export function rigsOf(p: Pose): Rigs {
  const ground: Rig = { o: p.at, m: rotY(p.yaw) };
  const body = child(ground, v3(0, p.bob, 0), compose(rotZ(p.roll), rotX(p.lean)));
  const head = child(body, HEAD_PIVOT, compose(rotY(p.headYaw), compose(rotX(p.headPitch), rotZ(p.headRoll))));
  const bill = child(head, BILL_AT, rotX(BILL_DIP));
  const open = Math.max(0, Math.min(1.1, p.open));
  const upper = child(bill, HINGE, rotX(-UPPER_OPEN * open));
  const lower = child(bill, HINGE, rotX(LOWER_OPEN * open));
  return { ground, body, head, bill, upper, lower };
}

// ---------------------------------------------------------------- the bill's shape (bill frame, closed)

/** Half-width of the bill at z (the mouth inside keeps the base's width back to the throat). */
export function halfWidth(z: number): number {
  if (z <= 0) return HW0 * 1.05;
  const u = Math.min(1, z / BILL_L);
  return HW0 * 1.05 * Math.pow(1 - u, 0.62) * (1 - 0.15 * u);
}
/** The upper mandible's height above its cutting edge, and the edge's droop at the hooked tip. */
const upperHeight = (z: number): number => (z <= 0 ? HU0 : HU0 * Math.pow(1 - Math.min(1, z / BILL_L), 0.72));
export const upperDroop = (z: number): number => -0.48 * Math.pow(smoothstep(0.45, 1, z / BILL_L), 1.4);
const LOWER_L = BILL_L * 0.95;
const lowerHeight = (z: number): number => (z <= 0 ? HL0 : HL0 * Math.pow(1 - Math.min(1, z / LOWER_L), 0.6));
const lowerHalf = (z: number): number => halfWidth(z * (BILL_L / LOWER_L)) * 0.97;
/** The palate's arch and the floor's trough, as fractions of the mandibles' depth. */
const PALATE_K = 0.42;
const FLOOR_K = 0.5;

/** The tongue: from the throat to its pointed tip, lying in the floor of the lower jaw. */
export const TONGUE_Z0 = THROAT_Z + 0.1;
export const TONGUE_Z1 = BILL_L * 0.74;
const tongueHalf = (z: number): number => {
  const s = (z - TONGUE_Z0) / (TONGUE_Z1 - TONGUE_Z0);
  return 0.66 * lowerHalf(z) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, s), 4)));
};
const tongueBase = (z: number): number => -FLOOR_K * lowerHeight(z) * 0.74;
const tongueThick = (z: number): number => 0.34 * (1 - 0.55 * smoothstep(TONGUE_Z0, TONGUE_Z1, z));

/** The top of the tongue at z, `phi` across it (-π/2 .. π/2), bill frame. */
export function tongueAt(z: number, phi: number): V3 {
  return v3(tongueHalf(z) * Math.sin(phi), tongueBase(z) + tongueThick(z) * Math.cos(phi), z);
}
export function palateAt(z: number, phi: number): V3 {
  return v3(halfWidth(z) * Math.sin(phi), upperDroop(z) + PALATE_K * upperHeight(z) * Math.cos(phi), z);
}
function upperOuterAt(z: number, phi: number): V3 {
  return v3(halfWidth(z) * Math.sin(phi), upperDroop(z) + upperHeight(z) * Math.cos(phi), z);
}
function lowerOuterAt(z: number, phi: number): V3 {
  return v3(lowerHalf(z) * Math.sin(phi), -lowerHeight(z) * Math.cos(phi), z);
}
function floorAt(z: number, phi: number): V3 {
  return v3(lowerHalf(z) * Math.sin(phi), -FLOOR_K * lowerHeight(z) * Math.cos(phi), z);
}
/** The cutting edges, bill frame, at z (side ±1). */
export const upperEdge = (z: number, side: number): V3 => v3(side * halfWidth(z), upperDroop(z), z);
export const lowerEdge = (z: number, side: number): V3 => v3(side * lowerHalf(z), 0, z);

const zOf = (u: number, z0: number, z1: number): number => z0 + (z1 - z0) * u;
const phiOf = (v: number): number => -Math.PI / 2 + v * Math.PI;

// ---------------------------------------------------------------- markings

/** The gentoo's white bonnet: a patch over each eye and a band across the crown (head-frame unit direction). */
export function bonnet(d: V3): number {
  const side = d.x >= 0 ? 1 : -1;
  const near = (c: V3, r: number): number => {
    const q = norm(v3(side * c.x, c.y, c.z));
    return smoothstep(Math.cos(r + 0.07), Math.cos(r - 0.05), d.x * q.x + d.y * q.y + d.z * q.z);
  };
  // A patch from just over the eye sweeping up over the crown...
  const patch = Math.max(near(v3(0.82, 0.44, 0.36), 0.27), near(v3(0.66, 0.66, 0.34), 0.29), near(v3(0.4, 0.84, 0.32), 0.24));
  // ...where a band across the top of the head joins the two, eye to eye.
  const band = smoothstep(0.5, 0.6, d.y) * (1 - smoothstep(0.2, 0.27, Math.abs(d.z - 0.3)));
  return Math.max(patch, band);
}

/** White belly and chest, black back and throat (body frame point and outward normal). */
function bellyWhite(p: V3, n: V3): number {
  const front = smoothstep(-0.34, -0.12, n.z);
  const chest = 1 - smoothstep(46.6 - 2.2 * n.z, 47.8 - 2.2 * n.z, p.y);
  const under = smoothstep(-0.75, -0.55, -n.y);
  return Math.max(front * chest, under * (p.y < 20 ? 1 : 0));
}


// ---------------------------------------------------------------- surfaces

function ellipsoid(name: string, group: Group, nu: number, nv: number, to: (p: V3) => V3, c: V3, r: V3, paint: (lat: number, lon: number) => Paint, skip?: (p: V3) => boolean): Surf {
  return {
    name, group, nu, nv, sign: -1, feathers: group === 'feather', wrapV: true, ink: OUTLINE, markEdge: 0.55,
    at: (u, v) => to(onEllipsoid(c, r, latOf(u), lonOf(v))),
    paint: (u, v) => paint(latOf(u), lonOf(v)),
    skip: skip ? (u, v) => skip(to(onEllipsoid(c, r, latOf(u), lonOf(v)))) : undefined,
  };
}

const feather = (white: number, gloss = 0.45): Paint => ({ rgb: mixRGB(FEATHER, WHITE, white), gloss: gloss * (1 - white) + 0.12 * white });

/** The surfaces making the penguin, in world cm. */
export function surfacesOf(p: Pose, rigs: Rigs = rigsOf(p)): Surf[] {
  const atBody = (q: V3): V3 => place(rigs.body, q);
  const out: Surf[] = [];

  // The tail: long and stiff, sloping down behind to the ice.
  const tail: Rig = child(rigs.body, v3(0, 8, -15), rotX(-0.62));
  out.push(ellipsoid('tail', 'feather', 14, 20, (q) => place(tail, q), v3(0, 0, -6), v3(4.2, 1.3, 8.5), () => feather(0, 0.4)));

  // The flippers: hinged at the shoulders, black outside with a white edge, white underneath.
  for (const side of [-1, 1] as const) {
    const shoulder = child(rigs.body, v3(side * 12.6, 43, -0.5), compose(rotZ(side * (0.1 + 0.62 * p.flap)), rotX(0.12 - 0.2 * p.flap)));
    out.push(ellipsoid(`flipper${side}`, 'feather', 16, 28, (q) => place(shoulder, q), v3(side * 0.9, -11.5, 0), v3(1.05, 12.5, 3.8), (lat, lon) => {
      const n = unitDir(lat, lon);
      const outside = side * n.x > 0;
      const edge = 1 - smoothstep(0.18, 0.36, Math.abs(n.x));
      return feather(outside ? edge * 0.85 : 1);
    }));
  }

  // The feet: orange, flat on the ice, toes forward; each lifts in turn.
  for (const side of [-1, 1] as const) {
    const lift = side < 0 ? p.stepL : p.stepR;
    const foot = child(rigs.ground, v3(side * 5.8, 1.1 + 3.2 * lift, 4.5 + 1.5 * lift), rotX(-0.25 * lift));
    out.push(ellipsoid(`foot${side}`, 'feather', 10, 22, (q) => place(foot, q), v3(0, 0, 1.2), v3(3.3, 1.15, 5.4), () => ({ rgb: FOOT, gloss: 0.18 })));
  }

  // Body, neck and head in one: the loft, the top turning with the head.
  const loftAt = (u: number, v: number): V3 => {
    const r = ringAt(u);
    const lon = lonOf(v);
    const k = 1 + 0.045 * p.puff * (1 - headWeight(r.y));
    const q = v3(r.a * k * Math.sin(lon), r.y, r.cz + r.b * k * Math.cos(lon));
    const w = headWeight(r.y);
    const inBody = atBody(q);
    return w <= 0 ? inBody : mix3(inBody, place(rigs.head, sub(q, HEAD_PIVOT)), w);
  };
  const loftPaint = (u: number, v: number): Paint => {
    const r = ringAt(u);
    const lon = lonOf(v);
    const q = v3(r.a * Math.sin(lon), r.y, r.cz + r.b * Math.cos(lon));
    const w = headWeight(r.y);
    // The head's markings by direction from its centre; the body's by height and facing.
    const hd = norm(v3(q.x / HEAD_R.x, (q.y - HEAD_PIVOT.y - HEAD_C.y) / HEAD_R.y, (q.z - HEAD_PIVOT.z - HEAD_C.z) / HEAD_R.z));
    const n = norm(v3(Math.sin(lon) / Math.max(r.a, 0.1), 0, Math.cos(lon) / Math.max(r.b, 0.1)));
    const ny = (ringAt(Math.max(0, u - 0.01)).a - ringAt(Math.min(1, u + 0.01)).a) * 0.08;
    const body = bellyWhite(q, norm(v3(n.x, ny, n.z)));
    return feather(w > 0.5 ? bonnet(hd) : body, 0.55);
  };
  // Two pieces sharing the ring at the neck: the head finer, so the bonnet's edge stays smooth close up.
  const ink: Ink = { width: 2.4, alpha: 0.95, borders: false };
  const piece = (name: string, s0: number, s1: number, nu: number, nv: number): Surf => ({
    name, group: 'feather', nu, nv, sign: -1, feathers: true, wrapV: true, ink, markEdge: 0.55,
    at: (u, v) => loftAt(s0 + (s1 - s0) * u, v),
    paint: (u, v) => loftPaint(s0 + (s1 - s0) * u, v),
  });
  out.push(piece('body', 0, NECK_S, 54, 120), piece('head', NECK_S, 1, 76, 230));

  out.push(...billSurfaces(rigs));
  return out;
}

/** The bill's outer keratin, the inside of the mouth and the cheeks at its corners. */
function billSurfaces(rigs: Rigs): Surf[] {
  const U = (q: V3): V3 => onJaw(rigs.upper, q);
  const Lo = (q: V3): V3 => onJaw(rigs.lower, q);
  const depthOf = (z: number): number => smoothstep(THROAT_Z, BILL_L * 0.95, z);
  const out: Surf[] = [];

  out.push({
    name: 'upper', group: 'bill', nu: 32, nv: 22, sign: 1, ink: EDGE, markEdge: 0.3,
    at: (u, v) => U(upperOuterAt(zOf(u, -0.15, BILL_L), phiOf(v))),
    paint: (u, v) => {
      const z = zOf(u, -0.15, BILL_L);
      // A black ridge along the top (the culmen) widening to a black tip.
      const ridge = 1 - smoothstep(0.16, 0.28 + 0.55 * smoothstep(0.72, 0.95, z / BILL_L), Math.abs(Math.sin(phiOf(v))));
      return { rgb: mixRGB(BILL_RED, BILL_DARK, Math.max(ridge, smoothstep(0.88, 0.97, z / BILL_L))), gloss: 0.5 };
    },
  });
  out.push({
    name: 'lower', group: 'bill', nu: 30, nv: 20, sign: -1, ink: EDGE,
    at: (u, v) => Lo(lowerOuterAt(zOf(u, -0.15, LOWER_L), phiOf(v))),
    paint: (u) => ({ rgb: mixRGB(BILL_RED, BILL_DARK, 0.6 * smoothstep(0.86, 1, u)), gloss: 0.42 }),
  });

  out.push({
    name: 'palate', group: 'mouth', nu: 34, nv: 18, sign: -1, ink: SOFT_EDGE,
    at: (u, v) => U(palateAt(zOf(u, THROAT_Z, BILL_L), phiOf(v))),
    paint: (u, v) => {
      // The cutting edge is the bill's own orange keratin.
      const edge = smoothstep(0.86, 0.97, Math.abs(Math.sin(phiOf(v)))) * smoothstep(-0.2, 0.4, zOf(u, THROAT_Z, BILL_L));
      return { rgb: mixRGB(PALATE, BILL_RED, edge), gloss: 0.3 + 0.2 * edge, wet: 0.8 * (1 - edge) };
    },
    depth: (u) => depthOf(zOf(u, THROAT_Z, BILL_L)),
  });
  out.push({
    name: 'floor', group: 'mouth', nu: 30, nv: 16, sign: 1, ink: SOFT_EDGE,
    at: (u, v) => Lo(floorAt(zOf(u, THROAT_Z, LOWER_L), phiOf(v))),
    paint: (u, v) => {
      const edge = smoothstep(0.8, 0.95, Math.abs(Math.sin(phiOf(v)))) * smoothstep(-0.2, 0.4, zOf(u, THROAT_Z, LOWER_L));
      return { rgb: mixRGB(FLOOR, BILL_RED, edge), gloss: 0.25 + 0.2 * edge, wet: 0.6 * (1 - edge) };
    },
    depth: (u) => depthOf(zOf(u, THROAT_Z, LOWER_L)),
  });
  out.push({
    name: 'tongue', group: 'mouth', nu: 34, nv: 16, sign: 1, ink: SOFT_EDGE,
    at: (u, v) => Lo(tongueAt(zOf(u, TONGUE_Z0, TONGUE_Z1), phiOf(v))),
    paint: () => ({ rgb: TONGUE, gloss: 0.35, wet: 1 }),
    depth: (u) => depthOf(zOf(u, TONGUE_Z0, TONGUE_Z1)),
  });

  // The corners of the mouth: soft skin from the upper edge to the lower, pink inside, feathered outside.
  for (const side of [-1, 1] as const) {
    const at = (u: number, v: number): V3 => {
      const z = zOf(u, THROAT_Z, 0.1);
      const a = Lo(lowerEdge(z, side * 0.985));
      const b = U(upperEdge(z, side * 0.985));
      const inward = turnBy(rigs.bill, v3(-side * 0.22 * Math.sin(Math.PI * v), 0, 0));
      return add(mix3(a, b, v), inward);
    };
    const depth = (u: number): number => depthOf(zOf(u, THROAT_Z, 0.1));
    out.push({ name: `cheek${side}`, group: 'mouth', nu: 10, nv: 10, sign: side > 0 ? 1 : -1, at, paint: () => ({ rgb: CHEEK, gloss: 0.3, wet: 0.7 }), depth });
  }
  return out;
}

/** The throat's opening behind the palate and the floor, world cm, a closed loop. */
export function throatOf(rigs: Rigs): V3[] {
  const n = 14;
  const top = Array.from({ length: n + 1 }, (_, i) => onJaw(rigs.upper, palateAt(THROAT_Z, phiOf(i / n))));
  const bottom = Array.from({ length: n + 1 }, (_, i) => onJaw(rigs.lower, floorAt(THROAT_Z, phiOf(1 - i / n))));
  return [...top, ...bottom];
}

// ---------------------------------------------------------------- the spines

export interface Spine {
  /** The base's centre, world cm. */
  readonly base: V3;
  /** Out of the surface (into the mouth), towards the throat along it, and across. */
  readonly out: V3;
  readonly back: V3;
  readonly side: V3;
  /** Length and base radius, cm. */
  readonly h: number;
  readonly r: number;
  /** The tip, world cm. */
  readonly tip: V3;
  /** 0 at the throat .. 1 at the bill tip. */
  readonly depth: number;
  readonly where: 'tongue' | 'palate';
}

/** How far a spine leans up off the surface, radians: they lie raked back. */
export const SPINE_RAKE = 0.42;

interface SpineSpot {
  readonly z: number;
  readonly phi: number;
  readonly h: number;
  readonly where: 'tongue' | 'palate';
  /** Its own rake off the surface and lean to one side, radians (no two alike). */
  readonly rake: number;
  readonly lean: number;
}

/** Where the spines grow (bill frame): rows along the tongue and the palate, staggered, bigger towards the throat. */
export const SPINE_SPOTS: readonly SpineSpot[] = (() => {
  const rng = createRng(1281);
  const jit = (a: number): number => (rng() - 0.5) * 2 * a;
  const spots: SpineSpot[] = [];
  const add0 = spots.push.bind(spots);
  const push = (s: { z: number; phi: number; h: number; where: 'tongue' | 'palate' }): void => {
    add0({ z: s.z + jit(0.13), phi: Math.max(-1.2, Math.min(1.2, s.phi + jit(0.12))), h: s.h * (0.72 + 0.56 * rng()), where: s.where, rake: SPINE_RAKE + jit(0.13), lean: jit(0.2) });
  };
  const tongueRows = 15;
  for (let i = 0; i < tongueRows; i++) {
    const s = i / (tongueRows - 1);
    const z = lerp(TONGUE_Z0 + 0.22, TONGUE_Z1 - 0.35, s);
    const cols = s > 0.8 ? 3 : s > 0.55 ? 4 : s > 0.25 ? 5 : 6;
    for (let j = 0; j < cols; j++) {
      const phi = lerp(-1.02, 1.02, (j + (i % 2 ? 0.5 : 0)) / (cols - (i % 2 ? 0 : 1)));
      if (Math.abs(phi) > 1.2) continue;
      push({ z, phi, h: 0.3 + 0.42 * (1 - s), where: 'tongue' });
    }
  }
  const palateRows = 15;
  for (let i = 0; i < palateRows; i++) {
    const s = i / (palateRows - 1);
    const z = lerp(THROAT_Z + 0.25, BILL_L * 0.74, s);
    for (const phi of [-1.0, -0.62, -0.22, 0.22, 0.62, 1.0]) {
      const p = phi + (i % 2 ? 0.18 : -0.02);
      if (s > 0.75 && Math.abs(p) > 0.7) continue;
      push({ z, phi: p, h: 0.26 + 0.34 * (1 - s), where: 'palate' });
    }
  }
  return spots;
})();

/** A surface's point and frame at a spot (bill frame, closed): the point, out of the surface, back along it. */
function spotFrame(spot: SpineSpot): { readonly p: V3; readonly out: V3; readonly back: V3 } {
  const f = spot.where === 'tongue' ? tongueAt : palateAt;
  const p = f(spot.z, spot.phi);
  const dz = sub(f(spot.z + 0.02, spot.phi), f(spot.z - 0.02, spot.phi));
  const dphi = sub(f(spot.z, spot.phi + 0.02), f(spot.z, spot.phi - 0.02));
  let out = norm(cross(dz, dphi));
  // Tongue: out is up into the mouth; palate: down into it.
  if ((spot.where === 'tongue' && out.y < 0) || (spot.where === 'palate' && out.y > 0)) out = scale(out, -1);
  return { p, out, back: norm(scale(dz, -1)) };
}

/** Every spine, in world cm, for the rigs' pose. */
export function spinesOf(rigs: Rigs): Spine[] {
  return SPINE_SPOTS.map((spot) => {
    const jaw = spot.where === 'tongue' ? rigs.lower : rigs.upper;
    const f = spotFrame(spot);
    const base = onJaw(jaw, f.p);
    const out = norm(turnBy(jaw, f.out));
    const back = norm(turnBy(jaw, f.back));
    const side = norm(cross(out, back));
    const along = add(scale(back, Math.cos(spot.lean)), scale(side, Math.sin(spot.lean)));
    const tip = add(base, add(scale(along, spot.h * Math.cos(spot.rake)), scale(out, spot.h * Math.sin(spot.rake))));
    return { base, out, back, side, h: spot.h, r: spot.h * 0.25, tip, depth: smoothstep(THROAT_Z, BILL_L, spot.z), where: spot.where };
  });
}

// ---------------------------------------------------------------- anchors

export interface EyeSpot {
  readonly c: V3;
  /** Across and up the eye in the surface, world, scaled to the eye's radius. */
  readonly a: V3;
  readonly b: V3;
  readonly n: V3;
}

export const EYE_R = 0.55;

/** The eyes on the sides of the head. */
export function eyesOf(rigs: Rigs): EyeSpot[] {
  return [-1, 1].map((side) => {
    const d = norm(v3(side * 0.9, 0.16, 0.42));
    const local = v3(HEAD_C.x + HEAD_R.x * d.x, HEAD_C.y + HEAD_R.y * d.y, HEAD_C.z + HEAD_R.z * d.z);
    const nl = norm(v3(d.x / HEAD_R.x, d.y / HEAD_R.y, d.z / HEAD_R.z));
    const a0 = norm(cross(v3(0, 1, 0), nl));
    const b0 = cross(nl, a0);
    return {
      c: place(rigs.head, local), n: turnBy(rigs.head, nl), a: scale(turnBy(rigs.head, a0), EYE_R * 1.08), b: scale(turnBy(rigs.head, b0), EYE_R),
    };
  });
}

/** A point along the middle of the tongue, lifted `lift` cm off it (bill-frame z; past the throat it carries on down). */
export function tonguePath(rigs: Rigs, z: number, lift: number): V3 {
  if (z > TONGUE_Z1) return onJaw(rigs.lower, add(tongueAt(TONGUE_Z1, 0), v3(0, lift + 0.12 * (z - TONGUE_Z1), z - TONGUE_Z1)));
  if (z >= TONGUE_Z0) return onJaw(rigs.lower, add(tongueAt(z, 0), v3(0, lift, 0)));
  const at = onJaw(rigs.lower, add(tongueAt(TONGUE_Z0, 0), v3(0, lift, 0)));
  const down = norm(sub(onJaw(rigs.lower, v3(0, -0.8, TONGUE_Z0 - 1)), onJaw(rigs.lower, v3(0, 0, TONGUE_Z0))));
  return add(at, scale(down, TONGUE_Z0 - z));
}

/** The bill's base and tip, world cm (for cameras). */
export function billPoint(rigs: Rigs, z: number, y = 0): V3 {
  return place(rigs.bill, v3(0, y, z));
}
