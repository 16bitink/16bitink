import type { CityView, Command } from '../../sim/types';
import type { Family, Move } from '../bots/moves';
import { tryIt } from '../bots/tools';

/** Ideas for the lab's planner that only cities 3 to 5 have. */
const one = (name: string, kind: string, family: Family, cmd: Command, slow = 0): Move => ({ name, kind, family, cmds: [cmd], slow });

export function specialMoves(city: CityView): readonly Move[] {
  return city.special ? [...tollMoves(city), ...miniMoves(city), ...roadMoves(city)] : [];
}

const flow = (city: CityView, id: number): number => city.roadStats(id).flow;

function tollMoves(city: CityView): readonly Move[] {
  const t = city.special?.speedTolls;
  if (!t) return [];
  const bridges = city.roads.filter((r) => r.bridge && !r.fixed && !r.speedToll).sort((a, b) => flow(city, b.id) - flow(city, a.id));
  const gates = bridges.slice(0, 2).map((r) => one(`speed toll ${r.id}`, 'speedToll', 'price', { t: 'speedToll', road: r.id, on: true }));
  const limits = city.phase === 'review' && t.gates.length > 0
    ? [one('toll limit up', 'tollLimit', 'price', { t: 'tollLimit', max: t.max + 1 }), one('toll limit down', 'tollLimit', 'price', { t: 'tollLimit', max: t.max - 1 })] : [];
  return [...gates, ...limits];
}

const miniMoves = (city: CityView): readonly Move[] =>
  (city.special?.minibuses?.lines ?? []).filter((m) => m.state === 'private').slice(0, 2).flatMap((m) => [
    one(`license ${m.line}`, 'license', 'policy', { t: 'minibus', line: m.line, deal: 'license' }),
    one(`buy out ${m.line}`, 'buyOut', 'transit', { t: 'minibus', line: m.line, deal: 'buyOut' }),
  ]);

const MENDS = 3;
function roadMoves(city: CityView): readonly Move[] {
  const worst = (city.special?.ageing?.worst ?? []).slice(0, MENDS).flatMap((w) => [
    one(`repair ${w.road}`, 'repair', 'build', { t: 'repair', road: w.road }, 1),
    one(`replace ${w.road}`, 'replace', 'build', { t: 'replace', road: w.road }, 2),
  ]);
  const cut = city.special?.freeway?.open
    ? city.roads.filter((r) => r.freeway).slice(0, 2).map((r) => one(`boulevard ${r.id}`, 'boulevard', 'build', { t: 'boulevard', road: r.id }, 2)) : [];
  return [...worst, ...cut];
}

/** At the year's end: as many licences as keep the price just under dear. */
export function specialYearEnd(city: CityView): void {
  const start = city.special?.licences;
  if (!start?.open) return;
  for (let q = start.step; q <= start.max; q += start.step) {
    if (!tryIt(city, { t: 'licences', quota: q })) return;
    if (!city.special?.licences?.forecast.dear) return;
  }
}
