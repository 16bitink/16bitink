/**
 * The shared contract for InkBrick's play (docs/inkbrick-design.md, "Engine contract" and
 * "Variety: goals, rules of the day, new pieces"). Render, bots, the generator and the tests
 * all use these types. Units: x, y, w, h of bricks and pieces are in 15 px cells on a 36 x 64
 * grid; the board is 540 x 960 px. Bumpers are the exception: centre and radius in px.
 *
 * What the renderer reads (all on SimState, never on World internals):
 * - goal HUD: `goal`, `pearlsTaken` / `pearls`, `stonesLeft`, `brokenShare`, `need`,
 *   `tideOffset` (cells the field has sunk) and `tideNextIn`, `rescued` / `rescuedAt`;
 * - pieces: `bricks[i].def.armour` (draw armour as thick driftwood), `bumpers` (with `kickAt` for a flash),
 *   `whirlpools` (both ends, px; they sink with the tide), `flips` (`solid` per wall), `crabs`
 *   (box in px, `fastLeft`), `bricks[i].revealed` for hidden bricks, `rescue` (the friend's box);
 * - rule: `rule`, `ruleDir`, `paddle.width`, `ballRadius`, `caught` (sticky: a stone sits on the raft;
 *   the one held has `balls[i].held`),
 *   `dark` (true for `dark` levels and the `fog` rule);
 * - daily: `dailyPearl` (null when the level has none) and `dailyPearlFound`.
 * Positions of moving pieces (and everything the tide moves) are already offset: draw as given.
 * A lever brick's `link` pairs it with the `flips` walls of the same link (not with keys and gates).
 */
export const CELL = 15;
export const COLS = 36;
export const ROWS = 64;
export const BOARD_W = COLS * CELL; // 540
export const BOARD_H = ROWS * CELL; // 960
export const STEP = 1 / 120;
/** The skipping stone's radius in board px (16 px across, 32 on screen at x2). The renderer draws it from this. */
export const BALL_RADIUS = 8;

export type BrickKind = 'soft' | 'tough' | 'stone' | 'x3' | 'keg' | 'pickup' | 'ice' | 'key' | 'gate' | 'lever';

/** What a level asks for (default 'clear'). */
export type GoalKind = 'clear' | 'rescue' | 'pearls' | 'stones' | 'tide';
export const GOAL_KINDS: readonly GoalKind[] = ['clear', 'rescue', 'pearls', 'stones', 'tide'];
/** The rule of the day (at most one per level; every daily has one). */
export type RuleKind =
  | 'current' | 'heavy' | 'speedy' | 'tinyRaft' | 'oneHeart' | 'fog'
  | 'slow' | 'wideRaft' | 'bigStone' | 'sticky'
  | 'twoStones' | 'ghost' | 'goldRush' | 'kegDay';
export type RuleClass = 'hard' | 'easy' | 'spectacle';
export const RULE_CLASS: Readonly<Record<RuleKind, RuleClass>> = {
  current: 'hard', heavy: 'hard', speedy: 'hard', tinyRaft: 'hard', oneHeart: 'hard', fog: 'hard',
  slow: 'easy', wideRaft: 'easy', bigStone: 'easy', sticky: 'easy',
  twoStones: 'spectacle', ghost: 'spectacle', goldRush: 'spectacle', kegDay: 'spectacle',
};
export const RULE_KINDS = Object.keys(RULE_CLASS) as readonly RuleKind[];
/** The friend to free in a rescue level. */
export type RescueWho = 'crab' | 'pup' | 'puffin';
export const RESCUE_WHO: readonly RescueWho[] = ['crab', 'pup', 'puffin'];
/** A rescue friend is 2 x 2 cells. */
export const RESCUE_SIZE = 2;
/** A crab is 3 x 2 cells. */
export const CRAB_W = 3;
export const CRAB_H = 2;

export interface CellPoint { readonly x: number; readonly y: number }
export interface RescueDef { readonly x: number; readonly y: number; readonly who: RescueWho }
export interface TideDef {
  /** Seconds of play per one-cell step down. */
  readonly every: number;
  /** The danger row: a brick reaching it costs a heart and the field rises 6 cells. */
  readonly line: number;
}
/** Round, unbreakable; centre and radius in px (r 14-24). */
export interface BumperDef { readonly x: number; readonly y: number; readonly r: number }
/** A wall toggled by every lever with the same link. `on` = solid at the start. */
export interface FlipDef { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly link: string; readonly on: boolean }
/** A 3 x 2 crab walking on row y between x0 and x1 (its left cell), cells/s, phase 0..1. */
export interface CrabDef { readonly y: number; readonly x0: number; readonly x1: number; readonly speed: number; readonly phase: number }
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
  /** Not drawn until its first hit (plays normally). */
  readonly hidden?: boolean;
  /**
   * Breakable armour around an inside on stone-free levels (layout 'open'): the cells its starting
   * shape encloses are "inside", so reaching one is the break-in. Plays as its kind (driftwood hp 3).
   */
  readonly armour?: boolean;
}

/** A rectangle of cells. */
export interface ZoneDef { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

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
  /**
   * The break-in zone, declared (cells): reaching it is the break-in. For levels whose way in is too
   * wide to count as a hole (chapter 1); without it the walls decide (grid.ts insideMask).
   */
  readonly inside?: readonly ZoneDef[];
  /** One line shown before the level. */
  readonly tip?: string;
  /** Which layout it is (vault, wall, hourglass, ...), for variety checks. */
  readonly layout?: string;
  /** The goal (default 'clear'). */
  readonly goal?: GoalKind;
  /** goal 'rescue': the 2 x 2 friend, cells. */
  readonly rescue?: RescueDef;
  /** goal 'pearls': 3-5 pass-through pearls, cells. */
  readonly pearls?: readonly CellPoint[];
  /** goal 'stones' (Few Stones): launches allowed (3-6). */
  readonly stones?: number;
  /** goal 'stones': the share of breakable bricks to break (0..1). */
  readonly need?: number;
  /** goal 'tide' (Rising Tide). */
  readonly tide?: TideDef;
  readonly rule?: RuleKind;
  /** rule 'current': +1 pulls right, -1 left (default +1). */
  readonly ruleDir?: 1 | -1;
  readonly bumpers?: readonly BumperDef[];
  readonly flips?: readonly FlipDef[];
  readonly crabs?: readonly CrabDef[];
  /** Dailies: one hidden pass-through pearl, cells (distinct from the 'pearls' goal). */
  readonly dailyPearl?: CellPoint;
  /** Dailies: tomorrow's rule and goal, for the end card's teaser. */
  readonly tomorrow?: { readonly rule: RuleKind; readonly goal: GoalKind };
}

/** One shutter of `LevelDef.shutters` (cells; open/closed/phase in seconds). */
export type ShutterDef = NonNullable<LevelDef['shutters']>[number];

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
  | { readonly type: 'bump'; readonly bumper: number; readonly x: number; readonly y: number }
  | { readonly type: 'lever'; readonly brick: number; readonly link: string; readonly x: number; readonly y: number }
  | { readonly type: 'reveal'; readonly brick: number }
  | { readonly type: 'rescued'; readonly x: number; readonly y: number }
  | { readonly type: 'pearl'; readonly index: number; readonly left: number; readonly x: number; readonly y: number }
  | { readonly type: 'dailyPearl'; readonly x: number; readonly y: number }
  | { readonly type: 'tideStep'; readonly offset: number }
  | { readonly type: 'tideFlood' }
  | { readonly type: 'stoneSpent'; readonly left: number }
  | { readonly type: 'crabHit'; readonly crab: number; readonly x: number; readonly y: number }
  | { readonly type: 'caught' }
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
  /** sticky: this is the stone the raft is holding (at most one ball at a time). */
  readonly held: boolean;
}

/** A whirlpool pair's two ends, centres in board px (they ride the Rising Tide). */
export interface WhirlpoolState { readonly ax: number; readonly ay: number; readonly bx: number; readonly by: number }

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
  /** False for a hidden brick until its first hit; true for every other brick. */
  readonly revealed: boolean;
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

export interface FlipState {
  /** Board px. */
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  readonly link: string;
  /** Solid (blocks the ball) or open (drawn as a dashed outline). */
  readonly solid: boolean;
}

export interface CrabState {
  /** The crab's box, board px. */
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  /** +1 walking right, -1 left. */
  readonly dir: number;
  /** Seconds left of the fast scuttle after a hit. */
  readonly fastLeft: number;
}

export interface BumperState {
  /** Centre and radius, board px. */
  readonly x: number; readonly y: number; readonly r: number;
  /** Level time of the last kick (-1: never), for a flash. */
  readonly kickAt: number;
}

export interface PearlState {
  /** Centre, board px. */
  readonly x: number; readonly y: number;
  readonly taken: boolean;
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
  // Goals, rules and the new pieces (2026-11-18).
  readonly goal: GoalKind;
  readonly rule: RuleKind | null;
  readonly ruleDir: 1 | -1;
  /** The stone's radius now, board px (bigStone: x1.6). */
  readonly ballRadius: number;
  /** The lantern is on (dark levels and the fog rule). */
  readonly dark: boolean;
  /** Sticky: the stone sits caught on the raft (thrown on launch or after 1.5 s). */
  readonly caught: boolean;
  /** rescue: the friend's box in board px (moves with the tide), or null. */
  readonly rescue: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly who: RescueWho } | null;
  readonly rescued: boolean;
  /** Elapsed seconds at the rescue, or -1. */
  readonly rescuedAt: number;
  /** pearls: every pearl of the goal, and how many are taken. */
  readonly pearls: readonly PearlState[];
  readonly pearlsTaken: number;
  /** Elapsed seconds when the last pearl was taken, or -1. */
  readonly pearlsAt: number;
  /** stones: stones left to launch (-1 when the goal isn't 'stones'). */
  readonly stonesLeft: number;
  /** Share of breakable bricks broken so far (0..1). */
  readonly brokenShare: number;
  /** stones: the share to reach (0 when the goal isn't 'stones'). */
  readonly need: number;
  /** tide: cells the field has sunk (0 otherwise), and seconds of play to the next step. */
  readonly tideOffset: number;
  readonly tideNextIn: number;
  /** tide: floods so far (each cost a heart). */
  readonly floods: number;
  readonly bumpers: readonly BumperState[];
  readonly whirlpools: readonly WhirlpoolState[];
  readonly flips: readonly FlipState[];
  readonly crabs: readonly CrabState[];
  /** The daily's hidden pearl centre in board px, or null; and whether a ball found it. */
  readonly dailyPearl: { readonly x: number; readonly y: number } | null;
  readonly dailyPearlFound: boolean;
}
