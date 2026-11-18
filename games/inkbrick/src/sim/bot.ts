/**
 * Bots that play the Sim: novice (follows the ball, hits at a random offset, slow to react),
 * decent (predicts the landing and aims for the aim window, with noise), skilled (aims exactly).
 * Each is seeded; bots are tooling, not play, so they may use Math.atan2.
 */
import { BALL_R, BALL_SPEED, CURRENT_PULL, HEAVY_PULL, MAX_BOUNCE_DEG, PADDLE_Y } from './constants';
import { GoalAimer } from './goalaim';
import { mulberry32, type Rng } from './rng';
import type { Aimer } from './trace';
import { BOARD_W, CELL, STEP, type BallState, type SimInput, type SimState } from './types';

export type BotKind = 'novice' | 'decent' | 'skilled';

interface BotSkill {
  /** Max raft speed, px/s. */
  readonly speed: number;
  /** Seconds between looks at the board. */
  readonly replan: number;
  /** Aim noise, degrees (decent/skilled), or offset spread (novice, share of half the raft). */
  readonly noise: number;
  readonly think: number;
  readonly predicts: boolean;
}

export const BOT_SKILL: Readonly<Record<BotKind, BotSkill>> = {
  novice: { speed: 900, replan: 0.06, noise: 0.35, think: 1.0, predicts: false },
  decent: { speed: 900, replan: 0.08, noise: 5, think: 0.6, predicts: true },
  skilled: { speed: 1400, replan: 0, noise: 3.5, think: 0.3, predicts: true },
};

const BRICK_ZONE_BOTTOM = 765;
const ANGLED_DEG = 12;
const STEEP_DEG = 28;
const ANGLED_PAYOFF = 0.5;
const STRAIGHT_PAYOFF = 0.15;
/** After the break-in, the share of inside bricks still standing that keeps a bot aiming in. */
const INSIDE_WORTH = 0.15;
/** A run as wide as twice the aim noise is a sure hit. */
const NOISE_SPAN = 2;
const RUN_STEP_DEG = 0.5;
const RUN_GAP_DEG = 0.51;
const STUCK_SECONDS = 6;
const EDGE_MARGIN = 0.5;
/** The novice's chance per returning stone of misjudging it entirely (at the start speed). */
export const NOVICE_LAPSE = 0.015;
const LAPSE_PX = 40;

interface Run { readonly lo: number; readonly hi: number }

/** Neighbouring angles (0.5 deg apart) grouped into runs: each run is one way in. */
function runsOf(list: readonly number[]): Run[] {
  const out: Run[] = [];
  let start = 0;
  for (let i = 1; i <= list.length; i++) {
    if (i === list.length || list[i]! - list[i - 1]! > RUN_GAP_DEG) {
      out.push({ lo: list[start]!, hi: list[i - 1]! });
      start = i;
    }
  }
  return out;
}

/**
 * How much a bot wants a way in: the chance its aim noise lands in the run, times the payoff of
 * the entry (a steep shot rattles around inside; a straight-up shot through a floor hole tends to
 * come straight back out). So a bot takes a wide straight way in over a sliver of a steep one.
 */
function runWorth(r: Run, noise: number): number {
  const mid = Math.abs((r.lo + r.hi) / 2);
  const hit = Math.min(1, (r.hi - r.lo + RUN_STEP_DEG) / (NOISE_SPAN * noise));
  const payoff = mid >= STEEP_DEG ? 1 : mid >= ANGLED_DEG ? ANGLED_PAYOFF : STRAIGHT_PAYOFF;
  return hit * payoff;
}

/** Rising Tide: a bot goes for the lowest bricks once they're this many rows from the danger row. */
const TIDE_DANGER_ROWS = 7;
const PREDICT_MAX_STEPS = 600;

/** Where a falling stone meets the raft under a pull (current, heavy): stepped as the Sim bends it, walls folded in. */
function pulledLandingX(b: BallState, s: SimState): number {
  const ax = s.rule === 'current' ? CURRENT_PULL * s.ruleDir : 0;
  const ay = s.rule === 'heavy' ? HEAVY_PULL : 0;
  const speed = Math.hypot(b.vx, b.vy) || s.speed;
  const r = s.ballRadius;
  let { x, y, vx, vy } = b;
  for (let i = 0; i < PREDICT_MAX_STEPS && y < PADDLE_Y - r; i++) {
    vx += ax * STEP;
    vy += ay * STEP;
    const k = speed / Math.hypot(vx, vy);
    vx *= k;
    vy *= k;
    x += vx * STEP;
    y += vy * STEP;
    if (x < r) {
      x = r;
      vx = Math.abs(vx);
    } else if (x > BOARD_W - r) {
      x = BOARD_W - r;
      vx = -Math.abs(vx);
    }
  }
  return x;
}

function landingX(b: BallState, s?: SimState): number {
  if (s && (s.rule === 'current' || s.rule === 'heavy')) return pulledLandingX(b, s);
  const t = (PADDLE_Y - BALL_R - b.y) / b.vy;
  const span = BOARD_W - 2 * BALL_R;
  let x = b.x - BALL_R + b.vx * t;
  x = ((x % (2 * span)) + 2 * span) % (2 * span);
  if (x > span) x = 2 * span - x;
  return x + BALL_R;
}

/** The ball to save: the descending one that arrives first, else the lowest. */
function nextBall(balls: readonly BallState[]): BallState | null {
  let best: BallState | null = null;
  let bestT = Infinity;
  for (const b of balls) {
    if (b.vy <= 0) continue;
    const t = (PADDLE_Y - BALL_R - b.y) / b.vy;
    if (t >= 0 && t < bestT) {
      bestT = t;
      best = b;
    }
  }
  if (best) return best;
  return balls.reduce<BallState | null>((a, b) => (!a || b.y > a.y ? b : a), null);
}

interface Box { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Nothing alive under the brick's middle column all the way down: a straight shot from the raft reaches it. */
function exposed(b: Box, alive: readonly Box[]): boolean {
  const mx = b.x + b.w / 2;
  return !alive.some((o) => o !== b && o.y > b.y && o.x < mx && mx < o.x + o.w);
}

/** Whether a rescue friend or an untaken pearl sits in the level's inside (the Aimer's mask, gates open). */
function insideTest(aim: Aimer): (s: SimState) => boolean {
  const inside = aim.insideMask;
  const at = (x: number, y: number, s: SimState) => {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL) - s.tideOffset;
    return cy >= 0 && inside[cy * 36 + cx] === 1;
  };
  return (s) => GoalAimer.spots(s).some((p) => at(p.x, p.y, s));
}

export class Bot {
  private readonly rng: Rng;
  private readonly skill: BotSkill;
  private target = BOARD_W / 2;
  private sinceLook = Infinity;
  private aimWait = 0;
  private wantDeg = 0;
  private tracked: BallState | null = null;
  private settled = false;
  private aimPlanned = false;
  private lapse = false;
  private descending = false;
  /** rescue / pearls: angles straight to what's left to take, on the board as it is now. */
  private readonly goalAim: GoalAimer | null;
  /** rescue / pearls: whether what's left to take sits inside (then the way in is worth it). */
  private readonly goalInside: (s: SimState) => boolean;
  /** The level's inside is made (in part) of armour. */
  private readonly armoured: boolean;

  constructor(readonly kind: BotKind, seed: number, private readonly aim: Aimer | null) {
    this.rng = mulberry32(seed);
    this.skill = BOT_SKILL[kind];
    const goal = aim?.level.goal;
    this.goalAim = aim && (goal === 'rescue' || goal === 'pearls') ? new GoalAimer(aim.level) : null;
    this.goalInside = this.goalAim && aim ? insideTest(aim) : () => false;
    this.armoured = aim?.level.bricks.some((b) => b.armour) ?? false;
  }

  private gauss(): number {
    return (this.rng() + this.rng() + this.rng() - 1.5) * 2;
  }

  /** The angle this bot wants from a hit at x. */
  private chooseAngle(x: number, s: SimState): number {
    if (this.kind === 'novice') return this.gauss() * this.skill.noise * MAX_BOUNCE_DEG * 0.6;
    // Rescue and pearls: a clear shot at the friend or a pearl beats everything.
    if (this.goalAim) {
      this.goalAim.sync(s);
      const direct = this.goalAim.angles(x);
      if (direct.length > 0) return this.clampNoisy(this.pickTarget(runsOf(direct)));
    }
    const list = this.aim ? this.aim.angles(x, { gatesOpen: this.gatesOpen(s), time: s.time, flips: s.flips.map((f) => f.solid) }) : [];
    const insideLeft = this.worthGoingIn(s);
    // Stuck in a loop that breaks nothing: try something else, as a player would.
    const stuck = s.elapsed - Math.max(s.lastBreakAt, s.lastNearAt) > STUCK_SECONDS && this.rng() < 0.5;
    let a: number;
    if (list.length > 0 && insideLeft && !stuck) {
      a = this.pickWayIn(runsOf(list));
    } else {
      a = this.angleToBrick(x, s);
    }
    return this.clampNoisy(a);
  }

  private clampNoisy(a: number): number {
    const n = a + this.gauss() * this.skill.noise;
    return Math.max(-MAX_BOUNCE_DEG, Math.min(MAX_BOUNCE_DEG, n));
  }

  /** A clear shot at a target: skilled takes the middle of the widest, decent one by its width. */
  private pickTarget(runs: readonly Run[]): number {
    const width = (r: Run) => Math.min(1, (r.hi - r.lo + RUN_STEP_DEG) / (NOISE_SPAN * this.skill.noise));
    if (this.kind === 'skilled') {
      const best = runs.reduce((p, q) => (width(q) > width(p) ? q : p));
      return (best.lo + best.hi) / 2;
    }
    const worth = runs.map((r) => width(r) ** 2);
    let roll = this.rng() * worth.reduce((n, v) => n + v, 0);
    const run = runs.find((_, i) => (roll -= worth[i]!) <= 0) ?? runs[runs.length - 1]!;
    return (run.lo + run.hi) / 2 + (this.rng() - 0.5) * 0.5 * (run.hi - run.lo);
  }

  /** Rising Tide: the lowest bricks are close to the danger row. */
  private tideDanger(s: SimState): boolean {
    const line = this.aim?.level.tide?.line;
    if (s.goal !== 'tide' || line === undefined) return false;
    let low = -1;
    for (const b of s.bricks) if (b.alive && b.kind !== 'stone' && b.kind !== 'gate' && b.kind !== 'lever') low = Math.max(low, (b.y + b.h) / CELL - 1);
    return low >= line - TIDE_DANGER_ROWS;
  }

  /**
   * Whether the way in is still worth shooting for: before the break-in always; after it while
   * Brumm has hits left or more than INSIDE_WORTH of the inside bricks stand (the whole board's
   * bricks when the level has none inside).
   */
  private worthGoingIn(s: SimState): boolean {
    if (this.tideDanger(s)) return false;
    if (this.goalAim) return !s.breakIn || this.goalInside(s);
    if (!s.breakIn) return true;
    if (s.boss && s.boss.hitsLeft > 0) return true;
    const ins = this.aim?.insideBricks ?? [];
    if (ins.length === 0) return s.breakableLeft > INSIDE_WORTH * s.breakableTotal;
    const alive = ins.reduce((n, i) => n + (s.bricks[i]?.alive ? 1 : 0), 0);
    return alive > INSIDE_WORTH * ins.length;
  }

  /** Skilled: the middle of the best way in. Decent: a way in by its worth, somewhere in its middle half. */
  private pickWayIn(runs: readonly Run[]): number {
    if (this.kind === 'skilled') {
      const best = runs.reduce((p, q) => (runWorth(q, this.skill.noise) > runWorth(p, this.skill.noise) ? q : p));
      return (best.lo + best.hi) / 2;
    }
    // Decent players go for the good ways in, not a fair draw of every sliver.
    const worth = runs.map((r) => runWorth(r, this.skill.noise) ** 2);
    let roll = this.rng() * worth.reduce((n, v) => n + v, 0);
    const run = runs.find((_, i) => (roll -= worth[i]!) <= 0) ?? runs[runs.length - 1]!;
    const mid = (run.lo + run.hi) / 2;
    return mid + (this.rng() - 0.5) * 0.5 * (run.hi - run.lo);
  }

  /** True when the level has no gates or every gate is gone (its key broken). */
  private gatesOpen(s: SimState): boolean {
    const gates = this.aim?.gates ?? [];
    return gates.every((i) => !s.bricks[i]?.alive);
  }

  /** Before the break-in, dig toward the hole (nearest bricks to its mouth); after, any brick. */
  private angleToBrick(x: number, s: SimState): number {
    const alive = s.bricks.filter((b) => b.alive && b.kind !== 'stone' && b.kind !== 'gate');
    if (alive.length === 0) return 0;
    const mouths = this.aim?.mouths ?? [];
    let pool = alive;
    const spots = this.goalAim ? GoalAimer.spots(s) : [];
    if (this.kind !== 'novice' && this.tideDanger(s)) {
      // Rising Tide: clear the lowest bricks before they reach the line.
      pool = [...alive].sort((p, q) => q.y + q.h - (p.y + p.h)).slice(0, this.kind === 'skilled' ? 3 : 6);
      return this.angleAt(x, pool);
    }
    if (this.kind !== 'novice' && spots.length > 0 && (s.breakIn || mouths.length === 0)) {
      // Rescue and pearls: dig toward what's left to take.
      const d = (b: (typeof alive)[number]) => Math.min(...spots.map((m) => Math.abs(b.x + b.w / 2 - m.x) + Math.abs(b.y + b.h / 2 - m.y)));
      pool = [...alive].sort((p, q) => d(p) - d(q)).slice(0, this.kind === 'skilled' ? 2 : 6);
      return this.angleAt(x, pool);
    }
    // A closed gate: the key is the way in.
    const keys = this.gatesOpen(s) ? [] : (this.aim?.keys ?? []).flatMap((i) => (s.bricks[i]?.alive ? [s.bricks[i]!] : []));
    if (keys.length > 0 && this.kind !== 'novice') pool = keys;
    else if (!s.breakIn && mouths.length > 0 && this.kind !== 'novice') {
      const d = (b: (typeof alive)[number]) => Math.min(...mouths.map((m) => Math.abs(b.x + b.w / 2 - m.x) + Math.abs(b.y + b.h / 2 - m.y)));
      // Armour (open levels): chew at the armour a shot can reach, nearest the middle of the raft's reach.
      const dig = this.armoured ? alive.filter((b) => b.def.armour && exposed(b, alive)) : [];
      pool = dig.length > 0
        ? [...dig].sort((p, q) => p.hp - q.hp || Math.abs(p.x + p.w / 2 - x) - Math.abs(q.x + q.w / 2 - x)).slice(0, this.kind === 'skilled' ? 1 : 4)
        : [...alive].sort((p, q) => d(p) - d(q)).slice(0, this.kind === 'skilled' ? 2 : 6);
    }
    return this.angleAt(x, pool);
  }

  /** A straight shot from x at one of the pool's bricks (drawn by the seed). */
  private angleAt(x: number, pool: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number }[]): number {
    const b = pool[Math.floor(this.rng() * pool.length)]!;
    const dx = b.x + b.w / 2 - x;
    const dy = PADDLE_Y - (b.y + b.h / 2);
    return (Math.atan2(dx, Math.max(1, dy)) * 180) / Math.PI;
  }

  private offsetFor(deg: number, width: number): number {
    const half = width / 2;
    return Math.max(-half + EDGE_MARGIN, Math.min(half - EDGE_MARGIN, (deg / MAX_BOUNCE_DEG) * half));
  }

  private planPlay(s: SimState): void {
    const b = nextBall(s.balls);
    if (!b) return;
    const x = this.skill.predicts && b.vy > 0 ? landingX(b, s) : b.x;
    // Re-choose the aim for each new ball to save, and once it has left the brick zone.
    // A new return: a different ball, or the same one coming down again.
    if (b !== this.tracked || (b.vy > 0 && !this.descending)) {
      this.tracked = b;
      this.settled = false;
      this.lapse = this.kind === 'novice' && this.rng() < NOVICE_LAPSE * (s.speed / BALL_SPEED) ** 2;
      this.wantDeg = this.chooseAngle(x, s);
    } else if (b.y > BRICK_ZONE_BOTTOM && !this.settled && b.vy > 0) {
      // Below the bricks the landing is certain: aim again from the exact spot.
      this.settled = true;
      this.wantDeg = this.chooseAngle(x, s);
    }
    this.descending = b.vy > 0;
    // A novice sometimes misjudges the bounce completely (the reason novices lose hearts).
    const miss = this.lapse ? (x < BOARD_W / 2 ? 1 : -1) * (s.paddle.width + LAPSE_PX) : 0;
    this.target = x - this.offsetFor(this.wantDeg, s.paddle.width) + miss;
  }

  input(s: SimState): SimInput {
    // Sticky: a caught stone is aimed like the launch.
    if (s.phase === 'aim' || s.caught) return this.aimInput(s);
    if (s.rule === 'sticky') this.aimPlanned = false;
    this.sinceLook += STEP;
    if (this.sinceLook >= this.skill.replan) {
      this.sinceLook = 0;
      this.planPlay(s);
    }
    return { paddleX: this.moveToward(s.paddle.x, this.target), launch: false };
  }

  private aimInput(s: SimState): SimInput {
    if (!this.aimPlanned) {
      this.wantDeg = this.chooseAngle(s.aimX, s);
      this.target = s.aimX - this.offsetFor(this.wantDeg, s.paddle.width);
      this.aimWait = this.skill.think;
      this.tracked = null;
      this.aimPlanned = true;
    }
    this.aimWait -= STEP;
    const x = this.moveToward(s.paddle.x, this.target);
    const ready = this.aimWait <= 0 && Math.abs(x - this.target) < 1;
    if (ready) this.aimPlanned = false;
    return { paddleX: x, launch: ready };
  }

  private moveToward(from: number, to: number): number {
    const max = this.skill.speed * STEP;
    const d = to - from;
    return from + (d > max ? max : d < -max ? -max : d);
  }
}
