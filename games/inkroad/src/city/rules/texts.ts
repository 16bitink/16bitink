import type { CityDef } from '../../sim/types';
import type { Resident } from '../residents';
import { BEACH_COMPLAINTS } from './beachTexts';

/** Words of cities 3 to 5: people, complaints, events, commissions, targets. Spread into the lists of the same shape in src/city. */
const r = (name: string, animal: string): Resident => ({ name: `${name} the ${animal}`, animal });

const ISLANDERS = [
  r('Mei', 'otter'), r('Kiki', 'gecko'), r('Tomo', 'pelican'), r('Suri', 'flamingo'), r('Bao', 'seal'), r('Lin', 'owl'),
  r('Pip', 'otter'), r('Nala', 'gecko'), r('Ronan', 'pelican'), r('Opal', 'flamingo'), r('Dex', 'seal'), r('Wen', 'stork'),
];
const HILL_PEOPLE = [
  r('Defne', 'goose'), r('Kemal', 'badger'), r('Lola', 'stork'), r('Pilar', 'owl'), r('Emre', 'hedgehog'), r('Rosa', 'goose'),
  r('Tito', 'badger'), r('Ines', 'otter'), r('Mirko', 'stork'), r('Zeki', 'hedgehog'), r('Luz', 'owl'), r('Vito', 'otter'),
];
const RIVER_PEOPLE = [
  r('Walt', 'goose'), r('Hazel', 'badger'), r('Clem', 'otter'), r('Dot', 'hedgehog'), r('Earl', 'owl'), r('Minnie', 'stork'),
  r('Buck', 'badger'), r('June', 'goose'), r('Hank', 'otter'), r('Pearl', 'owl'), r('Roy', 'hedgehog'), r('Lottie', 'stork'),
];
export const RULE_RESIDENTS: Readonly<Partial<Record<CityDef['style'], readonly Resident[]>>> = { islands: ISLANDERS, hills: HILL_PEOPLE, rivers: RIVER_PEOPLE };

export const RULE_WORDS: Readonly<Partial<Record<CityDef['style'], Readonly<Record<string, string>>>>> = {
  islands: { tree: 'rain tree', snack: 'noodles', plant: 'orchid', dust: 'tunnel mud' },
  hills: { tree: 'plane tree', snack: 'sesame ring', plant: 'tomato', dust: 'hill dust' },
  rivers: { tree: 'street light', snack: 'pancakes', plant: 'sunflower', dust: 'old concrete' },
};

export const RULE_COMPLAINTS: Readonly<Record<string, readonly string[]>> = {
  ...BEACH_COMPLAINTS,
  licence: [
    'A licence costs {n}. I sold my car to pay for the paper that says I may have a car.',
    '{n} coins for a licence in {place}! It does not even come with a mirror.',
    'My neighbour in {place} framed his licence. The car is in the cupboard.',
  ],
  mini: [
    'The minibus stopped near {place} to ask a pigeon if it was going downtown.',
    'A minibus stops wherever a paw is raised. I scratched my ear and now I am late.',
    'Near {place} the minibus and I have the same lane and different plans.',
  ],
  protest: [
    'The minibuses parked in the bus lane near {place} and sang. They know one song.',
    'A protest near {place}. The banner was too long, so it turned the corner.',
  ],
  pothole: [
    'There is a hole near {place}. I have seen fish in it.',
    'My wheel is in the hole near {place}. The rest of us went on without it.',
    'The road near {place} is mostly a memory of a road.',
  ],
  severed: [
    'My friend in {place} lives across the freeway. We wave. We have never met.',
    'In {place} we tell the time by the lorries. It is always lorry o\'clock.',
    'It is forty steps from {place} to the bakery, and forty minutes round the freeway.',
  ],
};

interface RuleEvent { readonly text: string; readonly crowd?: { readonly tours: number; readonly perYear: number; readonly from: number; readonly to: number }; readonly speed?: number; readonly at?: number }
export const RULE_EVENTS: Readonly<Record<string, RuleEvent>> = {
  downpour: { text: 'A warm downpour. The umbrellas have traffic jams of their own.', speed: 0.74 },
  regatta: { text: 'Boat race! Both islands drive to the water to watch people not drive.', crowd: { tours: 16, perYear: 2, from: 30, to: 80 } },
  lanterns: { text: 'Lantern week. Every family carries one very large paper fish.', crowd: { tours: 18, perYear: 2.2, from: 60, to: 88 } },
  noodles: { text: 'Noodle night. Nobody cooks, everybody parks.', crowd: { tours: 16, perYear: 2, from: 56, to: 86 } },
  yachts: { text: 'The yachts are in. Their owners arrive by car, one each.', crowd: { tours: 14, perYear: 1.5, from: 14, to: 60 } },
  ferryfest: { text: 'Strait day. Swimmers cross, everyone else drives to the towels.', crowd: { tours: 16, perYear: 2, from: 24, to: 78 } },
  goats: { text: 'Goats on the hill road. They have the right of way. They said so.', at: 24 },
  drizzle: { text: 'Wet cobbles. Cars go up the hill twice, once by accident.', speed: 0.72 },
  homegame: { text: 'Home game! Forty thousand people and one exit.', crowd: { tours: 18, perYear: 2, from: 60, to: 84 } },
  thaw: { text: 'The thaw has found every crack. The cracks are pleased.', speed: 0.8 },
  parade: { text: 'Harvest parade. The largest pumpkin takes both lanes.', crowd: { tours: 16, perYear: 2, from: 40, to: 80 } },
};

interface RuleCommission { readonly id: string; readonly title: string; readonly text: string; readonly goal: string; readonly kind: string; readonly target: number; readonly reward: number; readonly seasons: number }
export const RULE_COMMISSIONS: readonly RuleCommission[] = [
  { id: 'isles-doors', title: 'A Space for Every Umbrella', text: 'The market has a queue of cars with nobody in them. They are looking for space too.', goal: '75 of 100 find a space at the market', kind: 'found@market', target: 75, reward: 160, seasons: 5 },
  { id: 'isles-ride', title: 'Wet Feet Club', text: 'A councillor sold her car by mistake and needs a bus by Thursday.', goal: '12 of 100 trips by bus or boat', kind: 'share', target: 12, reward: 260, seasons: 6 },
  { id: 'isles-flow', title: 'Keep It Moving', text: 'The bridge has a nice view. Drivers have seen enough of it.', goal: 'Watched roads keep their speed 80 of 100 rush minutes', kind: 'speedKept', target: 80, reward: 320, seasons: 5 },
  { id: 'isles-fewer', title: 'Fewer Wheels', text: 'The Council counted the cars, then counted the land, then sat down.', goal: 'At most 52 of 100 homes\' trips own a car', kind: 'cars', target: 52, reward: 380, seasons: 6 },
  { id: 'hills-peace', title: 'A Quiet Corridor', text: 'Please turn the minibuses into something with a timetable.', goal: 'At most 1 private minibus', kind: 'minis', target: 1, reward: 260, seasons: 6 },
  { id: 'rivers-mend', title: 'Mend It First', text: 'The mayor\'s hat fell into a hole. The hole is winning.', goal: 'Roads at 65 of 100 on average', kind: 'condition', target: 65, reward: 280, seasons: 6 },
];
