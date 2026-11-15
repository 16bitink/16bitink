import { GADGET_NAME } from './match/gadgets';
import type { GadgetKind } from './match/types';
import { familyName, FAMILIES, MAX_MK, roman, slotOf, type Family, type Loadout, type Mk, type Part } from './parts';
import { perksOf, rankOf, RANKS, type RankId } from './rank';
import { RESEARCH_MAX, researchSteps, type Research, type ResearchLine } from './stats';

/**
 * The player's lasting progress, and the workshop's actions on it. Every
 * action returns a new Progress (or a reason it can't be done); nothing is
 * changed in place.
 */
export type IntelBag = Readonly<Partial<Record<Family, number>>>;
/** Gadget blueprints, per gadget (earned by using it; Tactics §3 "Gadget tiers"). */
export type GadgetBag = Readonly<Partial<Record<GadgetKind, number>>>;

export interface Progress {
  /** Unspent intel per family. */
  readonly intel: IntelBag;
  /** All intel ever collected per family (only goes up). */
  readonly intelTotal: IntelBag;
  readonly unlocked: readonly Family[];
  /** The Mk your starting tank fits per unlocked family. */
  readonly mk: Readonly<Partial<Record<Family, Mk>>>;
  readonly research: Research;
  readonly xp: number;
  /** Medals per level: main, bonus 1, bonus 2. */
  readonly medals: Readonly<Record<number, readonly [boolean, boolean, boolean]>>;
  readonly loadout: Loadout;
  /** Unspent gadget blueprints, and each gadget's Mk (Mk I when absent). */
  readonly gadgetIntel: GadgetBag;
  readonly gadgetMk: Readonly<Partial<Record<GadgetKind, Mk>>>;
  /** Ace prototypes you've fitted in the field, the best per family: a Brigadier can fit them for any mission. */
  readonly protos: readonly Part[];
}

export const UNLOCK_COST = 3;
export type NextMk = Exclude<Mk, 1>;
export const MK_COST: Readonly<Record<NextMk, number>> = { 2: 8, 3: 20, 4: 35, 5: 55 };
export const MK_RANK: Readonly<Record<NextMk, RankId>> = { 2: 'sergeant', 3: 'lieutenant', 4: 'major', 5: 'brigadier' };
/** Gadget tiers cost fewer blueprints than parts: you earn them a few a mission. Same rank gates (MK_RANK). */
export const GADGET_MK_COST: Readonly<Record<NextMk, number>> = { 2: 3, 3: 6, 4: 10, 5: 15 };
export const RESEARCH_COST: readonly number[] = [5, 10, 15];

export const LINES_BY_SLOT = {
  gun: ['damage', 'reload'],
  hull: ['armour', 'hp'],
  drive: ['speed', 'grip'],
} as const satisfies Record<string, readonly ResearchLine[]>;

export const STARTER_FAMILIES: readonly Family[] = ['machinegun', 'light', 'wheels'];

export function newProgress(): Progress {
  return {
    intel: {},
    intelTotal: {},
    unlocked: STARTER_FAMILIES,
    mk: { machinegun: 1, light: 1, wheels: 1 },
    research: {},
    xp: 0,
    medals: {},
    loadout: { gun: { family: 'machinegun', mk: 1 }, hull: { family: 'light', mk: 1 }, drive: { family: 'wheels', mk: 1 } },
    gadgetIntel: {},
    gadgetMk: {},
    protos: [],
  };
}

export type Result = { ok: true; progress: Progress } | { ok: false; reason: string };

/** "Cannon blueprints": the player-facing name of intel is Blueprints, and they are per part family. */
const blueprintsOf = (f: Family): string => `${familyName(f)} blueprints`;
const fail = (reason: string): Result => ({ ok: false, reason });
const have = (p: Progress, f: Family): number => p.intel[f] ?? 0;
const spend = (bag: IntelBag, f: Family, n: number): IntelBag => ({ ...bag, [f]: (bag[f] ?? 0) - n });

export function addIntel(p: Progress, gained: IntelBag): Progress {
  const intel: Partial<Record<Family, number>> = { ...p.intel };
  const intelTotal: Partial<Record<Family, number>> = { ...p.intelTotal };
  for (const f of FAMILIES) {
    const n = gained[f] ?? 0;
    if (n <= 0) continue;
    intel[f] = (intel[f] ?? 0) + n;
    intelTotal[f] = (intelTotal[f] ?? 0) + n;
  }
  return { ...p, intel, intelTotal };
}

export function addGadgetIntel(p: Progress, gained: GadgetBag): Progress {
  const bag: Partial<Record<GadgetKind, number>> = { ...p.gadgetIntel };
  for (const [g, n] of Object.entries(gained) as [GadgetKind, number][]) if (n > 0) bag[g] = (bag[g] ?? 0) + n;
  return { ...p, gadgetIntel: bag };
}

export const gadgetMkOf = (p: Progress, g: GadgetKind): Mk => p.gadgetMk[g] ?? 1;

export function raiseGadget(p: Progress, g: GadgetKind): Result {
  const cur = gadgetMkOf(p, g);
  if (cur >= MAX_MK) return fail(`already Mk ${roman(MAX_MK)}`);
  const next = (cur + 1) as NextMk;
  if (perksOf(p.xp).maxMk < next) return fail(`needs ${RANKS.find((r) => r.id === MK_RANK[next])?.name ?? MK_RANK[next]}`);
  const have = p.gadgetIntel[g] ?? 0;
  if (have < GADGET_MK_COST[next]) return fail(`needs ${GADGET_MK_COST[next]} ${GADGET_NAME[g]} blueprints`);
  return { ok: true, progress: { ...p, gadgetIntel: { ...p.gadgetIntel, [g]: have - GADGET_MK_COST[next] }, gadgetMk: { ...p.gadgetMk, [g]: next } } };
}

export function unlock(p: Progress, f: Family): Result {
  if (p.unlocked.includes(f)) return fail('already unlocked');
  if (have(p, f) < UNLOCK_COST) return fail(`needs ${UNLOCK_COST} ${blueprintsOf(f)}`);
  return { ok: true, progress: { ...p, intel: spend(p.intel, f, UNLOCK_COST), unlocked: [...p.unlocked, f], mk: { ...p.mk, [f]: 1 } } };
}

/** A family taken from the enemy in the field (a level's prize): unlocked free, at Mk I. */
export function grantFamily(p: Progress, f: Family): Progress {
  if (p.unlocked.includes(f)) return p;
  return { ...p, unlocked: [...p.unlocked, f], mk: { ...p.mk, [f]: p.mk[f] ?? 1 } };
}

export function raiseMk(p: Progress, f: Family): Result {
  if (!p.unlocked.includes(f)) return fail('not unlocked');
  const cur = p.mk[f] ?? 1;
  if (cur >= MAX_MK) return fail(`already Mk ${roman(MAX_MK)}`);
  const next = (cur + 1) as NextMk;
  if (perksOf(p.xp).maxMk < next) return fail(`needs ${RANKS.find((r) => r.id === MK_RANK[next])?.name ?? MK_RANK[next]}`);
  if (have(p, f) < MK_COST[next]) return fail(`needs ${MK_COST[next]} ${blueprintsOf(f)}`);
  return { ok: true, progress: { ...p, intel: spend(p.intel, f, MK_COST[next]), mk: { ...p.mk, [f]: next } } };
}

export function researchCost(p: Progress, f: Family, line: ResearchLine): number | null {
  const done = researchSteps(p.research, f, line);
  return done >= RESEARCH_MAX ? null : RESEARCH_COST[done]!;
}

export function research(p: Progress, f: Family, line: ResearchLine): Result {
  if (!p.unlocked.includes(f)) return fail('not unlocked');
  const lines: readonly ResearchLine[] = LINES_BY_SLOT[slotOf(f)];
  if (!lines.includes(line)) return fail(`${f} has no ${line} line`);
  const cost = researchCost(p, f, line);
  if (cost === null) return fail('line finished');
  if (have(p, f) < cost) return fail(`needs ${cost} ${blueprintsOf(f)}`);
  const prev = p.research[f] ?? {};
  const steps = researchSteps(p.research, f, line) + 1;
  return { ok: true, progress: { ...p, intel: spend(p.intel, f, cost), research: { ...p.research, [f]: { ...prev, [line]: steps } } } };
}

/** Whether a part can be fitted to the starting tank: an owned family at an owned Mk, or a kept prototype once a Brigadier. */
export function canFit(p: Progress, part: Part): boolean {
  if (part.proto) return perksOf(p.xp).protoParts && p.protos.some((q) => q.family === part.family && q.mk === part.mk);
  return p.unlocked.includes(part.family) && part.mk <= (p.mk[part.family] ?? 0);
}

/** The kept prototype of a family, or null. */
export const protoOf = (p: Progress, f: Family): Part | null => p.protos.find((q) => q.family === f) ?? null;

/** Keeps the ace prototypes among `parts` (what you fitted in a mission): the best Mk per family, kept win or lose. */
export function keepProtos(p: Progress, parts: readonly Part[]): Progress {
  let protos = p.protos;
  for (const part of parts) {
    if (!part.proto) continue;
    const had = protos.find((q) => q.family === part.family);
    if (had && had.mk >= part.mk) continue;
    protos = [...protos.filter((q) => q.family !== part.family), { family: part.family, mk: part.mk, proto: true }];
  }
  return protos === p.protos ? p : { ...p, protos };
}

export function fit(p: Progress, loadout: Loadout): Result {
  for (const slot of ['gun', 'hull', 'drive'] as const) {
    const part = loadout[slot];
    if (slotOf(part.family) !== slot) return fail(`${part.family} is not a ${slot}`);
    if (part.proto && !perksOf(p.xp).protoParts) return fail(`needs ${RANKS.find((r) => r.id === 'brigadier')!.name}`);
    if (!canFit(p, part)) return fail(`${part.family} Mk ${part.mk} not owned`);
  }
  return { ok: true, progress: { ...p, loadout } };
}

/** The best Mk you own of a family as a part, or null if locked. */
export function ownedPart(p: Progress, f: Family): Part | null {
  return p.unlocked.includes(f) ? { family: f, mk: p.mk[f] ?? 1 } : null;
}

export function rankName(p: Progress): string {
  return rankOf(p.xp).name;
}
