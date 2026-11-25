import type { Enemy, StrikeMark } from './enemyTypes';
import type { Snake } from './snake';
import { dist } from './vec';

/** An enemy a strike works on right now: the view rings it in green. */
export interface Opening {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  /** A strike that brings the head within this lands, px. */
  readonly r: number;
  /** A strike now, straight ahead, would land. */
  readonly ready: boolean;
}

/**
 * Every enemy open to a strike, for the view. One that's open only for a
 * moment (a boss off balance, a hawk on the ground) shows wherever the snake
 * is; one that's always open shows only once a lunge could reach it.
 */
export function openings(enemies: readonly Enemy[], snake: Snake): Opening[] {
  return enemies.flatMap((e) => {
    const mark = e.away ? null : e.strikeMark?.(snake) ?? null;
    if (!mark || (!mark.moment && dist(snake.head, mark) > mark.r + snake.lunge)) return [];
    return [{ id: e.id, x: mark.x, y: mark.y, r: mark.r, ready: canStrike(snake) && onLine(snake, mark) }];
  });
}

function canStrike(snake: Snake): boolean {
  return snake.mode === 'move' && (snake.striking || snake.strikeRest <= 0);
}

/** Whether a lunge along the snake's heading passes within the mark. */
function onLine(snake: Snake, mark: StrikeMark): boolean {
  const h = snake.head;
  const ux = Math.cos(snake.heading);
  const uy = Math.sin(snake.heading);
  const along = Math.max(0, Math.min(snake.lunge, (mark.x - h.x) * ux + (mark.y - h.y) * uy));
  return dist({ x: h.x + ux * along, y: h.y + uy * along }, mark) < mark.r;
}
