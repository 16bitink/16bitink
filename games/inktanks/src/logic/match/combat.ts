import { makeAlert } from '../bots/awareness';
import { LOW_PASS, shotHits } from '../bots/perception';
import { armourAgainst, damageTaken, structureDamage } from '../damage';
import { distToSegment, pointInShape, segmentHits } from '../geom';
import { underCanopy } from '../land';
import { oilTier } from '../gadgetTiers';
import { intelOf } from '../intel';
import { igniteOil, oilUnder } from './gadgets';
import { wreckPart } from '../loot';
import type { Family, GunFamily, Mk, Part } from '../parts';
import { nearestPassable, passable } from '../nav/grid';
import { turnTowards } from '../vec';
import type { Match } from './match';
import { breakStructure } from './movement';
import { fireLob, isLobbed, stepLob } from './lob';
import { fireFlame } from './flame';
import { fireBeam } from './beam';
import { fireRail } from './railgun';
import { spinePoint } from './body';
import { heightMult } from './heights';
import type { Shot, Tank, TankInput } from './types';

/** Seconds between the two rockets of a pair. */
const BURST_GAP = 0.16;
/** Splash hurts this share of a direct hit. */
const SPLASH_SHARE = 0.5;
/** A boss dazed from ramming a wall takes this much more (objectives/bossRage.ts). */
export const BOSS_STUN_MULT = 1.5;
/** A boss body takes this share while any of its turrets stands. */
export const BOSS_SHIELD = 0.25;
const SUBSTEP = 12;
/** A hit on a calm or suspicious enemy does this many times the damage (Tactics §1). */
export const AMBUSH = 2;

export function aimAndFire(m: Match, t: Tank, input: TankInput, dt: number): void {
  // A charging Rail (chapter 5) holds its aim: the line it shows is where the slug goes.
  if (t.charge > 0) return charging(m, t, dt);
  if (input.aim !== null) t.turret = turnTowards(t.turret, input.aim, t.stats.gun.turretTurn * dt);
  if (input.aimDist !== undefined && input.aimDist !== null) t.aimDist = input.aimDist;
  // The cooldown keeps its leftover past zero (carried into the next shot), so fire rate is exact
  // at any step size: without the carry a 0.1 s gun at 1/60 s steps rounded up to whole steps, and
  // Reload research under a step's worth did nothing.
  t.reload -= dt;
  tickBelt(t, input.fire, dt);
  if (t.burst > 0) {
    t.burstT -= dt;
    if (t.burstT <= 0) {
      spawnShot(m, t, t.burst % 2 ? -1 : 1);
      t.burst--;
      t.burstT = BURST_GAP;
    }
    return;
  }
  const canFire = input.fire && t.repairT <= 0 && t.role !== 'truck' && t.role !== 'boss' && t.role !== 'crew';
  if (!canFire || t.reload > 0 || t.beltT > 0) {
    // Idle: no banking shots while not firing.
    if (t.reload < 0) t.reload = 0;
    return;
  }
  t.reload += t.stats.gun.reload;
  t.firedAt = m.t;
  if (t.stats.gun.charge > 0) {
    // The Rail: the pull starts the charge; the slug flies when it's done, along the aim held now.
    t.charge = t.stats.gun.charge;
    t.chargeAngle = t.turret;
    m.emit({ kind: 'aim', tank: t.id, angle: t.turret, len: t.stats.gun.range, until: m.t + t.charge, dur: t.charge });
    return;
  }
  if (t.stats.gun.belt > 0 && --t.ammo <= 0) t.beltT = t.stats.gun.beltReload;
  spawnShot(m, t, t.stats.gun.shots > 1 ? 1 : 0);
  t.burst = t.stats.gun.shots - 1;
  t.burstT = BURST_GAP;
}

/** A Rail charging: the turret held on its line; at the end the slug flies (a dead or repairing tank's charge is lost). */
function charging(m: Match, t: Tank, dt: number): void {
  t.reload -= dt;
  t.turret = t.chargeAngle;
  t.charge -= dt;
  if (t.charge > 0) return;
  t.charge = 0;
  t.firedAt = m.t;
  if (t.repairT <= 0) spawnShot(m, t, 0);
}

/**
 * Belt guns: an empty belt reloads for `beltReload` s; a part-used belt is topped up once the
 * trigger has been off that long, so a pause between fights always starts the next on a full belt.
 */
function tickBelt(t: Tank, firing: boolean, dt: number): void {
  const g = t.stats.gun;
  if (g.belt <= 0) return;
  if (t.beltT > 0) {
    t.beltT -= dt;
    if (t.beltT <= 0) {
      t.beltT = 0;
      t.ammo = g.belt;
    }
    return;
  }
  t.idleT = firing ? 0 : t.idleT + dt;
  if (t.ammo < g.belt && t.idleT >= g.beltReload) t.ammo = g.belt;
}

function spawnShot(m: Match, t: Tank, side: number): void {
  const g = t.stats.gun;
  // Firing from inside someone's Mk III+ slick: the shots go wide.
  const oil = m.gadgets.oils.length > 0 ? oilUnder(m.gadgets, t.team, t.x, t.y, m.t) : null;
  const spread = g.spread + (oil ? oilTier(oil.mk).spread : 0);
  const a = t.turret + m.rng.range(-spread, spread);
  const muzzle = t.stats.radius * 0.95 + (t.role === 'bossTurret' ? 10 : 0);
  const sx = t.x + Math.cos(t.turret) * muzzle - Math.sin(t.turret) * side * 5;
  const sy = t.y + Math.sin(t.turret) * muzzle + Math.cos(t.turret) * side * 5;
  if (g.shot === 'flame' || g.shot === 'beam' || g.shot === 'rail') {
    // A Flamer's tick (flame.ts), a Laser's beam (beam.ts) or a Rail's slug (railgun.ts): no projectile, it hits now.
    t.shotsFired++;
    m.emit({ kind: 'fire', tank: t.id, x: sx, y: sy, angle: a, shot: g.shot });
    if (g.shot === 'flame') fireFlame(m, t, sx, sy, a);
    else if (g.shot === 'rail') fireRail(m, t, sx, sy, a);
    else fireBeam(m, t, sx, sy, a);
    return;
  }
  if (isLobbed(g)) {
    m.shots.push(fireLob(m, t, sx, sy, a));
    t.shotsFired++;
    m.emit({ kind: 'fire', tank: t.id, x: sx, y: sy, angle: a, shot: g.shot });
    return;
  }
  const shot: Shot = {
    id: m.nextId++, owner: t.id, team: t.team, x: sx, y: sy,
    vx: Math.cos(a) * g.shotSpeed, vy: Math.sin(a) * g.shotSpeed,
    travelled: 0, range: g.range * heightMult(m, t), damage: g.damage, gun: g.family, splash: g.splash, breaksBrick: g.breaksBrick, kind: g.shot, alive: true,
  };
  m.shots.push(shot);
  t.shotsFired++;
  m.emit({ kind: 'fire', tank: t.id, x: sx, y: sy, angle: a, shot: g.shot });
}

export function stepShots(m: Match, dt: number): void {
  for (const s of m.shots) {
    if (!s.alive) continue;
    if (s.lob) {
      stepLob(m, s, dt);
      continue;
    }
    const speed = Math.hypot(s.vx, s.vy);
    const n = Math.max(1, Math.ceil((speed * dt) / SUBSTEP));
    for (let k = 0; k < n && s.alive; k++) moveShot(m, s, dt / n, speed);
    if (m.gadgets.oils.length > 0) igniteOil(m, s.team, s.x, s.y);
  }
  m.shots = m.shots.filter((s) => s.alive);
}

function moveShot(m: Match, s: Shot, dt: number, speed: number): void {
  const ax = s.x;
  const ay = s.y;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.travelled += speed * dt;
  // Tanks first: a shot fired point-blank past a wall corner still hits the tank.
  const shooter = m.tank(s.owner) ?? null;
  const reach = (t: Tank): number => (t.role === 'boss' ? t.stats.radius * 0.55 : t.stats.radius + (t.role === 'bossTurret' ? 8 : 3));
  const touches = (t: Tank): boolean => {
    const p = spinePoint(t, s.x, s.y);
    return (p.x - s.x) ** 2 + (p.y - s.y) ** 2 <= reach(t) ** 2;
  };
  for (const t0 of m.tanks) {
    // A gun tower of ours stands above the fight: shots fly past it.
    if (t0.role === 'bossTurret' && t0.parent === null) continue;
    if (!shotHits(shooter, s.team, t0)) continue;
    // Shots fly over a fortress's deck edge to reach its turrets.
    if (!touches(t0)) continue;
    // Over a boss's deck, a turret it carries is hit before the hull under it (turrets sit on top).
    const t = t0.role === 'boss' ? (m.tanks.find((u) => u.alive && u.parent === t0.id && touches(u)) ?? t0) : t0;
    hitTank(m, t, s.damage, s.gun, s.owner);
    if (t.team === s.team) m.emit({ kind: 'friendly', x: t.x, y: t.y, target: t.id });
    const owner = m.tank(s.owner);
    if (owner && t.team !== s.team) owner.shotsHit++;
    m.emit({ kind: 'hit', x: s.x, y: s.y, target: t.id, dmg: s.damage, shot: s.kind });
    explode(m, s, t.id);
    s.alive = false;
    return;
  }
  const ids = m.grid.query({ x0: Math.min(ax, s.x), y0: Math.min(ay, s.y), x1: Math.max(ax, s.x), y1: Math.max(ay, s.y) });
  for (const i of ids) {
    const st = m.structs[i]!;
    if (st.state === 0 || st.def.cover || st.def.perch || st.def.crest || st.def.deck) continue;
    // Low cover: the shot flies over it for its first LOW_PASS px (hug the sandbags and fire out).
    if (st.def.low && s.travelled <= LOW_PASS) continue;
    if (st.def.canopy !== undefined || st.def.span) {
      // Chapter 5: a tree's canopy stops a shot that flies into it (not one fired from under it); a log bridge, one not fired from on it.
      const ox = s.x - (s.vx / speed) * s.travelled;
      const oy = s.y - (s.vy / speed) * s.travelled;
      if (st.def.span ? pointInShape(st.def.shape, st.def.x, st.def.y, ox, oy) || !segmentHits(st.def.shape, st.def.x, st.def.y, ax, ay, s.x, s.y) : underCanopy(st.def, ox, oy) || distToSegment(st.def.x, st.def.y, ax, ay, s.x, s.y) > st.def.canopy!) continue;
    } else if (!segmentHits(st.def.shape, st.def.x, st.def.y, ax, ay, s.x, s.y)) continue;
    damageStructure(m, i, s.damage, s.breaksBrick);
    m.emit({ kind: 'hit', x: s.x, y: s.y, target: null, dmg: s.damage, shot: s.kind });
    explode(m, s, null);
    s.alive = false;
    return;
  }
  if (s.travelled >= s.range) {
    s.alive = false;
    if (s.splash > 0) explode(m, s, null);
  }
}

function explode(m: Match, s: Shot, direct: number | null): void {
  if (s.splash <= 0) return;
  m.emit({ kind: 'explode', x: s.x, y: s.y, r: s.splash });
  const shooter = m.tank(s.owner) ?? null;
  for (const t of m.tanks) {
    if (t.id === direct || !shotHits(shooter, s.team, t)) continue;
    const reach = s.splash + t.stats.radius;
    const p = spinePoint(t, s.x, s.y);
    if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 <= reach * reach) hitTank(m, t, s.damage * SPLASH_SHARE, s.gun, s.owner);
  }
  const ids = m.grid.query({ x0: s.x - s.splash, y0: s.y - s.splash, x1: s.x + s.splash, y1: s.y + s.splash });
  for (const i of [...ids]) damageStructure(m, i, s.damage * SPLASH_SHARE, s.breaksBrick);
}

export function damageStructure(m: Match, i: number, dmg: number, breaksBrick: boolean): void {
  const st = m.structs[i]!;
  if (st.state === 0 || st.def.hp <= 0) return;
  const d = structureDamage(dmg, st.def.material, breaksBrick);
  if (d <= 0) return;
  st.hp -= d;
  if (st.hp <= 0) {
    breakStructure(m, i);
    return;
  }
  const next = st.hp / st.def.hp > 0.6 ? 2 : 1;
  if (next !== st.state) {
    st.state = next;
    m.emit({ kind: 'struct', id: st.def.id, state: next });
  }
}

function bossShielded(m: Match, t: Tank): boolean {
  return t.role === 'boss' && m.tanks.some((o) => o.parent === t.id && o.alive);
}

/**
 * `raw`: the damage as given (a mine), not through the gun's counters and armour.
 * A player-side hit on a bot that isn't alert does AMBUSH × the damage (an
 * 'ambush' event), and alerts it.
 */
export function hitTank(m: Match, t: Tank, dmg: number, gun: GunFamily, from: number | null, raw = false): void {
  const attacker = from === null ? null : (m.tank(from) ?? null);
  const shield = bossShielded(m, t) ? BOSS_SHIELD : m.t < t.stunnedUntil ? BOSS_STUN_MULT : 1;
  const brain = t.alive ? m.brains.get(t.id) : undefined;
  const ambush = brain !== undefined && brain.role !== 'player' && brain.aware !== 'alert' && attacker !== null && attacker.team !== t.team && attacker.team === 0;
  const d = (raw ? dmg : damageTaken(dmg, gun, t.stats.drive, armourAgainst(t.stats, gun))) * shield * (ambush ? AMBUSH : 1);
  t.hp -= d;
  const foe = attacker !== null && attacker.team !== t.team;
  if (brain && brain.role !== 'player' && foe) makeAlert(m, brain, attacker);
  if (ambush) {
    attacker.ambushHits++;
    m.tactics.ambushHits++;
    m.emit({ kind: 'ambush', x: t.x, y: t.y, target: t.id, dmg: d });
  }
  if (attacker && foe) {
    attacker.dealt += d;
    t.lastHitBy = attacker.id;
    t.lastHitAt = m.t;
    t.lastHitDrive = attacker.stats.drive;
  }
  if (t.hp <= 0) killTank(m, t, attacker, gun);
}

/** (x, y) if a tank can drive there, else the nearest drivable cell's centre. */
function reachable(m: Match, x: number, y: number): { x: number; y: number } | null {
  return passable(m.nav, x, y) ? { x, y } : nearestPassable(m.nav, x, y);
}

/** An ace's wreck leaves its best part as a prototype, Mk III at least (a Brigadier can keep it in the workshop). */
export function acePrototype(l: Tank['loadout']): Part {
  const best = wreckPart(l);
  return { family: best.family, mk: Math.max(3, best.mk) as Mk, proto: true };
}

export function killTank(m: Match, t: Tank, killer: Tank | null, by: GunFamily | 'artillery'): void {
  if (!t.alive) return;
  t.alive = false;
  t.hp = 0;
  t.deadAt = m.t;
  if (killer && killer.id !== t.id) {
    killer.kills++;
    if (by !== 'artillery') killer.victims.push({ hull: t.stats.hull, drive: t.stats.drive, gun: t.stats.gun.family, by });
  }
  m.emit({ kind: 'kill', killer: killer?.id ?? null, victim: t.id, by });
  if (t.role === 'tank' || t.role === 'bossTurret') {
    // The wreck: its best part to swap in, and intel on all its parts.
    if (t.role === 'tank') m.addPickup({ kind: 'part', part: t.ace ? acePrototype(t.loadout) : wreckPart(t.loadout) }, t.x, t.y);
    // One blueprint sheet per part family, scattered around the wreck (spread from the tank's id, so it is the same every run).
    const bag = intelOf(t.loadout, t.ace);
    const fams = Object.keys(bag) as Family[];
    fams.forEach((f, i) => {
      const a = (i / fams.length) * Math.PI * 2 + t.id * 0.9 + 0.6;
      const r = 26 + ((t.id + i) % 3) * 6;
      // A wreck by water or a wall would drop a sheet nobody can reach: snap it to the nearest drivable cell.
      const at = reachable(m, t.x + Math.cos(a) * r, t.y + Math.sin(a) * r) ?? { x: t.x, y: t.y };
      m.addPickup({ kind: 'intel', bag: { [f]: bag[f] }, from: t.name, ace: t.ace }, at.x, at.y);
    });
  }
  // A boss's turrets die with it.
  for (const o of m.tanks) if (o.parent === t.id && o.alive) killTank(m, o, null, by);
}
