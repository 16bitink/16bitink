import type { Pt } from '../sim/types';

/**
 * The angle the city is seen from, and the only place that knows it. A plan
 * point (x, y) at height z is drawn at (x, y * TILT - z * RISE): the ground
 * keeps its true shape east to west and is squashed north to south.
 * In dev, ?tilt=0.78&rise=0.62 overrides it so angles can be compared.
 */
const DEFAULT_TILT = 0.87;
const DEFAULT_RISE = 0.5;
const LIMITS = { min: 0.2, max: 1 } as const;

/** A number from the page's query, when it is there and sane. */
export function queryNumber(search: string, key: string, fallback: number): number {
  const raw = new URLSearchParams(search).get(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= LIMITS.min && n <= LIMITS.max ? n : fallback;
}

const search = typeof location === 'undefined' ? '' : location.search;
export const TILT = queryNumber(search, 'tilt', DEFAULT_TILT);
export const RISE = queryNumber(search, 'rise', DEFAULT_RISE);

/** Plan to scene (the space the camera looks at). */
export const projectX = (x: number): number => x;
export const projectY = (y: number, z = 0): number => y * TILT - z * RISE;
export const project = (p: Pt, z = 0): Pt => ({ x: p.x, y: projectY(p.y, z) });

/** Scene to plan, for a point known to be at height z. */
export const unproject = (p: Pt, z = 0): Pt => ({ x: p.x, y: (p.y + z * RISE) / TILT });

/** A plan heading as it looks on the tilted ground. */
export const projectAngle = (a: number): number => Math.atan2(Math.sin(a) * TILT, Math.cos(a));
