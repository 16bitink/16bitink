import type { Medals } from './mission/outcome';
import { slotOf, type Family, type Mk, type Part } from './parts';
import { SAVE_VERSION, type SaveData } from './save';
import type { Research, ResearchLine } from './stats';
import { canFit, ownedPart, protoOf, STARTER_FAMILIES, type Progress } from './workshop';

/**
 * Combines two copies of the save (this device's and the account's, or two
 * devices') so that no progress is lost. `a` is this device's copy. Both
 * inputs must already be validated saves (parseSave); the result is one too.
 *
 * The rule per field:
 * - medals: OR per medal, per level (passed levels follow: main medal held on either).
 * - xp: max.
 * - unlocked families: union (a's order, then b's extras).
 * - mk per family, gadgetMk per gadget, research steps per family and line: max.
 * - intelTotal (lifetime blueprints per family, only goes up): max per family.
 * - protos (ace prototypes kept win or lose): union, the best Mk per family.
 * - intel and gadgetIntel (spendable blueprints): taken whole from the lead
 *   copy. Spent blueprints can't be told apart from unearned ones, so neither
 *   union nor sum is right; one copy's bags are always non-negative and never
 *   above its own lifetime totals, so spending never goes negative.
 * - loadout: the lead copy's, refitted part by part to what the merged
 *   progress owns (a kept prototype at its best Mk, else the best owned Mk).
 * - gadget picked, wingmen picks: the lead copy's (wingmen are checked where
 *   used, wingmanFit.ts).
 * - seenBlueprints: OR (a tip once shown stays shown).
 * - sound: always a's. It is this device's setting, not progress.
 *
 * The lead copy is the one further along: more passed levels, then more XP,
 * then more lifetime blueprints. On a full tie it is a (this device).
 *
 * mergeSave(a, a) equals a. Every field but sound is the same either way
 * round, except that on a tie the lead is a, and list order follows a.
 */
export function mergeSave(a: SaveData, b: SaveData): SaveData {
  const lead = leadOf(a, b);
  const pa = a.progress;
  const pb = b.progress;
  const unlocked = union(pa.unlocked, pb.unlocked);
  const merged: Progress = {
    intel: lead.progress.intel,
    intelTotal: maxBook(pa.intelTotal, pb.intelTotal),
    unlocked,
    mk: maxBook(pa.mk, pb.mk) as Progress['mk'],
    research: maxResearch(pa.research, pb.research),
    xp: Math.max(pa.xp, pb.xp),
    medals: orMedals(pa.medals, pb.medals),
    loadout: lead.progress.loadout,
    gadgetIntel: lead.progress.gadgetIntel,
    gadgetMk: maxBook(pa.gadgetMk, pb.gadgetMk) as Progress['gadgetMk'],
    protos: mergeProtos(pa.protos, pb.protos),
    wingmen: lead.progress.wingmen,
  };
  const progress: Progress = { ...merged, loadout: refitLoadout(merged) };
  return {
    v: SAVE_VERSION,
    progress,
    sound: a.sound,
    seenBlueprints: a.seenBlueprints || b.seenBlueprints,
    gadget: lead.gadget,
  };
}

/** Levels whose main medal is held. */
export const passedCount = (p: Progress): number => Object.values(p.medals).filter((m) => m[0]).length;

const lifetimeBlueprints = (p: Progress): number => Object.values(p.intelTotal).reduce((s: number, n) => s + (n ?? 0), 0);

/** The copy further along (passed levels, then XP, then lifetime blueprints); a on a tie. */
export function leadOf(a: SaveData, b: SaveData): SaveData {
  const keys = (s: SaveData): readonly number[] => [passedCount(s.progress), s.progress.xp, lifetimeBlueprints(s.progress)];
  const ka = keys(a);
  const kb = keys(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i]! > kb[i]! ? a : b;
  return a;
}

function union<T>(a: readonly T[], b: readonly T[]): T[] {
  return [...a, ...b.filter((x) => !a.includes(x))];
}

function maxBook<K extends string>(a: Readonly<Partial<Record<K, number>>>, b: Readonly<Partial<Record<K, number>>>): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = { ...a };
  for (const [k, n] of Object.entries(b) as [K, number][]) out[k] = Math.max(out[k] ?? 0, n);
  return out;
}

function maxResearch(a: Research, b: Research): Research {
  const out: Record<string, Partial<Record<ResearchLine, number>>> = {};
  for (const f of union(Object.keys(a), Object.keys(b))) out[f] = maxBook(a[f] ?? {}, b[f] ?? {});
  return out;
}

function orMedals(a: Progress['medals'], b: Progress['medals']): Progress['medals'] {
  const out: Record<number, Medals> = { ...a };
  for (const [k, m] of Object.entries(b)) {
    const n = Number(k);
    const had = out[n];
    out[n] = had ? [had[0] || m[0], had[1] || m[1], had[2] || m[2]] : m;
  }
  return out;
}

function mergeProtos(a: readonly Part[], b: readonly Part[]): Part[] {
  const out: Part[] = [...a];
  for (const q of b) {
    const i = out.findIndex((o) => o.family === q.family);
    if (i < 0) out.push(q);
    else if (q.mk > out[i]!.mk) out[i] = q;
  }
  return out;
}

/** A part the merged progress can't fit becomes the kept prototype of its family, else the best owned Mk, else the starter of its slot. */
function refitPart(p: Progress, part: Part): Part {
  if (canFit(p, part)) return part;
  const proto = part.proto ? protoOf(p, part.family) : null;
  if (proto && canFit(p, proto)) return proto;
  const owned = ownedPart(p, part.family);
  if (owned) return owned;
  const starter = STARTER_FAMILIES.find((f) => slotOf(f) === slotOf(part.family)) as Family;
  return { family: starter, mk: (p.mk[starter] ?? 1) as Mk };
}

function refitLoadout(p: Progress): Progress['loadout'] {
  const l = p.loadout;
  const gun = refitPart(p, l.gun);
  const hull = refitPart(p, l.hull);
  const drive = refitPart(p, l.drive);
  return gun === l.gun && hull === l.hull && drive === l.drive ? l : { gun, hull, drive };
}
