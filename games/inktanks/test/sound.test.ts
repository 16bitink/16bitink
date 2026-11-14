import { describe, expect, it } from 'vitest';
import { canPlay, cuesFor, engineLevel, MIN_GAP_MS, SFX_IDS, spatial, structCues } from '../src/audio/sfx';
import { labLevel } from '../src/sim/levels';
import { Match } from '../src/logic/match/match';
import type { MatchEvent, Tank } from '../src/logic/match/types';
import { parseTank } from '../src/logic/level/load';

const view = { left: 0, right: 960, top: 0, bottom: 540 };
const PLAYER = 1;
const tanks = new Map<number, Partial<Tank>>([
  [PLAYER, { id: PLAYER, x: 480, y: 270, role: 'player' as Tank['role'] }],
  [2, { id: 2, x: 900, y: 300, role: 'guard' as Tank['role'] }],
  [3, { id: 3, x: 700, y: 300, role: 'boss' as Tank['role'], body: 'crawler' }],
]);
const look = (id: number) => tanks.get(id) as Tank | undefined;
const cues = (e: MatchEvent) => cuesFor(e, look, PLAYER);

describe('sound effects', () => {
  it('every sound has a throttle gap', () => {
    for (const id of SFX_IDS) expect(MIN_GAP_MS[id], id).toBeGreaterThan(0);
  });

  it("the player's own shots play in the ear; an enemy's are placed and quieter", () => {
    const mine = cues({ kind: 'fire', tank: PLAYER, x: 480, y: 270, angle: 0, shot: 'shell' });
    expect(mine).toEqual([{ id: 'cannon', gain: 1 }]);
    const theirs = cues({ kind: 'fire', tank: 2, x: 900, y: 300, angle: 0, shot: 'tracer' });
    expect(theirs[0]).toMatchObject({ id: 'mg', x: 900, y: 300 });
    expect(theirs[0]!.gain!).toBeLessThan(1);
  });

  it('a laser and a rail sound on their beam and slug, not twice on the trigger', () => {
    expect(cues({ kind: 'fire', tank: PLAYER, x: 0, y: 0, angle: 0, shot: 'beam' })).toEqual([]);
    expect(cues({ kind: 'fire', tank: PLAYER, x: 0, y: 0, angle: 0, shot: 'rail' })).toEqual([]);
    expect(cues({ kind: 'beam', tank: PLAYER, x0: 0, y0: 0, x1: 9, y1: 9, hit: true })[0]!.id).toBe('laser');
    expect(cues({ kind: 'slug', tank: 2, x0: 5, y0: 6, x1: 9, y1: 9, hits: 1 })[0]).toMatchObject({ id: 'rail', x: 5, y: 6 });
  });

  it('hits clang on armour, thud on the ground, and hurt on the player', () => {
    expect(cues({ kind: 'hit', x: 1, y: 2, target: 2, dmg: 20, shot: 'shell' })[0]!.id).toBe('clang');
    expect(cues({ kind: 'hit', x: 1, y: 2, target: null, dmg: 20, shot: 'shell' })[0]!.id).toBe('thud');
    const hurt = cues({ kind: 'hit', x: 1, y: 2, target: PLAYER, dmg: 30, shot: 'shell' })[0]!;
    expect(hurt.id).toBe('hurt');
    expect(hurt.x).toBeUndefined();
    // A flamer's tick hits every frame: no clang each time.
    expect(cues({ kind: 'hit', x: 1, y: 2, target: 2, dmg: 2, shot: 'flame' })).toEqual([]);
  });

  it('a wreck booms where the tank was, lower for a boss', () => {
    const w = cues({ kind: 'kill', killer: PLAYER, victim: 2, by: 'cannon' })[0]!;
    expect(w).toMatchObject({ id: 'wreck', x: 900, y: 300 });
    const b = cues({ kind: 'kill', killer: PLAYER, victim: 3, by: 'cannon' })[0]!;
    expect(b.pitch!).toBeLessThan(w.pitch!);
  });

  it('pickups only sound for the player; blueprints chime', () => {
    expect(cues({ kind: 'pickup', tank: 2, what: 'kit', amount: 1 })).toEqual([]);
    expect(cues({ kind: 'pickup', tank: PLAYER, what: 'intel', amount: 1 })[0]!.id).toBe('intel');
    expect(cues({ kind: 'pickup', tank: PLAYER, what: 'kit', amount: 1 })[0]!.id).toBe('pickup');
  });

  it('set pieces, weather and the ending have their sounds', () => {
    expect(cues({ kind: 'setpiece', what: 'flagOurs', x: 0, y: 0 })[0]!.id).toBe('flagUp');
    expect(cues({ kind: 'setpiece', what: 'avalanche', x: 0, y: 0 })[0]!.id).toBe('rumble');
    expect(cues({ kind: 'weather', what: 'coming', in: 5, storm: 'sandstorm' })[0]!.id).toBe('radio');
    expect(cues({ kind: 'over', passed: true, reason: '' })[0]!.id).toBe('win');
    expect(cues({ kind: 'over', passed: false, reason: '' })[0]!.id).toBe('lose');
  });

  it('structures sound by what they are made of', () => {
    expect(structCues(2, 'brick', 0, 0)).toEqual([]);
    expect(structCues(0, 'brick', 0, 0)[0]!.id).toBe('crumble');
    expect(structCues(0, 'wood', 0, 0)[0]!.id).toBe('snap');
    expect(structCues(0, 'fuel', 0, 0).map((c) => c.id)).toEqual(['boom', 'whoomp']);
    expect(structCues(1, 'stone', 0, 0)[0]!.id).toBe('crack');
  });

  it('sounds fade with distance from the view and pan to their side', () => {
    expect(spatial({ x: 480, y: 270 }, view)).toEqual({ pan: 0, gain: 1 });
    expect(spatial({ x: 960, y: 270 }, view).pan).toBeGreaterThan(0.5);
    expect(spatial({ x: 0, y: 270 }, view).pan).toBeLessThan(-0.5);
    const off = spatial({ x: 960 + 300, y: 270 }, view);
    expect(off.gain).toBeGreaterThan(0);
    expect(off.gain).toBeLessThan(1);
    expect(spatial({ x: 960 * 3, y: 270 }, view).gain).toBe(0);
  });

  it('throttles one sound but not another', () => {
    const last = new Map<string, number>();
    expect(canPlay('mg', 0, last)).toBe(true);
    expect(canPlay('mg', 10, last)).toBe(false);
    expect(canPlay('cannon', 10, last)).toBe(true);
    expect(canPlay('mg', 10 + MIN_GAP_MS.mg, last)).toBe(true);
  });

  it('the engine idles quietly and revs with speed', () => {
    expect(engineLevel(0, 100)).toEqual({ level: 0.35, rev: 0 });
    expect(engineLevel(-100, 100)).toEqual({ level: 1, rev: 1 });
    expect(engineLevel(50, 0).rev).toBe(0);
  });

  it('every event a real mission makes maps without throwing', () => {
    const m = new Match({ level: labLevel(11), seed: 3, player: { loadout: parseTank('cannon1/medium2/halftracks1'), kits: 2 }, playerBot: true });
    const ids = new Set<string>();
    for (let i = 0; i < 60 * 40 && !m.over; i++) {
      m.step(1 / 30);
      for (const e of m.drainEvents()) for (const c of cuesFor(e, (id) => m.tank(id), m.player?.id ?? null)) ids.add(c.id);
    }
    expect(ids.has('cannon')).toBe(true);
  });
});
