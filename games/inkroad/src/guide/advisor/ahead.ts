import type { CityView, ToolId } from '../../sim/types';
import type { Ahead } from './types';

/** Nothing is wrong: what is coming, and what it will take. Pure. */
const COST: Readonly<Partial<Record<ToolId, readonly [name: string, coins: number]>>> = {
  parking: ['a car park', 70], kerb: ['kerb bays', 20], avenue: ['a wider road', 90], bus: ['a bus line', 60], buslane: ['a bus lane', 40], flyover: ['a flyover', 220], toll: ['a toll gate', 40], boulevard: ['a boulevard', 160], underpass: ['an underpass', 260],
  metro: ['your share of a metro', 520], tram: ['your share of a tram', 300], boat: ['a ferry line', 120], square: ['a square', 60],
};
const CONTROL_COST: Readonly<Record<string, readonly [string, number]>> = { signal: ['signals', 60], smart: ['smart signals', 110] };

/** 'Year 2: the market doubles' without its year. */
export const planText = (line: string): string => line.replace(/^Years? \d+:\s*/i, '').replace(/^./, (c) => c.toUpperCase());

/** What next year opens, and what its dearest new thing costs. */
export function savingFor(city: Pick<CityView, 'def' | 'year'>): { readonly name: string; readonly coins: number } | null {
  const next = city.def.years[city.year];
  if (!next) return null;
  const list = [...next.tools.flatMap((t) => (COST[t] ? [COST[t]!] : [])), ...(next.controls ?? []).flatMap((c) => (CONTROL_COST[c] ? [CONTROL_COST[c]!] : [])), ...((next.parks ?? []).includes('multi') ? [['a multi-storey', 170] as const] : [])];
  const top = [...list].sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], coins: top[1] } : null;
}

export function lookAhead(city: CityView): Ahead {
  const lines: string[] = [];
  const g = city.goal;
  lines.push(g.met ? `Goal met so far: ${g.text}.` : `Goal: ${g.text}. Now ${Math.round(g.value)}.`);
  const plan = city.masterPlan[0];
  if (plan) lines.push(`Next: ${planText(plan)}.`);
  const save = savingFor(city);
  if (save) lines.push(city.money >= save.coins ? `You can already pay for ${save.name}: about ${save.coins} coins.` : `Save up for ${save.name}: about ${save.coins} coins. You have ${Math.round(city.money)}.`);
  return { title: 'All calm. Enjoy it while it lasts.', lines };
}
