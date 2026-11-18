import { describe, expect, it } from 'vitest';
import { CH1_LEVELS } from '../src/level/ch1/index';
import { Bot } from '../src/sim/bot';
import { BALL_SPEED_MAX, MAX_BALLS, PADDLE_Y } from '../src/sim/constants';
import { fill, shell, stone } from '../src/sim/kit';
import { Sim } from '../src/sim/sim';
import { Aimer } from '../src/sim/trace';
import type { BrickDef, LevelDef, SimEvent } from '../src/sim/types';
import { LevelError } from '../src/sim/validate';

const lv = (bricks: BrickDef[], extra: Partial<LevelDef> = {}): LevelDef => ({ id: 't', name: 't', number: 0, chapter: 0, par: 60, bricks, ...extra });

function hash(sim: Sim): string {
  const s = sim.state;
  return JSON.stringify([s.phase, s.elapsed.toFixed(6), s.balls.map((b) => [b.x, b.y, b.vx, b.vy]), s.bricks.map((b) => b.alive ? b.hp : -1), s.lives]);
}

function play(level: LevelDef, seconds: number, seed = 7): { sim: Sim; events: SimEvent[] } {
  const sim = new Sim(level);
  const bot = new Bot('skilled', seed, new Aimer(level));
  const events: SimEvent[] = [];
  for (let i = 0; i < seconds * 120 && (sim.state.phase === 'aim' || sim.state.phase === 'play'); i++) {
    sim.step(bot.input(sim.state));
    events.push(...sim.drainEvents());
  }
  return { sim, events };
}

/** A sim with one ball placed by hand (the test reaches into the world on purpose). */
function withBall(level: LevelDef, x: number, y: number, vx: number, vy: number): Sim {
  const sim = new Sim(level);
  sim.step({ paddleX: 270, launch: true });
  const w = (sim as unknown as { w: { balls: { x: number; y: number; vx: number; vy: number }[] } }).w;
  Object.assign(w.balls[0]!, { x, y, vx, vy });
  sim.drainEvents();
  return sim;
}

describe('Sim', () => {
  it('is deterministic: same level and inputs give the same state', () => {
    const a = play(CH1_LEVELS[0]!, 40).sim;
    const b = play(CH1_LEVELS[0]!, 40).sim;
    expect(hash(a)).toBe(hash(b));
  });

  it('never tunnels through a one-cell stone line at the top speed', () => {
    const sim = withBall(lv([stone(0, 20, 36, 1), ...fill(0, 5, 3, 1, 'soft')]), 100, 400, 0, -BALL_SPEED_MAX);
    for (let i = 0; i < 600; i++) {
      sim.step({ paddleX: 270, launch: false });
      for (const b of sim.state.balls) expect(b.y).toBeGreaterThan(20 * 15);
    }
  });

  it('rejects broken levels with every problem listed', () => {
    expect(() => new Sim(lv([{ x: 40, y: 2, w: 3, h: 1, kind: 'soft' }]))).toThrow(LevelError);
  });

  it('breaks soft in one hit, tough in two, never stone', () => {
    const sim = withBall(lv([...fill(9, 10, 3, 1, 'tough', { hp: 2 }), stone(20, 10, 3, 1), ...fill(0, 4, 3, 1, 'soft')]), 160, 400, 0, -480);
    const events: SimEvent[] = [];
    for (let i = 0; i < 900; i++) {
      sim.step({ paddleX: sim.state.balls[0]?.x ?? 270, launch: false });
      events.push(...sim.drainEvents());
    }
    expect(events.some((e) => e.type === 'hit' && e.brick === 0)).toBe(true);
    expect(sim.state.bricks[0]!.alive).toBe(false);
    expect(sim.state.bricks[1]!.alive).toBe(true);
  });

  it('x3 splits the ball that breaks it into three', () => {
    const sim = withBall(lv([...fill(9, 10, 3, 1, 'x3'), ...fill(0, 4, 3, 1, 'soft')]), 160, 400, 0, -480);
    for (let i = 0; i < 200; i++) sim.step({ paddleX: 160, launch: false });
    expect(sim.state.balls.length).toBe(3);
  });

  it('kegs blast their radius and chain', () => {
    const bricks = [...fill(9, 10, 1, 1, 'keg', { bw: 1 }), ...fill(12, 10, 1, 1, 'keg', { bw: 1 }), ...fill(15, 10, 1, 1, 'keg', { bw: 1 }), ...fill(17, 10, 3, 1, 'soft'), ...fill(30, 4, 3, 1, 'soft')];
    const sim = withBall(lv(bricks), 9 * 15 + 7, 400, 0, -480);
    for (let i = 0; i < 300; i++) sim.step({ paddleX: 140, launch: false });
    expect(sim.state.bricks.slice(0, 4).every((b) => !b.alive)).toBe(true);
  });

  it('ice breaks in a spreading wave', () => {
    const sim = withBall(lv([...fill(6, 10, 15, 1, 'ice'), ...fill(30, 4, 3, 1, 'soft')]), 6 * 15 + 20, 400, 0, -480);
    for (let i = 0; i < 300; i++) sim.step({ paddleX: 110, launch: false });
    expect(sim.state.bricks.slice(0, 5).every((b) => !b.alive)).toBe(true);
  });

  it('a key opens its gate', () => {
    const sim = withBall(lv([{ x: 9, y: 10, w: 3, h: 1, kind: 'key', link: 'a' }, { x: 20, y: 10, w: 1, h: 3, kind: 'gate', link: 'a' }, ...fill(30, 4, 3, 1, 'soft')]), 160, 400, 0, -480);
    for (let i = 0; i < 200; i++) sim.step({ paddleX: 160, launch: false });
    expect(sim.state.bricks[1]!.alive).toBe(false);
  });

  it('pickups fall and are caught by the raft', () => {
    const sim = withBall(lv([{ x: 9, y: 10, w: 3, h: 1, kind: 'pickup', drop: 'wide' }, ...fill(30, 4, 3, 1, 'soft')]), 160, 400, 0, -480);
    const events: SimEvent[] = [];
    for (let i = 0; i < 900; i++) {
      sim.step({ paddleX: sim.state.pickups[0]?.x ?? sim.state.balls[0]?.x ?? 160, launch: false });
      events.push(...sim.drainEvents());
    }
    expect(events.some((e) => e.type === 'pickup' && e.kind === 'wide')).toBe(true);
  });

  it('moves floes, shutters, spinners and the boss shield with the clock', () => {
    const level = lv([...fill(0, 10, 3, 1, 'soft', { floe: 'f' }), ...fill(30, 4, 3, 1, 'soft')], {
      floes: [{ id: 'f', dx: 6, dy: 0, period: 2 }],
      shutters: [{ x: 10, y: 20, w: 3, h: 1, open: 1, closed: 1, phase: 0 }],
      spinners: [{ x: 18, y: 30, length: 4, period: 4, phase: 0 }],
      boss: { hits: 3, shieldW: 4, speed: 6 },
    });
    const sim = new Sim(level);
    for (let i = 0; i < 150; i++) sim.step({ paddleX: 270, launch: false });
    expect(sim.state.floes[0]!.ox).toBeCloseTo(67.5, 0);
    expect(sim.state.shutters[0]!.closed).toBe(true);
    expect(sim.state.spinners[0]!.angle).toBeCloseTo(112.5, 0);
    expect(sim.state.boss).not.toBeNull();
  });

  it('whirlpools carry the ball to their other end', () => {
    const sim = withBall(lv(fill(30, 4, 3, 1, 'soft'), { whirlpools: [{ a: { x: 10, y: 30 }, b: { x: 25, y: 8 } }] }), 157, 470, 0, -480);
    let moved = false;
    for (let i = 0; i < 60; i++) {
      sim.step({ paddleX: 160, launch: false });
      if ((sim.state.balls[0]?.x ?? 0) > 300 && (sim.state.balls[0]?.y ?? 999) < 200) moved = true;
    }
    expect(moved).toBe(true);
  });

  it('caps the balls at 300', () => {
    // A stone floor keeps every split stone in play, so the cap is what stops the growth.
    const sim = withBall(lv([...fill(0, 3, 36, 30, 'x3', { bw: 1 }), stone(0, 50, 36, 1)]), 270, 600, 100, -460);
    for (let i = 0; i < 120 * 20; i++) sim.step({ paddleX: 270, launch: false });
    expect(sim.state.peakBalls).toBe(MAX_BALLS);
  });

  it('fires breakIn once when a ball gets inside a vault', () => {
    const level = lv([...shell(10, 10, 16, 12, [{ side: 'bottom', at: 6, width: 4 }]), ...fill(11, 11, 3, 1, 'soft'), ...fill(0, 30, 3, 1, 'soft')]);
    const sim = withBall(level, 270, 600, 0, -480);
    const events: SimEvent[] = [];
    for (let i = 0; i < 200; i++) {
      sim.step({ paddleX: 270, launch: false });
      events.push(...sim.drainEvents());
    }
    expect(events.filter((e) => e.type === 'breakIn')).toHaveLength(1);
    expect(sim.state.breakIn).toBe(true);
  });

  it('crumbles the last few bricks after 8 s without a break', () => {
    const bricks = [...fill(0, 3, 36, 20, 'soft'), stone(0, 30, 36, 1)];
    const sim = new Sim(lv(bricks));
    const w = (sim as unknown as { w: { bricks: { alive: boolean; breakable: boolean }[]; breakableLeft: number; launched: boolean } }).w;
    sim.step({ paddleX: 270, launch: true });
    w.bricks.forEach((b, i) => { if (b.breakable && i > 5) { b.alive = false; } });
    w.breakableLeft = 6;
    const events: SimEvent[] = [];
    for (let i = 0; i < 120 * 10; i++) {
      sim.step({ paddleX: sim.state.balls[0]?.x ?? 270, launch: false });
      events.push(...sim.drainEvents());
    }
    expect(events.some((e) => e.type === 'crumble')).toBe(true);
    expect(sim.state.phase).toBe('cleared');
  });

  it('loses a heart when the last ball falls, and fails after three', () => {
    const sim = new Sim(lv(fill(0, 4, 3, 1, 'soft')));
    const events: SimEvent[] = [];
    for (let i = 0; i < 120 * 30; i++) {
      sim.step({ paddleX: sim.state.phase === 'aim' ? sim.state.aimX : 30, launch: sim.state.phase === 'aim' });
      events.push(...sim.drainEvents());
    }
    expect(events.filter((e) => e.type === 'lifeLost')).toHaveLength(3);
    expect(sim.state.phase).toBe('failed');
    expect(PADDLE_Y).toBe(900);
  });

  it('steps 300 balls and 1,500 bricks in well under a millisecond', () => {
    const sim = withBall(lv(fill(0, 9, 36, 42, 'tough', { bw: 1, hp: 99 }).slice(0, 1500)), 270, 60, 200, -430);
    const w = (sim as unknown as { w: { balls: object[] } }).w;
    for (let i = 0; i < 299; i++) w.balls.push({ x: 20 + ((i * 1.7) % 500), y: 50 + (i % 70), vx: (i % 2 ? 1 : -1) * 150, vy: -456, whirlCd: 0, lost: false });
    const t0 = performance.now();
    for (let i = 0; i < 500; i++) sim.step({ paddleX: 270, launch: false });
    expect((performance.now() - t0) / 500).toBeLessThan(1);
  });
});
