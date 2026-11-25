/**
 * Which pictures a city needs: what every city shares, its own set, and the
 * gulf (or shared) stand-in for anything its set lacks. Pure: names in, names out.
 */
export const SETS = ['gulf', 'oldtown', 'islands', 'hills', 'rivers'] as const;
export type SetName = (typeof SETS)[number];
const FALLBACK = 'gulf';
/** Painted for every set, used by those with no texture of their own. */
const SHARED_ISLAND = 'oldtown';
/** Gulf's own trees carry no set name. */
const GULF_TREES = /^tree-(palm|palm-tall|round|shrub|rock)-/;
const TEX_ALIAS: Readonly<Record<string, readonly string[]>> = { sand: ['sand', 'ground'] };
/** A building's kind and level, without the variant. */
const KIND = /^b-[a-z]+-(.+?)\d?-\d+$/;

const setOf = (name: string): string | null => /^(?:b|tex|tree|flat)-([a-z]+)-/.exec(name)?.[1] ?? null;
const isSet = (s: string | null): s is SetName => s !== null && (SETS as readonly string[]).includes(s);
const kindOf = (name: string): string => KIND.exec(name)?.[1] ?? name;

/** The file names (no extension) to load for a city of this style. `vehicles`: the kinds that drive. */
export function filesFor(style: string, names: readonly string[], vehicles: readonly string[]): string[] {
  const all = new Set(names);
  const ownKinds = new Set(names.filter((n) => n.startsWith(`b-${style}-`)).map(kindOf));
  const islandSet = all.has(`flat-${style}-island`) ? style : style === FALLBACK ? null : SHARED_ISLAND;
  const wants = (n: string): boolean => {
    const s = setOf(n);
    if (n.startsWith('b-')) return s === style || (s === FALLBACK && !ownKinds.has(kindOf(n)));
    if (n.startsWith('tex-')) return isSet(s) ? s === style : style === FALLBACK || !hasOwnTexture(all, style, n.slice(4));
    if (n.startsWith('tree-')) return GULF_TREES.test(n) ? style === FALLBACK : s === style;
    if (n.startsWith('flat-') && n.includes('island')) return islandSet === null ? !isSet(s) : s === islandSet;
    if (n.startsWith('v-')) return vehicles.some((v) => n === `v-${v}` || n.startsWith(`v-${v}-`));
    return !isSet(s);
  };
  return names.filter(wants);
}

const hasOwnTexture = (all: ReadonlySet<string>, style: string, tex: string): boolean => (TEX_ALIAS[tex] ?? [tex]).some((t) => all.has(`tex-${style}-${t}`));

/** The keys to try for a roundabout's island, best first. */
export const islandKeys = (style: string, small: boolean): readonly string[] => {
  const tail = small ? 'island-small' : 'island';
  return style === FALLBACK ? [`flat/${tail}`] : [`flat/${style}-${tail}`, `flat/${SHARED_ISLAND}-${tail}`, `flat/${tail}`];
};
