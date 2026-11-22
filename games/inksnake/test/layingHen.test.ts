import { describe, expect, it } from 'vitest';
import { CHAPTER_1 } from '../src/level/chapter1';
import { isLayer } from '../src/logic/enemies/layingHen';
import { dist } from '../src/logic/vec';
import { World } from '../src/logic/world';

const LEVEL_1 = CHAPTER_1[0]!;
const DT = 1 / 60;

describe('the laying hen (farm level 1)', () => {
  it('starts the level with eggs in its nests and the hen on the board', () => {
    const w = new World(LEVEL_1);
    expect(w.prey.filter((p) => p.kind === 'egg')).toHaveLength(3);
    expect(w.enemies.filter(isLayer)).toHaveLength(1);
  });

  it('settles beside an empty nest, and the next egg is laid there', () => {
    const w = new World(LEVEL_1);
    const hen = w.enemies.find(isLayer)!;
    const idle = { toward: null, face: null, strike: false };
    for (let i = 0; i < 60 * 8 && !hen.layAt; i++) w.step(idle, DT);
    const nest = hen.layAt;
    expect(nest).not.toBeNull();
    // Take an egg away by hand: the respawn should land in the hen's nest.
    const egg = w.prey.find((p) => p.kind === 'egg')!;
    w.prey.splice(w.prey.indexOf(egg), 1);
    (w as unknown as { respawn: { kind: string; t: number }[] }).respawn.push({ kind: 'egg', t: 0 });
    w.step(idle, DT);
    expect(w.prey.some((p) => p.nest !== null && dist(p.nest, nest!) < 1)).toBe(true);
  });

  it('never pecks: the snake keeps its length while lying by her', () => {
    const w = new World(LEVEL_1);
    const hen = w.enemies.find(isLayer)!;
    const start = w.snake.length;
    for (let i = 0; i < 60 * 6; i++) w.step({ toward: { x: hen.x, y: hen.y }, face: null, strike: false }, DT);
    expect(w.snake.length).toBeGreaterThanOrEqual(start);
    expect(w.lives).toBe(w.maxLives);
  });
});
