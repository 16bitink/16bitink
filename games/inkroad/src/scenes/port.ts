import type { CarParkKind, CityEvent, CityView, Command, Id, Pt, Quote, RoadType, ToolId } from '../sim/types';

/**
 * The world view's port: everything the app and the DOM UI may ask of the
 * Phaser scene, and everything it tells them. No Phaser type crosses it. It is
 * a superset of src/app/worldPort.ts, so createWorld fits its WorldFactory.
 *
 *   const world = createWorld(parent, city, callbacks);   // src/scenes/world.ts
 *   await world.ready;
 *
 * - The app owns the speed. Once a frame the world calls `frame(dt)`; the app
 *   may call city.advance(dt * speed) there (or in its own loop). The world
 *   only reads the city and smooths cars between the sim's steps.
 * - The app drains city events (one consumer) and passes them to `handleEvents`.
 * - Tools: the UI picks one (`setTool`), the world handles the pointer and
 *   shows a Ghost (what would be built, its price or why not). The UI shows
 *   Build and Cancel and calls `confirm` / `cancel`.
 */

export type Overlay = 'none' | 'flow' | 'parking' | 'anger' | 'money' | 'condition';

export interface ToolOptions {
  /** tool 'parking': what to place (default 'lot'). */
  readonly park?: CarParkKind;
  /** Road tools: build one-way, in the direction of the drag. */
  readonly oneWay?: boolean;
  /** tool 'bus': an express line. */
  readonly express?: boolean;
}

/** What the player has drawn but not built yet. */
export interface Ghost {
  readonly cmd: Command;
  readonly quote: Quote;
  /** 'New street', 'Widen to avenue', 'Flyover'. */
  readonly label: string;
  /** Where to anchor the price tag, plan px (see screenOf). */
  readonly at: Pt;
  /** True while the finger is still down (show the price, not yet Build). */
  readonly dragging: boolean;
  /** A road with fixed points: the bar offers Undo (drop the last point). */
  readonly undoable?: boolean;
}

/** What a tap picked, or the UI selected. `at` is filled by the world. */
export type Selection =
  | { readonly kind: 'junction' | 'road' | 'lot' | 'carPark' | 'line' /** id: its index in city.beaches */ | 'beach'; readonly id: Id; readonly at?: Pt }
  | { readonly kind: 'car'; readonly slot: number; readonly uid?: number; readonly at?: Pt }
  | null;

export interface WorldCallbacks {
  /** Once a frame, before drawing, real seconds (capped). */
  frame?(dt: number): void;
  onSelect?(s: Selection): void;
  onGhost?(g: Ghost | null): void;
  /** After confirm: what city.apply said. */
  onBuilt?(cmd: Command, result: Quote): void;
  /** A tap that can't do anything with this tool, in a player's words ('Tap a road'). */
  onHint?(text: string): void;
  /** The camera moved or zoomed (reposition anchored cards). */
  onCamera?(): void;
  onProgress?(f: number): void;
  /** A frame was drawn: move whatever is pinned to the map (tags, bubbles). */
  onDrawn?(): void;
}

export interface Insets { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number }

export interface WorldPort {
  /** Art loaded and the first bake drawn. */
  readonly ready: Promise<void>;
  readonly tool: ToolId | null;
  readonly ghost: Ghost | null;
  readonly selection: Selection;
  readonly overlay: Overlay;
  /** The last pointer was a finger. */
  readonly touch: boolean;
  /** Points fixed so far on the road in hand (0 when none). */
  readonly points: number;
  /** Replace the callbacks (a UI made after the world). */
  setCallbacks(c: WorldCallbacks): void;
  /** Swap the city (load, retry a year, next city). Keeps the camera if the map is the same. */
  setCity(city: CityView): void;
  setTool(tool: ToolId | null, opts?: ToolOptions): void;
  setOverlay(o: Overlay): void;
  /** Select from outside (a complaint's "show me"), or null to clear. A junction shows its flow arrows. */
  select(s: Selection): void;
  /** City events to draw (pops, sparkles, honks, growth). */
  handleEvents(list: readonly CityEvent[]): void;
  /** Build the ghost. city.apply's answer, or null when there is no ghost. */
  confirm(): Quote | null;
  cancel(): void;
  /** Esc or a right click: drop the ghost, else put the tool down, else close the selection. False when there was nothing to step back from. */
  back(): boolean;
  /** Drop the last tapped stop of a line, or the last fixed point of a road (Backspace). */
  undoStop(): void;
  /** Enter: a road stops following the pointer. False when there was nothing to finish. */
  finish(): boolean;
  /** Show this junction's arrows; with a movement, go straight to its ghost, else wait for the player to pick one. */
  startFlyover(node: Id, move?: { readonly fromRoad: Id; readonly toRoad: Id } | null, level?: 1 | -1): void;
  /** Glide to a place; zoom in CSS px per plan px. */
  focusOn(at: Pt, opts?: { readonly zoom?: number; readonly ms?: number }): void;
  /** Show the whole map. */
  overview(ms?: number): void;
  zoomBy(factor: number): void;
  /** A pulsing ring at a place (coach, complaints), or null. */
  point(at: Pt | null): void;
  /** Space the DOM HUD covers, CSS px: focusOn centres in what is left. */
  setInsets(i: Insets): void;
  /** Ignore the pointer (a card is up). */
  setInputEnabled(on: boolean): void;
  /** Where a plan point is on screen, CSS px in the parent (may be outside it). */
  screenOf(at: Pt): Pt | null;
  worldOf(css: Pt): Pt;
  /** A car's roof, CSS px, or null when it is gone or off screen. */
  carAt(slot: number, uid: number): Pt | null;
  /** A driver on screen who is stuck in a queue, or null. */
  talker(): { readonly slot: number; readonly uid: number } | null;
  screenshot(): Promise<Blob>;
  /** Re-measure the parent now (it also watches it). */
  resize(): void;
  /** Stop drawing (menu over the world) and start again. */
  setPaused(on: boolean): void;
  destroy(): void;
}

export interface WorldOptions {
  /** Sharper ground. Phones default to 'low'. */
  readonly quality?: 'low' | 'high';
  /** Dev: fill window.__ir (fps, car count, cell to screen). */
  readonly probe?: boolean;
}

export type CreateWorld = (parent: HTMLElement, city: CityView, callbacks?: WorldCallbacks, opts?: WorldOptions) => WorldPort;

/** Which tool draws which road. */
export const ROAD_TOOLS: Readonly<Partial<Record<ToolId, RoadType>>> = {
  street: 'street', avenue: 'avenue', boulevard: 'boulevard', highway: 'highway',
};
