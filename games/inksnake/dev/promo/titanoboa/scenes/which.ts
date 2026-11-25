import { VIDEO } from '../../short';
import type { Light, Painter } from '../gl/engine';
import { type Camera, chain, move, rotX, rotY, scale, type V3 } from '../gl/math';
import { ball, join, MAT } from '../gl/mesh';
import { boaOn, headMesh, tongueMesh } from '../models/boa';
import { crocMesh } from '../models/croc';
import { fishMesh } from '../models/fish';
import { blob, tone, vertical } from './backs';

/** "Crocs or fish?": the head dead ahead in the dark, a crocodile on one plate, a lungfish on the other, its eyes going from one to the other. */
const LIGHT: Light = {
  dir: [-0.25, 0.8, 0.7], key: '#fff2cc', keyK: 1.0, sky: '#4c5a52', ground: '#26261c', rim: '#a8e6b0', rimK: 1.1, rimDir: [0, 0.6, -0.7],
};
const CAMERA: Camera = { eye: [0, 0.95, 6.2], at: [0, 0.62, 0], f: 2700, cx: 540, cy: 1010 };
const PLATE = join(
  ball([0, 0, 0], [0.43, 0.035, 0.34], { mat: MAT.gloss, col: '#d9d4c6', n: 28 }),
  ball([0, 0.03, 0], [0.33, 0.02, 0.25], { mat: MAT.gloss, col: '#f4efe0', n: 28 }),
);

export interface WhichPose {
  readonly t: number;
  readonly up: number;
  readonly croc: number;
  readonly fish: number;
  readonly glance: number;
  readonly lick: number;
}

export function drawWhich(ctx: CanvasRenderingContext2D, p: Painter, o: WhichPose, boil: number): void {
  vertical(ctx, 0, VIDEO.height, [[0, '#070b0a'], [0.45, '#17241d'], [0.6, '#24362a'], [0.62, '#15201a'], [1, '#060908']]);
  blob(ctx, 540, 780, 760, 760, tone(190, 215, 140), 0.3);
  const y = -1.6 + 2.62 * o.up + 0.02 * Math.sin(o.t * 3);
  const gx = o.glance;
  const path: V3[] = [[0.06 * gx, y, -0.55], [0.03 * gx, y - 0.02, -1.0], [-0.08, y - 0.28, -1.5], [0.02, y - 1.0, -1.75], [0.3, y - 1.9, -1.6], [0.5, y - 3.2, -1.5], [0.5, y - 5, -1.5]];
  const boa = boaOn(path, 1.95, { girth: 0.62, neck: 0.44, reach: 4.6, endless: true, rings: 110, sides: 40, face: [0.4 * gx, -0.02, 1], roll: 0.07 * gx });
  const look = [0.25, 0.22 * gx] as const;
  const hop = (k: number): number => -1.4 * (1 - k);
  const scene = {
    camera: CAMERA, light: LIGHT, boil,
    items: [
      { mesh: boa.body }, { mesh: headMesh(0), model: boa.head, look },
      ...(o.lick > 0.02 ? [{ mesh: tongueMesh(o.lick * 0.5, -1), model: boa.head }] : []),
      ...(o.croc > 0.01 ? [
        { mesh: PLATE, model: move(-0.47, 0.33 + hop(o.croc), 1.4) },
        { mesh: crocMesh({ gape: 0.1 + 0.05 * Math.sin(o.t * 20), swing: 0.42 + 0.05 * Math.sin(o.t * 24), lift: 0.2 }), model: chain(move(-0.43 + 0.005 * Math.sin(o.t * 60), 0.37 + hop(o.croc), 1.4), rotY(-0.76), scale(0.59)), look: [0.1, 0.35] as const },
      ] : []),
      ...(o.fish > 0.01 ? [
        { mesh: PLATE, model: move(0.47, 0.33 + hop(o.fish), 1.4) },
        { mesh: fishMesh(o.t * 12), model: chain(move(0.46, 0.57 + hop(o.fish) + 0.03 * Math.abs(Math.sin(o.t * 8)), 1.46), rotY(Math.PI + 0.55), rotX(0.1 * Math.sin(o.t * 12)), scale(0.92)) },
      ] : []),
    ],
  };
  ctx.drawImage(p.paint(scene), 0, 0);
}
