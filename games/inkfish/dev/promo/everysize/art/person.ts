import { INK, Pen, type Pt } from '../../../../src/art/pen';
import { boilOf } from './bake';

/**
 * "You", to scale: a swimmer seen from the side under water, doing the
 * front crawl. A silhouette with no face (it's anyone): one deep blue-black
 * shape in ink with a paper rim where the light from above catches the back
 * and the arms, the far arm and leg a shade darker behind. `length` is the
 * swimmer's height in px (head to toes), head towards +x of `facing`.
 */

const SKIN = '#1d2436';
const FAR = '#141a28';
const RIM = '#c9d8e8';

/** A limb as a tapering ribbon from a to b. */
function limb(a: Pt, b: Pt, w0: number, w1: number): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const pts: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const w = (w0 + (w1 - w0) * u) / 2;
    pts.push({ x: a.x + dx * u + nx * w, y: a.y + dy * u + ny * w });
  }
  for (let i = 0; i <= 8; i++) {
    const a2 = Math.PI * (i / 8);
    pts.push({ x: b.x + (nx * Math.cos(a2) + (dx / l) * Math.sin(a2)) * (w1 / 2), y: b.y + (ny * Math.cos(a2) + (dy / l) * Math.sin(a2)) * (w1 / 2) });
  }
  for (let i = 8; i >= 0; i--) {
    const u = i / 8;
    const w = (w0 + (w1 - w0) * u) / 2;
    pts.push({ x: a.x + dx * u - nx * w, y: a.y + dy * u - ny * w });
  }
  return pts;
}

const at = (p: Pt, a: number, r: number): Pt => ({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });

interface Parts {
  readonly near: Pt[][];
  readonly far: Pt[][];
  readonly torso: Pt[];
  readonly head: Pt[];
}

/** The body in units (height 100, head at +x, y down), its stroke phase `s` radians. */
function partsAt(s: number): Parts {
  const shoulder = { x: 32, y: -1.5 };
  const hip = { x: 2, y: 1.5 };
  const arm = (ph: number): Pt[][] => {
    // The hand reaches forward, pulls down and back under the body, recovers over the top.
    const a = -Math.PI * 0.06 + ph;
    const elbow = at(shoulder, a, 17);
    const bend = Math.sin(ph) > 0 ? 0.5 : 0.15;
    const hand = at(elbow, a + bend, 16);
    return [limb(shoulder, elbow, 7.4, 6), limb(elbow, hand, 6, 4.4)];
  };
  const leg = (ph: number): Pt[][] => {
    const kick = Math.sin(ph) * 0.12;
    const knee = at(hip, Math.PI + kick, 25);
    const foot = at(knee, Math.PI + kick * 1.8 + 0.04, 24);
    const toe = at(foot, Math.PI + kick * 2.4 + 0.5, 5);
    return [limb(hip, knee, 11, 7.4), limb(knee, foot, 7, 4.6), limb(foot, toe, 4.6, 2.6)];
  };
  const kickPh = s * 3;
  return {
    near: [...arm(s), ...leg(kickPh)],
    far: [...arm(s + Math.PI), ...leg(kickPh + Math.PI)],
    torso: limb({ x: 37, y: -0.4 }, { x: 0, y: 1.8 }, 17, 13),
    head: Array.from({ length: 24 }, (_, i) => at({ x: 45, y: -2.2 }, (i / 24) * Math.PI * 2, 6.6)).map((p) => ({ x: p.x + (p.x > 45 ? 1 : 0), y: p.y * (p.y > -2.2 ? 0.92 : 1) })),
  };
}

export function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1, t: number, alpha = 1, stroke = t * 1.7): void {
  if (alpha <= 0 || length < 2) return;
  const k = length / 100;
  const parts = partsAt(stroke);
  const pen = new Pen(ctx, 811 + boilOf(t) * 977, Math.min(1.4, 0.3 + length * 0.002));
  const line = Math.max(0.8, Math.min(3.4, length * 0.004));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(facing * k, k);
  ctx.translate(1, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const w = line / k;
  const all = [...parts.far, parts.torso, parts.head, ...parts.near];
  // A pale halo, then the ink outline, both under the fills: only the outer edge shows, no seams.
  for (const p of all) pen.stroke([...p, p[0]!], w * 4, RIM, 0.3);
  for (const p of all) pen.stroke([...p, p[0]!], w * 1.8, INK, 0.9);
  for (const p of parts.far) pen.fill(p, FAR, 1);
  for (const p of [parts.torso, parts.head, ...parts.near]) pen.fill(p, SKIN, 1);
  // Light from above along the back, the head and the reaching arm.
  ctx.save();
  ctx.beginPath();
  for (const p of [parts.torso, parts.head, ...parts.near]) p.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.clip();
  const g = ctx.createLinearGradient(0, -12, 0, 8);
  g.addColorStop(0, 'rgba(150,176,206,0.55)');
  g.addColorStop(0.5, 'rgba(60,78,108,0.2)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-60, -40, 120, 60);
  ctx.restore();
  ctx.restore();
}
