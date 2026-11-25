import type { TextureName } from '../../art/manifest';
import { LANE } from '../../sim/constants';
import { boxesMeet, offsetLine, type Box } from '../geom';
import { linePath, wobble } from '../pen';
import { INK, SHADOW, WATER_DEEP } from '../style';
import { markJoin, markRoad } from './markings';
import { paintKerbBays, paintToll, paintWorks } from './roadExtras';
import { paintDeckShadow, paintTrench } from './deckGround';
import { paintIsland } from './island';
import type { Pictures } from '../pictures';
import { paintFreeway } from './freewayLook';
import { paintWalkTone } from './dress';
import { paintWorn } from './wornRoads';
import { paintMouth, paintTunnelTrace } from './tunnels';
import { kerbOf, type JunctionShape, type RoadScene, type RoadShape } from './roadShape';

/**
 * Roads as painted ribbons. Every pass runs over all the roads and junctions
 * in the box before the next begins (verge, walk, kerb, asphalt, wear,
 * paint), so they melt into one surface however they meet.
 */
export interface Brush {
  readonly g: CanvasRenderingContext2D;
  readonly pattern: (name: TextureName) => CanvasPattern;
  readonly pics: Pictures;
  /** Cobbles beside the roads (Old Harbour). */
  readonly apron?: TextureName;
  readonly onSea: (draw: () => void) => void;
}

const VERGE = 4.5;
const KERB_STONE = '#efe6d2';
const EDGE_DARK = 'rgba(48,44,56,0.2)';
const WEAR = 'rgba(44,40,50,0.085)';
const SUN = 'rgba(255,248,232,0.05)';

export function paintRoads(b: Brush, scene: RoadScene, box: Box): void {
  const near = scene.roads.filter((r) => boxesMeet(r.box, box));
  const all = near.filter((r) => !r.waits);
  for (const r of near) if (r.waits) planned(b.g, r);
  const roads = all.filter((r) => !r.road.flyover);
  const idle = new Set(near.filter((r) => r.waits).flatMap((r) => [r.road.a, r.road.b]));
  const joins = scene.joins.filter((j) => j.kind !== 'ramp' && !idle.has(j.j.id) && boxesMeet(j.box, box));
  if (all.length === 0 && joins.length === 0) return;
  const { g } = b;
  g.save();
  // Never round joins here: Chrome's GPU canvas drops some pattern strokes that have them.
  g.lineJoin = 'miter';
  g.miterLimit = 2;
  g.lineCap = 'butt';
  b.onSea(() => {
    bridgeShadows(g, roads);
    for (const r of roads) paintTunnelTrace(g, r);
  });
  surface(b, all, joins);
  for (const r of roads) wear(g, r);
  for (const r of roads) paintWorn(g, r);
  for (const r of roads) if (r.road.busLane) busLane(b, r);
  for (const r of roads) bridgeRails(b, r);
  for (const r of roads) if (r.road.kerb) paintKerbBays(g, r);
  for (const r of roads) markRoad(b, r);
  for (const r of roads) paintFreeway(b, r);
  for (const j of joins) markJoin(b, j);
  for (const j of joins) if (j.kind === 'ring') paintIsland(b, j);
  for (const r of roads) if (r.road.toll) paintToll(g, r);
  for (const r of roads) if (r.road.works > 0) paintWorks(b, r);
  sketch(g, roads);
  for (const r of roads) paintMouth(b, r);
  for (const r of all) {
    if (r.road.level === 1) paintDeckShadow(g, r.road);
    if (r.road.level === -1 && r.road.flyover) paintTrench(b, r);
  }
  g.restore();
}

/** A road the Council has drawn but not joined up: pencil on the sand. */
function planned(g: CanvasRenderingContext2D, r: RoadShape): void {
  g.save();
  g.strokeStyle = '#2f6f80';
  g.globalAlpha = 0.5;
  g.lineWidth = 1.3;
  g.setLineDash([9, 7]);
  for (const side of [-1, 1]) g.stroke(linePath(wobble(offsetLine(r.line, side * r.half), 0.7, 20, r.road.id)));
  g.globalAlpha = 0.28;
  g.setLineDash([16, 12]);
  g.stroke(r.path);
  g.restore();
}

/** Grow every road and junction by `by` px and lay `style` on it. */
function lay(g: CanvasRenderingContext2D, roads: readonly RoadShape[], joins: readonly JunctionShape[], by: (r: RoadShape) => number, joinBy: (j: JunctionShape) => number, style: string | CanvasPattern): void {
  g.strokeStyle = style;
  g.fillStyle = style;
  for (const r of roads) {
    g.lineWidth = Math.max(0.1, (r.half + by(r)) * 2);
    g.stroke(r.path);
  }
  for (const j of joins) {
    const k = joinBy(j);
    g.fill(j.path);
    if (k <= 0) continue;
    g.lineWidth = k * 2;
    g.stroke(j.path);
  }
}

const joinKerb = (j: JunctionShape): number => Math.max(...j.arms.map((a) => kerbOf(a.road)));

function surface(b: Brush, roads: readonly RoadShape[], joins: readonly JunctionShape[]): void {
  const { g } = b;
  const kerb = (r: RoadShape): number => kerbOf(r.road);
  const same = (n: number) => (): number => n;
  if (b.apron) apron(b, b.apron, roads, joins);
  lay(g, roads, joins, (r) => kerb(r) + VERGE, (j) => joinKerb(j) + VERGE, 'rgba(150,108,66,0.12)');
  lay(g, roads, joins, (r) => kerb(r) + VERGE * 0.4, (j) => joinKerb(j) + VERGE * 0.4, 'rgba(140,100,62,0.16)');
  lay(g, roads, joins, (r) => kerb(r) + 0.7, (j) => joinKerb(j) + 0.7, 'rgba(58,50,43,0.75)');
  lay(g, roads, joins, kerb, joinKerb, b.pattern('paving'));
  paintWalkTone(g, roads);
  lay(g, roads, joins, same(2.2), same(2.2), 'rgba(58,50,43,0.6)');
  lay(g, roads, joins, same(1.6), same(1.6), KERB_STONE);
  lay(g, roads, joins, same(0.5), same(0.5), INK);
  lay(g, roads, joins, same(0), same(0), b.pattern('asphalt'));
  // Watercolour pools at the edges: a darker rim, then the lighter middle over it.
  lay(g, roads, joins, same(0), same(0), EDGE_DARK);
  g.globalAlpha = 0.75;
  lay(g, roads, joins, same(-2), same(-1), b.pattern('asphalt'));
  g.globalAlpha = 1;
  lay(g, roads, [], same(-4), same(0), SUN);
}

const APRON_STEPS: readonly (readonly [number, number])[] = [[18, 0.16], [12, 0.24], [7, 0.36], [3, 0.5]];

/** Old stone that fades out from the kerb: the only place the cobbles show. */
function apron(b: Brush, tex: TextureName, roads: readonly RoadShape[], joins: readonly JunctionShape[]): void {
  const { g } = b;
  const style = b.pattern(tex);
  for (const [w, a] of APRON_STEPS) {
    g.globalAlpha = a;
    lay(g, roads, joins, (r) => kerbOf(r.road) + w, (j) => joinKerb(j) + w, style);
  }
  g.globalAlpha = 1;
}

/** Darker tracks where the tyres go. */
function wear(g: CanvasRenderingContext2D, r: RoadShape): void {
  g.strokeStyle = WEAR;
  g.lineWidth = 3.4;
  for (const l of r.mouth ? [] : r.links) {
    for (let i = 0; i < l.lanes; i++) g.stroke(linePath(offsetLine(l.line, (i - (l.lanes - 1) / 2) * 9)));
  }
}

/** The kerb lane of each direction, between the junctions. */
function busLane(b: Brush, r: RoadShape): void {
  const { g } = b;
  if (r.inner.length < 2) return;
  for (const side of r.road.oneWay ? [r.road.dir === -1 ? -1 : 1] : [-1, 1]) {
    g.strokeStyle = b.pattern('buslane');
    g.lineWidth = LANE - 1;
    g.globalAlpha = 0.92;
    g.stroke(linePath(offsetLine(r.inner, side * (r.half - LANE / 2))));
    g.globalAlpha = 1;
  }
}

function bridgeShadows(g: CanvasRenderingContext2D, roads: readonly RoadShape[]): void {
  for (const r of roads) {
    for (const part of r.wet) {
      g.save();
      g.translate(7, 10);
      g.strokeStyle = WATER_DEEP;
      g.globalAlpha = 0.45;
      g.lineWidth = (r.half + kerbOf(r.road)) * 2;
      g.stroke(linePath(part));
      g.restore();
    }
  }
}

/** Concrete parapets along a bridge, where it is over water. */
function bridgeRails(b: Brush, r: RoadShape): void {
  const { g } = b;
  const off = r.half + kerbOf(r.road) - 0.6;
  for (const part of r.wet) {
    for (const side of [-1, 1]) {
      const rail = linePath(offsetLine(part, off * side));
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.stroke(rail);
      g.strokeStyle = b.pattern('concrete');
      g.lineWidth = 2.6;
      g.stroke(rail);
      g.strokeStyle = SHADOW;
      g.lineWidth = 1;
      g.setLineDash([1.2, 7]);
      g.stroke(rail);
      g.setLineDash([]);
    }
  }
}

/** A second, broken pen line along the walks: the hand in it. */
function sketch(g: CanvasRenderingContext2D, roads: readonly RoadShape[]): void {
  g.strokeStyle = INK;
  g.globalAlpha = 0.35;
  g.lineWidth = 0.6;
  g.setLineDash([26, 9, 14, 17]);
  for (const r of roads) {
    if (r.inner.length < 2) continue;
    for (const side of [-1, 1]) g.stroke(linePath(wobble(offsetLine(r.inner, side * (r.half + kerbOf(r.road) + 1.6)), 0.6, 16, r.road.id)));
  }
  g.setLineDash([]);
  g.globalAlpha = 1;
}
