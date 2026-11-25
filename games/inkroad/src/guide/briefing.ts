import type { CityView, Control, CarParkKind, Policies, YearDef } from '../sim/types';
import { TOOL_NAMES } from '../ui/toolbar';
import { planText } from './advisor/ahead';

/** The year card in three lines: what happens, what is wanted, what is new. Pure. */
export interface Briefing { readonly now: string; readonly goal: string; readonly can: string }

const CONTROLS: Readonly<Record<Control, string>> = { yield: '', roundabout: 'build roundabouts', signal: 'build signals', smart: 'build smart signals' };
const PARKS: Readonly<Record<CarParkKind, string>> = { lot: 'build car parks', multi: 'build multi-storeys', under: 'build underground parking', ride: 'build park and ride' };
const POLICIES: Readonly<Record<keyof Policies, string>> = { inspectors: 'hire inspectors', permits: 'give residents permits', truckHours: 'set lorry hours', nightWorks: 'work by night', taxis: 'open taxi ranks' };
const TOOLS: Readonly<Record<string, string>> = {
  street: 'draw streets', avenue: 'draw avenues', boulevard: 'draw boulevards', highway: 'draw highways', junction: '', remove: '', parking: '', kerb: 'add kerb bays', bus: 'run buses', buslane: 'paint bus lanes', flyover: 'build flyovers', underpass: 'dig underpasses',
  toll: 'set toll gates', metro: 'dig a metro', tram: 'lay tram lines', boat: 'run ferries', oneway: 'make one-way streets', square: 'make squares', zone: 'charge for the centre',
};
const MAX_NEW = 3;

/** Saffron Bay says it in its own words. */
const NOW: Readonly<Record<string, string>> = {
  '1:1': 'Four streets meet at one crossroads, and everybody is late.', '1:2': 'The market doubles. The parking does not.', '1:3': 'Drivers stop wherever they like.', '1:4': 'The offices open. Everybody starts at nine.',
  '1:5': 'Flats and a hospital rise in the south east.', '1:6': 'The port and the stadium open.', '1:7': 'The far shore opens, over one bridge.', '1:8': 'The Great Mall opens.', '1:9': 'The last towers rise. The roads are full.', '1:10': 'The Grand Fair: twice the visitors.',
};

function newWords(y: YearDef): readonly string[] {
  const words = [
    ...y.tools.map((t) => TOOLS[t] ?? TOOL_NAMES[t].toLowerCase()), ...(y.controls ?? []).map((c) => CONTROLS[c]), ...(y.parks ?? []).map((p) => PARKS[p]), ...(y.policies ?? []).map((p) => POLICIES[p]),
  ].filter((w) => w !== '');
  return [...new Set(words)].slice(0, MAX_NEW);
}

const list = (words: readonly string[]): string => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

export function briefing(city: Pick<CityView, 'def' | 'year' | 'goal'>): Briefing {
  const y = city.def.years[city.year - 1];
  const before = city.def.years[city.year - 2]?.plan?.[0];
  const now = NOW[`${city.def.number}:${city.year}`] ?? (before ? `${planText(before)}.` : y?.name ?? city.def.name);
  const words = y ? newWords(y) : [];
  return { now, goal: `${city.goal.text}.`, can: words.length > 0 ? `${list(words)}.` : 'use everything you have learned.' };
}
