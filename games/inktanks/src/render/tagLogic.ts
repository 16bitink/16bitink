import type { Part } from '../logic/parts';

/** Tank fields the tag rules read (a Tank satisfies it; tests build plain objects). */
export interface TagSubject {
  readonly id: number;
  readonly team: number;
  readonly role: string;
  readonly ace: boolean;
  readonly name: string;
  readonly alive: boolean;
  readonly x: number;
  readonly y: number;
  readonly loadout: { readonly gun: Part; readonly hull: Part; readonly drive: Part };
}

export type IconKind = 'gun' | 'hull' | 'drive';

export interface TagPlan {
  readonly id: number;
  /** The icons to show, gun first. */
  readonly icons: readonly IconKind[];
  /** Name and emblem over the tank (aces, bosses). */
  readonly plate: string | null;
  readonly emblem: boolean;
  readonly alpha: number;
}

export const TAG = {
  /** Icons fully opaque inside this distance from the player, fading to FADE_MIN by FAR. */
  near: 360,
  far: 760,
  fadeMin: 0.35,
  /** More than this many tagged enemies within `near`: only the gun icon shows. */
  crowd: 4,
} as const;

/** Enemy tanks that carry tech worth reading: not allies, trucks, crews or boss turrets. */
export const isTagged = (t: Pick<TagSubject, 'team' | 'role' | 'alive'>, playerTeam: number): boolean =>
  t.alive && t.team !== playerTeam && t.team !== 0 && (t.role === 'tank' || t.role === 'boss');

/**
 * Who gets tags this frame. `visible(t)` says on screen and not hidden/lost in fog (the caller owns that:
 * a hidden enemy must never show its tech). Aces and bosses always keep a nameplate; their icons follow the same rules.
 */
export function planTags(
  tanks: readonly TagSubject[],
  player: { readonly x: number; readonly y: number; readonly team: number } | null,
  visible: (t: TagSubject) => boolean,
): TagPlan[] {
  if (!player) return [];
  const shown = tanks.filter((t) => isTagged(t, player.team) && visible(t));
  const dist = (t: TagSubject): number => Math.hypot(t.x - player.x, t.y - player.y);
  const close = shown.filter((t) => dist(t) < TAG.near && t.role === 'tank' && !t.ace).length;
  return shown.map((t) => {
    const d = dist(t);
    const k = Math.min(1, Math.max(0, (d - TAG.near) / (TAG.far - TAG.near)));
    const special = t.ace || t.role === 'boss';
    const alpha = special ? 1 : 1 - k * (1 - TAG.fadeMin);
    const icons: IconKind[] = t.role === 'boss' ? [] : close > TAG.crowd && !t.ace ? ['gun'] : ['gun', 'hull', 'drive'];
    return { id: t.id, icons, plate: special && t.name ? t.name : null, emblem: t.ace, alpha };
  });
}
