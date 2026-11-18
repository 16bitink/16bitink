import type { SnakeId } from '../../logic/species';
import type { SnakeArt } from '../types';
import { CHAPTER_SNAKES_ART, RIVAL_ART } from '../chapters/index';
import { CORN } from './corn';
import { CANDYCANE, RAINBOWBOA } from './eventSnakes';
import { BLACKHOGNOSE, EARTHSNAKE, GOLDENTREE, GREENPYTHON, ROSYBOA, YELLOWSEA } from './eventSnakesWild';

/** Each player snake, painted; every snake is painted; an unknown key falls back to the corn snake. */
const SNAKE_ART: Partial<Record<SnakeId, SnakeArt>> = { corn: CORN, ...CHAPTER_SNAKES_ART, candycane: CANDYCANE, rainbowboa: RAINBOWBOA,
  goldentree: GOLDENTREE, rosyboa: ROSYBOA, greenpython: GREENPYTHON, earthsnake: EARTHSNAKE, yellowsea: YELLOWSEA, blackhognose: BLACKHOGNOSE,
};

/**
 * A snake's drawings by art key: a player species, or a rival snake's kind
 * (the corn snake's when not painted yet).
 */
export function snakeArt(key: SnakeId | string): SnakeArt {
  return SNAKE_ART[key as SnakeId] ?? RIVAL_ART[key] ?? CORN;
}

/** Whether `key` is a rival snake's (drawn as a snake, not a sprite). */
export function isRivalArt(key: string): boolean {
  return key in RIVAL_ART;
}
