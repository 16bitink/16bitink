import { VIDEO } from '../../short';
import type { Light, Painter } from '../gl/engine';
import { type Camera, chain, move, rotY, rotZ, type V3 } from '../gl/math';
import { slab, MAT } from '../gl/mesh';
import { boaOn, headMesh, tongueMesh } from '../models/boa';
import { carMesh, pivotMesh, standMesh } from '../models/props';
import { blob, tone, vertical } from './backs';

/** A seesaw on a dark stage: a small car one side, the whole snake coiled on the other, level. */
const LIGHT: Light = {
  dir: [-0.35, 0.8, 0.6], key: '#fff1d6', keyK: 0.98, sky: '#4f5a78', ground: '#33303c', rim: '#8fb4ff', rimK: 1, rimDir: [0.6, 0.4, -0.6],
};
const CAMERA: Camera = { eye: [0, 2.35, 13], at: [0, 1.75, 0], f: 2010, cx: 540, cy: 1000 };
const HALF = 3.4;
const PIVOT = 1.25;
const CAR = carMesh();
const PLANK = slab([[-HALF, 0], [HALF, 0], [HALF, 0.2], [-HALF, 0.2]], -1.05, 1.05, { mat: MAT.gloss, col: '#8a5a2c' });
const HINGE = pivotMesh();
const STAND = standMesh(PIVOT);

/** The coil: three rings one on another, the head resting over the top, 12.8 m in all. */
function coil(bob: number): V3[] {
  const c = 1.95;
  const out: V3[] = [];
  const turns = 2.12;
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const a = 0.1 - k * Math.PI * 2 * turns;
    const r = 0.6 + 0.36 * Math.min(1, k * 1.9);
    // Lying on the plank at the bottom, as high as it is thick there.
    const floor = 0.32 - 0.2 * Math.max(0, (k - 0.78) / 0.22);
    out.push([c + Math.cos(a) * r, floor + 0.98 * Math.max(0, 1 - k * 1.55) ** 0.9 + bob * (1 - k), Math.sin(a) * r * 0.9]);
  }
  return [[c - 0.58, 2.4 + bob, 0.78], [c - 0.18, 2.36 + bob, 0.7], [c + 0.32, 2.12 + bob, 0.5], [c + 0.56, 1.74 + bob, 0.25], ...out];
}

export interface SeesawPose {
  readonly t: number;
  readonly tilt: number;
  readonly thud: number;
}

export function drawSeesaw(ctx: CanvasRenderingContext2D, p: Painter, o: SeesawPose, boil: number): void {
  vertical(ctx, 0, VIDEO.height, [[0, '#131a30'], [0.5, '#2a365a'], [0.66, '#3b4569'], [0.665, '#2b2a3c'], [0.8, '#1b1a28'], [1, '#100f19']]);
  blob(ctx, 540, 860, 820, 760, tone(170, 190, 240), 0.32);
  blob(ctx, 540, 1390, 620, 120, tone(200, 200, 230), 0.2);
  const tip = chain(move(0, PIVOT, 0), rotZ(o.tilt));
  const bob = -0.05 * o.thud;
  const boa = boaOn(coil(0.03 * Math.sin(o.t * 5) + bob), 0.86, { girth: 0.35, neck: 0.2, reach: 11.9, rings: 260, sides: 30, face: [-1, -0.08 + 0.06 * Math.sin(o.t * 3), 0.55] });
  const at = tip;
  const scene = {
    camera: CAMERA, light: LIGHT, boil, ground: 0.01,
    items: [
      { mesh: STAND }, { mesh: HINGE, model: tip }, { mesh: PLANK, model: tip },
      { mesh: CAR, model: chain(tip, move(-1.58, 0.2 + bob, 0), rotY(0.3)) },
      { mesh: boa.body, model: chain(at, move(0, 0.2, 0)) },
      { mesh: headMesh(0), model: chain(at, move(0, 0.2, 0), boa.head) },
      { mesh: tongueMesh(Math.max(0, Math.sin(o.t * 6)), Math.sin(o.t * 30)), model: chain(at, move(0, 0.2, 0), boa.head) },
    ],
  };
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.drawImage(p.shadows(scene), 0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  ctx.drawImage(p.paint(scene), 0, 0);
}
