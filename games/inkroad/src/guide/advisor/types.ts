import type { Bar, CarParkKind, Cell, Control, Id, Pt, RoadType, TransitMode } from '../../sim/types';
import type { RoadPlanHint, TurnRef } from '../types';

/** What the advisor says: the worst things now, and what may be done about each. */
export type AnswerAct =
  | { readonly t: 'control'; readonly node: Id; readonly control: Control }
  | { readonly t: 'flyover'; readonly node: Id; readonly move: TurnRef }
  | { readonly t: 'street'; readonly plan: RoadPlanHint }
  | { readonly t: 'park'; readonly kind: CarParkKind; readonly at: Pt }
  | { readonly t: 'roadTool'; readonly tool: 'kerb' | 'toll' | 'buslane'; readonly road: Id; readonly at: Pt }
  | { readonly t: 'upgrade'; readonly road: Id; readonly type: RoadType; readonly at: Pt }
  | { readonly t: 'line'; readonly mode: TransitMode; readonly stops: readonly Cell[] }
  | { readonly t: 'vehicles'; readonly line: Id }
  | { readonly t: 'repair'; readonly road: Id; readonly at: Pt }
  /** Can only be done at the night review: the advisor reminds. */
  | { readonly t: 'night'; readonly note: string; readonly sel: string; readonly tab: 'prices' | 'council' };

export interface Answer { readonly label: string; readonly price: number | null; readonly act: AnswerAct }

export type ProblemKind = 'junction' | 'parking' | 'double' | 'empty' | 'crowded' | 'cutOff' | 'money' | 'approval' | 'cost' | 'streets' | 'worn' | 'beach' | 'fuel' | 'goal';
export interface Problem {
  readonly id: string;
  readonly kind: ProblemKind;
  readonly bar: Bar | 'money';
  /** Bigger is worse; `RED_SCORE` and up counts on the badge. */
  readonly score: number;
  readonly place: string;
  readonly cause: string;
  readonly at: Pt | null;
  readonly r: number;
  readonly ref: Id;
}
export const RED_SCORE = 50;
export const TOP = 3;

export interface Ahead { readonly title: string; readonly lines: readonly string[] }
