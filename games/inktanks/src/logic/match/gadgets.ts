import { OIL_FIRE, oilTier } from '../gadgetTiers';
import type { Mk } from '../parts';
import type { Pt } from '../vec';
import type { GadgetKind } from './types';

/**
 * The gadget slot's numbers and what's on the ground (design doc, Tactics §3).
 * This file is state and cheap queries only; laying and triggering are in
 * gadgetUse.ts (it needs perception and combat, which read smoke from here).
 */
export const GADGET = {
  /** One press, one use. */
  cooldown: 0.6,
  /** The rest scale with the Mk: gadgetTiers.ts. */
  mine: { arm: 1, splash: 40, slow: 0.5 },
  oil: { speed: 0.4, turn: 0.35 },
} as const;

export const GADGET_NAME: Readonly<Record<GadgetKind, string>> = { mines: 'Mines', oil: 'Oil slick', smoke: 'Smoke' };
/** Every gadget at Mk I (enemies and tests that don't say). */
export const MK1_GADGETS: Readonly<Record<GadgetKind, Mk>> = { mines: 1, oil: 1, smoke: 1 };

export interface Mine {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly team: number;
  readonly owner: number;
  readonly armAt: number;
  readonly damage: number;
  readonly trigger: number;
  readonly slowFor: number;
  /** One of a Mk V scatter (drawn smaller). */
  readonly small: boolean;
  /** Enemy bots that watched it being laid: only they steer round it. */
  readonly known: ReadonlySet<number>;
  alive: boolean;
}

export interface Patch {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly team: number;
  readonly at: number;
  until: number;
  readonly mk: Mk;
  /** Oil: enemies that have slid in it (gadget blueprints once each). */
  readonly slowed: Set<number>;
  /** A Mk V slick set alight: burning until then (-1 not alight), next damage tick. */
  burnUntil: number;
  burnTick: number;
}

export interface Gadgets {
  mines: Mine[];
  oils: Patch[];
  smokes: Patch[];
}

export const newGadgets = (): Gadgets => ({ mines: [], oils: [], smokes: [] });

/** Drops what's expired or gone off. */
export function pruneGadgets(g: Gadgets, now: number): void {
  if (g.mines.some((x) => !x.alive)) g.mines = g.mines.filter((x) => x.alive);
  if (g.oils.some((p) => p.until <= now)) g.oils = g.oils.filter((p) => p.until > now);
  if (g.smokes.some((p) => p.until <= now)) g.smokes = g.smokes.filter((p) => p.until > now);
}

const inside = (p: Patch, x: number, y: number): boolean => (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r;

export function inSmoke(g: Gadgets, x: number, y: number, now: number): boolean {
  for (const p of g.smokes) if (p.until > now && inside(p, x, y)) return true;
  return false;
}

/** Whether a sight line a→b crosses a smoke cloud (inside counts: it blocks both ways). */
export function smokeBlocks(g: Gadgets, ax: number, ay: number, bx: number, by: number, now: number): boolean {
  for (const p of g.smokes) {
    if (p.until <= now) continue;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len2));
    const cx = ax + dx * k;
    const cy = ay + dy * k;
    if ((cx - p.x) ** 2 + (cy - p.y) ** 2 <= p.r * p.r) return true;
  }
  return false;
}

/** The slick a tank of `team` slides in (someone else's), or null. */
export function oilUnder(g: Gadgets, team: number, x: number, y: number, now: number): Patch | null {
  for (const p of g.oils) if (p.team !== team && p.until > now && inside(p, x, y)) return p;
  return null;
}

/** Armed or not, the mines a bot knows of (it watched them laid). */
export function knownMines(g: Gadgets, botId: number): Mine[] {
  return g.mines.filter((x) => x.alive && x.known.has(botId));
}

/** Where a dropped gadget lands: just behind the tank (mines, oil) or on it (smoke). */
export function dropPoint(kind: GadgetKind, t: { x: number; y: number; heading: number; stats: { radius: number } }): Pt {
  if (kind === 'smoke') return { x: t.x, y: t.y };
  const back = t.stats.radius + 8;
  return { x: t.x - Math.cos(t.heading) * back, y: t.y - Math.sin(t.heading) * back };
}

/** A shot of `team` over its own Mk V slick sets it alight (it burns OIL_FIRE.burn s, then it's gone). */
export function igniteOil(m: { readonly gadgets: Gadgets; readonly t: number; emit(e: { kind: 'ignite'; x: number; y: number; r: number }): void }, team: number, x: number, y: number): void {
  for (const p of m.gadgets.oils) {
    if (p.team !== team || p.burnUntil >= 0 || p.until <= m.t || !inside(p, x, y) || !oilTier(p.mk).ignites) continue;
    p.burnUntil = m.t + OIL_FIRE.burn;
    p.burnTick = m.t;
    p.until = p.burnUntil;
    m.emit({ kind: 'ignite', x: p.x, y: p.y, r: p.r });
  }
}
