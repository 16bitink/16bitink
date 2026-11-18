/**
 * The analytic aim window: a ghost ball traced from the raft's line along many directions,
 * bouncing off walls and stone (at most MAX_BOUNCES), carried by whirlpools, stopped by any
 * breakable brick outside, counted when it reaches an inside cell. Same contact code as the Sim.
 * Gates are closed until their key breaks (a ghost that reaches a key counts: it opens the way),
 * flip walls stand as their levers left them (a ghost that reaches a lever while a wall is shut
 * counts too), and moving pieces (floes, shutters, spinners, Brumm's shield, crabs) are sampled
 * over their cycle. The rule's pull (current, heavy) bends the ghost as it bends the stone, and
 * bumpers kick it as they kick the stone.
 */
import {
  BALL_SPEED, BOSS_DEFAULT, BUMP_KICK, CURRENT_PULL, HEAVY_PULL, MAX_BOUNCE_DEG, PADDLE_Y, WHIRL_COOLDOWN, WHIRL_RADIUS,
} from './constants';
import { C_BRICK, C_BUMPER, C_NONE, findContact, newContact } from './contact';
import { crabPeriod, crabsAt, movePieces } from './pieces';
import { keepSideways, keepUpright, kick, pull } from './steer';
import { cosDeg, sinDeg } from './trig';
import { BOARD_W, CELL, COLS, type LevelDef } from './types';
import { createWorld, newBall, type World } from './world';

export const MAX_BOUNCES = 3;
const TRACE_STEP = 3;
const MAX_TRACE_STEPS = 1400;
export const AIM_ORIGINS = 9;
export const AIM_DIRECTIONS = 3600;
/** Moments of the moving pieces' cycle the trace samples (one when nothing moves). */
export const AIM_PHASES = 8;
/** Ghost steps a whirlpool waits before it takes the ghost again (the Sim's cooldown at the start speed). */
const WHIRL_COOLDOWN_STEPS = Math.ceil((WHIRL_COOLDOWN * BALL_SPEED) / TRACE_STEP);

export interface TraceState {
  /** True once every gate's key is broken (the gates are gone). With no `flips`, flip walls are open too. */
  readonly gatesOpen: boolean;
  /** Level clock (s) the moving pieces are placed at. */
  readonly time: number;
  /** Each flip wall solid or not (default: open when gatesOpen, else as the level starts). */
  readonly flips?: readonly boolean[];
  /** Rising Tide: cells the field has sunk. */
  readonly tide?: number;
}

const START: TraceState = { gatesOpen: false, time: 0 };

/** The longest cycle of the level's moving pieces in seconds (0 when nothing moves). */
export function pieceCycle(level: LevelDef): number {
  const floes = (level.floes ?? []).map((f) => f.period);
  const shutters = (level.shutters ?? []).map((s) => s.open + s.closed);
  // A bar looks the same after half a turn.
  const spinners = (level.spinners ?? []).map((s) => Math.abs(s.period) / 2);
  const crabs = (level.crabs ?? []).map(crabPeriod);
  const b = level.boss;
  let shield = 0;
  if (b && b.speed > 0) {
    const x0 = b.trackX0 ?? (b.x ?? BOSS_DEFAULT.x) - b.shieldW;
    const x1 = b.trackX1 ?? (b.x ?? BOSS_DEFAULT.x) + (b.w ?? BOSS_DEFAULT.w);
    shield = Math.max(0, (2 * (x1 - x0)) / b.speed);
  }
  return Math.max(0, ...floes, ...shutters, ...spinners, ...crabs, shield);
}

export function hasGates(level: LevelDef): boolean {
  return level.bricks.some((b) => b.kind === 'gate');
}

/** The level as the aim sees it at one moment: gates closed until opened, pieces where the clock puts them. */
export function traceWorld(level: LevelDef, st: TraceState = START): World {
  const w = createWorld(st.gatesOpen ? { ...level, bricks: level.bricks.filter((b) => b.kind !== 'gate') } : level);
  w.time = st.time;
  w.tideOffset = st.tide ?? 0;
  w.flips.forEach((f, i) => (f.solid = st.flips ? st.flips[i] === true : st.gatesOpen ? false : f.solid));
  if (w.crabs.length > 0) crabsAt(w, st.time);
  movePieces(w);
  return w;
}

/** The rule's pull as ghost units (px per trace step, per step): the stone's pull over one step's time. */
function ghostPull(w: World): { ax: number; ay: number } {
  const tau = TRACE_STEP / (BALL_SPEED * w.speedMul);
  const k = tau * tau;
  return { ax: w.rule === 'current' ? CURRENT_PULL * w.ruleDir * k : 0, ay: w.rule === 'heavy' ? HEAVY_PULL * k : 0 };
}

interface Ghost { x: number; y: number; vx: number; vy: number }

/** A whirlpool end under the ghost moves it to the other end; true when it did. */
function whirl(w: World, g: Ghost): boolean {
  const r2 = WHIRL_RADIUS * WHIRL_RADIUS;
  for (const { ax, ay, bx, by } of w.whirlpools) {
    const toB = (g.x - ax) ** 2 + (g.y - ay) ** 2 < r2;
    const toA = !toB && (g.x - bx) ** 2 + (g.y - by) ** 2 < r2;
    if (!toA && !toB) continue;
    g.x = toB ? bx : ax;
    g.y = toB ? by : ay;
    return true;
  }
  return false;
}

/** A lever with this link would open something: a flip wall on its link is shut. */
function leverOpens(w: World, link: string | undefined): boolean {
  return w.flips.some((f) => f.solid && f.link === (link ?? ''));
}

/**
 * True when a ghost ball from (x0, raft line) at `deg` (0 = straight up, + = right) gets inside
 * (or onto a `target` cell, when given: a pearl, the rescue friend), or reaches a key brick
 * (`keys`: a gate is shut) or a lever whose flip wall is shut, which opens the way in.
 */
export function traceInside(w: World, x0: number, deg: number, keys = false, target?: Uint8Array): boolean {
  const r = w.ballRadius;
  const b = newBall(x0, PADDLE_Y - r, sinDeg(deg) * TRACE_STEP, -cosDeg(deg) * TRACE_STEP);
  const c = newContact();
  const g = w.rule === 'current' || w.rule === 'heavy' ? ghostPull(w) : null;
  let bounces = 0;
  let whirlCd = 0;
  for (let i = 0; i < MAX_TRACE_STEPS; i++) {
    if (g) pull(b, g.ax, g.ay, 1, TRACE_STEP);
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < r || b.x > BOARD_W - r) {
      b.vx = -b.vx;
      b.x = b.x < r ? r : BOARD_W - r;
      bounces++;
    }
    if (b.y < r) {
      b.vy = -b.vy;
      b.y = r;
      keepSideways(b, TRACE_STEP, 0);
      bounces++;
    }
    if (b.y > PADDLE_Y) return false;
    if (whirlCd > 0) whirlCd--;
    else if (whirl(w, b)) whirlCd = WHIRL_COOLDOWN_STEPS;
    const cx = Math.floor(b.x / CELL);
    const cy = Math.floor(b.y / CELL);
    if (target) {
      if (cy >= 0 && target[cy * COLS + cx]) return true;
    } else if (cy - w.tideOffset >= 0 && w.inside[(cy - w.tideOffset) * COLS + cx]) return true;
    findContact(w, b, c);
    if (c.kind !== C_NONE) {
      if (c.kind === C_BRICK && w.bricks[c.id]!.breakable) return keys && w.bricks[c.id]!.kind === 'key';
      // A lever opens the way only while a flip wall on its link is shut (a shut gate alone doesn't make it a way in).
      if (c.kind === C_BRICK && w.bricks[c.id]!.kind === 'lever' && leverOpens(w, w.bricks[c.id]!.def.link)) return true;
      const dot = b.vx * c.nx + b.vy * c.ny;
      b.x += c.nx * c.pen;
      b.y += c.ny * c.pen;
      if (dot < 0) {
        b.vx -= 2 * dot * c.nx;
        b.vy -= 2 * dot * c.ny;
        // The same steering as the Sim's stone bounces (the ghost moves TRACE_STEP px a step).
        if (c.kind === C_BUMPER) kick(b, c.nx, c.ny, TRACE_STEP, BUMP_KICK);
        else keepSideways(b, TRACE_STEP, 0);
        keepUpright(b, TRACE_STEP);
        bounces++;
      }
    }
    if (bounces > MAX_BOUNCES) return false;
  }
  return false;
}

export function originX(i: number, count: number): number {
  const margin = 30;
  return margin + ((BOARD_W - 2 * margin) * i) / (count - 1);
}

/** The moments (s) the trace samples: AIM_PHASES spread over the pieces' cycle, or just t = 0. */
export function samplePhases(level: LevelDef): readonly number[] {
  const cycle = pieceCycle(level);
  return cycle > 0 ? Array.from({ length: AIM_PHASES }, (_, p) => (cycle * p) / AIM_PHASES) : [0];
}

/**
 * Share of AIM_DIRECTIONS launch directions (AIM_ORIGINS spots along the raft's line, the fan of
 * +-60 deg) that get inside, the directions spread over the moving pieces' cycle. Gates are
 * measured open (the hole as it is once the key is broken); the bots still shoot for the key first.
 */
export function aimWindow(level: LevelDef, directions = AIM_DIRECTIONS): number {
  const phases = samplePhases(level);
  const keys = false;
  const worlds = phases.map((time) => traceWorld(level, { gatesOpen: true, time }));
  if (!worlds[0]!.inside.some((v) => v === 1)) return 0;
  const per = Math.max(1, Math.round(directions / AIM_ORIGINS));
  let hits = 0;
  for (let o = 0; o < AIM_ORIGINS; o++) {
    const x = originX(o, AIM_ORIGINS);
    for (let k = 0; k < per; k++) {
      const w = worlds[(k + o) % worlds.length]!;
      if (traceInside(w, x, -MAX_BOUNCE_DEG + (2 * MAX_BOUNCE_DEG * (k + 0.5)) / per, keys)) hits++;
    }
  }
  return hits / (per * AIM_ORIGINS);
}

/** Share of the launch fan from the stone's starting spot that gets inside at t = 0 (the "free" first shot). */
export function launchWindow(level: LevelDef, x: number, directions = 240): number {
  const w = traceWorld(level);
  if (!w.inside.some((v) => v === 1)) return 0;
  const keys = hasGates(level);
  let hits = 0;
  for (let k = 0; k < directions; k++) if (traceInside(w, x, -MAX_BOUNCE_DEG + (2 * MAX_BOUNCE_DEG * (k + 0.5)) / directions, keys)) hits++;
  return hits / directions;
}

function findMouths(w: World): { x: number; y: number }[] {
  const walls = new Uint8Array(w.inside.length);
  for (const b of w.bricks) {
    if (b.breakable || b.layer !== 0) continue;
    for (let y = b.def.y; y < b.def.y + b.def.h; y++) for (let x = b.def.x; x < b.def.x + b.def.w; x++) walls[y * COLS + x] = 1;
  }
  const out: { x: number; y: number }[] = [];
  const rows = w.inside.length / COLS;
  for (let c = 0; c < w.inside.length; c++) {
    if (!w.inside[c]) continue;
    const cx = c % COLS;
    const cy = (c - cx) / COLS;
    const open = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]].some(([x, y]) => x! >= 0 && x! < COLS && y! >= 0 && y! < rows && !w.inside[y! * COLS + x!] && !walls[y! * COLS + x!]);
    if (open) out.push({ x: (cx + 0.5) * CELL, y: (cy + 0.5) * CELL });
  }
  return out;
}

/** Seconds a returned stone takes to reach the bricks: the bots aim for where the pieces will be then. */
export const AIM_LEAD = 0.8;
/** The bots' hit spots are traced to the nearest AIM_PX px (a cache key; finer buys nothing). */
const AIM_PX = 2;

/**
 * For bots: the angles that get inside from an exact hit x (cached per px), traced with the gates
 * as they are (closed: shoot for the key) and the moving pieces where they'll be (nearest sample).
 */
export class Aimer {
  private readonly worlds = new Map<string, World>();
  private readonly cache = new Map<string, readonly number[]>();
  private readonly phases: readonly number[];
  private readonly cycle: number;
  readonly hasInside: boolean;
  /** Indices of the level's gate bricks (open once all are gone). */
  readonly gates: readonly number[];
  /** Indices of the key bricks. */
  readonly keys: readonly number[];
  /** Centres (px) of the inside cells that touch the outside: the holes' mouths (gates open). */
  readonly mouths: readonly { readonly x: number; readonly y: number }[];
  /** Indices of the breakable bricks with a cell inside (gates open). */
  readonly insideBricks: readonly number[];
  /** The level's stone radius (bigStone). */
  readonly radius: number;
  /** The inside cells (gates and flips open). */
  readonly insideMask: Uint8Array;
  private readonly flipCount: number;

  constructor(readonly level: LevelDef, private readonly stepDeg = 0.5) {
    this.phases = samplePhases(level);
    this.cycle = pieceCycle(level);
    const open = traceWorld(level, { gatesOpen: true, time: 0 });
    this.radius = open.ballRadius;
    this.insideMask = open.inside;
    this.flipCount = open.flips.length;
    this.hasInside = open.inside.some((v) => v === 1);
    this.mouths = findMouths(open);
    this.gates = level.bricks.flatMap((b, i) => (b.kind === 'gate' ? [i] : []));
    this.keys = level.bricks.flatMap((b, i) => (b.kind === 'key' ? [i] : []));
    this.insideBricks = level.bricks.flatMap((b, i) => {
      if (b.kind === 'stone' || b.kind === 'gate') return [];
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (open.inside[y * COLS + x]) return [i];
      return [];
    });
  }

  private phaseIndex(time: number): number {
    if (this.cycle <= 0) return 0;
    const t = (((time + AIM_LEAD) % this.cycle) + this.cycle) % this.cycle;
    return Math.round((t / this.cycle) * this.phases.length) % this.phases.length;
  }

  private world(p: number, gatesOpen: boolean, flips: readonly boolean[] | undefined, tide: number): World {
    const fk = flips ? flips.map((f) => (f ? 1 : 0)).join('') : '-';
    const id = `${p}:${gatesOpen ? 1 : 0}:${fk}:${tide}`;
    let w = this.worlds.get(id);
    if (!w) {
      w = traceWorld(this.level, { gatesOpen, time: this.phases[p]!, ...(flips ? { flips } : {}), tide });
      this.worlds.set(id, w);
    }
    return w;
  }

  /**
   * Angles from hit x that get inside (or, gates closed or a flip wall shut, onto a key or a
   * lever), with the pieces as at `time` + the lead.
   */
  angles(x: number, st: TraceState = START): readonly number[] {
    if (!this.hasInside) return [];
    const px = AIM_PX * Math.round(Math.min(BOARD_W - this.radius, Math.max(this.radius, x)) / AIM_PX);
    const open = st.gatesOpen || this.gates.length === 0;
    const p = this.phaseIndex(st.time);
    // Flip walls: as the bot sees them (start: as the level starts).
    const flips = this.flipCount > 0 ? st.flips ?? this.level.flips!.map((f) => f.on) : undefined;
    const shut = flips?.some((f) => f) ?? false;
    const tide = st.tide ?? 0;
    const id = `${px}:${p}:${open ? 1 : 0}:${flips ? flips.map((f) => (f ? 1 : 0)).join('') : ''}:${tide}`;
    const hit = this.cache.get(id);
    if (hit) return hit;
    const w = this.world(p, open, flips, tide);
    const list: number[] = [];
    for (let a = -MAX_BOUNCE_DEG; a <= MAX_BOUNCE_DEG; a += this.stepDeg) if (traceInside(w, px, a, !open || shut)) list.push(a);
    this.cache.set(id, list);
    return list;
  }
}
