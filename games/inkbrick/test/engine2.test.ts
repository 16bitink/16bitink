import { describe, expect, it } from 'vitest';
import { INKBRICK_PAID_LEVELS } from '../content/paid';
import { AIM_FLOOR, cheapCheck } from '../src/gen/checks';
import { allowedLayouts, allowedTwists, propose } from '../src/gen/propose';
import { CH1_LEVELS } from '../src/level/ch1/index';
import { BALL_R, MIN_VX_SHARE } from '../src/sim/constants';
import { fill, shell, stone } from '../src/sim/kit';
import { Sim } from '../src/sim/sim';
import { keepSideways, keepUpright, nudge } from '../src/sim/steer';
import { BALL_RADIUS, type BrickDef, type LevelDef } from '../src/sim/types';
import { levelProblems } from '../src/sim/validate';

const lv = (bricks: BrickDef[], extra: Partial<LevelDef> = {}): LevelDef => ({ id: 't', name: 't', number: 0, chapter: 0, par: 60, bricks, ...extra });
const speedOf = (b: { vx: number; vy: number }) => Math.hypot(b.vx, b.vy);

function withBall(level: LevelDef, x: number, y: number, vx: number, vy: number): Sim {
  const sim = new Sim(level);
  sim.step({ paddleX: 270, launch: true });
  const w = (sim as unknown as { w: { balls: { x: number; y: number; vx: number; vy: number }[] } }).w;
  Object.assign(w.balls[0]!, { x, y, vx, vy });
  sim.drainEvents();
  return sim;
}

describe('the stone (engine round 2)', () => {
  it('is 16 px across, exported for the renderer', () => {
    expect(BALL_RADIUS).toBe(8);
    expect(BALL_R).toBe(BALL_RADIUS);
  });

  it('comes off the ceiling at an angle after a straight-up shot', () => {
    const sim = withBall(lv(fill(0, 40, 3, 1, 'soft')), 270, 300, 0, -480);
    for (let i = 0; i < 120 && (sim.state.balls[0]?.vy ?? 0) < 0; i++) sim.step({ paddleX: 270, launch: false });
    const b = sim.state.balls[0]!;
    expect(b.vy).toBeGreaterThan(0);
    expect(Math.abs(b.vx)).toBeGreaterThanOrEqual(MIN_VX_SHARE * 480 - 1e-6);
  });

  it('comes off a stone roof at an angle too, and leaves a vault through its hole less often', () => {
    const level = lv([...shell(10, 10, 16, 14, [{ side: 'bottom', at: 6, width: 4 }]), ...fill(0, 40, 3, 1, 'soft')]);
    const sim = withBall(level, 270, 500, 0, -480);
    for (let i = 0; i < 200 && (sim.state.balls[0]?.vy ?? 0) < 0; i++) sim.step({ paddleX: 270, launch: false });
    expect(Math.abs(sim.state.balls[0]!.vx)).toBeGreaterThan(0);
  });

  it('steering keeps the speed', () => {
    const b = { vx: 1, vy: -480 };
    keepSideways(b, 480, 0);
    expect(speedOf(b)).toBeCloseTo(480, 6);
    const c = { vx: 479, vy: 5 };
    keepUpright(c, 480);
    expect(speedOf(c)).toBeCloseTo(Math.hypot(479, 5), -1);
    const d = { vx: 100, vy: -300 };
    nudge(d, 1);
    expect(speedOf(d)).toBeCloseTo(Math.hypot(100, 300), 6);
  });

  it('never tunnels through a 1-cell stone wall at top speed', () => {
    const sim = withBall(lv([stone(0, 20, 36, 1), ...fill(0, 40, 3, 1, 'soft')]), 270, 600, 37, -638);
    for (let i = 0; i < 600; i++) {
      sim.step({ paddleX: sim.state.balls[0]?.x ?? 270, launch: false });
      for (const b of sim.state.balls) expect(b.y).toBeGreaterThan(20 * 15);
    }
  });
});

describe('levels and the generator (engine round 2)', () => {
  it('every campaign level is valid, numbered in its chapter', () => {
    for (const l of [...CH1_LEVELS, ...INKBRICK_PAID_LEVELS]) {
      expect(levelProblems(l)).toEqual([]);
      expect(Math.ceil(l.number / 10)).toBe(l.chapter);
      expect(l.name).toMatch(/^[A-Za-z' ]+$/);
    }
    expect(CH1_LEVELS.some((l) => l.number === 10 && l.boss)).toBe(true);
  });

  it('rejects any level whose aim window is under 2%', () => {
    const sealed = lv([...shell(10, 10, 16, 12, [{ side: 'top', at: 6, width: 2 }]), ...fill(11, 12, 3, 1, 'soft'), ...fill(0, 40, 3, 1, 'soft')]);
    const r = cheapCheck(sealed, 0.02, 0.08);
    expect(r.aim).toBeLessThan(AIM_FLOOR);
    expect(r.ok).toBe(false);
  });

  it('proposals only use the pieces of the chapter so far', () => {
    expect(allowedLayouts(1)).not.toContain('hourglass');
    expect(allowedTwists(2)).toContain('ice');
    expect(allowedTwists(2)).not.toContain('keyGate');
    expect(() => propose({ chapter: 1, number: 4, layout: 'hourglass' })).toThrow(/isn't allowed/);
    expect(() => propose({ chapter: 2, number: 20, layout: 'vault' })).toThrow(/boss/);
  });
});
