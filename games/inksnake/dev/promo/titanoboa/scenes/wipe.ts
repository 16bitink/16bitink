import { VIDEO } from '../../short';
import type { Light, Painter } from '../gl/engine';
import { type Camera, project, spline3, type V3 } from '../gl/math';
import { MAT, tube } from '../gl/mesh';

/**
 * The loop's last second: the snake's body slides past close to the camera,
 * from left to right, scale by scale; what was there before lies ahead of
 * it, frame 1 comes up behind it.
 */
const LIGHT: Light = {
  dir: [-0.4, 0.7, 0.6], key: '#ffe9c8', keyK: 0.95, sky: '#4a5070', ground: '#2c2824', rim: '#ffb070', rimK: 0.8, rimDir: [-0.7, 0.3, -0.5],
};
const CAMERA: Camera = { eye: [0, 0, 10], at: [0, 0, 0], f: 2000, cx: 540, cy: 960 };
const RADIUS = 2.15;

export function drawWipe(ctx: CanvasRenderingContext2D, p: Painter, k: number, boil: number, after: () => void): void {
  const x = -5.6 + 11.4 * k;
  const path: V3[] = spline3([[x - 0.9, 9, 0], [x - 0.1, 4.5, 0], [x + 0.35, 1.2, 0], [x - 0.2, -2.2, 0], [x - 0.9, -5.6, 0], [x - 1.2, -9, 0]], 16);
  // Behind the body: frame 1.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, -10);
  for (const q of path) {
    const s = project(CAMERA, q);
    ctx.lineTo(s.x, s.y);
  }
  ctx.lineTo(-10, VIDEO.height + 10);
  ctx.closePath();
  ctx.clip();
  after();
  ctx.restore();
  const body = tube(path, () => RADIUS, { mat: MAT.boa, sides: 64, up: [0.55, 0, 0.83], level: 0.3, u0: k * 3.4 });
  ctx.drawImage(p.paint({ camera: CAMERA, light: LIGHT, boil, items: [{ mesh: body }], outer: 4 }), 0, 0);
}
