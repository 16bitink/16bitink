import type { Pt } from '../sim/types';

/**
 * Mouse, touch and pen on the canvas, turned into taps, drags, pinches and
 * wheel steps in CSS px of the element. Two fingers always move the map; what
 * one finger does is up to the tool.
 */
const TAP_PX = 9;
const WHEEL_RATE = 0.0016;
const WHEEL_PINCH_RATE = 0.01;
const WHEEL_MAX = 140;
const FLING_WINDOW_MS = 80;

export interface PointerHooks {
  tap(p: Pt, touch: boolean): void;
  /** One pointer starts to drag. `map`: it should move the map (right or middle button, or no tool wants it). Return true to take it. */
  dragStart(from: Pt, map: boolean): boolean;
  drag(p: Pt): void;
  dragEnd(p: Pt): void;
  dragCancel(): void;
  pan(dx: number, dy: number): void;
  fling(vx: number, vy: number): void;
  zoom(at: Pt, factor: number, instant: boolean): void;
  hover(p: Pt | null): void;
  press(): void;
}

interface Finger { readonly id: number; start: Pt; now: Pt; moved: boolean }

export class PointerRig {
  enabled = true;
  private readonly fingers = new Map<number, Finger>();
  private mode: 'none' | 'tool' | 'map' | 'pinch' = 'none';
  private trail: { p: Pt; t: number }[] = [];
  private readonly off: (() => void)[] = [];

  constructor(private readonly el: HTMLElement, private readonly hooks: PointerHooks) {
    this.on('pointerdown', (e) => this.down(e as PointerEvent));
    this.on('pointermove', (e) => this.move(e as PointerEvent));
    this.on('pointerup', (e) => this.up(e as PointerEvent));
    this.on('pointercancel', (e) => this.cancel(e as PointerEvent));
    this.on('pointerleave', () => hooks.hover(null));
    this.on('wheel', (e) => this.wheel(e as WheelEvent), { passive: false });
    this.on('contextmenu', (e) => e.preventDefault());
  }

  private on(type: string, f: (e: Event) => void, opts?: AddEventListenerOptions): void {
    this.el.addEventListener(type, f, opts);
    this.off.push(() => this.el.removeEventListener(type, f, opts));
  }

  private at(e: MouseEvent): Pt {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down(e: PointerEvent): void {
    if (!this.enabled) return;
    try { this.el.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer has nothing to capture */ }
    const p = this.at(e);
    this.fingers.set(e.pointerId, { id: e.pointerId, start: p, now: p, moved: false });
    this.hooks.press();
    this.trail = [{ p, t: e.timeStamp }];
    if (this.fingers.size === 2) {
      if (this.mode === 'tool') this.hooks.dragCancel();
      this.mode = 'pinch';
    }
  }

  private move(e: PointerEvent): void {
    const f = this.fingers.get(e.pointerId);
    const p = this.at(e);
    if (!f) { if (this.enabled && e.pointerType === 'mouse') this.hooks.hover(p); return; }
    const last = f.now;
    f.now = p;
    if (this.fingers.size >= 2) { f.moved = true; this.pinch(f, last); return; }
    if (!f.moved && Math.hypot(p.x - f.start.x, p.y - f.start.y) < TAP_PX) return;
    if (!f.moved) {
      f.moved = true;
      const map = e.pointerType === 'mouse' && (e.buttons & 6) !== 0;
      if (this.mode === 'none') this.mode = this.hooks.dragStart(f.start, map) ? 'tool' : 'map';
    }
    if (this.mode === 'tool') this.hooks.drag(p);
    else {
      this.hooks.pan(p.x - last.x, p.y - last.y);
      this.trail = [...this.trail.filter((s) => e.timeStamp - s.t < FLING_WINDOW_MS), { p, t: e.timeStamp }];
    }
  }

  private pinch(f: Finger, last: Pt): void {
    const other = [...this.fingers.values()].find((q) => q !== f);
    if (!other) return;
    const d0 = Math.hypot(last.x - other.now.x, last.y - other.now.y);
    const d1 = Math.hypot(f.now.x - other.now.x, f.now.y - other.now.y);
    this.hooks.pan((f.now.x - last.x) / 2, (f.now.y - last.y) / 2);
    if (d0 > 10) this.hooks.zoom({ x: (f.now.x + other.now.x) / 2, y: (f.now.y + other.now.y) / 2 }, d1 / d0, true);
  }

  private up(e: PointerEvent): void {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    this.fingers.delete(e.pointerId);
    if (this.mode === 'pinch') { if (this.fingers.size === 0) this.mode = 'none'; else for (const q of this.fingers.values()) { q.moved = true; this.mode = 'map'; } return; }
    const p = this.at(e);
    if (!f.moved) { if (this.enabled && e.button !== 2) this.hooks.tap(p, e.pointerType !== 'mouse'); }
    else if (this.mode === 'tool') this.hooks.dragEnd(p);
    else this.throwMap(e.timeStamp);
    this.mode = 'none';
  }

  private throwMap(now: number): void {
    const from = this.trail.find((s) => now - s.t < FLING_WINDOW_MS);
    const to = this.trail[this.trail.length - 1];
    if (!from || !to || now - to.t > FLING_WINDOW_MS / 2) return;
    const dt = Math.max(0.016, (now - from.t) / 1000);
    this.hooks.fling(-(to.p.x - from.p.x) / dt, -(to.p.y - from.p.y) / dt);
  }

  private cancel(e: PointerEvent): void {
    this.fingers.delete(e.pointerId);
    if (this.mode === 'tool') this.hooks.dragCancel();
    if (this.fingers.size === 0) this.mode = 'none';
  }

  private wheel(e: WheelEvent): void {
    e.preventDefault();
    if (!this.enabled) return;
    const unit = e.deltaMode === 1 ? 16 : 1;
    const d = Math.max(-WHEEL_MAX, Math.min(WHEEL_MAX, e.deltaY * unit));
    this.hooks.zoom(this.at(e), Math.exp(-d * (e.ctrlKey ? WHEEL_PINCH_RATE : WHEEL_RATE)), false);
  }

  /** Forget every finger (a card came up). */
  release(): void {
    if (this.mode === 'tool') this.hooks.dragCancel();
    this.fingers.clear();
    this.mode = 'none';
  }

  destroy(): void {
    this.off.forEach((f) => f());
  }
}
