import { CELL } from '../../sim/constants';
import type { Refusal } from '../../sim/netGround';
import type { Cell, Command, Pt, Quote, Road, ToolId } from '../../sim/types';
import { cellsToBlock } from '../geometry';
import type { City } from '../state';
import { openTools } from '../state';
import { INFLATION } from '../tune';

export interface Handler<K extends Command['t']> {
  readonly quote: (c: City, cmd: Extract<Command, { t: K }>) => Quote;
  /** Called only when the quote is ok; the price is already paid. Returns where it happened. */
  readonly run: (c: City, cmd: Extract<Command, { t: K }>, q: Quote) => Pt;
}

export const no = (why: string): Quote => ({ ok: false, why, cost: 0, land: 0, works: 0 });
/** A refusal that shows what is in the way. */
export const noAt = (r: Refusal): Quote => ({ ...no(r.why), at: r.at });

export interface Extra { readonly land?: number; readonly works?: number; readonly line?: readonly Pt[]; readonly level?: -1 | 0 | 1; readonly warn?: string; readonly note?: string }

/** A price the authority can or can't pay. */
export function priced(c: City, building: number, x: Extra = {}): Quote {
  const land = Math.round((x.land ?? 0) * (1 + INFLATION.land * (c.year - 1)));
  const cost = Math.round(building * (1 + INFLATION.building * (c.year - 1))) + land;
  const rest = {
    cost, land, works: x.works ?? 0,
    ...(x.line ? { line: x.line } : {}), ...(x.level !== undefined ? { level: x.level } : {}), ...(x.warn ? { warn: x.warn } : {}), ...(x.note ? { note: x.note } : {}),
  };
  return cost > c.money && cost > 0 ? { ok: false, why: `Too dear: ${cost} of ${Math.max(0, c.money)}`, ...rest } : { ok: true, ...rest };
}

export const needTool = (c: City, tool: ToolId): string | null => (openTools(c).includes(tool) ? null : 'Not in this year\'s toolbox yet');

const NEAR = 3;
/** Land is dearer near blocks, and dearer still where the city is dense. */
export function landAt(c: City, cell: Cell): number {
  const p = { x: cell.gx * CELL, y: cell.gy * CELL };
  let factor = 0.3;
  for (const l of c.lots) {
    if (l.level === 0 || cellsToBlock(l, p) > NEAR) continue;
    factor = Math.max(factor, 0.6 + 0.4 * l.level);
  }
  return c.def.rules.landPrice * factor;
}

export const landFor = (c: City, cells: readonly Cell[]): number => cells.reduce((n, x) => n + landAt(c, x), 0);

export function homesBeside(c: City, line: readonly Pt[], cells: number): number {
  let n = 0;
  for (const l of c.lots) {
    if (l.kind !== 'home' || l.level === 0) continue;
    if (line.some((p) => cellsToBlock(l, p) <= cells)) n += 1;
  }
  return n;
}

export const middle = (line: readonly Pt[]): Pt => line[Math.floor(line.length / 2)] ?? { x: 0, y: 0 };
export const nightRate = (c: City): number => (c.policies.nightWorks ? 1.2 : 1);
export const isGround = (r: Road): boolean => r.level === 0 && !r.flyover;
