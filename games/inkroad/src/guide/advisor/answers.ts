import type { CityView, Control, RoadType } from '../../sim/types';
import { effectOf, inflow } from '../../ui/panels/controls';
import { findDetour } from '../detour';
import { mid, roadMid, roadOf, worstMove } from '../places';
import { kerbRoad, lineIdea, parkSite } from '../sites';
import type { Answer, Problem } from './types';

/** What may be done about a problem, with prices: only what is open and can be paid. Pure. */
const MAX = 3;
const CONTROL_WORDS: Readonly<Record<Control, string>> = { yield: 'Take the signals away', roundabout: 'Build a roundabout', signal: 'Build signals', smart: 'Build smart signals' };
const NEXT_TYPE: Readonly<Partial<Record<RoadType, RoadType>>> = { street: 'avenue', avenue: 'boulevard' };

function forJunction(city: CityView, node: number): Answer[] {
  const j = city.junctions.find((x) => x.id === node);
  if (!j) return [];
  const f = inflow(city.movements(node));
  const out: Answer[] = [];
  for (const control of city.controls) {
    const eff = control === j.control ? 'same' : effectOf(j.control, control, f);
    const q = city.quote({ t: 'control', node, control });
    if (q.ok && (eff === 'much' || eff === 'better')) out.push({ label: CONTROL_WORDS[control], price: q.cost, act: { t: 'control', node, control } });
  }
  return [...out, ...lift(city, node), ...roundAbout(city, node), ...widen(city, node), ...byBus(city)];
}

function lift(city: CityView, node: number): Answer[] {
  const m = city.tools.includes('flyover') ? worstMove(city, node) : null;
  if (!m) return [];
  const q = city.quote({ t: 'flyover', node, fromRoad: m.fromRoad, toRoad: m.toRoad, level: 1 });
  return q.ok ? [{ label: 'Lift the worst turn over it', price: q.cost, act: { t: 'flyover', node, move: { fromRoad: m.fromRoad, toRoad: m.toRoad } } }] : [];
}

function roundAbout(city: CityView, node: number): Answer[] {
  const plan = findDetour(city, node, city.money);
  return plan ? [{ label: 'Draw a street that skips it', price: plan.cost, act: { t: 'street', plan } }] : [];
}

function widen(city: CityView, node: number): Answer[] {
  const m = worstMove(city, node);
  const r = m ? roadOf(city, m.fromRoad) : undefined;
  const type = r ? NEXT_TYPE[r.type] : undefined;
  if (!r || !type || !city.tools.includes(type)) return [];
  const q = city.quote({ t: 'upgrade', road: r.id, type });
  return q.ok ? [{ label: `Widen its busy road to ${type === 'avenue' ? 'an avenue' : 'a boulevard'}`, price: q.cost, act: { t: 'upgrade', road: r.id, type, at: roadMid(r) } }] : [];
}

function byBus(city: CityView): Answer[] {
  const mode = city.tools.includes('tram') ? 'tram' : city.tools.includes('bus') ? 'bus' : null;
  const idea = mode ? lineIdea(city, mode) : null;
  return mode && idea ? [{ label: `Start a ${mode} line, so fewer drive`, price: idea.quote.cost, act: { t: 'line', mode, stops: idea.stops } }] : [];
}

const night = (label: string, note: string, sel: string, tab: 'prices' | 'council' = 'prices'): Answer => ({ label, price: null, act: { t: 'night', note, sel, tab } });
const step = (city: CityView, key: 'park' | 'fine' | 'toll' | 'tollPeak' | 'fare' | 'zone', dir: 1 | -1): boolean => {
  const l = city.priceLimits[key];
  const v = city.prices[key] + dir * l.step;
  return l.open && v >= l.min && v <= l.max;
};
const priceSel = (key: string, dir: 1 | -1): string => `[data-act=price][data-v="${key}:${dir}"]`;

function forParking(city: CityView, lotId: number): Answer[] {
  const l = city.lots.find((x) => x.id === lotId);
  if (!l) return [];
  const out: Answer[] = [];
  for (const kind of ['lot', 'multi'] as const) {
    const s = parkSite(city, mid(l), kind);
    if (s) out.push({ label: kind === 'lot' ? 'Build a car park' : 'Build a multi-storey', price: s.quote.cost, act: { t: 'park', kind, at: s.at } });
  }
  const k = kerbRoad(city, mid(l));
  if (k) out.push({ label: 'Add kerb bays', price: k.quote.cost, act: { t: 'roadTool', tool: 'kerb', road: k.road.id, at: roadMid(k.road) } });
  if (step(city, 'park', 1) && city.carParks.length + city.roads.filter((r) => r.kerb).length > 0) out.push(night('Raise the price tonight', 'You wanted to raise the parking price.', priceSel('park', 1)));
  return out;
}

function forDouble(city: CityView): Answer[] {
  const hire = city.openPolicies.includes('inspectors') ? [night('Hire an inspector tonight', 'You wanted one more inspector.', '[data-act=pol][data-v="inspectors:1"]')] : [];
  return [...hire, ...forParking(city, city.lots.find((l) => l.kind === 'market' && l.level > 0)?.id ?? -1)];
}

function forCost(city: CityView): Answer[] {
  const i = city.lastLedger.income;
  const list: readonly (readonly [number, 'fine' | 'tollPeak' | 'park' | 'fare' | 'zone', string])[] = [[i.fines, 'fine', 'fine'], [i.tolls, 'tollPeak', 'peak toll'], [i.parking, 'park', 'parking price'], [i.fares, 'fare', 'fare'], [i.zone, 'zone', 'zone charge']];
  const out = [...list].sort((a, b) => b[0] - a[0]).filter(([n, key]) => n > 0 && step(city, key, -1)).slice(0, 2).map(([, key, name]) => night(`Lower the ${name} tonight`, `You wanted a lower ${name}.`, priceSel(key, -1)));
  if (city.openPolicies.includes('permits') && !city.policies.permits) out.push(night('Let residents park free at home', 'You wanted free parking at home.', '[data-act=pol][data-v="permits:t"]'));
  return out;
}

function forStreets(city: CityView): Answer[] {
  const out: Answer[] = [];
  if (city.openPolicies.includes('nightWorks') && !city.policies.nightWorks) out.push(night('Work by night', 'You wanted road works by night.', '[data-act=pol][data-v="nightWorks:t"]'));
  if (city.openPolicies.includes('truckHours') && !city.policies.truckHours) out.push(night('Lorries only at night hours', 'You wanted lorries at night.', '[data-act=pol][data-v="truckHours:t"]'));
  return out;
}

function forMoney(city: CityView): Answer[] {
  const out: Answer[] = [];
  if (step(city, 'park', 1) && city.carParks.length > 0) out.push(night('Raise the parking price tonight', 'You wanted to raise the parking price.', priceSel('park', 1)));
  if (step(city, 'fare', 1) && city.lines.length > 0) out.push(night('Raise the fare tonight', 'You wanted a higher fare.', priceSel('fare', 1)));
  if (city.commissions.some((c) => c.state === 'offered')) out.push(night('Take a Council job tonight', 'A Council job pays part of it now.', '[data-act=commission][data-v$=":1"]', 'council'));
  return out;
}

export function answersFor(city: CityView, p: Problem): readonly Answer[] {
  const list = (): Answer[] => {
    switch (p.kind) {
      case 'junction': return forJunction(city, p.ref);
      case 'parking': return forParking(city, p.ref);
      case 'double': return forDouble(city);
      case 'empty': return step(city, 'park', -1) ? [night('Lower the price tonight', 'You wanted a lower parking price.', priceSel('park', -1))] : [];
      case 'crowded': return city.quote({ t: 'lineVehicles', line: p.ref, vehicles: (city.lines.find((l) => l.id === p.ref)?.vehicles ?? 0) + 1 }).ok ? [{ label: 'Add one more', price: city.quote({ t: 'lineVehicles', line: p.ref, vehicles: (city.lines.find((l) => l.id === p.ref)?.vehicles ?? 0) + 1 }).cost, act: { t: 'vehicles', line: p.ref } }] : [];
      case 'cost': return forCost(city);
      case 'streets': return forStreets(city);
      case 'money': return forMoney(city);
      case 'worn': {
        const q = city.quote({ t: 'repair', road: p.ref });
        return q.ok && p.at ? [{ label: 'Repair it', price: q.cost, act: { t: 'repair', road: p.ref, at: p.at } }] : [];
      }
      case 'beach': {
        const s = p.at ? parkSite(city, p.at, 'lot') : null;
        return s ? [{ label: 'Build a car park by the beach', price: s.quote.cost, act: { t: 'park', kind: 'lot', at: s.at } }] : [];
      }
      default: return [];
    }
  };
  return list().slice(0, MAX);
}
