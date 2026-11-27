import { describe, expect, it } from 'vitest';
import type { Cell, Command, Pt, Road } from '../src/sim/types';
import { RoadTool } from '../src/scenes/tools/roadTool';
import type { ToolCtx } from '../src/scenes/tools/tool';

type RoadCmd = Extract<Command, { t: 'road' }>;
const at = (gx: number, gy: number): Pt => ({ x: gx * 40, y: gy * 40 });

const road = (p: Partial<Road> = {}): Road => ({
  id: 7, type: 'street', a: 1, b: 2, cells: [{ gx: 3, gy: 10 }, { gx: 12, gy: 10 }], line: [{ x: 120, y: 400 }, { x: 480, y: 400 }], level: 0, links: [], oneWay: false, bridge: false, busLane: false,
  kerb: false, toll: false, truckBan: false, works: 0, nightWorks: false, fixed: false, ...p,
});

/** A hand-made ToolCtx: every proposal is kept with its `dragging` flag. */
function fake(touch: boolean, roads: Road[] = []) {
  const asked: { cmd: Command | null; label: string; dragging: boolean }[] = [];
  const city = { def: { map: Array.from({ length: 20 }, () => '.'.repeat(20)) }, roads, junctions: [], carParks: [], lines: [] };
  const ctx = {
    city, ghosts: { grid: () => {}, dot: () => {}, road: () => {}, pick: () => {} }, arrows: {}, slack: 8, touch,
    propose: (cmd: Command | null, label: string, _at: Pt, dragging: boolean) => { asked.push({ cmd, label, dragging }); return cmd ? { ok: true, cost: 1, land: 0, works: 0 } : null; },
    hint: () => {}, select: () => {},
  } as unknown as ToolCtx;
  const tool = new RoadTool(ctx, 'street', false);
  const last = () => asked[asked.length - 1]!;
  const cells = (): Cell[] => (last().cmd as RoadCmd).cells;
  return { tool, asked, last, cells };
}

describe('RoadTool on a mouse', () => {
  it('starts on a click and follows the pointer with a live ghost', () => {
    const t = fake(false);
    t.tool.tap(at(2, 2));
    expect(t.tool.points).toBe(1);
    expect(t.last().cmd).toBeNull();
    t.tool.draw(at(6, 2));
    expect(t.cells()).toHaveLength(5);
    expect(t.last().dragging).toBe(true); // Build waits for the finish
    t.tool.draw(at(8, 2));
    expect(t.cells()).toHaveLength(7);
  });

  it('runs the longer way first, then the diagonal', () => {
    const t = fake(false);
    t.tool.tap(at(2, 2));
    t.tool.draw(at(7, 4)); // dx 5, dy 2: straight 3, diagonal 2
    expect(t.cells().slice(0, 4)).toEqual([{ gx: 2, gy: 2 }, { gx: 3, gy: 2 }, { gx: 4, gy: 2 }, { gx: 5, gy: 2 }]);
    expect(t.cells()[5]).toEqual({ gx: 7, gy: 4 });
  });

  it('fixes corners on each click and finishes on the last point again', () => {
    const t = fake(false);
    t.tool.tap(at(2, 2));
    t.tool.tap(at(6, 2));
    t.tool.tap(at(6, 5));
    expect(t.tool.points).toBe(3);
    expect(t.cells()).toHaveLength(8);
    t.tool.tap(at(6, 5)); // the same point again
    expect(t.last().dragging).toBe(false);
    t.tool.draw(at(9, 9)); // no longer following
    expect(t.cells()).toHaveLength(8);
  });

  it('finishes on Enter, and says so when there was nothing to finish', () => {
    const t = fake(false);
    expect(t.tool.finish()).toBe(false);
    t.tool.tap(at(2, 2));
    t.tool.draw(at(5, 2));
    expect(t.tool.finish()).toBe(true);
    expect(t.last().dragging).toBe(false);
    expect(t.tool.finish()).toBe(false); // Enter again builds, in the UI
  });

  it('drops the last fixed corner on Backspace, then the start', () => {
    const t = fake(false);
    t.tool.tap(at(2, 2));
    t.tool.tap(at(6, 2));
    t.tool.tap(at(6, 5));
    t.tool.undo();
    expect(t.tool.points).toBe(2);
    expect(t.cells()).toHaveLength(5);
    t.tool.undo();
    t.tool.undo();
    expect(t.tool.points).toBe(0);
    expect(t.last().cmd).toBeNull();
  });

  it('keeps press-drag: it draws, and goes on from its end', () => {
    const t = fake(false);
    expect(t.tool.dragStart(at(2, 2))).toBe(true);
    t.tool.drag(at(5, 2));
    t.tool.dragEnd(at(6, 2));
    expect(t.cells()).toHaveLength(5);
    expect(t.last().dragging).toBe(false);
    expect(t.tool.dragStart(at(6, 2))).toBe(true);
    t.tool.dragEnd(at(8, 4));
    expect(t.cells()).toHaveLength(7);
  });

  it('counts a drag that lets go while chaining as a click there', () => {
    const t = fake(false);
    t.tool.tap(at(2, 2));
    t.tool.dragStart(at(3, 3));
    t.tool.drag(at(6, 2));
    t.tool.dragEnd(at(6, 2));
    expect(t.tool.points).toBe(2);
  });

  it('cancels everything, and clicking the start twice drops it', () => {
    const t = fake(false);
    t.tool.tap(at(2, 2));
    t.tool.tap(at(2, 2));
    expect(t.tool.points).toBe(0);
    t.tool.tap(at(2, 2));
    t.tool.tap(at(5, 2));
    t.tool.cancel();
    expect(t.tool.points).toBe(0);
    expect(t.last().cmd).toBeNull();
  });

  it('upgrades a road of another kind on a tap, but starts on a road of its own kind', () => {
    const t = fake(false, [road({ type: 'avenue' })]);
    t.tool.tap(at(6, 10));
    expect(t.last().cmd).toEqual({ t: 'upgrade', road: 7, type: 'street' });
    t.tool.cancel();
    const same = fake(false, [road()]);
    same.tool.tap(at(6, 10));
    expect(same.tool.points).toBe(1);
  });

  it('adds points on a road once a road is in progress', () => {
    const t = fake(false, [road({ type: 'avenue' })]);
    t.tool.tap(at(6, 4));
    t.tool.tap(at(6, 10));
    expect(t.last().cmd).toMatchObject({ t: 'road' });
  });
});

describe('RoadTool on a finger', () => {
  it('lets a drag pan the map', () => {
    const t = fake(true);
    expect(t.tool.dragStart(at(2, 2))).toBe(false);
  });

  it('places the start and each corner by tap, with Build ready at once', () => {
    const t = fake(true);
    t.tool.tap(at(2, 2));
    expect(t.tool.points).toBe(1);
    t.tool.tap(at(6, 2));
    expect(t.cells()).toHaveLength(5);
    expect(t.last().dragging).toBe(false);
    t.tool.tap(at(6, 5));
    expect(t.tool.points).toBe(3);
    expect(t.cells()).toHaveLength(8);
    t.tool.draw(null);
    expect(t.cells()).toHaveLength(8);
  });

  it('undoes the last point, and the start with it', () => {
    const t = fake(true);
    t.tool.tap(at(2, 2));
    t.tool.tap(at(6, 2));
    t.tool.tap(at(6, 5));
    t.tool.undo();
    expect(t.tool.points).toBe(2);
    expect(t.cells()).toHaveLength(5);
    t.tool.undo();
    expect(t.tool.points).toBe(1);
    expect(t.last().cmd).toBeNull();
    t.tool.undo();
    expect(t.tool.points).toBe(0);
  });

  it('ignores a tap on the last point, and is ready for the next road after Build', () => {
    const t = fake(true);
    t.tool.tap(at(2, 2));
    t.tool.tap(at(6, 2));
    t.tool.tap(at(6, 2));
    expect(t.tool.points).toBe(2);
    t.tool.built(t.last().cmd!);
    expect(t.tool.points).toBe(0);
    t.tool.tap(at(8, 8));
    expect(t.tool.points).toBe(1);
  });
});
