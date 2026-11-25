import { lotRect } from '../../city/geometry';
import type { SpriteName } from '../../art/manifest';
import type { BeachView, Pt } from '../../sim/types';
import { hash2 } from '../noise';

/** What stands on a beach: umbrellas and towels by the crowd, a lifeguard and kiosk; on a sold one a fence and loungers. */
type Prop = (name: SpriteName, at: Pt, size: number) => void;
const FENCE_STEP = 38;

export function beachProps(b: BeachView, dry: (p: Pt) => boolean, prop: Prop): void {
  const r = lotRect(b.rect);
  const at = (i: number, k: number): Pt => ({ x: r.x + 10 + hash2(i, b.rect.gx, k) * (r.w - 20), y: r.y + 14 + hash2(i, b.rect.gy, k + 1) * (r.h - 22) });
  if (b.state === 'sold') {
    for (let x = r.x + 6; x < r.x + r.w - 20; x += FENCE_STEP) { prop('prop/beach-fence', { x: x + 21, y: r.y + 12 }, 0.8); prop('prop/beach-fence', { x: x + 21, y: r.y + r.h - 4 }, 0.8); }
    for (let i = 0; i < Math.max(3, Math.floor(r.w / 40)); i++) { const p = at(i, 31); if (dry(p)) prop('prop/lounger', p, 0.75); }
    return;
  }
  if (b.state !== 'public') return;
  const n = Math.min(20, Math.ceil(b.visitors / 2));
  for (let i = 0; i < n; i++) {
    const p = at(i, 41);
    if (!dry(p)) continue;
    prop(i % 3 === 0 ? 'prop/umbrella' : 'prop/towel', p, i % 3 === 0 ? 0.7 : 0.6);
  }
  const a = { x: r.x + r.w - 14, y: r.y + r.h - 6 };
  if (dry(a)) prop('prop/lifeguard', a, 0.8);
  const k = { x: r.x + 24, y: r.y + r.h - 6 };
  if (dry(k)) prop('prop/beach-kiosk', k, 0.8);
  const s = { x: r.x + r.w / 2, y: r.y + r.h - 4 };
  if (dry(s)) prop('prop/surf-rack', s, 0.7);
}
