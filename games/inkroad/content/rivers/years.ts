import type { YearDef } from '../../src/sim/types';

/** Cross Rivers, years 41 to 50. Everything is old, so every year something wears out and the freeway is the last idea. */
export const RIVERS_YEARS: readonly YearDef[] = [
  {
    year: 1, name: 'Built to Last Forty Years', cannotLose: true, grant: 80,
    intro: [
      { who: 'sulo', text: 'All our roads were built in one great summer. Forty one years ago. The warranty was forty.' },
      { who: 'dewy', text: 'The freeway meets the main street and nobody gives way. I can hear the bridge thinking. Bridges should not think.' },
    ],
    tools: ['street', 'avenue', 'remove', 'junction'], controls: ['yield', 'roundabout', 'signal'], parks: [], policies: ['truckHours'],
    coach: [
      { text: 'Tap the red crossing where the freeway meets the main street and read the arrows.', at: 'worstJunction', until: 'selected:junction' },
      { text: 'The freeway queue is one long arrow. A signal shares the turns; a roundabout would starve it.', at: 'worstJunction', tool: 'junction', until: 'controlChanged' },
      { text: 'Tap a worn road. A repair now costs a third of a new road later.', until: 'wait' },
    ],
    goal: { kind: 'worstWait', target: 14, text: 'No busy junction over 14 s' },
    events: [{ season: 3, kind: 'thaw' }],
    plan: ['Year 42: the old bridges get their check', 'Year 43: the Council pays for bridges'],
  },
  {
    year: 2, name: 'The Bridge Check', grant: 90,
    intro: [
      { who: 'pim', text: 'The inspector tapped the bridge with a hammer. The bridge tapped back. Mend it at half worn and it is cheap. Wait, and I buy a whole bridge. A bridge!' },
      { who: 'miko', text: 'Somebody has parked in a pothole. It fits perfectly. I gave it a ticket anyway.' },
    ],
    tools: ['kerb', 'parking'], parks: ['lot'], policies: ['nightWorks', 'permits'],
    coach: [
      { text: 'Tap the oldest bridge and repair it before it stops carrying lorries.', until: 'review' },
      { text: 'Night works cost more but nobody has to watch them. Permits keep residents off the shop spaces.', until: 'review' },
    ],
    goal: { kind: 'condition', target: 56, text: 'Roads at 56 of 100 on average' },
    events: [{ season: 1, kind: 'parade', at: 'Bean Market' }, { season: 3, kind: 'thaw' }],
    plan: ['Year 43: the Council pays for bridges', 'Year 44: the downtown car parks crack'],
  },
  {
    year: 3, name: 'Sixty of a Hundred', grant: 100,
    intro: [
      { who: 'pim', text: 'The Council will pay sixty of every hundred for a new bridge. Only this year and the next. I have circled it on the calendar. Twice.' },
      { who: 'juma', text: 'A bus does not mind a bridge. It minds a bridge that is closed.' },
    ],
    tools: ['bus', 'buslane'],
    coach: [
      { text: 'Replace the bridge now. The Council pays most of it while the grant lasts.', until: 'review' },
      { text: 'A bus line over the other bridge keeps the cars away from the weak one.', tool: 'bus', until: 'toolPicked:bus' },
    ],
    goal: { kind: 'condition', target: 60, text: 'Roads at 60 of 100 on average' },
    events: [{ season: 0, kind: 'thaw' }, { season: 2, kind: 'parade', at: 'Bean Market' }],
    commissions: ['rivers-mend'],
    plan: ['Year 44: the downtown car parks crack', 'Year 45: the tram comes back'],
  },
  {
    year: 4, name: 'Craters Downtown', grant: 110,
    intro: [
      { who: 'miko', text: 'The market car park has craters. A small hatchback went in on Monday. We heard it say sorry.' },
      { who: 'sulo', text: 'Please do not charge them for the hole. I charged them for the hole in year one and the letters came in boxes.' },
    ],
    tools: ['oneway'], parks: ['multi'], policies: ['inspectors'],
    coach: [{ text: 'Open the market and look at how far people walk. Fix the car park, then set the price.', at: 'market', tool: 'parking', until: 'toolPicked:parking' }],
    goal: { kind: 'found@market', target: 60, text: '60 of 100 drivers find a space at the market' },
    events: [{ season: 1, kind: 'parade', at: 'Bean Market' }, { season: 3, kind: 'snow' }],
    commissions: ['quiet-fines'],
    plan: ['Year 45: the tram comes back', 'Year 46: the freeway is allowed to go'],
  },
  {
    year: 5, name: 'The Tram Comes Back', grant: 120,
    intro: [
      { who: 'juma', text: 'We had trams once. They were sold for scrap and for the bell. I kept the bell. It is in my hump.' },
      { who: 'pim', text: 'Rails are dear. The Council pays sixty of every hundred, and I pay the rest in sighs.' },
    ],
    tools: ['tram'], policies: ['taxis'],
    coach: [{ text: 'Run a tram along the main street, from the west homes to the offices.', tool: 'tram', until: 'toolPicked:tram' }],
    goal: { kind: 'riders', target: 150, text: '150 riders in a season' },
    events: [{ season: 0, kind: 'fog' }, { season: 2, kind: 'parade', at: 'Bean Market' }],
    commissions: ['tram-bell'],
    plan: ['Year 46: the freeway is allowed to go', 'Year 47: the stadium and a second bridge'],
  },
  {
    year: 6, name: 'The Noisy Cut', grant: 130,
    intro: [
      { who: 'dewy', text: 'The freeway is loud. The people living next to it are louder. The ducks, who live under it, are the loudest.' },
      { who: 'sulo', text: 'The Council has voted that one piece may go. I abstained. I was late.' },
    ],
    tools: ['boulevard'],
    coach: [{ text: 'Pick one piece of the freeway and make it a boulevard. People grumble first and stroll later.', tool: 'boulevard', until: 'toolPicked:boulevard' }],
    goal: { kind: 'freeway', target: 1, text: 'One piece of freeway turned into a boulevard' },
    events: [{ season: 1, kind: 'rain' }, { season: 3, kind: 'homegame', at: 'Cornfield Stadium' }],
    plan: ['Year 47: the stadium and a second bridge', 'Year 48: the dip, then the rise'],
  },
  {
    year: 7, name: 'The Dip', grant: 140,
    intro: [
      { who: 'dewy', text: 'Digging a freeway up is a bit like a haircut. It looks awful until the third day.' },
      { who: 'sulo', text: 'Approval will dip while it is dug. Hold your nerve. Hold mine too, if you are passing.' },
    ],
    tools: ['square'],
    coach: [{ text: 'Cars that lose the freeway go somewhere. Give them a better street before the grass grows.', until: 'review' }],
    goal: { kind: 'lost', target: 12, text: 'At most 12 of 100 trips lost' },
    events: [{ season: 2, kind: 'breakdown', at: 'bridge' }, { season: 3, kind: 'homegame', at: 'Cornfield Stadium' }],
    commissions: ['office-run'],
    plan: ['Year 48: the dip, then the rise', 'Year 49: the old mill becomes offices'],
  },
  {
    year: 8, name: 'High Water', grant: 150,
    intro: [
      { who: 'dewy', text: 'The two rivers met in the underpass overnight. They shook hands and stayed.' },
      { who: 'miko', text: 'Three cars floated out. We gave them parking tickets. They were too wet to argue.' },
    ],
    tools: ['underpass'], parks: ['ride'],
    coach: [{ text: 'Dive a turn under the busiest crossing, but keep a way round for the days the water rises.', at: 'worstJunction', tool: 'underpass', until: 'toolPicked:underpass' }],
    goal: { kind: 'worstWait', target: 14, text: 'No busy junction over 14 s' },
    events: [{ season: 1, kind: 'downpour' }, { season: 2, kind: 'pipe' }, { season: 3, kind: 'homegame', at: 'Cornfield Stadium' }],
    commissions: ['port-run'],
    plan: ['Year 49: the old mill becomes offices', 'Year 50: the ten year review'],
  },
  {
    year: 9, name: 'The Mill Gets a Desk', grant: 160,
    intro: [
      { who: 'sulo', text: 'The old mill is now offices. The mill wheel is now a very slow lift. The flour is now filing.' },
      { who: 'pim', text: 'Four hundred new workers, one road. A gate that charges at the peak and nowhere else could spread them out.' },
    ],
    tools: ['toll'],
    coach: [{ text: 'A toll in the rush hour moves people to the bus, the tram or a later start.', tool: 'toll', until: 'toolPicked:toll' }],
    goal: { kind: 'share', target: 10, text: '10 of 100 trips by bus or tram' },
    events: [{ season: 0, kind: 'rain' }, { season: 2, kind: 'parade', at: 'Bean Market' }],
    commissions: ['tram-habit'],
    plan: ['Year 50: the ten year review'],
  },
  {
    year: 10, name: 'Where the Rivers Meet', grant: 180,
    intro: [
      { who: 'sulo', text: 'Ten years of review. The freeway is a boulevard, the bridges are new, and I was only late twice.' },
      { who: 'dewy', text: 'Listen. A bridge that does not creak, a street that does not roar. Almost silence.' },
    ],
    tools: [],
    goal: { kind: 'approval', target: 46, text: 'Approval at 46 or more' },
    events: [{ season: 1, kind: 'homegame', at: 'Cornfield Stadium' }, { season: 2, kind: 'parade', at: 'Bean Market' }, { season: 3, kind: 'snow' }],
    plan: [],
  },
];
