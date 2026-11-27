import type { YearDef } from '../../src/sim/types';

/** Twin Isles, years 21 to 30. There is no more land, so everything else has a price. */
export const ISLES_YEARS: readonly YearDef[] = [
  {
    year: 1, name: 'The Only Bridge', cannotLose: true, grant: 65,
    intro: [
      { who: 'sulo', text: 'Two islands, one bridge. I have been on it since breakfast. Please send breakfast.' },
      { who: 'dewy', text: 'Both ends of the bridge are red. Land here costs more than the road on top of it.' },
    ],
    tools: ['street', 'avenue', 'remove', 'junction'], controls: ['yield', 'roundabout', 'signal'], parks: [], policies: [],
    coach: [
      { text: 'Tap the red crossing by the bridge and read the arrows.', at: 'worstJunction', until: 'selected:junction' },
      { text: 'Fix the crossing first. A crossing is cheaper than an island.', at: 'worstJunction', tool: 'junction', until: 'controlChanged' },
    ],
    goal: { kind: 'wait@14,14', target: 11, text: 'Mean wait at the west crossing under 11 s' },
    events: [{ season: 2, kind: 'downpour' }],
    plan: ['Year 22: the Silk Market on the east isle', 'Year 23: flats on both south shores, and Star Offices'],
  },
  {
    year: 2, name: 'Down Is the New Up', grant: 70,
    intro: [
      { who: 'miko', text: 'A space on the ground costs a fortune here. A space under the ground costs half a fortune.' },
      { who: 'miko', text: 'We dig. Meerkats were made for this.' },
    ],
    tools: ['kerb', 'parking'], parks: ['lot', 'under'], policies: ['permits', 'inspectors'],
    coach: [{ text: 'Look at the land in the price. An underground car park pays for far less of it.', at: 'market', tool: 'parking', until: 'toolPicked:parking' }],
    goal: { kind: 'found@market', target: 70, text: '70 of 100 drivers find a space at the markets' },
    events: [{ season: 1, kind: 'noodles', at: 'Lantern Market' }],
    commissions: ['isles-doors'],
    plan: ['Year 23: flats on both south shores, and Star Offices', 'Year 24: the airfield causeway, a hospital, and car licences'],
  },
  {
    year: 3, name: 'Room for Forty', grant: 75,
    intro: [
      { who: 'juma', text: 'One bus is as long as two cars and holds forty residents. Thirty eight if they bring noodles.' },
      { who: 'dewy', text: 'Give them another way across now. Next year we make cars dear.' },
    ],
    tools: ['bus', 'buslane'],
    coach: [{ text: 'Run a bus from the west homes, over the bridge, to the offices.', tool: 'bus', until: 'toolPicked:bus' }],
    goal: { kind: 'riders', target: 240, text: '240 riders in a season' },
    events: [{ season: 0, kind: 'lanterns', at: 'Lantern Market' }, { season: 3, kind: 'downpour' }],
    plan: ['Year 24: the airfield causeway, a hospital, and car licences', 'Year 25: the tunnel, and offices in the north east'],
  },
  {
    year: 4, name: 'A Licence to Drive', grant: 80,
    intro: [
      { who: 'pim', text: 'From now on a car needs a licence, and we sell them at an auction. With a hammer!' },
      { who: 'pim', text: 'Sell few and the roads breathe, but cars get dear. Sell many and I can buy a bigger hammer.' },
      { who: 'sulo', text: 'You choose how many at the end of each year. One in ten runs out every year.' },
    ],
    tools: [], policies: ['truckHours'],
    coach: [{ text: 'At the year\'s end, set how many licences to sell. The desk shows the price they will fetch.', until: 'review' }],
    goal: { kind: 'lost', target: 6, text: 'At most 6 of 100 trips lost' },
    events: [{ season: 2, kind: 'yachts', at: 'Silk Market' }],
    commissions: ['isles-ride'],
    plan: ['Year 25: the tunnel, and offices in the north east', 'Year 26: a west side road and its flats'],
  },
  {
    year: 5, name: 'The Wet Short Cut', grant: 90,
    intro: [
      { who: 'sulo', text: 'The tunnel is open. It is dry. Please stop asking if it is dry.' },
      { who: 'dewy', text: 'Now two crossings feed the same streets. Turns can dive too, and a dive needs hardly any land.' },
    ],
    tools: ['underpass'], policies: ['nightWorks'],
    coach: [{ text: 'Tap the worst junction, then drag its reddest arrow to send that turn under the ground.', at: 'worstJunction', tool: 'underpass', until: 'toolPicked:underpass' }],
    goal: { kind: 'worstWait', target: 14, text: 'No busy junction over 14 s' },
    events: [{ season: 1, kind: 'breakdown', at: 'bridge' }, { season: 3, kind: 'noodles', at: 'Lantern Market' }],
    commissions: ['office-run'],
    plan: ['Year 26: a west side road and its flats', 'Year 27: the port, and an east side road'],
  },
  {
    year: 6, name: 'Prices With Eyes', grant: 95,
    intro: [
      { who: 'pim', text: 'A toll that watches the road. Slow road, price up. Fast road, price down. Nobody to shout at!' },
      { who: 'dewy', text: 'All the gates talk on one wire. Keep the crossings moving and leave one way that is free.' },
    ],
    tools: ['toll'],
    coach: [{ text: 'Put a gate on the bridge or in the tunnel and let it follow the speed.', tool: 'toll', until: 'toolPicked:toll' }],
    goal: { kind: 'speedKept', target: 75, text: 'Watched roads keep their speed 75 of 100 rush minutes' },
    events: [{ season: 0, kind: 'downpour' }, { season: 2, kind: 'lanterns', at: 'Lantern Market' }],
    commissions: ['isles-flow'],
    plan: ['Year 27: the port, and an east side road', 'Year 28: flats and offices at the bridge end'],
  },
  {
    year: 7, name: 'Everyone Has a Shore', grant: 105,
    intro: [
      { who: 'juma', text: 'Nobody here lives more than ten minutes from the sea. The sea has no junctions.' },
    ],
    tools: ['boat'], policies: ['taxis'],
    coach: [{ text: 'Tap quays on both isles to run a boat between them.', tool: 'boat', until: 'toolPicked:boat' }],
    goal: { kind: 'share', target: 20, text: '20 of 100 trips by bus or boat' },
    events: [{ season: 1, kind: 'regatta', at: 'Pearl Port' }, { season: 3, kind: 'yachts', at: 'Pearl Port' }],
    commissions: ['isles-fewer'],
    plan: ['Year 28: flats and offices at the bridge end', 'Year 29: the glass tower on the east shore'],
  },
  {
    year: 8, name: 'The Big Dig', grant: 115,
    intro: [
      { who: 'juma', text: 'A metro under the sea. The fish have filed a complaint. It is in bubbles.' },
      { who: 'pim', text: 'The Council pays 60 of every 100 coins. I am already faint about the other 40.' },
    ],
    tools: ['metro'], parks: ['multi', 'ride'],
    coach: [{ text: 'Draw the metro where the two crossings are fullest. It takes three seasons.', tool: 'metro', until: 'toolPicked:metro' }],
    goal: { kind: 'onTime', target: 60, text: '60 of 100 trips on time' },
    events: [{ season: 0, kind: 'noodles', at: 'Silk Market' }, { season: 2, kind: 'pipe' }],
    commissions: ['green-share'],
    plan: ['Year 29: the glass tower on the east shore', 'Year 30: the islands hold their Boat Week'],
  },
  {
    year: 9, name: 'A Street for Feet', grant: 130,
    intro: [
      { who: 'dewy', text: 'We have dug, priced and floated. Now try less road. I can hear somebody playing a flute.' },
      { who: 'miko', text: 'It is me. I had a free hour. An hour, Director!' },
    ],
    tools: ['square'],
    coach: [{ text: 'Find a street the cars can do without and give it to the feet.', tool: 'square', until: 'built' }],
    goal: { kind: 'bar:streets', target: 68, text: 'Streets at 68 or more' },
    events: [{ season: 1, kind: 'lanterns', at: 'Silk Market' }, { season: 3, kind: 'downpour' }],
    commissions: ['port-run'],
    plan: ['Year 30: the islands hold their Boat Week'],
  },
  {
    year: 10, name: 'Two Isles, One City', grant: 150,
    intro: [
      { who: 'sulo', text: 'Boat Week. Every guest comes by causeway, which I feel misses the point.' },
      { who: 'dewy', text: 'Bridge, tunnel, boat, train and a price that watches. Listen. Almost music.' },
    ],
    tools: [],
    goal: { kind: 'approval', target: 50, text: 'Approval at 50 or more' },
    events: [
      { season: 1, kind: 'regatta', at: 'Pearl Port' },
      { season: 2, kind: 'regatta', at: 'Pearl Port' }, { season: 3, kind: 'lanterns', at: 'Lantern Market' },
    ],
    plan: [],
  },
];
