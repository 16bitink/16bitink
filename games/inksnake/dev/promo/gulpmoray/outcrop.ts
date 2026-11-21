import { INK } from '../../../src/art/palette';
import type { Pt } from '../sprites';
import { CORAL_R, coralAt, holeAt } from './rail';
import { EEL_D, toScreen, type View } from './story';

/**
 * The moray's home: a coral outcrop seen from the side, an irregular rocky
 * lump sitting on the sand, crusted with coralline pinks and algae greens,
 * a few short knobbly coral branches and a sea fan on top, and the dark
 * hole in its top face that the eel lives in. Painted in two passes round
 * the eel: the rock and the hole's dark first, then the shade down inside
 * the hole, its front lip and the branches over it.
 */
const ROCK = { lit: '#cdbd9a', mid: '#a39478', deep: '#625c58', algae: '#7f9a5a', pink: '#d99c98', violet: '#8c70a2', speck: '#efe4c8' } as const;
const BRANCH = { fill: '#eb9f78', deep: '#b8603e', tip: '#f8d2b0' } as const;
const FAN = '#9a5aa6';

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const trace = (ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
};

/** The rock's outline, world units: lumpy all round, flattened where it sits on the sand. */
function rockShape(k: number): Pt[] {
  const c = coralAt(k);
  const R = CORAL_R;
  return Array.from({ length: 72 }, (_, i) => {
    const th = (i / 72) * Math.PI * 2;
    const r = R * (1 + 0.1 * Math.sin(3 * th + 0.7) + 0.06 * Math.sin(5 * th + 2.1) + 0.035 * Math.sin(9 * th + 0.4));
    return { x: c.x + r * Math.cos(th) * 1.18, y: c.y + Math.min(0.6 * R, r * Math.sin(th) * 0.8) };
  });
}

/** The hole's rim, world units: an irregular oval across the way in. */
function holeShape(k: number): Pt[] {
  const h = holeAt(k);
  const d = { x: Math.cos(h.heading), y: Math.sin(h.heading) };
  const n = { x: -d.y, y: d.x };
  const c = { x: h.x + d.x * 12, y: h.y + d.y * 12 };
  return Array.from({ length: 40 }, (_, i) => {
    const th = (i / 40) * Math.PI * 2;
    const w = 1 + 0.07 * Math.sin(3 * th + 1.3) + 0.05 * Math.sin(5 * th);
    const [a, b] = [Math.cos(th) * EEL_D * 1.2 * w, Math.sin(th) * EEL_D * 0.46 * w];
    return { x: c.x + n.x * a + d.x * b, y: c.y + n.y * a + d.y * b };
  });
}

/** The rock and the dark of its hole, under the eel. */
export function drawOutcropBack(ctx: CanvasRenderingContext2D, view: View, k: number): void {
  const z = view.zoom;
  const rock = rockShape(k).map((p) => toScreen(view, p));
  const c = toScreen(view, coralAt(k));
  const R = CORAL_R * z;
  ctx.save();
  // Its shadow on the sand.
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(c.x + 0.2 * R, c.y + 0.6 * R, 1.3 * R, 0.22 * R, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  trace(ctx, rock);
  const g = ctx.createLinearGradient(0, c.y - R, 0, c.y + 0.6 * R);
  g.addColorStop(0, ROCK.lit);
  g.addColorStop(0.5, ROCK.mid);
  g.addColorStop(1, ROCK.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const r = rng(4100 + k * 13);
  for (let i = 0; i < 26; i++) {
    const col = [ROCK.algae, ROCK.pink, ROCK.violet, ROCK.lit][i % 4]!;
    ctx.globalAlpha = 0.18 + 0.2 * r();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(c.x + (r() - 0.5) * 2.2 * R, c.y + (r() - 0.6) * 1.5 * R, (0.12 + 0.2 * r()) * R, (0.07 + 0.12 * r()) * R, r() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = ROCK.speck;
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.35 + 0.4 * r();
    ctx.beginPath();
    ctx.arc(c.x + (r() - 0.5) * 2.3 * R, c.y + (r() - 0.6) * 1.6 * R, (1.2 + 2.2 * r()) * z, 0, Math.PI * 2);
    ctx.fill();
  }
  // Round: lit across the top, shadowed underneath.
  const shade = ctx.createLinearGradient(0, c.y - 0.2 * R, 0, c.y + 0.6 * R);
  shade.addColorStop(0, 'rgba(30,34,52,0)');
  shade.addColorStop(1, 'rgba(30,34,52,0.45)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = shade;
  ctx.fillRect(c.x - 2 * R, c.y - 2 * R, 4 * R, 4 * R);
  ctx.restore();
  ctx.lineWidth = 3.2 * z;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  trace(ctx, rock);
  ctx.stroke();
  // The hole: dark, deepest at its back.
  const hole = holeShape(k).map((p) => toScreen(view, p));
  const hc = toScreen(view, holeAt(k));
  const hg = ctx.createRadialGradient(hc.x, hc.y + 10 * z, 2, hc.x, hc.y, EEL_D * 1.25 * z);
  hg.addColorStop(0, '#05080f');
  hg.addColorStop(0.75, '#141b2a');
  hg.addColorStop(1, '#2b3140');
  trace(ctx, hole);
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.restore();
}

/** Clips to what of the eel shows outside its hole: the near side of a line part way in. */
export function clipOutsideHole(ctx: CanvasRenderingContext2D, view: View, k: number): void {
  const h = holeAt(k);
  const d = { x: Math.cos(h.heading), y: Math.sin(h.heading) };
  const at = { x: h.x + d.x * 22, y: h.y + d.y * 22 };
  const n = { x: -d.y * 5000, y: d.x * 5000 };
  const corners = [{ x: at.x + n.x, y: at.y + n.y }, { x: at.x + n.x - d.x * 5000, y: at.y + n.y - d.y * 5000 }, { x: at.x - n.x - d.x * 5000, y: at.y - n.y - d.y * 5000 }, { x: at.x - n.x, y: at.y - n.y }]
    .map((p) => toScreen(view, p));
  trace(ctx, corners);
  ctx.clip();
}

function branch(ctx: CanvasRenderingContext2D, from: Pt, angles: readonly number[], len: number, w: number): void {
  const pts: Pt[] = [from];
  angles.forEach((a) => {
    const p = pts[pts.length - 1]!;
    pts.push({ x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len });
  });
  const stroke = (width: number, color: string): void => {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  stroke(w + 4, INK);
  stroke(w, BRANCH.fill);
  stroke(w * 0.35, BRANCH.tip);
  const tip = pts[pts.length - 1]!;
  ctx.fillStyle = BRANCH.tip;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, w * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

/** Over the eel: the shade down inside the hole, its front lip, and the coral growing on top. */
export function drawOutcropFront(ctx: CanvasRenderingContext2D, view: View, k: number): void {
  const z = view.zoom;
  const hole = holeShape(k).map((p) => toScreen(view, p));
  const h = holeAt(k);
  const d = { x: Math.cos(h.heading), y: Math.sin(h.heading) };
  const near = toScreen(view, { x: h.x - d.x * EEL_D * 0.5, y: h.y - d.y * EEL_D * 0.5 });
  const far = toScreen(view, { x: h.x + d.x * EEL_D * 0.5, y: h.y + d.y * EEL_D * 0.5 });
  ctx.save();
  trace(ctx, hole);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(near.x, near.y, far.x, far.y);
  g.addColorStop(0, 'rgba(5,8,15,0)');
  g.addColorStop(0.6, 'rgba(5,8,15,0.3)');
  g.addColorStop(1, 'rgba(5,8,15,0.8)');
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(near.x, far.x) - 400, Math.min(near.y, far.y) - 400, 800 + Math.abs(far.x - near.x), 800 + Math.abs(far.y - near.y));
  ctx.restore();
  // The front lip: the half of the rim nearer the camera, lit along its edge.
  const front = hole.slice(0, 21);
  ctx.lineCap = 'round';
  ctx.strokeStyle = ROCK.lit;
  ctx.lineWidth = 7 * z;
  ctx.beginPath();
  front.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 4 * z) : ctx.moveTo(p.x, p.y + 4 * z)));
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6 * z;
  ctx.beginPath();
  front.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  // Coral on the rock's far top, away from the hole.
  const c = coralAt(k);
  const base = (dx: number, dy: number): Pt => toScreen(view, { x: c.x + dx * CORAL_R, y: c.y + dy * CORAL_R });
  const L = 24 * z;
  branch(ctx, base(-0.62, -0.62), [-2.0, -1.6, -2.3], L, 21 * z);
  branch(ctx, base(-0.45, -0.72), [-1.5, -1.1, -1.6], L * 1.15, 23 * z);
  branch(ctx, base(-0.3, -0.7), [-1.0, -1.4], L, 19 * z);
  const fan = base(-0.95, -0.42);
  ctx.translate(fan.x, fan.y);
  ctx.rotate(-0.5);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = FAN;
  ctx.beginPath();
  ctx.ellipse(0, -55 * z, 52 * z, 55 * z, 0, Math.PI, 0);
  ctx.lineTo(4 * z, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#5e2c6a';
  ctx.lineWidth = 1.4 * z;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * 30 * z, -55 * z + Math.sin(a) * 25 * z, Math.cos(a) * 50 * z, -55 * z + Math.sin(a) * 53 * z);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * z;
  ctx.beginPath();
  ctx.ellipse(0, -55 * z, 52 * z, 55 * z, 0, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}
