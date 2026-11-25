import { cellPt } from '../sim/geom';
import type { Pt } from '../sim/types';
import type { Desk } from './desk';
import type { WorldScene } from './WorldScene';

/** Dev only: numbers and handles for screenshot scripts, on window.__ir. */
export interface IrProbe {
  fps(): { readonly avg: number; readonly p95ms: number; readonly worstMs: number; readonly n: number };
  cars(): number;
  drawn(): number;
  pending(): number;
  /** A grid vertex, or a plan point, in CSS px of the canvas. */
  cell(gx: number, gy: number): Pt;
  at(x: number, y: number): Pt;
  zoom(): number;
  readonly scene: WorldScene;
  readonly desk: Desk;
}

export function installProbe(scene: WorldScene, desk: Desk): void {
  const probe: IrProbe = {
    fps: () => {
      const t = [...scene.frames].sort((a, b) => a - b);
      if (t.length === 0) return { avg: 0, p95ms: 0, worstMs: 0, n: 0 };
      const mean = t.reduce((a, b) => a + b, 0) / t.length;
      return { avg: Math.round(1000 / mean), p95ms: Math.round(t[Math.floor(t.length * 0.95)]! * 10) / 10, worstMs: Math.round(t[t.length - 1]!), n: t.length };
    },
    cars: () => scene.city.cars.alive.subarray(0, scene.city.cars.count).reduce((n, v) => n + v, 0),
    drawn: () => scene.cars.drawn,
    pending: () => scene.ground.pending,
    cell: (gx, gy) => scene.rig.toCss(cellPt({ gx, gy })),
    at: (x, y) => scene.rig.toCss({ x, y }),
    zoom: () => scene.rig.zoom,
    scene, desk,
  };
  (window as unknown as { __ir: IrProbe }).__ir = probe;
}
