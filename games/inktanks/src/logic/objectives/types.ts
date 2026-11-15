import type { Tank, TankInput } from '../match/types';
import type { Pt } from '../vec';

/** What the objective asks of a bot: the player's stand-in, or a wave or hunter going for the truck. */
export interface Hint {
  readonly goal?: Pt;
  readonly goalRadius?: number;
  /** Shoot this tank first when it's in sight. */
  readonly target?: number | null;
  /** Fight without leaving the goal circle (a hold zone, the truck, a guard's post). */
  readonly stay?: boolean;
  readonly shootAt?: { readonly x: number; readonly y: number; readonly id: string } | null;
  /** No loot detours (the clock or the truck can't wait). */
  readonly urgent?: boolean;
  /** Don't start fights (recon). */
  readonly sneak?: boolean;
  /** Keep driving to the goal while shooting what's in sight (breakout, chase). */
  readonly run?: boolean;
}

/** A ring on the map and minimap: a hold zone, a flag, a recon spot, the exit, an artillery mark, a supply drop coming down. */
export interface Mark {
  readonly kind: 'zone' | 'flag' | 'spot' | 'exit' | 'pickup' | 'artillery' | 'drop';
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** ours / theirs / done / neutral; for flags and spots. */
  readonly state?: 'ours' | 'theirs' | 'done' | 'neutral';
  /** 0–1: capture or dwell progress. */
  readonly progress?: number;
  /** An artillery or drop mark's whole warning, s: progress 0 is the call, 1 the landing. */
  readonly warn?: number;
}

/** A set piece the objective owns and the view draws: the cargo helicopter, the rescue truck, a flagpole, a recon camera. */
export type Prop = HeliProp | TruckProp | FlagProp | CameraProp;

/** Capture: a flagpole. `hold` -1 their flag at the top … 0 bare pole … +1 ours at the top. */
export interface FlagProp {
  readonly kind: 'flag';
  readonly x: number;
  readonly y: number;
  readonly hold: number;
}

/** Recon: the camp being photographed: a viewfinder while you dwell (`progress` 0–1), the flash once `done`. */
export interface CameraProp {
  readonly kind: 'camera';
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly progress: number;
  readonly done: boolean;
  /** Seconds since the photo was taken (the flash fades). */
  readonly since: number;
}

/** The rescue's pick-up truck: parked at home, it drives off once every crew is aboard. */
export interface TruckProp {
  readonly kind: 'truck';
  readonly x: number;
  readonly y: number;
  readonly heading: number;
}

export interface HeliProp {
  readonly kind: 'heli';
  readonly x: number;
  readonly y: number;
  /** 0 on the ground, 1 at flying height. */
  readonly alt: number;
  readonly heading: number;
  /** Carrying the cargo slung under it. */
  readonly cargo: boolean;
  /** Rotor speed, 0–1 (idling on the pad is slower). */
  readonly rotor: number;
}

export interface ObjectiveStatus {
  /** The HUD line: "Fuel stacks 1/3". */
  readonly text: string;
  /** Where the edge arrow points: the next target, or null. */
  readonly target: Pt | null;
  readonly done: boolean;
  /** A mission fail's reason ("truck destroyed"), or null. */
  readonly failed: string | null;
}

/**
 * One level's main objective, live in a match. Pure logic: `step` runs
 * after the tanks move each step; the rest only reads.
 */
export interface Objective {
  readonly kind: string;
  /** The briefing line: "Destroy the 3 fuel stacks". */
  readonly title: string;
  step(dt: number): void;
  status(): ObjectiveStatus;
  /** True once the mission's turn has come (salvage picked up, first cage broken): waves with when 'stage' arrive. */
  staged(): boolean;
  playerHint(t: Tank): Hint | null;
  /** Where waves and hunters head, and whom they want. */
  foeHint(t: Tank): Hint | null;
  /** Inputs for the tanks it drives itself (the escort truck, the boss body, freed crews), else null. */
  drive(t: Tank): TankInput | null;
  marks(): readonly Mark[];
  /** Set pieces to draw (the cargo helicopter). */
  props(): readonly Prop[];
  /** The escort truck's HP share at the end, for the truck bonus. */
  truckHpShare(): number | null;
}

/** The parts every objective leaves alone. */
export const BASE: Pick<Objective, 'staged' | 'foeHint' | 'drive' | 'marks' | 'props' | 'truckHpShare'> = {
  props: () => [],
  staged: () => false,
  foeHint: () => null,
  drive: () => null,
  marks: () => [],
  truckHpShare: () => null,
};

export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

export function nearest<T extends Pt>(from: Pt, xs: readonly T[]): T | null {
  let best: T | null = null;
  let bd = Infinity;
  for (const x of xs) {
    const d = dist(from, x);
    if (d < bd) {
      bd = d;
      best = x;
    }
  }
  return best;
}
