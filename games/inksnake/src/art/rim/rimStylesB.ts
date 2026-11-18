import type { Rng } from '../../logic/rng';
import { floodTree } from '../chapters/floodedPlaceSolids';
import { paintHeathCover } from '../chapters/heathPlaceCover';
import { dryStoneWall } from '../chapters/heathPlaceSolids';
import { bamboo } from '../chapters/junglePlaceSolids';
import { boulder as mountainBoulder } from '../chapters/mountainsPlaceSolids';
import { coralHead } from '../chapters/reefPlaceCoral';
import { beachRock } from '../chapters/reefPlaceSolids';
import { arc } from '../groundKit';
import { type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { makeRng } from './rimStylesA';
import { footing, rectBox, rimSides, type RimPiece, roundBox, roundChain, runRect, runs, stations } from './rimKit';

/** The walls of the reef, the mountains, the heath, the jungle and the flooded forest. */

/** The reef: a reef crest, coral heads packed along the edge with a worn rock among them. */
export function reefRim(rng: Rng): RimPiece[] {
  return [...footing(30, '#173a4a', 0.22), ...roundChain(rng, 11, 16, (d, c, r) => (makeRng(c.x * 0.013 + c.y * 0.007)() < 0.2 ? beachRock(d, c, r) : coralHead(d, c, r)), 3, 1.3)];
}

/** The mountains: a dry-stone wall of rough rocks, two rows staggered. */
export function mountainsRim(rng: Rng): RimPiece[] {
  return [...footing(30, undefined, 0.18), ...roundChain(rng, 8, 11, mountainBoulder, 4.5, 1.25), ...roundChain(rng, 6, 8, mountainBoulder, 6, 2.6)];
}

/** The heath: a dry-stone wall with gorse grown up against it. */
export function heathRim(rng: Rng): RimPiece[] {
  const pieces: RimPiece[] = [...footing(28, undefined, 0.14), ...runs(rng, 140, 230, 0, 9).map((run): RimPiece => {
    const r = runRect(run, 18);
    return { box: rectBox(r.x, r.y, r.w, r.h), paint: (d: Draw) => dryStoneWall(d, r.x, r.y, r.w, r.h), snow: [{ kind: 'rect', look: 'rim', ...r }] };
  })];
  for (const { p, side } of stations(rng, 120, 0.45)) {
    const r = 11 + rng() * 5;
    const c = pt(p.x + side.out.x * 10, p.y + side.out.y * 10);
    pieces.push({ box: roundBox(c, r, 14), paint: (d) => paintHeathCover(d, { look: 'gorse', x: c.x, y: c.y, r }) });
  }
  return pieces;
}

/** The jungle: a thicket of bamboo culms all along the edge. */
export function jungleRim(rng: Rng): RimPiece[] {
  return [...footing(32, '#1f3a1c', 0.3), ...roundChain(rng, 9, 12, bamboo, 5, 1.2)];
}

const ROOT = '#5b4632';
const ROOT_LIGHT = '#94795a';

/** The flooded forest: a tangle of arching roots between drowned trunks. */
export function floodedRim(rng: Rng): RimPiece[] {
  const pieces: RimPiece[] = footing(30, '#2a2418', 0.3);
  for (const s of rimSides()) {
    const len = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
    for (let dd = 0; dd < len; dd += 10 + rng() * 10) {
      const span = 26 + rng() * 40;
      const t0 = dd / len;
      const t1 = Math.min(1, (dd + span) / len);
      const off0 = (rng() - 0.5) * 14;
      const off1 = (rng() - 0.5) * 14;
      const a = pt(s.a.x + (s.b.x - s.a.x) * t0 + s.out.x * off0, s.a.y + (s.b.y - s.a.y) * t0 + s.out.y * off0);
      const b = pt(s.a.x + (s.b.x - s.a.x) * t1 + s.out.x * off1, s.a.y + (s.b.y - s.a.y) * t1 + s.out.y * off1);
      const bow = (rng() - 0.5) * 18;
      const w = 2.2 + rng() * 1.8;
      pieces.push({ box: rectBox(Math.min(a.x, b.x) - 12, Math.min(a.y, b.y) - 12, Math.abs(b.x - a.x) + 24, Math.abs(b.y - a.y) + 24), paint: (d) => root(d, a, b, bow, w) });
    }
  }
  for (const { p } of stations(rng, 150, 0.2)) {
    const r = 11 + rng() * 3;
    pieces.push({ box: roundBox(p, r * 2, 16), paint: (d) => floodTree(d, p, r) });
  }
  return pieces;
}

function root(d: Draw, a: Pt, b: Pt, bow: number, w: number): void {
  const pts = arc(a, b, bow, 10);
  d.pen.stroke(pts.map((p) => pt(p.x + 2.5, p.y + 4)), w + 1.5, d.ink, 0.14, false);
  d.pen.stroke(pts, w + 1, d.ink, 0.85, false);
  d.pen.stroke(pts, w, ROOT, 0.95, false);
  d.pen.hair(pts.map((p) => pt(p.x - w * 0.2, p.y - w * 0.25)), w * 0.35, ROOT_LIGHT, 0.8);
}
