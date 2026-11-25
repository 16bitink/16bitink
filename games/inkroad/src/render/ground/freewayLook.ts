import { offsetLine } from '../geom';
import { linePath } from '../pen';
import { INK } from '../style';
import type { Brush } from './roadPaint';
import type { RoadShape } from './roadShape';

/** Cross Rivers: what is left of the old freeway wears a concrete barrier down its middle and sound walls on both sides. */
const BARRIER = 5.2;
const WALL = 2.4;
const STONE = '#d6d1c4';

export const isFreeway = (r: RoadShape): boolean => !!r.road.freeway && r.road.type === 'highway' && !r.road.flyover;

export function paintFreeway(b: Brush, r: RoadShape): void {
  if (!isFreeway(r) || r.inner.length < 2) return;
  const { g } = b;
  g.save();
  g.lineCap = 'butt';
  g.lineJoin = 'miter';
  for (const side of [-1, 1]) wall(b, offsetLine(r.inner, side * (r.half + 1.8)));
  const mid = linePath(r.inner);
  for (const [w, style] of [[BARRIER + 2, INK], [BARRIER, STONE]] as const) {
    g.strokeStyle = style;
    g.lineWidth = w;
    g.stroke(mid);
  }
  g.strokeStyle = 'rgba(40,34,38,0.35)';
  g.lineWidth = 1;
  g.setLineDash([2, 6]);
  g.stroke(mid);
  g.restore();
}

function wall(b: Brush, line: ReturnType<typeof offsetLine>): void {
  const { g } = b;
  const path = linePath(line);
  g.setLineDash([]);
  g.strokeStyle = INK;
  g.lineWidth = WALL + 1.2;
  g.stroke(path);
  g.strokeStyle = STONE;
  g.lineWidth = WALL;
  g.stroke(path);
}
