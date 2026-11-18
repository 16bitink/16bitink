import { describe, expect, it } from 'vitest';
import { barrensGolden, christmasEve, reefRival, winterFarmIce } from '../dev/daily/samples';
import { CHAPTER_1 } from '../src/level/chapter1';
import type { DailyRule } from '../src/level/daily';
import type { LevelDef } from '../src/level/types';
import { goldenKind } from '../src/logic/daily/golden';
import { nightOf } from '../src/logic/daily/look';
import { BLIZZARD, FOG_SIGHT, GOLD_RUSH, GOLDEN, HOT_DAY, ICE, LURE, TREAT } from '../src/logic/daily/params';
import { RivalSnake } from '../src/logic/enemies/rival';
import { NO_INPUT, type SnakeInput } from '../src/logic/snake';
import { SNAKE_SPECS } from '../src/logic/species';
import { dist } from '../src/logic/vec';
import { World, type WorldEvent } from '../src/logic/world';
import { playLevel } from './bot';

const DT = 1 / 60;
const DATE = '2026-12-20';
const plain = CHAPTER_1[0]!;
const withRule = (rule: DailyRule, extra: Partial<LevelDef> = {}): LevelDef => ({ ...plain, id: `daily-${DATE}`, place: 'farm', rule, ...extra });

function run(w: World, seconds: number, input: (w: World) => SnakeInput = () => NO_INPUT): WorldEvent[] {
  const out: WorldEvent[] = [];
  for (let t = 0; t < seconds; t += DT) out.push(...w.step(input(w), DT));
  return out;
}

/** Turning as hard as it can, so the head soon crosses its own body. */
const spin = (w: World): SnakeInput => ({ toward: null, face: w.snake.heading + 1.4, strike: false });

describe('rules of the day (engine)', () => {
  it('leaves campaign levels without daily rules', () => {
    expect(new World(plain).daily).toBeNull();
    expect(new World(withRule('night')).daily).not.toBeNull();
  });

  it('lure: prey near the head drifts towards it', () => {
    const w = new World(withRule('lure'));
    const p = w.prey[0]!;
    run(w, 1);
    p.mode = 'idle';
    p.x = w.snake.head.x + 60;
    p.y = w.snake.head.y;
    const before = dist(p, w.snake.head);
    w.daily!.afterPrey(0.1);
    expect(before - dist(p, w.snake.head)).toBeCloseTo(LURE.speed * 0.1, 1);
    p.x = w.snake.head.x + LURE.reach + 20;
    const far = dist(p, w.snake.head);
    w.daily!.afterPrey(0.1);
    expect(dist(p, w.snake.head)).toBeCloseTo(far, 5);
  });

  it('loose knots: crossing your own body costs nothing', () => {
    const knots = (w: World): number => run(w, 4, spin).filter((e) => e.type === 'hurt' && e.cause === 'knot').length;
    const long = { length: 420, target: 700 };
    expect(knots(new World({ ...plain, ...long }))).toBeGreaterThan(0);
    const loose = new World(withRule('looseKnots', long));
    expect(knots(loose)).toBe(0);
    expect(loose.lives).toBe(loose.maxLives);
  });

  it('gold rush: every fourth arrival is golden and grows three times as much', () => {
    const level = withRule('goldRush', { prey: [{ kind: 'mouse', count: 8 }] });
    const w = new World(level);
    expect(w.prey.filter((p) => p.gold === 'rush')).toHaveLength(8 / GOLD_RUSH.every);
    const gold = w.prey.find((p) => p.gold === 'rush')!;
    expect(w.daily!.mealScale(gold).growth).toBe(GOLD_RUSH.growth);
    expect(w.daily!.preyTime(gold)).toBeCloseTo(GOLD_RUSH.quick);
  });

  it('ice: turns slower and the speed carries', () => {
    const turn = (level: LevelDef): number => {
      const w = new World(level);
      const h0 = w.snake.heading;
      w.step({ toward: null, face: h0 + 2, strike: false }, DT);
      return w.snake.heading - h0;
    };
    expect(turn(withRule('ice')) / turn(plain)).toBeCloseTo(ICE.turn, 2);
    // A strike: on ice the lunge builds up instead of jumping to full speed.
    const lunge = (level: LevelDef): number => {
      const w = new World(level);
      run(w, 0.5);
      const a = { ...w.snake.head };
      w.step({ toward: null, face: null, strike: true }, DT);
      return dist(a, w.snake.head) / DT;
    };
    expect(lunge(withRule('ice'))).toBeLessThan(lunge(plain) * 0.4);
  });

  it('blizzard: a steady push across the board', () => {
    const w = new World({ ...winterFarmIce(DATE), rule: 'blizzard' });
    expect(Math.hypot(w.daily!.wind.x, w.daily!.wind.y)).toBe(0);
    w.step(NO_INPUT, DT);
    expect(Math.hypot(w.daily!.wind.x, w.daily!.wind.y)).toBeCloseTo(BLIZZARD.push, 5);
    const gusts = run(w, BLIZZARD.every[1] * 2 + 1).filter((e) => e.type === 'gust');
    expect(gusts.length).toBeGreaterThanOrEqual(2);
  });

  it('blizzard: the head drifts off the line it steers', () => {
    const w = new World({ ...plain, id: `daily-${DATE}`, rule: 'blizzard', solids: [], cover: [] });
    const h = { ...w.snake.head };
    const heading = w.snake.heading;
    w.step(NO_INPUT, DT);
    const moved = { x: w.snake.head.x - h.x, y: w.snake.head.y - h.y };
    const side = -moved.x * Math.sin(heading) + moved.y * Math.cos(heading);
    const wind = -w.daily!.wind.x * Math.sin(heading) + w.daily!.wind.y * Math.cos(heading);
    expect(side).toBeCloseTo(wind * DT, 3);
  });

  it('fog: the night layer with a far wider sight', () => {
    expect(nightOf(withRule('fog'))).toEqual({ fog: true, sight: FOG_SIGHT });
    expect(nightOf({ ...plain, dark: true })).toEqual({ fog: false, sight: 1 });
    expect(nightOf(plain)).toBeNull();
  });

  it('hot day: the snake and its prey are faster', () => {
    const w = new World(withRule('hotDay'));
    expect(w.snake.speed).toBeCloseTo(SNAKE_SPECS.corn.speed * HOT_DAY);
    expect(w.daily!.preyTime(w.prey[0]!)).toBeCloseTo(HOT_DAY);
  });

  it('rival: a snake of your own species arrives in any place and eats your prey', () => {
    const w = new World(withRule('rival'));
    const rival = w.enemies.find((e): e is RivalSnake => e instanceof RivalSnake)!;
    expect(rival.kind).toBe('rival');
    expect(rival.snake.art).toBe('corn');
    expect(rival.snake.width).toBeLessThan(w.snake.width);
    run(w, 30);
    expect(rival.away).toBe(false);
    const reef = new World(reefRival(DATE));
    expect(reef.enemies.filter((e) => e instanceof RivalSnake)).toHaveLength(1);
    expect((reef.enemies.find((e) => e instanceof RivalSnake) as RivalSnake).snake.art).toBe('krait');
  });
});

describe('treats', () => {
  it('lie on the board and go with a sparkle, a little growth and no lump', () => {
    const w = new World(christmasEve(DATE));
    const treats = w.daily!.treats!;
    expect(treats.list).toHaveLength(4);
    run(w, 1);
    const t = treats.list[0]!;
    t.x = w.snake.head.x;
    t.y = w.snake.head.y;
    const pending = w.snake.pending;
    const lumps = w.snake.lumps.length;
    const events = w.step(NO_INPUT, DT);
    expect(events.some((e) => e.type === 'treat' && e.kind === 'cookie')).toBe(true);
    expect(w.feasted).toBe(1);
    expect(w.snake.pending).toBeGreaterThan(pending + TREAT.growth - 4);
    expect(w.snake.lumps.length).toBe(lumps);
    run(w, TREAT.respawn[1] + 0.1);
    expect(treats.list).toHaveLength(4);
  });

  it('a feast on treats is won by the bot', () => {
    const runs = [0, 1, 2].map((seed) => playLevel(christmasEve(DATE), 180, seed));
    expect(runs.some((r) => r.won), JSON.stringify(runs)).toBe(true);
  }, 60_000);
});

describe('the golden goal', () => {
  it('sends one golden prey at a time, and the next after each catch', () => {
    const level = barrensGolden(DATE);
    const w = new World(level);
    const golden = (): typeof w.prey => w.prey.filter((p) => p.gold === 'goal');
    expect(golden()).toHaveLength(1);
    expect(golden()[0]!.kind).toBe(goldenKind(level));
    expect(goldenKind(CHAPTER_1[1]!)).toBe('mouse');
    const all: WorldEvent[] = [];
    for (let i = 0; i < 3; i++) {
      all.push(...run(w, 1));
      const g = golden()[0]!;
      expect(g).toBeDefined();
      w.snake.mode = 'move';
      g.mode = 'idle';
      g.x = w.snake.head.x;
      g.y = w.snake.head.y;
      all.push(...run(w, GOLDEN.next + 0.6));
      expect(w.daily!.caught).toBe(i + 1);
    }
    expect(all.filter((e) => e.type === 'golden')).toHaveLength(3);
    expect(all.some((e) => e.type === 'goldenDone')).toBe(true);
    expect(golden()).toHaveLength(0);
    // The target still has to be reached.
    expect(w.state === 'won').toBe(w.snake.length >= level.target - 0.5);
  });

  it('is won by the bot', () => {
    const runs = [0, 1, 2].map((seed) => playLevel(barrensGolden(DATE), 240, seed));
    expect(runs.some((r) => r.won), JSON.stringify(runs)).toBe(true);
  }, 60_000);
});
