import type { SolidDef } from '../../level/types';
import type { Rng } from '../../logic/rng';
import { pineLog, pineStump } from '../chapters/barrensPlaceSolids';
import { boulder as desertBoulder } from '../chapters/dunesPlaceSolids';
import { granite } from '../chapters/savannaPlaceSolids';
import { castShadow, outline, polar } from '../groundKit';
import { bezier, closed, type Draw, edge, oval, pt, skin, TAU } from '../kit';
import { fencePost, fieldStone } from '../places/farmSolids';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { bed, footing, rectBox, rimSides, type RimPiece, roundBox, roundChain, runRect, runs, stations, tick } from './rimKit';

/** The walls of the farm, the Barrens, the dunes, the savanna and the rainforest (rimStylesB.ts has the rest). */

const WOOD = '#b48a5e';
const WOOD_DARK = '#6f5238';

/** A weathered plank from a to b, w wide, seen from above, casting to the lower right. */
function plank(d: Draw, a: Pt, b: Pt, w: number, rng: Rng): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const u = pt((b.x - a.x) / len, (b.y - a.y) / len);
  const n = pt(-u.y, u.x);
  const c = (s: number, t: number): Pt => pt(a.x + u.x * s + n.x * t, a.y + u.y * s + n.y * t);
  const shape = outline([c(0, -w / 2), c(len, -w / 2 + (rng() - 0.5)), c(len, w / 2), c(0, w / 2)], 6).slice(0, -1);
  castShadow(d, shape, 6, 0.24);
  skin(d, shape, mix(WOOD, WOOD_DARK, rng() * 0.3), 0.75);
  d.pen.clipped(shape, () => {
    for (let k = 0; k < 3; k++) {
      const t = (rng() - 0.5) * w * 0.7;
      const s0 = rng() * len * 0.3;
      d.pen.hair([c(s0, t), c(s0 + len * (0.3 + rng() * 0.5), t + (rng() - 0.5))], 0.45, WOOD_DARK, 0.6);
    }
    d.pen.fill(outline([c(0, w * 0.15), c(len, w * 0.15), c(len, w / 2 + 1), c(0, w / 2 + 1)], 8).slice(0, -1), WOOD_DARK, 0.25);
  });
  edge(d, shape, 1.2);
}

/** The farm: a post-and-rail fence, two weathered rails between square posts. */
export function farmRim(rng: Rng): RimPiece[] {
  const pieces: RimPiece[] = [];
  const posts: Pt[] = [];
  for (const s of rimSides()) {
    const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
    const n = Math.max(1, Math.round(len / 78));
    for (let i = 0; i < n; i++) {
      const p0 = pt(s.a.x + ((s.b.x - s.a.x) * i) / n, s.a.y + ((s.b.y - s.a.y) * i) / n);
      const p1 = pt(s.a.x + ((s.b.x - s.a.x) * (i + 1)) / n, s.a.y + ((s.b.y - s.a.y) * (i + 1)) / n);
      posts.push(p0);
      for (const off of [-4.5, 4.5]) {
        const a = pt(p0.x + s.out.x * off, p0.y + s.out.y * off);
        const b = pt(p1.x + s.out.x * off, p1.y + s.out.y * off);
        const r = runRect({ a, b }, 6);
        const seed = rng();
        pieces.push({ box: rectBox(r.x, r.y, r.w, r.h, 10), paint: (d) => plank(d, a, b, 5.5, makeRng(seed)), snow: [{ kind: 'rect', look: 'rim', ...r }] });
      }
    }
  }
  for (const p of posts) pieces.push({ box: roundBox(p, 9, 36), paint: (d) => fencePost(d, p, 9), snow: [{ kind: 'circle', look: 'rim', x: p.x, y: p.y, r: 7 }] });
  // A field stone or two heaped against the fence here and there.
  for (const { p, side } of stations(rng, 260, 0.4)) {
    const c = pt(p.x + side.out.x * 15 + (rng() - 0.5) * 30 * Math.abs(side.out.y), p.y + side.out.y * 15 + (rng() - 0.5) * 30 * Math.abs(side.out.x));
    const r = 6 + rng() * 4;
    pieces.push({ box: roundBox(c, r), paint: (d) => fieldStone(d, c, r), snow: [{ kind: 'circle', look: 'rim', x: c.x, y: c.y, r }] });
  }
  return pieces;
}

/** The Barrens: fallen pitch-pine logs end to end, a stump at each corner. */
export function barrensRim(rng: Rng): RimPiece[] {
  const pieces: RimPiece[] = [...footing(30, undefined, 0.16), ...runs(rng, 120, 190, 2, 12).map((run): RimPiece => {
    const r = runRect(run, 19 + rng() * 3);
    return { box: rectBox(r.x, r.y, r.w, r.h), paint: (d: Draw) => pineLog(d, r.x, r.y, r.w, r.h, 0), snow: [{ kind: 'rect', look: 'rim', ...r }] };
  })];
  for (const s of rimSides()) pieces.push({ box: roundBox(s.a, 14), paint: (d) => pineStump(d, s.a, 14, 0), snow: [{ kind: 'circle', look: 'rim', x: s.a.x, y: s.a.y, r: 14 }] });
  return pieces;
}

/** The dunes: a ridge of desert boulders shoulder to shoulder. */
export function dunesRim(rng: Rng): RimPiece[] {
  return [...footing(32, '#7a5a3a', 0.24), ...roundChain(rng, 12, 18, desertBoulder, 3, 1.3)];
}

const THORN = '#3a2b1e';
const BRUSH = '#6f5c3c';

/** The savanna: a boma, a hedge of cut thorn branches piled along the edge. */
export function savannaRim(rng: Rng): RimPiece[] {
  const pieces: RimPiece[] = [...footing(34, '#4a3a22', 0.26), ...stations(rng, 11, 0.3, 3).map(({ p }) => {
    const seed = rng();
    return { box: roundBox(p, 22, 12), paint: (d: Draw) => thornBundle(d, p, makeRng(seed)) };
  })];
  // A granite boulder the boma was built against, now and then.
  for (const { p } of stations(rng, 300, 0.4)) {
    const r = 13 + rng() * 5;
    pieces.push({ box: roundBox(p, r, 20), paint: (d) => granite(d, p, r) });
  }
  return pieces;
}

function thornBundle(d: Draw, c: Pt, rng: Rng): void {
  bed(d, c, 15, 12, rng, BRUSH, 0.72);
  for (let k = 0; k < 12; k++) {
    const a = rng() * TAU;
    const from = polar(c, rng() * TAU, rng() * 7);
    const len = 9 + rng() * 10;
    tick(d, polar(from, 0.99, 2.5), a, len, 1.8, d.ink, 0.12);
    tick(d, from, a, len, 1.2 + rng() * 0.8, THORN, 0.9);
    // Thorns in pairs along the branch, pale against the dark.
    for (let j = 1; j <= 2; j++) {
      const q = polar(from, a, (len * j) / 3);
      tick(d, q, a + 1.1, 2.6, 0.5, '#efe6cc', 0.85);
      tick(d, q, a - 1.1, 2.4, 0.5, THORN, 0.7);
    }
  }
  for (let k = 0; k < 3; k++) d.pen.dot(c.x + (rng() - 0.5) * 18, c.y + (rng() - 0.5) * 14, 1.1, '#7d8a4a', 0.8);
}

const BARK = '#5a4130';
const VINE = '#4f7a3e';
const LEAVES = ['#5f8f4e', '#3f6e3a', '#7ea35a'] as const;

/** The rainforest: buttressed trunks with a tangle of lianas and leaves strung between them. */
export function rainforestRim(rng: Rng): RimPiece[] {
  const pieces: RimPiece[] = footing(30, '#22381f', 0.36);
  for (const s of rimSides()) {
    for (const off of [-9, -4.5, 0, 4.5, 9]) {
      const seed = rng();
      const box = rectBox(Math.min(s.a.x, s.b.x) - 10, Math.min(s.a.y, s.b.y) - 10, Math.abs(s.b.x - s.a.x) + 20, Math.abs(s.b.y - s.a.y) + 20);
      pieces.push({ box, paint: (d) => liana(d, s.a, s.b, s.out, off, makeRng(seed)) });
    }
  }
  for (const { p } of stations(rng, 5, 0.4, 10)) {
    const seed = rng();
    pieces.push({ box: roundBox(p, 7), paint: (d) => leaf(d, p, makeRng(seed)) });
  }
  for (const { p } of stations(rng, 170, 0.18)) {
    const r = 15 + rng() * 4;
    const seed = rng();
    pieces.push({ box: roundBox(p, r * 2.4, 12), paint: (d) => buttressTrunk(d, p, r, makeRng(seed)) });
  }
  return pieces;
}

function liana(d: Draw, a: Pt, b: Pt, out: Pt, off: number, rng: Rng): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ph = rng() * TAU;
  const wave = 30 + rng() * 30;
  const pts = Array.from({ length: Math.ceil(len / 6) + 1 }, (_, i) => {
    const t = Math.min(1, (i * 6) / len);
    const o = off + Math.sin(t * len / wave + ph) * 3.5;
    return pt(a.x + (b.x - a.x) * t + out.x * o, a.y + (b.y - a.y) * t + out.y * o);
  });
  d.pen.stroke(pts.map((p) => pt(p.x + 2, p.y + 3)), 3.2, d.ink, 0.12, false);
  d.pen.stroke(pts, 3, VINE, 0.92, false);
  d.pen.hair(pts, 0.6, d.ink, 0.7);
}

function leaf(d: Draw, c: Pt, rng: Rng): void {
  const a = rng() * TAU;
  const l = 7 + rng() * 4;
  const tip = polar(c, a, l);
  const side = (k: number): Pt => polar(polar(c, a, l * 0.5), a + (Math.PI / 2) * k, l * 0.38);
  const shape = [c, side(1), tip, side(-1)];
  castShadow(d, shape, 3, 0.14);
  d.pen.fill(shape, LEAVES[Math.floor(rng() * LEAVES.length)]!, 0.88);
  d.pen.hair(closed(shape), 0.5, d.ink, 0.65);
  d.pen.hair([c, tip], 0.35, d.ink, 0.5);
}

function buttressTrunk(d: Draw, c: Pt, r: number, rng: Rng): void {
  const fins = 5;
  const turn = rng() * TAU;
  for (let i = 0; i < fins; i++) {
    const a = turn + (i / fins) * TAU + (rng() - 0.5) * 0.5;
    const reach = r * (1.3 + rng() * 0.3);
    const tip = polar(c, a, reach);
    const fin = [...bezier(polar(c, a - 0.95, r * 0.8), polar(c, a - 0.3, reach * 0.92), tip, 8), ...bezier(tip, polar(c, a + 0.3, reach * 0.92), polar(c, a + 0.95, r * 0.8), 8).slice(1)];
    castShadow(d, fin, 7, 0.2);
    skin(d, fin, mix('#6e5038', BARK, rng() * 0.5), 0.92);
    d.pen.crescent(fin, pt(-2, -3), () => d.pen.fill(fin, '#2f2219', 0.35));
    edge(d, fin, 1.1);
  }
  const trunk = oval(c.x, c.y, r, r * 0.95, 26);
  castShadow(d, trunk, 12, 0.24);
  skin(d, trunk, BARK, 0.95);
  d.pen.clipped(trunk, () => {
    // Bark: furrows running down the trunk, seen from above as cracks round it.
    for (let k = 0; k < 9; k++) {
      const a = rng() * TAU;
      d.pen.hair([polar(c, a, r * (0.25 + rng() * 0.3)), polar(c, a + 0.15, r * 1.05)], 0.5, '#4e3a28', 0.6);
    }
    d.pen.fill(oval(c.x - r * 0.4, c.y - r * 0.45, r * 0.5, r * 0.35, 12), '#8fae6a', 0.55);
  });
  edge(d, trunk, 1.5);
}

/** A small seeded rng for a piece's own strokes (so a piece paints the same in every strip it touches). */
export function makeRng(seed: number): Rng {
  let s = Math.floor(seed * 2 ** 31) || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** For the snow on a round piece. */
export const roundSnow = (c: Pt, r: number): SolidDef => ({ kind: 'circle', look: 'rim', x: c.x, y: c.y, r });
