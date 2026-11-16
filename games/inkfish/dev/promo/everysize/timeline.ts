import { FPS_LONG } from '../descent/frame';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Sections follow
 * script.md's blocks, 0-based: 0 cold open, 1 larva, 2 one inch, 3 sardine,
 * 4 the game, 5 mackerel, 6 tuna, 7 you, 8 great white, 9 blue whale,
 * 10 the second twist and the close.
 */

const bare = (s: string): string => s.toLowerCase().replace(/[^a-z0-9'-]/g, '');

/** When `text` is first said at or after `after` seconds (a word or a few words in a row). */
export function said(text: string, after = 0): number {
  const want = text.split(/\s+/).map(bare);
  for (let i = 0; i + want.length <= WORDS.length; i++) {
    if (WORDS[i]!.start < after) continue;
    if (want.every((w, k) => bare(WORDS[i + k]!.text) === w)) return WORDS[i]!.start;
  }
  throw new Error(`"${text}" isn't said after ${after}s`);
}

/** When the last word of `text` (first said at or after `after`) ends. */
export function saidEnd(text: string, after = 0): number {
  const n = text.split(/\s+/).length;
  const at = said(text, after);
  const i = WORDS.findIndex((w) => w.start === at);
  return WORDS[i + n - 1]!.end;
}

const s = (i: number): number => SECTIONS[i]!.start;

/** How long the end card holds after the last word: YouTube's shortest end screen. */
export const END_HOLD_S = 5;
export const LAST_WORD_S = Math.max(WORDS[WORDS.length - 1]!.end, VOICE_S - 0.2);
export const VIDEO_S = Math.round((LAST_WORD_S + END_HOLD_S) * FPS_LONG) / FPS_LONG;

const after = (text: string, from: string, at: number): number => said(text, said(from, at));

export const T = {
  // 0 · cold open
  whale: said('blue whale'),
  orcas: said('pack of orcas'),
  howLong: said('how long would'),
  youreThis: said("you're this"),
  larva0: said('a fish larva'),
  grow: said("you're going to grow"),
  real: said('real measurements'),
  watch: said('watch for'),
  oneSize: said('at one size'),
  veryTop: said('at the very top'),
  // 1 · the larva
  okay: said('okay', s(1)),
  eyes: said('mostly eyes'),
  bigger: said('bigger than you'),
  jelly: said('some jellyfish'),
  digest: said('three hours'),
  scientists: said('when scientists', s(1)),
  half: said('half of them'),
  fc1: said('so your forecast'),
  stamp1a: said('twelve days'),
  stamp1b: said('three in ten'),
  everyPerson: said('if every person'),
  two: said('about two of us'),
  eggs: said('lot of eggs'),
  // 2 · one inch
  inch: said('one inch'),
  x300: said('three hundred times'),
  swim: said('swim away'),
  stamp2a: said('sixty days'),
  stamp2b: said('one point four'),
  notice: said('notice something'),
  rule: said("it's a rule"),
  // 3 · the sardine
  four: said('four inches'),
  sardine: said("you're a sardine"),
  millions: said('by the millions'),
  coast: said('coast of south africa'),
  run: said('the sardine run'),
  safety: said('safety in numbers'),
  who: said("here's who"),
  gannets: said('cape gannets'),
  sharks: said('sharks and big'),
  dolphins: said('common dolphins'),
  ball: said('into a ball'),
  thanks: said('thanks team'),
  fc3: said('your forecast', s(3)),
  stamp3a: said('five months'),
  stamp3b: said('twenty-one percent'),
  // 4 · the game
  game: s(4),
  inkfish: said('InkFish', s(4)),
  eat: said('you eat'),
  site: said('16bit.ink', s(4)),
  changes: said('something changes'),
  // 5 · the mackerel and the rule
  foot: said('one foot'),
  mackerel: said("you're a mackerel"),
  bluefin: said('bluefin tuna love'),
  topMeals: said('top meals'),
  stamp4a: said('about a year'),
  stamp4b: said('fifty-six percent'),
  thatRule: said('now that rule'),
  tenTimes: said('ten times heavier', s(5)),
  halves: said('roughly halves'),
  average: said("it's an average"),
  reason: said('the reason'),
  // 6 · the tuna
  threeFeet: said('three feet'),
  warmer: said('warmer than'),
  speed: said('built for speed'),
  gibraltar: said('strait of gibraltar'),
  orcasHunt: said('orcas that hunt'),
  stamp5a: said('three years'),
  stamp5b: said('eighty-one'),
  like: said('starting to like'),
  // 7 · you
  sixFeet: said('six feet'),
  you: said("that's you"),
  rule7: said('the rule says', s(7)),
  notFish: said("but you're not"),
  tiger: said('tiger sharks'),
  sevenHalf: said('seven and a half'),
  y2025: said('2025'),
  nine: said('nine people'),
  drowning: said('drowning'),
  k300: said('three hundred thousand'),
  mouth: said("isn't a mouth"),
  nothing: said('almost nothing'),
  safest: said('the safest size'),
  yours: said('is yours'),
  dontGo: said("just don't go in"),
  stops: said('stops getting safer'),
  // 8 · the great white
  fifteen: said('fifteen feet'),
  white: said("you're a great white"),
  rule8: said('the rule says', s(8)),
  stamp7a: said('twelve years'),
  longer: said('far longer'),
  stamp7b: said('seventy-three'),
  off: said('but off south africa'),
  five: said('five orcas'),
  won: said('they won'),
  notTop: said("isn't the top"),
  snack: said('snack of the top'),
  liver: said('oily liver'),
  // 9 · the blue whale
  now9: said('and now', s(9)),
  blue9: said('a blue whale', s(9)),
  stretch: said('stretch the rule'),
  stamp8a: said('forty-seven'),
  stamp8b: said('ninety-eight and a half'),
  untouchable: said('untouchable'),
  almost2: after('almost', 'untouchable', s(9)),
  march: said('in march'),
  fourteen: said('fourteen orcas'),
  killed: said('and killed it'),
  first: said('the first time'),
  notOrcas: said("orcas aren't"),
  // 10 · the second twist and the close
  people: said('people did'),
  whaling: said('whaling ships'),
  k360: said('three hundred and sixty thousand'),
  antarctic: said('antarctic blue'),
  k239: said('two hundred and thirty-nine'),
  low360: after('three hundred and sixty', 'thirty-nine', s(10)),
  fewer: said('fewer than'),
  banned: said('banned'),
  y1996: said('1996'),
  climbing: said('and climbing'),
  ladder: said('the whole ladder'),
  bigger10: said('bigger is safer'),
  every10: said('every ten times'),
  until: said('until you get'),
  dangerous: said('most dangerous'),
  which: said('which size'),
  climb: said('try the climb'),
  site2: said('16bit.ink', s(10)),
} as const;

export const sectionStart = s;
