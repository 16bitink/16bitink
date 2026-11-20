import type { Pt } from '../vec';
import type { ObjectiveDef } from '../level/types';
import type { Match } from '../match/match';
import { addTank } from '../match/spawn';
import type { StructRt, Tank } from '../match/types';
import { navAngle } from '../bots/control';
import { STARTER_LOADOUT } from '../parts';
import { BASE, dist, nearest, type Objective } from './types';

const structPt = (s: StructRt) => ({ x: s.def.x, y: s.def.y });

/** Raid: destroy the structures with the tag (fuel stacks, a radar mast, valves). */
export function raid(m: Match, def: Extract<ObjectiveDef, { kind: 'raid' }>): Objective {
  const targets = m.structs.filter((s) => s.def.tag === def.tag);
  const need = def.need ?? targets.length;
  const left = () => targets.filter((s) => s.state > 0);
  return {
    ...BASE,
    kind: 'raid',
    title: `Destroy ${need} ${def.label.toLowerCase()}`,
    step: () => undefined,
    status: () => {
      const l = left();
      const n = nearest(m.player ?? structPt(targets[0]!), l.map((s) => ({ ...structPt(s), s })));
      const done = targets.length - l.length >= need;
      // The column (chapter 5): one of it across before the targets are down fails the raid.
      const crossed = def.column && !done && m.tanks.some((t) => t.escaped && m.brains.get(t.id)?.role === 'convoy');
      return { text: `${def.label} ${targets.length - l.length}/${need}`, target: n ? structPt(n.s) : null, done, failed: crossed ? 'the column crossed' : null };
    },
    playerHint: (t) => {
      const n = nearest(t, left().map((s) => ({ ...structPt(s), s })));
      return n ? { goal: n, goalRadius: t.stats.gun.range * 0.6, shootAt: { x: n.x, y: n.y, id: n.s.def.id } } : null;
    },
  };
}

/**
 * Freed crews ride a small cart this fast, and are this tough. They follow `gap` px behind,
 * `warGap` while an enemy is within `duck` (the stand-in clears those first).
 */
export const CREW = { speed: 120, radius: 12, hp: 200, homeRadius: 130, gap: 46, warGap: 160, duck: 380 } as const;

/**
 * Rescue: break the cages (tagged structures); each frees a crew that
 * follows you in a line at once (further back while enemies are close).
 * Bring them home; crews can be hit, and losing one fails.
 */
export function rescue(m: Match, def: Extract<ObjectiveDef, { kind: 'rescue' }>): Objective {
  const cages = m.structs.filter((s) => s.def.tag === def.tag);
  const home = m.point(def.home);
  const need = cages.length;
  const crews: Tank[] = [];
  const freed = new Set<string>();
  let saved = 0;
  // The pick-up truck parked at home, nose to the nearest map edge; it drives off once everyone is aboard.
  const edge = nearestEdge(m, home);
  const truck = { x: home.x, y: home.y, heading: Math.atan2(edge.y - home.y, edge.x - home.x) };
  let leaving = 0;
  const following = () => crews.filter((c) => c.alive && !c.escaped);
  // Chapter 4 (level 32): crews buried in snowdrifts are dug out, not freed from cages; the rule is the same.
  const dug = cages.length > 0 && cages.every((s) => s.def.kind.startsWith('snowdrift'));
  return {
    ...BASE,
    kind: 'rescue',
    title: dug ? `Dig out ${need} crews and bring them home` : `Free ${need} crews and bring them home`,
    step: (dt) => {
      if (saved >= need) {
        leaving += dt;
        truck.x += Math.cos(truck.heading) * RESCUE_TRUCK.speed * dt * Math.min(1, leaving);
        truck.y += Math.sin(truck.heading) * RESCUE_TRUCK.speed * dt * Math.min(1, leaving);
      }
      for (const s of cages) {
        if (s.state > 0 || freed.has(s.def.id)) continue;
        freed.add(s.def.id);
        const c = addTank(m, { name: `Crew ${freed.size}`, clan: 'ink', team: 0, role: 'crew', crew: 'Otter', loadout: STARTER_LOADOUT, at: structPt(s) });
        c.stats = { ...c.stats, maxHp: def.crewHp ?? CREW.hp, speed: CREW.speed, radius: CREW.radius, armour: 0 };
        c.hp = c.stats.maxHp;
        crews.push(c);
      }
      for (const c of following()) {
        if (dist(c, home) < CREW.homeRadius) {
          m.escape(c);
          saved++;
        }
      }
    },
    status: () => {
      const intact = cages.filter((s) => s.state > 0);
      const lost = crews.filter((c) => !c.alive && !c.escaped).length;
      const failed = lost > 0 ? 'a crew was lost' : null;
      const n = m.player ? nearest(m.player, intact.map(structPt)) : null;
      const text = intact.length > 0 ? `${dug ? 'Crews dug out' : 'Cages broken'} ${need - intact.length}/${need}, crews home ${saved}` : `Crews home ${saved}/${need}`;
      const aboard = saved >= need;
      return { text: aboard ? 'Everyone is aboard: the truck is off' : text, target: aboard ? null : n ?? home, done: aboard && leaving >= RESCUE_TRUCK.leave, failed };
    },
    staged: () => freed.size > 0,
    playerHint: (t) => {
      const intact = cages.filter((s) => s.state > 0).map((s) => ({ ...structPt(s), s }));
      // Clear the enemies that keep a crew pinned down.
      for (const c of following()) {
        const threat = m.tanks.find((o) => o.alive && o.team !== 0 && o.role !== 'bossTurret' && dist(o, c) < CREW.duck);
        if (threat) return { goal: threat, goalRadius: t.stats.gun.range * 0.6, target: threat.id };
      }
      const lag = following().reduce((d, c) => Math.max(d, dist(c, t)), 0);
      // Wait for a crew that's fallen behind.
      if (lag > 260) return { goal: t, goalRadius: 400, stay: true };
      const n = nearest(t, intact);
      if (n) return { goal: n, goalRadius: t.stats.gun.range * 0.5, shootAt: { x: n.x, y: n.y, id: n.s.def.id } };
      return { goal: home, goalRadius: 40, urgent: true };
    },
    drive: (t) => {
      const i = crews.indexOf(t);
      if (i < 0 || !m.player) return null;
      const line = following();
      const ahead = line[line.indexOf(t) - 1] ?? m.player;
      const d = dist(t, ahead);
      // A freed crew comes after you at once, fight or no fight: one that stayed down by its cage
      // while a guard was near looked stuck (level 6, owner, Nov 20). With enemies close it keeps
      // further back, out of the shots aimed at you (enemies never aim at crews).
      const danger = m.tanks.some((o) => o.alive && o.team !== 0 && o.role !== 'bossTurret' && dist(o, t) < CREW.duck);
      const gap = danger ? CREW.warGap : CREW.gap;
      if (d < gap) return { move: null, aim: null, fire: false, swap: false, repair: false };
      return { move: { kind: 'point', angle: navAngle(m, t, ahead), mag: Math.min(1, (d - gap) / 60) }, aim: null, fire: false, swap: false, repair: false };
    },
    marks: () => (saved >= need ? [] : [{ kind: 'pickup', x: home.x, y: home.y, r: CREW.homeRadius }]),
    props: () => [{ kind: 'truck', x: truck.x, y: truck.y, heading: truck.heading }],
  };
}

/** The rescue truck drives off this fast, px/s, and the mission ends this long after it starts. */
const RESCUE_TRUCK = { speed: 150, leave: 2.4 } as const;

/** The point just off the map edge nearest to p. */
function nearestEdge(m: Match, p: Pt): Pt {
  const w = m.land.width;
  const h = m.land.height;
  const opts: Pt[] = [{ x: -100, y: p.y }, { x: w + 100, y: p.y }, { x: p.x, y: -100 }, { x: p.x, y: h + 100 }];
  return opts.reduce((a, b) => (dist(b, p) < dist(a, p) ? b : a));
}
