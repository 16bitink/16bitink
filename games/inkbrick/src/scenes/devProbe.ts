/**
 * Dev only (never created in a production build): frame times and the
 * time of key events on window.__ib, so a screenshot script can wait for
 * the break-in and read the fps.
 */
import type { SimEvent } from '../sim/types';

const SAMPLES = 300;

export interface IbProbe {
  readonly marks: Record<string, number>;
  /** Feeds a fake sim event to the scene (visual checks of events a bot rarely causes). */
  emit?: (e: SimEvent) => void;
  fps(): { readonly avg: number; readonly p95: number; readonly worstMs: number; readonly n: number };
}

export class DevProbe {
  private readonly times: number[] = [];
  private readonly probe: IbProbe;
  set emit(f: (e: SimEvent) => void) {
    this.probe.emit = f;
  }
  private readonly marks: Record<string, number> = {};
  private clock = 0;

  constructor() {
    this.probe = { marks: this.marks, fps: () => this.stats() };
    (window as unknown as { __ib: IbProbe }).__ib = this.probe;
  }

  frame(deltaMs: number): void {
    this.clock += deltaMs;
    this.times.push(deltaMs);
    if (this.times.length > SAMPLES) this.times.shift();
  }

  mark(name: string): void {
    this.marks[name] = this.clock;
  }

  private stats(): { avg: number; p95: number; worstMs: number; n: number } {
    const t = [...this.times].sort((a, b) => a - b);
    if (t.length === 0) return { avg: 0, p95: 0, worstMs: 0, n: 0 };
    const mean = t.reduce((a, b) => a + b, 0) / t.length;
    return { avg: Math.round(1000 / mean), p95: Math.round(1000 / t[Math.floor(t.length * 0.95)]!), worstMs: Math.round(t[t.length - 1]!), n: t.length };
  }
}
