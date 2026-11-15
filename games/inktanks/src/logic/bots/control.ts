import { heightMult } from '../match/heights';
import type { Match } from '../match/match';
import { IDLE, type Tank, type TankInput } from '../match/types';
import { clearLine, type NavGrid } from '../nav/grid';
import { flowDir, type FlowField } from '../nav/flow';
import { CELL, cellIndex } from '../land';
import { canStand } from '../match/movement';
import { angleTo, wrapAngle, type Pt } from '../vec';
import { think, type Brain } from './brain';
import { isLobbed } from '../match/lob';

const STUCK_MOVE = 10;
const STUCK_TIME = 1.0;
/** Stuck again this soon and this near where the last detour began: the next detour backs out first. */
const STUCK_AGAIN_TIME = 6;
const STUCK_AGAIN_NEAR = 40;
const DETOUR = 0.9;
const SEPARATION = 85;
/** Cannon and Rockets bots hold their aim line this long before they fire (Tactics §4). */
export const TELEGRAPH = 0.4;
// The Laser too (chapter 4): its beam is instant, so the aim line is the only way to read it (dodge into cover).
const TELEGRAPHED: ReadonlySet<string> = new Set(['cannon', 'rockets', 'laser']);
/** A mortar bot fights from this share of its range (about 375 px: outside its 200 px minimum with room to spare). */
export const LOB_KEEP = 0.72;
/** Against a mortar, fight from this share of its minimum range (inside it, where its shells can't land). */
export const UNDER_LOB = 0.6;
/** A Flamer bot fights from this share of its range (about 85 px: well inside its 150 px stream). */
export const FLAME_KEEP = 0.55;
/** A Laser bot fights from this share of its range (about 375 px: it out-reaches every direct gun, so it keeps them off). */
export const LASER_KEEP = 0.78;
/** A Rail bot fights from this share of its range (about 450 px: far back, shooting through the trees). */
export const RAIL_KEEP = 0.7;
/** A looting bot stops this far inside a pickup's reach (pickups.ts REACH is 14). */
const LOOT_STOP = 10;
/** Bots steer this far round mines they watched being laid. */
const MINE_AVOID = 70;

/** How many cell rings round a tank `rejoin` searches for a way back onto the field. */
const REJOIN_RING = 3;

/** Whether a tank can drive straight from where it is to (x, y): no solid in the way, its ground all along (every 10 px). */
function driveClear(m: Match, t: Tank, x: number, y: number): boolean {
  if (m.lineBlocker(t.x, t.y, x, y, null)) return false;
  const n = Math.max(1, Math.ceil(Math.hypot(x - t.x, y - t.y) / 10));
  for (let i = 1; i <= n; i++) if (!canStand(m, t, t.x + ((x - t.x) * i) / n, t.y + ((y - t.y) * i) / n)) return false;
  return true;
}

/**
 * Off the field: the tank's cell is closed (a bump or a strafe put it in a wall's margin) or
 * cut off from the goal. The best nearby cell that is on the field and that it can drive
 * straight to, by its distance there plus the field's from there; null when there is none.
 * (The field's own pick from a closed cell can be the neighbour through the wall: a tank
 * pressed against a wall pushed into it for the rest of the level, level 19, Nov 15.)
 */
function rejoin(m: Match, t: Tank, nav: NavGrid, f: FlowField): number | null {
  const gx0 = Math.floor(t.x / CELL);
  const gy0 = Math.floor(t.y / CELL);
  let best: Pt | null = null;
  let bestScore = Infinity;
  for (let dy = -REJOIN_RING; dy <= REJOIN_RING; dy++) {
    for (let dx = -REJOIN_RING; dx <= REJOIN_RING; dx++) {
      const gx = gx0 + dx;
      const gy = gy0 + dy;
      if ((dx === 0 && dy === 0) || gx < 0 || gy < 0 || gx >= nav.cols || gy >= nav.rows) continue;
      const i = gy * nav.cols + gx;
      const left = f.dist[i]!;
      if (nav.cost[i] === 0 || !Number.isFinite(left)) continue;
      const p = { x: (gx + 0.5) * CELL, y: (gy + 0.5) * CELL };
      const score = left + (2 * Math.hypot(p.x - t.x, p.y - t.y)) / CELL;
      if (score >= bestScore || !driveClear(m, t, p.x, p.y)) continue;
      bestScore = score;
      best = p;
    }
  }
  return best ? angleTo(t, best) : null;
}

/** The way to drive towards `goal`: straight when the line is clear, else down the flow field. */
export function navAngle(m: Match, t: Tank, goal: Pt): number {
  // A barge keeps to its river road: straight at the next point (its route is the channel).
  if (t.keel) return angleTo(t, goal);
  // Hover steers by its own grid (deep water open): the water routes are its short cuts.
  const { nav, flow } = m.navFor(t);
  if (clearLine(nav, t.x, t.y, goal.x, goal.y)) return angleTo(t, goal);
  const f = flow.get(goal.x, goal.y);
  if (!f) return angleTo(t, goal);
  const i = cellIndex(m.land, t.x, t.y);
  const off = i >= 0 && (nav.cost[i] === 0 || !Number.isFinite(f.dist[i]!)) && i !== f.goal;
  const a = (off ? rejoin(m, t, nav, f) : null) ?? flowDir(nav, f, t.x, t.y);
  return a ?? angleTo(t, goal);
}

/** Steers a desired angle away from nearby tanks, and from mines it saw laid. */
function separate(m: Match, t: Tank, angle: number, ignore: number | null): number {
  let vx = Math.cos(angle);
  let vy = Math.sin(angle);
  for (const mine of m.gadgets.mines) {
    if (!mine.alive || !mine.known.has(t.id)) continue;
    const dx = t.x - mine.x;
    const dy = t.y - mine.y;
    const d = Math.hypot(dx, dy);
    if (d > MINE_AVOID || d < 1) continue;
    const k = ((MINE_AVOID - d) / MINE_AVOID) * 2.5;
    vx += (dx / d) * k;
    vy += (dy / d) * k;
  }
  for (const o of m.tanks) {
    if (o === t || !o.alive || o.id === ignore || o.role === 'bossTurret' || o.role === 'crew') continue;
    const dx = t.x - o.x;
    const dy = t.y - o.y;
    const d = Math.hypot(dx, dy);
    const reach = SEPARATION + o.stats.radius;
    if (d > reach || d < 1) continue;
    const k = ((reach - d) / reach) * 1.4;
    vx += (dx / d) * k;
    vy += (dy / d) * k;
  }
  return Math.atan2(vy, vx);
}

/** Where to aim: the target as last seen, moved on by its speed then, plus the shot's flight. */
function lead(m: Match, b: Brain, t: Tank, o: Tank, shotSpeed: number): Pt {
  const s = b.snap ?? { x: o.x, y: o.y, vx: 0, vy: 0, t: m.t };
  const d = Math.hypot(s.x - t.x, s.y - t.y);
  // A charged gun (the Rail) flies `charge` s after the pull: lead the target by that too.
  const time = d / shotSpeed + (m.t - s.t) + t.stats.gun.charge;
  return { x: s.x + s.vx * time, y: s.y + s.vy * time };
}

function trackStuck(m: Match, b: Brain, t: Tank, moving: boolean, dt: number): void {
  if (b.detourT > 0) {
    b.detourT -= dt;
    return;
  }
  const moved = Math.hypot(t.x - b.lastPos.x, t.y - b.lastPos.y);
  if (!moving || moved > STUCK_MOVE) {
    b.stuckT = 0;
    b.lastPos = { x: t.x, y: t.y };
    return;
  }
  b.stuckT += dt;
  if (b.stuckT > STUCK_TIME) {
    b.stuckT = 0;
    b.detourT = DETOUR;
    const swing = b.rng.range(-0.9, 0.9);
    b.detourAngle = wrapAngle(t.heading + Math.PI + swing);
    b.detourTurn = swing < 0 ? -1 : 1;
    // Stuck again where the last detour began: this time back out first (see botInput).
    const again = b.lastStuck !== null && m.t - b.lastStuck.t < STUCK_AGAIN_TIME && Math.hypot(t.x - b.lastStuck.x, t.y - b.lastStuck.y) < STUCK_AGAIN_NEAR;
    b.detourBack = again;
    // ...then off to the side, along whatever it ran into (a fence's end, a gap in the trees), not back the same way.
    if (again) b.detourAngle = wrapAngle(t.heading + b.detourTurn * (Math.PI / 2 + Math.abs(swing) * 0.5));
    b.lastStuck = { x: t.x, y: t.y, t: m.t };
    b.lastPos = { x: t.x, y: t.y };
  }
}

/**
 * Cannon and Rockets bots don't fire the moment they line up: they lock the
 * turret, show the aim line (an 'aim' event) for TELEGRAPH s, then fire along
 * it. Machineguns and the player don't.
 */
function telegraph(m: Match, b: Brain, t: Tank, aim: number | null, fire: boolean): { aim: number | null; fire: boolean } {
  // Only enemies warn: the player and our own guns (the gun towers) just fire.
  if (b.role === 'player' || t.team === 0 || !TELEGRAPHED.has(t.stats.gun.family)) return { aim, fire };
  const tg = b.telegraph;
  if (tg) {
    if (m.t + 1e-9 < tg.until) return { aim: tg.angle, fire: false };
    b.telegraph = null;
    return { aim: tg.angle, fire: true };
  }
  if (!fire || t.reload > 0 || t.burst > 0 || t.repairT > 0) return { aim, fire: false };
  const until = m.t + TELEGRAPH;
  b.telegraph = { angle: t.turret, until };
  m.emit({ kind: 'aim', tank: t.id, angle: t.turret, len: t.stats.gun.range, until });
  return { aim: t.turret, fire: false };
}

/** Seconds before a shell lands that the stand-in sees its ring and moves (a casual player's read). */
export const DODGE_WARN = 1.3;

/** How far ahead (px) a dodge checks the ground is drivable. */
const DODGE_LOOK = 80;

/**
 * Out of the nearest enemy shell's landing ring it's standing in: the
 * throttle (+1 forward, −1 reverse) that ends farther from the ring's centre
 * on drivable ground, or 0 (no shell coming, or nowhere to go).
 */
function lobDodge(m: Match, t: Tank): number {
  let best: { x: number; y: number; d: number } | null = null;
  for (const s of m.shots) {
    if (!s.lob || s.team === t.team) continue;
    const left = (s.range - s.travelled) / Math.max(1, Math.hypot(s.vx, s.vy));
    if (left > DODGE_WARN) continue;
    const d = Math.hypot(t.x - s.lob.tx, t.y - s.lob.ty);
    if (d > s.splash + t.stats.radius + 12 || (best && d >= best.d)) continue;
    best = { x: s.lob.tx, y: s.lob.ty, d };
  }
  if (!best) return 0;
  const ring = best;
  const score = (dir: 1 | -1): number => {
    const x = t.x + Math.cos(t.heading) * DODGE_LOOK * dir;
    const y = t.y + Math.sin(t.heading) * DODGE_LOOK * dir;
    return m.navPassable(x, y) ? Math.hypot(x - ring.x, y - ring.y) : -1;
  };
  const fwd = score(1);
  const back = score(-1);
  if (fwd < 0 && back < 0) return 0;
  return fwd >= back ? 1 : -1;
}

/** Seconds before a Rail's slug flies that the stand-in reads its charge line and moves off it (a casual player's read). */
export const RAIL_DODGE = 0.55;

/**
 * Off an enemy Rail's charge line it's standing on (chapter 5): the throttle
 * (+1 forward, −1 reverse) that takes it further from the line on drivable
 * ground, or 0 (no line on it, or nowhere to go).
 */
function railDodge(m: Match, t: Tank): number {
  let line: { x: number; y: number; ux: number; uy: number } | null = null;
  for (const o of m.tanks) {
    if (!o.alive || o.team === t.team || o.charge <= 0 || o.charge > RAIL_DODGE) continue;
    const ux = Math.cos(o.chargeAngle);
    const uy = Math.sin(o.chargeAngle);
    const k = (t.x - o.x) * ux + (t.y - o.y) * uy;
    const off = Math.abs((t.x - o.x) * uy - (t.y - o.y) * ux);
    if (k < 0 || k > o.stats.gun.range || off > t.stats.radius + 14) continue;
    line = { x: o.x, y: o.y, ux, uy };
    break;
  }
  if (!line) return 0;
  const l = line;
  const score = (dir: 1 | -1): number => {
    const x = t.x + Math.cos(t.heading) * DODGE_LOOK * dir;
    const y = t.y + Math.sin(t.heading) * DODGE_LOOK * dir;
    return m.navPassable(x, y) ? Math.abs((x - l.x) * l.uy - (y - l.y) * l.ux) : -1;
  };
  const fwd = score(1);
  const back = score(-1);
  if (fwd < 0 && back < 0) return 0;
  return fwd >= back ? 1 : -1;
}

/** Where an idle bot looks: a calm guard or turret sweeps round its post's heading; a suspicious one turns to the spot. */
function lookAround(m: Match, b: Brain, t: Tank): number | null {
  if (b.aware === 'suspicious' && b.awareSpot) return angleTo(t, b.awareSpot);
  if (b.aware === 'calm' && (b.role === 'guard' || b.role === 'turret') && b.state === 'idle') return wrapAngle(b.lookBase + Math.sin(m.t * 0.45 + t.id) * 0.7);
  return null;
}

export function botInput(m: Match, b: Brain, t: Tank, dt: number): TankInput {
  b.thinkT -= dt;
  if (b.thinkT <= 0) {
    b.thinkT = b.diff.reaction * b.rng.range(0.8, 1.2);
    think(m, b, t);
  }
  const target = b.target !== null ? m.tank(b.target) : null;
  const g = t.stats.gun;
  let aim: number | null = lookAround(m, b, t);
  let aimDist: number | null = null;
  let fire = false;
  const cover = b.coverShot;
  const lobs = isLobbed(g);
  if (lobs && (target?.alive || b.lobAt)) {
    // A mortar: aim at the spot (the target led by the shell's flight, or the lob spot), lob to its distance.
    const p = target?.alive ? lead(m, b, t, target, g.shotSpeed) : b.lobAt!;
    aim = angleTo(t, p) + b.aimNoise;
    aimDist = Math.hypot(p.x - t.x, p.y - t.y) * (1 + b.aimNoise * 0.5);
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    const inBand = d >= g.minRange - (target?.stats.radius ?? 0) && d <= g.range + (target?.stats.radius ?? 0);
    fire = !b.holdFire && (target?.alive ? b.los : true) && inBand && Math.abs(wrapAngle(t.turret - aim)) < 0.09;
  } else if (g.shot === 'rail' && !target?.alive && b.lobAt) {
    // A Rail with no one in sight (chapter 5): fire through the trees where you were seen (the charge's line is the warning).
    aim = angleTo(t, b.lobAt) + b.aimNoise * 0.5;
    const d = Math.hypot(b.lobAt.x - t.x, b.lobAt.y - t.y);
    fire = !b.holdFire && d <= g.range && Math.abs(wrapAngle(t.turret - aim)) < 0.08;
  } else if (cover && !(target?.alive && b.los)) {
    // Shoot the cover where it last saw you: the shot stops on it.
    aim = angleTo(t, cover) + b.aimNoise * 0.5;
    const d = Math.hypot(cover.x - t.x, cover.y - t.y);
    fire = !b.holdFire && d <= g.range && Math.abs(wrapAngle(t.turret - aim)) < 0.1;
  } else if (target?.alive) {
    const p = lead(m, b, t, target, g.shotSpeed);
    aim = angleTo(t, p) + b.aimNoise;
    const d = Math.hypot(target.x - t.x, target.y - t.y);
    // A stream (the Flamer) burns its whole cone: anywhere in it will do.
    const tol = g.cone > 0 ? g.cone / 2 : g.family === 'machinegun' ? 0.2 : 0.09;
    // From high ground (chapter 4) shots carry further.
    const reach = g.cone > 0 || !m.level.def.heights ? g.range : g.range * heightMult(m, t);
    fire = !b.holdFire && b.los && d <= reach + target.stats.radius && Math.abs(wrapAngle(t.turret - aim)) < tol;
  } else if (b.shootAt) {
    aim = angleTo(t, b.shootAt) + b.aimNoise * 0.5;
    const d = Math.hypot(b.shootAt.x - t.x, b.shootAt.y - t.y);
    fire = b.los && d <= g.range && Math.abs(wrapAngle(t.turret - aim)) < 0.1;
  }
  ({ aim, fire } = telegraph(m, b, t, aim, fire));
  const gadget = b.useGadget;
  b.useGadget = false;
  const callIn = b.callIn;
  b.callIn = null;
  if (t.role === 'bossTurret' || b.role === 'turret') return { move: null, aim, aimDist, fire, swap: false, repair: false };
  let angle: number | null = null;
  let mag = 1;
  switch (b.state) {
    case 'fight': {
      // Cover shooters stand and shoot; the stand-in fights from its bush or sandbags.
      if (cover && !(target?.alive && b.los)) break;
      if (b.coverSpot && target) {
        const d = Math.hypot(b.coverSpot.x - t.x, b.coverSpot.y - t.y);
        if (d > 16) angle = navAngle(m, t, b.coverSpot);
        break;
      }
      if (!target) break;
      const d = Math.hypot(target.x - t.x, target.y - t.y);
      const outranges = g.range > target.stats.gun.range + 40 && target.role === 'tank';
      // Kite when it outranges the target, or (the player's stand-in) when outnumbered.
      const kites = (outranges && b.diff.kite > 0.5) || (b.role === 'player' && b.seenCount > 1);
      // A mortar keeps its distance: well outside its minimum range, inside its maximum.
      // Against a mortar (with a direct gun): close in under its minimum range, where it can't hit you.
      const under = !lobs && isLobbed(target.stats.gun) ? target.stats.gun.minRange * UNDER_LOB : null;
      // A Flamer closes right in: its stream reaches 150 px.
      const want = lobs ? g.range * LOB_KEEP : g.cone > 0 ? g.range * FLAME_KEEP : g.shot === 'beam' ? g.range * LASER_KEEP : g.shot === 'rail' ? g.range * RAIL_KEEP : under !== null ? Math.max(110, Math.min(under, g.range * 0.6)) : kites ? g.range * 0.85 : Math.max(120, g.range * 0.6);
      b.strafeT -= dt;
      if (b.strafeT <= 0) {
        b.strafeT = b.rng.range(1.2, 2.8);
        b.strafe = b.strafe === 1 ? -1 : 1;
      }
      const home = b.hint?.stay && b.hint.goal ? b.hint.goal : null;
      const away = home ? Math.hypot(home.x - t.x, home.y - t.y) : 0;
      if (home && away > (b.hint?.goalRadius ?? 100) * 1.6) angle = navAngle(m, t, home);
      else if (b.allyBlocked && d <= want + 120) {
        // A friend is in the way: sidestep for a clear line, don't charge (friendly fire, owner Nov 14).
        angle = wrapAngle(angleTo(t, target) + (b.strafe * Math.PI) / 2);
        mag = 0.8;
      } else if (d > want + 50 || !b.los) angle = home ? (b.los ? null : angleTo(t, home)) : navAngle(m, t, target);
      else if (d < want - 60) angle = wrapAngle(angleTo(target, t) + b.strafe * 0.5);
      else {
        angle = wrapAngle(angleTo(t, target) + (b.strafe * Math.PI) / 2);
        mag = 0.7;
      }
      break;
    }
    case 'flee': {
      // Back off from the threat, leaning towards home (a guard's post, the player's start).
      const away = target ? angleTo(target, t) : angleTo(b.post, t);
      const home = Math.hypot(b.post.x - t.x, b.post.y - t.y) > 60 ? navAngle(m, t, b.post) : away;
      angle = Math.atan2(Math.sin(away) * 2 + Math.sin(home), Math.cos(away) * 2 + Math.cos(home));
      break;
    }
    case 'idle':
      mag = 0;
      break;
    case 'route': {
      const r = b.route;
      const next = r?.[b.routeI];
      if (!r || !next) break;
      if (Math.hypot(next.x - t.x, next.y - t.y) < 40) {
        const end = b.routeDir === 1 ? b.routeI >= r.length - 1 : b.routeI <= 0;
        if (end && b.role !== 'patrol') {
          m.escape(t);
          return IDLE;
        }
        if (end) b.routeDir = b.routeDir === 1 ? -1 : 1;
        b.routeI += b.routeDir;
      }
      angle = navAngle(m, t, r[b.routeI]!);
      break;
    }
    default: {
      if (!b.goal) break;
      const d = Math.hypot(b.goal.x - t.x, b.goal.y - t.y);
      // Something to shoot there (a cage, a target) but no clear shot yet: keep closing in.
      const blocked = b.shootAt !== null && !b.los;
      // Loot: stop once it's in reach (a part at the edge of a deck or by a wall may lie where the tank's centre can't get).
      const stopAt = b.state === 'loot' ? t.stats.radius + LOOT_STOP : b.state === 'goal' ? (b.role === 'guard' || blocked ? 40 : (b.hint?.goalRadius ?? 40)) : 30;
      if (d < stopAt) mag = 0;
      else {
        angle = navAngle(m, t, b.goal);
        if (b.state === 'loot' && d < 60) mag = 0.5;
      }
    }
  }
  // The stand-in reads the landing rings: out of a mortar shell's blast before it lands, forwards
  // or in reverse, whichever leaves the ring sooner (a tank on Wheels can't spin round in time).
  // Likewise off a Rail's charge line (chapter 5): the line is the warning.
  const throttle = b.role === 'player' ? lobDodge(m, t) || railDodge(m, t) : 0;
  if (throttle !== 0) return { move: { kind: 'tank', throttle, turn: 0 }, aim, aimDist, fire, swap: false, repair: b.useKit, gadget, callIn };
  const moving = angle !== null && mag > 0;
  trackStuck(m, b, t, moving, dt);
  if (b.detourBack && b.detourT > DETOUR / 2) {
    // Stuck twice in one spot: first back out, swinging the tail. Only steering for the way behind
    // kept Wheels and Half-tracks (they need roll to turn) nosed into the trees or a corner,
    // turning with the nose still pressed in (level 42, Nov 15).
    return { move: { kind: 'tank', throttle: -1, turn: b.detourTurn }, aim: aim ?? b.detourAngle, aimDist, fire, swap: false, repair: b.useKit, gadget, callIn };
  }
  if (b.detourT > 0) {
    // Then off the way it came, on a new line (round a fence's end, say).
    angle = b.detourAngle;
    mag = 1;
  }
  if (angle !== null && b.state !== 'loot') angle = separate(m, t, angle, b.target);
  if (aim === null && angle !== null) aim = angle;
  const wantSwap = b.state === 'loot' && t.onPart !== null && t.onPart === b.goalPickup;
  const swapPart = b.state === 'loot' ? b.goalPickup : null;
  return { move: angle === null ? null : { kind: 'point', angle, mag }, aim, aimDist, fire, swap: wantSwap, swapPart, repair: b.useKit, gadget, callIn };
}
