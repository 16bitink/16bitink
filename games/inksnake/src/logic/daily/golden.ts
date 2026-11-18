import type { LevelDef } from '../../level/types';
import { preySpec, type Prey, type PreyKind, type PreySpec } from '../prey';
import { gapeOf, SNAKE_SPECS } from '../species';
import { dist, type Pt } from '../vec';
import { GOLDEN } from './params';

/**
 * The golden goal's prey: the level's quickest prey the snake can swallow
 * whole at the start, runners before hoppers (a mouse on the farm).
 */
export function goldenKind(level: LevelDef): PreyKind {
  const gape = gapeOf(SNAKE_SPECS[level.snake].width, SNAKE_SPECS[level.snake]);
  const fits = level.prey.map((p) => p.kind).filter((k) => preySpec(k).gait !== 'still' && preySpec(k).size <= gape);
  // Runners first (a hop's speed is its leap's, not its run's).
  const runners = fits.filter((k) => preySpec(k).gait === 'scurry');
  const kinds = runners.length ? runners : fits;
  return kinds.reduce<PreyKind | null>((best, k) => (!best || preySpec(k).speed > preySpec(best).speed ? k : best), null) ?? level.prey[0]!.kind;
}

/** A golden prey's spec: it sees the snake from further off. */
export function goldenSpec(spec: PreySpec): PreySpec {
  return { ...spec, fear: spec.fear * GOLDEN.fear };
}

/**
 * After its own step: a golden prey on the run heads for the nearest cover
 * that isn't towards the snake; in cover it sits tight (back where it was)
 * until the head comes close.
 */
export function hideInCover(p: Prey, before: Pt, level: LevelDef, head: Pt): void {
  const covers = level.cover ?? [];
  if (!covers.length || p.mode === 'caught' || p.mode === 'appear' || p.mode === 'hidden') return;
  const inside = covers.find((c) => dist(before, c) < c.r * 0.6);
  if (inside && dist(head, before) > GOLDEN.bolt) {
    p.x = before.x;
    p.y = before.y;
    p.speed = 0;
    return;
  }
  if (p.mode !== 'flee' || inside) return;
  const away = { x: p.x - head.x, y: p.y - head.y };
  let best: { x: number; y: number } | null = null;
  let bd: number = GOLDEN.cover;
  for (const c of covers) {
    const d = dist(p, c);
    const towardSnake = (c.x - p.x) * away.x + (c.y - p.y) * away.y < -0.2 * d * Math.hypot(away.x, away.y);
    if (d < bd && !towardSnake) {
      bd = d;
      best = c;
    }
  }
  if (!best) return;
  // Its run turned towards the cover, as fast as it was going.
  const step = dist(p, before);
  const a = Math.atan2(best.y - before.y, best.x - before.x);
  p.heading = a;
  p.x = before.x + Math.cos(a) * step;
  p.y = before.y + Math.sin(a) * step;
}
