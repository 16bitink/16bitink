import { INK, Pen, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { path, screenScale, smoothLoop, softLine, taper } from '../../seal/art/paint';

/**
 * What the two ray meals share (stingray.ts, eagleRay.ts): a ray painted as
 * the side-on camera would catch it gliding a little below, so the top of the
 * disc shows, squashed, and the wings can beat. Each ray gives its disc as
 * seen from above, (u forward, w out toward us), in its own 100-unit length;
 * this projects it, lifts the body's dome and the beating wings, and paints
 * it: the pale underside showing along the near edge, the top washed and
 * shaded, darker toward the margins, a ridge of light down the back, the
 * whip tail with its spine, the raised eyes. Drawn live (meals are small),
 * the pen reseeded per line-boil frame.
 */

export interface Ray {
  /** The disc (and head) from above, a loop: u forward (+ = the snout), w sideways (+ = toward us). */
  readonly disc: readonly (readonly [number, number])[];
  /** The tail: where it leaves the disc, how far back it reaches, how thick at the root, and where the spine sits (0..1 along it). */
  readonly tail: { readonly root: number; readonly tip: number; readonly thick: number; readonly spine: number };
  /** The body's dome: centre u, half-length, half-width, height. */
  readonly dome: { readonly u: number; readonly lu: number; readonly lw: number; readonly h: number };
  /** Where the wing beat starts (|w| beyond this lifts) and how far the tips rise at most. */
  readonly wing: { readonly from: number; readonly reach: number; readonly lift: number };
  /** Beats per second. */
  readonly rate: number;
  /** Eyes, from above, (u, |w|), radius; spiracles likewise. */
  readonly eye: { readonly u: number; readonly w: number; readonly r: number };
  readonly spiracle: { readonly u: number; readonly w: number; readonly r: number };
  readonly top: { readonly light: string; readonly mid: string; readonly dark: string };
  readonly belly: string;
  /** Species marks painted on the top, after the washes, clipped to the disc. */
  readonly marks?: (r: RayBrush) => void;
}

export interface RayBrush {
  readonly ctx: CanvasRenderingContext2D;
  readonly pen: Pen;
  /** One screen px in local units. */
  readonly lw: number;
  /** Projects a top-view point (with the dome and beat) to the page. */
  readonly at: (u: number, w: number) => Pt;
}

/** How much of the sideways axis shows (the camera a little above), and its lean. */
const SQUASH = 0.3;
const SKEW = 0.08;

function lifter(r: Ray, flap: number): (u: number, w: number) => number {
  const d = r.dome;
  return (u, w) => {
    const dome = d.h * Math.max(0, 1 - (w / d.lw) ** 2 - ((u - d.u) / d.lu) ** 2);
    const out = Math.max(0, Math.abs(w) - r.wing.from) / (r.wing.reach - r.wing.from);
    return dome + flap * r.wing.lift * out * out;
  };
}

function tailLine(r: Ray, t: number): Pt[] {
  const n = 18;
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n;
    const x = r.tail.root + (r.tail.tip - r.tail.root) * s;
    return { x, y: -0.5 + 2.6 * s * s * Math.sin(t * 3 - s * 4) };
  });
}

function paintTail(b: RayBrush, r: Ray, t: number): void {
  const { ctx } = b;
  const line = tailLine(r, t);
  taper(ctx, line, r.tail.thick + 1.6 * b.lw, 1.4 * b.lw, INK, 0.95);
  taper(ctx, line, r.tail.thick, 0.4 * b.lw, r.top.mid, 1);
  taper(ctx, line.slice(0, 12).map((p) => ({ x: p.x, y: p.y + r.tail.thick * 0.22 })), r.tail.thick * 0.4, 0.2, r.belly, 0.7);
  // The spine: a slim serrated barb lying back along the top of the tail.
  const i = Math.round(r.tail.spine * (line.length - 1));
  const base = line[i]!;
  const tip = line[Math.min(line.length - 1, i + 3)]!;
  const barb: Pt[] = [{ x: base.x, y: base.y - r.tail.thick * 0.35 }, { x: tip.x, y: tip.y - r.tail.thick * 0.9 }, { x: base.x - 1.5, y: base.y - r.tail.thick * 0.1 }];
  ctx.save();
  path(ctx, barb);
  ctx.fillStyle = '#d8ccb0';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9 * b.lw;
  ctx.stroke();
  ctx.restore();
}

function eyeDome(b: RayBrush, r: Ray, side: 1 | -1): void {
  const { ctx } = b;
  const e = b.at(r.eye.u, r.eye.w * side);
  const rad = r.eye.r * (side > 0 ? 1 : 0.8);
  ctx.save();
  ctx.fillStyle = r.top.light;
  ctx.beginPath();
  ctx.ellipse(e.x, e.y - rad * 0.3, rad * 1.5, rad * 1.1, 0, Math.PI, 0);
  ctx.fill();
  const g = ctx.createRadialGradient(e.x - rad * 0.2, e.y - rad * 0.2, 0, e.x, e.y, rad);
  g.addColorStop(0, '#4a3d22');
  g.addColorStop(0.6, '#15110b');
  g.addColorStop(1, '#050404');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, rad, rad * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8 * b.lw;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(e.x + rad * 0.3, e.y - rad * 0.3, rad * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const s = b.at(r.spiracle.u, r.spiracle.w * side);
  const sr = r.spiracle.r * (side > 0 ? 1 : 0.8);
  ctx.save();
  ctx.fillStyle = 'rgba(20,14,8,0.85)';
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, sr, sr * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  taper(ctx, [{ x: s.x - sr, y: s.y - sr * 0.5 }, { x: s.x, y: s.y - sr * 0.8 }, { x: s.x + sr, y: s.y - sr * 0.4 }], 1 * b.lw, 0.5 * b.lw, r.top.light, 0.8);
}

/** Paints `r` facing right around the origin in its own units (call scaled). */
function paintRay(ctx: CanvasRenderingContext2D, r: Ray, t: number, boil: number): void {
  const lw = 1 / screenScale(ctx);
  const pen = new Pen(ctx, 4421 + boil * 977, 0.4 * lw);
  const flap = Math.sin(t * Math.PI * 2 * r.rate);
  const lift = lifter(r, flap);
  const at = (u: number, w: number): Pt => ({ x: u + SKEW * w, y: SQUASH * w - lift(u, w) });
  const b: RayBrush = { ctx, pen, lw, at };
  const loop = smoothLoop(r.disc.map(([u, w]) => ({ x: u, y: w })), 5);
  const disc = loop.map((p) => at(p.x, p.y));
  paintTail(b, r, t);
  // The underside, showing as a pale rim under the near edge.
  const under = disc.map((p) => ({ x: p.x, y: p.y + 1.8 }));
  pen.fill(under, r.belly, 1);
  pen.stroke(under, 1.3 * lw, INK, 0.9, false);
  const ys = disc.map((p) => p.y);
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  pen.fill(disc, r.top.mid, 1);
  pen.clipped(disc, () => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, r.top.dark);
    g.addColorStop(0.45, r.top.mid);
    g.addColorStop(1, r.top.light);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = g;
    ctx.fillRect(-80, y0 - 2, 160, y1 - y0 + 4);
    ctx.globalAlpha = 1;
    softLine(ctx, [...disc, disc[0]!], 7, r.top.dark, 0.35);
    const ridge = Array.from({ length: 12 }, (_, i) => at(r.dome.u + r.dome.lu * (0.9 - (1.8 * i) / 11), 0));
    softLine(ctx, ridge.map((p) => ({ x: p.x, y: p.y - 0.6 })), 5, r.top.light, 0.4);
    pen.stipple(disc, 900, () => 0.5, 0.35, 'rgba(20,14,8,0.35)');
    r.marks?.(b);
  });
  pen.stroke([...disc, disc[0]!], 1.5 * lw, INK, 1, false);
  eyeDome(b, r, -1);
  eyeDome(b, r, 1);
}

/** Draws a ray meal, its body centre at (x, y), `len` px long, facing `facing`, at time `t`. */
export function drawRay(ctx: CanvasRenderingContext2D, r: Ray, x: number, y: number, len: number, facing: 1 | -1, t: number): void {
  const boil = ((Math.floor(t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const mid = (r.disc.reduce((a, [u]) => Math.max(a, u), -1e9) + r.tail.tip) / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((facing * len) / 100, len / 100);
  ctx.translate(-mid, 0);
  ctx.lineJoin = 'round';
  paintRay(ctx, r, t, boil);
  ctx.restore();
}
