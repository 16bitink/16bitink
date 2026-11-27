import type { Command, Id, Pt, Quote, ToolId } from '../sim/types';
import type { Ghost, Selection, ToolOptions, WorldCallbacks } from './port';
import type { WorldScene } from './WorldScene';
import { makeTool } from './tools/make';
import { pickBeach, pickJunction, pickLine, pickLot, pickPark, pickRoad } from './tools/pick';
import type { Tool, ToolCtx } from './tools/tool';

/** The drawing desk: the tool in hand, the ghost, the selection. Plan px in, city commands out. */
const FINGER_CSS = 22; // half of a 44 px target
const MOUSE_CSS = 8;
const DUST_HALF = 9; // plan px
const CAR_ZOOM = 0.8; // tap cars only when they are this big

export class Desk {
  tool: ToolId | null = null;
  ghost: Ghost | null = null;
  touch = false;
  hover: Pt | null = null;
  private handler: Tool | null = null;

  constructor(private readonly scene: WorldScene, private cb: WorldCallbacks) {}

  setCallbacks(cb: WorldCallbacks): void { this.cb = cb; }

  get callbacks(): WorldCallbacks { return this.cb; }

  private ctx(): ToolCtx {
    const { scene } = this;
    const self = this;
    return {
      get city() { return scene.city; },
      get ghosts() { return scene.ghosts; },
      get arrows() { return scene.arrows; },
      get touch() { return self.touch; },
      get slack() { return (self.touch ? FINGER_CSS : MOUSE_CSS) / scene.rig.zoom; },
      propose: (cmd, label, at, dragging) => this.propose(cmd, label, at, dragging),
      hint: (t) => this.cb.onHint?.(t),
      select: (s) => this.select(s),
    };
  }

  get slack(): number { return (this.touch ? FINGER_CSS : MOUSE_CSS) / this.scene.rig.zoom; }

  // -------------------------------------------------------------- tools

  setTool(id: ToolId | null, o: ToolOptions = {}): void {
    this.handler?.cancel();
    this.setGhost(null);
    this.tool = id;
    this.scene.tool = id;
    this.handler = id === null ? null : makeTool(id, o, this.ctx());
    const s = this.scene.selection;
    if (id === null) { if (s?.kind === 'junction') this.scene.arrows.show(this.scene.city, s.id); return; }
    const keep = (id === 'flyover' || id === 'underpass' || id === 'junction') && s?.kind === 'junction';
    if (!keep) this.select(null);
    else if (id !== 'junction' && s?.kind === 'junction') this.handler?.startAt?.(s.id);
  }

  startFlyover(node: Id, move: { readonly fromRoad: Id; readonly toRoad: Id } | null, level: 1 | -1): void {
    this.setTool(level > 0 ? 'flyover' : 'underpass');
    const j = this.scene.city.junctions.find((q) => q.id === node);
    if (j) this.select({ kind: 'junction', id: node, at: { x: j.x, y: j.y } });
    this.handler?.startAt?.(node, move);
  }

  private propose(cmd: Command | null, label: string, at: Pt, dragging: boolean): Quote | null {
    if (!cmd) { this.setGhost(null); return null; }
    const quote = this.scene.city.quote(cmd);
    this.setGhost({ cmd, quote, label, at, dragging, undoable: this.points > 0 });
    return quote;
  }

  private setGhost(g: Ghost | null): void {
    if (g === null && this.ghost === null) return;
    this.ghost = g;
    this.cb.onGhost?.(g);
  }

  confirm(): Quote | null {
    const g = this.ghost;
    if (!g) return null;
    const result = this.scene.city.apply(g.cmd);
    this.cb.onBuilt?.(g.cmd, result);
    if (result.ok) {
      if (g.quote.line) this.scene.fx.unroll(g.quote.line, DUST_HALF);
      this.handler?.built(g.cmd);
    }
    else this.cb.onHint?.(result.why ?? 'That did not work');
    return result;
  }

  cancel(): void {
    this.handler?.cancel();
    this.setGhost(null);
  }

  undo(): void { this.handler?.undo?.(); }

  /** Enter: stop following the pointer so the bar offers Build. False when nothing was following. */
  finish(): boolean { return this.handler?.finish?.() ?? false; }

  /** Points fixed so far on the road in hand. */
  get points(): number { return this.handler?.points ?? 0; }

  /** Esc or a right click: drop the road being drawn, else put the tool down, else close the selection. False when there was nothing to undo. */
  back(): boolean {
    if (this.ghost) { this.cancel(); return true; }
    if (this.tool !== null) { this.setTool(null); return true; }
    if (this.scene.selection) { this.select(null); return true; }
    return false;
  }

  // -------------------------------------------------------------- the pointer, plan px

  tap(p: Pt): void {
    if (this.handler) this.handler.tap(p);
    else this.select(this.pick(p));
  }

  dragStart(p: Pt): boolean { return this.handler?.dragStart(p) ?? false; }
  drag(p: Pt): void { this.handler?.drag(p); }
  dragEnd(p: Pt): void { this.handler?.dragEnd(p); }
  dragCancel(): void { this.handler?.cancel(); }

  /** The most likely thing under a tap: a junction, a car up close, a road, a car park, a lot, a line. */
  private pick(p: Pt): Selection {
    const { city, rig, cars } = this.scene;
    const s = this.slack;
    const core = pickJunction(city, p, 0); // a tap on a junction means the junction, whatever drives over it
    if (core) return { kind: 'junction', id: core.id, at: { x: core.x, y: core.y } };
    if (rig.zoom >= CAR_ZOOM) {
      const car = cars.pick(p.x, p.y, Math.min(12, 5 + s * 0.4));
      if (car) return { kind: 'car', slot: car.slot, uid: car.uid, at: p };
    }
    const j = pickJunction(city, p, s * 0.45);
    if (j) return { kind: 'junction', id: j.id, at: { x: j.x, y: j.y } };
    const park = pickPark(city, p);
    if (park) return { kind: 'carPark', id: park.id, at: p };
    const road = pickRoad(city, p, s * 0.4);
    if (road) return { kind: 'road', id: road.id, at: p };
    const lot = pickLot(city, p);
    if (lot) return { kind: 'lot', id: lot.id, at: p };
    const line = pickLine(city, p, s * 0.4);
    if (line) return { kind: 'line', id: line.id, at: p };
    const beach = pickBeach(city, p);
    return beach >= 0 ? { kind: 'beach', id: beach, at: p } : null;
  }

  select(s: Selection): void {
    const had = this.scene.selection;
    if (s === null && had === null) return;
    this.scene.selection = s;
    if (s?.kind === 'junction') this.scene.arrows.show(this.scene.city, s.id);
    else this.scene.arrows.hide();
    this.cb.onSelect?.(s);
  }

  /** Redraw the ghost every frame it exists (cheap: one Graphics). */
  draw(): void {
    this.scene.ghosts.clear();
    this.handler?.draw(this.touch ? null : this.hover);
  }

  /** The city was swapped: nothing half-drawn survives. */
  reset(): void {
    this.handler?.cancel();
    this.setGhost(null);
    this.setTool(this.tool);
  }
}
