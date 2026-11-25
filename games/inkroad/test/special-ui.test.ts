import { describe, expect, it } from 'vitest';
import { overlaysFor } from '../src/app/overlays';
import { MINIBUS_TINT } from '../src/render/cars/shapes';
import { paintOf } from '../src/render/cars/carAtlas';
import { bucket } from '../src/render/ground/wornRoads';
import { splitTunnel } from '../src/render/ground/tunnels';
import { CITY_META, statusOf } from '../src/ui/cityMeta';
import { OPEN_BAR_MAX, visibleGroups } from '../src/ui/toolbar';
import type { Road } from '../src/sim/types';

describe('city desk status', () => {
  const [one, two, three, four] = CITY_META;
  it('trusts the table for players without the content', () => {
    expect(statusOf(one!, [1], false)).toBe('free');
    expect(statusOf(three!, [1], false)).toBe('paid');
    expect(statusOf(four!, [1], false)).toBe('soon');
  });
  it('lets the loaded content decide for owners', () => {
    expect(statusOf(two!, [1, 2, 3], true)).toBe('paid');
    expect(statusOf(four!, [1, 2, 3], true)).toBe('soon');
    expect(statusOf(four!, [1, 2, 3, 4], true)).toBe('paid');
  });
});

describe('special views', () => {
  it('adds the condition map only where roads age', () => {
    expect(overlaysFor(false)).not.toContain('condition');
    expect(overlaysFor(true)).toContain('condition');
  });
  it('tells a minibus van from a delivery van', () => {
    expect(paintOf('van', MINIBUS_TINT, 2)).toBe(1);
    expect(paintOf('van', 0, 2)).toBe(0);
    expect(paintOf('car', 7, 6)).toBe(1);
  });
  it('buckets wear and treats absent condition as new', () => {
    expect(bucket(undefined)).toBe(8);
    expect(bucket(0.5)).toBe(4);
  });
  it('splits a tunnel at the water and leaves other roads alone', () => {
    const rows = ['.....~~~~~.....', '.....~~~~~.....'];
    const line = [{ x: 20, y: 20 }, { x: 600, y: 20 }];
    const road = { id: 1, a: 1, b: 2, line, tunnel: true } as unknown as Road;
    const t = splitTunnel(road, rows);
    expect(t).not.toBeNull();
    expect(t!.head.b).toBe(-1);
    expect(t!.tail.a).toBe(-1);
    expect(splitTunnel({ ...road, tunnel: false } as Road, rows)).toBeNull();
  });
  it('folds a long toolbar into groups', () => {
    const all = visibleGroups(['street', 'avenue', 'remove', 'junction', 'kerb', 'parking']);
    expect(all.reduce((n, g) => n + g.tools.length, 0)).toBeGreaterThan(OPEN_BAR_MAX);
  });
});
