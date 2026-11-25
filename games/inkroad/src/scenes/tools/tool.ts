import type { CityView, Command, Id, Movement, Pt, Quote } from '../../sim/types';
import type { Arrows } from '../../render/overlay/arrows';
import type { GhostLayer } from '../../render/overlay/ghostLayer';
import type { Selection } from '../port';

/** What a tool may do; the scene gives it this. */
export interface ToolCtx {
  readonly city: CityView;
  readonly ghosts: GhostLayer;
  readonly arrows: Arrows;
  /** Plan px a finger covers now (grows as you zoom out). */
  readonly slack: number;
  /** Show (or with null clear) what would be built. Returns the quote. */
  propose(cmd: Command | null, label: string, at: Pt, dragging: boolean): Quote | null;
  hint(text: string): void;
  select(s: Selection): void;
}

export interface Tool {
  tap(p: Pt): void;
  /** Return true to take the drag; false lets it move the map. */
  dragStart(p: Pt): boolean;
  drag(p: Pt): void;
  dragEnd(p: Pt): void;
  /** Two fingers came down, or Cancel: drop what is being drawn. */
  cancel(): void;
  /** Redraw the ghost. Called whenever anything it shows may have changed. */
  draw(hover: Pt | null): void;
  /** After Build: what to keep on screen. */
  built(cmd: Command): void;
  undo?(): void;
  /** The flyover tool: start at this junction, at once with this movement. */
  startAt?(node: Id, move?: { readonly fromRoad: Id; readonly toRoad: Id } | null): void;
  readonly picked?: Movement | null;
}

/** A tool that only taps. */
export abstract class TapTool implements Tool {
  constructor(protected readonly ctx: ToolCtx) {}
  abstract tap(p: Pt): void;
  abstract draw(hover: Pt | null): void;
  dragStart(_p: Pt): boolean { return false; }
  drag(_p: Pt): void { /* taps only */ }
  dragEnd(_p: Pt): void { /* taps only */ }
  abstract cancel(): void;
  built(_cmd: Command): void { this.cancel(); }
}
