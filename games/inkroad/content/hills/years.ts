import type { YearDef } from '../../src/sim/types';

/**
 * Seven Hills, years 31 to 40. One idea a year, and each has a build, a price and a transit or policy answer.
 *   1 Seven, Roughly      one crossing takes the whole city: a roundabout, a signal or a way round
 *   2 The Other Bridge    the second bridge; paid bays at the flat market
 *   3 A Van of One's Own  minibuses start: license them, buy them out or beat them
 *   4 The Wet Bridge      ferries; goal share
 *   5 The Red Corridor    express bus on bus lanes; the minibuses protest
 *   6 Up and Over         underpasses; the school on the hill
 *   7 A Price for the View a toll on one bridge, the other free
 *   8 Through the Hill    the metro, with the ferries tied up in a storm
 *   9 The Long Stair      squares, and a derby night at the stadium
 *  10 Seven Hills, One Table  approval; everything at once
 */
export const HILLS_YEARS: readonly YearDef[] = [
  {
    year: 1, name: 'Seven, Roughly', cannotLose: true, grant: 80,
    intro: [
      { who: 'sulo', text: 'Seven hills. We counted on a clear day and found nine, but the stamps were printed.' },
      { who: 'dewy', text: 'Every cart in town crosses at one red corner to reach the bridge. A roundabout helps. A second way round helps more.' },
    ],
    tools: ['street', 'avenue', 'remove', 'junction'], controls: ['yield', 'roundabout', 'signal'], parks: [], policies: ['truckHours'],
    coach: [
      { text: 'Tap the red crossing before the bridge and read the arrows.', at: 'worstJunction', until: 'selected:junction' },
      { text: 'Steep streets are slow. Try a signal, or a new street to share the load, and see which arrow calms down.', at: 'worstJunction', tool: 'junction', until: 'controlChanged' },
    ],
    goal: { kind: 'worstWait', target: 14, text: 'No busy junction over 14 s' },
    events: [{ season: 2, kind: 'drizzle' }],
    plan: ['Year 32: the second bridge', 'Year 33: the first minibuses'],
  },
  {
    year: 2, name: 'The Other Bridge', grant: 90,
    intro: [
      { who: 'sulo', text: 'The second bridge is open. Both sides cut the same ribbon and now nobody has a whole one.' },
      { who: 'miko', text: 'Everybody parks on the corner where the hill begins. Then the car leaves without them.' },
    ],
    tools: ['kerb', 'parking'], parks: ['lot'], policies: ['permits', 'inspectors'],
    coach: [{ text: 'Mark paid bays near the market, on the flat.', tool: 'kerb', until: 'toolPicked:kerb' }],
    goal: { kind: 'found@market', target: 70, text: '70 of 100 drivers find a space at the market' },
    events: [{ season: 1, kind: 'goats' }, { season: 3, kind: 'noodles', at: 'Cat Market' }],
    commissions: ['quiet-fines'],
    plan: ['Year 33: the first minibuses', 'Year 34: ferries'],
  },
  {
    year: 3, name: 'A Van of One\'s Own', grant: 100,
    intro: [
      { who: 'juma', text: 'The minibuses were here first. They stop where you wave, wave where you stop, and will tell you so.' },
      { who: 'dewy', text: 'License them, buy them out, or run a bus that beats them. They hate the third one most.' },
    ],
    tools: ['bus'], policies: ['taxis'],
    coach: [{ text: 'Run a bus where a minibus runs. Tap a minibus line to license or buy it out.', tool: 'bus', until: 'toolPicked:bus' }],
    goal: { kind: 'riders', target: 130, text: '130 riders in a season' },
    events: [{ season: 2, kind: 'drizzle' }],
    commissions: ['bus-habit'],
    plan: ['Year 34: ferries', 'Year 35: a bus lane and a hill market'],
  },
  {
    year: 4, name: 'The Wet Bridge', grant: 110,
    intro: [
      { who: 'juma', text: 'Boats are strong here. Nobody has ever been stuck in traffic on the water, except the ducks.' },
      { who: 'pim', text: 'A ferry earns its fare in a good season and eats it in a storm. Plan like a pessimist.' },
    ],
    tools: ['boat'],
    coach: [{ text: 'Tap a quay on each shore to run a ferry across the strait.', tool: 'boat', until: 'toolPicked:boat' }],
    goal: { kind: 'share', target: 5, text: '5 of 100 trips by bus or boat' },
    events: [{ season: 1, kind: 'ferryfest', at: 'Cat Market' }, { season: 3, kind: 'downpour' }],
    commissions: ['two-bridges'],
    plan: ['Year 35: a bus lane and a hill market', 'Year 36: school hill and underpasses'],
  },
  {
    year: 5, name: 'The Red Corridor', grant: 120,
    intro: [
      { who: 'juma', text: 'A bus lane with a fast bus on it is a BRT. The minibuses call it a very long parking space.' },
      { who: 'sulo', text: 'They have parked in it in protest. In order of age. The oldest brought a flask.' },
    ],
    tools: ['buslane'], policies: ['nightWorks'], parks: ['under'],
    coach: [{ text: 'Paint a lane where the buses crawl, then run an express bus along it.', tool: 'buslane', until: 'toolPicked:buslane' }],
    goal: { kind: 'minis', target: 2, text: 'At most 2 private minibuses' },
    events: [{ season: 0, kind: 'goats' }, { season: 2, kind: 'festival', at: 'Hilltop Market' }],
    commissions: ['hills-peace'],
    plan: ['Year 36: school hill and underpasses', 'Year 37: a toll for the view'],
  },
  {
    year: 6, name: 'Up and Over', grant: 130,
    intro: [
      { who: 'dewy', text: 'The school stands on a hill. Forty parents, one stair, and a goat at the top who has opinions.' },
      { who: 'miko', text: 'We cannot put a deck on a hill. We can put the turn under it.' },
    ],
    tools: ['underpass'], parks: ['multi'],
    coach: [{ text: 'Tap the worst junction, then drag its reddest arrow under the ground.', at: 'worstJunction', tool: 'underpass', until: 'toolPicked:underpass' }],
    goal: { kind: 'worstWait', target: 16, text: 'No busy junction over 16 s' },
    events: [{ season: 1, kind: 'term' }, { season: 3, kind: 'drizzle' }],
    commissions: ['office-run'],
    plan: ['Year 37: a toll for the view', 'Year 38: the metro, and the ferries in a storm'],
  },
  {
    year: 7, name: 'A Price for the View', grant: 140,
    intro: [
      { who: 'pim', text: 'Charge one bridge and leave the other free. Everyone will say it is unfair. Half will use the free one.' },
      { who: 'dewy', text: 'The free bridge jams, the dear bridge sulks. Find the price where both are slow in a polite way.' },
    ],
    tools: ['toll'],
    coach: [{ text: 'Put a gate on one bridge and watch where the cars go.', tool: 'toll', until: 'toolPicked:toll' }],
    goal: { kind: 'lost', target: 14, text: 'At most 14 of 100 trips lost' },
    events: [{ season: 1, kind: 'downpour' }, { season: 3, kind: 'cruise', at: 'Brass Port' }],
    commissions: ['isles-flow'],
    plan: ['Year 38: the metro, and the ferries in a storm', 'Year 39: the stadium and the long stair'],
  },
  {
    year: 8, name: 'Through the Hill', grant: 160,
    intro: [
      { who: 'sulo', text: 'A storm has tied up every ferry. The ferries are sulking in a row, like chairs.' },
      { who: 'juma', text: 'The metro goes under the hill and does not care about weather. Or goats.' },
    ],
    tools: ['metro'], parks: ['ride'],
    coach: [{ text: 'Draw the metro under the busiest slope. It takes three seasons.', tool: 'metro', until: 'toolPicked:metro' }],
    goal: { kind: 'share', target: 9, text: '9 of 100 trips by bus, boat or metro' },
    events: [{ season: 1, kind: 'downpour' }, { season: 3, kind: 'festival', at: 'Hilltop Market' }],
    commissions: ['green-share'],
    plan: ['Year 39: the stadium and the long stair', 'Year 40: the ten-year review'],
  },
  {
    year: 9, name: 'The Long Stair', grant: 180,
    intro: [
      { who: 'miko', text: 'Derby night. Forty thousand fans, one stadium and every van in the city, parked as an act of loyalty.' },
      { who: 'dewy', text: 'Give the old streets back to feet. The goats have already moved in.' },
    ],
    tools: ['square'],
    coach: [{ text: 'Find a street the cars can do without and give it to the feet.', tool: 'square', until: 'built' }],
    goal: { kind: 'bar:streets', target: 60, text: 'Streets at 60 or more' },
    events: [{ season: 0, kind: 'goats' }, { season: 2, kind: 'homegame', at: 'Moonball Stadium' }, { season: 3, kind: 'homegame', at: 'Moonball Stadium' }],
    commissions: ['port-run'],
    plan: ['Year 40: the ten-year review'],
  },
  {
    year: 10, name: 'Seven Hills, One Table', grant: 200,
    intro: [
      { who: 'sulo', text: 'The Council sits at last, all seven hills round one table. The table is on a slope. Everything slides to Plane Hill.' },
      { who: 'dewy', text: 'Two bridges, a ferry, a bus lane, a metro and a price. Listen. Almost music.' },
    ],
    tools: [],
    goal: { kind: 'approval', target: 48, text: 'Approval at 48 or more' },
    events: [{ season: 1, kind: 'ferryfest', at: 'Cat Market' }, { season: 2, kind: 'homegame', at: 'Moonball Stadium' }, { season: 3, kind: 'festival', at: 'Hilltop Market' }],
    plan: [],
  },
];
