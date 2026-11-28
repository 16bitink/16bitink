import type { PlannedRoad, BeachView, CarPark, CityView, Id, Lot, Pt, Road } from '../../sim/types';
import { lotRect, type Rect } from '../../city/geometry';
import { GROUND_KINDS } from '../../art/manifest';
import { CELL } from '../../sim/constants';
import { boxesMeet, boxOf, lineLength, nearestOnLine, offsetLine, pointAt, type Box } from '../geom';
import { hash2 } from '../noise';
import { linePath, polyPath, wobble } from '../pen';
import { halfWidth } from '../../sim/roadGeom';
import { reservedRoadReach } from '../../city/validateRoadRoom';
import { flatPlaceholder } from '../placeholders';
import { HAND, INK, INK_SOFT, KERB_BLUE } from '../style';
import type { Brush } from './roadPaint';
import { isGarden } from '../gardenLayout';
import { parkLayout, sandLayout } from '../../city/spotShapes';
import { GATE_HALF, gateOpening, paintCarPark, paintSandTrack } from './carParkPaint';

/** The ground under lots and car parks: worn pads, driveways, parks, squares, the Master Plan's outlines. */
const INSET = 5;
/** Years ahead the Master Plan shows. */
export const PLAN_YEARS = 2;
const DRIVE_W = 6;

export interface LotScene { readonly lots: readonly Lot[]; readonly parks: readonly CarPark[]; readonly roads: ReadonlyMap<Id, Road>; readonly year: number; readonly firstYear: number; readonly beaches: readonly BeachView[]; readonly plans: readonly PlannedRoad[]; readonly style: string; readonly wideRoadGrid?: boolean }

export function lotScene(city: CityView): LotScene {
  return { lots: city.lots, parks: city.carParks, roads: new Map(city.roads.map((r) => [r.id, r])), year: city.year, firstYear: (city.def.number - 1) * 10, beaches: city.beaches ?? [], plans: city.plannedRoads ?? [], style: city.def.style, ...(city.def.wideRoadGrid ? { wideRoadGrid: true } : {}) };
}

const rectBox = (r: Rect, pad = 14): Box => ({ x0: r.x - pad, y0: r.y - pad, x1: r.x + r.w + pad, y1: r.y + r.h + pad });

export const planned = (l: Lot, year: number): boolean => l.level === 0 && l.opensYear > year && l.opensYear - year <= PLAN_YEARS;

export function lotSig(l: Lot, year: number): string {
  return `L${l.id}:${l.gx},${l.gy},${l.w},${l.h}${l.garden ? 'g' : ''}:${l.level > 0 ? 1 : planned(l, year) ? `p${l.opensYear}` : 0}:${l.access?.road ?? -1}:${Math.round(l.access?.s ?? 0)}`;
}
export const parkSig = (p: CarPark): string => `P${p.id}:${p.kind}:${p.access?.road ?? -1}:${Math.round(p.access?.s ?? 0)}`;
export const lotBox = (l: { gx: number; gy: number; w: number; h: number }): Box => rectBox(lotRect(l), 60);

const corners = (r: Rect, inset: number): Pt[] => [
  { x: r.x + inset, y: r.y + inset }, { x: r.x + r.w - inset, y: r.y + inset },
  { x: r.x + r.w - inset, y: r.y + r.h - inset }, { x: r.x + inset, y: r.y + r.h - inset },
];

export function paintLots(b: Brush, s: LotScene, box: Box): void {
  for (const l of s.lots) {
    if (!boxesMeet(lotBox(l), box)) continue;
    if (l.level > 0) openLot(b, s, l);
    else if (planned(l, s.year)) plan(b.g, l, s.firstYear);
  }
  for (const p of s.parks) if (boxesMeet(lotBox(p), box)) carPark(b, s, p);
  // A public beach's cars drive a worn track on the sand (the same layout the city parks them by).
  for (const beach of s.beaches) if (beach.state === 'public' && boxesMeet(lotBox(beach.rect), box)) paintSandTrack(b.g, sandLayout([...s.roads.values()], beach.rect));
  for (const pr of s.plans) planRoad(b.g, pr, s.firstYear, box, s.wideRoadGrid === true);
}

export const planPts = (pr: PlannedRoad): Pt[] => pr.cells.map((c) => ({ x: c.gx * CELL, y: c.gy * CELL }));
export const planSig = (pr: PlannedRoad): string => `R${pr.year}:${pr.type}:${pr.cells.map((c) => `${c.gx},${c.gy}`).join(';')}`;

/** A Council road of the next years: pencil beside the line it will take, like a lot's plan. */
function planRoad(g: CanvasRenderingContext2D, pr: PlannedRoad, firstYear: number, box: Box, wideGrid: boolean): void {
  const pts = planPts(pr);
  const half = wideGrid ? reservedRoadReach(pr.type) : halfWidth({ type: pr.type, oneWay: false });
  if (pts.length < 2 || !boxesMeet(boxOf(pts, half + 16), box)) return;
  g.save();
  g.strokeStyle = '#2f6f80';
  g.lineWidth = 1.3;
  g.globalAlpha = 0.55;
  g.setLineDash([9, 7]);
  for (const side of [-1, 1]) g.stroke(linePath(wobble(offsetLine(pts, side * half), 0.7, 20, pr.year)));
  g.globalAlpha = 0.3;
  g.setLineDash([16, 12]);
  g.stroke(linePath(pts));
  g.setLineDash([]);
  const mid = pointAt(pts, lineLength(pts) / 2);
  g.globalAlpha = 0.85;
  g.fillStyle = '#245866';
  g.font = `600 14px ${HAND}`;
  g.textAlign = 'center';
  g.strokeStyle = 'rgba(243,234,216,0.85)';
  g.lineWidth = 4;
  g.strokeText(`year ${firstYear + pr.year}`, mid.x, mid.y - 6);
  g.fillText(`year ${firstYear + pr.year}`, mid.x, mid.y - 6);
  g.restore();
}

function openLot(b: Brush, s: LotScene, l: Lot): void {
  const { g } = b;
  const r = lotRect(l);
  if (l.access) driveway(b, s, r, l.access);
  // A garden lot's front garden is its painted garden pictures (upright/lots.ts); the ground stays bare under them.
  if (isGarden(l)) return;
  if (GROUND_KINDS.includes(l.kind)) garden(b, l, r);
}

/** Parks and squares are painted ground of any size, with paths. */
function garden(b: Brush, l: Lot, r: Rect): void {
  const { g } = b;
  const edge = polyPath(wobble(corners(r, INSET), 0.5, 26, l.id));
  g.save();
  g.lineJoin = 'miter'; // not round: see roadPaint
  g.fillStyle = b.pattern(l.kind === 'park' ? 'grass' : 'plaza');
  g.fill(edge);
  g.strokeStyle = b.pattern('paving');
  g.lineWidth = 5;
  g.stroke(edge);
  g.lineWidth = 6;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  g.beginPath();
  for (const p of corners(r, INSET)) { g.moveTo(p.x, p.y); g.quadraticCurveTo(cx + (p.y - cy) * 0.2, cy - (p.x - cx) * 0.2, cx, cy); }
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, Math.min(r.w, r.h) * 0.16, 0, Math.PI * 2);
  g.fillStyle = b.pattern('paving');
  g.fill();
  g.lineWidth = 0.9;
  g.strokeStyle = INK_SOFT;
  g.stroke();
  g.stroke(edge);
  g.restore();
}

/** A worn path from the lot to its road. */
function driveway(b: Brush, s: LotScene, r: Rect, access: { readonly road: Id; readonly s: number }): void {
  const road = s.roads.get(access.road);
  if (!road) return;
  const p = pointAt(road.line, access.s);
  const inside = { x: Math.min(r.x + r.w - 14, Math.max(r.x + 14, p.x)), y: Math.min(r.y + r.h - 14, Math.max(r.y + 14, p.y)) };
  const edge = { x: Math.min(r.x + r.w - 8, Math.max(r.x + 8, inside.x)), y: Math.min(r.y + r.h - 8, Math.max(r.y + 8, inside.y)) };
  if (nearestOnLine(road.line, edge).d < halfWidth(road)) return;
  const { g } = b;
  g.save();
  g.lineCap = 'butt';
  const bend = { x: (p.x + edge.x) / 2 + (hash2(r.x, r.y, 3) - 0.5) * 7, y: (p.y + edge.y) / 2 + (hash2(r.y, r.x, 4) - 0.5) * 7 };
  const way = new Path2D();
  way.moveTo(p.x, p.y);
  way.quadraticCurveTo(bend.x, bend.y, edge.x, edge.y);
  for (const [width, style, alpha] of [[DRIVE_W + 5, 'rgba(150,106,60,0.14)', 1], [DRIVE_W + 2, 'rgba(150,106,60,0.2)', 1], [DRIVE_W, b.pattern('works'), 0.55], [DRIVE_W * 0.45, 'rgba(255,240,208,0.3)', 1]] as const) {
    g.globalAlpha = alpha;
    g.strokeStyle = style;
    g.lineWidth = width;
    g.stroke(way);
  }
  g.restore();
}

/** A car park's gate apron: paved from the road straight to the gate, as wide as the gate the cars turn square into. */
function gateApron(b: Brush, s: LotScene, gate: Pt, access: { readonly road: Id; readonly s: number }): void {
  const road = s.roads.get(access.road);
  if (!road) return;
  const n = nearestOnLine(road.line, gate);
  const { g } = b;
  g.save();
  g.lineCap = 'butt';
  const way = linePath([n.at, gate]);
  g.strokeStyle = INK_SOFT;
  g.lineWidth = GATE_APRON + 1.4;
  g.stroke(way);
  g.strokeStyle = b.pattern('asphalt');
  g.lineWidth = GATE_APRON;
  g.stroke(way);
  g.restore();
}
/** A car park's tarmac starts this far inside its paved rim. */
const TARMAC_IN = 4;
/** Px wide (the planner's gate apron, src/city/moveGround.ts). */
const GATE_APRON = 2 * GATE_HALF;

/** The Master Plan: pencil on the sand where a lot will open. */
function plan(g: CanvasRenderingContext2D, l: Lot, firstYear: number): void {
  const r = lotRect(l);
  const edge = polyPath(wobble(corners(r, 6), 0.8, 16, l.id));
  g.save();
  g.clip(edge);
  g.strokeStyle = KERB_BLUE;
  g.globalAlpha = 0.28;
  g.lineWidth = 1;
  g.beginPath();
  for (let k = -r.h; k < r.w; k += 11) {
    const j = hash2(k, l.id, 4) * 3;
    g.moveTo(r.x + k + j, r.y + r.h);
    g.lineTo(r.x + k + r.h + j, r.y);
  }
  g.stroke();
  g.restore();
  g.save();
  g.strokeStyle = '#2f6f80';
  g.globalAlpha = 0.85;
  g.lineWidth = 1.5;
  g.setLineDash([8, 5]);
  g.stroke(edge);
  g.setLineDash([]);
  label(g, r, l.name, `year ${firstYear + l.opensYear}`);
  g.restore();
}

function label(g: CanvasRenderingContext2D, r: Rect, name: string, when: string): void {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#245866';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(243,234,216,0.85)';
  g.lineWidth = 4;
  const fit = (text: string, size: number): number => { g.font = `600 ${size}px ${HAND}`; return Math.min(size, (size * (r.w - 18)) / Math.max(1, g.measureText(text).width)); };
  for (const [text, size, dy] of [[name, 17, -8], [when, 15, 9]] as const) {
    g.font = `600 ${fit(text, size)}px ${HAND}`;
    g.strokeText(text, cx, cy + dy);
    g.fillText(text, cx, cy + dy);
  }
}

function carPark(b: Brush, s: LotScene, p: CarPark): void {
  const { g } = b;
  const r = lotRect(p);
  const surface = p.kind === 'lot' || p.kind === 'ride';
  const l = surface ? parkLayout([...s.roads.values()], p) : null;
  if (l?.aisle && p.access) gateApron(b, s, l.aisle.gate, p.access);
  else if (p.access) driveway(b, s, r, p.access);
  g.save();
  const edge = polyPath(wobble(corners(r, 3), 0.6, 18, p.id));
  g.lineJoin = 'round';
  g.fillStyle = b.pattern('paving');
  g.strokeStyle = INK_SOFT;
  g.lineWidth = 1.4;
  g.fill(edge);
  g.stroke(edge);
  // Bays, aisle and gate painted where the cars really park and drive; the picture only where there is no aisle.
  if (l?.aisle) {
    // Tarmac inside a paved rim, so the white bay lines read as they do on the roads.
    const inner = polyPath(wobble(corners(r, TARMAC_IN), 0.4, 18, p.id + 7));
    g.fillStyle = b.pattern('asphalt');
    g.fill(inner);
    gateOpening(g, l, r, b.pattern('asphalt'));
    paintCarPark(g, l);
  } else if (surface) {
    const key = p.kind === 'lot' ? 'flat/carpark-lot' : 'flat/carpark-ride';
    const pic = b.pics.get(key, () => flatPlaceholder(key));
    g.drawImage(pic.img, r.x + 5, r.y + 5, r.w - 10, r.h - 10);
    g.strokeStyle = INK;
    g.lineWidth = 0.9;
    g.stroke(polyPath(wobble(corners(r, 5), 0.5, 18, p.id + 3)));
  }
  g.restore();
}
