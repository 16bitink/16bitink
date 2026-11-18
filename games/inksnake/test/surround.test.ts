import { describe, expect, it } from 'vitest';
import { levelById } from '../src/level/levels';
import { BOARD, PLACES, type LevelDef } from '../src/level/types';
import { planSurround, SURROUND, surroundSeed } from '../src/art/rim/surroundPlan';
import { RIM_STYLES } from '../src/art/rim/rimStyles';
import { createRng } from '../src/logic/rng';

const level = (id: string): LevelDef => levelById(id)!;

describe('the surround past the border', () => {
  it('is seeded by the level, the same on every retry', () => {
    const a = planSurround(level('farm-3'), 'farm');
    const b = planSurround(level('farm-3'), 'farm');
    expect(b).toEqual(a);
    expect(surroundSeed('farm-3')).toBe(surroundSeed('farm-3'));
    expect(surroundSeed('farm-3')).not.toBe(surroundSeed('farm-4'));
    expect(planSurround(level('farm-4'), 'farm')).not.toEqual(a);
  });

  it('keeps scenery off the board and its border, inside the painted surround', () => {
    for (const place of PLACES) {
      const plan = planSurround({ id: `${place}-x`, solids: [{ kind: 'circle', look: 'rock', x: 0, y: 0, r: 10 }], cover: [{ look: 'grass', x: 0, y: 0, r: 20 }] }, place);
      expect(plan.solids.length).toBeGreaterThan(4);
      for (const s of plan.solids) {
        const [x, y] = s.kind === 'circle' ? [s.x, s.y] : [s.x + s.w / 2, s.y + s.h / 2];
        const inside = x > -30 && x < BOARD.w + 30 && y > -30 && y < BOARD.h + 30;
        expect(inside).toBe(false);
        expect(x).toBeGreaterThan(-SURROUND.x);
        expect(x).toBeLessThan(BOARD.w + SURROUND.x);
        expect(y).toBeGreaterThan(-SURROUND.y);
        expect(y).toBeLessThan(BOARD.h + SURROUND.y);
      }
    }
  });

  it('lays a wall all round the board in every place, the same each time', () => {
    for (const place of PLACES) {
      const a = RIM_STYLES[place](createRng(5));
      const b = RIM_STYLES[place](createRng(5));
      expect(a.map((p) => p.box)).toEqual(b.map((p) => p.box));
      // Every stretch of every edge is covered by some piece.
      for (let t = 0; t <= 1; t += 0.05) {
        for (const [x, y] of [[t * BOARD.w, -4], [t * BOARD.w, BOARD.h + 4], [-4, t * BOARD.h], [BOARD.w + 4, t * BOARD.h]] as const) {
          expect(a.some((p) => x >= p.box.x0 && x <= p.box.x1 && y >= p.box.y0 && y <= p.box.y1)).toBe(true);
        }
      }
    }
  });
});
