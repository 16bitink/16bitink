import { FPS_LONG } from '../descent/frame';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens in "Shark Size Comparison… But Every Shark Is
 * Real", in seconds of the video, read off the narration (words.ts) so every
 * beat lands on the word that names it. Sections follow script.md's blocks,
 * 0-based: 0 cold open, 1 lanternshark + cookiecutter, 2 dogfish + blacktip,
 * 3 bull shark, 4 the game, 5 mako + hammerhead, 6 tiger, 7 Greenland,
 * 8 great white, 9 basking, 10 megalodon + whale shark, 11 the twist.
 * Scribe wrote numerals from block 8 on ("36 feet", "4.6", "2,000"): cues
 * use the words as transcribed, compared without punctuation.
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

export const sectionStart = (i: number): number => SECTIONS[i]!.start;
export const sectionEnd = (i: number): number => SECTIONS[i]!.end;
const s = sectionStart;

/** How long the end card holds after the last word: YouTube's shortest end screen. */
export const END_HOLD_S = 5;
export const LAST_WORD_S = Math.max(WORDS[WORDS.length - 1]!.end, VOICE_S - 0.2);
export const VIDEO_S = Math.round((LAST_WORD_S + END_HOLD_S) * FPS_LONG) / FPS_LONG;

/** Block 0: cold open. */
const B0 = {
  whale0: said('whale shark'),
  you0: said("that's you"),
  twelve0: said('twelve real sharks'),
  giant0: said('this giant'),
  eight0: said('eight inches'),
  forty0: said('forty feet'),
  thirty0: said('thirty feet'),
  notHere: said('not here'),
  source0: said('real source'),
  survive: said("won't survive"),
  smallest0: said('smallest food'),
  first0: said('but first'),
  this0: said('this', said('but first') + 0.2),
} as const;

/** Block 1: dwarf lanternshark, cookiecutter. */
const B1 = {
  yes1: said('yes', s(1)),
  lantern: said('dwarf lanternshark'),
  ninth: said('ninth'),
  smallestShark: said('smallest shark in the world'),
  deep1: said('lives deep'),
  seventeen: said('seventeen hundred feet'),
  eat1: said('what does it eat'),
  nobody: said('nobody has ever published'),
  shrimp: said('little shrimp'),
  step2: said('step two'),
  quarter: said('a quarter of you'),
  cookie: said('cookiecutter shark'),
  squid: said('swallows squid'),
  cookieBite: said('cookie-shaped'),
  whales1: said('even whales'),
  rude: said('rude'),
  teeth: said('bottom row of teeth'),
  swallowsThem: said('swallows them'),
  calcium: said('calcium'),
  harmless: said('harmless'),
  lastNot: said("it doesn't last"),
} as const;

/** Block 2: spiny dogfish, blacktip reef. */
const B2 = {
  step3: said('step three'),
  herring2: said('eats herring'),
  female2: said('grown female'),
  websites: said('some websites'),
  measured2: said('biggest one measured'),
  fourFeet: said('four feet', said('biggest one measured')),
  time2: said('record is time'),
  twoYears: said('two years'),
  backbone: said('backbone'),
  step4: said('step four'),
  wholeYou: said('one whole you'),
  reefFish: said('hunts reef fish'),
  snakes: said('eaten snakes'),
  recorded2: said('ever recorded'),
  fiveEleven: said('five foot eleven'),
  taller: said('just taller'),
  fromHere: said('from here on'),
} as const;

/** Block 3: bull shark. */
const B3 = {
  bull: said('the bull shark', s(3)),
  mullet: said('mullet'),
  expects: said('nobody expects'),
  fresh: said('fresh water'),
  amazon: said('up the amazon'),
  peru: said('peru'),
  another: said('another'),
  mississippi: said('mississippi'),
  illinois: said('illinois'),
  beach: said('exactly the beach'),
  saltier: said('saltier than the sea'),
  extra: said('extra salty'),
  longWay: said('very long way'),
  remember: said('remember the bull'),
} as const;

/** Block 4: the game. */
const B4 = {
  game: s(4),
  inkfish: said('inkfish', s(4)),
  eat4: said('eat your way'),
  site: said('16bitink', s(4)),
  fastest4: said('the fastest shark', s(4)),
} as const;

/** Block 5: mako, the bunch, great hammerhead. */
const B5 = {
  mako: said('shortfin mako'),
  males: said('the males'),
  tuna5: said('hunts tuna'),
  howFast: said('how fast'),
  sixtyMph: said('sixty miles an hour'),
  noStudy: said("couldn't find a study"),
  burst: said('reported burst'),
  called: said('still called'),
  bunch: said('sizes bunch up'),
  between: said('between twelve and fifteen'),
  notStory: said("size isn't the story"),
  hammer: said('great hammerhead'),
  stingrays: said('stingrays', said('great hammerhead')),
  others: said('other hammerheads'),
  average5: said('adults average'),
  record5: said('record catch'),
  twenty5: said('twenty feet'),
  aReport: said('a report'),
} as const;

/** Block 6: tiger. */
const B6 = {
  thirteen: said('thirteen feet'),
  tiger: said('the tiger shark', s(6)),
  pounds6: said('eight hundred and fifty'),
  eats6: said('eats sea turtles'),
  anything: said('eats anything'),
  catch6: said("here's the catch"),
  harbours: said('harbours'),
  twentyFour6: said('twenty-four feet', s(6)),
  checked: said('never checked'),
  eighteen: said('eighteen feet'),
  named: said('named shark'),
  matter: said('does matter'),
  second: said('second most'),
  coming: said('number one is coming'),
} as const;

/** Block 7: Greenland. */
const B7 = {
  fourteen: said('fourteen feet'),
  greenland: said('greenland shark', s(7)),
  twentyFour7: said('twenty-four feet', s(7)),
  accepted: said('accepted top'),
  herring7: said('eats herring', s(7)),
  age: said('famous for its age'),
  lenses: said('lenses'),
  biggest7: said('the biggest', said('lenses')),
  y272: said('seventy-two', said('lenses')),
  y512: said('five hundred and twelve'),
  y1750: said('1750'),
  unitedStates: said('united states'),
  growUp7: said('grow up', s(7)),
  live500: said('live five hundred'),
  careful: said('careful'),
  lowEnd: said('low end'),
  waiting: said('waiting for'),
} as const;

/** Block 8: great white. */
const B8 = {
  fifteen: said('fifteen feet', s(8)),
  white: said('the great white', s(8)),
  seals8: said('eats seals'),
  thirtyFoot: said('30-foot'),
  exist: said("doesn't exist"),
  y1870: said('1870'),
  mistake: said('mistake'),
  australia: said('australia'),
  under: said('under three and a half'),
  estimated8: said('others were estimated'),
  argued: said('argued about'),
  numberOne: said('remember number one'),
  confirmed8: said('most confirmed unprovoked'),
  n351: said('351'),
  numberTwo: said('number two'),
  numberThree: said('number three'),
  bull8: said('the bull shark', s(8)),
  scared: said('how scared'),
  y2025: said('2025', s(8)),
  deadly: said('deadly'),
  inLine: said('in line'),
  menu: said('seals are on the menu'),
  mostly: said('mostly'),
} as const;

/** Block 9: basking. */
const B9 = {
  jump: said('sizes jump'),
  basking: said('the basking shark', s(9)),
  read49: said('49 feet'),
  reportedly: said('reportedly'),
  measured9: said('biggest measured', s(9)),
  fundy: said('bay of fundy'),
  sevenYou9: said('seven of you', s(9)),
  pups: said('newborn pups'),
  female9: said('a female may not'),
  mouth9: said('mouth wide open'),
  tons: said('2000 tons'),
  catching: said("what's it catching"),
  holdThought: said('hold that thought'),
  oneLeft: said('one shark left'),
  ladder9: said("isn't on the ladder"),
} as const;

/** Block 10: megalodon, whale shark. */
const B10 = {
  where: said("where's megalodon"),
  skeleton: said('skeleton'),
  backbone10: said('fossil backbone'),
  feet54: said('54 feet'),
  feet80: said('80 feet'),
  feet100: said('100 feet'),
  nope: said('nope'),
  estimate10: said('an estimate'),
  realGiant: said('the real giant'),
  whale: said('the whale shark', s(10)),
  adult10: said('grown adult'),
  grownUp10: said('grown up until'),
  bestMeasured: said('best-measured'),
  sevenYou10: said('seven of you', s(10)),
  read60: said('60 feet'),
  oneReport: said('one report'),
  india: said('india'),
  mostMeet: said('most whale sharks'),
} as const;

/** Block 11: the twist and the close. */
const B11 = {
  what11: said('what does the biggest fish'),
  plankton: said('plankton'),
  tiny11: said('tiny drifting'),
  sardines: said('sardines'),
  basking11: said('the basking shark', s(11)),
  smallestFood: said('smallest food', s(11)),
  born: said('is born'),
  grows: said('grows to', s(11)),
  none: said('none of you'),
  every11: said('every size you saw'),
  which: said('which shark'),
  comments: said('comments'),
  start11: said('start tiny'),
  inkfish2: said('inkfish', s(11)),
  site2: said('16bitink', s(11)),
} as const;

/** Every beat, by name. */
export const T = { ...B0, ...B1, ...B2, ...B3, ...B4, ...B5, ...B6, ...B7, ...B8, ...B9, ...B10, ...B11 } as const;

/** The beats block by block (script.md's blocks, 0-based), for the test that each lands inside its block. */
export const BEATS_BY_BLOCK: readonly Readonly<Record<string, number>>[] = [B0, B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11];
