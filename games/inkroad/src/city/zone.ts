import { setRoad } from '../sim/network';
import type { Cell, Road } from '../sim/types';
import { bump } from './approval';
import { clamp } from './geometry';
import { commitNetwork } from './network';
import type { City, DayReport, Vote } from './state';
import { emit } from './state';

/** The zone charge is paid at the gates of the zone, both ways, like a toll on each road that crosses its edge. */
const START_SUPPORT = 36;
export const NO_VOTE: Vote = { running: false, kept: null, support: START_SUPPORT, seasons: 0, base: null };
const FEEL = { ease: 0.6, at: 44, trips: 1.2, streets: 0.5, dear: 4, fair: 2, used: 4, usedMax: 12, transit: 30 } as const;
const JOY = 3;

const inside = (c: City, x: Cell): boolean => (c.def.rules.zoneCells ?? []).some(([gx, gy, w, h]) => x.gx >= gx && x.gx <= gx + w && x.gy >= gy && x.gy <= gy + h);

const crosses = (c: City, r: Road): boolean => {
  const first = r.cells[0];
  const last = r.cells[r.cells.length - 1];
  return !!first && !!last && inside(c, first) !== inside(c, last);
};

/** Put the gates up, or take them down. */
export function syncZone(c: City): void {
  const on = c.prices.zone > 0;
  if (!c.def.rules.zoneCells) return;
  let net = c.net;
  for (const r of c.net.roads) if (crosses(c, r) && r.toll !== on) net = setRoad(net, r.id, { toll: on });
  if (on && c.vote.base === null) c.vote = { ...c.vote, base: { trips: c.bars.trips, streets: c.bars.streets } };
  commitNetwork(c, net);
}

export function dropZone(c: City): void {
  c.prices = { ...c.prices, zone: 0 };
  c.vote = { ...c.vote, running: false, kept: false };
  syncZone(c);
}

/** A season with the charge: people compare it with before, and get used to it. */
export function feelZone(c: City, r: DayReport): void {
  const v = c.vote;
  if (c.prices.zone <= 0 || v.kept !== null || !v.base) return;
  const seasons = v.seasons + 1;
  const target = FEEL.at + (r.trips - v.base.trips) * FEEL.trips + (r.streets - v.base.streets) * FEEL.streets
    - Math.max(0, c.prices.zone - FEEL.fair) * FEEL.dear + Math.min(FEEL.usedMax, seasons * FEEL.used) + r.transit * FEEL.transit;
  c.vote = { ...v, seasons, support: clamp(v.support + (target - v.support) * FEEL.ease, 0, 100) };
  if (v.running) count(c);
}

function count(c: City): void {
  const kept = c.vote.support >= 50;
  if (kept) bump(c, JOY); else dropZone(c);
  c.vote = { ...c.vote, running: false, kept };
  emit(c, { t: 'toast', who: 'sulo', text: kept ? 'The people voted to keep the charge. I am as surprised as you.' : 'The people voted the charge away. Back to the drawing desk.' });
}
