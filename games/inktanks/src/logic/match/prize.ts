import { familyName, slotOf } from '../parts';
import type { Match } from './match';
import type { Pickup, Tank } from './types';

/**
 * A level's prize (level 21: the Weasels' Hover at their dock): the family you
 * take from the enemy for good. Until it's fitted the HUD points you to it and
 * the stand-in goes for it first.
 */

/** The nearest pickup holding the prize (its crate, or the part once out), while `t` hasn't fitted it. */
export function prizePickup(m: Match, t: Tank): Pickup | null {
  const prize = m.level.def.prize;
  if (!prize || t.loadout[slotOf(prize)].family === prize) return null;
  let best: Pickup | null = null;
  let bestD = Infinity;
  for (const p of m.pickups) {
    if (p.taken) continue;
    const holds = p.kind === 'part' ? p.part.family === prize : p.kind === 'crate' && p.content.kind === 'part' && p.content.part.family === prize;
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    if (holds && d < bestD) [best, bestD] = [p, d];
  }
  return best;
}

/** The HUD's goal line while the prize waits: "Take the Hover", with the arrow on it. */
export function prizeGoal(m: Match, t: Tank): { text: string; target: { x: number; y: number } } | null {
  const p = prizePickup(m, t);
  const prize = m.level.def.prize;
  if (!p || !prize) return null;
  return { text: p.kind === 'crate' ? `Take the ${familyName(prize)} from the Weasels' dock` : `Hold swap on the ${familyName(prize)} to fit it`, target: { x: p.x, y: p.y } };
}
