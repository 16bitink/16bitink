import { relativeOf, type SnakeId } from '../../logic/species';
import type { SnakeArt } from '../types';
import { CHAPTER_SNAKES_ART, RIVAL_ART } from '../chapters/index';
import { CORN } from './corn';
import { CANDYCANE, RAINBOWBOA } from './eventSnakes';

/** Each player snake, painted; snakes not painted yet fall back to the corn snake. */
const SNAKE_ART: Partial<Record<SnakeId, SnakeArt>> = { corn: CORN, ...CHAPTER_SNAKES_ART, candycane: CANDYCANE, rainbowboa: RAINBOWBOA };

/**
 * A snake's drawings by art key: a player species, or a rival snake's kind
 * (the corn snake's when not painted yet).
 *
 * TODO(event snakes): goldentree, rosyboa, greenpython, earthsnake,
 * yellowsea and blackhognose wear their relative's drawings
 * (EVENT_RELATIVE in logic/species.ts) until their own are painted; build
 * each from eventSnakes.ts's worked examples.
 */
export function snakeArt(key: SnakeId | string): SnakeArt {
  return SNAKE_ART[key as SnakeId] ?? SNAKE_ART[relativeOf(key as SnakeId)] ?? RIVAL_ART[key] ?? CORN;
}

/** Whether `key` is a rival snake's (drawn as a snake, not a sprite). */
export function isRivalArt(key: string): boolean {
  return key in RIVAL_ART;
}
