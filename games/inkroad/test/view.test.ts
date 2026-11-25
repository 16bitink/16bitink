import { describe, expect, it } from 'vitest';
import { buildingFallbacks, textureKeys } from '../src/art/manifest';
import { pack } from '../src/render/atlas';
import { headingFrame, HEADINGS } from '../src/render/cars/carAtlas';
import { baysOf } from '../src/render/cars/parkedCars';
import { nightOf, washOf } from '../src/render/daylight';
import { groundParts, raisedSpan } from '../src/render/deckHeight';
import { lineLength, nearestOnLine, offsetLine, pointAt, ribbon, soften, subLine } from '../src/render/geom';
import { cornerOf, laneMarks, taperOf } from '../src/render/ground/roadShape';
import { fieldAt, letterAt, outlines } from '../src/render/ground/terrain';
import { arrowOutline, arrowsOf, worstOf } from '../src/render/overlay/arrows';
import { wrap } from '../src/render/overlay/ghostLayer';
import { project, projectAngle, queryNumber, TILT, unproject } from '../src/render/projection';
import { heat, JAM_HEX } from '../src/render/style';
import { plotSpots } from '../src/render/upright/lots';
import { Camera } from '../src/scenes/camera';
import { dirOf, elbow, extend, snapCell } from '../src/scenes/tools/snap';
import { roadCommand } from '../src/scenes/tools/tapTools';
import { makeTool, sinks } from '../src/scenes/tools/make';
import type { ToolCtx } from '../src/scenes/tools/tool';
import type { Command, Lot, Movement, Pt, Road } from '../src/sim/types';

const road = (p: Partial<Road> = {}): Road => ({
  id: 1, type: 'street', a: 1, b: 2, cells: [], line: [{ x: 0, y: 0 }, { x: 400, y: 0 }], level: 0, links: [], oneWay: false, bridge: false, busLane: false,
  kerb: false, toll: false, truckBan: false, works: 0, nightWorks: false, fixed: false, ...p,
});

describe('projection', () => {
  it('goes there and back at any height', () => {
    const p = { x: 120, y: 340 };
    for (const z of [0, 26, -8]) {
      const q = unproject(project(p, z), z);
      expect(q.x).toBeCloseTo(p.x);
      expect(q.y).toBeCloseTo(p.y);
    }
  });
  it('draws higher things further up and squashes north to south', () => {
    expect(project({ x: 0, y: 100 }, 20).y).toBeLessThan(project({ x: 0, y: 100 }).y);
    expect(projectAngle(Math.PI / 4)).toBeCloseTo(Math.atan(TILT));
  });
  it('takes an angle from the query only when it is sane', () => {
    expect(queryNumber('?tilt=0.7', 'tilt', 0.87)).toBe(0.7);
    expect(queryNumber('?tilt=9', 'tilt', 0.87)).toBe(0.87);
    expect(queryNumber('?tilt=x', 'tilt', 0.87)).toBe(0.87);
    expect(queryNumber('', 'tilt', 0.87)).toBe(0.87);
  });
});

describe('lines', () => {
  const line = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
  it('measures, cuts and offsets', () => {
    expect(lineLength(line)).toBe(200);
    expect(pointAt(line, 150)).toMatchObject({ x: 100, y: 50 });
    expect(lineLength(subLine(line, 50, 120))).toBeCloseTo(70);
    expect(subLine(line, 80, 80)).toEqual([]);
    expect(offsetLine([{ x: 0, y: 0 }, { x: 10, y: 0 }], 5)[0]).toMatchObject({ y: 5 });
    expect(ribbon(line, 4)).toHaveLength(6);
    expect(nearestOnLine(line, { x: 50, y: 9 })).toMatchObject({ d: 9, s: 50 });
  });
  it('softens corners but keeps the ends', () => {
    const s = soften(line);
    expect(s[0]).toEqual(line[0]);
    expect(s[s.length - 1]).toEqual(line[2]);
    expect(s.length).toBeGreaterThan(line.length);
  });
});

describe('snapping', () => {
  const b = { cols: 20, rows: 20 };
  it('snaps to the nearest vertex and stays on the map', () => {
    expect(snapCell({ x: 95, y: 42 }, b)).toEqual({ gx: 2, gy: 1 });
    expect(snapCell({ x: -900, y: 9000 }, b)).toEqual({ gx: 0, gy: 19 });
  });
  it('is pulled to a road close by', () => {
    expect(snapCell({ x: 98, y: 40 }, b, new Set(['3,1']))).toEqual({ gx: 3, gy: 1 });
    expect(snapCell({ x: 82, y: 40 }, b, new Set(['3,1']))).toEqual({ gx: 2, gy: 1 });
  });
  it('bends once, the way the finger set off', () => {
    const a = { gx: 0, gy: 0 };
    const to = { gx: 5, gy: 2 };
    expect(elbow(a, to, { dx: 1, dy: 0 }).map((c) => `${c.gx}${c.gy}`).join(' ')).toBe('00 10 20 30 41 52');
    expect(elbow(a, to, { dx: 1, dy: 1 }).map((c) => `${c.gx}${c.gy}`).join(' ')).toBe('00 11 22 32 42 52');
    expect(elbow(a, to, null)).toHaveLength(6);
    expect(elbow(a, a, null)).toEqual([a]);
  });
  it('reads the first direction only after some travel', () => {
    expect(dirOf({ x: 0, y: 0 }, { x: 5, y: 0 }, 40)).toBeNull();
    expect(dirOf({ x: 0, y: 0 }, { x: 60, y: 55 }, 40)).toEqual({ dx: 1, dy: 1 });
  });
  it('grows a path and shortens it when the finger goes back', () => {
    const p = [{ gx: 0, gy: 0 }, { gx: 1, gy: 0 }, { gx: 2, gy: 0 }];
    expect(extend(p, [{ gx: 3, gy: 0 }])).toHaveLength(4);
    expect(extend(p, [{ gx: 1, gy: 0 }])).toHaveLength(2);
  });
});

describe('arrows', () => {
  const m = (p: Partial<Movement>): Movement => ({ node: 1, fromRoad: 1, toRoad: 2, cars: 10, wait: 2, share: 0.1, arrow: [{ x: 0, y: 0 }, { x: 60, y: 0 }], flyover: false, ...p });
  it('puts the worst on top, thick for many cars, red for a long wait', () => {
    const out = arrowsOf([m({ share: 0.61, wait: 60, cars: 90 }), m({ share: 0.1, toRoad: 3 })]);
    const worst = worstOf(out)!;
    expect(worst.m.share).toBe(0.61);
    expect(worst.colour).toBe(JAM_HEX);
    expect(worst.width).toBeGreaterThan(out[0]!.width);
  });
  it('leaves out U-turns, and a calm junction has no worst', () => {
    expect(arrowsOf([m({ toRoad: 1 })])).toHaveLength(0);
    expect(worstOf(arrowsOf([m({ share: 1, wait: 0.5 })]))).toBeNull();
    expect(worstOf([])).toBeNull();
  });
  it('draws a closed outline with a tip at the head', () => {
    const pts = arrowOutline([{ x: 0, y: 0 }, { x: 60, y: 0 }], 6);
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(60);
  });
});

describe('roads', () => {
  it('finds where two kerbs meet', () => {
    const c = cornerOf({ a: 0, half: 10 }, { a: Math.PI / 2, half: 10 })!;
    expect(c.tp).toBeCloseTo(10);
    expect(c.tq).toBeCloseTo(10);
    expect(cornerOf({ a: 0, half: 10 }, { a: Math.PI, half: 10 })).toBeNull();
  });
  it('marks lanes on both sides, or across a one-way road', () => {
    expect(laneMarks(road())).toEqual([]);
    expect(laneMarks(road({ type: 'avenue' })).sort((a, b) => a - b)).toEqual([-9, 9]);
    expect(laneMarks(road({ type: 'avenue', oneWay: true }))).toEqual([-9, 0, 9]);
    expect(taperOf(40, 10, 1000)).toBeCloseTo(78);
    expect(taperOf(40, 10, 50)).toBeCloseTo(35);
  });
  it('keeps the feet of a flyover on the ground', () => {
    const fly = road({ level: 1, oneWay: true, flyover: { node: 1, fromRoad: 1, toRoad: 2 } });
    const span = raisedSpan(fly, 5)!;
    expect(span[0]).toBeGreaterThan(10);
    expect(span[1]).toBeLessThan(390);
    expect(groundParts(fly)).toHaveLength(2);
    expect(raisedSpan(road(), 5)).toBeNull();
  });
});

describe('terrain', () => {
  const rows = ['........', '........', '..~~~...', '..~~~...', '..~~~...', '........', '........'];
  it('is wet in the pond and dry outside, and the outline closes round it', () => {
    expect(fieldAt(rows, '~', 120, 120)).toBeGreaterThan(0.8);
    expect(fieldAt(rows, '~', 0, 0)).toBeLessThan(0.1);
    const loops = outlines(rows, '~');
    expect(loops).toHaveLength(1);
    const xs = loops[0]!.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(80);
    expect(outlines(rows, 'p')).toEqual([]);
  });
  it('carries water and rock past the edge, nothing else', () => {
    expect(letterAt(['~p'], -5, 0)).toBe('~');
    expect(letterAt(['~p'], 9, 0)).toBe('.');
  });
});

describe('pictures', () => {
  it('falls back to lower variants, levels and the gulf set', () => {
    expect(buildingFallbacks('oldtown', 'home', 2, 1)).toEqual([
      'b/oldtown/home2-1', 'b/oldtown/home2-0', 'b/oldtown/home1-1', 'b/oldtown/home1-0', 'b/gulf/home2-1', 'b/gulf/home2-0', 'b/gulf/home1-1', 'b/gulf/home1-0',
    ]);
    expect(textureKeys('oldtown', 'sand')[0]).toBe('tex/oldtown-ground');
  });
  it('packs without overlap and refuses what cannot fit', () => {
    const { spots, pages } = pack(Array.from({ length: 40 }, (_, i) => ({ name: `p${i}`, w: 60 + i, h: 90 })), 512, 2);
    expect(pages).toBeGreaterThan(1);
    for (const a of spots) for (const b of spots) if (a !== b && a.page === b.page) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true);
    expect(() => pack([{ name: 'big', w: 600, h: 10 }], 512)).toThrow();
  });
  it('bakes headings and leaves only a small turn', () => {
    const h = headingFrame(-0.05);
    expect(h.index).toBe(0);
    expect(Math.abs(headingFrame(1.3).rest)).toBeLessThanOrEqual(Math.PI / HEADINGS + 1e-9);
  });
  it('lays plots and whole-lot pictures', () => {
    const lot = (p: Partial<Lot>): Lot => ({ id: 3, name: '', kind: 'home', gx: 2, gy: 2, w: 4, h: 4, level: 1, opensYear: 1, maxLevel: 4, access: null, district: '', variant: 0, ...p });
    expect(plotSpots(lot({}))).toHaveLength(4);
    expect(plotSpots(lot({ kind: 'mall', w: 6, h: 4 }))[0]).toMatchObject({ x: 200, y: 240, size: 1 });
    expect(plotSpots(lot({ kind: 'park' }))).toHaveLength(0);
    expect(baysOf({ gx: 0, gy: 0, w: 3, h: 2 }).length).toBeGreaterThan(8);
  });
  it('keeps red for jams', () => {
    expect(heat(1)).toBe(JAM_HEX);
    expect(heat(0)).not.toBe(JAM_HEX);
    expect(heat(7)).toBe(JAM_HEX);
  });
});

describe('light', () => {
  it('is day at noon and night at midnight', () => {
    expect(nightOf(12)).toBe(0);
    expect(nightOf(23)).toBe(1);
    expect(nightOf(2)).toBe(1);
    expect(washOf(13)).toBe(0xffffff);
    expect(washOf(23)).not.toBe(0xffffff);
  });
  it('wraps refusals into short lines', () => {
    expect(wrap('Old quarter: only a street fits here', 18).split('\n').length).toBeGreaterThan(1);
  });
});

describe('camera', () => {
  const cam = (): Camera => {
    const c = new Camera();
    c.setMap({ x0: 0, y0: 0, x1: 2240, y1: 1520 });
    c.setSize({ w: 844, h: 390 });
    c.jump({ x: 1000, y: 700 }, 1.3);
    return c;
  };
  it('maps CSS px to plan and back, and zooms round the finger', () => {
    const c = cam();
    const css = { x: 200, y: 100 };
    const p = c.toPlan(css);
    expect(c.toCss(p).x).toBeCloseTo(200);
    c.zoomAt(css, 1.5, true);
    const q = c.toPlan(css);
    expect(q.x).toBeCloseTo(p.x);
    expect(q.y).toBeCloseTo(p.y);
  });
  it('starts a phone at a readable size and stays near the map', () => {
    const c = cam();
    expect(c.startZoom).toBeGreaterThanOrEqual(0.9);
    c.pan(99999, 99999);
    expect(c.x).toBeGreaterThan(0);
    c.focus({ x: 500, y: 500 }, 2, 100);
    for (let i = 0; i < 20; i++) c.update(0.016);
    expect(c.zoom).toBeCloseTo(2);
    expect(c.x).toBeCloseTo(500);
    c.overview(50);
    for (let i = 0; i < 20; i++) c.update(0.016);
    expect(c.zoom).toBeCloseTo(c.minZoom);
  });
  it('flings and comes to rest', () => {
    const c = cam();
    const x = c.x;
    c.fling(900, 0);
    for (let i = 0; i < 200; i++) c.update(0.016);
    expect(c.x).toBeGreaterThan(x + 20);
    expect(c.moved).toBe(false);
  });
});

describe('tools', () => {
  it('turns a tap on a road into the right command', () => {
    expect(roadCommand('kerb', road()).cmd).toEqual({ t: 'kerb', road: 1, on: true });
    expect(roadCommand('oneway', road()).cmd).toMatchObject({ dir: 1 });
    expect(roadCommand('oneway', road({ oneWay: true, dir: 1 })).cmd).toMatchObject({ dir: -1 });
    expect(roadCommand('oneway', road({ oneWay: true, dir: -1 })).cmd).toMatchObject({ dir: 0 });
    expect(sinks('street')).toBe(true);
    expect(sinks(null)).toBe(false);
  });

  const ctx = (): { ctx: ToolCtx; asked: (Command | null)[]; hints: string[] } => {
    const asked: (Command | null)[] = [];
    const hints: string[] = [];
    const city = { def: { map: Array.from({ length: 20 }, () => '.'.repeat(20)) }, roads: [], junctions: [], carParks: [], lines: [] };
    return { asked, hints, ctx: { city, ghosts: {}, arrows: {}, slack: 8, propose: (c: Command | null) => { asked.push(c); return c ? { ok: true, cost: 1, land: 0, works: 0 } : null; }, hint: (t: string) => hints.push(t), select: () => undefined } as unknown as ToolCtx };
  };
  const at = (gx: number, gy: number): Pt => ({ x: gx * 40, y: gy * 40 });

  it('draws a road, goes on from its end, and cancels', () => {
    const t = ctx();
    const tool = makeTool('street', { oneWay: true }, t.ctx)!;
    tool.dragStart(at(2, 2));
    tool.drag(at(5, 2));
    tool.dragEnd(at(6, 2));
    tool.dragStart(at(6, 2));
    tool.dragEnd(at(8, 4));
    const last = t.asked[t.asked.length - 1] as Extract<Command, { t: 'road' }>;
    expect(last.cells).toHaveLength(7);
    expect(last.oneWay).toBe(true);
    tool.cancel();
    expect(t.asked[t.asked.length - 1]).toBeNull();
    tool.tap(at(1, 1));
    expect(t.hints).toHaveLength(1);
  });
  it('places a car park under the finger and drags it on', () => {
    const t = ctx();
    const tool = makeTool('parking', { park: 'multi' }, t.ctx)!;
    expect(tool.dragStart(at(3, 3))).toBe(false);
    tool.tap(at(4, 4));
    expect(t.asked[0]).toEqual({ t: 'carPark', kind: 'multi', at: { gx: 3, gy: 3 } });
    expect(tool.dragStart(at(4, 4))).toBe(true);
  });
  it('takes metro stops anywhere, bus stops only on roads, and undoes', () => {
    const t = ctx();
    const metro = makeTool('metro', {}, t.ctx)!;
    metro.tap(at(2, 2));
    metro.tap(at(9, 2));
    expect(t.asked[t.asked.length - 1]).toMatchObject({ t: 'line', mode: 'metro' });
    metro.undo!();
    expect(t.asked[t.asked.length - 1]).toBeNull();
    makeTool('bus', {}, t.ctx)!.tap(at(2, 2));
    expect(t.hints.some((h) => h.includes('road'))).toBe(true);
    expect(makeTool('zone', {}, t.ctx)).toBeNull();
  });
});
