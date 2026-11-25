import type { CarPark, Lot, TransitLine } from '../../sim/types';
import { esc } from '../dom';
import { num, pct, shownYear } from '../format';
import { pic } from '../pics';
import { kv, meter, type PanelCtx } from './shared';
import { minibusPanel } from './special';

const PARK_NAMES = { lot: 'Surface car park', multi: 'Multi-storey', under: 'Underground car park', ride: 'Park and ride' } as const;
const LOT_NAMES: Readonly<Record<Lot['kind'], string>> = {
  home: 'Homes', market: 'Market', shops: 'Shops', office: 'Offices', school: 'School', hospital: 'Hospital', mall: 'Mall', stadium: 'Stadium',
  port: 'Port', fair: 'Fair', park: 'Park', square: 'Square', landmark: 'Landmark', beach: 'Beach', nursery: 'Nursery', fuel: 'Petrol station', food: 'Restaurants', fun: 'Fun park',
};
const MODE_NAMES: Readonly<Record<TransitLine['mode'], string>> = { bus: 'Bus', express: 'Express bus', tram: 'Tram', metro: 'Metro', boat: 'Water bus' };
export const CROWDED = 0.85;
export const FULL = 0.9;
export const MAX_VEHICLES = 6;

export function carParkPanel(c: PanelCtx, id: number): string {
  const p: CarPark | undefined = c.city.carParks.find((x) => x.id === id);
  if (!p) return '<h2>Car park</h2><p class="dim">Gone.</p>';
  return `<h2>${p.beach ? 'Beach parking' : PARK_NAMES[p.kind]}</h2>${kv('Spaces used', `${num(p.used)} of ${num(p.spaces)}`)}${meter(p.occupancy, p.occupancy > FULL)}
    ${kv('Full over the day', pct(p.occupancy))}${p.access ? '' : '<p class="warn small">No road reaches it.</p>'}
    <button class="btn" data-act="removePark">Knock it down</button>`;
}

export function lotPanel(c: PanelCtx, id: number): string {
  const l = c.city.lots.find((x) => x.id === id);
  if (!l) return '<h2>Block</h2><p class="dim">Gone.</p>';
  const m = c.city.lotMood(id);
  return `<h2>${esc(l.name)}</h2><p class="small dim">${LOT_NAMES[l.kind]}, ${esc(l.district)}${l.level === 0 ? ', opens in year ' + shownYear(c.city, l.opensYear) : ''}</p>
    ${kv('Trips happy', pct(1 - m.trips))}${meter(1 - m.trips, m.trips > 0.5)}${kv('Parking happy', pct(1 - m.parking))}${meter(1 - m.parking, m.parking > 0.5)}
    ${l.access ? '' : '<p class="warn small">No road reaches the door.</p>'}`;
}

export function linePanel(c: PanelCtx, id: number): string {
  const l = c.city.lines.find((x) => x.id === id);
  if (!l) return '<h2>Line</h2><p class="dim">Gone.</p>';
  if (l.mini) return `<h2>${esc(l.name)}</h2><p class="small dim">Minibus, ${l.stops.length} stops</p>${minibusPanel(c, l)}`;
  return `<h2>${esc(l.name)}</h2><p class="small dim">${MODE_NAMES[l.mode]}, ${l.stops.length} stops</p>
    ${kv('Riders last season', num(l.riders))}${kv('Crowding', pct(Math.min(1, l.crowding)))}${meter(Math.min(1, l.crowding), l.crowding > CROWDED)}
    <div class="stepper"><span>Vehicles</span><button class="btn" data-act="veh" data-v="-1" ${l.vehicles <= 1 ? 'disabled' : ''}>-</button><b class="v">${l.vehicles}</b><button class="btn" data-act="veh" data-v="1" ${l.vehicles >= MAX_VEHICLES ? 'disabled' : ''}>+</button></div>
    <button class="btn" data-act="removeLine">Close the line</button>`;
}

export function carPanel(c: PanelCtx, slot: number): string {
  const d = c.city.driver(slot);
  if (!d) return '<h2>Driver</h2><p class="dim">Already home.</p>';
  return `<h2>${esc(d.who)}</h2><div class="bubble">${pic(`resident-${d.animal}`)}<p>${esc(d.text)}</p></div>`;
}
