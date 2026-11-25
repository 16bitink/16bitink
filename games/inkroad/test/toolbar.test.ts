import { describe, expect, it } from 'vitest';
import { MAX_TOOLS, visibleGroups } from '../src/ui/toolbar';
import type { ToolId } from '../src/sim/types';

describe('toolbar groups', () => {
  it('hides empty groups and keeps order', () => {
    const g = visibleGroups(['street', 'junction', 'remove']);
    expect(g.map((x) => x.name)).toEqual(['Roads', 'Junctions']);
    expect(g[0]!.tools).toEqual(['street', 'remove']);
  });
  it('shows every tool there is', () => {
    const all = ['street', 'avenue', 'boulevard', 'highway', 'remove', 'junction', 'flyover', 'underpass', 'kerb', 'parking', 'toll', 'bus', 'buslane', 'tram', 'metro', 'boat', 'oneway', 'square', 'zone'] as ToolId[];
    expect(visibleGroups(all).flatMap((g) => g.tools)).toHaveLength(MAX_TOOLS);
  });
});
