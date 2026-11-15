/** Tank fields the tag rules read (a Tank satisfies it; tests build plain objects). */
export interface TagSubject {
  readonly id: number;
  readonly team: number;
  readonly role: string;
  readonly ace: boolean;
  readonly name: string;
  readonly alive: boolean;
  readonly isPlayer: boolean;
}

export interface TagPlan {
  readonly id: number;
  /** The name over the tank. */
  readonly plate: string;
  /** Aces also wear the gold ace emblem. */
  readonly emblem: boolean;
  /** One of ours (a wingman, a freed clan crew): the plate in Brigade blue, so a red-striped Boar on our side reads as a friend. */
  readonly ally: boolean;
}

/**
 * Allies wear a blue name plate; of the enemies, only aces and bosses are tagged (owner, Nov 15: part icons on every enemy were too much information).
 * Never allies, and never a tank `visible` rules out (off screen, hidden, lost in fog): a tag must not give one away.
 */
export const isTagged = (t: TagSubject, playerTeam: number): boolean =>
  t.alive && t.name.length > 0 && (isAlly(t, playerTeam) || (t.team !== playerTeam && t.team !== 0 && (t.ace ? t.role === 'tank' : t.role === 'boss')));

/** Our tanks other than you (owner, Nov 15: level 49's Boar Heavy looked like an enemy). */
const isAlly = (t: TagSubject, playerTeam: number): boolean => t.team === playerTeam && !t.isPlayer && t.role === 'tank';

/** Who wears a name plate this frame. */
export function planTags(tanks: readonly TagSubject[], playerTeam: number | null, visible: (t: TagSubject) => boolean): TagPlan[] {
  if (playerTeam === null) return [];
  return tanks.filter((t) => isTagged(t, playerTeam) && visible(t)).map((t) => {
    const ally = isAlly(t, playerTeam);
    return { id: t.id, plate: t.name, emblem: t.ace && !ally, ally };
  });
}
