import type { Pt, Road } from '../../sim/types';
import { boxOf, lineLength, nearestOnLine, pointAt, subLine, type Box } from '../geom';
import { linePath } from '../pen';
import { INK, WATER_DEEP } from '../style';
import { cut } from './deckGround';
import type { Brush } from './roadPaint';
import type { RoadShape } from './roadShape';
import { fieldAt } from './terrain';

/**
 * Twin Isles: a road marked `tunnel` dives under the sea. The ground shows its
 * two dry ends, each finishing in a portal on the shore, and a faint dashed
 * line across the water for the hidden stretch. Cars inside are not drawn.
 */
const FIND = 6;
/** The portal stands this far back from the water, on the shore. */
const LAND = 24;
/** How much of each end is cut down to its portal. */
const MOUTH = 44;
const NO_NODE = -1;
const HIDE_PAD = 1.5;

export interface TunnelPieces {
  /** Road ends as roads of their own, so everything that draws along a road works. */
  readonly head: Road;
  readonly tail: Road;
  /** The hidden stretch, portal to portal. */
  readonly shut: readonly Pt[];
}

/** Splits a tunnel road where it goes under water, or returns null when it never meets water. */
export function splitTunnel(road: Road, rows: readonly string[]): TunnelPieces | null {
  if (!road.tunnel) return null;
  const len = lineLength(road.line);
  let from = -1;
  let to = -1;
  for (let s = 0; s <= len; s += FIND) {
    const p = pointAt(road.line, s);
    if (fieldAt(rows, '~', p.x, p.y) <= 0.5) continue;
    if (from < 0) from = s;
    to = s;
  }
  if (from < 0) return null;
  const a = Math.max(MOUTH, from - LAND);
  const b = Math.min(len - MOUTH, to + LAND);
  if (b - a < FIND) return null;
  return {
    head: { ...road, bridge: false, b: NO_NODE, line: subLine(road.line, 0, a) },
    tail: { ...road, bridge: false, a: NO_NODE, line: subLine(road.line, b, len) },
    shut: subLine(road.line, a, b),
  };
}

/** The sea's pen trace of the hidden stretch: a soft shadow and dashes. Run it clipped to the sea. */
export function paintTunnelTrace(g: CanvasRenderingContext2D, r: RoadShape): void {
  const line = r.shut;
  if (!line || line.length < 2) return;
  g.save();
  g.lineCap = 'butt';
  g.strokeStyle = WATER_DEEP;
  g.globalAlpha = 0.16;
  g.lineWidth = r.half * 2 + 6;
  g.stroke(linePath(line));
  g.globalAlpha = 0.5;
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.setLineDash([6, 6]);
  for (const side of [-1, 1]) g.stroke(linePath(shifted(line, side * (r.half + 1))));
  g.restore();
}

function shifted(line: readonly Pt[], by: number): Pt[] {
  return line.map((p, i) => {
    const q = line[Math.min(line.length - 1, i + 1)]!;
    const o = line[Math.max(0, i - 1)]!;
    const a = Math.atan2(q.y - o.y, q.x - o.x);
    return { x: p.x - Math.sin(a) * by, y: p.y + Math.cos(a) * by };
  });
}

/** The cut that leads down to the portal at the end of a dry piece. */
export function paintMouth(b: Brush, r: RoadShape): void {
  if (!r.mouth) return;
  const line = r.road.line;
  const len = lineLength(line);
  const down = r.mouth === 'end';
  cut(b, r, down ? subLine(line, Math.max(0, len - MOUTH), len) : subLine(line, 0, Math.min(len, MOUTH)), !down);
}

export interface TunnelMask { hides(x: number, y: number): boolean }

interface Shut { readonly line: readonly Pt[]; readonly box: Box; readonly half: number }

/** Which spots of the ground are inside a tunnel, for cars to vanish at the portal. */
export function tunnelMask(roads: readonly RoadShape[]): TunnelMask {
  const shuts: Shut[] = roads.filter((r) => r.shut && r.shut.length > 1).map((r) => ({ line: r.shut!, half: r.half + HIDE_PAD, box: boxOf(r.shut!, r.half + HIDE_PAD) }));
  return {
    hides: (x, y) => shuts.some((s) => x > s.box.x0 && x < s.box.x1 && y > s.box.y0 && y < s.box.y1 && nearestOnLine(s.line, { x, y }).d < s.half),
  };
}
