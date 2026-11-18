import type { LevelDef } from '../../level/types';
import { RivalSnake, type RivalSpec } from '../enemies/rival';
import type { ChapterRules } from '../enemyTypes';
import { RIVAL } from '../daily/params';
import { SNAKE_SPECS } from '../species';

/**
 * The daily's own enemies (docs/inksnake-daily.md): the Rival rule's snake,
 * the player's own species after the same prey, in any place. A touch
 * narrower and slower, so it bites only once it has eaten well (heads
 * meeting: the bigger snake bites).
 */
function rivalSpec(level: LevelDef): RivalSpec {
  const me = SNAKE_SPECS[level.snake];
  return {
    body: { ...me, name: `rival ${me.name}`, width: me.width * RIVAL.width, speed: me.speed * RIVAL.speed, big: 'none' },
    length: Math.round(level.length * RIVAL.length), hunts: 0, cause: 'bitten', eatsPrey: true, respawn: 0, points: 0,
  };
}

export const DAILY_RULES_ENEMIES: ChapterRules = {
  enemies: {
    rival: {
      make: (id, def, level, i) => new RivalSnake(id, 'rival', (def.from ?? RIVAL.from) + i * 8, rivalSpec(level), level.snake),
      text: {
        name: 'A rival snake', card: 'A rival wants your food', hint: 'A rival snake! It eats your prey',
        tip: 'The rival grows as it eats: get to the food first, and keep clear of its head once it\'s bigger than you.',
        coach: { mouse: 'A rival snake is after your food: get there first!', touch: 'A rival snake is after your food: get there first!' },
      },
    },
  },
  hurts: { bitten: { title: 'Bitten…', word: 'Bitten!' } },
};
