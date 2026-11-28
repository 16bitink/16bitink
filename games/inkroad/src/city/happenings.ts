import { polyLength } from './geometry';
import { accessPoint, gateNodes } from './places';
import type { Crowd } from './demand';
import type { Place } from './day';
import { RULE_EVENTS } from './rules/texts';
import type { City } from './state';
import { emit, has, yearDef } from './state';

/** The year's events: always announced, always with something to do about them. */
interface Happening { readonly text: string; readonly crowd?: { readonly tours: number; readonly perYear: number; readonly from: number; readonly to: number }; readonly speed?: number; readonly at?: number; readonly school?: number }

const HAPPENINGS: Readonly<Record<string, Happening>> = {
  ...RULE_EVENTS,
  breakdown: { text: 'A lorry of watermelons has stopped in the lane. It is thinking.', at: 24 },
  football: { text: 'Moonball night! Everyone drives to the stadium at once.', crowd: { tours: 18, perYear: 2, from: 66, to: 84 } },
  wedding: { text: 'A wedding on one small street. Two hedgehogs, four hundred guests, and an aunt who parks badly.', crowd: { tours: 26, perYear: 0, from: -2, to: 10 } },
  festival: { text: 'Market festival. Half the city wants one carpet.', crowd: { tours: 14, perYear: 2.5, from: 44, to: 80 } },
  sale: { text: 'Sale at the mall! Everything must go, and so must everyone.', crowd: { tours: 16, perYear: 2, from: 42, to: 88 } },
  fair: { text: 'The Grand Fair is open. Twice the visitors, one fairground.', crowd: { tours: 14, perYear: 1.5, from: 10, to: 84 } },
  term: { text: 'School starts. Every parent drives one very small passenger.', school: 0.5 },
  rain: { text: 'Rain! Nobody here has ever used the wipers.', speed: 0.78 },
  sandstorm: { text: 'Sandstorm. Drivers can see their own bonnet, on a good day.', speed: 0.68 },
  swans: { text: 'Nine swans are crossing. In order of height.', at: 24 },
  herring: { text: 'Herring day. The whole city smells, and the whole city comes.', crowd: { tours: 14, perYear: 2, from: 44, to: 80 } },
  cruise: { text: 'A ship as tall as the town has parked by the quay. Everyone is getting off.', crowd: { tours: 18, perYear: 2, from: 18, to: 74 } },
  birthday: { text: 'A thousand candles! Every guest drives in with a cake on the seat.', crowd: { tours: 40, perYear: 2.5, from: 16, to: 88 } },
  fog: { text: 'Fog. Drivers follow the car in front, who is following a goose.', speed: 0.72 },
  snow: { text: 'Snow on cobbles. Everyone slides politely.', speed: 0.7 },
  pipe: { text: 'A burst pipe digs up the busiest street for a season.' },
};

export interface TodayPlan { readonly crowds: readonly Crowd[]; readonly schoolRate: number; readonly speed: number; readonly agenda: readonly { readonly at: number; readonly kind: string; readonly place?: string }[] }

const BLOCK_SECONDS = 16;
const NOTICE_AT = 1;

/** What today's events do to demand and the roads. */
export function todayPlan(c: City): TodayPlan {
  const crowds: Crowd[] = [];
  const agenda: { at: number; kind: string; place?: string }[] = [];
  let schoolRate = 0;
  let speed = 1;
  for (const e of yearDef(c).events) {
    const h = HAPPENINGS[e.kind];
    if (e.season !== c.season || !h) continue;
    agenda.push({ at: h.at ?? NOTICE_AT, kind: e.kind, ...(e.at !== undefined ? { place: e.at } : {}) });
    schoolRate = Math.max(schoolRate, h.school ?? 0);
    speed = Math.min(speed, h.speed ?? 1);
    const place = placeNamed(c, e.at);
    if (h.crowd && place) crowds.push({ place, tours: Math.round(h.crowd.tours + h.crowd.perYear * c.year), from: h.crowd.from, to: h.crowd.to });
  }
  return { crowds, schoolRate, speed, agenda };
}

function placeNamed(c: City, name: string | undefined): Place | null {
  const lot = c.lots.find((l) => l.name === name && l.level > 0);
  if (lot) return { lot: lot.id };
  const gate = c.def.gates.find((g) => g.name === name);
  const node = gate ? gateNodes(c).get(gate.id) : undefined;
  return node === undefined ? null : { gate: node };
}

const busiest = (c: City, bridge: boolean) => {
  const open = c.net.roads.filter((r) => !r.fixed && !r.flyover && (!bridge || r.bridge));
  return [...open].sort((a, b) => c.traffic.roadStats(b.id).flow - c.traffic.roadStats(a.id).flow || a.id - b.id)[0];
};

/** The hour has come: announce it and do it. */
export function happen(c: City, kind: string, place: string | undefined): void {
  const h = HAPPENINGS[kind];
  if (!h) return;
  const lot = c.lots.find((l) => l.name === place);
  const road = busiest(c, place === 'bridge');
  const at = lot ? { x: (lot.gx + lot.w / 2) * 40, y: (lot.gy + lot.h / 2) * 40 } : road ? accessPoint(c, { road: road.id, s: polyLength(road.line) / 2 }) : { x: 0, y: 0 };
  if ((kind === 'breakdown' || kind === 'swans' || kind === 'goats') && road) {
    c.traffic.block({ road: road.id, s: polyLength(road.line) / 2 }, BLOCK_SECONDS * (has(c, 'tow') ? 0.45 : 1), 4);
    c.day.stats.crashes += 1;
  }
  emit(c, { t: 'incident', kind, at, text: h.text });
}

/** A burst pipe: road works on the busiest street this season. */
export function pipeRoad(c: City): number | null {
  const burst = yearDef(c).events.some((e) => e.kind === 'pipe' && e.season === c.season);
  return burst ? busiest(c, false)?.id ?? null : null;
}
