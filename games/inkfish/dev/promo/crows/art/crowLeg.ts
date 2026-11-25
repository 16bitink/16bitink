import { type Pt } from '../../../../src/art/pen';
import { rngOf } from '../../otterpocket/brush';
import { curve, softLine, taper } from '../../seal/art/paint';
import { type CrowPose } from './crow';
import { band, fillShape, inkLine, linear, spline } from './ink';

/** The crow's legs: a shaggy feathered thigh, the heel joint bending back, a black scaled shank, three toes ahead and one behind, each clawed. */

const DARK = '#17171e';
const LIT = '#767c92';

function toe(ctx: CanvasRenderingContext2D, root: Pt, tip: Pt, w: number, far: boolean, boil: number): void {
  const d = { x: tip.x - root.x, y: tip.y - root.y };
  const len = Math.hypot(d.x, d.y);
  // Two knuckles along the toe: it arches a little, then lies on the ground.
  const spine = spline([root, { x: root.x + d.x * 0.35, y: root.y + d.y * 0.35 - 7 }, { x: root.x + d.x * 0.7, y: root.y + d.y * 0.7 - 4 }, tip], 5);
  const shape = band(spine, (u) => w * (1 - 0.32 * u) * (1 + 0.16 * Math.cos(u * Math.PI * 6)));
  fillShape(ctx, shape, far ? '#1c1c24' : linear(ctx, 0, root.y - 10, 0, root.y + 12, [[0, '#565b6e'], [0.4, '#2a2b35'], [1, '#121217']]));
  if (!far) softLine(ctx, spine.map((q) => ({ x: q.x, y: q.y - w * 0.24 })), 3, LIT, 0.8, 2);
  inkLine(ctx, shape, 1.3, 0.9, boil, true, '#08080c');
  // The claw, hooked down.
  const s = Math.sign(d.x) || 1;
  const c = curve({ x: tip.x - s * 2, y: tip.y - 3 }, { x: tip.x + s * len * 0.26, y: tip.y - 9 }, { x: tip.x + s * len * 0.36, y: tip.y + 7 }, 7);
  taper(ctx, c, w * 0.62, 0.8, '#0c0c11', 1);
  if (!far) softLine(ctx, c.slice(0, 4).map((q) => ({ x: q.x, y: q.y - 1.5 })), 1.6, '#8d93a8', 0.7, 1);
}

/** One leg from its hip (level units from the hips' middle), the ground at y = p.hip. */
export function paintLeg(ctx: CanvasRenderingContext2D, p: CrowPose, hip: Pt, far: boolean, boil: number): void {
  const ph = p.step + (far ? Math.PI : 0);
  const lift = Math.max(0, Math.sin(ph)) * p.walk;
  const foot = { x: 22 + (far ? 28 : 0) + 52 * Math.cos(ph) * p.walk, y: p.hip - lift * 34 - (far ? 7 : 0) };
  const heel = { x: (hip.x * 0.55 + foot.x * 0.45) - 16 - 10 * lift, y: hip.y + (foot.y - hip.y) * 0.34 + 4 };
  // The shank.
  const spine = spline([heel, { x: (heel.x + foot.x) / 2 - 2, y: (heel.y + foot.y) / 2 }, { x: foot.x, y: foot.y - 8 }], 6);
  const w = far ? 13 : 16;
  const shank = band(spine, (u) => w * (1.18 - 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.05)) * 0.7));
  // Toes: the one behind and the far ones first.
  const roll = !far ? p.tap : 0;
  const root = { x: foot.x, y: foot.y - 7 };
  const at = (dx: number, dy: number): Pt => ({ x: root.x + dx, y: root.y + dy - Math.max(0, dx) * roll * 0.5 + lift * Math.max(0, dx) * 0.35 });
  toe(ctx, root, at(-44, 6), w * 0.72, far, boil);
  toe(ctx, root, at(58, -5), w * 0.74, far, boil);
  fillShape(ctx, shank, far ? '#1c1c24' : linear(ctx, heel.x - 10, 0, heel.x + 16, 0, [[0, '#0f0f14'], [0.45, '#2c2e39'], [0.75, '#6a7086'], [1, '#26262f']]));
  // Scutes: the plates across the front of the shank.
  for (let i = 1; i < 9; i++) {
    const q = spine[Math.min(spine.length - 2, Math.round((i / 9) * (spine.length - 1)))]!;
    inkLine(ctx, curve({ x: q.x - w * 0.4, y: q.y - 1 }, { x: q.x + 2, y: q.y + 4 }, { x: q.x + w * 0.46, y: q.y - 2 }, 5), 0.9, far ? 0.35 : 0.75, boil, false, '#07070b');
  }
  inkLine(ctx, shank, 1.4, 0.9, boil, true, '#08080c');
  toe(ctx, root, at(64, 7), w * 0.8, far, boil);
  toe(ctx, root, at(46, 17), w * 0.78, far, boil);
  fillShape(ctx, band([{ x: root.x - 6, y: root.y - 4 }, { x: root.x + 10, y: root.y + 3 }], () => w * 0.95), far ? '#1c1c24' : DARK);
  // The feathered thigh, shaggy at its lower edge.
  const top = { x: hip.x + 8, y: hip.y - 34 };
  const thigh = band(spline([top, { x: (top.x + heel.x) / 2 + 16, y: (top.y + heel.y) / 2 }, { x: heel.x + 3, y: heel.y - 4 }], 5), (u) => (far ? 66 : 80) * (1 - 0.68 * u));
  fillShape(ctx, thigh, far ? '#14141b' : linear(ctx, hip.x - 30, 0, hip.x + 44, 0, [[0, '#0e0e13'], [0.5, '#1c1e2a'], [1, '#131319']]));
  const rng = rngOf(far ? 41 : 42);
  for (let i = 0; i < 46; i++) {
    const u = 0.15 + rng() * 0.85;
    const x = top.x + (heel.x - top.x) * u + (rng() - 0.5) * (far ? 56 : 70) * (1 - 0.66 * u) + 14 * Math.sin(Math.PI * u);
    const y = top.y + (heel.y - top.y) * u;
    taper(ctx, [{ x, y }, { x: x - 3, y: y + 12 }, { x: x - 6 + rng() * 5, y: y + 22 + rng() * 10 }], 6, 0.8, far ? '#101017' : (['#444b6a', '#0a0a0f', '#20232f', '#121218'] as const)[i % 4]!, far ? 0.8 : 0.65);
  }
}
