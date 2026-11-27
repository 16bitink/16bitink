import { toolLesson } from '../lessons';
import { atJunction, clockOf, coins, look, selected } from '../parts';
import { byPain, junctionName, junctionOf, mid, ptOf, roadMid, turnWords, worstMove } from '../places';
import { lineIdea, needsParking, remember } from '../sites';
import type { GuideView, Memo, Step, Target } from '../types';
import { stopsDone } from './saffronTools';

/** Saffron Bay, years 6 to 9: the big works. */
const LATE = 100;
const RUSH = 34;

/** One heavy turn we may lift and can pay for. */
const flyIdea = remember((c) => {
  for (const s of byPain(c).slice(0, 4)) {
    const m = worstMove(c, s.j.id);
    const q = m ? c.quote({ t: 'flyover', node: s.j.id, fromRoad: m.fromRoad, toRoad: m.toRoad, level: 1 }) : null;
    if (m && q?.ok) return { j: s.j, m, q };
  }
  return null;
}, 6000);
const flights = (v: GuideView): number => v.city.projects.length + v.city.roads.filter((r) => r.flyover).length;
const node = (m: Memo): number => m.node ?? -1;
const move = (v: GuideView, m: Memo) => v.city.movements(node(m)).find((x) => x.fromRoad === m.from && x.toRoad === m.to);

const YEAR_6: readonly Step[] = [
  {
    id: 'fly-tap', stage: 0, pause: true, when: (v) => clockOf(v) > RUSH && flyIdea(v.city) !== null, skipIf: (v, m) => clockOf(v) > LATE && m.node === undefined,
    enter: (v, m) => { const f = flyIdea(v.city); if (f) { m.node = f.j.id; m.from = f.m.fromRoad; m.to = f.m.toRoad; m.fly = flights(v); m.share = f.m.share; } },
    why: (v, m) => { const j = junctionOf(v.city, node(m)); return j ? `${Math.round((m.share ?? 0) * 100)}% of the waiting at ${junctionName(v.city, j)} is one turn.` : ''; }, say: 'Tap it and find the reddest arrow.',
    target: (v, m) => atJunction(v.city, node(m)), look: (v, m) => { const j = junctionOf(v.city, node(m)); return j ? [j] : null; }, until: (v, m) => selected(v, node(m)) || flights(v) > (m.fly ?? Infinity),
  },
  ...toolLesson({
    id: 'fly', stage: 0, tool: 'flyover', why: (v, m) => { const j = junctionOf(v.city, node(m)); const x = move(v, m); return j && x ? `Cars ${turnWords(v.city, j, x)}: lift them over.` : 'Lift that turn over the rest.'; }, pick: 'Tap Flyover.', placeWhy: 'The game lays the ramps and the pillars.',
    place: 'Drag along the arrow, tail to head.', target: (v, m): Target | null => { const x = move(v, m); return x ? { t: 'drag', line: x.arrow } : null; }, ready: (v) => v.ghost?.cmd.t === 'flyover' && v.ghost.quote.ok && !v.ghost.dragging,
    done: (v, m) => flights(v) > (m.fly ?? Infinity), skip: (_v, m) => m.node === undefined, buildWhy: (v) => `${coins(v.ghost?.quote.cost ?? 0)}, and ${v.ghost?.quote.works ?? 6} months of dust.`,
  }),
  { id: 'fly-run', stage: 0, pause: true, ok: 'Next', who: 'pim', why: 'Works first: a lane is closed, people grumble.', say: 'When it opens, that arrow turns green.', skipIf: (v, m) => flights(v) <= (m.fly ?? Infinity), target: () => look('.projects') },
];

const bridge = remember((c) => c.roads.filter((r) => r.bridge && !r.flyover && !r.toll).find((r) => c.quote({ t: 'toll', road: r.id, on: true }).ok) ?? null);
const YEAR_7: readonly Step[] = [
  {
    id: 'toll-why', stage: 0, who: 'pim', pause: true, ok: 'Show me', skipIf: (v) => bridge(v.city) === null, enter: (v, m) => { m.bridge = bridge(v.city)?.id ?? -1; }, why: 'Half the city crosses here. One bridge.', say: 'A toll slims the rush and pays for a second one.',
    target: (v) => { const r = bridge(v.city); return r ? { t: 'spot', at: roadMid(r), r: 56 } : null; }, look: (v) => { const r = bridge(v.city); return r ? [roadMid(r)] : null; },
  },
  ...toolLesson({
    id: 'toll', stage: 0, who: 'pim', tool: 'toll', why: 'Drivers who can wait will wait.', pick: 'Tap Toll gate.', place: 'Tap the bridge.', target: (v, m) => { const r = v.city.roads.find((x) => x.id === m.bridge); return r ? { t: 'spot', at: roadMid(r), r: 46, tap: true } : null; },
    ready: (v) => v.ghost?.cmd.t === 'toll' && v.ghost.quote.ok, done: (v) => v.city.roads.some((r) => r.toll), skip: (_v, m) => m.bridge === undefined || m.bridge < 0,
  }),
  { id: 'toll-price', stage: 1, who: 'pim', ok: 'Next', why: 'Dear at the rush, cheap at noon: people spread out.', say: 'With no free way round, the anger doubles.', target: () => look('[data-act=price][data-v="tollPeak:1"]', '[data-act=tab][data-tab=prices]'), skipIf: (v) => !v.city.priceLimits.tollPeak.open || !v.city.roads.some((r) => r.toll) },
];

const multiIdea = remember((c) => needsParking(c, 'multi'), 10_000);
const YEAR_8: readonly Step[] = [
  {
    id: 'mall', stage: 0, who: 'miko', pause: true, ok: 'Next', when: (v) => clockOf(v) > RUSH && multiIdea(v.city) !== null, skipIf: (v) => clockOf(v) > LATE, enter: (v, m) => { m.parks = v.city.carParks.length; },
    why: (v) => `${multiIdea(v.city)?.lot.name ?? 'The mall'} is full, and sand is dear.`, say: 'Multi-storey: 44 spaces where 12 would fit.', target: (v) => { const i = multiIdea(v.city); return i ? { t: 'spot', at: mid(i.lot), r: i.lot.w * 24 } : null; }, look: (v) => { const i = multiIdea(v.city); return i ? [mid(i.lot), i.site.at] : null; },
  },
  ...toolLesson({
    id: 'multi', stage: 0, who: 'miko', tool: 'parking', kind: 'multi', why: 'Build up, not out.', pick: 'Tap Car park.', place: 'Tap the marked sand.', target: (v) => { const i = multiIdea(v.city); return i ? { t: 'spot', at: i.site.at, r: 50, tap: true } : null; },
    ready: (v) => v.ghost?.cmd.t === 'carPark' && v.ghost.quote.ok && !v.ghost.dragging, done: (v, m) => v.city.carParks.length > (m.parks ?? Infinity), skip: (v, m) => m.parks === undefined || (!multiIdea(v.city) && !v.ghost && v.city.carParks.length <= m.parks),
  }),
  { id: 'event', stage: 1, who: 'miko', ok: 'Next', why: 'On sale days everybody comes at once.', say: 'A peak price one step up keeps a few spaces free.', target: () => look('[data-act=price][data-v="parkPeak:1"]', '[data-act=tab][data-tab=prices]'), skipIf: (v) => !v.city.priceLimits.parkPeak.open },
];

const metroIdea = remember((c) => lineIdea(c, 'metro'));
const trains = (v: GuideView): number => v.city.lines.filter((l) => l.mode === 'metro').length;
const YEAR_9: readonly Step[] = [
  {
    id: 'metro-why', stage: 0, who: 'juma', pause: true, ok: 'Show me', when: (v) => metroIdea(v.city) !== null, skipIf: (v) => clockOf(v) > LATE, enter: (v, m) => { m.trains = trains(v); }, why: 'The roads are full. Under them it is empty.', say: 'The Council pays 60 of every 100 coins.',
    marks: (v) => { const i = metroIdea(v.city); return i ? [{ line: i.stops.map(ptOf), label: coins(i.quote.cost) }, ...i.stops.map((s) => ({ ring: ptOf(s), r: 24 }))] : []; }, look: (v) => metroIdea(v.city)?.stops.map(ptOf) ?? null,
  },
  ...toolLesson({
    id: 'metro', stage: 0, who: 'juma', tool: 'metro', why: 'A metro goes straight, whatever is above.', pick: 'Tap Metro.', place: 'Tap the stations one after another.', placeWhy: (v) => `Station ${Math.min(v.stops + 1, metroIdea(v.city)?.stops.length ?? 2)} of ${metroIdea(v.city)?.stops.length ?? 2}.`,
    target: (v) => { const i = metroIdea(v.city); const s = i?.stops[Math.min(v.stops, i.stops.length - 1)]; return s ? { t: 'spot', at: ptOf(s), r: 28, tap: true } : null; },
    marks: (v) => { const i = metroIdea(v.city); return i ? [{ line: i.stops.map(ptOf) }, ...i.stops.map((s) => ({ ring: ptOf(s), r: 24 }))] : []; }, look: (v) => metroIdea(v.city)?.stops.map(ptOf) ?? null,
    ready: (v) => stopsDone(v, metroIdea(v.city)?.stops.length ?? 2), done: (v, m) => trains(v) > (m.trains ?? Infinity), skip: (v, m) => m.trains === undefined || (!metroIdea(v.city) && !v.ghost && trains(v) <= m.trains),
    buildWhy: (v) => `Your share is ${coins(v.ghost?.quote.cost ?? 0)}. Digging takes ${v.ghost?.quote.works ?? 9} months.`,
  }),
  { id: 'ride', stage: 2, who: 'miko', ok: 'Next', pause: true, why: 'Park and ride: leave the car outside, take the train.', say: 'It is a kind of car park. Put it by a station.', target: () => ({ t: 'tool', tool: 'parking' }), skipIf: (v) => trains(v) === 0 || !v.city.parkKinds.includes('ride') },
];

export const SAFFRON_6_9: Readonly<Record<number, readonly Step[]>> = { 6: YEAR_6, 7: YEAR_7, 8: YEAR_8, 9: YEAR_9 };
