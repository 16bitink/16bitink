/**
 * The shared contract for InkBrick's play (docs/inkbrick-design.md, "Engine contract").
 * Render, bots, the generator and the tests all use these types. Units: x, y, w, h of
 * bricks and pieces are in 15 px cells on a 36 x 64 grid; the board is 540 x 960 px.
 */
export const CELL = 15;
export const COLS = 36;
export const ROWS = 64;
export const BOARD_W = COLS * CELL; // 540
export const BOARD_H = ROWS * CELL; // 960
export const STEP = 1 / 120;
/** The skipping stone's radius in board px (16 px across, 32 on screen at x2). The renderer draws it from this. */
export const BALL_RADIUS = 8;

export type BrickKind = 'soft' | 'tough' | 'stone' | 'x3' | 'keg' | 'pickup' | 'ice' | 'key' | 'gate';
export type PickupKind = 'wide' | 'plus3' | 'fireball';

export interface BrickDef {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly kind: BrickKind;
  /** Hits to break (tough: 2-3). Defaults to 1. */
  readonly hp?: number;
  /** Key and gate bricks with the same link open together. */
  readonly link?: string;
  /** What a pickup brick drops. */
  readonly drop?: PickupKind;
  /** Palette index for the art (pictures). */
  readonly tint?: number;
  /** The sliding floe this brick rides on. */
  readonly floe?: string;
}

export interface LevelDef {
  readonly id: string;
  readonly name: string;
  /** 1..50, or 0 for a daily. */
  readonly number: number;
  readonly chapter: number;
  readonly bricks: readonly BrickDef[];
  readonly floes?: readonly { readonly id: string; readonly dx: number; readonly dy: number; readonly period: number }[];
  readonly shutters?: readonly {
    readonly x: number; readonly y: number; readonly w: number; readonly h: number;
    readonly open: number; readonly closed: number; readonly phase: number;
  }[];
  readonly spinners?: readonly { readonly x: number; readonly y: number; readonly length: number; readonly period: number; readonly phase: number }[];
  readonly whirlpools?: readonly { readonly a: { readonly x: number; readonly y: number }; readonly b: { readonly x: number; readonly y: number } }[];
  /**
   * Brumm. shieldW in cells, speed in cells/s. Optional (engine defaults): Brumm's rectangle
   * x/y/w/h in cells (default 15, 4, 6, 3), the shield's row shieldY (default y + h + 1) and
   * its track trackX0..trackX1 in cells (default x - shieldW .. x + w).
   */
  readonly boss?: {
    readonly hits: number; readonly shieldW: number; readonly speed: number;
    readonly x?: number; readonly y?: number; readonly w?: number; readonly h?: number;
    readonly shieldY?: number; readonly trackX0?: number; readonly trackX1?: number;
  };
  readonly dark?: boolean;
  /** Seconds, for the third shell. */
  readonly par: number;
  /** One line shown before the level. */
  readonly tip?: string;
  /** Which layout it is (vault, wall, hourglass, ...), for variety checks. */
  readonly layout?: string;
}

export interface SimInput {
  /** The raft's wanted centre x in board px. */
  readonly paddleX: number;
  /** True on the step the player clicks, taps or presses Space. */
  readonly launch: boolean;
}

export type SimEvent =
  | { readonly type: 'hit'; readonly brick: number; readonly x: number; readonly y: number }
  | { readonly type: 'break'; readonly brick: number; readonly kind: BrickKind; readonly x: number; readonly y: number }
  | { readonly type: 'bounce'; readonly on: 'wall' | 'paddle' | 'stone'; readonly x: number; readonly y: number }
  | { readonly type: 'blast'; readonly x: number; readonly y: number }
  | { readonly type: 'split'; readonly balls: number }
  | { readonly type: 'pickup'; readonly kind: PickupKind }
  | { readonly type: 'breakIn' }
  | { readonly type: 'bossHit'; readonly hitsLeft: number; readonly x: number; readonly y: number }
  | { readonly type: 'ballLost' }
  | { readonly type: 'lifeLost'; readonly lives: number }
  | { readonly type: 'crumble' }
  | { readonly type: 'cleared' }
  | { readonly type: 'failed' };

export type SimPhase = 'aim' | 'play' | 'cleared' | 'failed';

/** A ball (a skipping stone). Board px, px/s. */
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

/** One brick, in the order of LevelDef.bricks (the index is the events' `brick`). */
export interface BrickState {
  readonly index: number;
  readonly def: BrickDef;
  readonly kind: BrickKind;
  readonly alive: boolean;
  readonly hp: number;
  readonly maxHp: number;
  /** Current top-left and size in board px (bricks on a floe move). */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Ice: cracked by a neighbour, shatters soon. */
  readonly cracked: boolean;
}

export interface PickupState {
  readonly kind: PickupKind;
  /** Centre, board px. */
  readonly x: number;
  readonly y: number;
}

export interface ShutterState {
  /** Board px. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly closed: boolean;
  /** Seconds until it switches. */
  readonly switchIn: number;
}

export interface SpinnerState {
  /** Pivot, board px. */
  readonly x: number;
  readonly y: number;
  /** Degrees, clockwise from +x. */
  readonly angle: number;
  /** End points of the bar, board px. */
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface BossState {
  /** Brumm's rectangle, board px. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly hitsLeft: number;
  readonly hits: number;
  /** The shield's rectangle, board px. */
  readonly shieldX: number;
  readonly shieldY: number;
  readonly shieldW: number;
  readonly shieldH: number;
}

export interface SimState {
  readonly phase: SimPhase;
  readonly balls: readonly BallState[];
  /** The raft: centre x, top y, width (px). */
  readonly paddle: { readonly x: number; readonly y: number; readonly width: number };
  /** In 'aim': where the stone sits (x); the raft slides under it to set the angle. */
  readonly aimX: number;
  readonly bricks: readonly BrickState[];
  readonly pickups: readonly PickupState[];
  /** Floe offsets in px, in LevelDef.floes order. */
  readonly floes: readonly { readonly id: string; readonly ox: number; readonly oy: number }[];
  readonly shutters: readonly ShutterState[];
  readonly spinners: readonly SpinnerState[];
  readonly boss: BossState | null;
  readonly lives: number;
  /** Seconds of play since the first launch (the par clock). */
  readonly elapsed: number;
  /** Seconds since the level started. */
  readonly time: number;
  readonly speed: number;
  readonly wideLeft: number;
  readonly fireLeft: number;
  readonly breakableTotal: number;
  readonly breakableLeft: number;
  readonly heartsLost: number;
  /** True once a ball got inside (a vault, or behind the wall). */
  readonly breakIn: boolean;
  /** Elapsed seconds at the break-in, or -1. */
  readonly breakInAt: number;
  /** Elapsed seconds of the last break, and of the last ball near the hole (-1: never). */
  readonly lastBreakAt: number;
  readonly lastNearAt: number;
  /** Most balls at once so far. */
  readonly peakBalls: number;
}
