import type { CityView } from '../sim/types';
import { num } from './format';

/** The year's goal as the HUD shows it: what is measured, what it is now, where it should be. */
export interface GoalReading { readonly name: string; readonly now: string; readonly target: string; readonly met: boolean }

const NAMES: Readonly<Record<string, string>> = {
  wait: 'Crossroads wait', worstWait: 'Worst junction', double: 'Double-parked', fined: 'Fines', riders: 'Riders this season', lost: 'Trips lost',
  share: 'Trips by transit', approval: 'Approval', support: 'For the charge', trips: 'Trips', parking: 'Parking', cost: 'Cost', streets: 'Streets',
};
const SHORT_UNITS: Readonly<Record<string, string>> = { s: ' s', '%': '%' };
/** The first day's dawn says nothing yet: no tick before the rush. */
const DAWN_S = 30;
/** What the chip says before the day has measured anything. */
export const NOT_YET = 'not yet';

const unitOf = (u: string): string => SHORT_UNITS[u] ?? '';

/** 'wait@22,18' is the crossroads, 'found@market' names its place, 'bar:trips' is the bar. Pure. */
export function goalName(kind: string): string {
  const [head = '', arg = ''] = kind.split(/[@:]/);
  if (head === 'found') return `Found a space: ${arg}`;
  if (head === 'foundIn') return `Found a space: ${arg.toLowerCase()}`;
  return (head === 'bar' ? NAMES[arg] : NAMES[head]) ?? '';
}

export function goalReading(city: CityView): GoalReading {
  const g = city.goal;
  const kind = city.def.years[city.year - 1]?.goal.kind ?? '';
  const name = goalName(kind);
  if (!name) return { name: g.text, now: '', target: '', met: g.met };
  const unit = unitOf(g.unit);
  const early = city.season === 0 && city.phase === 'day' && city.clock < DAWN_S;
  return { name, now: early && g.value === 0 ? NOT_YET : `${num(g.value)}${unit}`, target: `, goal ${num(g.target)}${unit}`, met: g.met && !early };
}
