import type { Command, Pt, Quote } from '../../sim/types';
import { spend } from '../money';
import type { City } from '../state';
import { emit } from '../state';
import * as desk from './desk';
import * as junctions from './junctions';
import * as lines from './lines';
import * as parks from './parks';
import * as roads from './roads';
import { QUIET_RULES, quoteRules, RULE_HANDLERS } from '../rules';
import { no, type Handler } from './shared';

const HANDLERS: { readonly [K in Command['t']]: Handler<K> } = {
  road: roads.road, upgrade: roads.upgrade, oneWay: roads.oneWay, remove: roads.remove, kerb: roads.kerb, toll: roads.toll,
  busLane: roads.busLane, truckBan: roads.truckBan, square: roads.square,
  removePark: parks.removePark, carPark: parks.carPark,
  control: junctions.control, split: junctions.split, flyover: junctions.flyover,
  line: lines.line, lineVehicles: lines.lineVehicles, removeLine: lines.removeLine,
  prices: desk.prices, policies: desk.policies, tech: desk.tech, commission: desk.commission, float: desk.floatCo, vote: desk.vote, next: desk.next,
  ...RULE_HANDLERS,
};

/** Desk commands make no dust on the map. */
const QUIET = new Set<Command['t']>(['prices', 'policies', 'tech', 'commission', 'float', 'vote', 'next', 'split', ...QUIET_RULES]);

interface Any { quote(c: City, cmd: Command): Quote; run(c: City, cmd: Command, q: Quote): Pt }
const handlerOf = (cmd: Command): Any | undefined => HANDLERS[cmd.t] as unknown as Any | undefined;

export function quote(c: City, cmd: Command): Quote {
  const h = handlerOf(cmd);
  if (!h) return no('Unknown order');
  if (c.phase === 'replaced' || c.phase === 'cityDone') return no('The desk is empty');
  return quoteRules(c, cmd, h.quote(c, cmd));
}

export function apply(c: City, cmd: Command): Quote {
  const q = quote(c, cmd);
  if (!q.ok) return q;
  spend(c, 'building', q.cost - q.land);
  spend(c, 'land', q.land);
  const at = handlerOf(cmd)!.run(c, cmd, q);
  if (!QUIET.has(cmd.t)) emit(c, { t: 'built', what: cmd.t, at });
  return q;
}
