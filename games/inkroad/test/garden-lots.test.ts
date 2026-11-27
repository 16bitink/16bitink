import { describe, expect, it } from 'vitest';
import { createCity } from '../src/city/city';
import { SAFFRON } from '../src/city/defs/saffron';
import { builtArea } from '../src/city/geometry';
import { householdsIn } from '../src/city/households';
import { population } from '../src/city/growth';
import { routineOf } from '../src/city/routine';
import { cityProblems } from '../src/city/validate';
import type { Lot } from '../src/sim/types';
import { SEED, inner } from './city-helpers';

const palm = (lots: readonly Lot[]): Lot => lots.find((l) => l.name === 'Palm Row')!;

describe('garden lots', () => {
  it('Palm Row is a 4 x 4 garden lot that counts as the 4 x 2 lot it replaced', () => {
    const c = inner(createCity(SAFFRON, SEED));
    const garden = palm(c.lots);
    expect(garden).toMatchObject({ w: 4, h: 4, garden: true });
    const plain: Lot = { ...garden, h: 2, gy: garden.gy + 2, garden: undefined };
    expect(builtArea(garden)).toBe(builtArea(plain));
    expect(builtArea(garden)).toBe(8);
    const profile = routineOf(c);
    expect(householdsIn(c, { ...garden, access: garden.access ?? plain.access }, profile)).toBe(householdsIn(c, { ...plain, access: garden.access }, profile));
    const people = population(c);
    c.lots = c.lots.map((l) => (l.id === garden.id ? plain : l));
    expect(population(c)).toBe(people);
  });

  it('rejects a garden lot that is not a home, 4 deep and whole plots wide', () => {
    const lot = SAFFRON.lots.find((l) => l.name === 'Palm Row')!;
    const bad = (more: object): string => cityProblems({ ...SAFFRON, lots: [{ ...lot, ...more }] }).filter((p) => !p.startsWith('year ')).join();
    expect(bad({})).toBe('');
    expect(bad({ h: 2, gy: lot.gy + 2 })).toContain('garden lot');
    expect(bad({ kind: 'shops' })).toContain('garden lot');
    expect(bad({ w: 3 })).toContain('garden lot');
  });

  it('keeps garden through a save and load, and a shrunk lot loses it', () => {
    const v = createCity(SAFFRON, SEED);
    const back = inner(createCity(SAFFRON, SEED, JSON.parse(JSON.stringify(v.save()))));
    expect(palm(back.lots).garden).toBe(true);
    const c = inner(v);
    const shrunk = c.lots.map((l) => (l.name === 'Palm Row' ? { ...l, gy: l.gy + 2, h: 2, garden: undefined } : l));
    c.lots = shrunk;
    const again = inner(createCity(SAFFRON, SEED, JSON.parse(JSON.stringify(v.save()))));
    expect(palm(again.lots)).toMatchObject({ h: 2 });
    expect(palm(again.lots).garden).toBeUndefined();
  });
});
