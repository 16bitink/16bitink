import { lerp, VIDEO } from '../../short';
import type { Item, Light, Painter } from '../gl/engine';
import { type Camera, chain, lerp3, move, rotX, rotY, rotZ, scale } from '../gl/math';
import { brushMesh } from '../models/props';
import { fishMesh } from '../models/fish';
import { sandMesh, skullMesh, slabMesh } from '../models/skull';

/** A skull in its slab of sandstone: a brush sweeps the sand off, we push in on the teeth, a lungfish noses in before the jaws. */
const LIGHT: Light = {
  dir: [-0.55, 0.65, 0.55], key: '#fff0c8', keyK: 1.0, sky: '#8a7458', ground: '#4a3620', rim: '#ffe6b0', rimK: 0.3, rimDir: [-0.6, 0.6, 0],
};
const SKULL = skullMesh();
const SLAB = slabMesh();
const BRUSH = brushMesh();

export interface DigPose {
  readonly t: number;
  readonly swept: number;
  readonly brushOff: number;
  readonly push: number;
  readonly fish: number;
}

export function drawDig(ctx: CanvasRenderingContext2D, p: Painter, o: DigPose, boil: number): void {
  const far = { eye: [0.02, -0.25, 5.2], at: [0.02, 0.02, 0] } as const;
  const near = { eye: [0.42, -0.15, 3.5], at: [0.42, 0.0, 0] } as const;
  const camera: Camera = { eye: lerp3(far.eye, near.eye, o.push), at: lerp3(far.at, near.at, o.push), f: 2560, cx: 540, cy: 900 };
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const sand = -1.3 + 2.7 * o.swept;
  const stroke = Math.sin(o.t * 26);
  const items: Item[] = [{ mesh: SLAB, model: move(0, 0, -0.17) }, { mesh: SKULL }];
  if (o.swept < 0.97) items.push({ mesh: sandMesh(o.swept) });
  if (o.brushOff < 1) {
    items.push({ mesh: BRUSH, model: chain(move(sand + 0.06 + o.brushOff * 1.2, -0.15 + 0.22 * stroke + o.brushOff * 0.6, 0.3 + o.brushOff), rotZ(-0.75 + 0.12 * stroke), rotX(0.5), scale(1.15)) });
  }
  if (o.fish > 0) {
    items.push({ mesh: fishMesh(o.t * 13), model: chain(move(lerp(2.3, 0.86, o.fish), -0.02 + 0.03 * Math.sin(o.t * 6), 0.62), rotY(Math.PI + 0.25), rotZ(0.05 * Math.sin(o.t * 9)), scale(1.02)) });
  }
  ctx.drawImage(p.paint({ camera, light: LIGHT, boil, items, outer: 2.2 }), 0, 0);
  if (o.brushOff < 1) dust(ctx, o, sand);
}

/** Sand flying off the brush. */
function dust(ctx: CanvasRenderingContext2D, o: DigPose, sand: number): void {
  const x0 = 540 + (sand + 0.1) * 490;
  ctx.save();
  for (let i = 0; i < 60; i++) {
    const k = (o.t * 2.6 + i * 0.137) % 1;
    const a = -0.9 + ((i * 47) % 100) / 70;
    const x = x0 + Math.cos(a) * k * 260;
    const y = 960 + (((i * 31) % 100) - 50) * 3 + Math.sin(a) * k * 220 + 160 * k * k;
    ctx.globalAlpha = (1 - k) * 0.8 * (1 - o.brushOff);
    ctx.fillStyle = i % 3 ? '#e6c084' : '#7a5228';
    ctx.beginPath();
    ctx.arc(x, y, 3 + ((i * 13) % 7), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
