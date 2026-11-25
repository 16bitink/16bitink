import { describe, expect, it } from 'vitest';
import { lookAhead, planText, savingFor } from '../src/guide/advisor/ahead';
import { answersFor } from '../src/guide/advisor/answers';
import { findProblems, redCount, topProblems, whyJam } from '../src/guide/advisor/problems';
import { RED_SCORE, type Problem } from '../src/guide/advisor/types';
import { briefing } from '../src/guide/briefing';
import { goalInfo } from '../src/guide/goalInfo';
import { mainJunction } from '../src/guide/places';
import { lineIdea, parkSite } from '../src/guide/sites';
import { along } from '../src/ui/guide/layer';
import { bestPlace, overlap } from '../src/ui/guide/dom';
import { PAID_CITIES } from '../content/paid';
import { SAFFRON } from '../src/city/defs/saffron';
import type { CityDef, CityView } from '../src/sim/types';
import { cityAtYear } from './city-helpers';
import { saffron } from './guide-helpers';

const jammed = (): CityView => {
  const c = saffron();
  c.apply({ t: 'next' });
  c.advance(44);
  return c;
};
const fake = (over: Partial<Problem>): Problem => ({ id: 'x', kind: 'cost', bar: 'cost', score: 10, place: '', cause: '', at: null, r: 0, ref: -1, ...over });

describe('problems', () => {
  it('names the jammed crossroads first, with a cause in plain words', () => {
    const c = jammed();
    const [p] = topProblems(c);
    expect(p?.kind).toBe('junction');
    expect(p?.ref).toBe(mainJunction(c)!.id);
    expect(p?.place).toMatch(/crossroads: \d+ s for each car/i);
    expect(p?.cause.length).toBeGreaterThan(10);
    expect(redCount(topProblems(c))).toBeGreaterThan(0);
  });
  it('is quiet at the first dawn', () => {
    const c = saffron();
    c.apply({ t: 'next' });
    expect(findProblems(c)).toEqual([]);
  });
  it('says what a missing turn is', () => {
    expect(whyJam(jammed(), -5)).toBe('');
  });
  it('sees places with no spaces once parking is a tool', () => {
    const c = cityAtYear(2);
    c.advance(60);
    const p = findProblems(c).find((x) => x.kind === 'parking');
    expect(p?.place).toMatch(/no space left/);
    expect(answersFor(c, p!).some((a) => a.act.t === 'park')).toBe(true);
  });
  it('writes no dashes', () => {
    for (const y of [1, 3, 5, 8]) { const c = cityAtYear(y); c.advance(50); for (const p of findProblems(c)) { expect(p.place + p.cause).not.toMatch(/[–—]/); for (const a of answersFor(c, p)) expect(a.label).not.toMatch(/[–—]/); } }
  });
  it('counts only red ones, three at most', () => {
    expect(redCount([1, 2, 3, 4, 5].map((i) => fake({ id: String(i), score: RED_SCORE })))).toBe(3);
    expect(redCount([fake({ score: RED_SCORE - 1 })])).toBe(0);
  });
});

describe('answers', () => {
  it('offers the roundabout and the street with the city\'s own prices', () => {
    const c = jammed();
    const p = topProblems(c)[0]!;
    const a = answersFor(c, p);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(a.length).toBeLessThanOrEqual(3);
    const ring = a.find((x) => x.act.t === 'control')!;
    expect(ring.price).toBe(c.quote({ t: 'control', node: p.ref, control: 'roundabout' }).cost);
    expect(a.some((x) => x.act.t === 'street')).toBe(true);
  });
  it('offers the night levers for prices', () => {
    const c = cityAtYear(5);
    const list = answersFor(c, fake({ kind: 'streets', bar: 'streets' }));
    expect(list.every((a) => a.act.t === 'night')).toBe(true);
    expect(answersFor(c, fake({ kind: 'double' })).some((a) => a.act.t === 'night')).toBe(true);
    expect(answersFor(c, fake({ kind: 'cutOff' }))).toEqual([]);
  });
});

describe('looking ahead', () => {
  it('says what is next and what to save for', () => {
    const c = saffron();
    const a = lookAhead(c);
    expect(a.lines.some((l) => l.startsWith('Next: The market doubles'))).toBe(true);
    expect(savingFor(c)?.name).toBeTruthy();
    expect(planText('Year 7: the far shore')).toBe('The far shore');
  });
});

describe('briefings', () => {
  const defs = [SAFFRON, ...(PAID_CITIES as readonly CityDef[])];
  it('are three short lines for every year of every city', () => {
    for (const d of defs) for (let year = 1; year <= 10; year++) {
      const b = briefing({ def: d, year, goal: { text: d.years[year - 1]!.goal.text, value: 0, target: 0, met: false, unit: '' } });
      for (const s of [b.now, b.goal, b.can]) { expect(s.length, `${d.id} ${year}: ${s}`).toBeGreaterThan(4); expect(s.length).toBeLessThan(110); expect(s).not.toMatch(/[–—]/); }
    }
  });
  it('explains the goal and points at it', () => {
    const c = jammed();
    const g = goalInfo(c);
    const j = mainJunction(c)!;
    expect(g.at).toEqual({ x: j.x, y: j.y });
    expect(g.how).toMatch(/junction/);
    for (const d of defs) for (let y = 0; y < 10; y++) expect(goalInfo({ ...stub(c), def: d, year: y + 1 } as CityView).how, `${d.id} ${y + 1}`).not.toBe('');
  });
});

/** A city's readings without its getters. */
function stub(c: CityView): Partial<CityView> {
  return { goal: c.goal, junctions: c.junctions, lots: c.lots, complaints: c.complaints, junctionStats: (id) => c.junctionStats(id), lotMood: (id) => c.lotMood(id) };
}

describe('ideas on the map', () => {
  it('finds a place for a car park and a bus line the city accepts', () => {
    const c = cityAtYear(5);
    const m = c.lots.find((l) => l.kind === 'market' && l.level > 0)!;
    const s = parkSite(c, { x: (m.gx + m.w / 2) * 40, y: (m.gy + m.h / 2) * 40 }, 'lot');
    expect(s && c.quote(s.cmd).ok).toBe(true);
    const l = lineIdea(c, 'bus');
    expect(l && c.quote({ t: 'line', mode: 'bus', stops: l.stops }).ok).toBe(true);
  });
});

describe('the box', () => {
  it('goes where it hides least', () => {
    const size = { w: 100, h: 50 };
    const places = [{ x: 0, y: 0 }, { x: 300, y: 0 }];
    expect(bestPlace(places, size, [{ box: { x: 0, y: 0, w: 50, h: 50 }, weight: 1 }])).toBe(1);
    expect(bestPlace(places, size, [])).toBe(0);
    expect(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(25);
  });
  it('moves the hand along a line', () => {
    expect(along([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 0.75)).toEqual({ x: 10, y: 5 });
  });
});
