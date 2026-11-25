import type { Ghost, Overlay, Selection } from '../app/worldPort';
import type { Cell, CityView, Id, Pt, ToolId } from '../sim/types';

/**
 * The guide: small steps, one at a time, as data. Each says why, then what to
 * do, marks where, waits for the city to show it was done, and tells what
 * changed. No DOM and no Phaser here: src/ui/guide draws it.
 */

/** What a step may look at. */
export interface GuideView {
  readonly city: CityView;
  readonly tool: ToolId | null;
  readonly ghost: Ghost | null;
  readonly selection: Selection;
  readonly overlay: Overlay;
  /** Stops tapped so far with a line tool. */
  readonly stops: number;
  /** The kind of car park in hand. */
  readonly parkKind: string;
  /** The card that is up, if any: 'review', 'yearEnd'... */
  readonly card: string | null;
  readonly speed: number;
  readonly phone: boolean;
}

/** Numbers a script keeps between its steps. */
export type Memo = Record<string, number>;

/** Parts of the screen a script may keep hidden until it introduces them. */
export type Part = 'approval' | 'goal' | 'speed' | 'ovs' | 'ticker' | 'advisor' | 'forecast' | `tool:${ToolId}` | 'tools';

/** What to mark: something on the map, or something of the HUD. */
export type Target =
  | { readonly t: 'spot'; readonly at: Pt; readonly r: number; /** A hand taps it. */ readonly tap?: boolean; /** How much round it stays bright, in plan px. */ readonly wide?: number }
  | { readonly t: 'drag'; readonly line: readonly Pt[] }
  | { readonly t: 'tool'; readonly tool: ToolId }
  /** The first of these selectors that is on screen. */
  | { readonly t: 'ui'; readonly sel: readonly string[]; readonly tap?: boolean };

/** Extra drawing on the map: a dashed line with a word, or a quiet ring. */
export type Mark = { readonly line: readonly Pt[]; readonly label?: string; /** How it is today: quieter. */ readonly old?: boolean } | { readonly ring: Pt; readonly r: number };

export type Who = 'zaza' | 'miko' | 'juma' | 'pim' | 'sulo';
export interface Bullet { readonly icon: string; readonly text: string }

type Say = string | ((v: GuideView, m: Memo) => string);

export interface Step {
  readonly id: string;
  /** 0, 2, 4, 6: the four days; 1, 3, 5, 7: their nights (review); 8: the year's end. */
  readonly stage: number;
  readonly who?: Who;
  readonly why?: Say;
  readonly say: Say;
  readonly bullets?: readonly Bullet[];
  readonly target?: (v: GuideView, m: Memo) => Target | null;
  readonly marks?: (v: GuideView, m: Memo) => readonly Mark[];
  /** Where the camera goes when the step begins. */
  readonly look?: (v: GuideView, m: Memo) => readonly Pt[] | null;
  /** Time stands still while it shows. */
  readonly pause?: boolean;
  /** How fast the day runs while it shows (a pace on top of the player's speed). */
  readonly rate?: (v: GuideView) => number;
  /** Hold back until this is true; nothing shows meanwhile. */
  readonly when?: (v: GuideView, m: Memo) => boolean;
  /** Leave the step out (it makes no sense now). Checked while it waits and while it shows. */
  readonly skipIf?: (v: GuideView, m: Memo) => boolean;
  readonly enter?: (v: GuideView, m: Memo) => void;
  readonly until?: (v: GuideView, m: Memo) => boolean;
  /** A button that ends the step. */
  readonly ok?: string;
  /** The player undid the step before: go back to it. */
  readonly back?: { readonly when: (v: GuideView, m: Memo) => boolean; readonly to: string };
  /** What changed, said when `until` came true. */
  readonly reward?: (v: GuideView, m: Memo) => string | null;
  readonly reveals?: readonly Part[];
  /** After this long without an answer: a helping hand. */
  readonly hint?: { readonly afterMs: number; readonly say: string; readonly target: Target; readonly reveals?: readonly Part[] };
}

export interface Script {
  readonly key: string;
  /** Hide the parts nobody has introduced yet (the very first year). */
  readonly hides?: boolean;
  readonly steps: readonly Step[];
}

/** What to show now. */
export interface Frame {
  readonly id: string;
  readonly kind: 'step' | 'reward' | 'tip';
  readonly who: Who;
  readonly why: string;
  readonly say: string;
  readonly bullets: readonly Bullet[];
  readonly ok: string | null;
  readonly target: Target | null;
  readonly marks: readonly Mark[];
  readonly look: readonly Pt[] | null;
  readonly pause: boolean;
  /** Everything but the target in shade. */
  readonly dim: boolean;
  readonly rate: number;
}

export interface RoadPlanHint { readonly cells: readonly Cell[]; readonly from: Cell; readonly to: Cell; readonly cost: number; readonly nowS: number; readonly newS: number; /** The way they drive now. */ readonly oldWay: readonly Cell[] }
export interface TurnRef { readonly fromRoad: Id; readonly toRoad: Id }
