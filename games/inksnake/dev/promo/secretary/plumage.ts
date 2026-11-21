import type { Rng } from '../../../src/logic/rng';
import { cub, type Draw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { boxOf, coat, glaze, petalBlade, scalloped, vane } from '../../../src/art/critters/birdKit';
import { tailFeather } from '../../../src/art/chapters/savannaBossPaint';
import { SB } from './paint';

/**
 * Soft feathered masses for the side-on secretary bird: no hard outline,
 * the silhouette broken into feather tips, layered washes with
 * countershading (darker along the back, pale underneath), a coat of
 * small pale-edged feathers, and a faint ink line only where a form turns
 * away. Also the body's silhouette and the long-streamered tail.
 */
export interface Soft {
  readonly n: number;
  readonly size: number;
  readonly dir: (p: Pt) => number;
  /** The wash: top (back), middle, bottom (underside). */
  readonly tones?: readonly [string, string, string];
  readonly dark?: boolean;
  readonly line?: number;
  /** A firmer line along the underside (for wide masses: the body). */
  readonly underline?: boolean;
}

export function softPlumage(d: Draw, raw: readonly Pt[], rng: Rng, o: Soft): Pt[] {
  const { pen } = d;
  const { ctx } = pen;
  const b = boxOf(raw);
  const shape = scalloped(raw, Math.max(2, o.size * 0.8), Math.max(0.2, o.size * 0.07));
  const [top, mid, low] = o.tones ?? [SB.mid, SB.grey, SB.pale];
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
    g.addColorStop(0, top);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, low);
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4);
    glaze(d, b.cx + b.rx * 0.15, b.cy - b.ry * 0.35, b.rx * 0.55, b.ry * 0.3, 0, o.dark ? SB.sheen : SB.pale, o.dark ? 0.5 : 0.55);
    glaze(d, b.cx - b.rx * 0.1, b.cy + b.ry * 0.55, b.rx * 0.7, b.ry * 0.35, 0, o.dark ? SB.ink : SB.shadow, 0.22);
  });
  coat(d, shape, rng, {
    dir: o.dir, n: o.n, size: o.size, ruffle: 0.25,
    paint: ({ f, s, r }) => {
      const tone = o.dark ? (r < 0.5 ? SB.black : SB.shadow) : r < 0.25 ? SB.mid : r < 0.8 ? SB.grey : SB.pale;
      pen.fill(f.shape, tone, o.dark ? 0.45 : 0.22);
      pen.hair(f.shape.slice(3, 9), Math.max(0.2, s * 0.09), o.dark ? SB.sheen : SB.white, o.dark ? 0.4 : 0.55);
      pen.hair(f.shape.slice(2, 10), 0.18, o.dark ? SB.ink : SB.deep, 0.28);
    },
  });
  // Only a faint line, heavier along the underside (the form turning from the light).
  const under = shape.filter((p) => p.y > b.cy);
  pen.hair(shape, o.line ?? 0.35, SB.line, 0.35);
  if (o.underline && under.length > 3) pen.hair(under, (o.line ?? 0.35) * 1.4, SB.line, 0.4);
  return shape;
}

/**
 * The body's silhouette, facing +x: a deep chest, the belly running back
 * to the vent, the back sloping from the shoulders down into the tail.
 */
export function bodyShape(): Pt[] {
  return [
    ...cub(pt(20, -10), pt(30, -6), pt(33, 8), pt(22, 16), 10),
    ...cub(pt(22, 16), pt(12, 22), pt(-4, 20), pt(-14, 14), 10).slice(1),
    ...cub(pt(-14, 14), pt(-22, 10), pt(-28, 7), pt(-35, 4), 8).slice(1),
    ...cub(pt(-35, 4), pt(-36, 2), pt(-36, 0), pt(-34, -1), 3).slice(1),
    ...cub(pt(-34, -1), pt(-22, -6), pt(-6, -13), pt(8, -14), 12).slice(1),
    ...cub(pt(8, -14), pt(14, -14), pt(17, -13), pt(20, -10), 5).slice(1, -1),
  ];
}

/** A long central streamer: grey, darkening to a black tip. */
function streamer(d: Draw, root: Pt, ang: number, len: number, w: number): void {
  const f = petalBlade(root, ang, len, w, 0.012, 22);
  vane(d, f, w, {
    base: SB.grey, alpha: 0.92, deep: SB.deep, glazes: [SB.pale, SB.mid], glazeAlpha: 0.3,
    tip: SB.black, tipFrom: 0.8, tipAlpha: 0.95, shaft: SB.deep, barbs: SB.deep, barbAlpha: 0.2, lit: SB.pale, line: 0.4, lineAlpha: 0.7,
  });
}

/**
 * The tail from its root at `root`, pointing back along `ang`: eight
 * graduated grey feathers with black bands and pale tips, and the two
 * central streamers reaching far beyond them.
 */
export function paintTail(d: Draw, root: Pt, ang: number): void {
  for (let i = 0; i < 8; i++) {
    const u = i / 7 - 0.5;
    const len = 34 - Math.abs(u) * 14;
    tailFeather(d, petalBlade(pt(root.x, root.y + u * 4), ang + u * 0.22, len, 6.2), 6.2);
  }
  for (const s of [-1, 1]) streamer(d, pt(root.x, root.y + s * 0.8), ang + s * 0.025, 88 + s * 4, 4.6);
}
