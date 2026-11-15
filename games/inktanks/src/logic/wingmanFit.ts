import { slotOf, type DriveFamily, type Family, type GunFamily, type HullFamily, type Loadout, type Mk, type Part } from './parts';
import { RANKS, perksOf, type RankId } from './rank';
import type { Progress, Result } from './workshop';

/**
 * Fitting your wingmen in the workshop's Wingmen tab (owner, Nov 15). Each
 * wingman picks a gun, hull and drive family from the ones you've unlocked;
 * every part fits one Mk below your own workshop Mk for that family (Mk I at
 * least). A wingman with no pick (null, and every save from before the tab)
 * mirrors your starting tank one Mk lower, as before. A pick that no longer
 * fits (a family not unlocked, a broken save) falls back to that mirror; it
 * never fails a mission.
 */
export interface WingmanFit {
  readonly gun: GunFamily;
  readonly hull: HullFamily;
  readonly drive: DriveFamily;
}

/** Wingman slots and the rank each opens at. */
export const WINGMAN_RANKS: readonly RankId[] = ['captain', 'colonel'];

const lower = (mk: Mk): Mk => Math.max(1, mk - 1) as Mk;

/** A family at the wingman's Mk: one below yours, Mk I at least. */
export const wingmanPart = (p: Pick<Progress, 'mk'>, f: Family): Part => ({ family: f, mk: lower(p.mk[f] ?? 1) });

/** The mirror rule: your starting tank one Mk lower per part, never a prototype. */
export const mirrorLoadout = (l: Loadout): Loadout => ({
  gun: { family: l.gun.family, mk: lower(l.gun.mk) },
  hull: { family: l.hull.family, mk: lower(l.hull.mk) },
  drive: { family: l.drive.family, mk: lower(l.drive.mk) },
});

/** Whether a pick fits now: each family in its own slot, and unlocked. */
export function fitValid(p: Pick<Progress, 'unlocked'>, w: WingmanFit | null | undefined): w is WingmanFit {
  if (!w) return false;
  return (['gun', 'hull', 'drive'] as const).every((slot) => {
    const f = w[slot] as Family | undefined;
    return typeof f === 'string' && slotOf(f) === slot && p.unlocked.includes(f);
  });
}

/** Wingman `i`'s tank: its pick at a Mk below yours, or the mirror of your starting tank. */
export function wingmanLoadoutFor(p: Pick<Progress, 'unlocked' | 'mk' | 'loadout' | 'wingmen'>, i: number): Loadout {
  // Optional chaining: a Progress built before the field (tests, old presets) has none.
  const w = p.wingmen?.[i];
  if (!fitValid(p, w)) return mirrorLoadout(p.loadout);
  return { gun: wingmanPart(p, w.gun), hull: wingmanPart(p, w.hull), drive: wingmanPart(p, w.drive) };
}

/** Every wingman's tank (both slots, whatever the rank: the Match fields only as many as the rank brings). */
export const wingmanLoadouts = (p: Progress): Loadout[] => WINGMAN_RANKS.map((_, i) => wingmanLoadoutFor(p, i));

/** The rank wingman `i` needs ("Captain", "Colonel"), or null once you hold it. */
export function wingmanLock(p: Pick<Progress, 'xp'>, i: number): string | null {
  return perksOf(p.xp).wingmen > i ? null : (RANKS.find((r) => r.id === WINGMAN_RANKS[i])?.name ?? 'a higher rank');
}

/** A wingman's pick (or null: mirror your tank). Rank-gated per slot; families must be unlocked and in their slots. */
export function setWingman(p: Progress, i: number, w: WingmanFit | null): Result {
  if (i < 0 || i >= WINGMAN_RANKS.length) return { ok: false, reason: 'no such wingman' };
  const lock = wingmanLock(p, i);
  if (lock) return { ok: false, reason: `needs ${lock}` };
  if (w !== null && !fitValid(p, w)) return { ok: false, reason: 'not unlocked' };
  const list = WINGMAN_RANKS.map((_, j) => (j === i ? w : (p.wingmen?.[j] ?? null)));
  return { ok: true, progress: { ...p, wingmen: list } };
}

/** Wingman `i`'s pick with one slot changed; an empty pick starts from your own tank's families. */
export function withFamily(p: Pick<Progress, 'loadout' | 'wingmen' | 'unlocked'>, i: number, f: Family): WingmanFit {
  const cur = p.wingmen?.[i];
  // Your own families (a prototype's may not be unlocked: then the starter's, which always are).
  const own = <F extends Family>(slot: 'gun' | 'hull' | 'drive', starter: F): F => (p.unlocked.includes(p.loadout[slot].family) ? (p.loadout[slot].family as F) : starter);
  const base: WingmanFit = fitValid(p, cur) ? cur : { gun: own<GunFamily>('gun', 'machinegun'), hull: own<HullFamily>('hull', 'light'), drive: own<DriveFamily>('drive', 'wheels') };
  return { ...base, [slotOf(f)]: f };
}
