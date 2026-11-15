import { slotOf, withPart, type Family, type HullFamily } from '../parts';
import { tankStats } from '../stats';
import { mergeIntel, sumIntel } from '../intel';
import { takeGadget } from './gadgetUse';
import { isDrivable } from '../land';
import type { Match } from './match';
import type { Tank, TankInput } from './types';

/** Hold swap this long to fit the part underneath. */
export const SWAP_HOLD = 0.5;
export const REPAIR_TIME = 2;
export const REPAIR_SHARE = 0.4;
const REACH = 14;
/** A supply drop's contents land this far from it. */
const SPILL = 18;

export function repair(m: Match, t: Tank, input: TankInput, dt: number): void {
  if (t.repairT > 0) {
    const step = Math.min(dt, t.repairT);
    t.hp = Math.min(t.stats.maxHp, t.hp + (t.stats.maxHp * REPAIR_SHARE * step) / REPAIR_TIME);
    t.repairT -= step;
    return;
  }
  if (input.repair && t.kits > 0 && t.hp < t.stats.maxHp) {
    t.kits--;
    t.usedKit = true;
    t.repairT = REPAIR_TIME;
  }
}

/** Fits a part, keeping the HP share; the old part drops where the tank stands. */
export function swapIn(m: Match, t: Tank, pickupId: number): void {
  const p = m.pickups.find((x) => x.id === pickupId);
  if (!p || p.taken || p.kind !== 'part') return;
  const slot = slotOf(p.part.family);
  const old = t.loadout[slot];
  const share = t.hp / t.stats.maxHp;
  t.loadout = withPart(t.loadout, p.part);
  const stats = tankStats(t.loadout, t.research);
  t.stats = { ...stats, maxHp: stats.maxHp * t.hpMult };
  t.hp = Math.max(1, share * t.stats.maxHp);
  if (slot === 'gun') {
    t.reload = t.stats.gun.reload;
    t.burst = 0;
    t.ammo = t.stats.gun.belt;
    t.beltT = 0;
  }
  if (slot === 'hull' && !t.hullsUsed.includes(p.part.family as HullFamily)) t.hullsUsed.push(p.part.family as HullFamily);
  t.picks.push(p.part);
  p.taken = true;
  // The old part drops out of reach behind, so holding swap doesn't swap it straight back;
  // onto dry ground (behind, else to a side, else ahead), never into the swamp where no one can reach it.
  const back = t.stats.radius + REACH + 12;
  const spot = dropSpot(m, t, back);
  m.addPickup({ kind: 'part', part: old }, spot.x, spot.y);
  m.emit({ kind: 'swap', tank: t.id, part: p.part, dropped: old });
}

/** Where a swapped-out part lands: `back` px behind the tank, or the first of its sides and its front on dry land. */
function dropSpot(m: Match, t: Tank, back: number): { x: number; y: number } {
  for (const turn of [Math.PI, Math.PI / 2, -Math.PI / 2, 0]) {
    const a = t.heading + turn;
    const x = t.x + Math.cos(a) * back;
    const y = t.y + Math.sin(a) * back;
    if (isDrivable(m.land, x, y)) return { x, y };
  }
  return { x: t.x - Math.cos(t.heading) * back, y: t.y - Math.sin(t.heading) * back };
}

export function touchPickups(m: Match, t: Tank, input: TankInput, dt: number, wantsSwap: boolean): void {
  if (t.role !== 'tank') return;
  const reach = t.stats.radius + REACH;
  let onPart: number | null = null;
  // The part underneath is the nearest one in reach (or the one a bot is driving for): with a pile, not whichever came first.
  let onPartD = Infinity;
  let chosen = false;
  let onFullKit = false;
  for (const p of m.pickups) {
    if (p.taken) continue;
    const dx = p.x - t.x;
    const dy = p.y - t.y;
    if (dx * dx + dy * dy > reach * reach) continue;
    switch (p.kind) {
      case 'crate':
        p.taken = true;
        m.emit({ kind: 'crate', x: p.x, y: p.y });
        if (p.content.kind === 'kit') m.addPickup({ kind: 'kit' }, p.x, p.y);
        else if (p.content.kind === 'gadget') m.addPickup({ kind: 'gadget', gadget: p.content.gadget }, p.x, p.y);
        else m.addPickup({ kind: 'part', part: p.content.part }, p.x, p.y);
        break;
      case 'kit':
        // On our side only you take kits off the ground: wingmen and freed allies bring their own.
        if (t.team === 0 && !t.isPlayer) break;
        if (t.kits < t.maxKits) {
          p.taken = true;
          t.kits++;
          m.emit({ kind: 'pickup', tank: t.id, what: 'kit', amount: 1 });
        } else onFullKit = true;
        break;
      case 'gadget':
        // A charge of yours, a found one-use of another kind (one at a time), or blueprints when full.
        if (takeGadget(m, t, p.gadget)) p.taken = true;
        break;
      case 'intel':
        if (t.team === 0) {
          p.taken = true;
          m.intel = mergeIntel(m.intel, p.bag);
          m.emit({ kind: 'pickup', tank: t.id, what: 'intel', amount: sumIntel(p.bag), family: (Object.keys(p.bag) as Family[])[0] });
        }
        break;
      case 'supply':
        // Your supply drop: only you open it, and its kit and part spill out beside it.
        if (t.isPlayer) {
          p.taken = true;
          m.emit({ kind: 'crate', x: p.x, y: p.y });
          p.contents.forEach((c, i) => {
            const a = (i / p.contents.length) * Math.PI * 2 + 0.4;
            const at = { x: p.x + Math.cos(a) * SPILL, y: p.y + Math.sin(a) * SPILL };
            if (c.kind === 'kit') m.addPickup({ kind: 'kit' }, at.x, at.y);
            else if (c.kind === 'gadget') m.addPickup({ kind: 'gadget', gadget: c.gadget }, at.x, at.y);
            else m.addPickup({ kind: 'part', part: c.part }, at.x, at.y);
          });
        }
        break;
      case 'proto':
        if (t.isPlayer) {
          p.taken = true;
          t.carrying = true;
          m.emit({ kind: 'pickup', tank: t.id, what: 'proto', amount: 1 });
        }
        break;
      case 'part': {
        const d2 = dx * dx + dy * dy;
        if (p.id === input.swapPart) [onPart, onPartD, chosen] = [p.id, d2, true];
        else if (!chosen && d2 < onPartD) [onPart, onPartD] = [p.id, d2];
        break;
      }
    }
  }
  t.onPart = onPart;
  t.onFullKit = onFullKit;
  const holding = t.isPlayer && !m.cfg.playerBot ? input.swap : wantsSwap;
  if (onPart === null || !holding) {
    t.swapT = 0;
    return;
  }
  t.swapT += dt;
  if (t.swapT >= SWAP_HOLD) {
    t.swapT = 0;
    swapIn(m, t, onPart);
  }
}
