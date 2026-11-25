import type { YearDef } from '../../sim/types';
import { atJunction, roadIds } from '../parts';
import { byPain, fullLots, mid, nearestLot } from '../places';
import type { GuideView, Memo, Step, Target } from '../types';

/** A year with no lesson of its own: its coach lines, as steps. */
type Coach = NonNullable<YearDef['coach']>[number];

function targetOf(c: Coach): (v: GuideView) => Target | null {
  return (v) => {
    if (c.at === 'worstJunction') { const s = byPain(v.city)[0]; return s ? atJunction(v.city, s.j.id, false) : null; }
    if (c.at === 'market') { const l = fullLots(v.city)[0] ?? nearestLot(v.city, { x: 0, y: 0 }, ['market']); return l ? { t: 'spot', at: mid(l), r: l.w * 24 } : null; }
    return c.tool && v.tool !== c.tool ? { t: 'tool', tool: c.tool } : null;
  };
}

const controls = (v: GuideView): number => v.city.junctions.reduce((n, j) => n + ((j.control.length * 7 + j.control.charCodeAt(0)) * (j.id + 1)) % 9973, 0);

function metBy(until: string): (v: GuideView, m: Memo) => boolean {
  const [id, arg] = until.split(':');
  switch (id) {
    case 'toolPicked': return (v) => (arg ? v.tool === arg : v.tool !== null);
    case 'built': case 'roadBuilt': return (v, m) => v.city.version > (m.version ?? Infinity) || roadIds(v.city) > (m.lastRoad ?? Infinity);
    case 'selected': case 'junctionTapped': return (v) => v.selection?.kind === (arg ?? 'junction');
    case 'controlChanged': return (v, m) => controls(v) !== m.controls;
    default: return () => false;
  }
}

export function coachSteps(coach: readonly Coach[], stage = 0): readonly Step[] {
  return coach.map((c, i) => ({
    id: `coach-${i}`, stage, say: c.text, ok: 'Got it', target: targetOf(c), until: metBy(c.until),
    enter: (v: GuideView, m: Memo) => { m.version = v.city.version; m.lastRoad = roadIds(v.city); m.controls = controls(v); },
  }));
}
