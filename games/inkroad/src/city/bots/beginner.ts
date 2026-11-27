import type { CityView, Command } from '../../sim/types';
import { METROS, ROADS } from './atlas';
import { kerbNear, liftWorst, mendBusy, parkNear, sickest, tryIt, lineThrough, worstMovement, type Bot } from './tools';

/** Does nothing but close cards. */
export const nobody: Bot = { name: 'nobody', act: () => undefined };

const RED_WAIT = 9;
const CRAMMED = 0.9;
const FIRST_BRIDGE = 7;
/** A beginner mends what Dewy names (the worst busy worn road), one a night, keeping a little back. */
const BEGINNER_RESERVE = 30;
const BEGINNER_MENDS = 1;
/** Streets points a worn road costs when Dewy names it (src/guide/advisor/problems.ts). */
const DEWY_NAMES = 0.3;

/** The cheapest thing that might help the reddest junction. */
function fixJunction(city: CityView, node: number): boolean {
  const j = city.junctions.find((x) => x.id === node);
  if (!j) return false;
  if (j.control === 'yield' && tryIt(city, { t: 'control', node, control: 'roundabout' })) return true;
  if (j.control === 'yield' && tryIt(city, { t: 'control', node, control: 'signal' })) return true;
  if (j.control === 'signal' && tryIt(city, { t: 'control', node, control: 'smart' })) return true;
  if (liftWorst(city, node, city.money)) return true;
  const m = worstMovement(city, node);
  if (m && j.control !== 'yield') {
    for (const road of [m.fromRoad, m.toRoad]) if (tryIt(city, { t: 'upgrade', road, type: 'avenue' })) return true;
  }
  return j.control === 'roundabout' && tryIt(city, { t: 'control', node, control: 'signal' });
}

/** Where a beginner would draw a line when the coach asks for one. */
const LINES: Readonly<Record<string, readonly (readonly string[])[]>> = {
  saffron: [['Blueprint Offices', 'Acacia Gardens', 'Pepper Market'], ['Tide Row', 'Far Shore Offices', 'Creek Villas', 'Pepper Market'], ['Almond Flats', 'Rosewater Flats', 'Saffron School']],
  isles: [['Orchid Row', 'Lantern Market', 'Folded Offices', 'Abacus Offices'], ['Biscuit Lane', 'Teapot Street', 'Isle School', 'Silk Market', 'Cloud Row']],
  harbour: [['Weavers Green', 'Tin Lane', 'Herring Market', 'Anchor Lane', 'Barrel Street'], ['Loom Street', 'Ledger Offices', 'Upper Gables'], ['North Hospital', 'Tar Street', 'Compass House']],
};

function followCoach(city: CityView, attempt: number): void {
  if (city.year === 3 && city.policies.inspectors === 0) tryIt(city, { t: 'policies', policies: { inspectors: 1 } });
  if (city.year === 2 && !city.policies.permits) tryIt(city, { t: 'policies', policies: { permits: true } });
  if (city.season > 0 || city.year > 1) for (const r of (ROADS[city.def.id] ?? []).filter((x) => x.from === city.year && x.from < FIRST_BRIDGE).slice(0, 1)) tryIt(city, { t: 'road', cells: r.cells, type: 'street' });
  const want = city.year < 6 ? 1 : 2 + attempt;
  const line = LINES[city.def.id]?.[city.lines.length];
  const mode = city.tools.includes('tram') ? 'tram' : 'bus';
  if (line && city.lines.length < want && city.tools.includes(mode)) lineThrough(city, mode, line, 20);
  const metro = METROS[city.def.id]?.[0];
  if (metro && city.newTools.includes('metro') && !city.lines.some((l) => l.mode === 'metro')) lineThrough(city, 'metro', metro, 0);
  for (const l of city.lines) if (l.crowding > CRAMMED && l.vehicles < 4) tryIt(city, { t: 'lineVehicles', line: l.id, vehicles: l.vehicles + 1 });
  if (city.newTools.includes('toll')) for (const r of (ROADS[city.def.id] ?? []).filter((x) => x.from === city.year).slice(0, 1)) tryIt(city, { t: 'road', cells: r.cells, type: 'street' });
}

/** Reacts to the reddest junction with the cheapest fix, and to a parking complaint with the cheapest space. */
export const beginner: Bot = {
  name: 'beginner',
  act(city, moment, attempt) {
    if (moment === 'yearEnd') { const t = city.techChoices[0]; if (t) city.apply({ t: 'tech', id: t.id }); return; }
    if (moment === 'yearStart' || moment === 'dawn') return;
    followCoach(city, attempt);
    for (const s of sickest(city, RED_WAIT).slice(0, 1 + attempt)) fixJunction(city, s.node.id);
    // Dewy names the worst busy worn road: a beginner mends it when the purse allows.
    if (moment === 'review') mendBusy(city, BEGINNER_MENDS, BEGINNER_RESERVE, DEWY_NAMES);
    const moan = moment === 'review' ? city.complaints.find((x) => x.bar === 'parking') : undefined;
    if (moan && !kerbNear(city, moan.at)) parkNear(city, moan.at, ['lot', 'multi'], city.money);
  },
};

/** Every price as high as it goes, nothing built. */
export const greedy: Bot = {
  name: 'greedy',
  act(city, moment) {
    if (moment !== 'review') return;
    for (const k of ['park', 'parkPeak', 'fine', 'toll', 'tollPeak', 'fare'] as const) {
      const l = city.priceLimits[k];
      const cmd: Command = { t: 'prices', prices: { [k]: l.max } };
      if (l.open) tryIt(city, cmd);
    }
    if (city.openPolicies.includes('inspectors')) tryIt(city, { t: 'policies', policies: { inspectors: 5 } });
    for (const r of city.roads) if (!r.kerb) tryIt(city, { t: 'kerb', road: r.id, on: true });
    for (const r of city.roads) if (!r.toll && city.tools.includes('toll') && r.bridge) tryIt(city, { t: 'toll', road: r.id, on: true });
  },
};
