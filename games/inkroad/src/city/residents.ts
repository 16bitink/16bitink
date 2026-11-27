import type { CityDef } from '../sim/types';
import { RULE_COMPLAINTS, RULE_RESIDENTS, RULE_WORDS } from './rules/texts';

/** Named residents. `animal` is the portrait key. */
export interface Resident { readonly name: string; readonly animal: string }
const R = (name: string, animal: string): Resident => ({ name: `${name} the ${animal.replace('sandcat', 'sand cat').replace('jerboa2', 'jerboa')}`, animal });

export const RESIDENTS: readonly Resident[] = [
  R('Hamda', 'hedgehog'), R('Rashid', 'gazelle'), R('Noura', 'owl'), R('Filippa', 'flamingo'), R('Omar', 'oryx'), R('Salma', 'sandcat'),
  R('Gigi', 'gecko'), R('Pablo', 'pelican'), R('Jory', 'jerboa2'), R('Dalia', 'flamingo'), R('Tariq', 'pelican'), R('Bibi', 'owl'),
  R('Karim', 'hedgehog'), R('Layla', 'gazelle'), R('Otto', 'owl'), R('Fadi', 'flamingo'), R('Olga', 'oryx'), R('Sami', 'sandcat'),
  R('Gus', 'gecko'), R('Perla', 'pelican'), R('Juno', 'jerboa2'), R('Dodo', 'oryx'), R('Tala', 'gazelle'), R('Bruno', 'gecko'),
];

/** Old Harbour's people. */
export const NORTH_RESIDENTS: readonly Resident[] = [
  R('Bertil', 'badger'), R('Ottilie', 'otter'), R('Gunnar', 'goose'), R('Selma', 'seal'), R('Stellan', 'stork'),
  R('Britta', 'badger'), R('Oskar', 'otter'), R('Greta', 'goose'), R('Sven', 'seal'), R('Signe', 'stork'), R('Harriet', 'hedgehog'), R('Olle', 'owl'),
];

const BY_STYLE: Readonly<Partial<Record<CityDef['style'], readonly Resident[]>>> = { ...RULE_RESIDENTS, oldtown: NORTH_RESIDENTS };
/** Local colour in the lines: {tree}, {snack}, {dust}. */
const WORDS: Readonly<Partial<Record<CityDef['style'], Readonly<Record<string, string>>>>> = { ...RULE_WORDS, oldtown: { tree: 'lamp post', snack: 'herring', plant: 'geranium', dust: 'cobble dust' } };
const GULF_WORDS: Readonly<Record<string, string>> = { tree: 'palm tree', snack: 'dates', plant: 'cactus', dust: 'dust' };

export function residentFor(seed: number, style: CityDef['style']): Resident {
  const list = BY_STYLE[style] ?? RESIDENTS;
  return list[Math.abs(Math.floor(seed)) % list.length]!;
}

export function localise(text: string, style: CityDef['style']): string {
  return text.replace(/\{(tree|snack|plant|dust)\}/g, (_, k: string) => (WORDS[style] ?? GULF_WORDS)[k] ?? '');
}

/** Complaint lines by kind. {place} is a real name on the map, {n} a number from the trip. */
export const COMPLAINTS: Readonly<Record<string, readonly string[]>> = {
  ...RULE_COMPLAINTS,
  late: [
    '{n} minutes from {place}. I learned a language in that queue.',
    'I left {place} with hot soup. I arrived with cold soup and opinions.',
    'The queue near {place} now has its own postcode.',
    'My horn is tired. My horn lives near {place}.',
    'I waved at the same {tree} for {n} minutes. We are friends now.',
  ],
  gaveUp: [
    'I turned the engine off near {place} and walked home. The car is still there, I think.',
    'Near {place} I gave up. My shopping melted. It was chairs.',
    'I got so stuck near {place} that I unpacked my lunch. And my dinner.',
  ],
  stayed: [
    'I wanted to leave {place}. Then I looked at the road. I have taken up knitting.',
    'Too dear, too slow. I stayed in {place} and watered the {plant}. Twice.',
  ],
  search: [
    'I went round {place} three times. The pigeons know my car.',
    'Found a space near {place}! Then I woke up.',
    'Parking at {place} is a sport and I am not sporty.',
  ],
  walk: [
    'I parked {n} cells from {place}. I have walked less on holiday.',
    'Nice car park. Shame that {place} is in another climate.',
  ],
  illegal: [
    'Someone parked across my door in {place}. It was also me.',
    'Two cars deep outside {place}. One of them has a nest in it.',
  ],
  none: [
    'No space at {place}. I drove home with my empty bag and my full feelings.',
    '{place} is full. I know because I read every bumper twice.',
  ],
  pay: [
    '{n} coins for one trip to {place}. Does the car get a massage?',
    'I paid {n} coins to visit {place}. I only wanted an onion.',
  ],
  home: [
    'I pay to sleep in {place}. Well, my car does.',
    'Charging people outside their own door in {place}? My door is upset.',
  ],
  fine: [
    'Fined {n} coins at {place}. I was only there for a small emotion.',
    'Cash machine! I said it! At {place}! {n} coins!',
    'The meerkat at {place} smiled while writing my ticket.',
  ],
  noise: [
    'The road by {place} hums all night. I now hum too.',
    'My tea has waves. I live in {place}, not on a boat.',
  ],
  works: [
    'They are digging near {place}. They found a pipe and a sandal.',
    'There is {dust} in {place}, {dust} in the bed, {dust} in the {snack}.',
  ],
  worn: [
    'The road by {place} is all holes. I drive it every day, slowly, like a waiter with soup.',
    'The road by {place} is crumbling. I can feel every crack in my teeth.',
    'My car rattles all the way down the road by {place}. So do I.',
  ],
  pothole: [
    'A hole on the road by {place} ate my wheel. It is still hungry.',
    'There is a hole by {place} so deep the ducks swim in it.',
  ],
  crash: ['Bent bumper near {place}. Everyone got out to look at it. Everyone.'],
  happy: [
    'I got from {place} to work without humming. I missed the humming.',
    'Nothing to report from {place}. It worries me.',
    'I arrived so early that nobody in {place} was ready for me.',
  ],
};

/** What a driver says, by what the car is doing. */
export const DRIVER_LINES: Readonly<Record<string, readonly string[]>> = {
  stuck: ['I have been here so long I pay rent.', 'If I sing louder, will it move?', 'That goose cut in. I saw it.', 'I can see {to}. I could throw {snack} at it.'],
  searching: ['One space. One small space. Please.', 'Is she leaving? She is not leaving.', 'I will circle {to} until morning if I must.'],
  doubled: ['Two minutes! I have the blinkers on!', 'It is not parking if you leave the door open.'],
  broken: ['The engine says no.', 'I am not blocking the road. I am decorating it.'],
  work: ['To {to}. My boss is an ostrich. Early ostrich.', 'Off to {to}. Meeting at nine about the meeting at ten.'],
  school: ['School run to {to}. Three children, one left shoe.', 'We are not late for {to}. We are early for tomorrow.'],
  shop: ['To {to} for one thing. I will come home with nine.', 'They have new lamps at {to}. I have old lamps. You see the problem.'],
  visit: ['Visiting my aunt at {to}. She has soup. Too much soup.', 'Just out for a drive to {to}. Do not tell my legs.'],
  through: ['Only passing through. Lovely queue you have.', 'From {from} to {to}. Your city is in the way.'],
  truck: ['Forty boxes of rugs for {to}. They tickle.', 'Wide load, narrow street, calm driver.'],
  event: ['To {to}! I painted my ears for this!', 'Everyone is going to {to}. I checked. They are all in front of me.'],
  home: ['Home to {to}. Slippers. At last.', 'Long day. The couch at {to} remembers my shape.'],
  bus: ['Next stop: somewhere dry.', 'I stop for everyone. Even geese.'],
  tram: ['Ding. That is all I am allowed to say.'],
  taxi: ['I know a short cut. It is closed.', 'Good conversation, reasonable price, no silence.'],
};
