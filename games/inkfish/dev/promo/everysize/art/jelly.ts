import { INK, type Pt } from '../../../../src/art/pen';
import { createArt, type Art } from './bake';

/**
 * The mauve stinger, Pelagia noctiluca: a small glassy bell washed purple-
 * pink, freckled with raised warts (its stinging cells) in darker mauve, its
 * margin cut into sixteen lappets. Under it, drawn live so they sway: four
 * long frilled oral arms and eight fine trailing tentacles. The bell is LEN
 * units across; (x, y) is the middle of its margin; it points up.
 */

const LAPPETS = 16;

/** The bell's outline, units: a dome over a scalloped margin. */
const BELL: readonly Pt[] = (() => {
  const dome: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI + (i / 40) * Math.PI;
    dome.push({ x: Math.cos(a) * 50, y: Math.sin(a) * 54 * (0.86 + 0.14 * Math.abs(Math.cos(a))) });
  }
  const rim: Pt[] = [];
  for (let i = 0; i <= LAPPETS * 4; i++) {
    const u = i / (LAPPETS * 4);
    const x = 50 - u * 100;
    rim.push({ x, y: 2 + 4.5 * Math.abs(Math.sin(u * LAPPETS * Math.PI)) });
  }
  return [...dome, ...rim];
})();

const WARTS: readonly (readonly [number, number, number])[] = (() => {
  const out: [number, number, number][] = [];
  let s = 17;
  const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let ring = 0; ring < 6; ring++) {
    const r = 0.18 + ring * 0.15;
    const n = 6 + ring * 4;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + ((i + rnd() * 0.6) / n) * Math.PI;
      out.push([Math.cos(a) * 50 * r * 1.05, Math.sin(a) * 50 * r + (1 - r) * -18, 1.3 + rnd() * 1.4]);
    }
  }
  return out;
})();

const scaled = (pts: readonly Pt[], k: number): Pt[] => pts.map((p) => ({ x: p.x * k, y: p.y * k }));

const BELL_ART: Art = createArt({ x0: -56, x1: 56, y0: -62, y1: 12 }, 5507, (ctx, k, pen) => {
  const line = Math.max(0.6, Math.min(3, 0.12 * k));
  const shape = scaled(BELL, k);
  const p = pen(1);
  p.fill(shape, 'rgba(250,236,244,0.35)', 1);
  p.clipped(shape, () => {
    const g = ctx.createRadialGradient(-12 * k, -40 * k, 4 * k, 0, -20 * k, 62 * k);
    g.addColorStop(0, 'rgba(250,214,236,0.75)');
    g.addColorStop(0.55, 'rgba(196,112,168,0.6)');
    g.addColorStop(1, 'rgba(120,54,112,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(-56 * k, -62 * k, 112 * k, 74 * k);
    // The radial canals under the glass.
    for (let i = 0; i < LAPPETS; i++) {
      const x = -46 + (i + 0.5) * (92 / LAPPETS);
      p.hair([{ x: x * 0.15 * k, y: -44 * k }, { x: x * 0.7 * k, y: -18 * k }, { x: x * k, y: 3 * k }], line * 0.35, '#7a3070', 0.28);
    }
    // The underside showing through the margin.
    ctx.fillStyle = 'rgba(110,40,100,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 2 * k, 44 * k, 7 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    // Light from above: broken pale strokes on the crown.
    for (let i = 0; i < 5; i++) p.hair([{ x: (-30 + i * 8) * k, y: (-40 + Math.abs(i - 2) * 4) * k }, { x: (-22 + i * 8) * k, y: (-46 + Math.abs(i - 2) * 3) * k }], line * 0.9, '#fff6fb', 0.6);
  });
  // The warts: little raised mounds, dark with a lit top.
  for (const [x, y, r] of WARTS) {
    p.dot(x * k, y * k, r * k, '#8a3a7c', 0.75);
    p.dot((x - r * 0.3) * k, (y - r * 0.35) * k, r * 0.45 * k, '#ffe4f2', 0.7);
  }
  pen(2).stroke(shape, line, INK, 0.72);
});

/** A tentacle or arm root along the margin (units), and how it hangs and sways at t. */
function hang(root: Pt, len: number, t: number, phase: number, n: number, sway: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const wave = Math.sin(t * 1.1 + phase - u * 3.4) * sway * u * u;
    return { x: root.x + wave + root.x * 0.25 * u, y: root.y + u * len };
  });
}

const TENTACLES = [-44, -31, -18, -6, 6, 18, 31, 44] as const;
const ARMS = [-14, -5, 5, 14] as const;

/** A point on tentacle `i` (0..7) at `u` (0 root .. 1 tip), screen px. */
export function tentacleAt(x: number, y: number, width: number, i: number, u: number, t: number): Pt {
  const k = width / 100;
  const pts = hang({ x: TENTACLES[i]!, y: 4 }, 210, t, i * 1.7, 24, 22);
  const p = pts[Math.round(Math.max(0, Math.min(1, u)) * 24)]!;
  return { x: x + p.x * k, y: y + p.y * k };
}

/** Draws the jelly: tentacles and arms (live), then the bell. `width` px across the bell. */
export function drawJelly(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, t: number, alpha = 1): void {
  if (alpha <= 0 || width < 2) return;
  const k = width / 100;
  const pulse = 1 + 0.05 * Math.sin(t * 2.2);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  // The tentacles: fine mauve threads.
  TENTACLES.forEach((tx, i) => {
    const pts = hang({ x: tx * pulse, y: 4 }, 210, t, i * 1.7, 24, 22);
    ctx.strokeStyle = 'rgba(150,70,140,0.6)';
    ctx.lineWidth = Math.max(0.5, 0.9 * k);
    ctx.beginPath();
    pts.forEach((p, j) => (j ? ctx.lineTo(p.x * k, p.y * k) : ctx.moveTo(p.x * k, p.y * k)));
    ctx.stroke();
  });
  // The oral arms: long frilled ribbons, pinker and thicker.
  ARMS.forEach((ax, i) => {
    const pts = hang({ x: ax, y: 2 }, 120, t, i * 2.3 + 1, 20, 14);
    const left = pts.map((p, j) => ({ x: (p.x - (5 - j * 0.18) + Math.sin(j * 1.9 + t * 2) * 1.6) * k, y: p.y * k }));
    const right = pts.map((p, j) => ({ x: (p.x + (5 - j * 0.18) + Math.sin(j * 2.3 + t * 2 + 1) * 1.6) * k, y: p.y * k })).reverse();
    ctx.fillStyle = 'rgba(214,128,182,0.5)';
    ctx.strokeStyle = 'rgba(96,34,88,0.55)';
    ctx.lineWidth = Math.max(0.5, 0.8 * k);
    ctx.beginPath();
    [...left, ...right].forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, 2 - pulse);
  BELL_ART.draw(ctx, 0, 0, width, 0, t, { alpha });
  ctx.restore();
}

export const prepareJelly = (): void => BELL_ART.prepare();
