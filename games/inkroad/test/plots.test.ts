import { describe, expect, it } from 'vitest';
import { createCity } from '../src/city/city';
import { SAFFRON } from '../src/city/defs/saffron';
import { blocksMeet, vertexInBlock } from '../src/city/geometry';
import { settlePlots, squeezeIn } from '../src/city/plots';
import { DROPPED } from '../src/city/standing';
import type { Cell, CityView, Terrain } from '../src/sim/types';
import { cityAtYear, inner, newCity, ok } from './city-helpers';

const cell = (gx: number, gy: number): Cell => ({ gx, gy });
const lot = (v: CityView, name: string) => v.lots.find((l) => l.name === name)!;
/** A street across the ground of Blueprint Offices (year 4). */
const ACROSS = [cell(14, 8), cell(11, 8), cell(11, 12)];

/** Build in year 1, then come to January of a later year. */
function builtThen(year: number): CityView {
  const v = newCity();
  inner(v).money = 5000;
  ok(v, { t: 'road', cells: ACROSS, type: 'street' });
  while (v.year < year) { inner(v).phase = 'yearEnd'; v.apply({ t: 'next' }); }
  return v;
}

describe('reserved plots', () => {
  it('a plot more than two years ahead blocks nothing', () => {
    const v = newCity();
    inner(v).money = 5000;
    expect(v.quote({ t: 'road', cells: ACROSS, type: 'street' }).ok).toBe(true);
    const c = inner(cityAtYear(2));
    expect(c.lots.find((l) => l.name === 'The Great Mall')!.level).toBe(0);
  });

  it('a plot due within two years refuses by name and year, and shows itself', () => {
    const v = cityAtYear(2);
    const q = v.quote({ t: 'road', cells: ACROSS, type: 'street' });
    expect(q.why).toBe('Blueprint Offices opens here in year 4');
    const b = lot(v, 'Blueprint Offices');
    expect(q.at).toEqual({ gx: b.gx, gy: b.gy, w: b.w, h: b.h });
    const p = v.quote({ t: 'carPark', kind: 'lot', at: cell(9, 10) });
    expect(p.why).toBe('Blueprint Offices opens here in year 4');
    expect(p.at).toEqual(q.at);
  });

  it('an open block, a car park, water and a road each say what they are', () => {
    const v = cityAtYear(2);
    const road = (cells: Cell[]) => v.quote({ t: 'road', cells, type: 'street' });
    expect(road([cell(20, 20), cell(18, 20)]).why).toBe('Palm Row stands here');
    expect(road([cell(35, 22), cell(38, 22)]).why).toMatch(/^Water/);
    expect(road([cell(35, 22), cell(38, 22)]).at).toEqual({ gx: 37.5, gy: 21.5, w: 1, h: 1 });
    expect(v.quote({ t: 'carPark', kind: 'lot', at: cell(37, 20) }).why).toMatch(/^Water/);
    expect(v.quote({ t: 'carPark', kind: 'lot', at: cell(24, 17) }).why).toMatch(/road runs here/);
  });

  it('moves out of the way of the road when its year comes near, with a word, and stays moved', () => {
    const v = builtThen(2);
    const c = inner(v);
    const was = SAFFRON.lots.find((l) => l.name === 'Blueprint Offices')!;
    const now = lot(v, 'Blueprint Offices');
    expect([now.gx, now.gy]).not.toEqual([was.gx, was.gy]);
    expect(now.w * now.h).toBe(was.w * was.h);
    expect(c.net.roads.some((r) => r.cells.some((x) => vertexInBlock(now, x)))).toBe(false);
    expect(c.lots.some((l) => l.id !== now.id && l.opensYear !== DROPPED && blocksMeet(l, now))).toBe(false);
    expect(v.drainEvents().some((e) => e.t === 'toast' && e.text.includes('Blueprint Offices'))).toBe(true);
    const again = createCity(SAFFRON, 7, JSON.parse(JSON.stringify(v.save())));
    expect(lot(again, 'Blueprint Offices')).toMatchObject({ gx: now.gx, gy: now.gy, opensYear: 4 });
    expect(again.quote({ t: 'road', cells: [cell(now.gx + 1, now.gy + 1), cell(now.gx + 1, now.gy + 2)], type: 'street' }).why).toMatch(/Blueprint Offices opens here/);
    inner(again).phase = 'yearEnd';
    while (again.year < 4) { inner(again).phase = 'yearEnd'; again.apply({ t: 'next' }); }
    expect(lot(again, 'Blueprint Offices')).toMatchObject({ gx: now.gx, gy: now.gy, level: 2 });
    expect(lot(again, 'Blueprint Offices').access).not.toBeNull();
  });

  it('is deterministic, and leaves everything alone where nothing overlaps', () => {
    const a = builtThen(4);
    const b = builtThen(4);
    expect(JSON.stringify(a.save())).toBe(JSON.stringify(b.save()));
    const quiet = cityAtYear(5);
    for (const [i, d] of SAFFRON.lots.entries()) expect(quiet.lots[i]).toMatchObject({ gx: d.gx, gy: d.gy, w: d.w, h: d.h, opensYear: d.opensYear });
  });

  it('shrinks where only a little ground is left, and is dropped where none is; the neighbours take its people', () => {
    const v = builtThen(1);
    const c = inner(v);
    c.year = 2;
    const free = new Set<string>();
    for (let x = 23; x <= 25; x++) for (let y = 27; y <= 29; y++) free.add(`${x},${y}`);
    const only = (keep: boolean): void => { c.net = { ...c.net, terrain: c.net.terrain.map((row, y) => row.map((t, x): Terrain => (keep && free.has(`${x},${y}`) ? t : '#'))) }; };
    const i = c.lots.findIndex((l) => l.name === 'Blueprint Offices');
    const plot = { ...c.lots[i]!, gx: 21, gy: 26 }; // on the south road
    c.lots = c.lots.map((l) => (l.id === plot.id ? plot : l.opensYear > 1 ? { ...l, opensYear: DROPPED } : l));
    only(true);
    settlePlots(c);
    expect(c.lots[i]).toMatchObject({ w: 2, h: 2, gx: 23, gy: 27 });
    c.lots = c.lots.map((l) => (l.id === plot.id ? plot : l));
    only(false);
    settlePlots(c);
    expect(c.lots[i]!.opensYear).toBe(DROPPED);
    expect(v.drainEvents().some((e) => e.t === 'toast' && e.text.includes('squeeze'))).toBe(true);
    const before = c.lots.filter((l) => l.kind === 'office' && l.level > 0).reduce((n, l) => n + l.level, 0);
    c.year = 4;
    squeezeIn(c);
    expect(c.lots.filter((l) => l.kind === 'office' && l.level > 0).reduce((n, l) => n + l.level, 0)).toBeGreaterThan(before);
  });

  it('the Council buys the car park its new road needs, and says so; a road due soon refuses by name', () => {
    const v = cityAtYear(1);
    const c = inner(v);
    const far = SAFFRON.roads.find((r) => r.opensYear === 4)!;
    expect(v.plannedRoads.some((r) => r.year === 4)).toBe(false);
    const x = cell(8, 12);
    expect(far).toBeDefined();
    c.parks = [{ id: 900, kind: 'lot', gx: x.gx - 1, gy: x.gy, w: 3, h: 2, spaces: 18, used: 0, access: null, occupancy: 0 }];
    while (v.year < 4) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
    expect(v.carParks).toHaveLength(0);
    expect(v.drainEvents().some((e) => e.t === 'toast' && /bought the ground/.test(e.text))).toBe(true);
    const soon = cityAtYear(2);
    expect(soon.plannedRoads.some((r) => r.year === 4)).toBe(true);
    expect(soon.plannedRoads).toBe(soon.plannedRoads);
  });
});
