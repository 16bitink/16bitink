import { describe, expect, it } from 'vitest';
import { CELL } from '../src/sim/constants';
import { gardenPlan, hedgeRuns, isGarden, wallXs, GATE_W } from '../src/render/gardenLayout';
import { gardenSpots, plotSpots } from '../src/render/upright/lots';
import { FOOTPRINTS, GARDEN_KIND } from '../src/art/manifest';
import { layoutPlace, makeGeo } from '../src/render/cars/parkingSlots';
import type { Lot, ParkingView, Road } from '../src/sim/types';

const lot = { id: 5, name: 'Row', kind: 'home', gx: 17, gy: 19, w: 4, h: 4, variant: 0, garden: true, access: { road: 1, s: 760 } } as unknown as Lot;
const road = { id: 1, type: 'street', level: 0, oneWay: false, bridge: false, line: [{ x: 0, y: 24 * CELL }, { x: 900, y: 24 * CELL }] } as unknown as Road;

describe('garden lots', () => {
  it('knows a garden lot', () => {
    expect(isGarden(lot)).toBe(true);
    expect(isGarden({ ...lot, h: 2 })).toBe(false);
    expect(isGarden({ ...lot, garden: undefined })).toBe(false);
  });
  it('puts plot pictures only in the north two rows, one per column', () => {
    const spots = plotSpots(lot);
    expect(spots).toHaveLength(2);
    for (const s of spots) expect(s.y).toBeLessThanOrEqual((lot.gy + 2) * CELL);
    expect(plotSpots({ ...lot, garden: false })).toHaveLength(4);
  });
  it('lays the garden in the south half with a path per gate ending on the hedge', () => {
    const p = gardenPlan(lot);
    expect(p.lawn.y).toBe((lot.gy + 2) * CELL);
    expect(p.lawn.h).toBe(2 * CELL);
    expect(p.gates).toHaveLength(2);
    p.paths.forEach((path, i) => {
      expect(path[0]).toEqual(p.gates[i]);
      expect(path[path.length - 1]!.y).toBe(p.hedgeY);
      expect(path[path.length - 1]!.x).toBe(p.gates[i]!.x);
    });
  });
  it('leaves a gap in the hedge at every gate', () => {
    const p = gardenPlan(lot);
    const runs = hedgeRuns(p);
    expect(runs).toHaveLength(3);
    for (const g of p.gates) expect(runs.some(([a, b]) => g.x > a - 0.001 && g.x < b + 0.001)).toBe(false);
    expect(runs[1]![0] - runs[0]![1]).toBeCloseTo(GATE_W);
  });
  it('walls the compounds: the lot sides and one divider between neighbours', () => {
    const p = gardenPlan(lot);
    expect(wallXs(p)).toEqual([p.lot.x, p.lot.x + p.lot.w / 2, p.lot.x + p.lot.w]);
    for (const g of p.gates) expect(wallXs(p).some((x) => Math.abs(x - g.x) < GATE_W)).toBe(false);
  });
  it('stands one painted garden piece under each plot column, its front wall on the south edge', () => {
    const p = gardenPlan(lot);
    const plots = plotSpots(lot);
    const pieces = gardenSpots(lot);
    expect(FOOTPRINTS[GARDEN_KIND]).toEqual([2, 2]);
    expect(pieces).toHaveLength(plots.length);
    pieces.forEach((g, i) => {
      expect(g.kind).toBe(GARDEN_KIND);
      expect(g.x).toBe(plots[i]!.x);
      expect(g.x).toBe(p.gates[i]!.x);
      expect(g.y).toBe(p.lot.y + p.lot.h);
      expect(g.y - plots[i]!.y).toBe(2 * CELL);
    });
    expect(pieces[0]!.variant).not.toBe(pieces[1]!.variant);
    expect(gardenSpots(lot)).toEqual(pieces);
    expect(gardenSpots({ ...lot, garden: false })).toHaveLength(0);
    expect(gardenSpots({ ...lot, kind: 'park' } as Lot)).toHaveLength(0);
  });
  it('runs each painted path straight from the villa gate to the front gate', () => {
    const p = gardenPlan(lot);
    p.paths.forEach((path) => { for (const q of path) expect(q.x).toBe(path[0]!.x); });
  });
  it('parks home cars in the strip south of the garden, clear of the gates', () => {
    const geo = makeGeo({ roads: [road], lots: [lot], carParks: [], beaches: [] });
    const v: ParkingView = { key: 'k', kind: 'home', spaces: 9, lot: 5, cars: Array.from({ length: 3 }, (_, i) => ({ uid: i + 1, tint: i, kind: 'car' as const })) };
    const slots = layoutPlace(v, geo).filter((s) => s !== null);
    expect(slots).toHaveLength(3);
    const p = gardenPlan(lot);
    const south = p.lot.y + p.lot.h;
    for (const s of slots) {
      expect(s!.y).toBeGreaterThan(south);
      for (const g of p.gates) expect(Math.abs(s!.x - g.x)).toBeGreaterThan(GATE_W / 2);
    }
  });
});
