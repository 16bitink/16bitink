import { type Pt } from '../../../../src/art/pen';
import { rngOf } from '../../otterpocket/brush';
import { curve, dab, mix, softLine } from '../../seal/art/paint';
import { band, fillShape, groundShadow, inkLine, linear, P, radial, ring, spline, within } from './ink';

/**
 * People, in profile facing right, painted: skin in warm washes, a readable
 * face (brow, eye, nose, lips), cloth with folds. Grown-ups and the child are
 * both 1000 units tall with the feet at 0,0 (the caller's scale sets the age).
 */
export interface Grown {
  readonly x: number;
  readonly y: number;
  readonly k: number;
  readonly face: number;
  readonly coat: readonly [string, string];
  readonly legs: readonly [string, string];
  readonly shoe: string;
  readonly hair: string;
  /** Walking phase (radians) and amount. */
  readonly step: number;
  readonly walk: number;
  /** Holding a phone up and looking down at it. */
  readonly phone: boolean;
  readonly bag?: string;
}

const SKIN = ['#fadcbd', '#e8b48c', '#b97e58'] as const;

/** A soft coloured outline, thinner than the animals' ink. */
const SOFT = '#3a2a22';

/**
 * A piece of clothing: a rounded gradient (shade on the left, the low sun on
 * the right), soft folds, a little weave, a warm rim of light.
 */
function cloth(ctx: CanvasRenderingContext2D, shape: readonly Pt[], lit: string, deep: string, folds: readonly (readonly Pt[])[], boil: number): void {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const w = x1 - x0;
  fillShape(ctx, shape, linear(ctx, x0, 0, x1, w * 0.2, [[0, mix(deep, lit, 0.2)], [0.25, mix(deep, lit, 0.7)], [0.6, lit], [0.9, mix(lit, deep, 0.12)], [1, mix(lit, deep, 0.35)]]));
  within(ctx, shape, () => {
    const shade = linear(ctx, 0, y0, 0, y1, [[0, 'rgba(255,240,214,0.16)'], [0.35, 'rgba(255,240,214,0)'], [0.7, 'rgba(20,12,18,0)'], [1, 'rgba(20,12,18,0.2)']]);
    fillShape(ctx, P(x0, y0, x1, y0, x1, y1, x0, y1), shade);
    const rng = rngOf(Math.round(Math.abs(x0 * 3 + y0)));
    for (let i = 0; i < 50; i++) {
      const x = x0 + w * rng();
      const y = y0 + (y1 - y0) * rng();
      softLine(ctx, [{ x, y }, { x: x + (rng() - 0.5) * 8, y: y + 16 + rng() * 26 }], 2, i % 2 ? '#ffffff' : '#140c10', 0.028, 1);
    }
    for (const f of folds) {
      softLine(ctx, f, 34, deep, 0.42, 14);
      softLine(ctx, f, 8, '#140c10', 0.12, 6);
      softLine(ctx, f.map((p) => ({ x: p.x + 20, y: p.y + 3 })), 24, '#fff0d8', 0.05, 12);
    }
    const loop = [...shape, shape[0]!];
    softLine(ctx, loop.map((p) => ({ x: p.x + 10, y: p.y })), 70, deep, 0.2, 18);
    softLine(ctx, loop.map((p) => ({ x: p.x - 4, y: p.y + 2 })), 26, '#ffe2b0', 0.2, 14);
  });
  inkLine(ctx, shape, 1.2, 0.7, boil, true, SOFT);
}

/** Skin, rounded by the same light. */
function skin(ctx: CanvasRenderingContext2D, shape: readonly Pt[], boil: number): void {
  const xs = shape.map((p) => p.x);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  fillShape(ctx, shape, linear(ctx, x0, 0, x1, 0, [[0, '#a96f4e'], [0.35, SKIN[1]], [0.7, SKIN[0]], [1, '#eec09a']]));
  inkLine(ctx, shape, 1.1, 0.6, boil, true, '#6b3f2a');
}

function leg(ctx: CanvasRenderingContext2D, p: Grown, far: boolean, boil: number): void {
  const ph = p.step + (far ? Math.PI : 0);
  const lift = Math.max(0, Math.sin(ph)) * p.walk;
  const foot = { x: (far ? 26 : -10) + 130 * Math.cos(ph) * p.walk, y: -34 - 60 * lift };
  const knee = { x: foot.x * 0.5 + 12 + 46 * lift, y: -258 - 24 * lift };
  const hip = { x: far ? 6 : -6, y: -480 };
  const spine = spline([hip, knee, { x: foot.x, y: foot.y }], 8);
  const shape = band(spine, (u) => 106 - 34 * u);
  cloth(ctx, shape, far ? p.legs[1] : p.legs[0], p.legs[1], [spline(P(knee.x - 20, knee.y - 20, knee.x + 10, knee.y + 4, knee.x + 34, knee.y - 10), 4), spline(P(foot.x - 24, foot.y - 60, foot.x + 4, foot.y - 46, foot.x + 26, foot.y - 58), 4)], boil);
  // The shoe: a heel, an arched sole, a rounded toe.
  const t = lift * 0.5;
  ctx.save();
  ctx.translate(foot.x, foot.y);
  ctx.rotate(t);
  const shoe = spline(P(-38, -18, -44, 8, -42, 32, 10, 33, 74, 34, 88, 22, 78, 6, 40, -4, 28, -20, 0, -26), 5, true);
  fillShape(ctx, shoe, linear(ctx, 0, -26, 0, 34, [[0, '#6b5c52'], [0.35, p.shoe], [1, '#15110f']]));
  softLine(ctx, spline(P(34, 0, 60, 6, 78, 16), 4), 7, '#ffffff', 0.35, 3);
  fillShape(ctx, P(-44, 26, 84, 28, 82, 36, -42, 36), '#171412');
  inkLine(ctx, shoe, 1.5, 0.9, boil, true);
  ctx.restore();
}

function hand(ctx: CanvasRenderingContext2D, at: Pt, a: number, boil: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(a);
  const palm = spline(P(-20, -10, -20, 16, -4, 34, 14, 34, 22, 14, 20, -12), 5, true);
  fillShape(ctx, palm, radial(ctx, 0, 4, 40, [[0, SKIN[0]], [0.7, SKIN[1]], [1, SKIN[2]]]));
  inkLine(ctx, palm, 1.3, 0.8, boil, true);
  for (const x of [-6, 3, 11]) inkLine(ctx, P(x, 16, x, 32), 1, 0.5, boil, false, '#8a5a3c');
  const thumb = spline(P(16, -8, 30, 6, 26, 20, 16, 10), 4, true);
  fillShape(ctx, thumb, SKIN[1]);
  inkLine(ctx, thumb, 1.2, 0.75, boil, true);
  ctx.restore();
}

const PROFILE: readonly Pt[] = spline(P(-44, -800, -60, -850, -70, -900, -56, -955, -16, -984, 30, -976, 56, -946, 60, -922, 57, -908, 80, -880, 68, -870, 72, -860, 66, -853, 70, -843, 61, -836, 63, -820, 50, -806, 22, -800, 8, -786, 10, -750, -44, -750), 5, true);

function grownHead(ctx: CanvasRenderingContext2D, p: Grown, boil: number): void {
  ctx.save();
  // Looking down at a phone bows the head about the neck.
  ctx.translate(-20, -780);
  ctx.rotate(p.phone ? 0.34 : 0);
  ctx.translate(20, 780);
  fillShape(ctx, PROFILE, linear(ctx, -60, -900, 80, -860, [[0, SKIN[2]], [0.45, SKIN[1]], [1, SKIN[0]]]));
  within(ctx, PROFILE, () => {
    dab(ctx, 40, -872, 34, '236,120,96', 0.38);
    dab(ctx, 0, -770, 60, '120,70,46', 0.4);
  });
  inkLine(ctx, PROFILE, 1.6, 0.85, boil, true, '#4a2a1c');
  // Ear, eye, brow, mouth.
  const ear = spline(P(-14, -892, -2, -896, 4, -880, -4, -862, -14, -866), 4, true);
  fillShape(ctx, ear, SKIN[1]);
  inkLine(ctx, ear, 1.2, 0.7, boil, true, '#7a4a30');
  fillShape(ctx, spline(P(36, -906, 46, -912, 56, -906, 46, -899), 4, true), '#fffaf2');
  fillShape(ctx, ring(49, -905 + (p.phone ? 2 : 0), 4.6, 5.4, 14), '#2a1a12');
  inkLine(ctx, spline(P(33, -908, 45, -915, 58, -907), 4), 2, 0.9, boil, false, '#2a1a14');
  softLine(ctx, spline(P(32, -924, 46, -930, 60, -924), 4), 5, p.hair, 0.9, 2);
  inkLine(ctx, P(50, -850, 68, -852), 1.6, 0.8, boil, false, '#8f3f36');
  const hair = spline(P(58, -936, 36, -934, 12, -918, -2, -900, -10, -880, -22, -858, -46, -836, -66, -850, -82, -900, -70, -966, -24, -1004, 34, -998, 62, -966), 5, true);
  fillShape(ctx, hair, linear(ctx, -40, -1000, 10, -850, [[0, '#6f5a4c'], [0.3, p.hair], [1, '#0f0b0a']]));
  const rng = rngOf(5);
  within(ctx, hair, () => {
    for (let i = 0; i < 26; i++) {
      const x = -70 + rng() * 120;
      softLine(ctx, curve({ x, y: -1000 + rng() * 30 }, { x: x - 18, y: -950 }, { x: x - 30, y: -880 }, 6), 3, i % 2 ? '#8d7767' : '#0e0a09', 0.35, 2);
    }
  });
  inkLine(ctx, hair, 1.5, 0.85, boil, true);
  ctx.restore();
}

export function drawGrown(ctx: CanvasRenderingContext2D, p: Grown, boil: number): void {
  groundShadow(ctx, p.x + 20 * p.k, p.y, 230 * p.k, 32 * p.k, 0.6);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.k * p.face, p.k);
  const [lit, deep] = p.coat;
  const swing = Math.cos(p.step) * p.walk;
  leg(ctx, p, true, boil);
  // The far arm: down, or bent up with the phone.
  if (p.phone) cloth(ctx, band(spline(P(26, -700, 60, -580, 170, -640), 7), (u) => 62 - 16 * u), deep, deep, [], boil);
  leg(ctx, p, false, boil);
  // The coat's shade on the legs.
  softLine(ctx, spline(P(-60, -386, 0, -374, 60, -384), 5), 50, '#140c10', 0.5, 12);
  const coat = spline(P(-20, -782, -66, -748, -84, -640, -80, -520, -94, -400, 0, -386, 88, -398, 74, -520, 80, -650, 58, -740, 26, -778), 6, true);
  cloth(ctx, coat, lit, deep, [spline(P(-40, -700, -10, -560, -20, -420), 5), spline(P(40, -640, 30, -520, 44, -410), 5), spline(P(-60, -560, -20, -540, 30, -560), 5)], boil);
  within(ctx, coat, () => {
    // The front opening, its buttons, a pocket, and the shade the near arm throws.
    softLine(ctx, spline(P(36, -770, 48, -640, 46, -396), 6), 16, deep, 0.6, 8);
    inkLine(ctx, spline(P(36, -770, 48, -640, 46, -396), 6), 1.1, 0.5, boil, false, SOFT);
    for (const y of [-690, -610, -530, -450]) {
      fillShape(ctx, ring(62, y, 8, 9, 18), radial(ctx, 60, y - 3, 12, [[0, mix(lit, deep, 0.2)], [1, deep]]));
      inkLine(ctx, ring(62, y, 8, 9, 18), 0.9, 0.5, boil, true, SOFT);
    }
    if (!p.phone) softLine(ctx, spline(P(6, -700, 4, -570, 22, -420), 6), 60, '#140c10', 0.24, 16);
    softLine(ctx, spline(P(14, -500, 40, -486, 44, -470), 4), 5, deep, 0.7, 4);
  });
  grownHead(ctx, p, boil);
  // Collar or scarf.
  const scarf = spline(P(-52, -800, -56, -758, 0, -742, 46, -752, 42, -792, 0, -776), 5, true);
  cloth(ctx, scarf, lit, deep, [], boil);
  if (p.phone) {
    const at = { x: 196, y: -668 };
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(0.5);
    dab(ctx, -30, 0, 90, '190,225,255', 0.4);
    fillShape(ctx, P(-12, -62, 12, -62, 12, 52, -12, 52), '#16171d');
    fillShape(ctx, P(-14, -54, -8, -54, -8, 44, -14, 44), '#d6ecff');
    inkLine(ctx, P(-12, -62, 12, -62, 12, 52, -12, 52), 1.4, 0.9, boil, true);
    ctx.restore();
    hand(ctx, { x: 192, y: -642 }, 1.1, boil);
    cloth(ctx, band(spline(P(-22, -716, 6, -570, 150, -596), 7), (u) => 70 - 18 * u), lit, deep, [], boil);
    hand(ctx, { x: 168, y: -600 }, -1.0, boil);
  } else {
    const h = { x: -10 + 90 * swing, y: -420 };
    cloth(ctx, band(spline([{ x: -20, y: -716 }, { x: -34 + 30 * swing, y: -570 }, h], 7), (u) => 72 - 20 * u), lit, deep, [spline(P(-50, -580, -20, -566, 6, -580), 4)], boil);
    hand(ctx, { x: h.x, y: h.y + 4 }, 0, boil);
    if (p.bag) {
      inkLine(ctx, spline(P(h.x - 30, h.y + 80, h.x - 14, h.y + 20, h.x + 16, h.y + 20, h.x + 34, h.y + 80), 5), 4, 0.9, boil, false, '#4a3426');
      const bag = spline(P(h.x - 84, h.y + 74, h.x + 84, h.y + 74, h.x + 92, h.y + 120, h.x + 86, h.y + 200, h.x - 86, h.y + 200, h.x - 92, h.y + 120), 4, true);
      cloth(ctx, bag, p.bag, '#3a281e', [P(h.x - 80, h.y + 110, h.x + 80, h.y + 112)], boil);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the child

export interface Child { readonly x: number; readonly y: number; readonly k: number; /** Head bowed to look at the crow, 0..1. */ readonly look: number; readonly smile: number }

const FACE: readonly Pt[] = spline(P(-92, -112, -92, -172, -64, -226, -4, -248, 56, -234, 92, -194, 100, -158, 98, -134, 103, -116, 116, -99, 112, -89, 102, -85, 105, -75, 101, -68, 103, -59, 95, -50, 93, -36, 82, -20, 56, -12, 24, -20, -12, -36, -44, -52, -78, -74), 6, true);

/** The child's head in profile, neck at 0,0: round cheek, a small calm eye under its lid, a closed smile. */
function childHead(ctx: CanvasRenderingContext2D, p: Child, boil: number): void {
  skin(ctx, spline(P(-40, -64, 26, -40, 30, 20, 0, 34, -38, 22), 5, true), boil);
  dab(ctx, 8, -14, 60, '120,66,42', 0.4);
  fillShape(ctx, FACE, linear(ctx, -90, -110, 112, -130, [[0, '#b77a56'], [0.35, '#e4ac84'], [0.7, '#fadbbc'], [1, '#ffe7cf']]));
  within(ctx, FACE, () => {
    // Round cheek, warm under the skin; shade along the jaw, under the hat and beside the nose.
    dab(ctx, 62, -86, 60, '255,236,214', 0.5);
    dab(ctx, 60, -74, 40, '232,112,92', 0.34);
    softLine(ctx, spline(P(-70, -66, -10, -30, 30, -14, 80, -14), 6), 46, '#a4643f', 0.45, 14);
    softLine(ctx, spline(P(-60, -196, 20, -190, 104, -178), 6), 60, '#7a4a34', 0.5, 14);
    dab(ctx, 84, -122, 22, '170,104,72', 0.28);
    dab(ctx, 106, -103, 12, '255,244,230', 0.7);
    dab(ctx, 100, -92, 12, '196,96,74', 0.3);
  });
  inkLine(ctx, FACE, 1.2, 0.7, boil, true, '#6b3f2a');
  // Ear.
  const ear = spline(P(-24, -128, -12, -142, 2, -136, 4, -114, -8, -92, -20, -98), 5, true);
  skin(ctx, ear, boil);
  softLine(ctx, spline(P(-14, -128, -4, -126, -4, -110, -12, -104), 4), 5, '#a05a40', 0.6, 4);
  // The eye, profile: a small white, a dark iris looking down, the lid's lash line, a light fold above.
  const eye = spline(P(66, -117, 74, -126, 86, -126, 90, -116, 86, -108, 74, -110), 5, true);
  fillShape(ctx, eye, '#f6efe6');
  within(ctx, eye, () => {
    const iy = -117 + 3 * p.look;
    fillShape(ctx, ring(83, iy, 6.4, 8.6, 24), radial(ctx, 83, iy + 3, 9, [[0, '#6b4126'], [1, '#22130b']]));
    fillShape(ctx, ring(84, iy, 3.2, 4.6, 16), '#0c0705');
    fillShape(ctx, ring(81, iy - 4, 1.9, 1.9, 10), '#ffffff');
    softLine(ctx, P(64, -125, 92, -124), 6, '#7a4c34', 0.5, 4);
  });
  inkLine(ctx, spline(P(62, -116, 73, -127, 86, -128, 92, -121), 5), 2, 0.9, boil, false, '#2a1812');
  inkLine(ctx, spline(P(72, -109, 80, -107, 88, -110), 4), 0.9, 0.35, boil, false, '#7a4a34');
  softLine(ctx, spline(P(62, -134, 74, -139, 88, -137), 4), 3, '#a06a4c', 0.5, 3);
  softLine(ctx, spline(P(62, -152, 78, -159, 94, -154), 5), 6, '#3a2820', 0.75, 4);
  // A closed, easy smile.
  inkLine(ctx, spline(P(80, -62 - 3 * p.smile, 90, -64, 102, -67), 5), 1.6, 0.8, boil, false, '#9a4438');
  dab(ctx, 79, -62 - 3 * p.smile, 6, '150,70,54', 0.45);
  softLine(ctx, P(92, -54, 99, -56), 3, '#e0918a', 0.6, 3);
  // Hair, then the yellow hat with its ribbon and turned-down brim.
  const hair = spline(P(46, -202, 34, -164, 16, -150, 4, -146, -18, -144, -30, -110, -42, -78, -70, -62, -104, -80, -114, -140, -100, -200, -30, -216), 6, true);
  fillShape(ctx, hair, linear(ctx, -110, -180, 40, -120, [[0, '#15100e'], [0.6, '#3a2b24'], [1, '#2a1e19']]));
  within(ctx, hair, () => {
    const rng = rngOf(52);
    for (let i = 0; i < 46; i++) {
      const x = -110 + rng() * 140;
      softLine(ctx, curve({ x, y: -206 }, { x: x - 6, y: -150 }, { x: x - 22, y: -70 }, 7), 2, i % 3 ? '#6d5546' : '#0c0807', 0.32, 1);
    }
  });
  inkLine(ctx, hair, 1.1, 0.6, boil, true, '#140d0a');
  const hat = spline(P(-118, -180, -116, -244, -70, -298, 4, -316, 74, -290, 106, -232, 110, -192, 40, -184, -50, -178), 6, true);
  fillShape(ctx, hat, radial(ctx, 40, -270, 230, [[0, '#ffe98e'], [0.4, '#f4c63c'], [0.75, '#c98f22'], [1, '#8a5c14']]));
  within(ctx, hat, () => {
    for (const x of [-60, 0, 56]) softLine(ctx, spline(P(x * 0.2, -316, x * 0.9, -260, x * 1.15, -180), 6), 5, '#8a5c14', 0.35, 4);
    softLine(ctx, spline(P(-120, -190, 0, -206, 112, -204), 6), 40, '#8a5c14', 0.45, 12);
    dab(ctx, 44, -280, 60, '255,250,214', 0.5);
  });
  inkLine(ctx, hat, 1.2, 0.7, boil, true, '#6b4a14');
  softLine(ctx, spline(P(-117, -202, 0, -222, 110, -220), 6), 17, '#2b3a66', 0.95, 4);
  const brim = spline(P(-152, -158, -116, -186, 0, -204, 104, -208, 160, -186, 172, -164, 96, -176, 0, -176, -100, -158), 6, true);
  fillShape(ctx, brim, linear(ctx, -150, -200, 170, -170, [[0, '#a06e18'], [0.4, '#e0ac30'], [0.8, '#ffe07a'], [1, '#e2b23c']]));
  softLine(ctx, spline(P(-120, -166, 0, -182, 96, -182, 160, -172), 6), 10, '#8a5c14', 0.4, 6);
  inkLine(ctx, brim, 1.2, 0.7, boil, true, '#6b4a14');
}

/** A small child with a yellow school hat and a red satchel, holding its strap, looking down at the crow. */
export function drawChild(ctx: CanvasRenderingContext2D, p: Child, boil: number): void {
  groundShadow(ctx, p.x + 30 * p.k, p.y, 220 * p.k, 34 * p.k, 0.6);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.k, p.k);
  for (const [x, far] of [[34, true], [-22, false]] as const) {
    const limb = band(spline(P(x - 2, -330, x + 8, -210, x - 2, -130, x, -60), 7), (u) => 78 - 26 * u + 8 * Math.sin(u * 6));
    skin(ctx, limb, boil);
    within(ctx, limb, () => {
      softLine(ctx, P(x - 40, -276, x + 44, -276), 70, '#7a4630', far ? 0.75 : 0.5, 12);
      dab(ctx, x + 14, -206, 22, '232,140,108', 0.35);
    });
    const sock = band(spline(P(x + 1, -154, x - 2, -100, x, -50), 5), (u) => 62 - 4 * u);
    cloth(ctx, sock, '#fbf7ee', '#b3b4c4', [], boil);
    const shoe = spline(P(x - 42, -56, x - 48, -16, x - 40, 2, x + 20, 3, x + 78, 2, x + 88, -16, x + 70, -36, x + 34, -48, x + 24, -60), 5, true);
    cloth(ctx, shoe, '#5f8fbe', '#24405f', [spline(P(x + 24, -46, x + 34, -34, x + 30, -14), 4)], boil);
    fillShape(ctx, P(x - 45, -8, x + 87, -8, x + 82, 4, x - 41, 4), linear(ctx, 0, -8, 0, 4, [[0, '#f4f0e6'], [1, '#b9b2a4']]));
  }
  cloth(ctx, spline(P(-84, -440, -94, -330, -90, -272, -40, -262, -2, -270, 6, -284, 14, -268, 60, -264, 92, -276, 88, -350, 80, -440), 5, true), '#5c74a8', '#2b3960', [spline(P(-40, -430, -50, -350, -44, -280), 5), spline(P(46, -420, 56, -350, 50, -284), 5), spline(P(4, -420, 8, -350, 8, -290), 5)], boil);
  // The satchel on its back: a padded lid, a seam, a clasp.
  const bag = spline(P(-84, -640, -150, -646, -198, -634, -218, -596, -222, -500, -216, -424, -192, -398, -90, -396), 6, true);
  cloth(ctx, bag, '#dd4b3a', '#8e1f1d', [], boil);
  within(ctx, bag, () => {
    softLine(ctx, spline(P(-196, -616, -150, -628, -96, -626), 6), 26, '#ffb39a', 0.55, 12);
    softLine(ctx, spline(P(-222, -470, -150, -458, -84, -464), 6), 16, '#4a0f10', 0.55, 8);
    softLine(ctx, spline(P(-222, -478, -150, -466, -84, -472), 6), 5, '#f08a70', 0.5, 4);
    softLine(ctx, spline(P(-206, -430, -150, -412, -92, -410), 6), 24, '#3f0b0c', 0.5, 10);
  });
  // The shirt, shaded by the head above, shading the shorts below.
  const shirt = spline(P(-66, -656, -94, -560, -90, -428, 0, -416, 90, -426, 86, -560, 58, -652, 0, -668), 6, true);
  softLine(ctx, spline(P(-84, -418, 0, -408, 84, -418), 5), 34, '#141a30', 0.45, 10);
  cloth(ctx, shirt, '#fffaf0', '#cdbfa6', [spline(P(-34, -600, -26, -520, -36, -436), 5), spline(P(44, -590, 36, -510, 46, -436), 5), spline(P(-70, -470, 0, -452, 70, -462), 5)], boil);
  within(ctx, shirt, () => dab(ctx, 10, -654, 80, '90,60,40', 0.45));
  const strap = spline(P(-52, -650, 10, -604, 16, -530, -30, -450), 6);
  softLine(ctx, strap.map((q) => ({ x: q.x + 5, y: q.y + 4 })), 26, '#5c4a38', 0.4, 8);
  softLine(ctx, strap, 24, '#8f211d', 0.95, 3);
  softLine(ctx, strap.map((q) => ({ x: q.x + 3, y: q.y - 3 })), 9, '#e8705a', 0.7, 5);
  // The near arm, bent up to hold the strap.
  const sleeve = band(spline(P(-34, -622, -46, -540, -8, -488, 22, -520), 8), (u) => 74 - 24 * u);
  softLine(ctx, spline(P(-10, -600, -20, -530, 20, -470, 50, -520), 6), 40, '#6b5a44', 0.4, 12);
  cloth(ctx, sleeve, '#fffaf0', '#c4b59c', [spline(P(-64, -560, -34, -536, -14, -520), 5)], boil);
  const fist = spline(P(4, -536, 20, -556, 44, -552, 52, -534, 44, -514, 20, -508, 6, -516), 5, true);
  skin(ctx, fist, boil);
  for (const x of [22, 32, 42]) inkLine(ctx, spline(P(x, -550, x + 4, -534, x, -516), 4), 0.9, 0.4, boil, false, '#8a5238');
  ctx.save();
  ctx.translate(2, -640);
  ctx.rotate(0.2 * p.look);
  childHead(ctx, p, boil);
  ctx.restore();
  cloth(ctx, spline(P(-54, -652, -44, -624, -6, -606, 10, -622, 30, -600, 56, -632, 46, -656, 14, -632, -16, -636), 5, true), '#fffaf0', '#b7a88f', [], boil);
  ctx.restore();
}
