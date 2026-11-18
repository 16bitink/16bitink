/**
 * InkBrick's physics: `new Sim(level)`, then `step(input)` 120 times a second. Headless and
 * deterministic (no Math.random, no clock, no Math.sin/cos), so the game, bots, lab,
 * generator and tests share it. See docs/inkbrick-design.md "Engine contract".
 */
import {
  BALL_R, BALL_SPEED, BALL_SPEED_MAX, BOSS_HIT_COOLDOWN, CRUMBLE_IDLE, CRUMBLE_SHARE, LAUNCH_X,
  LOOP_BOUNCES, MAX_BOUNCE_DEG, PADDLE_H, PADDLE_W, PADDLE_W_WIDE, PADDLE_Y,
  SPEED_UP, SPEED_UP_EVERY, SUBSTEP_PX, WHIRL_COOLDOWN, WHIRL_RADIUS,
} from './constants';
import { C_BOSS, C_BRICK, C_NONE, findContact, newContact, type Contact } from './contact';
import { breakBrick, hitBrick, movePickups, runDelayed } from './effects';
import { movePieces } from './pieces';
import { keepSideways, keepUpright, nudge } from './steer';
import { cosDeg, sinDeg } from './trig';
import { BOARD_H, BOARD_W, CELL, COLS, STEP, type LevelDef, type SimEvent, type SimInput, type SimState } from './types';
import { assertLevel } from './validate';
import { createWorld, newBall, type Ball, type World } from './world';

const MAX_RESOLVES = 6;
const PUSH_EPS = 0.01;

function speedFor(playTime: number): number {
  const tier = Math.floor(playTime / SPEED_UP_EVERY);
  let s = BALL_SPEED;
  for (let i = 0; i < tier && s < BALL_SPEED_MAX; i++) s *= SPEED_UP;
  return Math.min(s, BALL_SPEED_MAX);
}

export class Sim {
  private readonly w: World;
  private readonly contact: Contact = newContact();

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
    if (w.launched) w.elapsed += STEP;
    movePieces(w);
    this.movePaddle(input.paddleX);
    if (w.phase === 'aim') {
      const ball = w.balls[0]!;
      ball.x = w.aimX;
      ball.y = PADDLE_Y - BALL_R;
      if (input.launch) this.launch();
    }
    if (w.phase === 'play') this.play();
    runDelayed(w);
    if (movePickups(w) && w.phase === 'aim') this.launch();
    this.tickTimers();
    this.checkEnd();
  }

  private movePaddle(x: number): void {
    const w = this.w;
    w.paddle.width = w.wideLeft > 0 ? PADDLE_W_WIDE : PADDLE_W;
    const half = w.paddle.width / 2;
    let lo = half;
    let hi = BOARD_W - half;
    if (w.phase === 'aim') {
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

  private launch(): void {
    const w = this.w;
    const ball = w.balls[0]!;
    const a = this.bounceAngle(ball.x);
    ball.vx = w.speed * sinDeg(a);
    ball.vy = -w.speed * cosDeg(a);
    w.phase = 'play';
    w.launched = true;
  }

  private play(): void {
    const w = this.w;
    w.playTime += STEP;
    const speed = speedFor(w.playTime);
    if (speed !== w.speed) {
      const k = speed / w.speed;
      for (const b of w.balls) {
        b.vx *= k;
        b.vy *= k;
      }
      w.speed = speed;
    }
    const subs = Math.ceil((w.speed * STEP) / SUBSTEP_PX);
    const dt = STEP / subs;
    for (let i = 0; i < w.balls.length; i++) this.moveBall(w.balls[i]!, subs, dt);
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
      if (b.y - BALL_R > BOARD_H) {
        b.lost = true;
        w.events.push({ type: 'ballLost' });
      }
    }
    if (b.lost) return;
    if (b.whirlCd > 0) b.whirlCd -= STEP;
    else this.whirl(b);
    const cx = Math.floor(b.x / CELL);
    const cy = Math.floor(b.y / CELL);
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
    if (b.x < BALL_R) {
      b.x = BALL_R;
      b.vx = Math.abs(b.vx);
      ev.push({ type: 'bounce', on: 'wall', x: b.x, y: b.y });
      this.idleBounce(b);
    } else if (b.x > BOARD_W - BALL_R) {
      b.x = BOARD_W - BALL_R;
      b.vx = -Math.abs(b.vx);
      ev.push({ type: 'bounce', on: 'wall', x: b.x, y: b.y });
      this.idleBounce(b);
    }
    if (b.y < BALL_R) {
      b.y = BALL_R;
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
    if (b.vy <= 0 || b.y + BALL_R < PADDLE_Y || b.y + BALL_R > PADDLE_Y + PADDLE_H) return;
    if (Math.abs(b.x - w.paddle.x) > w.paddle.width / 2 + BALL_R) return;
    const a = this.bounceAngle(b.x);
    b.vx = w.speed * sinDeg(a);
    b.vy = -w.speed * cosDeg(a);
    b.y = PADDLE_Y - BALL_R;
    b.idle = 0;
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
      } else {
        w.events.push({ type: 'bounce', on: 'stone', x: b.x, y: b.y });
        if (Math.abs(b.vx) < 1e-9) w.nudge++;
        keepSideways(b, w.speed, w.nudge);
        this.idleBounce(b);
      }
      keepUpright(b, w.speed);
    }
  }

  private hitBoss(b: Ball): void {
    const boss = this.w.boss;
    if (!boss || boss.cooldown > 0 || boss.hitsLeft <= 0) return;
    boss.hitsLeft--;
    boss.cooldown = BOSS_HIT_COOLDOWN;
    this.w.events.push({ type: 'bossHit', hitsLeft: boss.hitsLeft, x: b.x, y: b.y });
  }

  private whirl(b: Ball): void {
    const pairs = this.w.level.whirlpools ?? [];
    const r2 = WHIRL_RADIUS * WHIRL_RADIUS;
    for (const p of pairs) {
      const ax = (p.a.x + 0.5) * CELL;
      const ay = (p.a.y + 0.5) * CELL;
      const bx = (p.b.x + 0.5) * CELL;
      const by = (p.b.y + 0.5) * CELL;
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
    w.lives--;
    w.heartsLost++;
    w.events.push({ type: 'lifeLost', lives: w.lives });
    w.wideLeft = 0;
    w.fireLeft = 0;
    w.playTime = 0;
    w.speed = BALL_SPEED;
    w.pickups = [];
    if (w.lives <= 0) {
      w.phase = 'failed';
      w.events.push({ type: 'failed' });
      return;
    }
    w.phase = 'aim';
    w.aimX = LAUNCH_X;
    w.balls = [newBall(LAUNCH_X, PADDLE_Y - BALL_R)];
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
