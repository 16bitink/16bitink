/**
 * `node dev/vehicle.mjs` (dev/vehicle.mjs): the vehicle-model comparison as a table (docs/inkroad-vehicle-model.md):
 * per situation, the physics maxima of today's drawn car and of the new model, the new model's manoeuvre times and
 * its cost per car per frame. `--json` for the numbers.
 */
import { paramsOf } from '../src/sim/vehicle/params';
import { driveStep, startDrive, type DriveState } from '../src/sim/vehicle/tracker';
import { buildScene, parkedAtTime, SITUATIONS, type Scene } from '../test/vehicle/scene';
import { broken, measure, type Drawn, type Maxima } from '../test/vehicle/invariants';
import type { Body } from '../src/sim/vehicleSize';

export interface Row { readonly id: string; readonly old: Maxima; readonly now: Maxima; readonly oldBroken: string[]; readonly nowBroken: string[]; readonly times: Record<string, number>; readonly oldTime: number; readonly newTime: number; readonly us: number; readonly planMs: number; readonly notes: readonly string[]; readonly moves: Scene['moves'] }

/** Today's frames of the car, one run per drawn body (a ghost drawn beside it is its own run); parked frames left out. */
function oldRuns(sc: Scene): { fr: Drawn[]; others: (i: number) => Body[] }[] {
  const byUid = new Map<number, NonNullable<Scene['old'][number]>[]>();
  for (const s of sc.oldAll) if (s.state !== 'parked') (byUid.get(s.uid) ?? byUid.set(s.uid, []).get(s.uid)!).push(s);
  return [...byUid.values()].map((list) => ({ fr: list.map((s) => ({ t: s.t, x: s.x, y: s.y, a: s.a })), others: (i: number): Body[] => parkedAtTime(sc, list[i]!.t) }));
}

/** The worst of several runs' maxima (overlaps and pivots add up). */
function worst(ms: readonly Maxima[]): Maxima {
  const add = new Set(['overlaps', 'pivots', 'frames']);
  return ms.reduce((a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, add.has(k) ? a[k as keyof Maxima] + b[k as keyof Maxima] : Math.max(a[k as keyof Maxima], b[k as keyof Maxima])])) as unknown as Maxima);
}

function newDrawn(sc: Scene): { fr: Drawn[]; others: (i: number) => Body[] } {
  const list = sc.frames.filter((f) => f.phase !== 'wait');
  return { fr: list.map((f) => ({ t: f.t, x: f.x, y: f.y, a: f.a })), others: (i) => parkedAtTime(sc, list[i]!.t) };
}

/** Seconds of each plan item, and the whole. */
function timesOf(sc: Scene): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of sc.frames) if (f.phase !== 'wait' && f.phase !== 'done') out[f.label || 'drive'] = (out[f.label || 'drive'] ?? 0) + 1 / 60;
  return out;
}


export function rowOf(id: string): Row {
  const sit = SITUATIONS.find((s) => s.id === id);
  if (!sit) throw new Error(`no situation ${id}: ${SITUATIONS.map((s) => s.id).join(', ')}`);
  return rowFor(buildScene(sit));
}

/** The comparison numbers of a built scene. */
export function rowFor(sc: Scene): Row {
  const id = sc.situation.id;
  const n = newDrawn(sc);
  const old = worst(oldRuns(sc).map((o) => measure(o.fr, sc.params, o.others))), now = measure(n.fr, sc.params, n.others);
  // Seconds drawn moving or manoeuvring (standing parked left out), today and new.
  const oldTime = sc.old.filter((s) => s !== undefined && s.state !== 'parked').length / 60;
  const newTime = sc.frames.filter((f) => f.phase !== 'wait' && f.phase !== 'done').length / 60;
  return { id, old, now, oldBroken: broken(old), nowBroken: broken(now), times: timesOf(sc), oldTime, newTime, us: sc.usPerFrame, planMs: sc.planMs, notes: sc.notes, moves: sc.moves };
}

const f2 = (x: number): string => (x >= 100 ? x.toFixed(0) : x.toFixed(2));
export const KEYS = ['slip', 'kappa', 'pivots', 'kappaRate', 'accel', 'brake', 'jerk', 'curve', 'overlaps', 'jump'] as const;

/** µs per car per frame with `cars` cars stepped together (each replaying a situation's plan, offset in time), and ms per RS plan. */
export function bench(cars = 700, frames = 600): string {
  const scenes = SITUATIONS.map((s) => buildScene(s));
  let states: { d: DriveState; sc: Scene }[] = Array.from({ length: cars }, (_, i) => {
    const sc = scenes[i % scenes.length]!;
    return { d: startDrive(sc.frames.length ? { x: sc.frames[0]!.rx, y: sc.frames[0]!.ry, th: sc.frames[0]!.a, u: 0, dir: 1, delta: 0, a: 0 } : { x: 0, y: 0, th: 0, u: 0, dir: 1, delta: 0, a: 0 }, sc.plan, sc.params), sc };
  });
  const t0 = performance.now();
  for (let f = 0; f < frames; f++) states = states.map(({ d, sc }) => ({ d: driveStep(d, sc.plan, sc.params, 1 / 60), sc }));
  const us = ((performance.now() - t0) * 1000) / (cars * frames);
  const plan = scenes.reduce((s, sc) => s + sc.planMs, 0) / scenes.length;
  return `${cars} cars x ${frames} frames: ${us.toFixed(2)} µs per car per frame (${((us * cars) / 1000).toFixed(2)} ms a frame); scene planning ${plan.toFixed(1)} ms on average (RS for every move of the run)`;
}

export function main(args: readonly string[]): string {
  if (args.includes('--bench')) return bench();
  const ids = args.filter((a) => !a.startsWith('--'));
  const rows = (ids.length ? ids : SITUATIONS.map((s) => s.id)).map(rowOf);
  if (args.includes('--json')) return JSON.stringify(rows, null, 1);
  const out = [`car: ${JSON.stringify(paramsOf('car'))}`, '', `| situation | ${KEYS.join(' | ')} | moving s (old / new) | manoeuvres (new, s) | µs/frame | plan ms |`, `|---|${KEYS.map(() => '---').join('|')}|---|---|---|---|`];
  for (const r of rows) {
    out.push(`| ${r.id} | ${KEYS.map((k) => `${f2(r.old[k])} / ${f2(r.now[k])}`).join(' | ')} | ${r.oldTime.toFixed(1)} / ${r.newTime.toFixed(1)} | ${r.moves.map((m) => `${m.kind} ${m.word} ${m.seconds.toFixed(1)} s (off ${m.miss.toFixed(1)} px ${((m.skew * 180) / Math.PI).toFixed(0)}°)`).join(', ') || '-'} | ${r.us.toFixed(1)} | ${r.planMs.toFixed(0)} |`);
  }
  out.push('');
  for (const r of rows) out.push(`${r.id}: new breaks [${r.nowBroken.join('; ')}]  notes: ${r.notes.join(' | ')}`);
  return out.join('\n');
}
