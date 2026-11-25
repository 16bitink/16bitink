import { islandKeys } from '../../art/sets';
import { FLATS } from '../../art/manifest';
import { LANE } from '../../sim/constants';
import { INK, PAINT } from '../style';
import { flatPlaceholder } from '../placeholders';
import type { Brush } from './roadPaint';
import type { JunctionShape } from './roadShape';

/** A roundabout's middle: lane rings and the planted island. Its palms stand on it (islandSpots). */
const RING_EDGE = 3;
const SMALL = 24;

/** The planted island's radius: inside the ring the traffic drives. */
export function islandRadius(j: JunctionShape): number {
  const wide = j.arms.some((a) => a.half > LANE + 0.5 || (a.road.oneWay && a.half >= LANE));
  return Math.max(5, j.j.radius - RING_EDGE - LANE * (wide ? 2 : 1) - 2);
}

export function paintIsland(b: Brush, j: JunctionShape): void {
  const { g } = b;
  const r = islandRadius(j);
  const { x, y } = j.j;
  g.save();
  g.strokeStyle = PAINT;
  g.globalAlpha = 0.6;
  g.lineWidth = 0.7;
  g.setLineDash([5, 6]);
  const wide = j.j.radius - r > LANE * 1.8;
  if (wide) { g.beginPath(); g.arc(x, y, r + 2 + LANE, 0, Math.PI * 2); g.stroke(); }
  g.setLineDash([]);
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(40,34,44,0.25)';
  g.beginPath();
  g.arc(x + 1.4, y + 1.6, r + 1.2, 0, Math.PI * 2);
  g.fill();
  const key = r < SMALL ? 'flat/island-small' : 'flat/island';
  const own = islandKeys(b.pics.style, r < SMALL).find((k) => b.pics.has(k));
  const pic = (own && b.pics.painted(own)) || b.pics.get(key, () => flatPlaceholder(key));
  const k = (r * 2) / Math.max(FLATS[key].w, 1);
  g.drawImage(pic.img, x - r, y - r, pic.img.width * k, pic.img.height * k);
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

/** Where palms stand on an island: a ring of them, one in the middle of a small one. */
export function islandSpots(j: JunctionShape): { readonly x: number; readonly y: number; readonly big: boolean }[] {
  const r = islandRadius(j);
  if (r < 11) return [{ x: j.j.x, y: j.j.y, big: false }];
  const n = Math.max(3, Math.round(r / 8));
  const ring = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + j.j.id;
    return { x: j.j.x + Math.cos(a) * r * 0.55, y: j.j.y + Math.sin(a) * r * 0.55, big: false };
  });
  return r > 18 ? [...ring, { x: j.j.x, y: j.j.y, big: true }] : ring;
}
