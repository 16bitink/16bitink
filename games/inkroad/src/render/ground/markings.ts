import { LANE } from '../../sim/constants';
import type { Pt } from '../../sim/types';
import { dist, lineLength, offsetLine, pointAt, subLine } from '../geom';
import { linePath } from '../pen';
import { PAINT } from '../style';
import type { Brush } from './roadPaint';
import { laneMarks, setback, type Arm, type JunctionShape, type RoadShape } from './roadShape';

/** White paint on the asphalt, a little worn: lane dashes, stop lines, crossings, arrows, medians. */
const DASH = [9, 9];
const FAINT = 0.78;
const ZEBRA_LONG = 6.5;
const STOP_GAP = 1.5;
const ARROW_FROM = 22;

type G = CanvasRenderingContext2D;

function paint(g: G, width: number, dash: readonly number[] = []): void {
  g.strokeStyle = PAINT;
  g.globalAlpha = FAINT;
  g.lineWidth = width;
  g.setLineDash([...dash]);
}

function done(g: G): void {
  g.setLineDash([]);
  g.globalAlpha = 1;
}

export function markRoad(b: Brush, r: RoadShape): void {
  const { g } = b;
  if (r.inner.length < 2) return;
  centre(b, r);
  lanes(g, r);
  if (r.half > LANE * 1.5) edges(g, r);
  done(g);
  if (r.road.oneWay && !r.road.flyover) oneWayArrows(g, r);
}

/** The line between the two directions: dashes, a solid line, or a planted median. */
function centre(b: Brush, r: RoadShape): void {
  const { g } = b;
  if (r.road.oneWay) return;
  if (r.median > 0) { median(b, r); return; }
  const path = linePath(r.inner);
  if (r.road.type === 'street') { paint(g, 0.9, DASH); g.stroke(path); return; }
  paint(g, 0.8);
  for (const side of [-1.1, 1.1]) g.stroke(linePath(offsetLine(r.inner, side)));
  done(g);
}

function median(b: Brush, r: RoadShape): void {
  const { g } = b;
  done(g);
  const path = linePath(subLine(r.line, r.cut[0] + 3, r.cut[1] - 3));
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(58,50,43,0.8)';
  g.lineWidth = r.median + 1;
  g.stroke(path);
  g.strokeStyle = '#efe6d2';
  g.lineWidth = r.median;
  g.stroke(path);
  g.strokeStyle = b.pattern(r.road.type === 'highway' ? 'concrete' : 'grass');
  g.lineWidth = r.median - 1.8;
  g.stroke(path);
  g.lineCap = 'butt';
}

/** Dashes between the lanes of one direction. */
function lanes(g: G, r: RoadShape): void {
  paint(g, 0.8, DASH);
  const mid = subLine(r.line, r.cut[0] + 2, r.cut[1] - 2);
  if (mid.length < 2) return;
  for (const off of laneMarks(r.road)) g.stroke(linePath(offsetLine(mid, off)));
}

function edges(g: G, r: RoadShape): void {
  paint(g, 0.55);
  g.globalAlpha = 0.45;
  for (const side of [-1, 1]) g.stroke(linePath(offsetLine(r.inner, side * (r.half - 1.4))));
}

function oneWayArrows(g: G, r: RoadShape): void {
  const back = r.road.dir === -1;
  const len = lineLength(r.inner);
  const n = Math.max(1, Math.floor(len / 70));
  for (let i = 0; i < n; i++) {
    const p = pointAt(r.inner, (len * (i + 0.5)) / n);
    arrow(g, p, back ? p.a + Math.PI : p.a, 10);
  }
}

/** A straight-on arrow painted on the road. */
function arrow(g: G, p: Pt, a: number, size: number): void {
  g.save();
  g.translate(p.x, p.y);
  g.rotate(a);
  g.fillStyle = PAINT;
  g.globalAlpha = FAINT;
  g.beginPath();
  for (const [x, y] of [[-size / 2, -0.7], [size * 0.05, -0.7], [size * 0.05, -2.3], [size / 2, 0], [size * 0.05, 2.3], [size * 0.05, 0.7], [-size / 2, 0.7]] as const) g.lineTo(x, y);
  g.closePath();
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------- junctions

/** Is there traffic towards the junction on this arm? */
const comesIn = (arm: Arm, node: number): boolean => !arm.road.oneWay || (arm.road.dir === -1 ? arm.road.a : arm.road.b) === node;

export function markJoin(b: Brush, j: JunctionShape): void {
  const { g } = b;
  if (j.kind === 'bend') { bendLine(b, j); return; }
  if (j.kind === 'plain') for (const arm of j.arms) markArm(g, j, arm);
  if (j.kind === 'ring') for (const arm of j.arms) markRingArm(g, j, arm);
  done(g);
}

function markArm(g: G, j: JunctionShape, arm: Arm): void {
  const s = setback(j, arm.road);
  if (arm.len < s + 6) return;
  const signal = j.j.control === 'signal' || j.j.control === 'smart';
  if (signal) zebra(g, arm, s - ZEBRA_LONG - STOP_GAP);
  if (!comesIn(arm, j.j.id)) return;
  if (signal) stopLine(g, arm, s, 1.7, []);
  else if (isMinor(j, arm)) stopLine(g, arm, s, 1.5, [2.6, 2]);
  if (signal && arm.half > LANE * 1.5 && arm.len > s + ARROW_FROM + 14) laneArrows(g, arm, s + ARROW_FROM);
}

/** Give way on the arms that aren't part of the straightest, widest pair. */
function isMinor(j: JunctionShape, arm: Arm): boolean {
  if (j.arms.length < 3) return false;
  const straight = j.arms.filter((q) => q !== arm).some((q) => Math.cos(q.a - arm.a) < -0.9 && q.half >= arm.half);
  const wider = j.arms.some((q) => q !== arm && q.half > arm.half);
  return !straight || wider;
}

function markRingArm(g: G, j: JunctionShape, arm: Arm): void {
  const s = j.j.radius + 2.5;
  if (comesIn(arm, j.j.id)) stopLine(g, arm, s, 1.5, [2.6, 2]);
  if (arm.half > LANE && arm.len > s + 26) zebra(g, arm, s + 9);
}

const lateral = (p: Pt & { readonly a: number }, by: number): Pt => ({ x: p.x - Math.sin(p.a) * by, y: p.y + Math.cos(p.a) * by });

/** The line across the lanes that come in: the left side, seen from the junction looking out. */
function stopLine(g: G, arm: Arm, s: number, width: number, dash: readonly number[]): void {
  const p = pointAt(arm.out, s);
  const from = lateral(p, arm.road.oneWay ? arm.half - 1.2 : -1);
  const to = lateral(p, -arm.half + 1.2);
  paint(g, width, dash);
  g.beginPath();
  g.moveTo(from.x, from.y);
  g.lineTo(to.x, to.y);
  g.stroke();
  done(g);
}

function zebra(g: G, arm: Arm, s: number): void {
  if (s < 1) return;
  const a = pointAt(arm.out, s);
  const b = pointAt(arm.out, s + ZEBRA_LONG);
  paint(g, 1.7);
  g.beginPath();
  for (let off = -arm.half + 2.2; off < arm.half - 1; off += 3.6) {
    const p = lateral(a, off);
    const q = lateral(b, off);
    g.moveTo(p.x, p.y);
    g.lineTo(q.x, q.y);
  }
  g.stroke();
  done(g);
}

/** Lane arrows before a signal, pointing at it. */
function laneArrows(g: G, arm: Arm, s: number): void {
  const p = pointAt(arm.out, s);
  const n = Math.round(arm.half / LANE);
  for (let i = 0; i < n; i++) {
    const at = lateral(p, -(arm.half - (n - i - 0.5) * LANE));
    arrow(g, at, p.a + Math.PI, 8);
  }
}

/** The centre line carried round a bend. */
function bendLine(b: Brush, j: JunctionShape): void {
  const [p, q] = j.arms;
  if (!p || !q || p.road.oneWay || q.road.oneWay) return;
  const { g } = b;
  if (p.road.type !== q.road.type) return;
  const s = setback(j, p.road);
  const t = setback(j, q.road);
  const from = pointAt(p.out, s);
  const to = pointAt(q.out, t);
  if (dist(from, to) < 1) return;
  paint(g, 0.9, p.road.type === 'street' || q.road.type === 'street' ? DASH : []);
  g.beginPath();
  g.moveTo(from.x, from.y);
  g.quadraticCurveTo(j.j.x, j.j.y, to.x, to.y);
  g.stroke();
  done(g);
}
