import type { EventId } from '@16bitink/game-sdk';
import type { SnakeId } from '../logic/species';
import type { Place } from './types';

/**
 * The daily level's vocabulary (docs/inksnake-daily.md): its rules of the
 * day, its treats and its ids. Plain data, shared by the validator, the
 * engine (logic/daily/) and the cards.
 */

/** Every rule of the day. Data rules are applied to a level's fields by the generator; engine rules are run by logic/daily/. */
export const DAILY_RULES = [
  'plenty', 'lure', 'looseKnots', 'goldRush', 'night', 'oneLife', 'hunters', 'longTail',
  'ice', 'blizzard', 'fog', 'hotDay', 'giants', 'swarm', 'stampede', 'rival',
] as const;
export type DailyRule = (typeof DAILY_RULES)[number];

export type RuleKind = 'easy' | 'hard' | 'spectacle';

export interface RuleInfo {
  /** Its headline: "Ice". */
  readonly name: string;
  /** What it does, in one line after the name ("you slide when you turn"), or '' when the name says it. */
  readonly line: string;
  readonly kind: RuleKind;
  /** Run by the engine (else already applied to the level's fields). */
  readonly engine: boolean;
}

export const RULE_INFO: Readonly<Record<DailyRule, RuleInfo>> = {
  plenty: { name: 'Plenty', line: 'twice the food', kind: 'easy', engine: false },
  lure: { name: 'Sweet Tooth', line: 'food comes to you', kind: 'easy', engine: true },
  looseKnots: { name: 'Loose Knots', line: "you can't tie yourself up", kind: 'easy', engine: true },
  goldRush: { name: 'Gold Rush', line: 'golden meals', kind: 'easy', engine: true },
  night: { name: 'Long Night', line: '', kind: 'hard', engine: false },
  oneLife: { name: 'One Bite', line: 'one life only', kind: 'hard', engine: false },
  hunters: { name: 'Hunting Season', line: 'more hunters', kind: 'hard', engine: false },
  longTail: { name: 'Long Tail', line: 'start long', kind: 'hard', engine: false },
  ice: { name: 'Ice', line: 'you slide when you turn', kind: 'hard', engine: true },
  blizzard: { name: 'Blizzard', line: 'the wind pushes you', kind: 'hard', engine: true },
  fog: { name: 'Fog', line: 'you see only so far', kind: 'hard', engine: true },
  hotDay: { name: 'Hot Day', line: "everyone's fast", kind: 'hard', engine: true },
  giants: { name: 'Giants', line: 'big meals only', kind: 'spectacle', engine: false },
  swarm: { name: 'Swarm', line: 'tiny food everywhere', kind: 'spectacle', engine: false },
  stampede: { name: 'Stampede', line: 'watch the lanes', kind: 'spectacle', engine: false },
  rival: { name: 'Rival', line: 'another snake wants your food', kind: 'spectacle', engine: true },
};

/** "Ice: you slide when you turn", as the cards show it. */
export function ruleLine(rule: DailyRule): string {
  const r = RULE_INFO[rule];
  return r.line ? `${r.name}: ${r.line}` : r.name;
}

/** Event pickups: treats only (no gross food). */
export const TREAT_KINDS = ['cookie', 'candycane', 'confetti', 'envelope', 'heart', 'coin', 'paintedegg', 'candy'] as const;
export type TreatKind = (typeof TREAT_KINDS)[number];

export const TREAT_NAMES: Readonly<Record<TreatKind, { readonly one: string; readonly many: string }>> = {
  cookie: { one: 'cookie', many: 'cookies' },
  candycane: { one: 'candy cane', many: 'candy canes' },
  confetti: { one: 'confetti star', many: 'confetti stars' },
  envelope: { one: 'red envelope', many: 'red envelopes' },
  heart: { one: 'heart candy', many: 'heart candies' },
  coin: { one: 'gold coin', many: 'gold coins' },
  paintedegg: { one: 'painted egg', many: 'painted eggs' },
  candy: { one: 'candy', many: 'candies' },
};

export const isTreatKind = (v: unknown): v is TreatKind => typeof v === 'string' && (TREAT_KINDS as readonly string[]).includes(v);

/** A daily's treats: `count` on the board at a time. */
export interface TreatsDef {
  readonly kind: TreatKind;
  readonly count: number;
}

/** Tomorrow's day as the end card teases it: its place, its snake (as a silhouette), its rule, its event. */
export interface TomorrowDef {
  readonly place: Place;
  readonly snake: SnakeId;
  readonly rule: DailyRule;
  readonly event?: EventId;
}

const DAILY_ID = /^daily-(\d{4}-\d{2}-\d{2})$/;

/** The daily level id for a date: `daily-YYYY-MM-DD`. */
export const dailyId = (date: string): string => `daily-${date}`;

/** The date of a daily level id, or null for any other id. */
export function dailyDate(id: string): string | null {
  return DAILY_ID.exec(id)?.[1] ?? null;
}
