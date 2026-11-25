import { inflow, effectOf } from '../../ui/panels/controls';
import { toolLesson } from '../lessons';
import { atJunction, clockOf, look, secs, selected, ui, waitAt } from '../parts';
import { byPain, doubleParked, fullLots, isCalm, junctionName, junctionOf, mid, ptOf, roadMid } from '../places';
import { kerbRoad, lineIdea, needsParking, remember } from '../sites';
import type { GuideView, Memo, Step, Target } from '../types';

/** Saffron Bay, years 2 to 5: each new tool starts from the trouble it mends. */
const LATE = 100;
const HALF = 60;
const SOME = 3;
const MIN_WAIT = 6;

const lotIdea = remember((c) => needsParking(c, 'lot'), 10_000);
const kerbIdea = remember((c) => { const l = fullLots(c)[0]; const k = l ? kerbRoad(c, mid(l)) : null; return l && k ? { lot: l, ...k } : null; }, 10_000);
const spot = (at: { x: number; y: number }, r = 46): Target => ({ t: 'spot', at, r, tap: true });
const parks = (v: GuideView): number => v.city.carParks.length;
const keepParks = (v: GuideView, m: Memo): void => { m.parks = parks(v); };
const moreParks = (v: GuideView, m: Memo): boolean => parks(v) > (m.parks ?? Infinity);

const YEAR_2: readonly Step[] = [
  {
    id: 'full', stage: 0, who: 'miko', pause: true, ok: 'Show me', when: (v) => lotIdea(v.city) !== null && clockOf(v) > 20, skipIf: (v) => clockOf(v) > LATE,
    why: (v) => `${lotIdea(v.city)?.lot.name ?? 'The market'} is full. Drivers circle, then give up.`, say: 'They need somewhere to stop.', enter: keepParks,
    target: (v) => { const l = lotIdea(v.city)?.lot; return l ? { t: 'spot', at: mid(l), r: l.w * 24 } : null; }, look: (v) => { const l = lotIdea(v.city); return l ? [mid(l.lot), l.site.at] : null; },
  },
  ...toolLesson({
    id: 'park', stage: 0, who: 'miko', tool: 'parking', why: 'A car park takes them off the road.', pick: 'Tap Car park.', place: 'Tap the marked sand.',
    target: (v) => { const s = lotIdea(v.city)?.site; return s ? spot(s.at, 58) : null; }, look: (v) => { const s = lotIdea(v.city)?.site; return s ? [s.at] : null; },
    ready: (v) => !!v.ghost && v.ghost.cmd.t === 'carPark' && v.ghost.quote.ok && !v.ghost.dragging, done: moreParks, skip: (v, m) => m.parks === undefined || (!lotIdea(v.city) && !v.ghost && !moreParks(v, m)),
  }),
  {
    id: 'park-used', stage: 0, who: 'miko', why: 'Open for business.', say: 'Watch who turns in.', skipIf: (v, m) => !moreParks(v, m), until: (v) => (v.city.carParks.at(-1)?.used ?? 0) >= SOME || clockOf(v) > 112,
    reward: (v) => `${Math.round(v.city.carParks.at(-1)?.used ?? 0)} of ${v.city.carParks.at(-1)?.spaces ?? 0} spaces taken already. No more circling.`,
  },
  {
    id: 'price', stage: 1, who: 'miko', ok: 'Next', why: 'Prices change only at night, one step at a time.', say: 'Best is 85 of 100 full. Too full? Raise it.',
    target: () => look('[data-act=price][data-v="park:1"]', '[data-act=tab][data-tab=prices]'), skipIf: (v) => !v.city.priceLimits.park.open,
  },
  {
    id: 'kerb-why', stage: 2, who: 'miko', pause: true, ok: 'Next', when: (v) => kerbIdea(v.city) !== null, skipIf: (v) => clockOf(v) > LATE, enter: (v, m) => { m.kerb = kerbIdea(v.city)?.road.id ?? -1; },
    why: (v) => `${kerbIdea(v.city)?.lot.name ?? 'The shops'}: not one space left.`, say: 'Kerb bays are cheap, but slow the street a little.',
    target: (v) => { const k = kerbIdea(v.city); return k ? { t: 'spot', at: mid(k.lot), r: k.lot.w * 24 } : null; }, look: (v) => { const k = kerbIdea(v.city); return k ? [mid(k.lot), roadMid(k.road)] : null; },
  },
  ...toolLesson({
    id: 'kerb', stage: 2, who: 'miko', tool: 'kerb', why: 'Let cars park along the street.', pick: 'Tap Kerb bays.', place: 'Tap the marked street.',
    target: (v, m) => { const r = v.city.roads.find((x) => x.id === m.kerb); return r ? spot(roadMid(r)) : null; }, look: (v, m) => { const r = v.city.roads.find((x) => x.id === m.kerb); return r ? [roadMid(r)] : null; },
    ready: (v) => !!v.ghost && v.ghost.cmd.t === 'kerb' && v.ghost.quote.ok, done: (v) => v.city.roads.some((r) => r.kerb), skip: (v, m) => m.kerb === undefined || m.kerb < 0,
  }),
];

const YEAR_3: readonly Step[] = [
  {
    id: 'double', stage: 0, who: 'miko', pause: true, ok: 'Cheeky', when: (v) => doubleParked(v.city).length >= 2, skipIf: (v) => clockOf(v) > LATE,
    why: (v) => `${doubleParked(v.city).length} cars are double-parked. Each blocks a lane.`, say: 'Only inspectors move them. We hire tonight.',
    target: (v) => { const p = doubleParked(v.city)[0]; return p ? { t: 'spot', at: p, r: 30 } : null; }, look: (v) => { const p = doubleParked(v.city)[0]; return p ? [p] : null; },
  },
  {
    id: 'hire', stage: 1, who: 'miko', why: 'My meerkats see everything.', say: 'Hire one inspector: tap the plus.', target: () => ui('[data-act=pol][data-v="inspectors:1"]', '[data-act=tab][data-tab=prices]'),
    until: (v) => v.city.policies.inspectors > 0, skipIf: (v) => !v.city.openPolicies.includes('inspectors'),
  },
  {
    id: 'fine', stage: 1, who: 'pim', ok: 'Next', why: 'A fine works only when somebody checks.', say: 'Too many, and we are a cash machine: Cost falls.',
    target: () => look('[data-act=price][data-v="fine:1"]', '[data-act=tab][data-tab=prices]'),
  },
];

/** A junction that green time would help, and that we can pay for. */
const signalIdea = remember((c) => byPain(c).find((s) => s.wait >= MIN_WAIT && s.j.control !== 'signal' && s.j.control !== 'smart'
  && ['much', 'better'].includes(effectOf(s.j.control, 'signal', inflow(c.movements(s.j.id)))) && c.quote({ t: 'control', node: s.j.id, control: 'signal' }).ok) ?? null, 4000);
const node = (m: Memo): number => m.node ?? -1;
const hasSignal = (v: GuideView, m: Memo): boolean => ['signal', 'smart'].includes(junctionOf(v.city, node(m))?.control ?? '');
const noNode = (_v: GuideView, m: Memo): boolean => m.node === undefined;

const YEAR_4: readonly Step[] = [
  {
    id: 'sig-tap', stage: 0, pause: true, when: (v) => signalIdea(v.city) !== null, skipIf: (v, m) => clockOf(v) > LATE && m.node === undefined,
    enter: (v, m) => { const s = signalIdea(v.city); if (s) { m.node = s.j.id; m.before = s.wait; } },
    why: (v, m) => { const j = junctionOf(v.city, node(m)); return j ? `${secs(waitAt(v, node(m)))} for each car at ${junctionName(v.city, j)}.` : ''; }, say: 'Tap it.',
    target: (v, m) => atJunction(v.city, node(m)), look: (v, m) => { const j = junctionOf(v.city, node(m)); return j ? [j] : null; }, until: (v, m) => selected(v, node(m)) || hasSignal(v, m),
  },
  {
    id: 'sig-build', stage: 0, pause: true, why: 'One road is much busier than the rest.', say: 'Tap Signals.', skipIf: noNode, target: () => ui('.sel [data-act=control][data-v=signal]'),
    until: hasSignal, back: { when: (v, m) => !selected(v, node(m)) && !hasSignal(v, m), to: 'sig-tap' },
  },
  { id: 'sig-again', stage: 0, pause: true, why: 'Now share out the green time.', say: 'Tap the junction again.', skipIf: noNode, target: (v, m) => atJunction(v.city, node(m)), until: (v, m) => selected(v, node(m)) },
  {
    id: 'sig-split', stage: 0, pause: true, ok: 'Next', why: 'The busy road needs the longer green.', say: 'Drag its slider a little to the right.', skipIf: noNode,
    enter: (v, m) => { m.split = junctionOf(v.city, node(m))?.split[0] ?? 0; }, target: () => ui('.sel input[data-act=split]'), until: (v, m) => Math.abs((junctionOf(v.city, node(m))?.split[0] ?? 0) - (m.split ?? 0)) > 0.04,
  },
  {
    id: 'sig-run', stage: 0, why: 'Let it run.', say: 'Watch the queues.', skipIf: noNode, until: (v, m) => clockOf(v) > 112 || isCalm(v.city.junctionStats(node(m)).grade),
    reward: (v, m) => (waitAt(v, node(m)) < (m.before ?? 0) - 1 ? `The wait fell from ${secs(m.before ?? 0)} to ${secs(waitAt(v, node(m)))}.` : 'Signals need an uneven road. Move the slider if a queue grows.'),
  },
  {
    id: 'commission', stage: 1, who: 'sulo', ok: 'Not now', why: 'The Council pays for a job: part now, the rest when done.', say: 'Miss it and you pay back. Take it?',
    target: () => ui('[data-act=commission][data-v$=":1"]', '[data-act=tab][data-tab=council]'), skipIf: (v) => !v.city.commissions.some((c) => c.state === 'offered'), until: (v) => !v.city.commissions.some((c) => c.state === 'offered'),
  },
];

const busIdea = remember((c) => lineIdea(c, 'bus'));
const buses = (v: GuideView): number => v.city.lines.filter((l) => l.mode === 'bus' || l.mode === 'express').length;
const nextStop = (v: GuideView, idea: ReturnType<typeof busIdea>): Target | null => {
  const s = idea?.stops[Math.min(v.stops, (idea?.stops.length ?? 1) - 1)];
  return s ? spot(ptOf(s), 26) : null;
};
const stopMarks = (idea: ReturnType<typeof busIdea>) => (idea ? [{ line: idea.quote.line ?? idea.stops.map(ptOf), label: '' }, ...idea.stops.map((s) => ({ ring: ptOf(s), r: 22 }))] : []);
export const stopsDone = (v: GuideView, need: number): boolean => v.ghost?.cmd.t === 'line' && v.ghost.quote.ok && v.ghost.cmd.stops.length >= need;
const keepLane = remember((c) => c.lines.filter((l) => l.mode === 'bus').flatMap((l) => c.roads.filter((r) => r.type !== 'street' && l.stops.some((s) => r.cells.some((q) => q.gx === s.gx && q.gy === s.gy))))
  .find((r) => c.quote({ t: 'busLane', road: r.id, on: true }).ok) ?? null);

const YEAR_5: readonly Step[] = [
  {
    id: 'bus-why', stage: 0, who: 'juma', pause: true, ok: 'Show me', skipIf: (v) => busIdea(v.city) === null || buses(v) > 0, enter: (v, m) => { m.lines = buses(v); },
    why: (v) => `${busIdea(v.city)?.names[0] ?? 'Homes'} to ${busIdea(v.city)?.names.at(-1) ?? 'work'}: everyone drives alone.`, say: 'One bus takes thirty cars off the road.',
    marks: (v) => stopMarks(busIdea(v.city)), look: (v) => busIdea(v.city)?.stops.map(ptOf) ?? null,
  },
  ...toolLesson({
    id: 'bus', stage: 0, who: 'juma', tool: 'bus', why: 'A bus line is a list of stops.', pick: 'Tap Bus line.', place: 'Tap the stops one after another.', placeWhy: (v) => `Stop ${Math.min(v.stops + 1, busIdea(v.city)?.stops.length ?? 2)} of ${busIdea(v.city)?.stops.length ?? 2}.`,
    target: (v) => nextStop(v, busIdea(v.city)), marks: (v) => stopMarks(busIdea(v.city)), look: (v) => busIdea(v.city)?.stops.map(ptOf) ?? null, ready: (v) => stopsDone(v, busIdea(v.city)?.stops.length ?? 2),
    done: (v, m) => buses(v) > (m.lines ?? Infinity), skip: (v, m) => m.lines === undefined || (!busIdea(v.city) && !v.ghost && buses(v) <= m.lines),
  }),
  {
    id: 'bus-run', stage: 0, who: 'juma', why: 'Two buses are on their way.', say: 'Give people the morning to find them.', skipIf: (v, m) => m.lines === undefined || buses(v) <= m.lines, until: (v) => clockOf(v) > HALF,
    reward: (v) => (v.city.goal.unit === 'riders' ? `${Math.round(v.city.goal.value)} riders already. The goal is ${v.city.goal.target} in a season.` : 'People are on board. My knees can feel it.'),
  },
  {
    id: 'lane-why', stage: 2, who: 'juma', pause: true, ok: 'Next', skipIf: (v) => keepLane(v.city) === null, enter: (v, m) => { m.lane = keepLane(v.city)?.id ?? -1; }, why: 'Our bus stands in the same jam as everyone.', say: 'A red lane is its own. Cars lose one, for now.',
    target: (v) => { const r = keepLane(v.city); return r ? { t: 'spot', at: roadMid(r), r: 50 } : null; }, look: (v) => { const r = keepLane(v.city); return r ? [roadMid(r)] : null; },
  },
  ...toolLesson({
    id: 'lane', stage: 2, who: 'juma', tool: 'buslane', why: 'Buses first.', pick: 'Tap Bus lane.', place: 'Tap the marked road.', target: (v, m) => { const r = v.city.roads.find((x) => x.id === m.lane); return r ? spot(roadMid(r)) : null; },
    ready: (v) => v.ghost?.cmd.t === 'busLane' && v.ghost.quote.ok, done: (v) => v.city.roads.some((r) => r.busLane), skip: (_v, m) => m.lane === undefined || m.lane < 0,
  }),
];

export const SAFFRON_2_5: Readonly<Record<number, readonly Step[]>> = { 2: YEAR_2, 3: YEAR_3, 4: YEAR_4, 5: YEAR_5 };
