import { mix } from '../../../../src/art/wash';
import { VIDEO } from '../../short';
import type { Light, Painter } from '../gl/engine';
import { add, type Camera, even, lerp3, project, spline3, type V3 } from '../gl/math';
import { grid, MAT } from '../gl/mesh';
import { boaOn, headMesh, tongueMesh } from '../models/boa';
import { blob, tone, vertical } from './backs';

/**
 * "Titanoboa.": its head low over the swamp floor, close and side on; then
 * the camera flies up and out to the whole snake lying in its curves, and a
 * measuring tape runs along its back from the neck to the tail's tip.
 */
const LIGHT: Light = {
  dir: [-0.45, 0.85, 0.35], key: '#fff3d4', keyK: 1.05, sky: '#8a9c96', ground: '#4a4a34', rim: '#f2ffe0', rimK: 1.7, rimDir: [0.45, 0.75, -0.5],
  fog: '#16221f', fogFrom: 5, fogTo: 26,
};
const FLOOR = grid(2, 2, (u, v) => ({ p: [(u - 0.5) * 90, 0, (v - 0.5) * 90] }), { mat: MAT.swamp });

/** The whole body from the head: a path laid in three wide curves, 12.8 m with the head. */
const PATH: readonly V3[] = [
  [0.55, 0.5, 1.5], [0.9, 0.42, 1.36], [1.5, 0.38, 1.1], [2.05, 0.38, 0.45], [1.9, 0.38, -0.35], [1.1, 0.38, -0.75], [0, 0.38, -0.7], [-1.1, 0.38, -0.75],
  [-1.9, 0.38, -1.3], [-1.95, 0.36, -2.2], [-1.2, 0.34, -2.75], [0, 0.3, -2.75], [1.1, 0.24, -2.9], [1.75, 0.18, -3.5], [1.6, 0.1, -4.3], [0.8, 0.06, -4.7],
];
const REACH = 11.8;

function cameraAt(rise: number, t: number): Camera {
  const near: Camera = { eye: [-0.75 + 0.1 * t, 0.66, 3.75 - 0.14 * t], at: [-0.02, 0.5, 1.3], f: 1560, cx: 540, cy: 860 };
  const far: Camera = { eye: [0, 11.5, 5.6], at: [0.05, 0, -1.25], f: 2720, cx: 540, cy: 965 };
  const k = rise;
  return { eye: lerp3(near.eye, far.eye, k), at: lerp3(near.at, far.at, k), f: near.f + (far.f - near.f) * k, cx: near.cx + (far.cx - near.cx) * k, cy: near.cy + (far.cy - near.cy) * k };
}

export interface RiverPose {
  readonly t: number;
  readonly rise: number;
  readonly tape: number;
}

export function drawRiver(ctx: CanvasRenderingContext2D, p: Painter, o: RiverPose, boil: number): void {
  const camera = cameraAt(o.rise, o.t);
  const sway = Math.sin(o.t * 2.2) * 0.06;
  const turnHead = 1 - o.rise;
  const path: readonly V3[] = [[0.28, 0.5 + 0.05 * turnHead, 1.62 + sway], ...PATH];
  const boa = boaOn(path, 1.0, { girth: 0.38, neck: 0.23, reach: REACH, rings: 260, face: [-1, 0.02 + 0.05 * Math.sin(o.t * 1.7), 0.35 + 0.3 * turnHead + sway] });
  vertical(ctx, 0, 1200, [[0, '#0a1213'], [0.55, '#16221f'], [1, '#1c2a24']]);
  ctx.fillStyle = '#16221f';
  ctx.fillRect(0, 1100, VIDEO.width, VIDEO.height - 1100);
  const mist = Math.max(0, 1 - o.rise * 1.6);
  if (mist > 0) {
    for (const [x, y, rx, ry, a] of [[300, 560, 700, 240, 0.28], [860, 420, 560, 300, 0.22]] as const) blob(ctx, x, y, rx, ry, tone(150, 190, 170), a * mist);
    // Trunks standing in the mist.
    for (const [x, w, a] of [[90, 70, 0.75], [330, 44, 0.5], [640, 58, 0.55], [960, 92, 0.8]] as const) {
      const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, 'rgba(6,12,11,0)');
      g.addColorStop(0.25, `rgba(8,15,13,${a * mist})`);
      g.addColorStop(0.7, `rgba(5,9,8,${a * mist})`);
      g.addColorStop(1, 'rgba(6,12,11,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - w * 0.6, 0);
      ctx.quadraticCurveTo(x - w * 0.4, 600, x - w * 1.1, 860);
      ctx.lineTo(x + w * 1.1, 860);
      ctx.quadraticCurveTo(x + w * 0.5, 600, x + w * 0.7, 0);
      ctx.fill();
    }
  }
  const items = [{ mesh: boa.body }, { mesh: headMesh(0), model: boa.head }, { mesh: tongueMesh(Math.max(0, Math.sin(o.t * 7.5)) * 0.9, Math.sin(o.t * 31)), model: boa.head }];
  const base = { camera, light: LIGHT, boil, ground: 0.01 };
  // The ground has no rim, and is dim while we are down by the head.
  const floor: Light = { ...LIGHT, rimK: 0, keyK: 0.34 + 0.62 * o.rise, sky: mix('#3c4844', '#8a9c96', o.rise), ground: '#2c2e22' };
  ctx.drawImage(p.paint({ ...base, light: floor, items: [{ mesh: FLOOR }] }), 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.drawImage(p.shadows({ ...base, items }), 0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  ctx.drawImage(p.paint({ ...base, items }), 0, 0);
  drawTape(ctx, camera, path, o.tape);
}

/** A tape along the whole snake, from the snout down the back to the tail, a tick each metre. */
function drawTape(ctx: CanvasRenderingContext2D, camera: Camera, path: readonly V3[], k: number): void {
  if (k <= 0) return;
  const snout: V3 = [path[0]![0] - 0.95, 0.62, path[0]![2] + 0.33];
  const line = [...even([snout, path[0]!], 12).pts, ...even(spline3(path, 14), 160, REACH).pts.slice(1)].map((q, i, all) => project(camera, add(q, [0, i < 12 ? 0.2 : 0.4 * Math.min(1, (all.length - i) / 60), 0])));
  const s = [0];
  for (let i = 1; i < line.length; i++) s.push(s[i - 1]! + Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y));
  const upto = s[s.length - 1]! * k;
  const run = line.filter((_, i) => s[i]! <= upto);
  const stroke = (w: number, c: string): void => {
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    ctx.beginPath();
    run.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  stroke(26, '#14110a');
  stroke(18, '#f4c53c');
  ctx.strokeStyle = '#14110a';
  ctx.lineWidth = 4;
  const step = s[s.length - 1]! / 42;
  for (let m = 1; m * step < upto; m++) {
    const i = s.findIndex((d) => d >= m * step);
    const [a, b] = [line[i - 1]!, line[i]!];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const [nx, ny] = [-(b.y - a.y) / d, (b.x - a.x) / d];
    const h = m % 7 === 0 ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(b.x - nx * h, b.y - ny * h);
    ctx.lineTo(b.x + nx * h, b.y + ny * h);
    ctx.stroke();
  }
  ctx.restore();
}
