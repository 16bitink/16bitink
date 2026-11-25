import { atJunction, clockOf, look, selected } from '../parts';
import { byPain, isRed } from '../places';
import type { Step } from '../types';

/** What is different about cities 2 to 5: a step or two the first time it matters. Keyed 'city:year'. */
const talk = (id: string, stage: number, who: Step['who'], why: string, say: string, more: Partial<Step> = {}): Step =>
  ({ id, stage, who: who ?? 'zaza', pause: stage % 2 === 0 && stage < 8, ok: 'Next', why, say, ...more });

const redOne: Step = {
  id: 'red', stage: 0, pause: true, when: (v) => byPain(v.city).some((s) => isRed(s.grade)), skipIf: (v, m) => clockOf(v) > 100 && m.node === undefined, enter: (v, m) => { m.node = byPain(v.city).find((s) => isRed(s.grade))?.j.id ?? -1; },
  why: 'The first red one of this town.', say: 'Tap it. The arrows show who waits.', target: (v, m) => atJunction(v.city, m.node ?? -1), until: (v, m) => selected(v, m.node ?? -1), look: (v, m) => { const j = v.city.junctions.find((x) => x.id === m.node); return j ? [j] : null; },
};

export const CITY_STEPS: Readonly<Record<string, readonly Step[]>> = {
  '2:1': [talk('old', 0, 'sulo', 'An old stone town. Its streets cannot be widened.', 'So we fix junctions, and find ways round.'), redOne],
  '2:3': [talk('tram', 0, 'juma', 'Narrow streets, full of cars.', 'A tram carries a whole street. The Council pays most.', { target: () => ({ t: 'tool', tool: 'tram' }) })],
  '2:5': [
    talk('zone', 0, 'pim', 'A charge to drive into the old town.', 'You set its price at night. Start small.', { target: () => ({ t: 'tool', tool: 'zone' }) }),
    talk('vote', 3, 'sulo', 'People hate a charge first, then feel the result.', 'Call the vote when support passes 50.', { target: () => look('[data-pane=council] .supportline', '[data-act=tab][data-tab=council]'), skipIf: (v) => !v.city.vote }),
  ],
  '2:6': [talk('square', 0, 'zaza', 'Some streets are better without cars.', 'A square calms the homes around it.', { target: () => ({ t: 'tool', tool: 'square' }) })],
  '3:1': [talk('isles', 0, 'pim', 'Islands. There is almost no land left.', 'Every cell of road is dear. Draw short.'), redOne],
  '3:4': [talk('licence', 8, 'sulo', 'From now on a car needs a licence.', 'You choose how many we auction each year.', { target: () => look('[data-pane=licences]', '[data-act=tab][data-tab=licences]'), skipIf: (v) => !v.city.special?.licences })],
  '3:6': [talk('eyes', 0, 'pim', 'These toll gates watch the speed.', 'Slow road: price up. Fast road: price down.', { target: () => ({ t: 'tool', tool: 'toll' }) })],
  '4:1': [talk('hills', 0, 'zaza', 'Seven hills: steep old streets are slow.', 'Keep the heavy traffic on the flat.'), redOne],
  '4:3': [talk('mini', 0, 'juma', 'Private minibuses: quick, cheap, and they stop anywhere.', 'Tap one line to license it, or buy it out.')],
  '4:4': [talk('ferry', 0, 'juma', 'The bridges are full. The water is empty.', 'Ferries here carry nearly twice as many.', { target: () => ({ t: 'tool', tool: 'boat' }) })],
  '5:1': [talk('worn', 0, 'zaza', 'Every road here is old and wearing out.', 'Open the Condition map: the worst need mending.', { target: () => look('[data-act=ov][data-v=condition]') }), redOne],
  '5:3': [talk('match', 0, 'sulo', 'Bridges wear out too.', 'The Council pays 60 of every 100 coins of a new one.')],
  '5:6': [talk('freeway', 0, 'sulo', 'The old freeway cuts the city in two.', 'Tap a piece of it: it may become a boulevard.')],
};
