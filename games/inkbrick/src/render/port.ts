import type { GoalKind, PickupKind, RescueWho, RuleKind, SimEvent, SimInput, SimState } from '../sim/types';

/**
 * What the play scene reads from a running level, in board px. The engine's
 * Sim is wrapped into this by simPort.ts, so the renderer depends on this
 * small view and not on every field of SimState.
 */
export interface BallView {
  readonly x: number;
  readonly y: number;
  /** Velocity, px/s (Skip watches the stones coming down). */
  readonly vx: number;
  readonly vy: number;
  readonly fire: boolean;
}

export interface BossView {
  /** Brumm's box and the shield's, board px (top-left). */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly shieldX: number;
  readonly shieldY: number;
  readonly shieldW: number;
  readonly shieldH: number;
  readonly hitsLeft: number;
  readonly hits: number;
}

export interface BoardView {
  /** Seconds of play so far. */
  readonly t: number;
  readonly lives: number;
  readonly paddleX: number;
  readonly paddleW: number;
  /** The stone waits on the raft for a launch. */
  readonly held: boolean;
  readonly balls: readonly BallView[];
  readonly pickups: readonly { readonly x: number; readonly y: number; readonly kind: PickupKind }[];
  /** Per brick of the level (index as LevelDef.bricks). */
  readonly alive: (i: number) => boolean;
  readonly hp: (i: number) => number;
  /** Ice cracked by a neighbour, about to shatter. */
  readonly cracked: (i: number) => boolean;
  /** A moving brick's top-left in board px (floes), or null when it stays put. */
  readonly moved: (i: number) => { readonly x: number; readonly y: number } | null;
  readonly spinners: readonly { readonly x: number; readonly y: number; readonly angle: number; readonly length: number }[];
  readonly shutters: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly closed: boolean; readonly switchIn: number }[];
  readonly boss: BossView | null;
  readonly broken: number;
  readonly breakable: number;
  // Goals, rules and the new pieces (2026-11-18).
  /** Seconds since the level started (the bumpers' kick times use this clock). */
  readonly clock: number;
  readonly goal: GoalKind;
  readonly rule: RuleKind | null;
  /** The stone's radius, board px (bigStone makes it bigger). */
  readonly ballR: number;
  /** Sticky: the stone sits caught on the raft (Skip holds it). */
  readonly caught: boolean;
  /** False for a hidden brick until its first hit. */
  readonly revealed: (i: number) => boolean;
  readonly bumpers: readonly PieceBump[];
  readonly flips: readonly PieceFlip[];
  readonly crabs: readonly PieceCrab[];
  readonly rescue: { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly who: RescueWho } | null;
  readonly rescued: boolean;
  readonly pearls: readonly { readonly x: number; readonly y: number; readonly taken: boolean }[];
  readonly pearlsTaken: number;
  /** Few Stones: launches left (-1 on other goals), share broken (0..1) and the share to reach. */
  readonly stonesLeft: number;
  readonly brokenShare: number;
  readonly need: number;
  /** Rising Tide: seconds of play to the next step down, and the danger row's y in board px (null: no tide). */
  readonly tideNextIn: number;
  readonly tideLineY: number | null;
  readonly dailyPearl: { readonly x: number; readonly y: number } | null;
  readonly dailyPearlFound: boolean;
}

export interface PieceBump { readonly x: number; readonly y: number; readonly r: number; readonly kickAt: number }
export interface PieceFlip { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly link: string; readonly solid: boolean }
export interface PieceCrab { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly dir: number; readonly fastLeft: number }

export interface SimPort {
  step(input: SimInput): void;
  drainEvents(): readonly SimEvent[];
  view(): BoardView;
  /** The raw sim state (dev autopilot only). */
  state(): SimState;
}
