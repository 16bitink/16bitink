import { describe, expect, it } from 'vitest';
import { inkbrickDaily, inkbrickDailyDates } from '../content/daily';
import { dateRange, weekday } from '../src/gen/calendar';
import { cheapCheck, unreachableBricks } from '../src/gen/checks';
import { compose } from '../src/gen/compose';
import { planDays } from '../src/gen/plan';
import { LAUNCH_X, MAX_BRICKS } from '../src/sim/constants';
import { buildShell } from '../src/gen/shells';
import { mulberry32 } from '../src/sim/rng';
import { DAILY_NOVICE_AIM, dailyTargets } from '../src/sim/targets';
import { launchWindow } from '../src/sim/trace';
import { Sim } from '../src/sim/sim';
import { levelProblems } from '../src/sim/validate';

describe('generator', () => {
  it('plans and composes the same level for the same date', () => {
    const [a] = planDays(['2026-12-03']);
    const [b] = planDays(['2026-12-03']);
    expect(a).toEqual(b);
    expect(JSON.stringify(compose(a!, 7))).toBe(JSON.stringify(compose(b!, 7)));
  });

  it('follows the weekly rhythm: Sunday is a multiplier core, Saturday the smallest hole', () => {
    const plans = planDays(dateRange('2026-11-22', 14));
    for (const p of plans) {
      if (p.weekday === 0) expect(p.layout).toBe('core');
      if (p.weekday === 6) expect(p.holeW).toBe(Math.min(...plans.map((q) => q.holeW)));
    }
  });

  it('never repeats a layout more than twice in a week or a twist within 7 days', () => {
    const plans = planDays(dateRange('2026-11-20', 60));
    plans.forEach((p, i) => {
      const week = plans.slice(Math.max(0, i - 6), i + 1);
      if (p.layout !== 'core') expect(week.filter((q) => q.layout === p.layout).length).toBeLessThanOrEqual(2);
      if (p.twist !== 'none') expect(week.filter((q) => q.twist === p.twist).length).toBe(1);
    });
  });

  it('keeps chapter 4-5 pieces out of the first two weeks', () => {
    for (const p of planDays(dateRange('2026-11-20', 16))) {
      expect(['spinner', 'whirlpool', 'dark']).not.toContain(p.twist);
      expect(p.layout).not.toBe('nested');
    }
  });

  it('never puts a hole or a door over the launch column', () => {
    for (const p of planDays(dateRange('2026-11-20', 28))) {
      for (let k = 0; k < 4; k++) {
        const win = buildShell(p, mulberry32(k + 1)).window;
        if (win && win.side === 'bottom') expect(win.x > 18 || win.x + win.w <= 18).toBe(true);
      }
    }
  }, 60_000);

  it('screens free launch shots: what passes the cheap checks has no way in from the launch spot', () => {
    for (const p of planDays(dateRange('2026-12-06', 7))) {
      for (let k = 0; k < 2; k++) {
        const level = compose(p, k);
        if (cheapCheck(level, 0, 1).ok) expect(launchWindow(level, LAUNCH_X)).toBeLessThanOrEqual(0.01);
      }
    }
  }, 60_000);

  it('packs mazes and nested vaults with a chamber of x3 shells and kegs', () => {
    for (const p of planDays(dateRange('2026-12-06', 60)).filter((q) => q.layout === 'maze' || q.layout === 'nested').slice(0, 4)) {
      const level = compose(p, 0);
      expect(level.bricks.filter((b) => b.kind === 'x3').length).toBeGreaterThanOrEqual(6);
      if (p.layout === 'maze') expect(level.bricks.filter((b) => b.kind === 'keg').length).toBeGreaterThanOrEqual(4);
    }
  }, 60_000);

  it('spreads the novice target over the week: Monday easiest, Saturday hardest', () => {
    const mid = (wd: number) => {
      const t = dailyTargets(wd).find((x) => x.key === 'noviceClear')!;
      return (t.lo + t.hi) / 2;
    };
    expect(DAILY_NOVICE_AIM[1]).toBeGreaterThan(DAILY_NOVICE_AIM[6]!);
    for (let wd = 2; wd <= 6; wd++) expect(mid(wd)).toBeLessThanOrEqual(mid(wd - 1));
  });

  it('composes valid levels', () => {
    for (const p of planDays(dateRange('2026-11-20', 21))) {
      for (let k = 0; k < 3; k++) expect(levelProblems(compose(p, k))).toEqual([]);
    }
  }, 60_000);
});

describe('frozen dailies', () => {
  const dates = inkbrickDailyDates();

  it('covers 2026-11-20 through 2027-01-31', () => {
    expect(dates[0]).toBe('2026-11-20');
    expect(dates).toContain('2027-01-31');
    expect(dates.length).toBeGreaterThanOrEqual(73);
  });

  it('returns frozen levels by date and null for unknown dates', () => {
    const level = inkbrickDaily('2026-11-22');
    expect(level?.id).toBe('daily-2026-11-22');
    expect(level?.number).toBe(0);
    expect(inkbrickDaily('2019-01-01')).toBeNull();
    expect(weekday('2026-11-22')).toBe(0);
  });

  it('every frozen day loads, is in budget and reaches every brick', () => {
    for (const d of dates) {
      const level = inkbrickDaily(d)!;
      expect(() => new Sim(level)).not.toThrow();
      expect(level.bricks.length).toBeLessThanOrEqual(MAX_BRICKS);
      expect(unreachableBricks(level)).toBe(0);
      expect(`${d} ${cheapCheck(level, 0, 1).reason}`).toBe(`${d} `);
    }
  }, 120_000);
});
