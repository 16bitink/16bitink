/**
 * The Sim's internal, mutable world. Physics at 120 Hz with up to 300 balls mutates in place
 * on purpose (no garbage per step); the outside only ever sees it as the readonly SimState.
 */
import {
  BALL_R, BALL_SPEED, BOSS_DEFAULT, LAUNCH_X, PADDLE_W, PADDLE_Y, START_LIVES,
} from './constants';
import { buildLayers, cellIndex, grow, insideMask, wallMask, type Layer } from './grid';
import {
  CELL, COLS, ROWS, type BrickDef, type BrickKind, type LevelDef, type PickupKind, type SimEvent, type SimPhase,
} from './types';

export interface Ball {
  x: number; y: number; vx: number; vy: number; whirlCd: number; lost: boolean;
  /** Bounces off walls and stone since the last brick or raft touch (the loop breaker). */
  idle: number;
}
export interface Brick {
  readonly index: number; readonly def: BrickDef; readonly kind: BrickKind;
  alive: boolean; hp: number; readonly maxHp: number;
  x: number; y: number; readonly w: number; readonly h: number;
  cracked: boolean; readonly layer: number; readonly breakable: boolean;
}
export interface Pickup { readonly kind: PickupKind; x: number; y: number }
export interface Shutter { readonly x: number; readonly y: number; readonly w: number; readonly h: number; closed: boolean; switchIn: number }
export interface Spinner { readonly x: number; readonly y: number; angle: number; x1: number; y1: number; x2: number; y2: number }
export interface Boss {
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
  hitsLeft: number; readonly hits: number;
  shieldX: number; readonly shieldY: number; readonly shieldW: number; readonly shieldH: number;
  cooldown: number;
}
export interface Delayed { readonly at: number; readonly brick: number }

export interface World {
  readonly level: LevelDef;
  phase: SimPhase;
  balls: Ball[];
  paddle: { x: number; y: number; width: number };
  aimX: number;
  readonly bricks: Brick[];
  pickups: Pickup[];
  readonly floes: { readonly id: string; ox: number; oy: number }[];
  readonly shutters: Shutter[];
  readonly spinners: Spinner[];
  readonly boss: Boss | null;
  lives: number;
  elapsed: number;
  time: number;
  playTime: number;
  speed: number;
  wideLeft: number;
  fireLeft: number;
  readonly breakableTotal: number;
  breakableLeft: number;
  heartsLost: number;
  breakIn: boolean;
  breakInAt: number;
  lastBreakAt: number;
  lastNearAt: number;
  peakBalls: number;
  launched: boolean;
  nudge: number;
  // Internals.
  readonly layers: Layer[];
  readonly inside: Uint8Array;
  readonly near: Uint8Array;
  readonly iceAdj: readonly (readonly number[])[];
  readonly gatesOf: ReadonlyMap<string, readonly number[]>;
  delayed: Delayed[];
  readonly scheduled: Uint8Array;
  readonly stamp: Int32Array;
  stampId: number;
  events: SimEvent[];
}

const UNBREAKABLE: ReadonlySet<BrickKind> = new Set(['stone', 'gate']);

export function newBall(x: number, y: number, vx = 0, vy = 0): Ball {
  return { x, y, vx, vy, whirlCd: 0, lost: false, idle: 0 };
}

function makeBricks(level: LevelDef, layerOf: Int32Array): Brick[] {
  return level.bricks.map((def, index) => {
    const hp = def.kind === 'tough' ? Math.max(2, def.hp ?? 2) : Math.max(1, def.hp ?? 1);
    return {
      index, def, kind: def.kind, alive: true, hp, maxHp: hp,
      x: def.x * CELL, y: def.y * CELL, w: def.w * CELL, h: def.h * CELL,
      cracked: false, layer: layerOf[index]!, breakable: !UNBREAKABLE.has(def.kind),
    };
  });
}

/** Ice bricks touching each ice brick (sharing an edge or a corner, same layer). */
function iceNeighbours(level: LevelDef, layers: readonly Layer[], layerOf: Int32Array): number[][] {
  return level.bricks.map((b, i) => {
    if (b.kind !== 'ice') return [];
    const grid = layers[layerOf[i]!]!.grid;
    const found = new Set<number>();
    for (let y = b.y - 1; y <= b.y + b.h; y++) {
      for (let x = b.x - 1; x <= b.x + b.w; x++) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        const j = grid[cellIndex(x, y)]!;
        if (j >= 0 && j !== i && level.bricks[j]!.kind === 'ice') found.add(j);
      }
    }
    return [...found].sort((p, q) => p - q);
  });
}

function makeBoss(level: LevelDef): Boss | null {
  const b = level.boss;
  if (!b) return null;
  const x = b.x ?? BOSS_DEFAULT.x;
  const y = b.y ?? BOSS_DEFAULT.y;
  const w = b.w ?? BOSS_DEFAULT.w;
  const h = b.h ?? BOSS_DEFAULT.h;
  return {
    x: x * CELL, y: y * CELL, w: w * CELL, h: h * CELL, hitsLeft: b.hits, hits: b.hits,
    shieldX: (b.trackX0 ?? x - b.shieldW) * CELL, shieldY: (b.shieldY ?? y + h + 1) * CELL,
    shieldW: b.shieldW * CELL, shieldH: CELL, cooldown: 0,
  };
}

export function createWorld(level: LevelDef): World {
  const { layers, layerOf } = buildLayers(level);
  const walls = wallMask(level);
  const inside = insideMask(walls);
  const bricks = makeBricks(level, layerOf);
  const gatesOf = new Map<string, number[]>();
  for (const b of bricks) if (b.kind === 'gate' && b.def.link) gatesOf.set(b.def.link, [...(gatesOf.get(b.def.link) ?? []), b.index]);
  const breakableTotal = bricks.filter((b) => b.breakable).length;
  return {
    level, phase: 'aim', balls: [newBall(LAUNCH_X, PADDLE_Y - BALL_R)],
    paddle: { x: LAUNCH_X, y: PADDLE_Y, width: PADDLE_W }, aimX: LAUNCH_X, bricks, pickups: [],
    floes: (level.floes ?? []).map((f) => ({ id: f.id, ox: 0, oy: 0 })),
    shutters: (level.shutters ?? []).map((s) => ({ x: s.x * CELL, y: s.y * CELL, w: s.w * CELL, h: s.h * CELL, closed: false, switchIn: 0 })),
    spinners: (level.spinners ?? []).map((s) => ({ x: (s.x + 0.5) * CELL, y: (s.y + 0.5) * CELL, angle: 0, x1: 0, y1: 0, x2: 0, y2: 0 })),
    boss: makeBoss(level), lives: START_LIVES, elapsed: 0, time: 0, playTime: 0, speed: BALL_SPEED,
    wideLeft: 0, fireLeft: 0, breakableTotal, breakableLeft: breakableTotal, heartsLost: 0,
    breakIn: false, breakInAt: -1, lastBreakAt: 0, lastNearAt: -1, peakBalls: 1, launched: false, nudge: 0,
    layers, inside, near: grow(inside, 1, walls), iceAdj: iceNeighbours(level, layers, layerOf), gatesOf,
    delayed: [], scheduled: new Uint8Array(bricks.length), stamp: new Int32Array(bricks.length), stampId: 0, events: [],
  };
}
