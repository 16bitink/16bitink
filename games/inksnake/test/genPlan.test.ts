import { addDays, eventOn, seasonOf } from '@16bitink/game-sdk';
import { describe, expect, it } from 'vitest';
import { BOOK, dateRange, planDates } from '../dev/genDays';
import { buildLayout, layoutFamily, layoutKey } from '../src/gen/layouts';
import { cheapCheck, densityOk } from '../src/gen/checks';
import { compose } from '../src/gen/compose';
import { EVENT_PLANS, type DayPlan } from '../src/gen/plan';
import { BLIZZARD_PLACES, GOLDEN_PLACES, SEASON_PLACES } from '../src/gen/places';
import { createRng } from '../src/logic/rng';

const DATES = dateRange('2026-11-22', 100);
const PLANS = planDates(DATES, {});
const byDate = new Map(PLANS.map((p) => [p.date, p]));
const near = (p: DayPlan, days: number): DayPlan[] => PLANS.filter((q) => q.date < p.date && q.date >= addDays(p.date, -days + 1));

describe('daily plans', () => {
  it('are the same every time', () => {
    expect(planDates(DATES.slice(0, 20), {})).toEqual(PLANS.slice(0, 20));
  });

  it('follow the season and the event calendar', () => {
    for (const p of PLANS) {
      expect(SEASON_PLACES[seasonOf(p.date)], p.date).toContain(p.place);
      expect(p.event, p.date).toBe(eventOn(p.date));
      if (p.event) expect({ place: p.place, snake: p.snake, rule: p.rule }).toEqual({ place: EVENT_PLANS[p.event].place, snake: EVENT_PLANS[p.event].snake, rule: EVENT_PLANS[p.event].rule });
    }
  });

  it('keep the limits: rule 7 days, place 3 days, layout 60 days, family 14 days', () => {
    for (const p of PLANS.filter((x) => !x.event)) {
      expect(near(p, 7).map((q) => q.rule), p.date).not.toContain(p.rule);
      expect(near(p, 2).map((q) => q.place), p.date).not.toContain(p.place);
      // Within 3 days too, unless event days next to it already hold the season's other places.
      const events = [1, 2].some((i) => eventOn(addDays(p.date, i)) || eventOn(addDays(p.date, -i)));
      if (!events) expect(near(p, 3).map((q) => q.place), p.date).not.toContain(p.place);
      expect(near(p, 60).flatMap((q) => q.layouts.map(layoutKey)), p.date).not.toContain(layoutKey(p.layouts[0]!));
      expect(near(p, 14).map((q) => layoutFamily(q.layouts[0]!)), p.date).not.toContain(layoutFamily(p.layouts[0]!));
    }
  });

  it('follow the weekly rhythm and the engine limits', () => {
    for (const p of PLANS.filter((x) => !x.event)) {
      if (p.weekday === 0) expect(p.goal).toBe('boss');
      if (p.weekday === 1) expect([p.goal, p.guest]).toEqual(['grow', false]);
      if (p.weekday === 5 && p.season === 'winter') expect(['ice', 'blizzard', 'night']).toContain(p.rule);
      if (p.goal === 'golden') expect(GOLDEN_PLACES).toContain(p.place);
      if (p.rule === 'blizzard') expect(BLIZZARD_PLACES).toContain(p.place);
      if (p.rule === 'ice') expect(p.snake).not.toBe('eggeater');
      if (p.season === 'winter' && p.guest) expect(['corn', 'hognose', 'spidertail']).toContain(p.snake);
    }
    expect(PLANS.filter((p) => p.guest).length).toBeGreaterThanOrEqual(Math.floor(PLANS.length / 7));
  });

  it('compose candidates the validator and the cheap checks mostly pass', () => {
    let ok = 0;
    for (const p of PLANS.slice(0, 30)) {
      const rng = createRng(1);
      const c = compose(p, BOOK[p.place], BOOK, buildLayout(BOOK[p.place], p.layouts[0]!, rng), rng);
      expect(c.level.id).toBe(`daily-${p.date}`);
      if (cheapCheck(c.level).ok) ok++;
    }
    expect(ok).toBeGreaterThan(15);
    expect(byDate.get('2026-12-24')?.snake).toBe('candycane');
  });
});

describe('density floor', () => {
  const full = { place: 'farm' as const, solids: Array.from({ length: 5 }, (_, i) => ({ kind: 'circle' as const, look: 'rock', x: 120 + i * 180, y: 270, r: 30 })), cover: [{ look: 'grass', x: 480, y: 100, r: 50 }, { look: 'grass', x: 480, y: 450, r: 50 }] };
  it('wants at least 7 solids and cover together, and little empty floor', () => {
    expect(densityOk(full).ok).toBe(true);
    expect(densityOk({ ...full, cover: [] }).ok).toBe(false);
    expect(densityOk({ place: 'farm', solids: full.solids.slice(0, 1), cover: [], zones: [] }).ok).toBe(false);
  });
  it('every frozen day passes it', async () => {
    const { DAILY_MONTHS } = await import('../content/daily/index');
    const days = (DAILY_MONTHS as { days: Record<string, { level: Parameters<typeof densityOk>[0] }> }[]).flatMap((m) => Object.values(m.days));
    expect(days.length).toBeGreaterThan(0);
    for (const d of days) expect(densityOk(d.level).ok).toBe(true);
  });
});
