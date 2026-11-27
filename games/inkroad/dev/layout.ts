// The layout of a city as text: terrain, Council roads (the digit is the year they open, 0 for 10), lots by kind, and the layout problems.
import { expandCells } from '../src/sim/netPlan';
import type { CityDef } from '../src/sim/types';
import { FREE_CITIES } from '../src/city/cities';
import { PAID_CITIES } from '../content/paid';
import { layoutProblems } from '../src/city/validateLayout';

const KIND: Readonly<Record<string, string>> = {
  home: 'h', shops: 's', office: 'o', market: 'm', school: 'S', park: 'p', nursery: 'n', fuel: 'f', food: 'r', fun: 'F',
  hospital: 'H', mall: 'M', stadium: 'T', port: 'P', fair: 'A', landmark: 'L', square: 'q',
};
const GROUND: Readonly<Record<string, string>> = { '.': ' ', b: ',' };
const YEARS = 10;

function picture(d: CityDef, upTo: number): string {
  const g = d.map.map((r) => [...r].map((ch) => GROUND[ch] ?? ch));
  for (const r of d.roads) {
    if ((r.opensYear ?? 1) > upTo) continue;
    for (const c of expandCells(r.cells.map(([gx, gy]) => ({ gx, gy })))) if (g[c.gy]?.[c.gx] !== undefined) g[c.gy]![c.gx] = String((r.opensYear ?? 1) % YEARS);
  }
  for (const l of d.lots) {
    if (l.opensYear > upTo) continue;
    for (let y = l.gy; y < l.gy + l.h; y++) for (let x = l.gx; x < l.gx + l.w; x++) if (g[y]) g[y]![x] = l.garden && y >= l.gy + l.h / 2 ? '_' : KIND[l.kind] ?? '?';
  }
  const ruler = Array.from({ length: d.map[0]!.length }, (_, x) => x % YEARS).join('');
  return `${g.map((r, y) => `${String(y).padStart(2)} ${r.join('')}`).join('\n')}\n   ${ruler}`;
}

export function main(id: string, upTo: number): string {
  const d = [...FREE_CITIES, ...PAID_CITIES].find((c) => c.id === id);
  if (!d) return `no city ${id}`;
  const problems = layoutProblems(d);
  return `${picture(d, upTo)}\n${problems.length} layout problems\n${problems.join('\n')}`;
}
