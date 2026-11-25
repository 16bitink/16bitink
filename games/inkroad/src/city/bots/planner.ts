import type { Bar, CityView } from '../../sim/types';
import { worstBar } from '../approval';
import { specialYearEnd } from '../rules/botMoves';
import type { Family, Move } from './moves';
import { costOf, follow, stepsOf } from './playbook';
import { tryIt, type Bot } from './tools';

/**
 * A good player by rule: it looks at the bar that hurts, takes the answers that help that bar in the
 * order of what they give for their price, and saves when nothing hurts. It tries nothing on copies,
 * so a whole city takes seconds.
 */
const TECH_ORDER = ['smart', 'bigbus', 'stagger', 'schoolbus', 'precast', 'app', 'tow', 'tap', 'electric', 'quiet', 'doorstep', 'forecast', 'drones', 'scancars'];
const CHANGES = 3;
const CALM = 74;
const RESERVE = 25;
/** A family bot has the whole night for its one sort of answer. */
const PER_NIGHT = 4;

function desk(city: CityView): void {
  const set = (policies: Partial<CityView['policies']>): void => { tryIt(city, { t: 'policies', policies }); };
  if (city.openPolicies.includes('permits') && !city.policies.permits) set({ permits: true });
  if (city.openPolicies.includes('inspectors') && city.policies.inspectors < 2) set({ inspectors: 2 });
  if (city.openPolicies.includes('nightWorks') && !city.policies.nightWorks) set({ nightWorks: true });
  for (const x of city.commissions) if (x.state === 'offered') city.apply({ t: 'commission', id: x.id, take: true });
  if (city.vote && city.vote.kept === null && !city.vote.running && city.vote.seasons >= 2 && city.vote.support >= 50) tryIt(city, { t: 'vote', keep: true });
}

export function pickTech(city: CityView): void {
  const t = TECH_ORDER.find((id) => city.techChoices.some((x) => x.id === id));
  if (t) city.apply({ t: 'tech', id: t });
}

const ORDER: Readonly<Record<Bar, readonly Family[]>> = {
  trips: ['policy', 'transit', 'build', 'price'],
  parking: ['build', 'price', 'policy', 'transit'],
  cost: ['transit', 'price', 'policy', 'build'],
  streets: ['policy', 'transit', 'build', 'price'],
};

/** The families in turn, so that a night is not all lines or all lots. */
function inTurn(lists: readonly (readonly Move[])[]): readonly Move[] {
  const out: Move[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) { const m = l[i]; if (m) out.push(m); }
  return out;
}

function think(city: CityView): void {
  const worst = worstBar(city.bars);
  if (city.bars[worst] >= CALM) return;
  const steps = inTurn(ORDER[worst].map((f) => stepsOf(city, f)));
  follow(city, steps.filter((m) => costOf(city, m) <= city.money), CHANGES, RESERVE);
}

export const planner: Bot = {
  name: 'planner',
  act(city, moment) {
    if (moment === 'yearEnd') { pickTech(city); specialYearEnd(city); return; }
    if (moment === 'review') { desk(city); think(city); return; }
    if (moment === 'evening' && city.year === 1 && city.season === 0) think(city);
    if (moment === 'yearStart' && city.year > 1) think(city);
  },
};

/** A bot with one sort of answer and no other: for measuring what that answer can do. */
export const only = (family: Family, log: (what: string) => void = () => undefined): Bot => ({
  name: family,
  act(city, moment) {
    if (moment !== 'review' && moment !== 'yearStart') return;
    for (const x of city.commissions) if (x.state === 'offered') city.apply({ t: 'commission', id: x.id, take: true });
    // Works that start in the last season only show next year.
    const steps = stepsOf(city, family).filter((m) => (m.slow ?? 0) === 0 || city.season < 2 || moment === 'yearStart');
    for (const m of follow(city, steps, PER_NIGHT, 0)) log(m);
  },
});
