import { describe, expect, it } from 'vitest';
import { INKTANKS_PAID_LEVELS } from '../content/paid';
import { CH2_LEVEL_DEFS } from '../content/ch2/levels';
import { CHAPTER_MAPS, chapterMap, MAP_H, MAP_W } from '../src/content/chapterMaps';
import { CH2_ART_NAME, CH2_KINDS } from '../src/content/ch2/kinds';
import { ART_NAME, KINDS } from '../src/content/ch1/kinds';
import { hasLevel, installPaidLevels, levelFor } from '../src/content/levels';
import { canSee, losClear } from '../src/logic/bots/perception';
import { chapterOf } from '../src/logic/campaign';
import { WORLD } from '../src/art/pixel/world/world';
import { parseTank } from '../src/logic/level/load';
import { Match } from '../src/logic/match/match';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { labLevel } from '../src/sim/levels';
import { runMission } from '../src/sim/runMission';
import { fixture, load } from './fixtures/levels';
import { loadLevel } from '../src/logic/level/load';
import { TYPICAL_TANK } from '../src/sim/lab';

/** A whole-level stand-in run is a heavy sim: 5 s timed out under machine load. */
const SIM_TIMEOUT = 20_000;

describe('chapter 2 content', () => {
  it('paid content lists the built chapter 2 levels, numbered 11–20, and they install from JSON', () => {
    const all = INKTANKS_PAID_LEVELS.map((d) => d.number);
    const nums = CH2_LEVEL_DEFS.map((d) => d.number);
    expect(nums).toContain(11);
    expect(nums).toContain(14);
    expect(nums.every((n) => n >= 11 && n <= 20)).toBe(true);
    for (const n of nums) expect(all).toContain(n);
    expect(installPaidLevels(JSON.parse(JSON.stringify(INKTANKS_PAID_LEVELS)))).toBe(all.length);
    expect(hasLevel(14)).toBe(true);
    expect(levelFor(14)!.def.weather?.kind).toBe('sandstorm');
  });
  it('the lab finds chapter 1 and the paid levels', () => {
    expect(labLevel(3).def.number).toBe(3);
    expect(labLevel(11).def.name).toBe('Sand in the Tracks');
    expect(labLevel(19).def.number).toBe(19);
    expect(() => labLevel(51)).toThrow(/no level 51/);
  });
  it('chapter 2 is the Dust Flats against the Crows', () => {
    expect(chapterOf(15)).toMatchObject({ name: 'Dust Flats', rival: 'the Crows' });
    for (const d of CH2_LEVEL_DEFS) expect(d.enemies.every((e) => e.clan === 'crows')).toBe(true);
  });
  it('desert kinds extend chapter 1 and stand in with existing art names', () => {
    for (const k of Object.keys(KINDS)) expect(CH2_KINDS[k]).toEqual(KINDS[k]);
    for (const [kind, art] of Object.entries(CH2_ART_NAME)) {
      if (kind in ART_NAME) continue;
      expect(CH2_KINDS[kind], kind).toBeDefined();
      expect(WORLD.structures[art], `${kind} → ${art}`).toBeDefined();
    }
  });
  it('a chapter map per built chapter, ten spots each', () => {
    expect(CHAPTER_MAPS.length).toBeGreaterThanOrEqual(2);
    for (const c of CHAPTER_MAPS) expect(c.spots).toHaveLength(10);
    expect(chapterMap(1).art).toMatch(/ch2\.png/);
    expect(chapterMap(9)).toBe(CHAPTER_MAPS[0]);
  });
  it('every chapter map keeps its spots inside the box, apart, on the painting', () => {
    // On a 844 × 390 phone a world px is ~0.61 CSS px: a 56 px spot is ~92 world px wide and its
    // medals (34–48 px below, 46 px wide) reach ~55–78 world px under it, ±38 across.
    const SPOT = 92, MEDAL_DX = 84, MEDAL_Y0 = 55, MEDAL_Y1 = 78;
    for (const c of CHAPTER_MAPS) {
      expect(c.box.x).toBeGreaterThanOrEqual(0);
      expect(c.box.y).toBeGreaterThanOrEqual(0);
      expect(c.box.x + c.box.w).toBeLessThanOrEqual(MAP_W);
      expect(c.box.y + c.box.h).toBeLessThanOrEqual(MAP_H);
      c.spots.forEach((s, i) => {
        expect(s.x).toBeGreaterThanOrEqual(c.box.x);
        expect(s.x).toBeLessThanOrEqual(c.box.x + c.box.w);
        expect(s.y).toBeGreaterThanOrEqual(c.box.y);
        expect(s.y).toBeLessThanOrEqual(c.box.y + c.box.h);
        c.spots.forEach((t, j) => {
          if (j === i) return;
          const dx = Math.abs(s.x - t.x);
          const dy = t.y - s.y;
          if (j > i) expect(Math.max(dx, Math.abs(dy)), `spots ${i + 1} and ${j + 1}`).toBeGreaterThanOrEqual(SPOT);
          // t's medals stay off spot s.
          const medalsHit = dx < MEDAL_DX && t.y + MEDAL_Y0 < s.y + SPOT / 2 && t.y + MEDAL_Y1 > s.y - SPOT / 2;
          expect(medalsHit, `medals of ${j + 1} on spot ${i + 1}`).toBe(false);
        });
      });
    }
  });
  it('levels 11 and 14 are winnable by the stand-in', () => {
    // The tank the campaign run brings to each level (lab's TYPICAL_TANK).
    for (const n of [11, 14]) {
      const wins = [1, 2, 3].filter((seed) => runMission({ level: labLevel(n), seed, player: { loadout: parseTank(TYPICAL_TANK[n]!), kits: 2 } }).passed).length;
      expect(wins, `level ${n}`).toBeGreaterThan(0);
    }
  }, SIM_TIMEOUT);
});

describe('dune crests', () => {
  it('block sight both ways, but not shots or driving', () => {
    const d = fixture({ kind: 'assault' }, [{ role: 'guard', clan: 'crows', tank: 'cannon1/medium1/halftracks1', at: { x: 900, y: 540 } }], { structures: [{ kind: 'duneV', x: 700, y: 540 }] });
    const m = new Match({ level: loadLevel(d, CH2_KINDS), seed: 1, player: { loadout: STARTER_LOADOUT } });
    const p = m.player!;
    const g = m.tanks.find((t) => t.team !== 0)!;
    Object.assign(p, { x: 500, y: 540 });
    expect(canSee(m, g, p)).toBe(false);
    expect(losClear(m, 500, 540, 900, 540)).toBe(true);
    expect(m.navPassable(700, 540)).toBe(true);
  });
  it('chapter 1 levels never get desert kinds', () => {
    expect(() => load(fixture({ kind: 'assault' }, [{ role: 'guard', clan: 'crows', tank: 'cannon1/medium1/halftracks1', at: { x: 900, y: 540 } }], { structures: [{ kind: 'dune', x: 700, y: 540 }] }))).toThrow(/unknown kind "dune"/);
  });
});
