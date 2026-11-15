import { botSees, loseTrack } from '../bots/awareness';
import { gadgetMax, mineTier, OIL_FIRE, oilTier, SCATTER_DAMAGE, smokeTier } from '../gadgetTiers';
import type { Mk } from '../parts';
import type { Pt } from '../vec';
import { hitTank } from './combat';
import { dropPoint, GADGET, pruneGadgets, type Patch } from './gadgets';
import type { Match } from './match';
import type { GadgetKind, Tank } from './types';

/**
 * Using the gadget slot and what gadgets on the ground do each step
 * (design doc, Tactics §3, and the tiers in gadgetTiers.ts). Mines arm
 * after 1 s and go off under an enemy (damage, splash at half, a broken
 * track); only bots that watched one laid steer round it. Oil: enemies in it
 * slide (movement.ts), shoot wide from Mk III (combat.ts), and from Mk V a
 * shot of yours sets it alight. Smoke blocks sight (perception.ts), repairs
 * you from Mk III and makes the hunters lose you at Mk V. Each use earns one
 * of its blueprints (m.gadgetIntel), and each enemy it catches more.
 */

/** Gadget blueprints for the player's side. */
export function earnGadget(m: Match, team: number, kind: GadgetKind, n = 1): void {
  if (n <= 0 || !m.player || team !== m.player.team) return;
  m.gadgetIntel = { ...m.gadgetIntel, [kind]: (m.gadgetIntel[kind] ?? 0) + n };
  // Shown as it happens, as part blueprints are (owner, Nov 15: earning them silently read as "no blueprints").
  m.emit({ kind: 'gadgetIntel', gadget: kind, n });
}

/** Uses the tank's found gadget, or else a charge of its own. Returns whether it did. */
export function useGadget(m: Match, t: Tank): boolean {
  const kind = t.found ?? t.gadget;
  if (!kind || !t.alive || t.role !== 'tank' || m.t < t.gadgetT) return false;
  if (!t.found && t.gadgetCharges <= 0) return false;
  if (t.found) t.found = null;
  else t.gadgetCharges--;
  t.gadgetT = m.t + GADGET.cooldown;
  t.gadgetsUsed++;
  // Every use earns one (owner, Nov 15: hits alone left upgrades out of reach).
  earnGadget(m, t.team, kind);
  const mk = t.gadgetMk[kind];
  const at = dropPoint(kind, t);
  if (kind === 'mines') layMines(m, t, mk, at);
  else if (kind === 'oil') {
    const o = oilTier(mk);
    m.gadgets.oils.push(patch(m, at, o.r, o.life, t.team, mk));
  } else popSmoke(m, t, mk, at);
  m.emit({ kind: 'gadget', tank: t.id, gadget: kind, x: at.x, y: at.y });
  return true;
}

const patch = (m: Match, at: Pt, r: number, life: number, team: number, mk: Mk): Patch =>
  ({ id: m.nextId++, x: at.x, y: at.y, r, team, at: m.t, until: m.t + life, mk, slowed: new Set(), burnUntil: -1, burnTick: 0 });

function layMines(m: Match, t: Tank, mk: Mk, at: Pt): void {
  const tier = mineTier(mk);
  // The bots that see you lay it know it's there.
  const known = new Set<number>();
  for (const [bid, b] of m.brains) {
    const o = m.tank(bid);
    if (o?.alive && o.team !== t.team && botSees(m, b, o, t)) known.add(bid);
  }
  const n = tier.scatter;
  const damage = tier.damage * (n > 1 ? SCATTER_DAMAGE : 1);
  // A scatter fans out across the tank's track, the outer ones a little further back.
  const side = { x: -Math.sin(t.heading), y: Math.cos(t.heading) };
  const back = { x: -Math.cos(t.heading), y: -Math.sin(t.heading) };
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i - (n - 1) / 2) * 26 : 0;
    const x = at.x + side.x * off + back.x * Math.abs(off) * 0.4;
    const y = at.y + side.y * off + back.y * Math.abs(off) * 0.4;
    m.gadgets.mines.push({ id: m.nextId++, x, y, team: t.team, owner: t.id, armAt: m.t + GADGET.mine.arm, damage, trigger: tier.trigger, slowFor: tier.slowFor, small: n > 1, known, alive: true });
  }
}

function popSmoke(m: Match, t: Tank, mk: Mk, at: Pt): void {
  const s = smokeTier(mk);
  // Blueprints for each enemy that had you in sight: the cloud breaks it (up to 3).
  let watchers = 0;
  for (const [bid, b] of m.brains) {
    const o = m.tank(bid);
    if (!o?.alive || o.team === t.team) continue;
    if (botSees(m, b, o, t)) watchers++;
    if (s.blinds) loseTrack(m, b, o, t);
  }
  m.gadgets.smokes.push(patch(m, at, s.r, s.life, t.team, mk));
  earnGadget(m, t.team, 'smoke', Math.min(3, watchers));
}

const triggers = (t: Tank): boolean => t.alive && t.role !== 'bossTurret' && t.role !== 'crew';
const inPatch = (p: Patch, x: number, y: number): boolean => (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r;

/** Armed mines under an enemy go off; slicks catch and burn; smoke repairs; old ones go. */
export function stepGadgets(m: Match, dt: number): void {
  const g = m.gadgets;
  for (const mine of g.mines) {
    if (!mine.alive || m.t < mine.armAt) continue;
    const reach = mine.trigger;
    const victim = m.tanks.find((t) => triggers(t) && t.team !== mine.team && (t.x - mine.x) ** 2 + (t.y - mine.y) ** 2 <= reach * reach);
    if (!victim) continue;
    mine.alive = false;
    explodeMine(m, mine, victim);
  }
  for (const p of g.oils) stepOil(m, p);
  repairInSmoke(m, dt);
  pruneGadgets(g, m.t);
}

/** Damages a tank from a gadget, and pays its blueprints: 1 a hit, 1 more for the kill. */
function gadgetHit(m: Match, t: Tank, dmg: number, from: number | null, team: number, kind: GadgetKind): void {
  hitTank(m, t, dmg, 'cannon', from, true);
  earnGadget(m, team, kind, t.alive ? 1 : 2);
}

function explodeMine(m: Match, mine: { x: number; y: number; team: number; owner: number; damage: number; slowFor: number }, victim: Tank): void {
  const { x, y, team } = mine;
  const splash = GADGET.mine.splash;
  m.emit({ kind: 'mine', x, y, target: victim.id });
  m.emit({ kind: 'explode', x, y, r: splash });
  const from = m.tank(mine.owner) ? mine.owner : null;
  victim.trackBrokenUntil = m.t + mine.slowFor;
  gadgetHit(m, victim, mine.damage, from, team, 'mines');
  for (const t of m.tanks) {
    if (t === victim || !triggers(t) || t.team === team) continue;
    const r = splash + t.stats.radius;
    if ((t.x - x) ** 2 + (t.y - y) ** 2 <= r * r) gadgetHit(m, t, mine.damage * 0.5, from, team, 'mines');
  }
}

function stepOil(m: Match, p: Patch): void {
  if (p.until <= m.t) return;
  const burning = p.burnUntil > m.t;
  const tick = burning && m.t >= p.burnTick;
  if (tick) p.burnTick = m.t + OIL_FIRE.tick;
  for (const t of m.tanks) {
    if (!triggers(t) || t.team === p.team || !inPatch(p, t.x, t.y)) continue;
    if (!p.slowed.has(t.id)) {
      p.slowed.add(t.id);
      earnGadget(m, p.team, 'oil');
    }
    if (tick) gadgetHit(m, t, OIL_FIRE.damage, m.player && p.team === m.player.team ? m.player.id : null, p.team, 'oil');
  }
}

/** Your own Mk III+ cloud patches you up while you sit in it. */
function repairInSmoke(m: Match, dt: number): void {
  const p = m.player;
  if (!p?.alive || p.hp >= p.stats.maxHp) return;
  let best = 0;
  for (const s of m.gadgets.smokes) if (s.team === p.team && s.until > m.t && inPatch(s, p.x, p.y)) best = Math.max(best, smokeTier(s.mk).repair);
  if (best > 0) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * best * dt);
}

/** A crate's gadget: a found one-use of another kind, a charge of yours, or (full up) blueprints. Returns whether it was taken. */
export function takeGadget(m: Match, t: Tank, kind: GadgetKind | undefined): boolean {
  if (!t.isPlayer) return false;
  const own = t.gadget;
  if (kind && kind !== own) {
    if (t.found) return false;
    t.found = kind;
    m.emit({ kind: 'pickup', tank: t.id, what: 'gadget', amount: 1, gadget: kind, found: true });
    return true;
  }
  if (!own) return false;
  if (t.gadgetCharges < gadgetMax(own, t.gadgetMk[own])) {
    t.gadgetCharges++;
    m.emit({ kind: 'pickup', tank: t.id, what: 'gadget', amount: 1, gadget: own });
  } else {
    earnGadget(m, t.team, own);
    m.emit({ kind: 'pickup', tank: t.id, what: 'gadget', amount: 1, gadget: own, spare: true });
  }
  return true;
}
