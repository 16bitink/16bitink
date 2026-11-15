import { pushOut } from '../geom';
import { GADGET, oilUnder } from './gadgets';
import { groundAt, isDrivable, isIcy, isMuddy, isWaterAt, type Ground } from '../land';
import { driveRail } from './rail';
import { spinePoint } from './body';
import { clamp, turnTowards, wrapAngle } from '../vec';
import type { Match } from './match';
import type { Tank, TankInput } from './types';

/** How hard a tank gets up to speed, px/s², before the engine factor. */
const ACCEL = 420;
const REVERSE = 0.6;
/** Beyond this angle off the heading, a pointing stick backs up instead of turning round. */
const BACK_UP = 2.4;
export const CARRY_SLOW = 0.8;
/**
 * Levels after this one let a wedged tank drive out (moveBy). Chapters 1–2 keep
 * the old rule (a tank pushed half over water or off the map edge sticks):
 * their levels were tuned on it (level 14's storm raiders, measured Nov 14).
 */
export const WEDGE_FIX_FROM = 20;
/**
 * Levels after this one keep tanks on the map after collisions (chapter 5: a
 * young tree's push or a bump could shove a tank past the map edge, where it
 * stuck for good). Chapters 1–4 keep the old rule they were tuned on.
 */
export const EDGE_CLAMP_FROM = 40;

/**
 * Ice (chapter 4): the tank slides with its iceGrip, and it gets up to speed,
 * brakes and turns this much more weakly (momentum carries).
 */
export const ICE = { accel: 0.45, turn: 0.75 } as const;

function groundMult(m: Match, t: Tank, g: Ground): number {
  const base = g === 'sand' ? t.stats.sand : isMuddy(g) ? t.stats.mud : g === 'snow' ? t.stats.snow : g === 'forestFloor' ? t.stats.forest : 1;
  return base * (t.carrying ? CARRY_SLOW : 1);
}

/** How well a tank grips this ground: Wheels on sand, every drive on ice, Hover everywhere. */
function gripOn(t: Tank, g: Ground): number {
  return g === 'sand' ? t.stats.sandGrip : isIcy(g) && !t.stats.floats ? t.stats.iceGrip : t.stats.grip;
}

/**
 * Where a tank can be: dry land for ground drives; any ground for Hover
 * (`stats.floats`); deep water only for a `keel` (the barge, the Ironclad).
 */
export function canStand(m: Match, t: Tank, x: number, y: number): boolean {
  return t.keel ? isWaterAt(m.land, x, y) : isDrivable(m.land, x, y, t.stats.floats);
}

/** Turns and throttles a tank from its input, then moves it and resolves collisions. */
export function driveTank(m: Match, t: Tank, input: TankInput, dt: number): void {
  if (t.role === 'bossTurret') return;
  if (t.rail) return driveRail(t, input, dt);
  const s = t.stats;
  const g = groundAt(m.land, t.x, t.y);
  const ice = isIcy(g) && !s.floats;
  // Someone else's oil slick: slide slowly and turn badly. A mine-broken track: half speed.
  const oil = oilUnder(m.gadgets, t.team, t.x, t.y, m.t) ? GADGET.oil : null;
  const broken = m.t < t.trackBrokenUntil ? GADGET.mine.slow : 1;
  const top = s.speed * groundMult(m, t, g) * broken * (oil ? oil.speed : 1);
  // Wheels and half-tracks need some roll to turn; tracks pivot.
  const roll = (s.pivots ? 1 : clamp(0.35 + Math.abs(t.speed) / Math.max(1, s.speed), 0.35, 1)) * (oil ? oil.turn : 1) * (ice ? ICE.turn : 1);
  let throttle = 0;
  const mv = input.move;
  if (mv?.kind === 'tank') {
    t.heading = wrapAngle(t.heading + clamp(mv.turn, -1, 1) * s.turn * roll * dt * (t.speed < -1 ? -1 : 1));
    throttle = clamp(mv.throttle, -1, 1);
  } else if (mv?.kind === 'point' && mv.mag > 0) {
    const off = wrapAngle(mv.angle - t.heading);
    if (Math.abs(off) > BACK_UP && !t.isPlayer) {
      // Back up towards the point: aim the tail at it.
      t.heading = turnTowards(t.heading, wrapAngle(mv.angle + Math.PI), s.turn * roll * dt);
      throttle = -mv.mag * Math.max(0, Math.cos(wrapAngle(mv.angle + Math.PI - t.heading)));
    } else {
      t.heading = turnTowards(t.heading, mv.angle, s.turn * roll * dt);
      const along = Math.cos(wrapAngle(mv.angle - t.heading));
      throttle = mv.mag * (s.pivots ? Math.max(0, along) ** 2 : Math.max(0.25, along));
    }
  }
  const want = throttle >= 0 ? throttle * top : throttle * top * REVERSE;
  const accel = ACCEL * s.engineFactor * dt * (ice ? ICE.accel : 1);
  t.speed = t.speed < want ? Math.min(want, t.speed + accel) : Math.max(want, t.speed - accel * 1.6);
  if (Math.abs(t.speed) < 0.5 && want === 0) t.speed = 0;
  const step = t.speed * dt;
  // Low grip slides: Wheels on sand (chapter 2), Hover everywhere (chapter 3), every drive on ice (chapter 4).
  const grip = gripOn(t, g);
  if (grip >= 1) {
    // Firm grip: it goes where it points (and any slide ends at once).
    t.slide = null;
    moveBy(m, t, Math.cos(t.heading) * step, Math.sin(t.heading) * step);
  } else slideBy(m, t, grip, dt);
  t.rolled += Math.abs(step);
}

/** How fast a sliding tank's path swings round to its heading, per second at grip 1. */
export const SLIDE_RATE = 6;

/**
 * Low grip on sand (Wheels, chapter 2): the tank moves with a velocity that
 * swings towards its heading at SLIDE_RATE × grip per second, so a hard turn
 * slides out wide before it bites. A collision slows the slide with the tank.
 */
function slideBy(m: Match, t: Tank, grip: number, dt: number): void {
  const vx = Math.cos(t.heading) * t.speed;
  const vy = Math.sin(t.heading) * t.speed;
  const v = (t.slide ??= { vx, vy });
  const k = 1 - Math.exp(-SLIDE_RATE * grip * dt);
  v.vx += (vx - v.vx) * k;
  v.vy += (vy - v.vy) * k;
  const before = Math.abs(t.speed);
  moveBy(m, t, v.vx * dt, v.vy * dt);
  if (before > 1 && Math.abs(t.speed) < before) {
    const keep = Math.abs(t.speed) / before;
    v.vx *= keep;
    v.vy *= keep;
  }
}

/**
 * Whether a tank wedged half over water (or off the map) may drive out. Chapters 1–2 keep the
 * old rule for enemies (they stick: their levels were tuned on it); our own side (the player,
 * wingmen, freed crews) always may: a bump at the shore must never trap the player.
 */
function wedgeOut(m: Match, t: Tank): boolean {
  return m.level.def.number > WEDGE_FIX_FROM || t.team === 0;
}

/** Moves with sliding along water and closed land, then pushes out of solids and other tanks. */
export function moveBy(m: Match, t: Tank, dx: number, dy: number): void {
  const bad = (x: number, y: number): number => offGround(m, t, x, y);
  const ok = (x: number, y: number): boolean => bad(x, y) === 0;
  if (ok(t.x + dx, t.y + dy)) {
    t.x += dx;
    t.y += dy;
  } else if (ok(t.x + dx, t.y)) {
    t.x += dx;
    t.speed *= 0.7;
  } else if (ok(t.x, t.y + dy)) {
    t.y += dy;
    t.speed *= 0.7;
  } else if (wedgeOut(m, t) && unwedgesBy(m, t, dx, dy)) {
    // Wedged half over water (a bump pushed it there, even its centre): it may drive out, not stick for good.
    t.x += dx;
    t.y += dy;
  } else {
    t.speed *= 0.3;
  }
  collideStructures(m, t);
  if (t.role !== 'boss') collideTanks(m, t);
  if (m.level.def.number > EDGE_CLAMP_FROM || t.team === 0) {
    const k = t.stats.radius * 0.6 + 1;
    t.x = Math.min(m.land.width - k, Math.max(k, t.x));
    t.y = Math.min(m.land.height - k, Math.max(k, t.y));
  }
}

/** How many of a tank's five ground points (its centre, and 0.6 × its radius each way) are off its ground (water, or dry land for a keel) at (x, y). */
export function offGround(m: Match, t: Tank, x: number, y: number): number {
  const r = t.stats.radius * 0.6;
  return (canStand(m, t, x, y) ? 0 : 1) + (canStand(m, t, x + r, y) ? 0 : 1) + (canStand(m, t, x - r, y) ? 0 : 1) + (canStand(m, t, x, y + r) ? 0 : 1) + (canStand(m, t, x, y - r) ? 0 : 1);
}

/**
 * A wedged tank (`now` of its five points off its ground) may make a move that ends with its centre
 * on its ground (the chapter 3 rule), that takes more of it back onto its ground, or that keeps as
 * much on it while heading for ground close ahead (`landAhead`): it drives out, never further in,
 * and never rides along in the water.
 */
export function unwedges(now: number, next: number, centreOk: boolean, landAhead = false): boolean {
  return now > 0 && (centreOk || next < now || (next === now && landAhead));
}

function unwedgesBy(m: Match, t: Tank, dx: number, dy: number): boolean {
  const now = offGround(m, t, t.x, t.y);
  const next = offGround(m, t, t.x + dx, t.y + dy);
  const centreOk = canStand(m, t, t.x + dx, t.y + dy);
  return unwedges(now, next, centreOk, !centreOk && next === now && groundAhead(m, t, dx, dy));
}

/** Ground it can stand on within two radii along (dx, dy). */
function groundAhead(m: Match, t: Tank, dx: number, dy: number): boolean {
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return false;
  for (let k = 5; k <= t.stats.radius * 2; k += 5) if (canStand(m, t, t.x + (dx / d) * k, t.y + (dy / d) * k)) return true;
  return false;
}

/**
 * Moves `t` by (dx, dy), or by the part of it along one axis, so that no more of it ends off its
 * ground: a bump never shoves a tank into the water (chapter 3 on, and our side), it slides it
 * along the bank or a boardwalk instead. A tank shoved in used to stick there for good (level 22).
 */
function shove(m: Match, t: Tank, dx: number, dy: number): void {
  if (wedgeOut(m, t) && !t.rail) {
    const now = offGround(m, t, t.x, t.y);
    const fits = (x: number, y: number): boolean => offGround(m, t, t.x + x, t.y + y) <= now;
    if (!fits(dx, dy)) {
      // The larger part of the push first.
      const tries: readonly (readonly [number, number])[] = Math.abs(dx) >= Math.abs(dy) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
      const ok = tries.find(([x, y]) => fits(x, y));
      if (!ok) return;
      [dx, dy] = ok;
    }
  }
  t.x += dx;
  t.y += dy;
}

function crushes(t: Tank): boolean {
  return t.role === 'boss' || t.stats.drive === 'tracks' || t.stats.hull === 'heavy';
}

function collideStructures(m: Match, t: Tank): void {
  const r = t.stats.radius;
  const ids = m.grid.query({ x0: t.x - r, y0: t.y - r, x1: t.x + r, y1: t.y + r });
  for (const i of ids) {
    const s = m.structs[i]!;
    if (s.state === 0 || s.def.cover || s.def.crest || s.def.deck || s.def.span) continue;
    const p = pushOut(s.def.shape, s.def.x, s.def.y, t.x, t.y, r * 0.85);
    if (!p) continue;
    if (s.def.flattenable) {
      if (crushes(t)) {
        breakStructure(m, i);
        continue;
      }
    }
    t.x += p.x;
    t.y += p.y;
    t.speed *= 0.85;
  }
}

function collideTanks(m: Match, t: Tank): void {
  for (const o of m.tanks) {
    if (o === t || !o.alive || o.role === 'bossTurret') continue;
    // A long body (the train) pushes from the nearest point of its spine.
    const c = spinePoint(o, t.x, t.y);
    const dx = t.x - c.x;
    const dy = t.y - c.y;
    const need = (t.stats.radius + o.stats.radius) * 0.8;
    const d2 = dx * dx + dy * dy;
    if (d2 >= need * need) continue;
    const d = Math.sqrt(d2) || 1;
    const push = need - d;
    // The boss doesn't budge; two tanks share the push.
    const share = o.role === 'boss' ? 1 : 0.5;
    shove(m, t, (dx / d) * push * share, (dy / d) * push * share);
    if (o.role !== 'boss') shove(m, o, -(dx / d) * push * 0.5, -(dy / d) * push * 0.5);
  }
}

export function breakStructure(m: Match, i: number): void {
  const s = m.structs[i]!;
  if (s.state === 0) return;
  s.hp = 0;
  s.state = 0;
  m.unblockNav(s.def.id);
  m.emit({ kind: 'struct', id: s.def.id, state: 0 });
  m.structBroke(s);
}

/** Boss turrets ride on their body. */
export function placeMounted(m: Match, t: Tank): void {
  if (t.parent === null || !t.mount) return;
  const body = m.tank(t.parent);
  if (!body) return;
  const c = Math.cos(body.heading);
  const s = Math.sin(body.heading);
  t.x = body.x + t.mount.dx * c - t.mount.dy * s;
  t.y = body.y + t.mount.dx * s + t.mount.dy * c;
  // A wrecked turret can't aim: it turns with the hull, keeping the angle it died at.
  if (!t.alive) t.turret += body.heading - t.heading;
  t.heading = body.heading;
}
