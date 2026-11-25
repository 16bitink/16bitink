import type { City } from '../state';
import { meanCondition } from './ageing';
import { ruleState } from './state';

/** Targets only cities 3 to 5 use. Same shape as METRICS in goals.ts. */
const PC = 100;
interface RuleMetric { readonly unit: string; readonly low: boolean; readonly read: (c: City) => number }
export const RULE_METRICS: Readonly<Record<string, RuleMetric>> = {
  cars: { unit: '%', low: true, read: (c) => PC * c.ownership },
  licencePrice: { unit: 'coins', low: true, read: (c) => ruleState(c).licences?.price ?? 0 },
  speedKept: { unit: '%', low: false, read: (c) => PC * ruleState(c).toll.kept },
  minis: { unit: 'minibuses', low: true, read: (c) => c.lines.filter((l) => l.mini === 'private').length },
  condition: { unit: '%', low: false, read: (c) => PC * meanCondition(c) },
  freeway: { unit: 'pieces', low: false, read: (c) => ruleState(c).freeway.done },
};
