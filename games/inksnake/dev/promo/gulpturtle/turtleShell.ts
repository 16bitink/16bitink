import { createRng } from '../../../src/logic/rng';
import { closed, type Draw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { glaze } from '../../../src/art/snakes/cornPaint';
import type { SpriteArt } from '../../../src/art/types';
import {
  type AH, domeTop, MARGIN_FROM, MARGIN_TO, marginLine, RIM_SEAMS, rimEdge, SEAM_LINES, SHELL_FROM, SHELL_TO, SIDE_SCUTES, TOP_SCUTES, underBottom,
} from './shape';

/**
 * The river turtle's shell from the side, the head end along +x: the game's
 * top-down shell (chapters/floodedCrittersTurtle.ts) walked round to the
 * camera and warmed to chestnut and amber, so it stands off the olive snake:
 * a high dome of four big growth-ringed scutes under a row along the top,
 * dark seams, a flared rim of small scutes edged in cream, and the pale
 * yellow plastron underneath.
 *
 * Art units; PER_ART world units to one; the origin SHELL_A behind the nose.
 */
export const PER_ART = 6.6;
export const SHELL_A = 450;

export const SHELL = {
  base: '#9a4f22', amber: '#e09a3e', glow: '#f6c777', deep: '#4c2110', seam: '#27110a', rim: '#f0d093', rimDeep: '#a8662f', under: '#f1da8c', underDeep: '#b5823c',
} as const;

const at = (p: AH): Pt => pt((SHELL_A - p.a) / PER_ART, -p.h / PER_ART);
const run = (from: number, to: number, h: (a: number) => number, n = 40): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
  const a = from + ((to - from) * i) / n;
  return at({ a, h: h(a) });
});

/** A scute's middle: where its growth started. */
function middle(shape: readonly Pt[], lift: number): Pt {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return pt((x0 + x1) / 2, y0 + (y1 - y0) * lift);
}

/** One scute: amber at its heart, chestnut round it, dark at the seams; growth rings, and amber rays out from the heart. */
function scute(d: Draw, outline: readonly AH[], lift: number, seed: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const shape = outline.map(at);
  const c = middle(shape, lift);
  const r = Math.max(...shape.map((p) => Math.hypot(p.x - c.x, p.y - c.y)));
  pen.clipped(shape, () => {
    const g = ctx.createRadialGradient(c.x, c.y, 0.5, c.x, c.y, r * 1.02);
    g.addColorStop(0, SHELL.glow);
    g.addColorStop(0.2, SHELL.amber);
    g.addColorStop(0.58, SHELL.base);
    g.addColorStop(1, SHELL.deep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    const rng = createRng(seed);
    for (let i = 0; i < 30; i++) {
      const th = (i / 30) * Math.PI * 2 + rng() * 0.16;
      const [r0, r1] = [r * (0.12 + rng() * 0.1), r * (0.5 + rng() * 0.42)];
      pen.hair([pt(c.x + Math.cos(th) * r0, c.y + Math.sin(th) * r0), pt(c.x + Math.cos(th) * r1, c.y + Math.sin(th) * r1)], 0.5 + rng() * 0.5, i % 3 === 0 ? SHELL.deep : SHELL.amber, 0.42);
    }
    for (const k of [0.8, 0.62, 0.45, 0.29]) {
      const ring = shape.map((p) => pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k));
      pen.hair(closed(ring), 0.42, SHELL.seam, 0.42);
      pen.hair(closed(ring.map((p) => pt(p.x - 0.3, p.y - 0.45))), 0.42, SHELL.glow, 0.34);
    }
    // Each scute swells a little: lit along its upper edge, in shade along its lower.
    pen.crescent(shape, pt(0.9, 1.5), () => pen.fill(shape, SHELL.glow, 0.32));
    pen.crescent(shape, pt(-0.9, -1.6), () => pen.fill(shape, SHELL.seam, 0.4));
  });
}

/** The rim: small scutes, cream at the edge, a chestnut smudge in each. */
function rimBand(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const edge = run(SHELL_FROM, SHELL_TO, rimEdge);
  const inner = run(MARGIN_FROM, MARGIN_TO, marginLine);
  const band = [...edge, ...inner.slice().reverse()];
  pen.fill(band, SHELL.rim, 1);
  pen.clipped(band, () => {
    RIM_SEAMS.slice(0, -1).forEach((a0, i) => {
      const a1 = RIM_SEAMS[i + 1]!;
      const m = (a0 + a1) / 2;
      const q = at({ a: m, h: marginLine(m) });
      glaze(ctx, q.x, q.y + 1.4, ((a1 - a0) / PER_ART) * 0.62, 4.6, 0, SHELL.base, 0.95);
      glaze(ctx, q.x, q.y + 0.6, ((a1 - a0) / PER_ART) * 0.4, 2.6, 0, SHELL.deep, 0.5);
    });
    ctx.save();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = 'rgba(255,240,200,0.55)';
    ctx.beginPath();
    edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y - 1.2) : ctx.lineTo(p.x, p.y - 1.2)));
    ctx.stroke();
    ctx.restore();
  });
  for (const a of RIM_SEAMS) {
    const lean = (a - 455) * 0.05;
    pen.stroke([at({ a, h: marginLine(a) }), at({ a: a + lean, h: rimEdge(a + lean) })], 0.75, SHELL.seam, 0.9, false);
  }
  pen.stroke(inner, 1.1, SHELL.seam, 0.95, false);
  pen.stroke(edge, 1.5, d.ink, 1);
}

function drawCarapace(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const top = run(SHELL_FROM, SHELL_TO, domeTop, 60);
  const whole = [...top, ...run(SHELL_FROM, SHELL_TO, rimEdge).reverse()];
  pen.fill(whole, PAPER_FILL, 1);
  pen.fill(whole, SHELL.base, 1);
  pen.clipped(whole, () => {
    TOP_SCUTES.forEach((s, i) => scute(d, s, 0.42, 8100 + i));
    SIDE_SCUTES.forEach((s, i) => scute(d, s, 0.44, 8200 + i));
    for (const line of SEAM_LINES) {
      pen.stroke(line.map(at), 1.5, SHELL.seam, 0.95, false);
      pen.hair(line.map(at).map((p) => pt(p.x + 0.3, p.y + 0.9)), 0.4, SHELL.glow, 0.4);
    }
    // The dome's roundness: sun on its upper left, shade round its lower front and under the rim.
    const form = ctx.createRadialGradient(-7, -24, 4, -2, -8, 48);
    form.addColorStop(0, 'rgba(255,226,160,0.4)');
    form.addColorStop(0.4, 'rgba(255,200,120,0.06)');
    form.addColorStop(0.75, 'rgba(50,18,8,0.2)');
    form.addColorStop(1, 'rgba(30,10,6,0.62)');
    ctx.fillStyle = form;
    ctx.fillRect(-48, -46, 96, 70);
    // Wet from the river: a long soft shine over the top, and thin glints.
    glaze(ctx, -9, -31, 15, 3.2, -0.2, '#fff6e0', 0.55);
    glaze(ctx, -20, -22, 6, 1.8, -0.75, '#fff6e0', 0.35);
    for (const [x, y, l, s] of [[-4, -34.4, 9, 0.05], [13, -29, 5, 0.5], [-24, -17, 4, -0.9]] as const) pen.hair([pt(x, y), pt(x + l * Math.cos(s), y + l * Math.sin(s))], 0.8, PAPER_FILL, 0.7);
  });
  rimBand(d);
  pen.stroke(top, 1.8, d.ink, 1);
}

/** The plastron and the bridge: pale yellow, under the rim's shadow, a brown smudge on each plate. */
function drawUnder(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const bottom = run(SHELL_FROM + 4, SHELL_TO - 4, (a) => -underBottom(a));
  const top = run(SHELL_FROM + 4, SHELL_TO - 4, (a) => Math.min(rimEdge(a) + 24, domeTop(a) - 10));
  const shape = [...bottom, ...top.reverse()];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SHELL.under, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, 8, 0, 20);
    g.addColorStop(0, 'rgba(80,44,16,0.75)');
    g.addColorStop(0.4, 'rgba(160,104,44,0.3)');
    g.addColorStop(1, 'rgba(120,70,30,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(-44, -20, 88, 50);
    for (const a of [300, 390, 490, 590]) {
      const q = at({ a, h: -100 });
      glaze(ctx, q.x, q.y, 4.2, 2.2, 0, SHELL.underDeep, 0.65);
    }
    for (const a of [262, 345, 440, 540, 630]) pen.stroke([at({ a, h: -40 }), at({ a: a + 8, h: -135 })], 0.6, SHELL.rimDeep, 0.85, false);
    pen.crescent(shape, pt(0, -1.6), () => pen.fill(shape, SHELL.underDeep, 0.5));
  });
  pen.stroke(bottom, 1.5, d.ink, 1);
}

export const TURTLE_SHELL: SpriteArt<'carapace' | 'under'> = { frame: 96, res: 7, poses: ['carapace', 'under'], draw: (d, pose) => (pose === 'carapace' ? drawCarapace(d) : drawUnder(d)) };
