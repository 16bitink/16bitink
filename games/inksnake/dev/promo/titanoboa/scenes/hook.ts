import { lerp, VIDEO } from '../../short';
import type { Light, Painter, Scene } from '../gl/engine';
import { add, basis, type Camera, chain, move, mul, project, scale, type V3 } from '../gl/math';
import { boaOn, headMesh, tongueMesh } from '../models/boa';
import { BUS_LEN, busMesh } from '../models/bus';
import type { HookPose } from '../story';
import { blob, drawDusk, tone } from './backs';

/**
 * Frame 1: a school bus at dusk, three-quarters on, right across the frame,
 * and Titanoboa laid out on the road along it: the tail's tip at the bus's
 * back bumper, the neck at its front one, then the neck rises and the head
 * comes round to us low over the road, jaws shut, the tongue flicking.
 * Everything is in metres: the bus a full-size 39 ft (11.9 m), the snake cut
 * to exactly 42 ft (12.8 m), the difference going into the raised neck.
 */
const K = 0.93;
const LEN = BUS_LEN * K;
const THETA = 0.9;
const AHEAD: V3 = [Math.sin(THETA), 0, Math.cos(THETA)];
const SIDE: V3 = [-Math.cos(THETA), 0, Math.sin(THETA)];
/** The near bottom corner of the bus's nose. */
const NOSE: V3 = [2.72, 0, -5.75];
const BUS_AT = add(NOSE, mul(SIDE, -1.2 * K));
const BUS = chain(basis(AHEAD, [0, 1, 0], SIDE, BUS_AT), scale(K), move(-BUS_LEN, 0, 0));
/** A place on the road by the bus: `x` metres from its back bumper, `off` metres out from its side. */
const by = (x: number, off: number, y: number): V3 => add(add(add(NOSE, mul(AHEAD, x - LEN)), mul(SIDE, off)), [0, y, 0]);
const HEAD = 1.08;

const LIGHT: Light = {
  dir: [-0.3, 0.75, 0.75], key: '#ffdcae', keyK: 1.05, sky: '#7a6c94', ground: '#6a4a44', rim: '#ffae66', rimK: 1.5, rimDir: [0.35, 0.6, -0.75], glow: 1,
  fog: '#5a3450', fogFrom: 9, fogTo: 44,
};

function hookCamera(u: number, kick: number): Camera {
  const push = 0.1 * (u + 0.9) + 0.1 * kick;
  return { eye: [0.02 * u, 2.75, 0.3 - push], at: [0.02 * u, 2.75, -10], f: 1000, cx: 540, cy: 655 };
}

function hookScene(u: number, pose: HookPose, boil: number, bus: ReturnType<typeof busMesh>): Scene {
  const s = pose.sway;
  const breathe = 0.02 * Math.sin(u * 2.1);
  const head: V3 = [0.78 + 0.03 * s, 1.3 + breathe, -2.44];
  const boa = boaOn([
    head, [1.08 + 0.02 * s, 1.31 + breathe, -2.74], [1.5, 1.36, -3.4], [1.82, 1.18, -4.15], [1.93, 0.74, -4.8], by(11.2, 1.1, 0.45), by(10.4, 1.3, 0.4), by(9.2, 1.5, 0.39), by(7.8, 1.4, 0.39),
    by(6.3, 1.1, 0.38), by(4.8, 1.05, 0.36), by(3.3, 1.4, 0.3), by(1.9, 1.5, 0.2), by(0.7, 1.15, 0.1), by(-0.6, 0.9, 0.06), by(-2, 0.8, 0.05),
  ], HEAD, { girth: 0.41, neck: 0.23, reach: 12.8 - HEAD * 0.9, rings: 260, sides: 44, face: [-1, 0.26 + 0.02 * s, 0.82 + 0.08 * s], roll: 0.02 + 0.02 * s });
  return {
    camera: hookCamera(u, pose.kick), boil, light: LIGHT, ground: 0.01,
    items: [
      { mesh: bus, model: BUS },
      { mesh: boa.body },
      { mesh: headMesh(pose.gape), model: boa.head, look: [0.12, 0] as const },
      ...(pose.tongue > 0.02 ? [{ mesh: tongueMesh(pose.tongue * 0.72, -0.6 + 0.9 * Math.sin(u * 24)), model: boa.head }] : []),
    ],
  };
}

/** A pool of warm light on the road. */
function pool(ctx: CanvasRenderingContext2D, c: Camera, at: V3, rx: number, rz: number, a: number): void {
  const q = project(c, at);
  blob(ctx, q.x, q.y, rx * q.k, rz * q.k * 0.5, tone(255, 196, 120), a);
}

/** The road's broken white line, along the bus. */
function lane(ctx: CanvasRenderingContext2D, c: Camera): void {
  ctx.save();
  ctx.fillStyle = 'rgba(250,226,196,0.5)';
  for (let x = -24; x < 16; x += 3.4) {
    const corners = [[x, 3.7], [x + 1.9, 3.7], [x + 1.9, 3.9], [x, 3.9]].map(([a, o]) => by(a!, o!, 0));
    if (corners.some((q) => q[2] > -1.1)) continue;
    ctx.beginPath();
    corners.forEach((q, i) => {
      const t = project(c, q);
      if (i === 0) ctx.moveTo(t.x, t.y);
      else ctx.lineTo(t.x, t.y);
    });
    ctx.fill();
  }
  ctx.restore();
}

let bus: ReturnType<typeof busMesh> | null = null;

export function drawHook(ctx: CanvasRenderingContext2D, p: Painter, u: number, pose: HookPose, boil: number): void {
  bus ??= busMesh();
  const s = hookScene(u, pose, boil, bus);
  drawDusk(ctx, project(s.camera, [0, 2.75, -1000]).y);
  // The bus's windows and the sky light the road along it; the headlights the road in front.
  for (const [x, off, rx, rz, a] of [[2, 1.6, 4, 3.4, 0.2], [6, 2.0, 4.2, 4, 0.24], [10, 2.6, 4, 5, 0.26], [12.8, 1.6, 3, 4.6, 0.4]] as const) pool(ctx, s.camera, by(x, off, 0), rx, rz, a);
  lane(ctx, s.camera);
  ctx.save();
  ctx.globalAlpha = 0.66;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(p.shadows({ ...s, light: { ...s.light, dir: [0.1, 1, -0.22] } }), 0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  ctx.drawImage(p.paint(s), 0, 0);
  for (const z of [0.8, -0.8]) {
    const c = project(s.camera, add(add(BUS_AT, mul(SIDE, z * K)), add(mul(AHEAD, 0.05), [0, 1.06 * K, 0])));
    const r = lerp(0.9, 1.2, pose.kick) * c.k;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    g.addColorStop(0, 'rgba(255,240,190,0.85)');
    g.addColorStop(0.18, 'rgba(255,220,140,0.35)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + 0.4 * pose.kick;
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    ctx.restore();
  }
}
