import { CELL } from '../../sim/constants';
import { halfWidth } from '../../sim/roadGeom';
import type { CarPark, CarParkKind, Cell, Command, Pt, Quote, Road, ToolId, TransitMode } from '../../sim/types';
import { lineLength, pointAt } from '../../render/geom';
import { lotRect } from '../../city/geometry';
import { PARK_CELLS } from '../../render/overlay/ghostLayer';
import { LINE_COLOURS } from '../../render/style';
import { pickJunction, pickPark, pickRoad } from './pick';
import { cellPt, roadCells, sameCell, snapCell } from './snap';
import { TapTool, type Tool, type ToolCtx } from './tool';

/** Tools that act on something you tap: roads, car parks, junctions, places, stops. */
type RoadAct = 'kerb' | 'toll' | 'buslane' | 'oneway' | 'square';
export const ROAD_ACTS: readonly RoadAct[] = ['kerb', 'toll', 'buslane', 'oneway', 'square'];
export const isRoadAct = (t: ToolId): t is RoadAct => (ROAD_ACTS as readonly string[]).includes(t);

const mid = (r: Road): Pt => pointAt(r.line, lineLength(r.line) / 2);

/** The command a tap on a road means. Pure. */
export function roadCommand(act: RoadAct, r: Road): { readonly cmd: Command; readonly label: string } {
  switch (act) {
    case 'kerb': return { cmd: { t: 'kerb', road: r.id, on: !r.kerb }, label: r.kerb ? 'Take the kerb bays away' : 'Paid kerb bays' };
    case 'toll': return { cmd: { t: 'toll', road: r.id, on: !r.toll }, label: r.toll ? 'Take the toll gate away' : 'Toll gate' };
    case 'buslane': return { cmd: { t: 'busLane', road: r.id, on: !r.busLane }, label: r.busLane ? 'Give the lane back to cars' : 'Bus lane' };
    case 'square': return { cmd: { t: 'square', road: r.id }, label: 'Turn it into a square' };
    case 'oneway': {
      const dir = !r.oneWay ? 1 : r.dir === -1 ? 0 : -1;
      return { cmd: { t: 'oneWay', road: r.id, dir }, label: dir === 0 ? 'Two-way again' : 'One-way' };
    }
  }
}

/** Kerb bays, toll gates, bus lanes, one-way, squares: tap a road. Tap it again to switch one-way round. */
export class RoadActTool extends TapTool {
  private road: Road | null = null;
  private quote: Quote | null = null;

  constructor(ctx: ToolCtx, private readonly act: RoadAct) { super(ctx); }

  tap(p: Pt): void {
    const r = pickRoad(this.ctx.city, p, this.ctx.slack * 0.6, true);
    if (!r) { this.cancel(); this.ctx.hint('Tap a road'); return; }
    this.road = r;
    const { cmd, label } = roadCommand(this.act, r);
    this.quote = this.ctx.propose(cmd, label, mid(r), false);
  }

  draw(): void {
    if (this.road) this.ctx.ghosts.pick(this.road.line, halfWidth(this.road), this.quote);
  }

  cancel(): void {
    this.road = null;
    this.ctx.propose(null, '', { x: 0, y: 0 }, false);
  }
}

/** Remove a road, a flyover or a car park. */
export class RemoveTool extends TapTool {
  private road: Road | null = null;
  private park: CarPark | null = null;
  private quote: Quote | null = null;

  tap(p: Pt): void {
    this.road = null;
    this.park = pickPark(this.ctx.city, p);
    if (!this.park) this.road = pickRoad(this.ctx.city, p, this.ctx.slack * 0.6);
    if (this.park) {
      const r = lotRect(this.park);
      this.quote = this.ctx.propose({ t: 'removePark', park: this.park.id }, 'Remove the car park', { x: r.x + r.w / 2, y: r.y }, false);
    } else if (this.road) this.quote = this.ctx.propose({ t: 'remove', road: this.road.id }, this.road.flyover ? 'Remove the flyover' : 'Remove the road', mid(this.road), false);
    else { this.cancel(); this.ctx.hint('Tap a road or a car park'); }
  }

  draw(): void {
    const { ghosts } = this.ctx;
    if (this.road) ghosts.pick(this.road.line, halfWidth(this.road), this.quote);
    if (this.park) ghosts.block({ gx: this.park.gx, gy: this.park.gy }, this.park.kind, this.quote);
  }

  cancel(): void {
    this.road = this.park = null;
    this.ctx.propose(null, '', { x: 0, y: 0 }, false);
  }
}

/** The junction tool: tap one and the UI shows its controls. */
export class JunctionTool extends TapTool {
  tap(p: Pt): void {
    const j = pickJunction(this.ctx.city, p, this.ctx.slack);
    if (j) this.ctx.select({ kind: 'junction', id: j.id, at: { x: j.x, y: j.y } });
    else this.ctx.hint('Tap a junction');
  }
  draw(): void { /* the selection ring shows it */ }
  cancel(): void { this.ctx.propose(null, '', { x: 0, y: 0 }, false); }
}

/** A car park's footprint follows the pointer; tap or drag to place it. */
export class ParkTool implements Tool {
  private at: Cell | null = null;
  private quote: Quote | null = null;

  constructor(private readonly ctx: ToolCtx, private readonly kind: CarParkKind) {}

  private cellFor(p: Pt): Cell {
    const [w, h] = PARK_CELLS[this.kind];
    return { gx: Math.round(p.x / CELL - w / 2), gy: Math.round(p.y / CELL - h / 2) };
  }

  private place(p: Pt, dragging: boolean): void {
    const c = this.cellFor(p);
    if (this.at && sameCell(c, this.at) && dragging) return;
    this.at = c;
    const [w] = PARK_CELLS[this.kind];
    this.quote = this.ctx.propose({ t: 'carPark', kind: this.kind, at: c }, 'Car park', { x: (c.gx + w / 2) * CELL, y: c.gy * CELL }, dragging);
  }

  tap(p: Pt): void { this.place(p, false); }

  /** Only a drag that begins on the footprint moves it; any other moves the map. */
  dragStart(p: Pt): boolean {
    if (!this.at) return false;
    const [w, h] = PARK_CELLS[this.kind];
    const s = this.ctx.slack;
    const x = this.at.gx * CELL;
    const y = this.at.gy * CELL;
    return p.x > x - s && p.x < x + w * CELL + s && p.y > y - s && p.y < y + h * CELL + s;
  }

  drag(p: Pt): void { this.place(p, true); }
  dragEnd(p: Pt): void { this.place(p, false); }

  cancel(): void {
    this.at = null;
    this.quote = null;
    this.ctx.propose(null, '', { x: 0, y: 0 }, false);
  }

  built(): void { this.cancel(); }

  draw(hover: Pt | null): void {
    if (this.at) this.ctx.ghosts.block(this.at, this.kind, this.quote);
    else if (hover) this.ctx.ghosts.block(this.cellFor(hover), this.kind, null);
  }
}

/** Transit lines: tap the stops one after another. */
export class LineTool extends TapTool {
  private stops: Cell[] = [];
  private quote: Quote | null = null;
  private hovering: Cell | null = null;

  constructor(ctx: ToolCtx, private readonly mode: TransitMode) { super(ctx); }

  private get onRoads(): boolean { return this.mode === 'bus' || this.mode === 'express' || this.mode === 'tram'; }

  private snap(p: Pt): Cell | null {
    const rows = this.ctx.city.def.map;
    const roads = roadCells(this.ctx.city.roads);
    const c = snapCell(p, { cols: rows[0]?.length ?? 1, rows: rows.length }, this.onRoads ? roads : undefined);
    return this.onRoads && !roads.has(`${c.gx},${c.gy}`) ? null : c;
  }

  tap(p: Pt): void {
    const c = this.snap(p);
    if (!c) { this.ctx.hint('Tap on a road to place a stop'); return; }
    const last = this.stops[this.stops.length - 1];
    if (last && sameCell(last, c)) { this.undo(); return; }
    this.stops = [...this.stops, c];
    this.propose();
  }

  undo(): void {
    this.stops = this.stops.slice(0, -1);
    this.propose();
  }

  private propose(): void {
    const last = this.stops[this.stops.length - 1];
    const cmd: Command | null = this.stops.length > 1 ? { t: 'line', mode: this.mode, stops: this.stops } : null;
    this.quote = this.ctx.propose(cmd, `New ${this.mode} line`, last ? cellPt(last) : { x: 0, y: 0 }, false);
    if (this.stops.length === 1) this.ctx.hint('Now tap the next stop');
  }

  draw(hover: Pt | null): void {
    this.hovering = hover ? this.snap(hover) : null;
    const pts = this.stops.map(cellPt);
    const path = this.quote?.line ?? pts;
    const colour = LINE_COLOURS[this.ctx.city.lines.length % LINE_COLOURS.length]!;
    this.ctx.ghosts.stops(pts, path, colour, this.quote, this.hovering ? cellPt(this.hovering) : null);
  }

  cancel(): void {
    this.stops = [];
    this.quote = null;
    this.ctx.propose(null, '', { x: 0, y: 0 }, false);
  }
}
