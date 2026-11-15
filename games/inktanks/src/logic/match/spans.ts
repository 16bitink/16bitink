import { CELL, GROUNDS } from '../land';
import { pointInShape } from '../geom';
import { washAshore } from './flood';
import type { Match } from './match';
import type { StructRt } from './types';

/**
 * Log bridges (chapter 5, level 44 "Timber Bridges"; kinds with `span`). A
 * span is laid on a 'bridge' strip over a river: tanks drive the strip, the
 * span is drawn on the ground and is low cover for shots. When it breaks, the
 * 'bridge' ground under it (its footprint grown by SPAN.margin) turns to
 * water: the crossing is gone for good, both nav grids follow (a column that
 * needed it is stuck on the bank), tanks on it are washed ashore, and the feed
 * says "The bridge is down!". A 'flood' event repaints the ground.
 */
export const SPAN = { margin: 12, text: 'The bridge is down!' } as const;

const BRIDGE = GROUNDS.indexOf('bridge');
const WATER = GROUNDS.indexOf('water');

/** Cell centres within `margin` px of the span's footprint (the shape test on four nudged points). */
function under(s: StructRt, x: number, y: number): boolean {
  const k = SPAN.margin;
  const { shape, x: ox, y: oy } = s.def;
  return pointInShape(shape, ox, oy, x, y) || pointInShape(shape, ox, oy, x + k, y) || pointInShape(shape, ox, oy, x - k, y) || pointInShape(shape, ox, oy, x, y + k) || pointInShape(shape, ox, oy, x, y - k);
}

/** A span just broke: the bridge strip under it is water now. */
export function spanBroke(m: Match, s: StructRt): void {
  const l = m.land;
  const cells: number[] = [];
  for (let i = 0; i < l.ground.length; i++) {
    if (l.ground[i] !== BRIDGE) continue;
    const x = ((i % l.gridCols) + 0.5) * CELL;
    const y = (Math.floor(i / l.gridCols) + 0.5) * CELL;
    if (!under(s, x, y)) continue;
    l.ground[i] = WATER;
    cells.push(i);
  }
  m.navs.regrade(cells);
  washAshore(m);
  m.emit({ kind: 'span', id: s.def.id, x: s.def.x, y: s.def.y });
  m.emit({ kind: 'flood', by: s.def.id, x: s.def.x, y: s.def.y, cells: cells.length });
  m.emit({ kind: 'objective', text: SPAN.text });
}
