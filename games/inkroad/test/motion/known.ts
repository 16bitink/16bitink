/** A scenario's ratchet: violation counts per rule and expectations still failing, per switch set. */
export interface Known { readonly counts: Readonly<Record<string, number>>; readonly failing: readonly string[] }
export type KnownSets = Readonly<Record<'defaults' | 'on', Readonly<Record<string, Known>>>>;
