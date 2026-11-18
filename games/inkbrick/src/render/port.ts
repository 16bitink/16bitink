import type { PickupKind, SimEvent, SimInput, SimState } from '../sim/types';

/**
 * What the play scene reads from a running level, in board px. The engine's
 * Sim is wrapped into this by simPort.ts, so the renderer depends on this
 * small view and not on every field of SimState.
 */
export interface BallView {
  readonly x: number;
  readonly y: number;
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
  readonly shutters: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly closed: boolean }[];
  readonly boss: BossView | null;
  readonly broken: number;
  readonly breakable: number;
}

export interface SimPort {
  step(input: SimInput): void;
  drainEvents(): readonly SimEvent[];
  view(): BoardView;
  /** The raw sim state (dev autopilot only). */
  state(): SimState;
}
