/** Goals, rules of the day and the new pieces (docs/inkbrick-design.md "Variety", 2026-11-18). */
import { describe, expect, it } from 'vitest';
import { Bot } from '../src/sim/bot';
import { BALL_R, BALL_SPEED, PADDLE_Y, STICKY_HOLD, TINY_RAFT_W, WIDE_RAFT_W } from '../src/sim/constants';
import { fill, shell, stone } from '../src/sim/kit';
import { Sim } from '../src/sim/sim';
import { Aimer, traceInside, traceWorld } from '../src/sim/trace';
import type { BrickDef, LevelDef, SimEvent, SimInput } from '../src/sim/types';
import { LevelError } from '../src/sim/validate';

const lv = (bricks: BrickDef[], extra: Partial<LevelDef> = {}): LevelDef => ({ id: 't', name: 't', number: 0, chapter: 0, par: 60, bricks, ...extra });
const TOP = fill(30, 4, 6, 1, 'soft');
type W = { balls: { x: number; y: number; vx: number; vy: number }[] };

function withBall(level: LevelDef, x: number, y: number, vx: number, vy: number): Sim {
  const sim = new Sim(level);
  sim.step({ paddleX: 270, launch: true });
  const w = (sim as unknown as { w: W }).w;
  w.balls.length = 1;
  Object.assign(w.balls[0]!, { x, y, vx, vy });
  sim.drainEvents();
  return sim;
}

function run(sim: Sim, steps: number, input: (s: Sim) => SimInput = () => ({ paddleX: 270, launch: false })): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < steps && (sim.state.phase === 'aim' || sim.state.phase === 'play'); i++) {
    sim.step(input(sim));
    out.push(...sim.drainEvents());
  }
  return out;
}
const follow = (sim: Sim): SimInput => ({ paddleX: sim.state.balls[0]?.x ?? 270, launch: true });

describe('goals', () => {
  it('pearls: a stone passes through each pearl, the last one wins', () => {
    const pearls = [{ x: 10, y: 20 }, { x: 10, y: 16 }, { x: 10, y: 12 }];
    const sim = withBall(lv(TOP, { goal: 'pearls', pearls }), 10.5 * 15, 400, 0, -480);
    const ev = run(sim, 400);
    expect(ev.filter((e) => e.type === 'pearl').length).toBe(3);
    expect(sim.state.pearlsTaken).toBe(3);
    expect(sim.state.phase).toBe('cleared');
    expect(sim.state.pearlsAt).toBeGreaterThan(0);
    expect(sim.state.breakableLeft).toBe(TOP.length);
  });

  it('rescue: touching the friend frees it and wins at once', () => {
    const sim = withBall(lv(TOP, { goal: 'rescue', rescue: { x: 10, y: 14, who: 'pup' } }), 10.5 * 15, 400, 0, -480);
    const ev = run(sim, 400);
    expect(ev.some((e) => e.type === 'rescued')).toBe(true);
    expect(sim.state.phase).toBe('cleared');
    expect(sim.state.rescuedAt).toBeGreaterThan(0);
  });

  it('Few Stones: each launch spends a stone, no hearts; the share broken decides', () => {
    const level = lv([...fill(0, 4, 36, 2, 'soft')], { goal: 'stones', stones: 3, need: 0.9 });
    const sim = new Sim(level);
    expect(sim.state.stonesLeft).toBe(3);
    // Never move the raft out of the way: every stone falls.
    const ev = run(sim, 120 * 60, (s) => ({ paddleX: s.state.balls[0]!.x < 270 ? 500 : 40, launch: true }));
    expect(ev.filter((e) => e.type === 'stoneSpent').length).toBe(3);
    expect(sim.state.heartsLost).toBe(0);
    expect(sim.state.stonesLeft).toBe(0);
    expect(sim.state.phase).toBe(sim.state.brokenShare >= 0.9 ? 'cleared' : 'failed');
  });

  it('Rising Tide: the field sinks a cell per `every` s of play; a flood costs a heart and lifts it 6', () => {
    const wallL = stone(0, 10, 1, 30);
    const level = lv([wallL, ...fill(3, 30, 30, 1, 'tough', { hp: 9 }), stone(10, 20, 6, 1)], { goal: 'tide', tide: { every: 2, line: 33 } });
    const sim = new Sim(level);
    run(sim, 1, follow);
    const ev = run(sim, 120 * 5 + 2, follow);
    expect(ev.filter((e) => e.type === 'tideStep').length).toBe(2);
    expect(sim.state.tideOffset).toBe(2);
    expect(sim.state.bricks[0]!.y).toBe(10 * 15);
    expect(sim.state.bricks[1]!.y).toBe(32 * 15);
    expect(sim.state.bricks.at(-1)!.y).toBe(22 * 15);
    const flood = run(sim, 120 * 2 + 2, follow);
    expect(flood.some((e) => e.type === 'tideFlood')).toBe(true);
    expect(sim.state.heartsLost).toBe(1);
    expect(sim.state.tideOffset).toBe(0);
  });

  it('rejects goals without their fields', () => {
    expect(() => new Sim(lv(TOP, { goal: 'rescue' }))).toThrow(LevelError);
    expect(() => new Sim(lv(TOP, { goal: 'pearls', pearls: [{ x: 1, y: 10 }] }))).toThrow(LevelError);
    expect(() => new Sim(lv(TOP, { goal: 'stones', stones: 9, need: 0.5 }))).toThrow(LevelError);
    expect(() => new Sim(lv(TOP, { goal: 'tide', tide: { every: 5, line: 3 } }))).toThrow(LevelError);
    expect(() => new Sim(lv(TOP, { goal: 'pearls', pearls: [{ x: 31, y: 4 }, { x: 1, y: 9 }, { x: 2, y: 9 }] }))).toThrow(LevelError);
  });
});

describe('rules', () => {
  it('speedy, slow, tinyRaft, wideRaft, oneHeart, bigStone, fog set their numbers', () => {
    const s = (rule: LevelDef['rule']) => {
      const sim = new Sim(lv(TOP, { rule }));
      sim.step({ paddleX: 270, launch: false });
      return sim.state;
    };
    expect(s('speedy').speed).toBeCloseTo(BALL_SPEED * 1.25);
    expect(s('slow').speed).toBeCloseTo(BALL_SPEED * 0.85);
    expect(s('tinyRaft').paddle.width).toBe(TINY_RAFT_W);
    expect(s('wideRaft').paddle.width).toBe(WIDE_RAFT_W);
    expect(s('oneHeart').lives).toBe(1);
    expect(s('bigStone').ballRadius).toBeCloseTo(BALL_R * 1.6);
    expect(s('fog').dark).toBe(true);
    expect(s(undefined).dark).toBe(false);
  });

  it('current bends the path sideways and heavy pulls down, the speed kept', () => {
    const c = withBall(lv(TOP, { rule: 'current', ruleDir: -1 }), 270, 600, 0, -480);
    run(c, 60);
    const b = c.state.balls[0]!;
    expect(b.vx).toBeLessThan(-50);
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(480, 6);
    const h = withBall(lv(TOP, { rule: 'heavy' }), 270, 700, 300, -374.7);
    const vy0 = -374.7;
    run(h, 30);
    expect(h.state.balls[0]!.vy).toBeGreaterThan(vy0 + 10);
    expect(Math.hypot(h.state.balls[0]!.vx, h.state.balls[0]!.vy)).toBeCloseTo(480, 6);
  });

  it('sticky: the raft catches the stone, the clock runs, it is thrown after 1.5 s', () => {
    const sim = withBall(lv(TOP, { rule: 'sticky' }), 270, 850, 0, 480);
    const ev = run(sim, 30);
    expect(ev.some((e) => e.type === 'caught')).toBe(true);
    expect(sim.state.caught).toBe(true);
    const t0 = sim.state.elapsed;
    run(sim, Math.round(STICKY_HOLD * 120) - 30);
    expect(sim.state.elapsed - t0).toBeGreaterThan(1);
    run(sim, 40);
    expect(sim.state.caught).toBe(false);
    expect(sim.state.balls[0]!.vy).toBeLessThan(0);
  });

  it('sticky: a tap throws it at once', () => {
    const sim = withBall(lv(TOP, { rule: 'sticky' }), 270, 850, 0, 480);
    run(sim, 30);
    expect(sim.state.caught).toBe(true);
    run(sim, 1, () => ({ paddleX: 260, launch: true }));
    expect(sim.state.caught).toBe(false);
  });

  it('twoStones throws two stones mirrored about straight up', () => {
    const sim = new Sim(lv(TOP, { rule: 'twoStones' }));
    sim.step({ paddleX: 250, launch: true });
    const [a, b] = sim.state.balls;
    expect(sim.state.balls.length).toBe(2);
    expect(a!.vx).toBeCloseTo(-b!.vx, 9);
    expect(a!.vy).toBeCloseTo(b!.vy, 9);
  });

  it('ghost: after a raft hit the stone passes through the first brick it breaks', () => {
    const bricks = [...fill(9, 20, 3, 1, 'soft'), ...fill(9, 15, 3, 1, 'soft'), ...TOP];
    const sim = withBall(lv(bricks, { rule: 'ghost' }), 160, 880, 0, 480);
    run(sim, 200, () => ({ paddleX: 160, launch: false }));
    // Through the first, bounced off the second.
    expect(sim.state.bricks[0]!.alive).toBe(false);
    expect(sim.state.bricks[1]!.alive).toBe(false);
  });
});

describe('new pieces', () => {
  it('a bumper kicks the stone away, the speed kept, with a bump event', () => {
    const sim = withBall(lv(TOP, { bumpers: [{ x: 270, y: 300, r: 20 }] }), 275, 500, 0, -480);
    const ev = run(sim, 80);
    expect(ev.some((e) => e.type === 'bump')).toBe(true);
    const b = sim.state.balls[0]!;
    expect(b.vy).toBeGreaterThan(0);
    expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(480, 6);
    expect(sim.state.bumpers[0]!.kickAt).toBeGreaterThan(0);
  });

  it('a lever is never broken and flips its walls, 0.4 s apart at most', () => {
    const lever: BrickDef = { x: 9, y: 20, w: 3, h: 1, kind: 'lever', link: 'a' };
    const sim = withBall(lv([lever, ...TOP], { flips: [{ x: 20, y: 20, w: 4, h: 1, link: 'a', on: true }] }), 160, 400, 0, -480);
    expect(sim.state.flips[0]!.solid).toBe(true);
    const ev = run(sim, 60);
    expect(ev.filter((e) => e.type === 'lever').length).toBe(1);
    expect(sim.state.flips[0]!.solid).toBe(false);
    expect(sim.state.bricks[0]!.alive).toBe(true);
    expect(sim.state.breakableTotal).toBe(TOP.length);
  });

  it('a lever needs a flip wall with its link', () => {
    expect(() => new Sim(lv([{ x: 9, y: 20, w: 3, h: 1, kind: 'lever', link: 'a' }, ...TOP]))).toThrow(LevelError);
  });

  it('hidden bricks are revealed by their first hit', () => {
    const sim = withBall(lv([{ x: 9, y: 20, w: 3, h: 1, kind: 'tough', hp: 3, hidden: true }, ...TOP]), 160, 400, 0, -480);
    expect(sim.state.bricks[0]!.revealed).toBe(false);
    const ev = run(sim, 60);
    expect(ev.some((e) => e.type === 'reveal' && e.brick === 0)).toBe(true);
    expect(sim.state.bricks[0]!.revealed).toBe(true);
  });

  it('crabs walk their track, are solid, and scuttle faster after a hit', () => {
    const level = lv(TOP, { crabs: [{ y: 25, x0: 8, x1: 20, speed: 4, phase: 0 }] });
    const slow = new Sim(level);
    run(slow, 120);
    const x1 = slow.state.crabs[0]!.x;
    expect(x1).toBeGreaterThan(8 * 15 + 50);
    const sim = withBall(level, 9.5 * 15, 500, 0, -480);
    const ev = run(sim, 120);
    expect(ev.some((e) => e.type === 'crabHit')).toBe(true);
    expect(sim.state.crabs[0]!.x).toBeGreaterThan(x1);
  });

  it('the daily pearl is found by touch and never ends the level', () => {
    const sim = withBall(lv(TOP, { dailyPearl: { x: 10, y: 20 } }), 10.5 * 15, 400, 0, -480);
    const ev = run(sim, 60);
    expect(ev.some((e) => e.type === 'dailyPearl')).toBe(true);
    expect(sim.state.dailyPearlFound).toBe(true);
    expect(sim.state.phase).toBe('play');
  });

  it('armour: reaching a cell its starting shape encloses is the break-in', () => {
    const ring = shell(10, 10, 12, 10, []).map((b) => ({ ...b, kind: 'soft' as const, armour: true }));
    const inside = fill(13, 13, 6, 2, 'soft');
    const sim = withBall(lv([...ring, ...inside, ...TOP]), 16 * 15, 600, 0, -480);
    const ev = run(sim, 600, (s) => ({ paddleX: s.state.balls[0]?.x ?? 270, launch: false }));
    expect(ev.some((e) => e.type === 'breakIn')).toBe(true);
    expect(new Sim(lv([...ring.map((b) => ({ ...b, armour: false })), ...inside, ...TOP])).state.bricks.length).toBe(ring.length + inside.length + TOP.length);
  });
});

describe('determinism with every new piece', () => {
  it('replays the same', () => {
    const level = lv([...fill(0, 6, 36, 4, 'soft'), { x: 3, y: 30, w: 3, h: 1, kind: 'lever', link: 'z' }, { x: 12, y: 14, w: 3, h: 1, kind: 'tough', hidden: true }], {
      rule: 'current', bumpers: [{ x: 200, y: 400, r: 18 }], flips: [{ x: 14, y: 20, w: 6, h: 1, link: 'z', on: true }],
      crabs: [{ y: 36, x0: 4, x1: 28, speed: 5, phase: 0.3 }], dailyPearl: { x: 30, y: 25 },
    });
    const play = () => {
      const sim = new Sim(level);
      const bot = new Bot('decent', 4, new Aimer(level));
      for (let i = 0; i < 120 * 40; i++) sim.step(bot.input(sim.state));
      const s = sim.state;
      return JSON.stringify([s.elapsed, s.balls.map((b) => [b.x, b.vy]), s.breakableLeft, s.crabs.map((c) => c.x), s.flips.map((f) => f.solid)]);
    };
    expect(play()).toBe(play());
    expect(PADDLE_Y).toBe(900);
  });
});

describe('state the renderer reads (2026-11-18)', () => {
  it('marks the held stone on sticky', () => {
    const sim = withBall(lv(TOP, { rule: 'sticky' }), 270, 850, 0, 480);
    run(sim, 30);
    expect(sim.state.balls.filter((b) => b.held).length).toBe(1);
    run(sim, 1, () => ({ paddleX: 260, launch: true }));
    expect(sim.state.balls.some((b) => b.held)).toBe(false);
  });

  it('whirlpools ride the Rising Tide down, and carry the stone from where they are now', () => {
    const level = lv([stone(0, 10, 1, 30), ...fill(3, 20, 30, 1, 'tough', { hp: 9 })], {
      goal: 'tide', tide: { every: 2, line: 40 }, whirlpools: [{ a: { x: 10, y: 30 }, b: { x: 25, y: 8 } }],
    });
    const sim = new Sim(level);
    run(sim, 1, follow);
    run(sim, 120 * 4 + 2, follow);
    expect(sim.state.tideOffset).toBe(2);
    expect(sim.state.whirlpools[0]!.ay).toBe((30 + 0.5 + 2) * 15);
    expect(sim.state.whirlpools[0]!.ax).toBe(10.5 * 15);
  });
});

describe('the aim trace and levers (2026-11-18)', () => {
  it('counts a lever shot as a way in only while a flip wall on its link is shut, gates or not', () => {
    // A gated floor hole, its key far left, and a lever straight above the launch spot whose flip wall is elsewhere.
    const bricks: BrickDef[] = [
      ...shell(20, 8, 12, 10, [{ side: 'bottom', at: 3, width: 4 }]), { x: 23, y: 17, w: 4, h: 1, kind: 'gate', link: 'g' },
      { x: 1, y: 40, w: 3, h: 1, kind: 'key', link: 'g' }, { x: 17, y: 30, w: 3, h: 1, kind: 'lever', link: 'a' }, ...TOP,
    ];
    const flipsAt = (on: boolean): LevelDef => lv(bricks, { flips: [{ x: 2, y: 24, w: 4, h: 1, link: 'a', on }] });
    const straightUp = (level: LevelDef, flips: boolean[]) => traceInside(traceWorld(level, { gatesOpen: false, time: 0, flips }), 18.5 * 15, 0, true);
    expect(straightUp(flipsAt(false), [false])).toBe(false);
    expect(straightUp(flipsAt(true), [true])).toBe(true);
  });
});
