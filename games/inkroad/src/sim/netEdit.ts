/** Edits on a draft: splitting a road at a vertex, dropping roads, healing what is left. */
import { makeRoad, type Draft } from './netCore';
import { cellPt, sameCell, smoothLine } from './geom';
import { forwardLink, backwardLink } from './roadGeom';
import type { Cell, Id, Road } from './types';

export function nodeAtCell(d: Draft, cell: Cell): Id | undefined {
  for (const n of d.nodes.values()) if (sameCell(n.cell, cell)) return n.id;
  return undefined;
}

export const armsOf = (d: Draft, node: Id): Road[] => [...d.roads.values()].filter((r) => r.a === node || r.b === node);

function newNode(d: Draft, cell: Cell, ramp = false): Id {
  const id = d.nextId++;
  d.nodes.set(id, { id, cell, control: 'yield', split: [], works: 0, ...(ramp ? { ramp: true } : {}) });
  return id;
}

/** The node at this cell, made by cutting the road there if needed. */
export function splitAt(d: Draft, cell: Cell, ramp = false): Id {
  const there = nodeAtCell(d, cell);
  if (there !== undefined) return there;
  const node = newNode(d, cell, ramp);
  for (const r of [...d.roads.values()]) {
    if (r.flyover) continue;
    const i = r.cells.findIndex((c) => sameCell(c, cell));
    if (i > 0 && i < r.cells.length - 1) cutRoad(d, r, i, node);
  }
  return node;
}

/** First piece keeps the id; the second is new. Flyovers keep pointing at the piece next to their junction. */
function cutRoad(d: Draft, r: Road, i: number, node: Id): void {
  const id = d.nextId++;
  const piece = (pid: Id, a: Id, b: Id, cells: readonly Cell[]): Road => ({
    ...r, id: pid, a, b, cells, line: smoothLine(cells.map(cellPt)), links: r.oneWay ? [forwardLink(pid)] : [forwardLink(pid), backwardLink(pid)],
  });
  d.roads.set(r.id, piece(r.id, r.a, node, r.cells.slice(0, i + 1)));
  d.roads.set(id, piece(id, node, r.b, r.cells.slice(i)));
  for (const f of [...d.roads.values()]) {
    const v = f.flyover;
    if (!v || (v.fromRoad !== r.id && v.toRoad !== r.id)) continue;
    const near = v.node === r.b ? id : r.id;
    d.roads.set(f.id, { ...f, flyover: { ...v, fromRoad: v.fromRoad === r.id ? near : v.fromRoad, toRoad: v.toRoad === r.id ? near : v.toRoad } });
  }
}

/** Remove a road and any flyover that can't stand without it. Returns the nodes to heal. */
export function dropRoad(d: Draft, id: Id): Id[] {
  const touched = new Set<Id>();
  const drop = (r: Road): void => {
    d.roads.delete(r.id);
    touched.add(r.a);
    touched.add(r.b);
  };
  const road = d.roads.get(id);
  if (road) drop(road);
  for (let again = true; again;) {
    again = false;
    for (const f of [...d.roads.values()]) {
      if (!f.flyover) continue;
      const ok = d.roads.has(f.flyover.fromRoad) && d.roads.has(f.flyover.toRoad)
        && [f.a, f.b].every((n) => armsOf(d, n).filter((r) => !r.flyover).length >= 2);
      if (!ok) { drop(f); again = true; }
    }
  }
  return [...touched];
}

const sameKind = (p: Road, q: Road): boolean =>
  p.type === q.type && p.oneWay === q.oneWay && p.busLane === q.busLane && p.kerb === q.kerb && p.toll === q.toll && p.truckBan === q.truckBan
  && p.nightWorks === q.nightWorks && !p.flyover && !q.flyover && p.fixed === q.fixed;

/** A node with two arms and nothing else going on turns back into a bend of one road. */
export function healNode(d: Draft, node: Id): void {
  const arms = armsOf(d, node);
  if (arms.length === 0) { d.nodes.delete(node); return; }
  let n = d.nodes.get(node);
  if (n?.ramp && !arms.some((r) => r.flyover)) {
    n = { ...n, ramp: false };
    d.nodes.set(node, n);
  }
  if (arms.length !== 2 || !n || n.gate !== undefined) return;
  if (n.control !== 'yield') d.nodes.set(node, { ...n, control: 'yield' });
  const [p, q] = arms as [Road, Road];
  if (p.id === q.id || !sameKind(p, q) || (p.a === q.a && p.b === q.b) || (p.a === q.b && p.b === q.a)) return;
  joinRoads(d, node, p, q);
}

function joinRoads(d: Draft, node: Id, r1: Road, r2: Road): void {
  const [p, q] = r1.id < r2.id ? [r1, r2] : [r2, r1];
  const pIn = p.b === node; // p runs towards the node
  const head = pIn ? p.cells : [...p.cells].reverse();
  const tail = q.a === node ? q.cells : [...q.cells].reverse();
  const along = [...head, ...tail.slice(1)];
  const far = q.a === node ? q.b : q.a;
  if (p.oneWay) {
    // Both must flow the same way through the node.
    const flowsIn = (r: Road): boolean => (r.dir === -1 ? r.a === node : r.b === node);
    if (flowsIn(p) === flowsIn(q)) return;
  }
  const cells = pIn ? along : [...along].reverse();
  const turn = turnsBack(cells, node, d);
  if (turn) return;
  const base = makeRoad(p.id, pIn ? p.a : far, pIn ? far : p.b, { cells, type: p.type, oneWay: p.oneWay, fixed: p.fixed, bridge: p.bridge || q.bridge });
  d.roads.set(p.id, { ...p, ...base, busLane: p.busLane, kerb: p.kerb, toll: p.toll, truckBan: p.truckBan, works: Math.max(p.works, q.works), ...joinedEnd(p, q), nightWorks: p.nightWorks });
  d.roads.delete(q.id);
  d.nodes.delete(node);
  for (const f of [...d.roads.values()]) {
    const v = f.flyover;
    if (v && (v.fromRoad === q.id || v.toRoad === q.id)) {
      d.roads.set(f.id, { ...f, flyover: { ...v, fromRoad: v.fromRoad === q.id ? p.id : v.fromRoad, toRoad: v.toRoad === q.id ? p.id : v.toRoad } });
    }
  }
}

/** Never make a road with a hairpin in it. */
function turnsBack(cells: readonly Cell[], node: Id, d: Draft): boolean {
  const at = d.nodes.get(node)!.cell;
  const i = cells.findIndex((c) => sameCell(c, at));
  const a = cells[i - 1], b = cells[i], c = cells[i + 1];
  if (!a || !b || !c) return true;
  return (b.gx - a.gx) * (c.gx - b.gx) + (b.gy - a.gy) * (c.gy - b.gy) < 0;
}

/** Two roads joined into one keep the later end of their works. */
function joinedEnd(p: Road, q: Road): Pick<Road, 'worksEnd'> {
  const ends = [p, q].flatMap((r) => (r.works > 0 && r.worksEnd !== undefined ? [r.worksEnd] : []));
  return ends.length > 0 ? { worksEnd: Math.max(...ends) } : {};
}
