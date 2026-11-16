import { INK, type Pen, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { createArt, type Art } from './bake';

/**
 * The fish larva, a fortnight out of the egg: a glass sliver that is mostly
 * eyes. The body is a pale wash you can see the water through, outlined in
 * a fine hairline; the fin fold a fainter film round the tail; the backbone
 * (still a notochord) and the muscle chevrons ghosted in; the gut a short
 * amber coil with its oil drop, freckled with star-shaped pigment cells; the
 * eye one solid ball of ink with a silver ring and a glint. Snout at +x.
 */

const TOP: readonly Pt[] = spline([
  { x: 50, y: 1 }, { x: 49, y: -4 }, { x: 46, y: -8 }, { x: 40, y: -10.5 }, { x: 32, y: -10 }, { x: 24, y: -7.5 },
  { x: 14, y: -5 }, { x: 0, y: -3.8 }, { x: -15, y: -3 }, { x: -30, y: -2.2 }, { x: -42, y: -1.4 }, { x: -48, y: -0.6 }, { x: -50, y: 0 },
], 6);

const BOTTOM: readonly Pt[] = spline([
  { x: 50, y: 1 }, { x: 48, y: 5 }, { x: 43, y: 8 }, { x: 36, y: 10.2 }, { x: 28, y: 11 }, { x: 20, y: 10.8 },
  { x: 12, y: 9.4 }, { x: 4, y: 7.4 }, { x: -5, y: 4.6 }, { x: -15, y: 3 }, { x: -30, y: 2.2 }, { x: -42, y: 1.4 }, { x: -48, y: 0.6 }, { x: -50, y: 0 },
], 6);

const BODY: readonly Pt[] = [...TOP, ...[...BOTTOM].reverse()];

/** The fin fold: a film from the middle of the back round the tail to the vent. */
const FOLD: readonly Pt[] = spline([
  { x: 16, y: -5 }, { x: 8, y: -8.5 }, { x: -4, y: -9.8 }, { x: -22, y: -10.2 }, { x: -38, y: -9 }, { x: -47, y: -6 },
  { x: -51.5, y: -2 }, { x: -52.5, y: 0 }, { x: -51.5, y: 2 }, { x: -47, y: 6 }, { x: -38, y: 9 }, { x: -22, y: 10 },
  { x: -10, y: 8.4 }, { x: -5, y: 4.6 },
], 6);

const EYE = { x: 37, y: -1, r: 7.8 } as const;

const GUT: readonly Pt[] = spline([{ x: 31, y: 6.2 }, { x: 25, y: 8.6 }, { x: 18, y: 8.4 }, { x: 12, y: 6.4 }, { x: 6, y: 6.6 }, { x: 0, y: 5.6 }, { x: -5, y: 4.6 }], 8);

const yAt = (line: readonly Pt[], x: number): number => {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((b.y - a.y) * (x - a.x)) / ((b.x - a.x) || 1);
  }
  return 0;
};

const scaled = (pts: readonly Pt[], k: number): Pt[] => pts.map((p) => ({ x: p.x * k, y: p.y * k }));

/** A star-shaped pigment cell: a dot with a few fine arms. */
function melanophore(pen: Pen, x: number, y: number, r: number, k: number, seed: number): void {
  pen.dot(x * k, y * k, r * k, '#2a1a14', 0.8);
  for (let i = 0; i < 5; i++) {
    const a = seed + i * 1.27;
    const l = r * (2.2 + ((seed * 13 + i * 7) % 5) * 0.35);
    pen.hair([{ x: x * k, y: y * k }, { x: (x + Math.cos(a) * l) * k, y: (y + Math.sin(a) * l) * k }], Math.max(0.3, r * k * 0.35), '#2a1a14', 0.55);
  }
}

export const LARVA: Art = createArt({ x0: -56, x1: 54, y0: -14, y1: 15 }, 4401, (ctx, k, pen) => {
  const line = Math.max(0.5, Math.min(2.6, 0.14 * k));
  const fine = Math.max(0.3, line * 0.45);
  // The fin fold, the faintest film, with its fine rays.
  const fold = scaled(FOLD, k);
  const p0 = pen(1);
  p0.fill(fold, 'rgba(232,246,248,0.2)', 1);
  p0.clipped(fold, () => {
    for (let x = 12; x > -52; x -= 3.2) {
      const top = yAt(TOP, Math.max(-50, x));
      const bot = yAt(BOTTOM, Math.max(-50, x));
      p0.hair([{ x: x * k, y: (top - 0.3) * k }, { x: (x - 0.8) * k, y: -11 * k }], fine * 0.5, '#4c5d66', 0.1);
      if (x < -5) p0.hair([{ x: x * k, y: (bot + 0.3) * k }, { x: (x - 0.8) * k, y: 11 * k }], fine * 0.5, '#4c5d66', 0.1);
    }
  });
  p0.stroke(fold, fine, '#3f5059', 0.4);
  // The body: glass. A pale wash, a sheen along the back, the water showing through.
  const body = scaled(BODY, k);
  const p1 = pen(2);
  p1.fill(body, 'rgba(222,240,244,0.34)', 1);
  p1.clipped(body, () => {
    const g = ctx.createLinearGradient(0, -11 * k, 0, 11 * k);
    g.addColorStop(0, 'rgba(255,255,255,0.45)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(160,196,206,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(-56 * k, -14 * k, 110 * k, 28 * k);
    // The muscle chevrons, ghosted.
    for (let x = 18; x > -46; x -= 3.4) {
      const h = Math.min(-yAt(TOP, x), yAt(BOTTOM, x)) * 0.92;
      p1.hair([{ x: (x + 1.6) * k, y: -h * k }, { x: (x - 0.8) * k, y: 0.4 * k }, { x: (x + 1.6) * k, y: h * k }], fine * 0.7, '#6d8790', 0.32);
    }
    // The notochord.
    p1.stroke([{ x: 28 * k, y: 0.6 * k }, { x: 0, y: 0.2 * k }, { x: -48 * k, y: 0 }], fine * 1.4, '#7b97a0', 0.45, false);
    // The brain under the skin of the head.
    p1.stroke(scaled(spline([{ x: 44, y: -6 }, { x: 38, y: -9 }, { x: 30, y: -8.6 }, { x: 26, y: -5.6 }], 5), k), fine, '#7b97a0', 0.35, false);
  });
  // The pectoral fin, a tiny fan behind the eye.
  const fin = scaled(spline([{ x: 28, y: 2 }, { x: 22, y: 0 }, { x: 18.5, y: 3.4 }, { x: 21, y: 7 }, { x: 27, y: 5 }, { x: 28, y: 2 }], 5), k);
  p1.fill(fin, 'rgba(236,248,250,0.35)', 1);
  for (let i = 0; i < 5; i++) p1.hair([{ x: 27.5 * k, y: 2.5 * k }, { x: (20 + i * 0.4) * k, y: (0.8 + i * 1.4) * k }], fine * 0.5, '#4c5d66', 0.35);
  p1.stroke(fin, fine * 0.8, '#3f5059', 0.5);
  // The gut: an amber coil, the oil drop at its front.
  const p2 = pen(3);
  p2.stroke(scaled(GUT, k), 3.2 * k, 'rgba(214,150,80,0.55)', 1, false);
  p2.stroke(scaled(GUT, k), 1.2 * k, 'rgba(240,196,120,0.7)', 1, false);
  p2.stroke(scaled(GUT.map((p) => ({ x: p.x, y: p.y + 1.5 })), k), fine, '#6a3d1c', 0.55, false);
  ctx.fillStyle = 'rgba(246,206,96,0.85)';
  ctx.beginPath();
  ctx.arc(26 * k, 7.6 * k, 2.6 * k, 0, Math.PI * 2);
  ctx.fill();
  p2.circle(26 * k, 7.6 * k, 2.6 * k, fine, '#7a4f18');
  p2.dot(25.2 * k, 6.8 * k, 0.8 * k, '#fffbe8', 0.9);
  // Star-shaped pigment along the gut and the underside of the tail.
  [[30, 9.6], [22, 10.4], [14, 8.6], [6, 7.6], [-2, 5.6], [-10, 3.4], [-18, 2.6], [-27, 2], [-36, 1.5]].forEach(([x, y], i) => melanophore(p2, x!, y!, 0.7, k, i * 2.3 + 0.7));
  // The outline: one fine hairline, broken where the light catches the back.
  const p3 = pen(4);
  p3.stroke(scaled(BOTTOM, k), line, INK, 0.62);
  p3.stroke(scaled(TOP.slice(0, Math.round(TOP.length * 0.45)), k), line, INK, 0.62);
  p3.stroke(scaled(TOP.slice(Math.round(TOP.length * 0.55)), k), line * 0.8, INK, 0.5);
  p3.hair(scaled(spline([{ x: 50, y: 1 }, { x: 47, y: 2.6 }, { x: 44, y: 3 }], 4), k), line * 0.8, INK, 0.7);
  // The eye: most of the head. Solid ink, a silver ring, a glint.
  ctx.fillStyle = '#14121a';
  ctx.beginPath();
  ctx.arc(EYE.x * k, EYE.y * k, EYE.r * k, 0, Math.PI * 2);
  ctx.fill();
  const ring = ctx.createRadialGradient(EYE.x * k, EYE.y * k, EYE.r * 0.45 * k, EYE.x * k, EYE.y * k, EYE.r * k);
  ring.addColorStop(0, 'rgba(20,18,26,0)');
  ring.addColorStop(0.7, 'rgba(150,182,196,0.55)');
  ring.addColorStop(1, 'rgba(210,228,232,0.9)');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(EYE.x * k, EYE.y * k, EYE.r * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0a0f';
  ctx.beginPath();
  ctx.arc((EYE.x + 0.6) * k, EYE.y * k, EYE.r * 0.5 * k, 0, Math.PI * 2);
  ctx.fill();
  p3.circle(EYE.x * k, EYE.y * k, EYE.r * k, line, INK);
  p3.dot((EYE.x + 2.2) * k, (EYE.y - 2.6) * k, 1.5 * k, '#ffffff', 0.95);
  p3.dot((EYE.x - 2.4) * k, (EYE.y + 2.4) * k, 0.6 * k, '#ffffff', 0.6);
}, { from: 6, to: -52, amp: 5 });

/** Where the larva's eye is, in body lengths from its centre (snout at +x). */
export const LARVA_EYE = { x: EYE.x / 100, y: EYE.y / 100 } as const;
