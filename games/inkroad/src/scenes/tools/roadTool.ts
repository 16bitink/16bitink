import { halfWidth } from '../../sim/roadGeom';
import { smoothLine } from '../../sim/geom';
import type { Cell, Command, Pt, Quote, Road, RoadType } from '../../sim/types';
import { pickJunction, pickRoad } from './pick';
import { cellKey, cellPt, elbow, extend, roadCells, sameCell, snapCell } from './snap';
import type { Tool, ToolCtx } from './tool';

/**
 * Draw a road. Mouse: click a start, click each bend, click the last point again (or Enter) to finish; the
 * ghost follows the pointer meanwhile. Press-drag works too, and a drag that lets go is a click there.
 * Touch: a drag pans the map; each tap fixes a point and the ghost runs through them.
 * The elbow always runs along the longer way first, so the ghost shows exactly what a click will fix.
 */
const REACH = 5; // grid dots shown round the pointer
const TOUCH_DOT = 0.5; // a dot under a finger: this share of its slack
const NAMES: Readonly<Record<RoadType, string>> = { street: 'street', avenue: 'avenue', boulevard: 'boulevard', highway: 'highway' };

export class RoadTool implements Tool {
  private path: Cell[] = [];
  /** The path as it stood after each fixed point; the first is the start alone. */
  private bases: Cell[][] = [];
  private upgrade: Road | null = null;
  private quote: Quote | null = null;
  /** Mouse: the ghost runs on to the pointer. */
  private following = false;
  private dragging = false;
  /** A drag that began while following: letting go counts as a click there. */
  private clickOnRelease = false;

  constructor(private readonly ctx: ToolCtx, private readonly type: RoadType, private readonly oneWay: boolean) {}

  /** How many points are fixed (the start counts). */
  get points(): number { return this.bases.length; }

  private snap(p: Pt): Cell {
    const rows = this.ctx.city.def.map;
    return snapCell(p, { cols: rows[0]?.length ?? 1, rows: rows.length }, roadCells(this.ctx.city.roads));
  }

  private base(): Cell[] { return this.bases[this.bases.length - 1] ?? []; }

  /** The path if the next point were here. */
  private planTo(at: Cell): Cell[] {
    const base = this.base();
    const end = base[base.length - 1]!;
    return extend(base, elbow(end, at, null).slice(1));
  }

  tap(p: Pt): void {
    if (this.bases.length) { this.click(this.snap(p)); return; }
    const road = pickRoad(this.ctx.city, p, this.ctx.slack * 0.6, true);
    const joint = pickJunction(this.ctx.city, p, this.ctx.slack * 0.6, true);
    // A road's own kind, or a junction, is a place to start from; another kind is an upgrade.
    if (!road || joint || road.type === this.type) { this.begin(this.snap(p)); return; }
    this.bases = [];
    this.path = [];
    this.following = false;
    this.upgrade = road;
    this.propose(false);
  }

  private begin(at: Cell): void {
    this.upgrade = null;
    this.bases = [[at]];
    this.path = [at];
    this.following = !this.ctx.touch;
    this.propose(this.following);
  }

  private click(at: Cell): void {
    const end = this.base()[this.base().length - 1]!;
    if (sameCell(end, at)) {
      if (this.ctx.touch) return;
      if (!this.finish()) this.cancel();
      return;
    }
    const next = this.planTo(at);
    this.bases = [...this.bases, next];
    this.path = next;
    this.following = !this.ctx.touch;
    this.propose(this.following);
  }

  /** Stop following the pointer: the bar then offers Build. False when there is nothing to finish. */
  finish(): boolean {
    if (!this.bases.length || !this.following) return false;
    this.following = false;
    if (this.path.length < 2) { this.cancel(); return true; }
    this.propose(false);
    return true;
  }

  /** Drop the last fixed point. */
  undo(): void {
    if (this.bases.length < 2) { this.cancel(); return; }
    this.bases = this.bases.slice(0, -1);
    this.path = this.base();
    this.following = !this.ctx.touch;
    this.propose(this.following);
  }

  private follow(p: Pt): void {
    const next = this.planTo(this.snap(p));
    const same = next.length === this.path.length && next.every((c, i) => sameCell(c, this.path[i]!));
    if (same) return;
    this.path = next;
    this.propose(true);
  }

  dragStart(p: Pt): boolean {
    if (this.ctx.touch) return false; // a finger pans; it taps to place points
    this.clickOnRelease = this.bases.length > 0 && this.following;
    if (!this.clickOnRelease) {
      const at = this.snap(p);
      const end = this.base()[this.base().length - 1];
      const goOn = this.path.length > 1 && end !== undefined && sameCell(end, at);
      if (!goOn) this.bases = [[at]];
      this.path = [...this.base()];
      this.upgrade = null;
    }
    this.dragging = true;
    this.propose(true);
    return true;
  }

  drag(p: Pt): void {
    if (this.dragging) this.follow(p);
  }

  dragEnd(p: Pt): void {
    if (!this.dragging) return;
    this.follow(p);
    this.dragging = false;
    if (this.clickOnRelease) { this.clickOnRelease = false; this.click(this.snap(p)); return; }
    if (this.path.length < 2) { this.cancel(); return; }
    if (this.path.length !== this.base().length) this.bases = [...this.bases, [...this.path]];
    this.following = false;
    this.propose(false);
  }

  cancel(): void {
    this.path = [];
    this.bases = [];
    this.upgrade = null;
    this.quote = null;
    this.following = false;
    this.dragging = false;
    this.clickOnRelease = false;
    this.ctx.propose(null, '', { x: 0, y: 0 }, false);
  }

  built(_cmd: Command): void {
    this.cancel();
  }

  private command(): Command | null {
    if (this.upgrade) return { t: 'upgrade', road: this.upgrade.id, type: this.type };
    if (this.path.length < 2) return null;
    return { t: 'road', cells: this.path, type: this.type, ...(this.oneWay ? { oneWay: true } : {}) };
  }

  private propose(dragging: boolean): void {
    const cmd = this.command();
    const end = this.path[this.path.length - 1];
    const at = this.upgrade ? this.upgrade.line[Math.floor(this.upgrade.line.length / 2)]! : end ? cellPt(end) : { x: 0, y: 0 };
    const label = this.upgrade ? `Make it ${this.type === 'avenue' ? 'an' : 'a'} ${NAMES[this.type]}` : `New ${this.oneWay ? 'one-way ' : ''}${NAMES[this.type]}`;
    this.quote = this.ctx.propose(cmd, label, at, dragging);
  }

  draw(hover: Pt | null): void {
    const { ghosts } = this.ctx;
    if (this.following && !this.dragging && hover) this.follow(hover);
    const end = this.path[this.path.length - 1];
    if ((this.dragging || this.following || this.ctx.touch) && end) ghosts.grid(cellPt(end), REACH);
    if (this.upgrade) { ghosts.pick(this.upgrade.line, halfWidth(this.upgrade), this.quote); return; }
    if (this.path.length > 1) {
      ghosts.road(smoothLine(this.path.map(cellPt)), this.type, this.oneWay, this.quote);
      for (const b of this.bases) { const c = b[b.length - 1]; if (c) ghosts.dot(cellPt(c), true, this.dotRadius()); }
      ghosts.dot(cellPt(end!), true, this.dotRadius());
      return;
    }
    const at = end ?? (hover ? this.snap(hover) : null);
    if (!at) return;
    if (!this.dragging && !this.following) ghosts.grid(cellPt(at), REACH);
    ghosts.dot(cellPt(at), roadCells(this.ctx.city.roads).has(cellKey(at)), this.dotRadius());
  }

  /** Under a finger the dots grow to about half a fingertip, so they show round it. */
  private dotRadius(): number { return this.ctx.touch ? this.ctx.slack * TOUCH_DOT : 0; }
}
