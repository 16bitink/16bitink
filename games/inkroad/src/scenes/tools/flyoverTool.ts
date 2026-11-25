import type { Command, Id, Movement, Pt, Quote } from '../../sim/types';
import { pickJunction } from './pick';
import type { Tool, ToolCtx } from './tool';

/** One movement, one deck: tap a junction, then tap its arrow (or drag along it). */
export class FlyoverTool implements Tool {
  private node: Id | null = null;
  private from: Pt | null = null;
  private quote: Quote | null = null;
  picked: Movement | null = null;

  constructor(private readonly ctx: ToolCtx, private readonly level: 1 | -1) {}

  startAt(node: Id, move: { readonly fromRoad: Id; readonly toRoad: Id } | null = null): void {
    this.drop();
    this.node = node;
    this.ctx.arrows.show(this.ctx.city, node);
    const m = move && this.ctx.city.movements(node).find((q) => q.fromRoad === move.fromRoad && q.toRoad === move.toRoad);
    if (m) return this.take(m, false);
    this.ctx.hint('Tap the arrow you want to lift over the junction');
  }

  tap(p: Pt): void {
    const m = this.node === null ? null : this.ctx.arrows.pick(p);
    if (m) { this.take(m, false); return; }
    const j = pickJunction(this.ctx.city, p, this.ctx.slack);
    if (!j) { this.ctx.hint('Tap a junction'); return; }
    this.ctx.select({ kind: 'junction', id: j.id, at: { x: j.x, y: j.y } });
    this.startAt(j.id);
  }

  dragStart(p: Pt): boolean {
    if (this.node === null) return false;
    const j = this.ctx.city.junctions.find((q) => q.id === this.node);
    if (!j || Math.hypot(j.x - p.x, j.y - p.y) > j.radius + 90) return false;
    this.from = p;
    return true;
  }

  drag(p: Pt): void {
    if (!this.from) return;
    const m = this.ctx.arrows.pickDrag(this.from, p);
    if (m && m !== this.picked) this.take(m, true);
  }

  dragEnd(p: Pt): void {
    this.drag(p);
    this.from = null;
    if (this.picked) this.take(this.picked, false);
  }

  private take(m: Movement, dragging: boolean): void {
    this.picked = m;
    if (m.flyover) { this.ctx.hint('This turn already has its own road'); }
    const cmd: Command = { t: 'flyover', node: m.node, fromRoad: m.fromRoad, toRoad: m.toRoad, level: this.level };
    const at = m.arrow[Math.floor(m.arrow.length / 2)] ?? { x: 0, y: 0 };
    this.quote = this.ctx.propose(cmd, this.level > 0 ? 'Flyover' : 'Underpass', at, dragging);
    this.ctx.arrows.setPicked(m, this.ctx.city);
  }

  draw(): void {
    if (!this.picked) return;
    const line = this.quote?.line && this.quote.line.length > 1 ? this.quote.line : this.picked.arrow;
    this.ctx.ghosts.flyover(line, this.level, this.quote);
  }

  private drop(): void {
    this.picked = null;
    this.quote = null;
    this.from = null;
    this.ctx.propose(null, '', { x: 0, y: 0 }, false);
  }

  cancel(): void {
    this.drop();
    this.ctx.arrows.setPicked(null, this.ctx.city);
  }

  built(): void {
    this.drop();
    this.ctx.arrows.setPicked(null, this.ctx.city);
  }
}
