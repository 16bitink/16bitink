import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { seeded, spline } from '../../crabbird/art/paint';
import type { Backdrop } from '../../heroncrab/art/marsh';
import { dab, fillShape, inkLine, softLine } from '../../heroncrab/art/ink';

/**
 * A Central Park pond, painted once: a pale summer sky, Manhattan's towers
 * blue in the haze behind the park's trees, the trees' reflections in the
 * still green-grey pond, and the rocky near bank. The wide shots use it
 * sharp; the close-ups a soft, out-of-focus copy, so the heron stands out.
 */
interface ParkSpec {
  /** The far bank, where the trees meet the water. */
  readonly shore: number;
  readonly box: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly res: number;
  readonly seed: number;
  /** How tall the towers rise above the trees. */
  readonly towers: number;
}

function paintSky(ctx: CanvasRenderingContext2D, s: ParkSpec): void {
  const { box, shore } = s;
  const g = ctx.createLinearGradient(0, box.y, 0, shore);
  g.addColorStop(0, '#9cb8d2');
  g.addColorStop(0.6, '#cfdde6');
  g.addColorStop(1, '#efe9da');
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, shore - box.y + 10);
  const rnd = seeded(s.seed);
  for (let i = 0; i < 8; i++) dab(ctx, box.x + rnd() * box.w, box.y + (shore - box.y) * (0.15 + rnd() * 0.5), 150 + rnd() * 200, '255,253,247', 0.5, 0.25);
}

/** Midtown's towers: flat-topped slabs, stepped crowns and a spire or two, blue-grey and hazy. */
function paintTowers(ctx: CanvasRenderingContext2D, s: ParkSpec): void {
  const { box, shore, towers } = s;
  const rnd = seeded(s.seed + 2);
  const base = shore - 70;
  for (const layer of [0, 1]) {
    let x = box.x - 20;
    while (x < box.x + box.w) {
      const w = 40 + rnd() * 70;
      const h = towers * (layer === 0 ? 0.45 + rnd() * 0.6 : 0.25 + rnd() * 0.45);
      const top = base - h;
      const colour = layer === 0 ? '#9fb0c2' : '#8197ad';
      const shape: Pt[] = [{ x, y: base }, { x, y: top }];
      const crown = rnd();
      if (crown < 0.25) shape.push({ x: x + w * 0.2, y: top }, { x: x + w * 0.2, y: top - h * 0.08 }, { x: x + w * 0.8, y: top - h * 0.08 }, { x: x + w * 0.8, y: top });
      else if (crown < 0.4) shape.push({ x: x + w * 0.42, y: top }, { x: x + w * 0.5, y: top - h * 0.3 }, { x: x + w * 0.58, y: top });
      shape.push({ x: x + w, y: top + (crown > 0.85 ? w * 0.4 : 0) }, { x: x + w, y: base });
      fillShape(ctx, shape, colour, layer === 0 ? 0.75 : 0.9);
      // Faint rows of windows and a lit edge.
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#e8eef4';
      for (let y = top + 10; y < base - 6; y += 12) ctx.fillRect(x + 5, y, w - 10, 3);
      ctx.restore();
      softLine(ctx, [{ x: x + 3, y: top + 4 }, { x: x + 3, y: base }], 5, '#dfe7ee', 0.4, 2);
      x += w + 6 + rnd() * 40;
    }
  }
}

function paintTrees(ctx: CanvasRenderingContext2D, s: ParkSpec): void {
  const { box, shore } = s;
  const rnd = seeded(s.seed + 3);
  for (const [lift, colours] of [[120, ['#6f8a66', '#7f9a70', '#5d7756']], [60, ['#3f5a3c', '#4d6b45', '#2f4630']]] as const) {
    for (let x = box.x - 40; x < box.x + box.w + 60; x += 46 + rnd() * 30) {
      const r = 50 + rnd() * 50;
      const y = shore - lift * (0.6 + rnd() * 0.5);
      ctx.save();
      ctx.fillStyle = colours[Math.floor(rnd() * 3)]!;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      dab(ctx, x - r * 0.3, y - r * 0.4, r * 0.6, '200,214,160', 0.35);
    }
    ctx.save();
    ctx.fillStyle = colours[2];
    ctx.fillRect(box.x, shore - lift * 0.5, box.w, lift * 0.5 + 4);
    ctx.restore();
  }
}

function paintPond(ctx: CanvasRenderingContext2D, s: ParkSpec): void {
  const { box, shore } = s;
  const g = ctx.createLinearGradient(0, shore, 0, box.y + box.h);
  g.addColorStop(0, '#4f6650');
  g.addColorStop(0.15, '#6f8679');
  g.addColorStop(0.5, '#8ea29c');
  g.addColorStop(1, '#6f8684');
  ctx.fillStyle = g;
  ctx.fillRect(box.x, shore, box.w, box.y + box.h - shore);
  const rnd = seeded(s.seed + 4);
  // The trees' reflections, broken by ripples.
  for (let i = 0; i < 70; i++) {
    const x = box.x + rnd() * box.w;
    const y = shore + rnd() * 160;
    softLine(ctx, [{ x, y }, { x: x + 2, y: y + 30 + rnd() * 60 }], 18 + rnd() * 20, '#34493a', 0.25, 3);
  }
  for (let i = 0; i < 60; i++) {
    const y = shore + 20 + Math.pow(rnd(), 0.8) * (box.y + box.h - shore);
    const x = box.x + rnd() * box.w;
    const w = 60 + rnd() * 200;
    softLine(ctx, [{ x: x - w / 2, y }, { x: x + w / 2, y: y + 2 }], 2 + rnd() * 3, '#e6eee8', 0.35, 2);
  }
  softLine(ctx, [{ x: box.x, y: shore + 2 }, { x: box.x + box.w, y: shore + 2 }], 4, '#e8efe8', 0.5, 2);
}

function bakePark(s: ParkSpec): Backdrop {
  const { canvas, ctx } = makeCanvas(Math.ceil(s.box.w * s.res), Math.ceil(s.box.h * s.res));
  ctx.scale(s.res, s.res);
  ctx.translate(-s.box.x, -s.box.y);
  paintSky(ctx, s);
  paintTowers(ctx, s);
  // Haze over the city, thickest near the trees, so the towers stay a hint.
  const haze = ctx.createLinearGradient(0, s.shore - s.towers - 80, 0, s.shore - 60);
  haze.addColorStop(0, 'rgba(214,226,234,0.15)');
  haze.addColorStop(1, 'rgba(226,232,232,0.6)');
  ctx.fillStyle = haze;
  ctx.fillRect(s.box.x, s.box.y, s.box.w, s.shore - s.box.y);
  paintTrees(ctx, s);
  paintPond(ctx, s);
  return { canvas, ...s.box };
}

/** The wide pond, world px (the rest camera shows x 0..1080, y 0..1920). */
export const makeWidePark = (): Backdrop => bakePark({ shore: 760, box: { x: -400, y: -200, w: 1880, h: 2500 }, res: 1, seed: 31, towers: 330 });

/** The close-ups' pond, soft (baked small, drawn big), with the towers high behind the head. */
export function makeSoftPark(): Backdrop {
  const sharp = bakePark({ shore: 1060, box: { x: -80, y: -80, w: 1240, h: 2080 }, res: 0.16, seed: 37, towers: 470 });
  const { canvas, ctx } = makeCanvas(400, 672);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sharp.canvas, 0, 0, 400, 672);
  return { ...sharp, canvas };
}

/** The rocky near bank along the bottom of a wide shot, from `y` down. */
export function drawBank(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, boil: number): void {
  const rnd = seeded(77);
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 60) edge.push({ x, y: y + 18 * Math.sin(x * 0.013) + rnd() * 16 });
  const shape = [...spline(edge, 4), { x: x1, y: y + 900 }, { x: x0, y: y + 900 }];
  const g = ctx.createLinearGradient(0, y - 20, 0, y + 300);
  g.addColorStop(0, '#9a9a84');
  g.addColorStop(0.12, '#6f7a5a');
  g.addColorStop(0.5, '#56603f');
  g.addColorStop(1, '#3d4630');
  fillShape(ctx, shape, g);
  for (let i = 0; i < 9; i++) {
    const x = x0 + ((i + 0.5) / 9) * (x1 - x0);
    dab(ctx, x, y + 40 + rnd() * 50, 60 + rnd() * 40, '170,160,140', 0.35, 0.5);
  }
  inkLine(ctx, spline(edge, 4), 1.8, 0.7, boil);
}
