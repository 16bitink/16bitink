import { MONTHS, MONTHS_PER_SEASON } from '../sim/constants';
import { paydaysDone } from './clock';
import { earn, spend } from './money';
import { measure, progressOf } from './goals';
import { RULE_COMMISSIONS } from './rules/texts';
import type { ActiveCommission, City } from './state';
import { yearDef } from './state';

/** The Council's jobs: a problem, a target, a deadline. 40% up front, given back on a miss. */
interface CommissionDef { readonly id: string; readonly title: string; readonly text: string; readonly goal: string; readonly kind: string; readonly target: number; readonly reward: number; readonly months: number }

const DEFS: readonly CommissionDef[] = [
  ...RULE_COMMISSIONS,
  { id: 'quiet-fines', title: 'Kind Meerkats', text: 'Fewer double-parked cars, please, and no new songs about us.', goal: 'At most 4 double-parked cars a day', kind: 'double', target: 4, reward: 150, months: 15 },
  { id: 'office-run', title: 'The Nine O\'Clock Run', text: 'Office workers arrive at ten and leave at four. Fix the first part.', goal: '65 of 100 trips on time', kind: 'onTime', target: 65, reward: 200, months: 15 },
  { id: 'bus-habit', title: 'A Bus Habit', text: 'The Council wants to be seen next to a full bus.', goal: '600 riders in a season', kind: 'riders', target: 600, reward: 220, months: 18 },
  { id: 'port-run', title: 'Boxes on Time', text: 'The port is full of rugs that should be on floors.', goal: 'No busy junction over 18 s', kind: 'worstWait', target: 18, reward: 260, months: 15 },
  { id: 'two-bridges', title: 'Two Shores, One City', text: 'A councillor moved to the far shore and cannot get back to resign.', goal: '70 of 100 trips on time', kind: 'onTime', target: 70, reward: 320, months: 15 },
  { id: 'mall-calm', title: 'Calm at the Mall', text: 'The whale in the mall is stressed by the car park.', goal: 'Parking at 72 or more', kind: 'bar:parking', target: 72, reward: 320, months: 12 },
  { id: 'tram-bell', title: 'Ring the Bell', text: 'The Council ordered a very large bell. It needs passengers.', goal: '500 riders in a season', kind: 'riders', target: 500, reward: 240, months: 18 },
  { id: 'tram-habit', title: 'A Tram Habit', text: 'Our oldest otter wants to see cars leave the lanes before he does.', goal: '16 of 100 trips by tram or bus', kind: 'share', target: 16, reward: 300, months: 18 },
  { id: 'green-share', title: 'Green Share', text: 'Our neighbour city has more riders. We do not like our neighbour city.', goal: '24 of 100 trips by bus or metro', kind: 'share', target: 24, reward: 420, months: 18 },
];
const UPFRONT = 0.4;

export const isCommission = (id: string): boolean => DEFS.some((d) => d.id === id);

/** This year's offers join whatever is still running. */
export function offerCommissions(c: City): void {
  const fresh = (yearDef(c).commissions ?? []).flatMap((id) => DEFS.filter((d) => d.id === id)).map((d): ActiveCommission => ({
    id: d.id, title: d.title, text: d.text, goal: d.goal, kind: d.kind, target: d.target,
    upfront: Math.round(d.reward * UPFRONT), reward: Math.round(d.reward * (1 - UPFRONT)), progress: 0,
    monthsLeft: d.months, state: 'offered', ...deadline(c, d.months),
  }));
  c.commissions = [...c.commissions.filter((x) => x.state === 'taken'), ...fresh];
}

/** The month whose review is the last chance: counted from the months already paid this year. */
function deadline(c: City, months: number): { endsYear: number; endsMonth: number } {
  const end = (c.year - 1) * MONTHS.length + paydaysDone(c.phase, c.season, c.month) + months - 1;
  return { endsYear: Math.floor(end / MONTHS.length) + 1, endsMonth: end % MONTHS.length };
}

export function answerCommission(c: City, id: string, take: boolean): void {
  c.commissions = c.commissions.flatMap((x) => {
    if (x.id !== id || x.state !== 'offered') return [x];
    if (!take) return [];
    earn(c, 'grant', x.upfront);
    return [{ ...x, state: 'taken' as const, ...deadline(c, x.monthsLeft) }];
  });
}

/** Season's end: pay what is done, take back what is missed. A target is a day's, so it is judged at the review. */
export function reviewCommissions(c: City): void {
  c.commissions = c.commissions.map((x): ActiveCommission => {
    if (x.state !== 'taken') return x;
    const monthsLeft = x.monthsLeft - MONTHS_PER_SEASON;
    if (measure(c, x.kind, x.target).met) { earn(c, 'grant', x.reward); return { ...x, monthsLeft, progress: 1, state: 'done' }; }
    if (monthsLeft <= 0) { spend(c, 'interest', x.upfront); return { ...x, monthsLeft, state: 'failed' }; }
    return { ...x, monthsLeft, progress: progressOf(c, x.kind, x.target) };
  });
}
