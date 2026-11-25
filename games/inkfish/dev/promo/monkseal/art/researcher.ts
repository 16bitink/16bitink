import type { Pt } from '../../../../src/art/pen';
import { cap, face, ponytail, stroke } from './researcherHead';
import { spline } from '../../kraken/whale';
import { curve, dab, mix, path, smoothLoop, softLine, taper } from '../../seal/art/paint';

/**
 * A field researcher, from the hips up, in natural proportions: a plain teal
 * field shirt, a plain cap, a real face lit from the upper left (eyes with
 * lids and a catchlight, nose, mouth), blue gloves. After
 * ../../orcastomach/art/scientist.ts. Own units: the head 100 tall, at 0,0.
 */

export interface Person {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly skin: string;
  readonly hair: string;
  readonly shirt: string;
  readonly cap: string;
  /** Long hair tied back, or a short beard. */
  readonly style: 'ponytail' | 'beard';
  /** Features shifted: -1 looking left .. 1 looking right. */
  readonly turn: number;
  /** Looking down (+) or up. */
  readonly down?: number;
  readonly tilt?: number;
  /** The torso's lean, radians. */
  readonly lean?: number;
  /** 0 calm smile, 1 straining (teeth), 2 amazed "oh", 3 a doubtful smirk. */
  readonly mood: 'smile' | 'strain' | 'oh' | 'smirk';
  /** Where the hands are, screen px (left and right of the picture); none: the arms hang. */
  readonly handL?: Pt;
  readonly handR?: Pt;
  /** Elbow bow of each arm, in own units. */
  readonly bowL?: number;
  readonly bowR?: number;
  /** A fist round something (gripping) rather than an open flat hand. */
  readonly grip?: boolean;
  readonly blink?: number;
  /** Kneeling on the sand: shorts, bare knees. */
  readonly kneel?: boolean;
}

const GLOVE = '#4f9fd0';

/** A gloved hand: a flat palm with four fingers and a thumb, or closed round something. `aim`: the way the fingers point. */
export function glove(ctx: CanvasRenderingContext2D, at: Pt, aim: number, s: number, grip: boolean, side: 1 | -1 = 1): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(aim);
  ctx.scale(s, s * side);
  const g = ctx.createLinearGradient(0, -20, 0, 22);
  g.addColorStop(0, '#a4d6f0');
  g.addColorStop(0.45, GLOVE);
  g.addColorStop(1, '#215f8c');
  // The rolled cuff.
  ctx.fillStyle = '#2f78a8';
  ctx.beginPath();
  ctx.roundRect(-31, -15, 11, 30, 5);
  ctx.fill();
  stroke(ctx, 1.3);
  ctx.fillStyle = g;
  if (grip) {
    path(ctx, smoothLoop([{ x: -22, y: -13 }, { x: -4, y: -19 }, { x: 12, y: -18 }, { x: 14, y: 14 }, { x: -2, y: 18 }, { x: -22, y: 13 }], 5));
    ctx.fill();
    stroke(ctx, 1.4);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.roundRect(-3, -20 + i * 9.6, 27 - Math.abs(i - 1.3) * 2, 10.4, 5.2);
      ctx.fillStyle = g;
      ctx.fill();
      stroke(ctx, 1.3);
      softLine(ctx, [{ x: 4, y: -17 + i * 9.6 }, { x: 18, y: -17 + i * 9.6 }], 2.4, '#e2f4fc', 0.6, 3);
    }
    ctx.beginPath();
    ctx.ellipse(-2, -17, 15, 6.4, 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#7fbfe4';
    ctx.fill();
    stroke(ctx, 1.3);
  } else {
    for (const [y, len, fan] of [[-13, 34, -0.16], [-4.4, 40, -0.04], [4.6, 39, 0.06], [13, 32, 0.2]] as const) {
      ctx.save();
      ctx.translate(8, y);
      ctx.rotate(fan);
      ctx.beginPath();
      ctx.roundRect(-6, -5, len, 10, 5);
      ctx.fillStyle = g;
      ctx.fill();
      stroke(ctx, 1.3);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(-4, -14);
    ctx.rotate(-0.8);
    ctx.beginPath();
    ctx.roundRect(-5, -5.5, 30, 11, 5.5);
    ctx.fillStyle = g;
    ctx.fill();
    stroke(ctx, 1.3);
    ctx.restore();
    path(ctx, smoothLoop([{ x: -22, y: -13 }, { x: 0, y: -19 }, { x: 14, y: -17 }, { x: 15, y: 17 }, { x: 0, y: 19 }, { x: -22, y: 13 }], 5));
    ctx.fillStyle = g;
    ctx.fill();
    dab(ctx, -4, -8, 12, '226,244,252', 0.5);
  }
  ctx.restore();
}

/** An arm: the short sleeve, the forearm, the glove. */
function arm(ctx: CanvasRenderingContext2D, a: Pt, w: Pt, bow: number, p: Person, side: 1 | -1): void {
  const mid = { x: (a.x + w.x) / 2 + bow * side, y: (a.y + w.y) / 2 + Math.abs(bow) * 0.75 };
  const pts = spline([{ x: a.x - side * 16, y: a.y - 8 }, { x: (a.x + mid.x) / 2 + side * bow * 0.2, y: (a.y + mid.y) / 2 + 4 }, mid, { x: (mid.x + w.x) / 2, y: (mid.y + w.y) / 2 + 2 }, w], 8);
  const n = pts.length - 1;
  const dark = mix(p.skin, '#4a2412', 0.5);
  const limb = (from: number, to: number, w0: number, w1: number): Pt[] => {
    const L: Pt[] = [];
    const R: Pt[] = [];
    for (let i = from; i <= to; i++) {
      const [q, r] = [pts[Math.max(0, i - 1)]!, pts[Math.min(n, i + 1)]!];
      const l = Math.hypot(r.x - q.x, r.y - q.y) || 1;
      const h = w0 + (w1 - w0) * ((i - from) / Math.max(1, to - from));
      const nn = { x: -(r.y - q.y) / l, y: (r.x - q.x) / l };
      L.push({ x: pts[i]!.x + nn.x * h, y: pts[i]!.y + nn.y * h });
      R.push({ x: pts[i]!.x - nn.x * h, y: pts[i]!.y - nn.y * h });
    }
    return [...L, ...R.reverse()];
  };
  const fore = limb(Math.round(n * 0.3), n, 17.5, 11.5);
  path(ctx, fore);
  ctx.fillStyle = p.skin;
  ctx.fill();
  ctx.save();
  ctx.clip();
  softLine(ctx, pts.map((q) => ({ x: q.x + 4, y: q.y + 14 })), 18, dark, 0.8, 10);
  softLine(ctx, pts.map((q) => ({ x: q.x - 2, y: q.y - 7 })), 10, '#fff0de', 0.4, 8);
  ctx.restore();
  path(ctx, fore);
  stroke(ctx, 1.5);
  const sleeve = limb(0, Math.round(n * 0.42), 25, 25);
  path(ctx, sleeve);
  ctx.fillStyle = p.shirt;
  ctx.fill();
  ctx.save();
  ctx.clip();
  softLine(ctx, pts.slice(0, Math.round(n * 0.45)).map((q) => ({ x: q.x + 4, y: q.y + 22 })), 28, mix(p.shirt, '#000000', 0.55), 0.8, 10);
  softLine(ctx, pts.slice(0, Math.round(n * 0.45)).map((q) => ({ x: q.x - 6, y: q.y - 16 })), 16, '#ffffff', 0.35, 8);
  ctx.restore();
  // Ink: the outer side all the way up round the shoulder, the inner side and the cuff only.
  const half = sleeve.length / 2;
  const L = sleeve.slice(0, half);
  const R = sleeve.slice(half).reverse();
  const [outer, inner] = side < 0 ? [L, R] : [R, L];
  for (const pts2 of [outer, inner.slice(Math.round(half * 0.5)), [L[half - 1]!, R[half - 1]!]]) {
    ctx.beginPath();
    pts2.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    stroke(ctx, 1.5);
  }
  const aim = Math.atan2(w.y - pts[n - 3]!.y, w.x - pts[n - 3]!.x);
  glove(ctx, { x: w.x + Math.cos(aim) * 18, y: w.y + Math.sin(aim) * 18 }, aim, 1.06, !!p.grip, side);
}

function torso(ctx: CanvasRenderingContext2D, p: Person): void {
  const dark = mix(p.shirt, '#000000', 0.55);
  path(ctx, [{ x: -20, y: 28 }, { x: 20, y: 28 }, { x: 25, y: 84 }, { x: -25, y: 84 }]);
  ctx.fillStyle = mix(p.skin, '#4a2412', 0.4);
  ctx.fill();
  stroke(ctx, 1.2);
  const body = smoothLoop([
    { x: -26, y: 72 }, { x: -74, y: 88 }, { x: -94, y: 118 }, { x: -86, y: 220 }, { x: -74, y: 300 }, { x: -80, y: 352 }, { x: -40, y: 366 }, { x: 0, y: 368 }, { x: 40, y: 366 }, { x: 80, y: 352 }, { x: 74, y: 300 }, { x: 86, y: 220 }, { x: 94, y: 118 }, { x: 74, y: 88 }, { x: 26, y: 72 }, { x: 0, y: 86 },
  ], 5);
  path(ctx, body);
  const g = ctx.createLinearGradient(-110, 60, 110, 300);
  g.addColorStop(0, mix(p.shirt, '#ffffff', 0.3));
  g.addColorStop(0.45, p.shirt);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, -60, 130, 60, '255,255,255', 0.22);
  dab(ctx, 80, 260, 90, '6,14,18', 0.4);
  for (const [x, y] of [[-50, 250], [30, 300], [60, 200]] as const) softLine(ctx, curve({ x: x - 34, y }, { x, y: y + 16 }, { x: x + 36, y: y - 4 }, 8), 8, dark, 0.4);
  ctx.restore();
  path(ctx, body);
  stroke(ctx, 1.7);
  // A polo collar and two buttons.
  for (const s of [-1, 1]) {
    path(ctx, smoothLoop([{ x: s * 4, y: 92 }, { x: s * 18, y: 68 }, { x: s * 32, y: 74 }, { x: s * 28, y: 104 }], 4));
    ctx.fillStyle = mix(p.shirt, '#ffffff', 0.35);
    ctx.fill();
    stroke(ctx, 1.2);
  }
  softLine(ctx, [{ x: 0, y: 92 }, { x: 1, y: 150 }], 1.6, dark, 0.9, 2);
  for (const y of [112, 136]) {
    ctx.beginPath();
    ctx.arc(1, y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = '#f2ead8';
    ctx.fill();
    stroke(ctx, 0.8);
  }
}

/** Kneeling, seen from the front: dark shorts, two bare knees coming forward, resting on the sand. */
function knees(ctx: CanvasRenderingContext2D, p: Person): void {
  const dark = mix(p.skin, '#4a2412', 0.5);
  softLine(ctx, [{ x: -150, y: 520 }, { x: 0, y: 534 }, { x: 150, y: 520 }], 40, '#4a3414', 0.6, 16);
  for (const s of [-1, 1]) {
    const knee = smoothLoop([{ x: s * 18, y: 400 }, { x: s * 96, y: 396 }, { x: s * 124, y: 440 }, { x: s * 122, y: 500 }, { x: s * 92, y: 528 }, { x: s * 44, y: 526 }, { x: s * 20, y: 490 }], 6);
    path(ctx, knee);
    const g = ctx.createRadialGradient(s * 66 - 18, 452, 8, s * 70, 468, 84);
    g.addColorStop(0, mix(p.skin, '#fff4e4', 0.4));
    g.addColorStop(0.5, p.skin);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fill();
    stroke(ctx, 1.6);
    softLine(ctx, curve({ x: s * 50, y: 480 }, { x: s * 74, y: 494 }, { x: s * 98, y: 478 }, 8), 4, dark, 0.5);
  }
  const shorts = smoothLoop([{ x: -78, y: 330 }, { x: 78, y: 330 }, { x: 110, y: 380 }, { x: 134, y: 446 }, { x: 80, y: 462 }, { x: 22, y: 452 }, { x: 0, y: 424 }, { x: -22, y: 452 }, { x: -80, y: 462 }, { x: -134, y: 446 }, { x: -110, y: 380 }], 6);
  path(ctx, shorts);
  const g = ctx.createLinearGradient(-110, 330, 110, 460);
  g.addColorStop(0, '#5c6b7a');
  g.addColorStop(0.5, '#3d4957');
  g.addColorStop(1, '#222b36');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (const s of [-1, 1]) {
    softLine(ctx, curve({ x: s * 4, y: 400 }, { x: s * 50, y: 384 }, { x: s * 90, y: 400 }, 8), 10, '#141b24', 0.5);
    softLine(ctx, curve({ x: s * 30, y: 436 }, { x: s * 78, y: 448 }, { x: s * 122, y: 434 }, 8), 5, '#8a99a8', 0.5);
  }
  ctx.restore();
  path(ctx, shorts);
  stroke(ctx, 1.6);
}

/** Draws one researcher; `behind` draws the parts behind whatever comes next (all but the arms), `arms` only the arms. */
export function drawResearcher(ctx: CanvasRenderingContext2D, p: Person, part: 'all' | 'behind' | 'arms' = 'all'): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.scale, p.scale);
  const lean = p.lean ?? 0;
  // The lean turns the whole figure about the hips; the hands stay where they hold.
  const hip = { x: 0, y: 400 };
  const inv = (q: Pt): Pt => {
    const u = { x: (q.x - p.x) / p.scale - hip.x, y: (q.y - p.y) / p.scale - hip.y };
    const [c, s] = [Math.cos(-lean), Math.sin(-lean)];
    return { x: hip.x + u.x * c - u.y * s, y: hip.y + u.x * s + u.y * c };
  };
  ctx.translate(hip.x, hip.y);
  ctx.rotate(lean);
  ctx.translate(-hip.x, -hip.y);
  if (part !== 'arms') {
    if (p.kneel) knees(ctx, p);
    torso(ctx, p);
    ctx.save();
    ctx.translate(0, 50);
    ctx.rotate(p.tilt ?? 0);
    ctx.translate(0, -50);
    if (p.style === 'ponytail') ponytail(ctx, p);
    face(ctx, p);
    // Hair at the temples, under the cap.
    for (const s of [-1, 1]) {
      path(ctx, smoothLoop([{ x: s * 40, y: -30 }, { x: s * 42, y: -6 }, { x: s * 35, y: 4 }, { x: s * 33, y: -20 }], 4));
      ctx.fillStyle = p.hair;
      ctx.fill();
    }
    cap(ctx, p);
    ctx.restore();
  }
  if (part !== 'behind') {
    const L = p.handL ? inv(p.handL) : { x: -100, y: 330 };
    const R = p.handR ? inv(p.handR) : { x: 100, y: 330 };
    arm(ctx, { x: -76, y: 116 }, L, p.bowL ?? 26, p, -1);
    arm(ctx, { x: 76, y: 116 }, R, p.bowR ?? 26, p, 1);
  }
  ctx.restore();
}
