import { halfWidth } from '../../sim/roadGeom';
import { smoothLine } from '../../sim/geom';
import type { Cell, Command, Pt, Quote, Road, RoadType } from '../../sim/types';
import { pickRoad } from './pick';
import { cellKey, cellPt, dirOf, elbow, extend, roadCells, sameCell, snapCell, type Dir } from './snap';
import type { Tool, ToolCtx } from './tool';

/** Draw a road by dragging; drag on from its end to bend it; tap an old road to make it this type. */
const BIAS_PX = 46; // how far the finger goes before its first direction counts
const REACH = 5; // grid dots shown round the pointer
const NAMES: Readonly<Record<RoadType, string>> = { street: 'street', avenue: 'avenue', boulevard: 'boulevard', highway: 'highway' };

export class RoadTool implements Tool {
  private path: Cell[] = [];
  private base: Cell[] = [];
  private start: Pt | null = null;
  private first: Dir | null = null;
  private upgrade: Road | null = null;
  private quote: Quote | null = null;
  private dragging = false;

  constructor(private readonly ctx: ToolCtx, private readonly type: RoadType, private readonly oneWay: boolean) {}

  private snap(p: Pt): Cell {
    const rows = this.ctx.city.def.map;
    return snapCell(p, { cols: rows[0]?.length ?? 1, rows: rows.length }, roadCells(this.ctx.city.roads));
  }

  tap(p: Pt): void {
    const road = pickRoad(this.ctx.city, p, this.ctx.slack * 0.6, true);
    if (!road) {
      if (this.path.length > 1 || this.upgrade) this.cancel();
      else this.ctx.hint('Drag from one place to another to draw the road');
      return;
    }
    if (road.type === this.type) { this.ctx.hint(`That is already ${this.type === 'avenue' ? 'an' : 'a'} ${NAMES[this.type]}`); return; }
    this.path = [];
    this.upgrade = road;
    this.propose(false);
  }

  dragStart(p: Pt): boolean {
    const at = this.snap(p);
    const end = this.path[this.path.length - 1];
    const goOn = this.path.length > 1 && end !== undefined && sameCell(end, at);
    this.base = goOn ? [...this.path] : [at];
    this.path = [...this.base];
    this.upgrade = null;
    this.start = p;
    this.first = null;
    this.dragging = true;
    this.propose(true);
    return true;
  }

  drag(p: Pt): void {
    if (!this.start) return;
    if (!this.first) this.first = dirOf(this.start, p, BIAS_PX);
    const from = this.base[this.base.length - 1]!;
    const to = this.snap(p);
    if (sameCell(from, to)) this.first = null;
    const next = extend(this.base, elbow(from, to, this.first).slice(1));
    const same = next.length === this.path.length && next.every((c, i) => sameCell(c, this.path[i]!));
    if (same) return;
    this.path = next;
    this.propose(true);
  }

  dragEnd(p: Pt): void {
    this.drag(p);
    this.start = null;
    this.dragging = false;
    if (this.path.length < 2) this.cancel();
    else this.propose(false);
  }

  cancel(): void {
    this.path = [];
    this.base = [];
    this.start = null;
    this.upgrade = null;
    this.quote = null;
    this.dragging = false;
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
    const end = this.path[this.path.length - 1];
    if (this.dragging && end) ghosts.grid(cellPt(end), REACH);
    if (this.upgrade) { ghosts.pick(this.upgrade.line, halfWidth(this.upgrade), this.quote); return; }
    if (this.path.length > 1) {
      ghosts.road(smoothLine(this.path.map(cellPt)), this.type, this.oneWay, this.quote);
      ghosts.dot(cellPt(this.path[0]!), true);
      ghosts.dot(cellPt(end!), true);
      return;
    }
    const at = end ?? (hover ? this.snap(hover) : null);
    if (!at) return;
    if (!this.dragging) ghosts.grid(cellPt(at), REACH);
    ghosts.dot(cellPt(at), roadCells(this.ctx.city.roads).has(cellKey(at)));
  }
}
