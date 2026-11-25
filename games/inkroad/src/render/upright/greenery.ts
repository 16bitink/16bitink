import type { Greens, SpriteName } from '../../art/manifest';
import type { Pt } from '../../sim/types';
import { fieldAt, scatter, type Extent } from '../ground/terrain';
import { fbm, hash2 } from '../noise';

/** Where the extra planting of each city goes: groves, rows, beds and boulders. All from the map seed. */
export interface Site {
  readonly rows: readonly string[];
  readonly extent: Extent;
  readonly inside: (p: Pt) => boolean;
  readonly dry: (p: Pt) => boolean;
}
type Put = (name: SpriteName, at: Pt, size: number) => void;

const lush = (p: Pt): number => fbm(p.x / 210, p.y / 210, 3, 91);

export function extraPlants(style: string, s: Site, greens: Greens, put: Put): void {
  const ok = (q: Pt): boolean => s.inside(q) && s.dry(q);
  const grove = (c: Pt, name: SpriteName, n: number, reach: number, size: number): void => {
    for (let i = 0; i < n; i++) {
      const a = hash2(c.x, c.y, 80 + i) * 6.283, d = reach * Math.sqrt(hash2(c.y, c.x, 90 + i));
      put(name, { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.8 }, size * (0.8 + 0.35 * hash2(i, c.x, 7)));
    }
  };
  const row = (c: Pt, name: SpriteName, n: number, gap: number, size: number, flat: boolean): void => {
    for (let i = 0; i < n; i++) put(name, flat ? { x: c.x + i * gap, y: c.y } : { x: c.x, y: c.y + i * gap }, size);
  };
  if (style === 'gulf') {
    for (const c of scatter(s.extent, 150, 201, (q, r) => ok(q) && r < 0.42 + Math.max(0, lush(q) - 0.45))) grove(c, greens.tall[0]!, 4 + Math.floor(hash2(c.x, c.y, 5) * 3), 30, 0.85);
    for (const c of scatter(s.extent, 70, 203, (q, r) => ok(q) && r < 0.18)) row(c, greens.shrub, 4, 11, 0.55, hash2(c.x, c.y, 8) > 0.5);
    for (const c of scatter(s.extent, 110, 205, (q, r) => s.inside(q) && r < 0.12 && fieldAt(s.rows, '~', q.x, q.y) > 0.05 && fieldAt(s.rows, '~', q.x, q.y) < 0.2)) put('prop/boat', c, 0.7);
  } else if (style === 'islands') {
    for (const c of scatter(s.extent, 26, 211, (q, r) => ok(q) && r < 0.1 + Math.max(0, lush(q) - 0.4) * 1.4)) put(greens.tall[0]!, c, 0.9 + 0.35 * hash2(c.x, c.y, 3));
    for (const c of scatter(s.extent, 120, 213, (q, r) => ok(q) && r < 0.35)) grove(c, greens.round[0]!, 5, 32, 0.8);
  } else if (style === 'hills') {
    for (const c of scatter(s.extent, 150, 221, (q, r) => ok(q) && r < 0.55 && fieldAt(s.rows, 'h', q.x, q.y) < 0.3)) row(c, greens.tall[0]!, 6, 18, 0.58, hash2(c.x, c.y, 9) > 0.5);
    for (const c of scatter(s.extent, 90, 223, (q, r) => ok(q) && r < 0.28)) row(c, greens.tall[0]!, 4, 9, 0.5, false);
    for (const c of scatter(s.extent, 34, 225, (q, r) => s.inside(q) && fieldAt(s.rows, 'h', q.x, q.y) > 0.3 && r < 0.45)) put(greens.rock, c, 0.7 + 0.7 * hash2(c.x, c.y, 4));
  } else if (style === 'rivers') {
    for (const c of scatter(s.extent, 130, 231, (q, r) => ok(q) && r < 0.6)) grove(c, greens.tall[0]!, 4, 24, 0.8);
  } else {
    for (const c of scatter(s.extent, 150, 241, (q, r) => ok(q) && r < 0.4)) grove(c, greens.tall[0]!, 3, 22, 0.65);
  }
}
