import { CELL } from '../../sim/constants';
import type { CityView, Command, Id, Pt } from '../../sim/types';
import { roadIdeas } from './atlas';
import type { Move } from './moves';
import { offPlan, sickest } from './tools';

const build = (name: string, kind: string, cmds: readonly Command[], slow = 0): Move => ({ name, kind, family: 'build', cmds, slow });

const heavyOf = (city: CityView, node: Id) =>
  [...city.movements(node)].filter((m) => !m.flyover && m.cars > 2).sort((a, b) => b.cars * b.wait - a.cars * a.wait);

/** Ideas for one sick junction. */
function junctionMoves(city: CityView, s: ReturnType<typeof sickest>[number]): Move[] {
  const node = s.node.id;
  const at = `${s.node.cell.gx},${s.node.cell.gy}`;
  const out: Move[] = [];
  for (const control of ['roundabout', 'signal', 'smart'] as const) {
    if (s.node.control !== control && city.controls.includes(control)) out.push(build(`${control} ${at}`, 'control', [{ t: 'control', node, control }]));
  }
  const heavy = heavyOf(city, node);
  for (const m of heavy.slice(0, 2)) {
    for (const level of [1, -1] as const) out.push(build(`${level > 0 ? 'flyover' : 'underpass'} ${at}`, 'flyover', [{ t: 'flyover', node, fromRoad: m.fromRoad, toRoad: m.toRoad, level }], 2));
  }
  const wide = s.node.arms.filter((id) => city.quote({ t: 'upgrade', road: id, type: 'avenue' }).ok);
  if (wide.length > 1 && city.controls.includes('signal')) {
    const cmds: Command[] = wide.map((road) => ({ t: 'upgrade', road, type: 'avenue' }));
    out.push(build(`avenue cross ${at}`, 'widen', s.node.control === 'signal' || s.node.control === 'smart' ? cmds : [...cmds, { t: 'control', node, control: 'signal' }], 1));
  }
  for (const m of heavy.slice(0, 1)) for (const road of [...new Set([m.fromRoad, m.toRoad])]) out.push(build(`avenue ${road}`, 'avenue', [{ t: 'upgrade', road, type: 'avenue' }], 1));
  if (s.node.control === 'signal' && s.node.split.length === 2) for (const g of [0.35, 0.65]) out.push(build(`green ${g} ${at}`, 'green', [{ t: 'split', node, split: [g, 1 - g] }]));
  return out;
}

const REACH = 6;
/** The cheapest place for a car park near a point. */
export function bestSite(city: CityView, kind: 'lot' | 'multi' | 'under' | 'ride', at: Pt): Command | null {
  let best: { cmd: Command; score: number } | null = null;
  for (let dx = -REACH; dx <= REACH; dx++) {
    for (let dy = -REACH; dy <= REACH; dy++) {
      const cmd = { t: 'carPark', kind, at: { gx: Math.round(at.x / CELL) + dx, gy: Math.round(at.y / CELL) + dy } } as const;
      if (!offPlan(city, kind, cmd.at)) continue;
      const q = city.quote(cmd);
      const score = Math.hypot(dx + 1, dy + 1) * 6 + q.cost;
      if (q.ok && (!best || score < best.score)) best = { cmd, score };
    }
  }
  return best?.cmd ?? null;
}

function parkMoves(city: CityView): Move[] {
  const out: Move[] = [];
  for (const moan of city.complaints.filter((x) => x.bar === 'parking').slice(0, 2)) {
    for (const kind of city.parkKinds.filter((k) => k !== 'ride') as ('lot' | 'multi' | 'under')[]) {
      const site = bestSite(city, kind, moan.at);
      if (site) out.push(build(`park ${kind}`, 'park', [site]));
    }
  }
  return out;
}

export function buildMoves(city: CityView): readonly Move[] {
  const ideas = roadIdeas(city).filter((r) => r.from <= city.year).sort((a, b) => b.from - a.from);
  const roads = ideas.map(({ from, cells }) => build(`road of year ${from}`, 'road', [{ t: 'road', cells, type: 'street' }]));
  return [...sickest(city, 5).slice(0, 3).flatMap((s) => junctionMoves(city, s)), ...parkMoves(city), ...roads];
}
