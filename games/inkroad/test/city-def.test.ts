import { describe, expect, it } from 'vitest';
import { PAID_CITIES } from '../content/paid';
import { FREE_CITIES, loadCities } from '../src/city/cities';
import { SAFFRON } from '../src/city/defs/saffron';
import { cityProblems } from '../src/city/validate';

describe('city data', () => {
  it('every city is sound', () => {
    for (const c of [...FREE_CITIES, ...PAID_CITIES]) expect(cityProblems(c)).toEqual([]);
  });

  it('refuses junk and says why', () => {
    expect(cityProblems(null)).toEqual(['not a city']);
    expect(cityProblems({ ...SAFFRON, map: ['..', '...'] })).toContain('bad map');
    expect(cityProblems({ ...SAFFRON, blurb: 'a — b' })).toContain('bad texts');
    expect(cityProblems({ ...SAFFRON, lots: [{ ...SAFFRON.lots[0], gx: 0 }] }).join()).toContain('off the map');
    const { cities, problems } = loadCities([SAFFRON, { id: 'x' }]);
    expect(cities).toHaveLength(1);
    expect(problems).toHaveLength(1);
  });

  it('teaches with few tools: at most 13 in a city, none twice', () => {
    const tools = SAFFRON.years.flatMap((y) => y.tools);
    expect(new Set(tools).size).toBe(tools.length);
    expect(tools.length).toBeLessThanOrEqual(15);
  });
});
