/**
 * InkBrick's physics: `new Sim(level)`, then `step(input)` 120 times a second. Headless and
 * deterministic (no Math.random, no clock, no Math.sin/cos), so the game, bots, lab,
 * generator and tests share it. See docs/inkbrick-design.md "Engine contract".
 */
import {
  BALL_SPEED, BALL_SPEED_MAX, BOSS_HIT_COOLDOWN, BUMP_KICK, CRAB_FAST_SECONDS, CRUMBLE_IDLE, CRUMBLE_SHARE, LAUNCH_X,
  LEVER_COOLDOWN, LOOP_BOUNCES, MAX_BALLS, MAX_BOUNCE_DEG, PADDLE_H, PADDLE_W, PADDLE_W_WIDE, PADDLE_Y,
  SPEED_UP, SPEED_UP_EVERY, STICKY_HOLD, SUBSTEP_PX, TINY_RAFT_W, TINY_RAFT_W_WIDE, TWO_STONES_MIN_DEG,
  WHIRL_COOLDOWN, WHIRL_RADIUS, WIDE_RAFT_W,
} from './constants';
import { C_BOSS, C_BRICK, C_BUMPER, C_CRAB, C_NONE, findContact, newContact, type Contact } from './contact';
import { breakBrick, hitBrick, movePickups, runDelayed } from './effects';
import { pullBalls, stepTide, touchGoals } from './goals';
import { movePieces, walkCrabs } from './pieces';
import { keepSideways, keepUpright, kick, nudge } from './steer';
import { cosDeg, sinDeg } from './trig';
import { BOARD_H, BOARD_W, CELL, COLS, STEP, type LevelDef, type SimEvent, type SimInput, type SimState } from './types';
import { assertLevel } from './validate';
import { createWorld, newBall, ruleNumbers, type Ball, type World } from './world';

const MAX_RESOLVES = 6;
const PUSH_EPS = 0.01;

function speedFor(playTime: number): number {
  const tier = Math.floor(playTime / SPEED_UP_EVERY);
  let s = BALL_SPEED;
  for (let i = 0; i < tier && s < BALL_SPEED_MAX; i++) s *= SPEED_UP;
  return Math.min(s, BALL_SPEED_MAX);
}

/** The raft's width under the rule (tinyRaft, wideRaft) with or without the Wide pickup. */
export function raftWidth(rule: LevelDef['rule'], wide: boolean): number {
  if (rule === 'tinyRaft') return wide ? TINY_RAFT_W_WIDE : TINY_RAFT_W;
  if (rule === 'wideRaft') return wide ? Math.max(WIDE_RAFT_W, PADDLE_W_WIDE) : WIDE_RAFT_W;
  return wide ? PADDLE_W_WIDE : PADDLE_W;
}

export class Sim {
  private readonly w: World;
  private readonly contact: Contact = newContact();
  /** sticky: the stone the raft is holding. */
  private held: Ball | null = null;

  constructor(level: LevelDef) {
    assertLevel(level);
    this.w = createWorld(level);
    movePieces(this.w);
  }

  get state(): SimState {
    return this.w;
  }

  drainEvents(): SimEvent[] {
    const out = this.w.events;
    this.w.events = [];
    return out;
  }

  step(input: SimInput): void {
    const w = this.w;
    if (w.phase === 'cleared' || w.phase === 'failed') return;
    w.time += STEP;
    // The clock runs only while the stone is in play: it stops after a lost heart until the next launch.
    if (w.phase === 'play') w.elapsed += STEP;
    if (w.crabs.length > 0) walkCrabs(w);
    movePieces(w);
    this.movePaddle(input.paddleX);
    if (w.phase === 'aim') {
      const ball = w.balls[0]!;
      ball.x = w.aimX;
      ball.y = PADDLE_Y - w.ballRadius;
      if (input.launch) this.launch(true);
    }
    if (w.phase === 'play' && this.held) this.holdStone(input.launch);
    if (w.phase === 'play') this.play();
    if (w.phase === 'play' && stepTide(w)) this.loseLife();
    runDelayed(w);
    if (movePickups(w) && w.phase === 'aim') this.launch(false);
    this.tickTimers();
    this.checkEnd();
  }

  private movePaddle(x: number): void {
    const w = this.w;
    w.paddle.width = w.rule ? raftWidth(w.rule, w.wideLeft > 0) : w.wideLeft > 0 ? PADDLE_W_WIDE : PADDLE_W;
    const half = w.paddle.width / 2;
    let lo = half;
    let hi = BOARD_W - half;
    if (w.phase === 'aim' || this.held) {
      lo = Math.max(lo, w.aimX - half);
      hi = Math.min(hi, w.aimX + half);
    }
    const want = Number.isFinite(x) ? x : w.paddle.x;
    w.paddle.x = want < lo ? lo : want > hi ? hi : want;
  }

  private bounceAngle(ballX: number): number {
    const half = this.w.paddle.width / 2;
    let off = (ballX - this.w.paddle.x) / half;
    off = off < -1 ? -1 : off > 1 ? 1 : off;
    return off * MAX_BOUNCE_DEG;
  }

  /** `spend`: the player's own launch (Few Stones spends a stone; a +3 catch in aim doesn't). */
  private launch(spend: boolean): void {
    const w = this.w;
    const ball = w.balls[0]!;
    const a = this.bounceAngle(ball.x);
    ball.vx = w.speed * sinDeg(a);
    ball.vy = -w.speed * cosDeg(a);
    ball.ghost = w.rule === 'ghost';
    if (w.rule === 'twoStones' && w.balls.length < MAX_BALLS) {
      // Mirrored about straight up; a straight shot is split a little so the two don't fly as one.
      const m = Math.abs(a) < TWO_STONES_MIN_DEG ? (a < 0 ? TWO_STONES_MIN_DEG : -TWO_STONES_MIN_DEG) : -a;
      const twin = newBall(ball.x, ball.y, w.speed * sinDeg(m), -w.speed * cosDeg(m));
      if (Math.abs(a) < TWO_STONES_MIN_DEG) {
        ball.vx = -twin.vx;
        ball.vy = twin.vy;
      }
      w.balls.push(twin);
    }
    if (spend && w.goal === 'stones') {
      w.stonesLeft--;
      w.events.push({ type: 'stoneSpent', left: w.stonesLeft });
    }
    w.phase = 'play';
    w.launched = true;
  }

  /** sticky: the held stone sits where it was caught; thrown on a tap or after STICKY_HOLD s. */
  private holdStone(tap: boolean): void {
    const w = this.w;
    const b = this.held!;
    b.y = PADDLE_Y - w.ballRadius;
    w.aimX = b.x;
    w.caughtFor += STEP;
    if (!tap && w.caughtFor < STICKY_HOLD) return;
    const a = this.bounceAngle(b.x);
    b.vx = w.speed * sinDeg(a);
    b.vy = -w.speed * cosDeg(a);
    this.held = null;
    b.held = false;
    w.caught = false;
    w.events.push({ type: 'bounce', on: 'paddle', x: b.x, y: b.y });
  }

  private play(): void {
    const w = this.w;
    w.playTime += STEP;
    const speed = speedFor(w.playTime) * w.speedMul;
    if (speed !== w.speed) {
      const k = speed / w.speed;
      for (const b of w.balls) {
        b.vx *= k;
        b.vy *= k;
      }
      w.speed = speed;
    }
    pullBalls(w, this.held);
    const subs = Math.ceil((w.speed * STEP) / SUBSTEP_PX);
    const dt = STEP / subs;
    for (let i = 0; i < w.balls.length; i++) {
      const b = w.balls[i]!;
      if (b !== this.held) this.moveBall(b, subs, dt);
    }
    if (w.balls.some((b) => b.lost)) w.balls = w.balls.filter((b) => !b.lost);
    w.peakBalls = Math.max(w.peakBalls, w.balls.length);
    if (w.balls.length === 0) this.loseLife();
  }

  private moveBall(b: Ball, subs: number, dt: number): void {
    const w = this.w;
    for (let s = 0; s < subs && !b.lost; s++) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      this.walls(b);
      this.paddleBounce(b);
      this.resolve(b);
      if (b.y - w.ballRadius > BOARD_H) {
        b.lost = true;
        w.events.push({ type: 'ballLost' });
      }
      if (b === this.held) return;
    }
    if (b.lost) return;
    if (b.whirlCd > 0) b.whirlCd -= STEP;
    else this.whirl(b);
    if (w.rescue || w.pearls.length > 0 || w.dailyPearl) touchGoals(w, b);
    const cx = Math.floor(b.x / CELL);
    // The inside map is the level's; on a Rising Tide level it sinks with the field.
    const cy = Math.floor(b.y / CELL) - w.tideOffset;
    if (cx < 0 || cx >= COLS || cy < 0) return;
    const c = cy * COLS + cx;
    if (w.near[c]) w.lastNearAt = w.elapsed;
    if (w.inside[c] && !w.breakIn) {
      w.breakIn = true;
      w.breakInAt = w.elapsed;
      w.events.push({ type: 'breakIn' });
    }
  }

  private walls(b: Ball): void {
    const ev = this.w.events;
    const r = this.w.ballRadius;
    if (b.x < r) {
      b.x = r;
      b.vx = Math.abs(b.vx);
      ev.push({ type: 'bounce', on: 'wall', x: b.x, y: b.y });
      this.idleBounce(b);
    } else if (b.x > BOARD_W - r) {
      b.x = BOARD_W - r;
      b.vx = -Math.abs(b.vx);
      ev.push({ type: 'bounce', on: 'wall', x: b.x, y: b.y });
      this.idleBounce(b);
    }
    if (b.y < r) {
      b.y = r;
      b.vy = Math.abs(b.vy);
      ev.push({ type: 'bounce', on: 'wall', x: b.x, y: b.y });
      // The ceiling is as hard as stone: a straight-up stone comes back down at an angle.
      if (Math.abs(b.vx) < 1e-9) this.w.nudge++;
      keepSideways(b, this.w.speed, this.w.nudge);
      this.idleBounce(b);
    }
  }

  /** The loop breaker: too many bounces in a row that touch nothing breakable turn the stone a little. */
  private idleBounce(b: Ball): void {
    b.idle++;
    if (b.idle < LOOP_BOUNCES) return;
    b.idle = 0;
    this.w.nudge++;
    nudge(b, this.w.nudge);
    keepUpright(b, this.w.speed);
  }

  private paddleBounce(b: Ball): void {
    const w = this.w;
    const r = w.ballRadius;
    if (b.vy <= 0 || b.y + r < PADDLE_Y || b.y + r > PADDLE_Y + PADDLE_H) return;
    if (Math.abs(b.x - w.paddle.x) > w.paddle.width / 2 + r) return;
    b.y = PADDLE_Y - r;
    b.idle = 0;
    if (w.rule === 'ghost') b.ghost = true;
    if (w.rule === 'sticky' && !this.held && w.balls.length === 1) {
      // Caught: it rests where it landed; the raft slides under it to aim, as at the launch.
      b.x = Math.max(w.paddle.x - w.paddle.width / 2, Math.min(w.paddle.x + w.paddle.width / 2, b.x));
      b.vx = 0;
      b.vy = 0;
      this.held = b;
      b.held = true;
      w.caught = true;
      w.caughtFor = 0;
      w.aimX = b.x;
      w.events.push({ type: 'caught' });
      return;
    }
    const a = this.bounceAngle(b.x);
    b.vx = w.speed * sinDeg(a);
    b.vy = -w.speed * cosDeg(a);
    w.events.push({ type: 'bounce', on: 'paddle', x: b.x, y: b.y });
  }

  private resolve(b: Ball): void {
    const w = this.w;
    const c = this.contact;
    for (let n = 0; n < MAX_RESOLVES; n++) {
      findContact(w, b, c);
      if (c.kind === C_NONE) return;
      const brick = c.kind === C_BRICK ? w.bricks[c.id]! : null;
      if (brick && w.fireLeft > 0 && (brick.kind === 'soft' || brick.kind === 'tough')) {
        breakBrick(w, brick.index, b);
        continue;
      }
      // ghost: through the first brick it breaks after a raft hit.
      if (brick && b.ghost && brick.breakable && brick.hp <= 1) {
        b.ghost = false;
        breakBrick(w, brick.index, b);
        continue;
      }
      const dot = b.vx * c.nx + b.vy * c.ny;
      b.x += c.nx * (c.pen + PUSH_EPS);
      b.y += c.ny * (c.pen + PUSH_EPS);
      if (dot >= 0) continue;
      b.vx -= 2 * dot * c.nx;
      b.vy -= 2 * dot * c.ny;
      if (brick && brick.breakable) {
        b.idle = 0;
        hitBrick(w, brick.index, b);
      } else if (c.kind === C_BOSS) {
        b.idle = 0;
        this.hitBoss(b);
      } else if (c.kind === C_BUMPER) {
        const p = w.bumpers[c.id]!;
        kick(b, c.nx, c.ny, w.speed, BUMP_KICK);
        p.kickAt = w.time;
        w.events.push({ type: 'bump', bumper: c.id, x: b.x, y: b.y });
        this.idleBounce(b);
      } else {
        if (brick && brick.kind === 'lever') this.pullLever(brick.index, b);
        else if (c.kind === C_CRAB) this.hitCrab(c.id, b);
        w.events.push({ type: 'bounce', on: 'stone', x: b.x, y: b.y });
        if (Math.abs(b.vx) < 1e-9) w.nudge++;
        keepSideways(b, w.speed, w.nudge);
        this.idleBounce(b);
      }
      keepUpright(b, w.speed);
    }
  }

  /** A lever flips every wall with its link, at most once per LEVER_COOLDOWN s. */
  private pullLever(i: number, b: Ball): void {
    const w = this.w;
    b.idle = 0;
    if (w.leverAt[i]! >= 0 && w.time - w.leverAt[i]! < LEVER_COOLDOWN) return;
    w.leverAt[i] = w.time;
    const link = w.bricks[i]!.def.link ?? '';
    for (const f of w.flips) if (f.link === link) f.solid = !f.solid;
    w.events.push({ type: 'lever', brick: i, link, x: b.x, y: b.y });
  }

  private hitCrab(i: number, b: Ball): void {
    const k = this.w.crabs[i]!;
    k.fastLeft = CRAB_FAST_SECONDS;
    this.w.events.push({ type: 'crabHit', crab: i, x: b.x, y: b.y });
  }

  private hitBoss(b: Ball): void {
    const boss = this.w.boss;
    if (!boss || boss.cooldown > 0 || boss.hitsLeft <= 0) return;
    boss.hitsLeft--;
    boss.cooldown = BOSS_HIT_COOLDOWN;
    this.w.events.push({ type: 'bossHit', hitsLeft: boss.hitsLeft, x: b.x, y: b.y });
  }

  private whirl(b: Ball): void {
    const r2 = WHIRL_RADIUS * WHIRL_RADIUS;
    for (const p of this.w.whirlpools) {
      const { ax, ay, bx, by } = p;
      const toB = (b.x - ax) * (b.x - ax) + (b.y - ay) * (b.y - ay) < r2;
      const toA = !toB && (b.x - bx) * (b.x - bx) + (b.y - by) * (b.y - by) < r2;
      if (!toA && !toB) continue;
      b.x = toB ? bx : ax;
      b.y = toB ? by : ay;
      b.whirlCd = WHIRL_COOLDOWN;
      return;
    }
  }

  private loseLife(): void {
    const w = this.w;
    const stones = w.goal === 'stones';
    if (!stones) {
      w.lives--;
      w.heartsLost++;
      w.events.push({ type: 'lifeLost', lives: w.lives });
    }
    w.wideLeft = 0;
    w.fireLeft = 0;
    w.playTime = 0;
    w.speed = BALL_SPEED * ruleNumbers(w.level).speedMul;
    w.pickups = [];
    this.held = null;
    w.caught = false;
    if (stones ? w.stonesLeft <= 0 : w.lives <= 0) {
      if (stones && w.brokenShare >= w.need - 1e-9) {
        this.clear();
        return;
      }
      w.phase = 'failed';
      w.events.push({ type: 'failed' });
      return;
    }
    w.phase = 'aim';
    w.aimX = LAUNCH_X;
    w.balls = [newBall(LAUNCH_X, PADDLE_Y - w.ballRadius)];
  }

  private tickTimers(): void {
    const w = this.w;
    if (w.wideLeft > 0) w.wideLeft = Math.max(0, w.wideLeft - STEP);
    if (w.fireLeft > 0) w.fireLeft = Math.max(0, w.fireLeft - STEP);
    if (w.boss && w.boss.cooldown > 0) w.boss.cooldown -= STEP;
  }

  private checkEnd(): void {
    const w = this.w;
    if (w.phase !== 'play' && w.phase !== 'aim') return;
    if (w.boss) {
      if (w.boss.hitsLeft <= 0) this.clear();
      return;
    }
    if (w.goal === 'rescue' || w.goal === 'pearls') {
      // The board needn't be cleared: freeing the friend or taking the last pearl wins.
      if (w.goal === 'rescue' ? w.rescued : w.pearls.length > 0 && w.pearlsTaken === w.pearls.length) this.clear();
      return;
    }
    if (w.goal === 'stones') {
      if (w.breakableLeft <= 0) this.clear();
      return;
    }
    const few = w.breakableLeft > 0 && w.breakableLeft < CRUMBLE_SHARE * w.breakableTotal;
    if (few && w.launched && w.elapsed - w.lastBreakAt >= CRUMBLE_IDLE) {
      w.events.push({ type: 'crumble' });
      for (const b of w.bricks) if (b.alive && b.breakable) breakBrick(w, b.index, null, false);
    }
    if (w.breakableLeft <= 0) this.clear();
  }

  private clear(): void {
    this.w.phase = 'cleared';
    this.w.events.push({ type: 'cleared' });
  }
}
