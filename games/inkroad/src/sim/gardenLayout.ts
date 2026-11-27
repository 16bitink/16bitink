import { lotRect, type Rect } from '../city/geometry';
import { CELL } from './constants';
import type { Lot, Pt } from './types';

/**
 * A garden lot is deep: its plot pictures stand in the north rows and the rest is each plot
 * column's front garden, one painted picture (`b-<set>-garden1-<v>`) per column: its side walls,
 * a straight path from the villa's gate to a gate in its front wall, and the set's own planting.
 * Pure layout, in plan units; the walls and gates here are where the pictures paint them.
 */
export type GardenLot = Pick<Lot, 'id' | 'gx' | 'gy' | 'w' | 'h'> & { readonly garden?: boolean };

/** Cells in a plot picture's side (the built rows of a garden lot, and a garden piece's side). */
export const PLOT_CELLS = 2;
/** The front wall's line sits this far inside the south edge; the gate in it is this wide. */
export const HEDGE_IN = 6;
export const GATE_W = 20;

export const isGarden = (l: Pick<Lot, 'garden' | 'h'>): boolean => l.garden === true && l.h > PLOT_CELLS;

export interface GardenPlan {
  /** The whole lot. */
  readonly lot: Rect;
  /** The built north rows (the plot pictures stand here). */
  readonly built: Rect;
  /** The front garden: the south rows (the garden pictures cover it). */
  readonly lawn: Rect;
  /** The y of the front wall line. */
  readonly hedgeY: number;
  /** The door of each plot column, bottom centre of its picture (the villa's gate). */
  readonly gates: readonly Pt[];
  /** Per gate: the painted path, straight south from the villa's gate to the gate in the front wall (end is on hedgeY). */
  readonly paths: readonly (readonly Pt[])[];
  /** Per gate: where its garden picture stands, the bottom centre of its front wall (on the lot's south edge). */
  readonly pieces: readonly Pt[];
}

export function gardenPlan(l: GardenLot): GardenPlan {
  const lot = lotRect(l);
  const builtH = PLOT_CELLS * CELL;
  const built = { x: lot.x, y: lot.y, w: lot.w, h: builtH };
  const lawn = { x: lot.x, y: lot.y + builtH, w: lot.w, h: lot.h - builtH };
  const cols = Math.max(1, Math.floor(l.w / PLOT_CELLS));
  const hedgeY = lot.y + lot.h - HEDGE_IN;
  const gates = Array.from({ length: cols }, (_, i): Pt => ({ x: lot.x + (lot.w / cols) * (i + 0.5), y: lawn.y }));
  const paths = gates.map((g) => [g, { x: g.x, y: hedgeY }]);
  const pieces = gates.map((g): Pt => ({ x: g.x, y: lot.y + lot.h }));
  return { lot, built, lawn, hedgeY, gates, paths, pieces };
}

/** x of every wall running south from the villas: the lot's sides and the divider between neighbours. */
export function wallXs(p: GardenPlan): number[] {
  const n = p.gates.length;
  return Array.from({ length: n + 1 }, (_, i) => p.lot.x + (p.lot.w / n) * i);
}

/** Pieces of the front wall between its gate gaps, as [x0, x1] runs. */
export function hedgeRuns(p: GardenPlan): [number, number][] {
  const out: [number, number][] = [];
  let x = p.lot.x;
  for (const g of p.gates) {
    if (g.x - GATE_W / 2 > x) out.push([x, g.x - GATE_W / 2]);
    x = g.x + GATE_W / 2;
  }
  if (p.lot.x + p.lot.w > x) out.push([x, p.lot.x + p.lot.w]);
  return out;
}

/** The variant of a column's garden picture: neighbours differ, and it stays put as the lot grows. */
export const gardenVariant = (l: Pick<Lot, 'id' | 'variant'>, col: number, variants: number): number => (l.variant + l.id * 3 + col) % variants;
