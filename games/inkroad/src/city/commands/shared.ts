import { lotRect } from '../geometry';
import { holdsGround } from '../standing';
import type { Rect } from '../geometry';
import { CELL, MONTHS, MONTHS_PER_SEASON, STEP } from '../../sim/constants';
import type { Refusal } from '../../sim/netGround';
import type { Cell, Command, Pt, Quote, Road, ToolId } from '../../sim/types';
import { cityTime, MONTH_SECONDS, monthAt, PAYDAYS, paydaysDone } from '../clock';
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

/** `paydays`: works that end at paydays (the old freeway's), not after a fixed stretch of the clock. */
export interface Extra { readonly land?: number; readonly works?: number; readonly paydays?: boolean; readonly closes?: boolean; readonly line?: readonly Pt[]; readonly level?: -1 | 0 | 1; readonly warn?: string; readonly note?: string }

/** A price the authority can or can't pay. */
export function priced(c: City, building: number, x: Extra = {}): Quote {
  const land = Math.round((x.land ?? 0) * (1 + INFLATION.land * (c.year - 1)));
  const cost = Math.round(building * (1 + INFLATION.building * (c.year - 1))) + land;
  const rest = {
    cost, land, works: x.works ?? 0, ...(x.closes !== undefined && (x.works ?? 0) > 0 ? { closes: x.closes } : {}), ...((x.works ?? 0) > 0 ? { opens: x.paydays ? opensIn(c, x.works ?? 0) : monthAt(worksEnd(c, x.works ?? 0)) } : {}),
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
/** A month is under way once its first seconds have run: at dawn the day's first month is still whole. */
const midMonth = (c: City): boolean => c.phase === 'day' && c.clock > (c.month === 0 ? 0 : PAYDAYS[c.month - 1]!) + STEP / 2;
/** Paydays until works of whole `months` are done: begun in a month under way, the rest of it comes on top. */
export const worksLeft = (c: City, months: number): number => (months > 0 && midMonth(c) ? months + 1 : months);
/** The month (0 = March) works begun now are over in: they end at the payday before it. */
export const opensIn = (c: City, months: number): number => (paydaysDone(c.phase, c.season, c.month) + worksLeft(c, months)) % MONTHS.length;
/** When works of `months` begun now are over, on the city's clock: a fixed stretch, whenever in a month they start. */
export const worksEnd = (c: City, months: number): number => cityTime(c) + months * MONTH_SECONDS;
/** A road's works fields for `months` begun now: closed (unless by night) until the clock gets there. */
export const roadDig = (c: City, months: number): Pick<Road, 'works' | 'worksEnd' | 'nightWorks'> =>
  (months > 0 ? { works: months, worksEnd: worksEnd(c, months), nightWorks: c.policies.nightWorks } : { works: 0, nightWorks: c.policies.nightWorks });
/** The night crews' tech: half as long, in whole seasons as it always was. */
export const precast = (months: number): number => MONTHS_PER_SEASON * Math.ceil(months / (2 * MONTHS_PER_SEASON));
/** Months of works on a road, and whether they close it (night works leave it open by day). */
export const roadWorks = (c: City, works: number): Pick<Extra, 'works' | 'closes'> => ({ works, closes: !c.policies.nightWorks });
export const isGround = (r: Road): boolean => r.level === 0 && !r.flyover;

/** Check each full parcel against the road or junction's footprint. */
export function blockedFootprint(c: City, meets: (r: Rect) => boolean): Quote | null {
  const lot = c.lots.find((l) => holdsGround(l, c.year) && meets(lotRect(l)));
  if (lot) return noAt({ why: `No room: ${lot.name} stands too close`, at: lot });
  const park = c.parks.find((p) => meets(lotRect(p)));
  return park ? noAt({ why: 'No room beside the car park', at: park }) : null;
}
