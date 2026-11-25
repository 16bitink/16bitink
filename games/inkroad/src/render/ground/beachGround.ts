import { lotRect } from '../../city/geometry';
import type { BeachView } from '../../sim/types';
import { boxesMeet } from '../geom';
import { hash2 } from '../noise';
import type { Pen } from './dress';
import { fieldAt } from './terrain';

/** Beaches: wet sand and a line of foam where the sea is near (towels, umbrellas and fences are upright props: see beachProps). */

export const beachSig = (b: BeachView): string => `B${b.id}:${b.state}`;

export function paintBeaches(p: Pen): void {
  for (const b of p.lots.beaches) {
    const r = lotRect(b.rect);
    if (!boxesMeet({ x0: r.x - 20, y0: r.y - 20, x1: r.x + r.w + 20, y1: r.y + r.h + 20 }, p.box)) continue;
    wet(p, r);
  }
}

type R = { x: number; y: number; w: number; h: number };

/** Darker wet sand and a line of foam where the sea is near. */
function wet(p: Pen, r: R): void {
  const { g } = p;
  for (let y = r.y; y < r.y + r.h; y += 8) {
    for (let x = r.x; x < r.x + r.w; x += 8) {
      const f = fieldAt(p.rows, '~', x, y);
      if (f > 0.02 && f < 0.5) { g.fillStyle = `rgba(150,112,70,${0.16 * (1 - f * 1.6)})`; g.beginPath(); g.arc(x, y, 8, 0, 6.283); g.fill(); }
      if (f > 0.34 && f < 0.5 && hash2(x, y, 5) < 0.55) { g.fillStyle = 'rgba(255,255,248,0.55)'; g.beginPath(); g.ellipse(x, y, 5, 1.6, 0, 0, 6.283); g.fill(); }
    }
  }
}
