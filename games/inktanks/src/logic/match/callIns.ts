import { makeAlert } from '../bots/awareness';
import type { CrateContent } from '../loot';
import { MAX_MK, type Mk } from '../parts';
import { nearestPassable } from '../nav/grid';
import { clamp, wrapAngle } from '../vec';
import type { Mark } from '../objectives/types';
import { damageStructure, killTank } from './combat';
import type { Match } from './match';
import type { CallInKind, Tank, TankInput } from './types';

/**
 * Rank call-ins (design doc "Rank perks"): once a level each, at the player's
 * aim point after a short warning.
 * - Supply drop (Staff Sergeant): a crate comes down holding a repair kit and
 *   a part of your fitted gun's family one Mk up (two kits when it's Mk V).
 * - Artillery strike (Major): a warning ring, then a heavy blast that hurts
 *   every tank in it (you and your wingmen too) and breaks structures.
 * The aim point is along the aim at the mouse's distance; a thumbstick gives
 * no distance, so it's the nearest enemy along the aim (strike) or just ahead
 * (supply). Clamped to CALL_IN.range from the tank and to the map.
 */
export const CALL_IN = {
  /** Furthest a call-in lands from the tank, px. */
  range: 480,
  /** Kept this far inside the map's edge. */
  edge: 40,
  /** Enemies within this angle of the aim count for the thumbstick's strike. */
  cone: 0.35,
  supply: { warn: 2, near: 110 },
  strike: {
    warn: 2.5,
    radius: 100,
    /** Share of each tank's max HP the blast takes, armour or not; a boss (and its turrets) takes `boss`. */
    share: 0.45,
    boss: 0.12,
    /** Damage to structures in the ring (breaks brick). */
    structures: 300,
    /** With no enemy along a thumbstick's aim. */
    near: 300,
  },
} as const;

export interface CallIn {
  /** The rank brings it this level. */
  readonly has: boolean;
  used: boolean;
  /** Called and coming down at (x, y) at match time `at`. */
  landing: { readonly x: number; readonly y: number; readonly at: number } | null;
}

export type CallIns = Readonly<Record<CallInKind, CallIn>>;

export const newCallIns = (supply: boolean, strike: boolean): CallIns => ({
  supply: { has: supply, used: false, landing: null },
  strike: { has: strike, used: false, landing: null },
});

/** Whether a call-in can be made now. */
export const callInReady = (c: CallIn): boolean => c.has && !c.used;

/** What the supply drop holds for this tank: a kit, and its gun's family a Mk up (Mk V already: a second kit). */
export function supplyContents(t: Tank): readonly CrateContent[] {
  const gun = t.loadout.gun;
  if (gun.mk >= MAX_MK) return [{ kind: 'kit' }, { kind: 'kit' }];
  return [{ kind: 'kit' }, { kind: 'part', part: { family: gun.family, mk: (gun.mk + 1) as Mk } }];
}

/** The nearest enemy within CALL_IN.cone of `aim` and in range, as a distance; null if none. */
function enemyAlong(m: Match, t: Tank, aim: number): number | null {
  let best: number | null = null;
  for (const o of m.tanks) {
    if (!o.alive || o.team === t.team || o.role === 'crew' || o.escaped) continue;
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d > CALL_IN.range) continue;
    if (Math.abs(wrapAngle(Math.atan2(o.y - t.y, o.x - t.x) - aim)) > CALL_IN.cone) continue;
    if (best === null || d < best) best = d;
  }
  return best;
}

/** Where a call-in from `t` lands: along the aim (or the turret), at the given distance or the default, kept on the map. */
export function callInPoint(m: Match, t: Tank, kind: CallInKind, aim: number | null, dist: number | null | undefined): { x: number; y: number } {
  const a = aim ?? t.turret;
  const want = dist ?? (kind === 'strike' ? (enemyAlong(m, t, a) ?? CALL_IN.strike.near) : CALL_IN.supply.near);
  const d = clamp(want, 0, CALL_IN.range);
  const e = CALL_IN.edge;
  const x = clamp(t.x + Math.cos(a) * d, e, m.land.width - e);
  const y = clamp(t.y + Math.sin(a) * d, e, m.land.height - e);
  if (kind === 'strike') return { x, y };
  // A crate must land where a tank can drive to it.
  return m.navPassable(x, y) ? { x, y } : (nearestPassable(m.nav, x, y, 12) ?? { x: t.x, y: t.y });
}

/** A press of a call-in key: marks the spot if the rank has it and it's unused this level. Returns whether it was called. */
export function callIn(m: Match, t: Tank, kind: CallInKind, input: Pick<TankInput, 'aim' | 'aimDist'>): boolean {
  const c = m.callIns[kind];
  if (!t.alive || !callInReady(c)) return false;
  const p = callInPoint(m, t, kind, input.aim, input.aimDist);
  const warn = kind === 'strike' ? CALL_IN.strike.warn : CALL_IN.supply.warn;
  c.used = true;
  c.landing = { x: p.x, y: p.y, at: m.t + warn };
  m.emit({ kind: 'callIn', what: kind, phase: 'called', x: p.x, y: p.y, at: c.landing.at });
  // The bomber's (or the cargo plane's) shadow passes over the spot as it comes down (bombView.ts).
  m.emit({ kind: 'mark', x: p.x, y: p.y, r: kind === 'strike' ? CALL_IN.strike.radius : 30, at: c.landing.at });
  return true;
}

/** Lands what's due: the supply crate, or the strike's blast. */
export function stepCallIns(m: Match): void {
  for (const kind of ['supply', 'strike'] as const) {
    const c = m.callIns[kind];
    const l = c.landing;
    if (!l || m.t < l.at) continue;
    c.landing = null;
    m.emit({ kind: 'callIn', what: kind, phase: 'landed', x: l.x, y: l.y, at: l.at });
    if (kind === 'supply') {
      const caller = m.player;
      m.addPickup({ kind: 'supply', contents: caller ? supplyContents(caller) : [{ kind: 'kit' }] }, l.x, l.y);
    } else strikeLands(m, l.x, l.y);
  }
}

/** The strike's blast: a share of every tank's max HP in the ring (no armour, no ambush), and structures broken. */
export function strikeLands(m: Match, x: number, y: number): void {
  const s = CALL_IN.strike;
  m.emit({ kind: 'explode', x, y, r: s.radius });
  const caller = m.player;
  for (const t of m.tanks) {
    if (!t.alive) continue;
    if (Math.hypot(t.x - x, t.y - y) > s.radius + t.stats.radius) continue;
    const big = t.role === 'boss' || t.role === 'bossTurret';
    const dmg = t.stats.maxHp * (big ? s.boss : s.share);
    t.hp -= dmg;
    m.emit({ kind: 'hit', x: t.x, y: t.y, target: t.id, dmg, shot: 'lob' });
    if (t.team !== 0 && caller && t.team !== caller.team) {
      t.lastHitBy = caller.id;
      t.lastHitAt = m.t;
      caller.dealt += dmg;
      // It knows it's under fire now, and from where.
      const b = m.brains.get(t.id);
      if (b && b.role !== 'player') makeAlert(m, b, caller);
    } else if (t.team === 0 && !t.isPlayer) m.emit({ kind: 'friendly', x: t.x, y: t.y, target: t.id });
    // The kill is yours (no victim record: it wasn't your gun); one of ours lost to it is no one's.
    if (t.hp <= 0) killTank(m, t, caller && t.team !== caller.team ? caller : null, 'artillery');
  }
  const ids = m.grid.query({ x0: x - s.radius, y0: y - s.radius, x1: x + s.radius, y1: y + s.radius });
  for (const i of [...ids]) {
    const st = m.structs[i]!;
    if (Math.hypot(st.def.x - x, st.def.y - y) <= s.radius + 30) damageStructure(m, i, s.structures, true);
  }
}

/** The rings while a call-in comes down: the strike's danger ring (with its falling bomb), the drop's landing ring. */
export function callInMarks(m: Match): Mark[] {
  const out: Mark[] = [];
  const st = m.callIns.strike.landing;
  if (st) out.push({ kind: 'artillery', x: st.x, y: st.y, r: CALL_IN.strike.radius, progress: 1 - (st.at - m.t) / CALL_IN.strike.warn, warn: CALL_IN.strike.warn });
  const su = m.callIns.supply.landing;
  if (su) out.push({ kind: 'drop', x: su.x, y: su.y, r: 34, progress: 1 - (su.at - m.t) / CALL_IN.supply.warn, warn: CALL_IN.supply.warn });
  return out;
}
