/** The measurements the lab and the generator trust: the aim trace, the bots' ordering, boss targets. */
import { describe, expect, it } from 'vitest';
import { fill, shell, stone } from '../src/sim/kit';
import { runBot, summarize, type RunResult } from '../src/sim/measure';
import { bossTargets, levelTargets } from '../src/sim/targets';
import { Aimer, aimWindow, pieceCycle } from '../src/sim/trace';
import type { BrickDef, LevelDef } from '../src/sim/types';

const BASE: Omit<LevelDef, 'bricks'> = { id: 't', name: 'T', number: 5, chapter: 1, par: 90 };
/** A floor-hole vault (level 1's shape): hole at columns 9-12 of row 29, chimney above it, fill beside. */
const VAULT_WALLS = shell(8, 12, 20, 18, [{ side: 'bottom', at: 1, width: 4 }]);
const VAULT_FILL = fill(15, 16, 12, 9, 'soft');
const HOLE: BrickDef = { x: 9, y: 29, w: 4, h: 1, kind: 'gate', link: 'g' };
const vault = (extra: Partial<LevelDef> = {}, bricks: readonly BrickDef[] = []): LevelDef => ({ ...BASE, bricks: [...VAULT_WALLS, ...VAULT_FILL, ...bricks], ...extra });

describe('aim trace', () => {
  it('measures a gated hole as it is after the key, while the bots shoot for the key first', () => {
    const open = aimWindow(vault(), 720);
    expect(open).toBeGreaterThan(0.02);
    expect(aimWindow(vault({}, [HOLE]), 720)).toBe(open);
    const sealed = new Aimer(vault({}, [HOLE]));
    expect(sealed.angles(140)).toEqual([]);
    const keyed = new Aimer(vault({}, [HOLE, { x: 2, y: 38, w: 3, h: 1, kind: 'key', link: 'g' }]));
    expect(keyed.angles(60).length).toBeGreaterThan(0);
    const aimer = new Aimer(vault({}, [HOLE, { x: 2, y: 38, w: 3, h: 1, kind: 'key', link: 'g' }]));
    expect(aimer.gates).toHaveLength(1);
    // Gates gone: the same ways in as the level without the gate.
    expect(aimer.angles(140, { gatesOpen: true, time: 0 })).toEqual(new Aimer(vault({}, [{ x: 2, y: 38, w: 3, h: 1, kind: 'key', link: 'g' }])).angles(140));
  });

  it('carries the ghost through whirlpools', () => {
    // A closed room: the only way in is the whirlpool from the open water.
    const room = { ...BASE, bricks: [...shell(8, 12, 20, 18, []), ...fill(10, 14, 15, 4, 'soft')] };
    expect(aimWindow(room, 720)).toBe(0);
    expect(aimWindow({ ...room, whirlpools: [{ a: { x: 18, y: 40 }, b: { x: 12, y: 24 } }] }, 720)).toBeGreaterThan(0.005);
  });

  it('samples moving pieces over their cycle, not just at t = 0', () => {
    // Closed for the first 2 s of a 4 s cycle: the old t = 0 trace (shutters forced open) said fully open.
    const shut = vault({ shutters: [{ x: 9, y: 29, w: 4, h: 1, open: 2, closed: 2, phase: 2 }] });
    expect(pieceCycle(shut)).toBe(4);
    const open = aimWindow(vault(), 1440);
    const half = aimWindow(shut, 1440);
    expect(half).toBeGreaterThan(open * 0.25);
    expect(half).toBeLessThan(open * 0.75);
  });
});

describe('bots', () => {
  it('are ordered on a floor-hole vault: skilled breaks in no later than decent, decent no later than novice', () => {
    const level = vault();
    const aimer = new Aimer(level);
    const median = (rs: readonly RunResult[]) => {
      const xs = rs.map((r) => (r.breakInAt < 0 ? 999 : r.breakInAt)).sort((a, b) => a - b);
      return xs[Math.floor(xs.length / 2)]!;
    };
    const runs = (k: 'novice' | 'decent' | 'skilled') => Array.from({ length: 9 }, (_, i) => runBot(level, k, 100 + i, aimer, 120));
    const [n, d, s] = [median(runs('novice')), median(runs('decent')), median(runs('skilled'))];
    expect(s).toBeLessThanOrEqual(d);
    expect(d).toBeLessThanOrEqual(n);
  }, 60_000);
});

describe('chapter 1 novice band', () => {
  const noviceBand = (chapter: number, number: number) => {
    const t = levelTargets({ ...BASE, chapter, number, bricks: [] }).find((x) => x.key === 'noviceClear')!;
    return [t.lo, t.hi];
  };

  it('asks 90%+ on levels 1-3, 70-95% on levels 4-9 and 55-85% on paid levels', () => {
    expect(noviceBand(1, 3)).toEqual([0.9, 1]);
    for (const n of [4, 7, 9]) expect(noviceBand(1, n)).toEqual([0.7, 0.95]);
    expect(noviceBand(2, 14)).toEqual([0.55, 0.85]);
    expect(noviceBand(5, 47)).toEqual([0.55, 0.85]);
  });
});

describe('boss targets', () => {
  const boss: LevelDef = {
    ...BASE, number: 10, bricks: [stone(0, 12, 14, 1), stone(20, 12, 16, 1)],
    boss: { hits: 26, shieldW: 6, speed: 8 },
  };

  it('judge hits, not bricks: no cascade or hunt, novice 45-75%, skilled 60-120 s, drought <= 12 s', () => {
    const t = levelTargets(boss);
    expect(t).toEqual(bossTargets());
    const by = (k: string) => t.find((x) => x.key === k);
    expect(by('cascade')).toBeUndefined();
    expect(by('hunt')).toBeUndefined();
    expect(by('bossHits')).toBeDefined();
    expect([by('noviceClear')!.lo, by('noviceClear')!.hi]).toEqual([0.45, 0.75]);
    expect([by('clearSkilled')!.lo, by('clearSkilled')!.hi]).toEqual([60, 120]);
    expect(by('drought')!.hi).toBe(12);
  });

  it('reports the hits needed and leaves cascade and hunt unmeasured', () => {
    const m = summarize(boss, [], 0.05);
    expect(m.bossHits).toBe(26);
    expect(m.cascade).toBeNull();
    expect(m.hunt).toBeNull();
    expect(summarize(vault(), [], 0.05).bossHits).toBeNull();
  });
});

describe('Aimer.insideBricks', () => {
  it('lists the breakable bricks inside a vault and none outside or of stone', async () => {
    const { CH1_LEVELS } = await import('../src/level/ch1/index');
    const level = CH1_LEVELS[0]!;
    const aim = new Aimer(level);
    const ins = new Set(aim.insideBricks);
    expect(ins.size).toBeGreaterThan(0);
    expect(ins.size).toBeLessThan(level.bricks.length);
    for (const i of ins) expect(['stone', 'gate']).not.toContain(level.bricks[i]!.kind);
  });
});
