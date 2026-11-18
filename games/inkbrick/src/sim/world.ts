/**
 * The Sim's internal, mutable world. Physics at 120 Hz with up to 300 balls mutates in place
 * on purpose (no garbage per step); the outside only ever sees it as the readonly SimState.
 */
import {
  BALL_R, BALL_SPEED, BIG_STONE_MUL, BOSS_DEFAULT, LAUNCH_X, PADDLE_W, PADDLE_Y, SLOW_MUL, SPEEDY_MUL, START_LIVES,
} from './constants';
import { buildLayers, cellIndex, grow, insideMask, wallMask, type Layer } from './grid';
import {
  CELL, COLS, CRAB_H, CRAB_W, RESCUE_SIZE, ROWS, type BrickDef, type BrickKind, type GoalKind, type LevelDef, type PickupKind,
  type RescueWho, type RuleKind, type SimEvent, type SimPhase,
} from './types';

export interface Ball {
  x: number; y: number; vx: number; vy: number; whirlCd: number; lost: boolean;
  /** Bounces off walls and stone since the last brick or raft touch (the loop breaker). */
  idle: number;
  /** ghost rule: passes through the next brick it breaks (set by each raft hit). */
  ghost: boolean;
  /** sticky: held on the raft. */
  held: boolean;
}
export interface Brick {
  readonly index: number; readonly def: BrickDef; readonly kind: BrickKind;
  alive: boolean; hp: number; readonly maxHp: number;
  x: number; y: number; readonly w: number; readonly h: number;
  cracked: boolean; readonly layer: number; readonly breakable: boolean;
  revealed: boolean;
}
export interface Pearl { readonly cx: number; readonly cy: number; x: number; y: number; taken: boolean }
export interface Bumper { readonly x: number; y: number; readonly r: number; readonly y0: number; kickAt: number }
export interface Flip { readonly x: number; y: number; readonly w: number; readonly h: number; readonly y0: number; readonly link: string; solid: boolean }
export interface Crab {
  x: number; y: number; readonly w: number; readonly h: number; dir: number; fastLeft: number;
  /** Progress along its back-and-forth walk (1 = there and back). */
  cycle: number;
}
export interface Friend { readonly x: number; y: number; readonly w: number; readonly h: number; readonly y0: number; readonly who: RescueWho }
export interface Pickup { readonly kind: PickupKind; x: number; y: number }
export interface Shutter { readonly x: number; y: number; readonly w: number; readonly h: number; closed: boolean; switchIn: number }
export interface Spinner { readonly x: number; y: number; angle: number; x1: number; y1: number; x2: number; y2: number }
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
  // Goals, rules and the new pieces (SimState's fields, then internals).
  readonly goal: GoalKind;
  readonly rule: RuleKind | null;
  readonly ruleDir: 1 | -1;
  readonly ballRadius: number;
  readonly dark: boolean;
  caught: boolean;
  readonly rescue: Friend | null;
  rescued: boolean;
  rescuedAt: number;
  readonly pearls: Pearl[];
  pearlsTaken: number;
  pearlsAt: number;
  stonesLeft: number;
  brokenShare: number;
  readonly need: number;
  tideOffset: number;
  tideNextIn: number;
  readonly bumpers: Bumper[];
  readonly whirlpools: { ax: number; ay: number; bx: number; by: number }[];
  readonly flips: Flip[];
  readonly crabs: Crab[];
  readonly dailyPearl: Pearl | null;
  dailyPearlFound: boolean;
  /** Ball speed multiplier of the rule (speedy, slow). */
  readonly speedMul: number;
  /** Seconds the sticky raft has held the caught stone. */
  caughtFor: number;
  /** Level time each lever last flipped (-1: never). */
  readonly leverAt: Float64Array;
  /** Rising Tide floods so far. */
  floods: number;
}

const UNBREAKABLE: ReadonlySet<BrickKind> = new Set(['stone', 'gate', 'lever']);

export function newBall(x: number, y: number, vx = 0, vy = 0): Ball {
  return { x, y, vx, vy, whirlCd: 0, lost: false, idle: 0, ghost: false, held: false };
}

function makeBricks(level: LevelDef, layerOf: Int32Array): Brick[] {
  return level.bricks.map((def, index) => {
    const hp = def.kind === 'tough' ? Math.max(2, def.hp ?? 2) : Math.max(1, def.hp ?? 1);
    return {
      index, def, kind: def.kind, alive: true, hp, maxHp: hp,
      x: def.x * CELL, y: def.y * CELL, w: def.w * CELL, h: def.h * CELL,
      cracked: false, layer: layerOf[index]!, breakable: !UNBREAKABLE.has(def.kind), revealed: def.hidden !== true,
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

/** A pearl at the centre of cell (x, y). */
function pearlAt(p: { readonly x: number; readonly y: number }): Pearl {
  return { cx: p.x, cy: p.y, x: (p.x + 0.5) * CELL, y: (p.y + 0.5) * CELL, taken: false };
}

function makeFriend(level: LevelDef): Friend | null {
  const r = level.goal === 'rescue' ? level.rescue : undefined;
  if (!r) return null;
  const s = RESCUE_SIZE * CELL;
  return { x: r.x * CELL, y: r.y * CELL, w: s, h: s, y0: r.y * CELL, who: r.who };
}

function makeCrab(c: NonNullable<LevelDef['crabs']>[number]): Crab {
  return { x: c.x0 * CELL, y: c.y * CELL, w: CRAB_W * CELL, h: CRAB_H * CELL, dir: 1, fastLeft: 0, cycle: c.phase };
}

/** The rule's ball radius and speed multiplier, and the hearts a level starts with. */
export function ruleNumbers(level: LevelDef): { radius: number; speedMul: number; lives: number } {
  const rule = level.rule;
  return {
    radius: rule === 'bigStone' ? BALL_R * BIG_STONE_MUL : BALL_R,
    speedMul: rule === 'speedy' ? SPEEDY_MUL : rule === 'slow' ? SLOW_MUL : 1,
    lives: rule === 'oneHeart' ? 1 : START_LIVES,
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
  const rn = ruleNumbers(level);
  const goal = level.goal ?? 'clear';
  return {
    level, phase: 'aim', balls: [newBall(LAUNCH_X, PADDLE_Y - rn.radius)],
    paddle: { x: LAUNCH_X, y: PADDLE_Y, width: PADDLE_W }, aimX: LAUNCH_X, bricks, pickups: [],
    floes: (level.floes ?? []).map((f) => ({ id: f.id, ox: 0, oy: 0 })),
    shutters: (level.shutters ?? []).map((s) => ({ x: s.x * CELL, y: s.y * CELL, w: s.w * CELL, h: s.h * CELL, closed: false, switchIn: 0 })),
    spinners: (level.spinners ?? []).map((s) => ({ x: (s.x + 0.5) * CELL, y: (s.y + 0.5) * CELL, angle: 0, x1: 0, y1: 0, x2: 0, y2: 0 })),
    boss: makeBoss(level), lives: rn.lives, elapsed: 0, time: 0, playTime: 0, speed: BALL_SPEED * rn.speedMul,
    wideLeft: 0, fireLeft: 0, breakableTotal, breakableLeft: breakableTotal, heartsLost: 0,
    breakIn: false, breakInAt: -1, lastBreakAt: 0, lastNearAt: -1, peakBalls: 1, launched: false, nudge: 0,
    layers, inside, near: grow(inside, 1, walls), iceAdj: iceNeighbours(level, layers, layerOf), gatesOf,
    delayed: [], scheduled: new Uint8Array(bricks.length), stamp: new Int32Array(bricks.length), stampId: 0, events: [],
    goal, rule: level.rule ?? null, ruleDir: level.ruleDir ?? 1, ballRadius: rn.radius,
    dark: level.dark === true || level.rule === 'fog', caught: false,
    rescue: makeFriend(level), rescued: false, rescuedAt: -1,
    pearls: goal === 'pearls' ? (level.pearls ?? []).map(pearlAt) : [], pearlsTaken: 0, pearlsAt: -1,
    stonesLeft: goal === 'stones' ? (level.stones ?? 0) : -1, brokenShare: 0, need: goal === 'stones' ? (level.need ?? 0) : 0,
    tideOffset: 0, tideNextIn: goal === 'tide' ? (level.tide?.every ?? 0) : 0,
    bumpers: (level.bumpers ?? []).map((b) => ({ x: b.x, y: b.y, r: b.r, y0: b.y, kickAt: -1 })),
    whirlpools: (level.whirlpools ?? []).map((p) => ({ ax: (p.a.x + 0.5) * CELL, ay: (p.a.y + 0.5) * CELL, bx: (p.b.x + 0.5) * CELL, by: (p.b.y + 0.5) * CELL })),
    flips: (level.flips ?? []).map((f) => ({ x: f.x * CELL, y: f.y * CELL, w: f.w * CELL, h: f.h * CELL, y0: f.y * CELL, link: f.link, solid: f.on })),
    crabs: (level.crabs ?? []).map(makeCrab),
    dailyPearl: level.dailyPearl ? pearlAt(level.dailyPearl) : null, dailyPearlFound: false,
    speedMul: rn.speedMul, caughtFor: 0, leverAt: new Float64Array(bricks.length).fill(-1), floods: 0,
  };
}
