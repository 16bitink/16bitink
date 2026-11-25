import { checkBeach, BEACH_RUN } from '../sim/netGround';
import type { BeachDef, CityDef, Terrain } from '../sim/types';
import { blocksMeet, vertexInBlock, type Block } from './geometry';
import { defCells } from './standing';

/** Layout mistakes on the sand: roads that run along it, parcels on water or under a block. */
const DRY: ReadonlySet<string> = new Set(['.', 'b']);
const SAND_SHARE = 0.5;
const GRID = 2;

function groundProblems(def: CityDef, b: Block, name: string): string[] {
  const out: string[] = [];
  for (let y = b.gy; y <= b.gy + b.h; y++) for (let x = b.gx; x <= b.gx + b.w; x++) if (!DRY.has(def.map[y]?.[x] ?? '~')) out.push(`${name} stands on '${def.map[y]?.[x]}' at ${x},${y}`);
  out.push(...def.lots.filter((l) => blocksMeet(l, b)).map((l) => `${name} overlaps ${l.name}`));
  for (const r of def.roads) if (defCells(r).some((c) => vertexInBlock(b, c))) out.push(`a road runs through ${name}`);
  return out;
}

function oneBeach(def: CityDef, b: BeachDef): string[] {
  const out = groundProblems(def, b, b.name);
  let sand = 0;
  for (let y = b.gy; y <= b.gy + b.h; y++) for (let x = b.gx; x <= b.gx + b.w; x++) if (def.map[y]?.[x] === 'b') sand += 1;
  if (sand < (b.w + 1) * (b.h + 1) * SAND_SHARE) out.push(`${b.name} has too little sand`);
  if (b.decideYear > def.years.length) out.push(`${b.name} is never decided`);
  for (const p of b.plots) {
    if (p.kind === 'home' && (p.w % GRID !== 0 || p.h % GRID !== 0)) out.push(`${p.name} must be whole plots of 2 x 2`);
    if (p.gx < b.gx || p.gy < b.gy || p.gx + p.w > b.gx + b.w || p.gy + p.h > b.gy + b.h) out.push(`${p.name} is not on ${b.name}`);
    if (b.plots.some((q) => q !== p && blocksMeet(p, q))) out.push(`${p.name} overlaps another plot`);
  }
  return out;
}

export function beachProblems(def: CityDef): readonly string[] {
  const terrain = def.map.map((row) => [...row] as Terrain[]);
  const net = { version: 0, width: def.map[0]?.length ?? 0, height: def.map.length, terrain, roads: [], links: [], junctions: [] };
  const roads = def.roads.filter((r) => !r.fixed && checkBeach(net, defCells(r))).map((r) => `a road runs over more than ${BEACH_RUN} cells of beach at ${r.cells[0]}`);
  const beaches = def.beaches ?? [];
  const names = [...def.lots.map((l) => l.name), ...beaches.flatMap((b) => [b.name, ...b.plots.map((p) => p.name)])];
  const twice = beaches.length === 0 ? [] : names.filter((n, i) => names.indexOf(n) !== i).map((n) => `two places are called ${n}`);
  return [...roads, ...beaches.flatMap((b) => oneBeach(def, b)), ...twice];
}
