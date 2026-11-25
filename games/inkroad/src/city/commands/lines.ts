import { CELL } from '../../sim/constants';
import { refuse, type Refusal } from '../../sim/netGround';
import type { Cell, TransitLine, TransitMode, ToolId } from '../../sim/types';
import { cellPt, distPt, polyLength } from '../geometry';
import type { City } from '../state';
import { has } from '../state';
import { MAX_STOPS, MAX_VEHICLES, TRANSIT } from '../tune';
import { linePath, runsOnRoad, syncServices } from '../transit';
import { middle, needTool, no, noAt, priced, type Handler } from './shared';

const TOOL: Readonly<Record<TransitMode, ToolId>> = { bus: 'bus', express: 'bus', tram: 'tram', metro: 'metro', boat: 'boat' };
const NAMES: Readonly<Record<TransitMode, readonly string[]>> = {
  bus: ['Date Bus', 'Camel Bus', 'Mint Bus', 'Pepper Bus', 'Dune Bus', 'Salt Bus', 'Fig Bus', 'Lamp Bus'],
  express: ['Gazelle Express', 'Oryx Express', 'Swift Express'],
  tram: ['Ding Line', 'Dong Line', 'Copper Line', 'Wool Line'],
  metro: ['Green Line', 'Sand Line', 'Indigo Line', 'Rose Line'],
  boat: ['Heron Boat', 'Crab Boat', 'Dugong Boat'],
};
const COLOURS = 8;
const START_VEHICLES: Readonly<Record<TransitMode, number>> = { bus: 2, express: 2, tram: 2, metro: 3, boat: 2 };
const GAP: Readonly<Record<TransitMode, number>> = { bus: 2, express: 4, tram: 2, metro: 3, boat: 3 };
const MAX_LINES = 12;

const nearWater = (c: City, s: Cell): boolean =>
  [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => c.net.terrain[s.gy + dy]?.[s.gx + dx] === '~'));

function stopsProblem(c: City, mode: TransitMode, stops: readonly Cell[]): Refusal | null {
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]!;
    const t = c.net.terrain[s.gy]?.[s.gx];
    if (t === undefined) return refuse('That is off the map', s);
    if (mode === 'boat' && !nearWater(c, s)) return refuse('A boat needs water at every stop', s);
    if (mode === 'metro' && (t === '~' || t === '#')) return refuse(t === '~' ? 'Water: a station needs dry ground' : 'Rock and old walls: no station fits here', s);
    if (mode === 'metro' && t === 'b') return refuse('The beach is protected', s);
    if (i > 0 && distPt(cellPt(stops[i - 1]!), cellPt(s)) < GAP[mode] * CELL) return refuse('These stops are too close', s);
  }
  return null;
}

export const line: Handler<'line'> = {
  quote(c, cmd) {
    const t = TRANSIT[cmd.mode];
    if (!t) return no('Unknown line');
    const closed = needTool(c, TOOL[cmd.mode]);
    if (closed) return no(closed);
    if (c.lines.length >= MAX_LINES) return no('Juma has no more drivers');
    if (cmd.stops.length < t.minStops) return no('Tap two stops or more');
    if (cmd.stops.length > MAX_STOPS) return no(`${MAX_STOPS} stops is plenty`);
    const bad = stopsProblem(c, cmd.mode, cmd.stops);
    if (bad) return noAt(bad);
    const path = linePath(c, cmd.mode, cmd.stops);
    if (!path) return no('Stops must be on roads that join up');
    const full = (polyLength(path) / CELL) * t.perCell + cmd.stops.length * t.perStop + START_VEHICLES[cmd.mode] * t.vehicle;
    const works = has(c, 'precast') ? Math.ceil(t.works / 2) : t.works;
    return priced(c, full * (1 - t.match), { works, line: path, ...(t.match > 0 ? { warn: `The Council pays ${Math.round(full * t.match)} of ${Math.round(full)}` } : {}) });
  },
  run(c, cmd, q) {
    const path = q.line ?? linePath(c, cmd.mode, cmd.stops) ?? [];
    const same = c.lines.filter((l) => l.mode === cmd.mode).length;
    const names = NAMES[cmd.mode];
    const made: TransitLine = {
      id: c.nextId, mode: cmd.mode, name: names[same % names.length]!, colour: c.lines.length % COLOURS, stops: cmd.stops, path,
      vehicles: START_VEHICLES[cmd.mode], riders: 0, crowding: 0, works: q.works,
    };
    c.nextId += 1;
    c.lines = [...c.lines, made];
    if (runsOnRoad(made)) syncServices(c);
    return middle(path);
  },
};

export const lineVehicles: Handler<'lineVehicles'> = {
  quote(c, cmd) {
    const l = c.lines.find((x) => x.id === cmd.line);
    if (!l) return no('No such line');
    if (l.mini) return no('It does not work for us');
    if (!Number.isInteger(cmd.vehicles) || cmd.vehicles < 1 || cmd.vehicles > MAX_VEHICLES) return no(`Between 1 and ${MAX_VEHICLES}`);
    if (cmd.vehicles === l.vehicles) return no('It has that many already');
    return priced(c, Math.max(0, cmd.vehicles - l.vehicles) * TRANSIT[l.mode].vehicle);
  },
  run(c, cmd) {
    c.lines = c.lines.map((l) => (l.id === cmd.line ? { ...l, vehicles: cmd.vehicles } : l));
    syncServices(c);
    return middle(c.lines.find((l) => l.id === cmd.line)!.path);
  },
};

export const removeLine: Handler<'removeLine'> = {
  quote: (c, cmd) => (c.lines.some((l) => l.id === cmd.line && !l.mini) ? priced(c, 0) : no('No such line of ours')),
  run(c, cmd) {
    const l = c.lines.find((x) => x.id === cmd.line)!;
    c.lines = c.lines.filter((x) => x.id !== cmd.line);
    syncServices(c);
    return middle(l.path);
  },
};
