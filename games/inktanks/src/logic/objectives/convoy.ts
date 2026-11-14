import type { ObjectiveDef } from '../level/types';
import type { Match } from '../match/match';
import { addTank, TRUCK } from '../match/spawn';
import type { Tank } from '../match/types';
import { angleTo } from '../vec';
import { breakStructure } from '../match/movement';
import { BASE, dist, nearest, type Objective } from './types';

const STOP = { move: null, aim: null, fire: false, swap: false, repair: false } as const;
/** The truck only drives while you're this close. */
const TRUCK_LEASH = 480;
/** Waves and hunters go for the truck from this close. */
const TRUCK_HUNT = 600;

/** Trucks in a convoy (chapter 5) keep this far behind the one ahead. */
export const CONVOY_GAP = 110;
/** The stand-in looks this far ahead of the lead truck for a felled tree to saw through (`clear`). */
const CLEAR_LOOK = 300;

/**
 * Escort: the supply truck follows its road to the end while you stay near it. Lose it and the mission fails.
 * Chapter 5 adds `trucks` (a convoy: the rest follow the lead CONVOY_GAP apart; lose any and it fails; all must
 * arrive) and `clear` (a tag on structures across the road, felled trees: the trucks can't pass one until it's
 * sawn through, and the stand-in shoots the next one ahead of the lead).
 */
export function escort(m: Match, def: Extract<ObjectiveDef, { kind: 'escort' }>): Objective {
  const road = m.road(def.road);
  const barge = def.vessel === 'barge';
  const n = barge ? 1 : Math.max(1, Math.round(def.trucks ?? 1));
  const heading = angleTo(road[0]!, road[1]!);
  const trucks: Tank[] = Array.from({ length: n }, (_, k) => {
    const back = { x: road[0]!.x - Math.cos(heading) * CONVOY_GAP * k, y: road[0]!.y - Math.sin(heading) * CONVOY_GAP * k };
    const at = { x: Math.min(m.land.width - 30, Math.max(30, back.x)), y: Math.min(m.land.height - 30, Math.max(30, back.y)) };
    const name = barge ? 'Supply barge' : n > 1 ? `Supply truck ${k + 1}` : 'Supply truck';
    const t = addTank(m, { name, clan: 'ink', team: 0, role: 'truck', loadout: { gun: { family: 'machinegun', mk: 1 }, hull: { family: 'medium', mk: 1 }, drive: { family: 'wheels', mk: 1 } }, at, heading });
    t.stats = { ...t.stats, maxHp: def.truckHp, speed: def.speed, radius: TRUCK.radius, armour: TRUCK.armour };
    t.hp = def.truckHp;
    // A barge (chapter 3) floats up its river road: deep water only, so it never climbs the bank.
    if (barge) {
      t.keel = true;
      t.body = 'barge';
    }
    return t;
  });
  const truck = trucks[0]!;
  const noun = barge ? 'barge' : n > 1 ? 'convoy' : 'truck';
  const roadIs = trucks.map(() => 1);
  const arrivedAt = trucks.map(() => false);
  const arrived = () => arrivedAt.every(Boolean);
  const leash = def.leash ?? TRUCK_LEASH;
  const total = road.reduce((s, p, i) => (i ? s + dist(p, road[i - 1]!) : 0), 0);
  const travelled = () => {
    let s = 0;
    const roadI = roadIs[0]!;
    for (let i = 1; i < roadI; i++) s += dist(road[i]!, road[i - 1]!);
    return Math.min(total, s + dist(road[roadI - 1] ?? truck, truck));
  };
  const end = road[road.length - 1]!;
  const blockers = def.clear ? m.structs.filter((st) => st.def.tag === def.clear) : [];
  /** The next felled tree across the road ahead of the lead truck, if one stands within CLEAR_LOOK. */
  const nextBlocker = () => {
    let best: { x: number; y: number; id: string } | null = null;
    let bd = CLEAR_LOOK;
    for (const st of blockers) {
      if (st.state === 0) continue;
      const d = dist(st.def, truck);
      const ahead = (st.def.x - truck.x) * Math.cos(truck.heading) + (st.def.y - truck.y) * Math.sin(truck.heading) > -20;
      if (ahead && d < bd) {
        bd = d;
        best = { x: st.def.x, y: st.def.y, id: st.def.id };
      }
    }
    return best;
  };
  const lost = () => trucks.find((t) => !t.alive);
  return {
    ...BASE,
    kind: 'escort',
    title: `Bring the supply ${noun} in`,
    step: () => undefined,
    status: () => {
      const near = m.player?.alive && trucks.some((t) => t.alive && dist(m.player!, t) <= leash);
      const Noun = barge ? 'Barge' : n > 1 ? 'Convoy' : 'Truck';
      const block = nextBlocker();
      const tail = !near ? ': stay close to keep it moving' : block && dist(block, truck) < 140 ? ': saw through the felled tree!' : '';
      const text = arrived() ? `The ${noun} is in` : `${Noun} ${Math.round((travelled() / total) * 100)}%${tail}`;
      const gone = lost();
      return { text, target: truck.alive ? truck : null, done: arrived(), failed: gone ? (n > 1 ? 'a truck was destroyed' : `the ${noun} was destroyed`) : null };
    },
    playerHint: (t) => {
      if (!truck.alive) return null;
      const goal = barge ? bankBeside(m, t, truck) : { x: truck.x + Math.cos(truck.heading) * 110, y: truck.y + Math.sin(truck.heading) * 110 };
      return { goal, goalRadius: 120, stay: true, urgent: true, shootAt: blockers.length > 0 ? nextBlocker() : undefined };
    },
    foeHint: (t) => {
      const near = nearest(t, trucks.filter((x) => x.alive));
      return near && dist(t, near) < TRUCK_HUNT ? { goal: near, goalRadius: 200, target: near.id } : null;
    },
    drive: (t) => {
      const k = trucks.indexOf(t);
      if (k < 0) return null;
      const p = m.player;
      if (arrivedAt[k] || !p?.alive || !trucks.some((x) => x.alive && dist(p, x) <= leash)) return STOP;
      // A follower keeps its gap; it's in once it's queued behind the one ahead at the road's end.
      const ahead = k > 0 ? trucks[k - 1]! : null;
      if (ahead && dist(ahead, t) < CONVOY_GAP) {
        if (arrivedAt[k - 1] && dist(end, t) < CONVOY_GAP * k + 40) arrivedAt[k] = true;
        return STOP;
      }
      const next = road[roadIs[k]!];
      if (!next) return STOP;
      if (dist(next, t) < 30) {
        roadIs[k]!++;
        if (roadIs[k]! >= road.length) arrivedAt[k] = true;
      }
      return { move: { kind: 'point', angle: angleTo(t, next), mag: 1 }, aim: null, fire: false, swap: false, repair: false };
    },
    marks: () => [{ kind: 'exit', x: end.x, y: end.y, r: 90 }],
    truckHpShare: () => Math.min(...trucks.map((x) => Math.max(0, x.hp) / x.stats.maxHp)),
  };
}

/** Keeping pace with a barge from the bank: abreast of the point ahead of it, on `t`'s side of the river (the first dry ground). */
function bankBeside(m: Match, t: Tank, barge: Tank): { x: number; y: number } {
  const ax = barge.x + Math.cos(barge.heading) * 140;
  const ay = barge.y + Math.sin(barge.heading) * 140;
  // Across the heading, towards t's side.
  let nx = -Math.sin(barge.heading);
  let ny = Math.cos(barge.heading);
  if ((t.x - ax) * nx + (t.y - ay) * ny < 0) [nx, ny] = [-nx, -ny];
  for (let k = 0; k <= 600; k += 20) if (m.navPassable(ax + nx * k, ay + ny * k)) return { x: ax + nx * (k + 30), y: ay + ny * (k + 30) };
  return { x: t.x, y: t.y };
}

/** The tanks with a role, by their brain. */
export function withRole(m: Match, role: string): Tank[] {
  return m.tanks.filter((t) => m.brains.get(t.id)?.role === role);
}

/** Where a routed tank is heading next. */
function ahead(m: Match, t: Tank, by: number) {
  return { x: t.x + Math.cos(t.heading) * by, y: t.y + Math.sin(t.heading) * by };
}

/** Ambush: stop the convoy before it leaves the map; it follows its road and doesn't wait. */
export function ambush(m: Match, def: Extract<ObjectiveDef, { kind: 'ambush' }>): Objective {
  const may = def.mayEscape ?? 0;
  return {
    ...BASE,
    kind: 'ambush',
    title: 'Stop the convoy before it leaves',
    step: () => undefined,
    status: () => {
      const convoy = withRole(m, 'convoy');
      const killed = convoy.filter((t) => !t.alive && !t.escaped).length;
      const escaped = convoy.filter((t) => t.escaped).length;
      const moving = convoy.filter((t) => t.alive);
      const target = m.player ? nearest(m.player, moving) : null;
      return {
        text: `Convoy stopped ${killed}/${convoy.length}${escaped ? `, ${escaped} got away` : ''}`,
        target,
        done: moving.length === 0 && escaped <= may,
        failed: escaped > may ? 'the convoy got away' : null,
      };
    },
    playerHint: (t) => {
      const moving = withRole(m, 'convoy').filter((x) => x.alive);
      const n = nearest(t, moving);
      return n ? { goal: ahead(m, n, dist(t, n) > 400 ? 220 : 0), goalRadius: 60, target: n.id, urgent: true, run: dist(t, n) > 300 } : null;
    },
  };
}

/** The courier's base gate swings open when the courier is this close (px). */
export const GATE_OPEN = 260;

/**
 * Chase: catch the courier (a runner) before it reaches its base. With a
 * `gate`, the base gate opens as the courier comes (a 'setpiece' event) and
 * it drives in through it: the end of its road is inside.
 */
export function chase(m: Match, def: Extract<ObjectiveDef, { kind: 'chase' }>): Objective {
  const base = m.point(def.base);
  const runner = () => withRole(m, 'runner')[0] ?? null;
  const gateI = def.gate === undefined ? -1 : m.structs.findIndex((s) => s.def.id === def.gate);
  return {
    ...BASE,
    kind: 'chase',
    title: 'Catch the courier before it gets home',
    step: () => {
      const r = runner();
      const g = gateI >= 0 ? m.structs[gateI]! : null;
      if (!r?.alive || !g || g.state === 0 || dist(r, g.def) > GATE_OPEN) return;
      breakStructure(m, gateI);
      m.emit({ kind: 'setpiece', what: 'gate', x: g.def.x, y: g.def.y });
    },
    status: () => {
      const r = runner();
      const away = r?.alive ? Math.round(dist(r, base) / 10) : 0;
      return { text: r?.alive ? `Catch ${r.name}: ${away} m from its base` : 'Courier caught', target: r?.alive ? r : null, done: !!r && !r.alive && !r.escaped, failed: r?.escaped ? 'the courier got away' : null };
    },
    playerHint: (t) => {
      const r = runner();
      return r?.alive ? { goal: ahead(m, r, 160), goalRadius: 40, target: r.id, urgent: true, run: true } : null;
    },
    marks: () => [{ kind: 'exit', x: base.x, y: base.y, r: 90 }],
  };
}
