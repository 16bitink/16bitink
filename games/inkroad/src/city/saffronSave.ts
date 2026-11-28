import { CELL } from '../sim/constants';
import { cellPt, smoothLine } from '../sim/geom';
import { draftOf, finish } from '../sim/netCore';
import { expandCells } from '../sim/netPlan';
import { addRoad, createNetwork, planRoad } from '../sim/network';
import type { Cell, CityDef, Pt } from '../sim/types';
import { LEGACY_SAFFRON_LAYOUT, LOT_SOURCES, MIGRATED_FRONT_STREETS, saffronGridMigration } from './defs/saffronMap';
import { vertexInBlock } from './geometry';
import { saveProblem, type CitySave } from './save';

/** Read older snapshots against their original schema, then move their contents onto the current survey. */
export function migrateSaffronSave(def: CityDef, data: unknown): unknown {
  if (def.id !== 'saffron' || !def.wideRoadGrid || typeof data !== 'object' || data === null
    || !('lots' in data) || !Array.isArray(data.lots)) return data;
  const compact = data.lots.length === LEGACY_SAFFRON_LAYOUT.lots.length;
  const source = compact ? { ...def, ...LEGACY_SAFFRON_LAYOUT } : def;
  if (saveProblem(source, data)) return data;
  const save = data as CitySave;
  const west = save.net.junctions.find((n) => n.gate === 'west');
  const westNow = def.gates.find((g) => g.id === 'west')?.cell;
  if (!compact && (!west || !westNow || west.cell.gy === westNow[1])) return save;

  const grid = saffronGridMigration(!compact);
  const cell = (p: Cell): Cell => ({ gx: Math.round(grid.x(p.gx)), gy: Math.round(grid.y(p.gy)) });
  const point = (p: Pt): Pt => ({ x: grid.x(p.x / CELL) * CELL, y: grid.y(p.y / CELL) * CELL });
  const fresh = createNetwork(def.map, [], def.gates);
  const parks = save.parks.map((p) => ({ ...p, ...cell(p), access: null }));
  const draft = draftOf({ ...fresh, ...save.net });
  for (const [id, n] of draft.nodes) draft.nodes.set(id, { ...n, cell: cell(n.cell) });
  for (const [id, r] of draft.roads) {
    const vertices = r.cells.map(cell);
    const cells = r.flyover ? vertices : expandCells(vertices);
    const line = r.flyover ? r.line.map(point) : smoothLine(cells.map(cellPt));
    draft.roads.set(id, { ...r, cells, line });
  }
  let network = finish({ ...fresh, version: save.net.version }, draft);
  if (compact) {
    for (const road of MIGRATED_FRONT_STREETS) {
      if ((road.opensYear ?? 1) > save.year) continue;
      const plan = planRoad(network, road.cells.map(([gx, gy]) => ({ gx, gy })), road.type);
      if (plan.ok && !parks.some((park) => plan.cells.some((p) => vertexInBlock(park, p)))) network = addRoad(network, plan);
    }
  }
  const { version, roads, links, junctions, nextId } = network;

  const delta = compact ? def.lots.length - LEGACY_SAFFRON_LAYOUT.lots.length : 0;
  const lotId = (id: number): number => compact && id >= LEGACY_SAFFRON_LAYOUT.lots.length ? id + delta : id;
  const lots = def.lots.map((_, id) => {
    const priorId = compact ? LOT_SOURCES[id]! : id;
    const prior = save.lots[priorId]!;
    if (!prior.at || id !== priorId) return { level: prior.level };
    const [gx, gy] = prior.at;
    if (gx === undefined || gy === undefined) return { level: prior.level };
    const moved = cell({ gx, gy });
    return { level: prior.level, at: [moved.gx, moved.gy, ...prior.at.slice(2)] };
  });
  const beachSites = (def.beaches ?? []).flatMap((b) => [b, ...(b.plots ?? [])]);
  const extraLots = save.extraLots.map((l) => {
    const site = beachSites.find((b) => b.name === l.name);
    const geometry = site ? { gx: site.gx, gy: site.gy, w: site.w, h: site.h } : cell(l);
    return { ...l, ...geometry, id: lotId(l.id), access: null };
  });
  return {
    ...save, lots, extraLots, net: { version, roads, links, junctions, nextId },
    parks,
    lines: save.lines.map((l) => ({ ...l, stops: l.stops.map(cell), path: l.path.map(point) })),
    projects: save.projects.map((p) => ({ ...p, line: p.line.map(point) })),
    complaints: save.complaints.map((c) => ({ ...c, at: point(c.at) })),
    moods: save.moods.map(([id, mood]) => [lotId(id), mood]),
    memory: save.memory.map(([key, value]) => [key.replace(/L\d+/g, (part) => `L${lotId(Number(part.slice(1)))}`), value]),
  } satisfies CitySave;
}
