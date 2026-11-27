import { CONTROL_COST } from '../../sim/constants';
import { planFlyover, roundaboutFits, setControl, setSplit } from '../../sim/network';
import { refuse } from '../../sim/netGround';
import type { Control } from '../../sim/types';
import { commitNetwork } from '../network';
import type { City } from '../state';
import { has, junctionById, openControls, openTools } from '../state';
import { FLYOVER, SMART_SHARE } from '../tune';
import { homesBeside, landFor, middle, needTool, nightRate, no, noAt, precast, priced, worksEnd, type Handler } from './shared';

const MIN_GREEN = 0.1;
const names: Readonly<Record<Control, string>> = { yield: 'a plain crossing', roundabout: 'a roundabout', signal: 'signals', smart: 'smart signals' };

const arms = (c: City, node: number): number => {
  const j = junctionById(c, node);
  return j ? j.arms.filter((id) => !c.net.roads.find((r) => r.id === id)?.flyover).length : 0;
};

export const control: Handler<'control'> = {
  quote(c, cmd) {
    const closed = needTool(c, 'junction');
    if (closed) return no(closed);
    const j = junctionById(c, cmd.node);
    if (!j || arms(c, cmd.node) < 3) return no('Only where three roads or more meet');
    if (j.control === cmd.control) return no(`It is ${names[cmd.control]} already`);
    if (!openControls(c).includes(cmd.control)) return no(cmd.control === 'smart' ? 'Needs the smart signals technology' : 'Not in this year\'s toolbox yet');
    if (cmd.control === 'roundabout' && c.net.terrain[j.cell.gy]?.[j.cell.gx] === 'h') return noAt(refuse('No room for a circle between old walls', j.cell));
    if (cmd.control === 'roundabout') {
      const fits = roundaboutFits(c.net, cmd.node);
      if (!fits.ok) return noAt(refuse(fits.why ?? 'No room for a circle', j.cell));
    }
    const upgrade = j.control === 'signal' && cmd.control === 'smart' ? CONTROL_COST.signal / 2 : 0;
    const list = CONTROL_COST[cmd.control] * (cmd.control === 'smart' ? SMART_SHARE : 1);
    return priced(c, Math.max(0, list - upgrade));
  },
  run(c, cmd) {
    const j = junctionById(c, cmd.node)!;
    commitNetwork(c, setControl(c.net, cmd.node, cmd.control));
    return { x: j.x, y: j.y };
  },
};

export const split: Handler<'split'> = {
  quote(c, cmd) {
    const j = junctionById(c, cmd.node);
    if (!j || j.control !== 'signal') return no('Only plain signals have a green slider');
    if (cmd.split.length !== j.split.length || cmd.split.some((s) => !(s >= MIN_GREEN && s <= 1))) return no('Everybody needs a little green');
    return priced(c, 0);
  },
  run(c, cmd) {
    const j = junctionById(c, cmd.node)!;
    commitNetwork(c, setSplit(c.net, cmd.node, cmd.split));
    return { x: j.x, y: j.y };
  },
};

export const flyover: Handler<'flyover'> = {
  quote(c, cmd) {
    const tool = cmd.level === 1 ? 'flyover' : 'underpass';
    if (!openTools(c).includes(tool)) return no('Not in this year\'s toolbox yet');
    if (c.projects.some((p) => p.node === cmd.node && p.fromRoad === cmd.fromRoad && p.toRoad === cmd.toRoad)) return no('Already being built');
    const plan = planFlyover(c.net, cmd.node, cmd.fromRoad, cmd.toRoad, cmd.level);
    if (plan.ok && cmd.level === 1 && plan.cells.some((x) => c.net.terrain[x.gy]?.[x.gx] === 'h')) return { ...no('No decks over old roofs'), line: plan.line };
    if (!plan.ok) return { ...no(plan.why ?? 'No room for the ramps'), line: plan.line };
    const building = (FLYOVER.base + plan.length * FLYOVER.perCell) * (cmd.level === -1 ? FLYOVER.under : 1) * (has(c, 'precast') ? 0.85 : 1) * nightRate(c);
    const noisy = cmd.level === 1 ? homesBeside(c, plan.line, 2) : 0;
    const warn = noisy > 0 ? `A deck beside ${noisy} block${noisy > 1 ? 's' : ''} of homes: noise` : undefined;
    const works = has(c, 'precast') ? precast(FLYOVER.works) : FLYOVER.works;
    return priced(c, building, { land: landFor(c, plan.cells) * 0.5, works, line: plan.line, level: cmd.level, ...(warn ? { warn } : {}) });
  },
  run(c, cmd, q) {
    const line = q.line ?? [];
    c.projects = [...c.projects, { id: c.nextId, node: cmd.node, fromRoad: cmd.fromRoad, toRoad: cmd.toRoad, level: cmd.level, line, left: q.works, ends: worksEnd(c, q.works) }];
    c.nextId += 1;
    return middle(line);
  },
};
