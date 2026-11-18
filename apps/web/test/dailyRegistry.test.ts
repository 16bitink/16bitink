import { describe, expect, it } from 'vitest';
import { DAILY_GAMES } from '../src/data/dailies';
import { findGame } from '../src/data/games';
import { DAILY_CONTENT } from '../src/games/daily.server';

describe('daily registries', () => {
  it('have the same games, and each is a playable catalog game', () => {
    expect(Object.keys(DAILY_CONTENT).sort()).toEqual(DAILY_GAMES.map((g) => g.slug).sort());
    for (const g of DAILY_GAMES) expect(findGame(g.slug)?.status).toBe('playable');
  });
});
