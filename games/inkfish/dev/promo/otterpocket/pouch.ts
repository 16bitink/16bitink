import { type Pen, type Pt } from '../../../src/art/pen';
import { smoothLoop } from '../seal/art/paint';
import { dab, through } from './brush';
import { drawStone } from './props';

/**
 * The pouch: a loose fold of the otter's own skin that bulges out of the
 * body under a raised arm. It's painted as part of the body (otter.ts lays the
 * same wash and fur over the body and the fold together, and inks only their
 * shared outer edge), so here are just its shape, the outline runs, and its
 * opening: a soft crease near the armpit, the dark gap inside, the stone
 * peeking out, and the fold's lower lip repainted over the stone.
 */

/** The fold's outline for one side (`s` = 1 right, -1 left), grown out of the body by `shown` (0 tucked in .. 1 full). */
export function foldOf(s: number, shown: number): Pt[] {
  const full: readonly Pt[] = [
    { x: 176, y: -258 }, { x: 250, y: -250 }, { x: 318, y: -206 }, { x: 352, y: -132 }, { x: 350, y: -62 },
    { x: 318, y: 0 }, { x: 262, y: 26 }, { x: 200, y: 14 }, { x: 170, y: -120 },
  ];
  return smoothLoop(full.map((p) => ({ x: s * (190 + (p.x - 190) * shown), y: p.y })), 6);
}

/** The crease where the fold opens, armpit end first (local units). */
export function creaseOf(s: number): Pt[] {
  return through({ x: s * 228, y: -184 }, { x: s * 292, y: -156 }, { x: s * 346, y: -102 }, 12);
}

/** Whether `p` is inside the closed polygon `poly`. */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

const area = (poly: readonly Pt[]): number => poly.reduce((s, p, i) => {
  const q = poly[(i + 1) % poly.length]!;
  return s + p.x * q.y - q.x * p.y;
}, 0);

/** One path that is the union of the shapes (all wound the same way, so the overlaps stay filled). */
export function unionPath(ctx: CanvasRenderingContext2D, shapes: readonly (readonly Pt[])[]): void {
  ctx.beginPath();
  for (const shape of shapes) {
    const pts = area(shape) < 0 ? [...shape].reverse() : shape;
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
}

/** Inks the outer edge of the union: each shape's outline where it isn't inside another shape. */
export function inkUnion(pen: Pen, shapes: readonly (readonly Pt[])[], width: number): void {
  shapes.forEach((shape, k) => {
    const others = shapes.filter((_, j) => j !== k);
    const out = (p: Pt): boolean => !others.some((o) => inside(o, p));
    // Start the walk at an outside point so runs don't split across the seam.
    const start = shape.findIndex(out);
    if (start < 0) return;
    let run: Pt[] = [];
    for (let i = 0; i <= shape.length; i++) {
      const p = shape[(start + i) % shape.length]!;
      if (out(p)) run.push(p);
      else {
        if (run.length > 1) pen.stroke(run, width);
        run = [];
      }
    }
    if (run.length > 1) pen.stroke(run, width);
  });
}

/**
 * The fold's opening: a dark gap along the crease (soft, as skin parts, not a
 * hole cut in a shell), the stone sitting in it, then `lip` repaints the
 * fold below the crease over the stone, and a soft crease line and a light
 * along the lip's edge.
 */
export function drawOpening(
  ctx: CanvasRenderingContext2D, pen: Pen, lw: number, s: number, fold: readonly Pt[], open: number, stone: number, lift: number,
  lip: (clip: () => void) => void,
): void {
  const crease = creaseOf(s);
  const mid = crease[6]!;
  const dir = Math.atan2(crease[12]!.y - crease[0]!.y, crease[12]!.x - crease[0]!.x);
  // Out of the pocket: perpendicular to the crease, away from the fold's lower lip (up and outwards).
  const up = s > 0 ? { x: Math.sin(dir), y: -Math.cos(dir) } : { x: -Math.sin(dir), y: Math.cos(dir) };
  ctx.save();
  unionPath(ctx, [fold]);
  ctx.clip();
  ctx.translate(mid.x, mid.y);
  ctx.rotate(dir);
  ctx.scale(1, 0.3 + 0.45 * open);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 84);
  g.addColorStop(0, 'rgba(14,8,5,0.95)');
  g.addColorStop(0.6, 'rgba(20,12,8,0.75)');
  g.addColorStop(1, 'rgba(30,18,12,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-90, -90, 180, 180);
  ctx.restore();
  if (stone > 0.01) {
    const c = { x: mid.x + up.x * (6 + 80 * lift), y: mid.y + up.y * (6 + 80 * lift) };
    drawStone(ctx, pen, c, 52, dir * 0.3, stone);
  }
  // The lower lip: the fold below the crease, over the bottom of the stone.
  const below = [...crease, { x: s * 420, y: -40 }, { x: s * 420, y: 120 }, { x: s * 120, y: 120 }, { x: s * 120, y: -232 }];
  lip(() => {
    unionPath(ctx, [fold]);
    ctx.clip();
    unionPath(ctx, [below]);
    ctx.clip();
  });
  // A soft shadow just under the lip, then the crease itself in fine ink and a light along its edge.
  ctx.save();
  unionPath(ctx, [fold]);
  ctx.clip();
  for (const p of crease.filter((_, i) => i % 3 === 0)) dab(ctx, p.x - up.x * 14, p.y - up.y * 14, 22, '20,12,8', 0.22);
  // The fold's own volume: lit along the lip, shaded where it hangs.
  dab(ctx, s * 300, -118, 60, '206,168,124', 0.22);
  dab(ctx, s * 320, -10, 90, '18,10,6', 0.35);
  ctx.restore();
  const lipLine = crease.map((p, i) => ({ x: p.x - up.x * (2 + 8 * open * Math.sin((i / 12) * Math.PI)), y: p.y - up.y * (2 + 8 * open * Math.sin((i / 12) * Math.PI)) }));
  pen.stroke(lipLine, 2.8 * lw, '#140c08', 0.9, false);
  pen.hair(lipLine.slice(1, -1).map((p) => ({ x: p.x - up.x * 4, y: p.y - up.y * 4 })), 2.6 * lw, '#e0c096', 0.6);
}
