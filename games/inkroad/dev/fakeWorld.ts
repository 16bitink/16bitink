import type { Ghost, Overlay, Selection, ToolOptions, WorldCallbacks, WorldPort } from '../src/scenes/port';
import type { CityEvent, CityView, Pt, ToolId } from '../src/sim/types';

/** A world with no drawing: it keeps the tool, ghost and selection the UI reads, and lets the dev page set them. */
export class FakeWorld implements WorldPort {
  readonly ready = Promise.resolve();
  tool: ToolId | null = null;
  ghost: Ghost | null = null;
  selection: Selection = null;
  overlay: Overlay = 'none';
  focused: Pt | null = null;
  setCallbacks(_c: WorldCallbacks): void {}
  setCity(_c: CityView): void {}
  setTool(tool: ToolId | null, _o?: ToolOptions): void { this.tool = tool; if (!tool) this.ghost = null; }
  setOverlay(o: Overlay): void { this.overlay = o; }
  select(s: Selection): void { this.selection = s; }
  handleEvents(_l: readonly CityEvent[]): void {}
  confirm() { const g = this.ghost; this.ghost = null; return g ? g.quote : null; }
  cancel(): void { this.ghost = null; }
  undoStop(): void {}
  startFlyover(): void {}
  carAt(): Pt | null { return null; }
  talker(): null { return null; }
  focusOn(at: Pt): void { this.focused = at; }
  overview(): void {}
  zoomBy(): void {}
  point(): void {}
  setInsets(): void {}
  setInputEnabled(): void {}
  screenOf(at: Pt): Pt | null { return at; }
  worldOf(css: Pt): Pt { return css; }
  screenshot(): Promise<Blob> { return Promise.resolve(new Blob()); }
  resize(): void {}
  setPaused(): void {}
  destroy(): void {}
}
