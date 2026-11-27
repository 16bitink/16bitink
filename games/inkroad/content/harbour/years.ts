import type { YearDef } from '../../src/sim/types';

/** Old Harbour, years 11 to 20. The walls will not move, so people have to. */
export const HARBOUR_YEARS: readonly YearDef[] = [
  {
    year: 1, name: 'The Old Cross', cannotLose: true, grant: 60,
    intro: [
      { who: 'sulo', text: 'Old Harbour. Founded eight hundred years ago, by people with one donkey.' },
      { who: 'sulo', text: 'One cross in the middle, one traffic light. I bought it myself. It is very red.' },
      { who: 'dewy', text: 'No circle fits between these walls. But there used to be lanes on both sides. Somebody put flower pots in them.' },
    ],
    tools: ['street', 'avenue', 'remove', 'junction', 'oneway'], controls: ['yield', 'roundabout', 'signal'], parks: [], policies: [],
    coach: [
      { text: 'The old cross is red. Tap it and see who waits.', at: 'worstJunction', until: 'selected:junction' },
      { text: 'Draw the lost lane back: from the market lane down to the quay lane, left or right of the cross.', tool: 'street', until: 'built' },
      { text: 'A lane on the other side helps as much. The light itself can go, or learn better green.', at: 'worstJunction', until: 'wait' },
      { text: 'Thin lanes can also go one way each, as a pair.', tool: 'oneway', until: 'wait' },
    ],
    goal: { kind: 'wait@28,19', target: 12, text: 'Mean wait at the old cross under 12 s' },
    events: [{ season: 2, kind: 'fog' }],
    plan: ['Year 12: gabled houses in the old quarter', 'Year 13: the north road goes all the way round'],
  },
  {
    year: 2, name: 'Whose Space Is It', cannotLose: true, grant: 60,
    intro: [
      { who: 'miko', text: 'Visitors park outside every door. Residents sleep in their cars, in other streets.' },
      { who: 'miko', text: 'Paid bays for guests, permits for neighbours. And a meerkat on every corner.' },
    ],
    tools: ['kerb', 'parking'], parks: ['lot'], policies: ['permits', 'inspectors'],
    coach: [{ text: 'Mark paid bays inside the walls, then give residents permits at the review.', tool: 'kerb', until: 'review' }],
    goal: { kind: 'foundIn@Old Quarter', target: 75, text: '75 of 100 drivers find a space in the old quarter' },
    events: [{ season: 1, kind: 'herring', at: 'Herring Market' }],
    plan: ['Year 13: the north road goes all the way round', 'Year 14: offices at the north gate, and the quay opens'],
  },
  {
    year: 3, name: 'The Ding Line', grant: 80,
    intro: [
      { who: 'juma', text: 'A tram fits where a bus gets stuck. It also says ding. I have waited years to say ding.' },
      { who: 'sulo', text: 'The Council pays 60 of every 100 coins, and all of the bell.' },
    ],
    tools: ['tram'],
    coach: [{ text: 'Draw a tram from one side, through the walls, to the other.', tool: 'tram', until: 'toolPicked:tram' }],
    goal: { kind: 'bar:trips', target: 58, text: 'Trips at 58 or more' },
    events: [{ season: 0, kind: 'swans' }, { season: 3, kind: 'snow' }],
    commissions: ['tram-bell'],
    plan: ['Year 14: offices at the north gate, and the quay opens', 'Year 15: a hospital in Ropewalk'],
  },
  {
    year: 4, name: 'Under the Cobbles', grant: 90,
    intro: [
      { who: 'miko', text: 'There is no room above the ground. There is a great deal of room below it.' },
      { who: 'pim', text: 'Digging under eight hundred years costs eight hundred feelings. And coins.' },
    ],
    tools: ['bus'], parks: ['under'], policies: ['truckHours'],
    coach: [{ text: 'An underground car park near the market takes cars off the lanes.', tool: 'parking', until: 'toolPicked:parking' }],
    goal: { kind: 'double', target: 5, text: 'At most 5 double-parked cars a day' },
    events: [{ season: 2, kind: 'cruise', at: 'Old Weigh House' }],
    commissions: ['quiet-fines'],
    plan: ['Year 15: a hospital in Ropewalk', 'Year 16: more offices at the north gate'],
  },
  {
    year: 5, name: 'The Trial', grant: 90,
    intro: [
      { who: 'sulo', text: 'A charge to drive into the old quarter. Everybody hates it. Nobody has tried it.' },
      { who: 'pim', text: 'Try it for a season, then let them vote. People hate it most the day before it starts.' },
    ],
    tools: ['zone'],
    coach: [{ text: 'Set the zone charge at a review, let people feel a season of it, then call the vote.', tool: 'zone', until: 'review' }],
    goal: { kind: 'support', target: 50, text: 'Half the city supports the charge' },
    events: [{ season: 1, kind: 'swans' }],
    commissions: ['tram-habit'],
    plan: ['Year 16: more offices at the north gate', 'Year 17: flats on the sea side'],
  },
  {
    year: 6, name: 'The Square', grant: 100,
    intro: [
      { who: 'dewy', text: 'Close a street to cars and something odd happens. People come.' },
      { who: 'juma', text: 'And geese. Mostly geese.' },
    ],
    tools: ['square'], policies: ['nightWorks'],
    coach: [{ text: 'Find a lane the cars can do without and make it a square.', tool: 'square', until: 'built' }],
    goal: { kind: 'bar:streets', target: 72, text: 'Streets at 72 or more' },
    events: [{ season: 2, kind: 'herring', at: 'Herring Market' }, { season: 3, kind: 'snow' }],
    plan: ['Year 17: flats on the sea side', 'Year 18: big offices in Ropewalk'],
  },
  {
    year: 7, name: 'The Heron Boat', grant: 110,
    intro: [
      { who: 'juma', text: 'The shortest way across town has always been the wet one.' },
    ],
    tools: ['boat'], policies: ['taxis'],
    coach: [{ text: 'Tap quays along the water to run a boat line. No road needed.', tool: 'boat', until: 'toolPicked:boat' }],
    goal: { kind: 'riders', target: 1400, text: '1400 riders in a season' },
    events: [{ season: 0, kind: 'cruise', at: 'Old Weigh House' }, { season: 2, kind: 'cruise', at: 'Old Weigh House' }],
    commissions: ['green-share'],
    plan: ['Year 18: big offices in Ropewalk', 'Year 19: the arena, and flats at the north gate'],
  },
  {
    year: 8, name: 'Below the Wall', grant: 120,
    intro: [
      { who: 'dewy', text: 'No decks over old roofs. But one turn can go under the ground, quietly.' },
      { who: 'sulo', text: 'If you find a ship down there, it is mine.' },
    ],
    tools: ['underpass'], parks: ['multi'],
    coach: [{ text: 'Outside the walls, dive the worst turn under its junction.', at: 'worstJunction', tool: 'underpass', until: 'toolPicked:underpass' }],
    goal: { kind: 'worstWait', target: 14, text: 'No busy junction over 14 s' },
    events: [{ season: 1, kind: 'pipe' }, { season: 3, kind: 'fog' }],
    commissions: ['port-run'],
    plan: ['Year 19: the arena, and flats at the north gate', 'Year 20: the city turns a thousand'],
  },
  {
    year: 9, name: 'Leave It Outside', grant: 130,
    intro: [
      { who: 'miko', text: 'Park outside the walls, ride in. The seals have done it for years.' },
    ],
    tools: ['buslane'], parks: ['ride'],
    coach: [{ text: 'Build a park and ride beside a tram or bus stop outside the walls.', tool: 'parking', until: 'toolPicked:parking' }],
    goal: { kind: 'share', target: 20, text: '20 of 100 trips by tram, bus or boat' },
    events: [{ season: 0, kind: 'football', at: 'Foghorn Arena' }, { season: 3, kind: 'football', at: 'Foghorn Arena' }],
    commissions: ['office-run'],
    plan: ['Year 20: the city turns a thousand'],
  },
  {
    year: 10, name: 'A Thousand Candles', grant: 150,
    intro: [
      { who: 'sulo', text: 'Eight hundred years, I said. I miscounted. We are a thousand, and there is cake.' },
      { who: 'dewy', text: 'Every guest is coming through the same three gates. I can hear them singing already.' },
    ],
    tools: [],
    goal: { kind: 'approval', target: 48, text: 'Approval at 48 or more' },
    events: [
      { season: 0, kind: 'cruise', at: 'Old Weigh House' }, { season: 1, kind: 'herring', at: 'Herring Market' },
      { season: 2, kind: 'birthday', at: 'Old Weigh House' }, { season: 3, kind: 'birthday', at: 'Old Weigh House' },
    ],
    plan: [],
  },
];
