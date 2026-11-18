/** The daily plan as layout x goal x rule, and the untrusted-level checks (docs/inkbrick-design.md "Variety"). */
import { describe, expect, it } from 'vitest';
import { CENTRE_BOXES, dateRange, LATE_PIECES } from '../src/gen/calendar';
import { compose } from '../src/gen/compose';
import { planDays, ruleClassFor } from '../src/gen/plan';
import { checkLevel } from '../src/level/validate';
import { fill } from '../src/sim/kit';
import { Sim } from '../src/sim/sim';
import { RULE_CLASS, type LevelDef } from '../src/sim/types';

const plans = planDays(dateRange('2026-11-06', 87)).filter((p) => p.date >= '2026-11-20');

describe('daily plan: layout x goal x rule', () => {
  it('gives every day a rule of its weekday kind, none repeated within 7 days', () => {
    plans.forEach((p, i) => {
      const cls = ruleClassFor(p.weekday);
      expect(p.rule).not.toBeNull();
      if (cls !== 'any') expect(RULE_CLASS[p.rule!]).toBe(cls);
      expect(plans.slice(Math.max(0, i - 7), i).map((q) => q.rule)).not.toContain(p.rule);
    });
  });

  it('has rescue, pearls and tide 1-2 times in every 7 days, clear on most, never Few Stones', () => {
    for (let i = 0; i + 7 <= plans.length; i++) {
      const week = plans.slice(i, i + 7);
      for (const g of ['rescue', 'pearls', 'tide'] as const) {
        const n = week.filter((p) => p.goal === g).length;
        expect(n, `${week[0]!.date} ${g}`).toBeGreaterThanOrEqual(1);
        expect(n, `${week[0]!.date} ${g}`).toBeLessThanOrEqual(2);
      }
    }
    expect(plans.filter((p) => p.goal === 'clear').length).toBeGreaterThan(plans.length / 3);
    expect(plans.some((p) => p.goal === 'stones')).toBe(false);
  });

  it('has at most 2 centre-box days in any 7, and layers and open from day one', () => {
    plans.forEach((p, i) => {
      const week = plans.slice(Math.max(0, i - 6), i + 1);
      expect(week.filter((q) => CENTRE_BOXES.includes(q.layout)).length).toBeLessThanOrEqual(2);
    });
    expect(plans.slice(0, 14).map((p) => p.layout)).toContain('layers');
    expect(plans.some((p) => p.layout === 'open')).toBe(true);
  });

  it('brings the new pieces in from 2026-11-29, never before', () => {
    const fresh = ['bumper', 'lever', 'hidden', 'crab'];
    for (const p of plans) if (p.date < '2026-11-29') expect(fresh).not.toContain(p.twist);
    expect(LATE_PIECES.filter((l) => fresh.includes(l.piece)).every((l) => l.from === '2026-11-29' && l.featuredUntil === '2026-12-12')).toBe(true);
    const featured = plans.filter((p) => p.date >= '2026-11-29' && p.date <= '2026-12-12').map((p) => p.twist);
    expect(fresh.filter((t) => featured.includes(t as never)).length).toBeGreaterThanOrEqual(3);
  });

  it('composes each day with its goal, rule and a hidden daily pearl', () => {
    for (const p of plans.slice(0, 21)) {
      const l = compose(p, 0);
      expect(l.rule).toBe(p.rule);
      expect(l.dailyPearl).toBeDefined();
      if (p.goal === 'rescue') expect(l.goal === 'rescue' ? l.rescue : 'fallback').toBeDefined();
      if (l.goal === 'pearls') expect(l.pearls!.length).toBeGreaterThanOrEqual(3);
      if (l.goal === 'tide') expect(l.tide!.line).toBeGreaterThan(Math.max(...l.bricks.filter((b) => b.kind !== 'stone').map((b) => b.y + b.h - 1)));
      if (p.rule === 'goldRush') expect(l.bricks.filter((b) => b.kind === 'x3').length).toBeGreaterThan(5);
      if (p.layout === 'open') {
        expect(l.bricks.some((b) => b.kind === 'stone')).toBe(false);
        expect(l.bricks.some((b) => b.armour)).toBe(true);
      }
      expect(() => new Sim(l)).not.toThrow();
      expect(checkLevel(JSON.parse(JSON.stringify(l))).ok).toBe(true);
    }
  }, 120_000);
});

describe('checkLevel bounds the new fields of untrusted JSON', () => {
  const ok: LevelDef = { id: 'd', name: 'd', number: 0, chapter: 0, par: 60, bricks: fill(0, 4, 36, 2, 'soft'), rule: 'current', ruleDir: -1, goal: 'pearls', pearls: [{ x: 2, y: 20 }, { x: 10, y: 20 }, { x: 20, y: 20 }], dailyPearl: { x: 30, y: 30 }, tomorrow: { rule: 'slow', goal: 'tide' } };
  const bad = (patch: Record<string, unknown>) => checkLevel({ ...ok, ...patch }).ok;

  it('accepts a good level', () => {
    expect(checkLevel(ok).ok).toBe(true);
  });

  it('rejects bad enums, numbers and lengths', () => {
    expect(bad({ rule: 'lava' })).toBe(false);
    expect(bad({ goal: 'win' })).toBe(false);
    expect(bad({ ruleDir: 2 })).toBe(false);
    expect(bad({ pearls: Array.from({ length: 6 }, (_, i) => ({ x: i * 5, y: 20 })) })).toBe(false);
    expect(bad({ pearls: [{ x: 1.5, y: 20 }, { x: 10, y: 20 }, { x: 20, y: 20 }] })).toBe(false);
    expect(bad({ dailyPearl: { x: 99, y: 3 } })).toBe(false);
    expect(bad({ tomorrow: { rule: 'slow', goal: 'nap' } })).toBe(false);
    expect(bad({ bumpers: [{ x: 100, y: 300, r: 5 }] })).toBe(false);
    expect(bad({ bumpers: Array.from({ length: 13 }, (_, i) => ({ x: 40 + i * 35, y: 300, r: 15 })) })).toBe(false);
    expect(bad({ crabs: [{ y: 30, x0: 5, x1: 2, speed: 3, phase: 0 }] })).toBe(false);
    expect(bad({ crabs: [{ y: 30, x0: 2, x1: 20, speed: 3, phase: 7 }] })).toBe(false);
    expect(bad({ flips: [{ x: 5, y: 30, w: 3, h: 1, link: 'q', on: true }] })).toBe(false);
    expect(bad({ goal: 'tide', tide: { every: 1e9, line: 54 } })).toBe(false);
    expect(bad({ goal: 'stones', stones: 4, need: 3 })).toBe(false);
    expect(bad({ goal: 'rescue', rescue: { x: 4, y: 20, who: 'shark' } })).toBe(false);
    expect(bad({ par: Infinity })).toBe(false);
    expect(bad({ name: 'x'.repeat(500) })).toBe(false);
    expect(bad({ bricks: [{ x: 0, y: 4, w: 3, h: 1, kind: 'soft', hidden: 'yes' }] })).toBe(false);
    expect(bad({ bricks: [{ x: 0, y: 4, w: 3, h: 1, kind: 'soft', armour: 1 }] })).toBe(false);
  });

  it('rejects layouts the Sim would refuse (a pearl on a brick, a lever without walls)', () => {
    expect(bad({ pearls: [{ x: 1, y: 4 }, { x: 10, y: 20 }, { x: 20, y: 20 }] })).toBe(false);
    expect(bad({ bricks: [...ok.bricks, { x: 3, y: 30, w: 3, h: 1, kind: 'lever', link: 'a' }] })).toBe(false);
    expect(bad({ bricks: [...ok.bricks, { x: 3, y: 30, w: 3, h: 1, kind: 'lever', link: 'a' }], flips: [{ x: 10, y: 30, w: 3, h: 1, link: 'a', on: true }] })).toBe(true);
  });
});
