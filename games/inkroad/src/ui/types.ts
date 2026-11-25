import type { OfferPlace } from '@16bitink/game-sdk';
import type { CityView, Command, Quote } from '../sim/types';
import type { WorldPort } from '../app/worldPort';

export type Speed = 0 | 1 | 2 | 4;
export const SPEEDS: readonly Speed[] = [0, 1, 2, 4];

/** What the screens ask of the app. */
export interface PlayActs {
  apply(cmd: Command): Quote;
  setSpeed(s: Speed): void;
  /** The Esc menu. */
  menu(): void;
  /** Close the current card: start the year, next season, next year. */
  next(): void;
  retryYear(year: number): void;
  toDesk(): void;
  buy(where: OfferPlace): void;
  /** A sound by name (stamp, cash, letter...). */
  sfx(id: string): void;
  /** The guide: hold the day still, or run it at another pace. */
  pace(hold: boolean, rate: number): void;
  /** Back to 1x. */
  slow(): void;
  toast(text: string, who?: string): void;
}

/** What the screens read, every frame. */
export interface UiEnv {
  readonly city: CityView;
  readonly world: WorldPort | null;
  readonly acts: PlayActs;
  readonly phone: boolean;
  readonly speed: Speed;
  readonly owned: boolean;
  readonly price: string | null;
  /** The furthest year reached in this city, for "an earlier year". */
  readonly reached: number;
  /** Years of this city that have a saved start, so a retry always has something to load. */
  readonly savedYears: readonly number[];
  readonly cityNo: number;
  /** The card that is up: 'review', 'yearEnd'... */
  readonly card: string | null;
}
