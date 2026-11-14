import { CELL, GROUNDS, inPatch, isDrivable } from '../land';
import type { FloodDef } from '../level/types';
import { nearestPassable } from '../nav/grid';
import type { Match } from './match';
import type { StructRt } from './types';

/**
 * Dams (chapter 3, level 25 "Break the Dams"; any raid target can be one). A
 * level's `floods` say which structure holds back which water: when it breaks,
 * its patches are painted over the ground (water floods a channel, marsh or
 * mud drains a pool), both nav grids follow, and a ground tank caught in new
 * deep water is washed to the nearest bank. A 'flood' event tells the view to
 * repaint the ground, and the feed says what happened.
 */
export const FLOOD_TEXT = 'The dam is breached!';
export const TIDE_TEXT = 'The tide is in!';
/** Seconds of warning before a tide. */
export const TIDE_WARN = 10;

/** Paints a flood's patches onto the land; returns the cells whose ground changed. */
export function paintFlood(m: Match, f: FloodDef): number[] {
  const l = m.land;
  const changed: number[] = [];
  for (let gy = 0; gy < l.gridRows; gy++) {
    for (let gx = 0; gx < l.gridCols; gx++) {
      const x = (gx + 0.5) * CELL;
      const y = (gy + 0.5) * CELL;
      const i = gy * l.gridCols + gx;
      let g = l.ground[i]!;
      for (const p of f.terrain) if (inPatch(p.shape, x, y)) g = GROUNDS.indexOf(p.ground);
      if (g === l.ground[i]) continue;
      l.ground[i] = g;
      changed.push(i);
    }
  }
  return changed;
}

function flood(m: Match, f: FloodDef, by: string, x: number, y: number, text: string): void {
  const cells = paintFlood(m, f);
  m.navs.regrade(cells);
  washAshore(m);
  m.emit({ kind: 'flood', by, x, y, cells: cells.length });
  m.emit({ kind: 'objective', text: f.text ?? text });
}

/** A structure broke: run the floods it held back. */
export function floodOn(m: Match, s: StructRt): void {
  for (const f of m.level.def.floods ?? []) if (f.by === s.def.id) flood(m, f, f.by, s.def.x, s.def.y, FLOOD_TEXT);
}

/** Tides due between two steps: the warning TIDE_WARN s ahead, then the flood. */
export function stepTides(m: Match, t0: number, t1: number): void {
  for (const f of m.level.def.floods ?? []) {
    if (f.at === undefined) continue;
    if (t0 < f.at - TIDE_WARN && t1 >= f.at - TIDE_WARN) m.emit({ kind: 'objective', text: `The tide comes in in ${TIDE_WARN} s!` });
    if (t0 < f.at && t1 >= f.at) flood(m, f, 'tide', m.land.width / 2, m.land.height / 2, TIDE_TEXT);
  }
}

/** Ground tanks standing in deep water now are pushed to the nearest dry cell. */
export function washAshore(m: Match): void {
  for (const t of m.tanks) {
    if (!t.alive || t.keel || t.stats.floats || t.parent !== null || isDrivable(m.land, t.x, t.y)) continue;
    const to = nearestPassable(m.nav, t.x, t.y, 20);
    if (!to) continue;
    t.x = to.x;
    t.y = to.y;
    t.speed = 0;
    t.slide = null;
  }
}
