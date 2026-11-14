import type { GadgetKind } from './match/types';
import type { Mk } from './parts';

/**
 * Gadget tiers, Mk I–V (design doc, Tactics §3 "Gadget tiers"). Each Mk
 * raises the numbers a little; Mk III and Mk V each add something you can
 * see. Raised in the workshop with that gadget's own blueprints, which you
 * earn by using it (gadgetIntel in the match) and from spare crate charges.
 * The tiers open at the same ranks as part tiers. Pure numbers only.
 */
export interface MineTier {
  readonly damage: number;
  /** An enemy this close sets it off, px. */
  readonly trigger: number;
  /** The broken track lasts this long, s. */
  readonly slowFor: number;
  /** Mines laid per press (Mk V scatters 3 smaller ones). */
  readonly scatter: number;
}

export interface OilTier {
  readonly r: number;
  readonly life: number;
  /** Extra shot spread, rad, for an enemy firing from inside it (Mk III). */
  readonly spread: number;
  /** A shot of yours sets it alight (Mk V). */
  readonly ignites: boolean;
}

export interface SmokeTier {
  readonly r: number;
  readonly life: number;
  /** Share of max HP a second you repair inside your own cloud (Mk III). */
  readonly repair: number;
  /** Every enemy hunting you loses track of you when it pops (Mk V). */
  readonly blinds: boolean;
}

const step = (mk: Mk, base: number, per: number): number => base + per * (mk - 1);

export function mineTier(mk: Mk): MineTier {
  return { damage: step(mk, 90, 15), trigger: mk >= 3 ? 36 : 28, slowFor: mk >= 3 ? 5 : 3, scatter: mk >= 5 ? 3 : 1 };
}

export function oilTier(mk: Mk): OilTier {
  return { r: [60, 66, 72, 80, 88][mk - 1]!, life: step(mk, 8, 1), spread: mk >= 3 ? 0.3 : 0, ignites: mk >= 5 };
}

export function smokeTier(mk: Mk): SmokeTier {
  return { r: [90, 98, 106, 115, 125][mk - 1]!, life: step(mk, 6, 1), repair: mk >= 3 ? 0.03 : 0, blinds: mk >= 5 };
}

/** Scattered Mk V mines each hit this share of a single mine. */
export const SCATTER_DAMAGE = 0.6;

/** A burning Mk V slick: how long it burns (then it's gone) and its damage per tick to enemies in it. */
export const OIL_FIRE = { burn: 4, tick: 0.5, damage: 16 } as const;

/** Charges a level: mines get one more at Mk II and Mk IV. Crates top you up to two over that. */
export function gadgetCharges(kind: GadgetKind, mk: Mk): number {
  return kind === 'mines' ? 2 + (mk >= 2 ? 1 : 0) + (mk >= 4 ? 1 : 0) : 2;
}
export const gadgetMax = (kind: GadgetKind, mk: Mk): number => gadgetCharges(kind, mk) + 2;

/** The one-line rule for a gadget at a Mk (briefing picker and workshop). */
export function gadgetText(kind: GadgetKind, mk: Mk): string {
  if (kind === 'mines') {
    const t = mineTier(mk);
    const lay = t.scatter > 1 ? `Lays ${t.scatter} mines at a time; each hits for ${Math.round(t.damage * SCATTER_DAMAGE)}` : `An enemy rolling over one takes ${t.damage} damage`;
    return `${lay} and a broken track for ${t.slowFor} s.`;
  }
  if (kind === 'oil') {
    const t = oilTier(mk);
    const extra = [t.spread > 0 ? 'their shots go wide' : '', t.ignites ? 'shoot it to set it alight' : ''].filter(Boolean).join('; ');
    return `A ${t.r} px slick for ${t.life} s: enemies slide and can’t turn well${extra ? `; ${extra}` : ''}.`;
  }
  const t = smokeTier(mk);
  const extra = [t.repair > 0 ? 'you repair inside it' : '', t.blinds ? 'enemies hunting you lose track' : ''].filter(Boolean).join('; ');
  return `A ${t.r} px cloud for ${t.life} s that blocks sight both ways${extra ? `; ${extra}` : ''}.`;
}

/** What the next Mk brings, in a few words (the workshop's raise button). */
export function nextTierText(kind: GadgetKind, next: Mk): string {
  if (kind === 'mines') {
    if (next === 3) return 'wider trigger, longer broken track';
    if (next === 5) return 'scatters 3 mines';
    return `${mineTier(next).damage} damage${next === 2 || next === 4 ? ', +1 charge' : ''}`;
  }
  if (next === 3) return kind === 'oil' ? 'enemies in it shoot wide' : 'repair inside it';
  if (next === 5) return kind === 'oil' ? 'shoot it to set it alight' : 'enemies lose track of you';
  return 'bigger, lasts longer';
}
