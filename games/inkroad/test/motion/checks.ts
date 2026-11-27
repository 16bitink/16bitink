/**
 * The motion lab's checks. The rules MotionWatch counts (slip, too tight, turns in place, reverse, curve speed, jumps,
 * oriented-box overlaps, cut-offs; test/motion-helpers.ts) plus two read off the trace here:
 * - drives on the left: a moving car on a two-way road, lined up with it and away from junctions, left of its middle;
 * - drives against traffic: a moving car lined up with a road, away from junctions, facing against the lane it is in
 *   (a one-way road's way, or its side of a two-way road's middle);
 * - crosses a kerb: a drawn car leaves or joins the road's paved band away from every way in (a block's or car park's
 *   access, a gate).
 * And helpers for a scenario's own expectations.
 */
import { lotRect, pointAlong } from '../../src/city/geometry';
import type { City } from '../../src/city/state';
import { halfWidth } from '../../src/sim/roadGeom';
import type { Pt, Road } from '../../src/sim/types';
import type { Expectation, RunResult, Sample } from './lab';

export interface Violation {
  /** Rule and who: 'slip (moving)', 'bodies overlap (manoeuvre)', 'crosses a kerb (moving)'... */
  readonly rule: string;
  /** The actor's id, `bg` or `?`. */
  readonly who: string;
  readonly uid: number;
  /** Scenario seconds and render frame. */
  readonly t: number;
  readonly frame: number;
  readonly value?: number | undefined;
  readonly limit?: number | undefined;
  readonly x: number; readonly y: number; readonly a: number;
  readonly detail: string;
}

/** Px left of a road's middle that counts as the wrong side. */
const LEFT_TOL = 1.5;
/** Lined up with the road: |cos| of heading against the road's direction. */
const ALIGNED = 0.9;
/** Px past a junction's radius where its arms count as road again. */
const JUNCTION_PAD = 8;
/** The paved band: half width plus this; streets and kerb-bay roads add a parking band. */
const EDGE_PAD = 2;
const PARK_BAND = 11;
/** A way in: crossing the edge within this many px of an access point (or a gate) is fine. */
const ACCESS_R = 24;

interface Seg { readonly road: Road; readonly ax: number; readonly ay: number; readonly ux: number; readonly uy: number; readonly len: number }

function segments(c: City): Seg[] {
  const out: Seg[] = [];
  for (const r of c.net.roads) {
    for (let i = 0; i + 1 < r.line.length; i++) {
      const a = r.line[i]!, b = r.line[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len > 1e-6) out.push({ road: r, ax: a.x, ay: a.y, ux: (b.x - a.x) / len, uy: (b.y - a.y) / len, len });
    }
  }
  return out;
}

/** Nearest segment: its road, the signed side (+ right of a to b, y down), and the distance from the middle. */
function nearest(segs: readonly Seg[], x: number, y: number): { seg: Seg; side: number; d: number } | null {
  let best: { seg: Seg; side: number; d: number } | null = null;
  for (const s of segs) {
    const rx = x - s.ax, ry = y - s.ay;
    const along = Math.max(0, Math.min(s.len, rx * s.ux + ry * s.uy));
    const qx = s.ax + s.ux * along, qy = s.ay + s.uy * along;
    const d = Math.hypot(x - qx, y - qy);
    if (!best || d < best.d) best = { seg: s, side: s.ux * (y - qy) - s.uy * (x - qx), d };
  }
  return best;
}

function waysIn(c: City): Pt[] {
  const out: Pt[] = [];
  const at = (a: { road: number; s: number } | null): void => {
    const r = a ? c.net.roads.find((x) => x.id === a.road) : undefined;
    if (a && r) out.push(pointAlong(r.line, a.s));
  };
  for (const l of c.lots) at(l.access);
  for (const p of c.parks) at(p.access);
  for (const j of c.net.junctions) if (j.gate !== undefined) out.push({ x: j.x, y: j.y });
  // Every space of a frontage (a driveway, a forecourt space, the sand by the road) is its own way in, where its column meets the road.
  const segs = segments(c);
  for (const spot of c.day.spots.values()) for (const p of spot.layout?.poses ?? []) {
    const n = nearest(segs, p.x, p.y);
    if (!n || n.d > FRONTAGE) continue;
    const s = n.seg, along = Math.max(0, Math.min(s.len, (p.x - s.ax) * s.ux + (p.y - s.ay) * s.uy));
    out.push({ x: s.ax + s.ux * along, y: s.ay + s.uy * along });
  }
  return out;
}

/** Spaces this near a road's line front onto it. */
const FRONTAGE = 45;

/** Px off a two-way road's middle a car must be to count as in one direction's lanes. */
const SIDE_MIN = 2;

/**
 * Does a car (heading a) on this stretch face against the lane it is in? A one-way road runs along its line; on a
 * two-way road the lanes right of the line (screen axes) run along it, those left of it against it.
 */
function againstTraffic(n: { readonly seg: Seg; readonly side: number }, a: number): boolean {
  const cos = Math.cos(a) * n.seg.ux + Math.sin(a) * n.seg.uy;
  if (Math.abs(cos) < ALIGNED) return false;
  if (n.seg.road.oneWay) return cos < 0;
  if (Math.abs(n.side) < SIDE_MIN) return false;
  return Math.sign(n.side) !== Math.sign(cos);
}

/** The generic trace checks every scenario gets on top of MotionWatch's rules. */
export function extraChecks(c: City, trace: readonly (readonly Sample[])[]): Violation[] {
  const segs = segments(c);
  const junctions = c.net.junctions.map((j) => ({ x: j.x, y: j.y, r: j.radius + JUNCTION_PAD }));
  const doors = waysIn(c);
  const inJunction = (x: number, y: number): boolean => junctions.some((j) => Math.hypot(j.x - x, j.y - y) < j.r);
  const out: Violation[] = [];
  const left = new Set<number>();
  const against = new Set<number>();
  const onRoad = new Map<number, boolean>();
  for (const row of trace) {
    if (!row) continue;
    for (const s of row) {
      if (s.state === 'parked') continue;
      const n = nearest(segs, s.x, s.y);
      if (!n) continue;
      const r = n.seg.road;
      const band = halfWidth(r) + EDGE_PAD + (r.kerb || r.type === 'street' ? PARK_BAND : 0);
      const paved = n.d <= band || inJunction(s.x, s.y);
      const was = onRoad.get(s.uid);
      onRoad.set(s.uid, paved);
      if (was !== undefined && was !== paved && !doors.some((p) => Math.hypot(p.x - s.x, p.y - s.y) < ACCESS_R)) {
        out.push({ rule: `crosses a kerb (${s.state === 'manoeuvre' ? 'manoeuvre' : 'moving'})`, who: s.who, uid: s.uid, t: s.t, frame: s.frame, value: n.d, limit: band, x: s.x, y: s.y, a: s.a, detail: `${paved ? 'onto' : 'off'} road ${r.id} ${n.d.toFixed(1)} px from its middle, no way in near` });
      }
      if (s.state === 'moving' && againstTraffic(n, s.a) && !inJunction(s.x, s.y) && n.d <= halfWidth(r) && r.level === 0) {
        if (!against.has(s.uid)) out.push({ rule: 'drives against traffic (moving)', who: s.who, uid: s.uid, t: s.t, frame: s.frame, value: n.side, limit: 0, x: s.x, y: s.y, a: s.a, detail: `heading against road ${r.id}'s lane it is in` });
        against.add(s.uid);
      } else against.delete(s.uid);
      if (s.state !== 'moving' || r.oneWay || r.flyover || r.level !== 0 || inJunction(s.x, s.y) || n.d > halfWidth(r)) { left.delete(s.uid); continue; }
      const cos = Math.cos(s.a) * n.seg.ux + Math.sin(s.a) * n.seg.uy;
      if (Math.abs(cos) < ALIGNED) continue;
      const right = n.side * Math.sign(cos);
      if (right < -LEFT_TOL) {
        if (!left.has(s.uid)) out.push({ rule: 'drives on the left (moving)', who: s.who, uid: s.uid, t: s.t, frame: s.frame, value: right, limit: -LEFT_TOL, x: s.x, y: s.y, a: s.a, detail: `${(-right).toFixed(1)} px left of road ${r.id}'s middle` });
        left.add(s.uid);
      } else left.delete(s.uid);
    }
  }
  return out;
}

// ---------------------------------------------------------------- a scenario's own expectations

export const samplesOf = (r: RunResult, who: string): Sample[] => r.trace.flatMap((row) => (row ?? []).filter((s) => s.who === who));

/** The actor's park events: where it turned in (key, slot) and when; when it set out. */
export function parkIns(r: RunResult, who: string): { t: number; key: string; slot: number }[] {
  return r.events.flatMap((l) => (l.who === who && l.e.t === 'park' && l.e.dir === 'in' ? [{ t: l.t, key: l.e.key, slot: l.e.slot }] : []));
}
export function parkOuts(r: RunResult, who: string): { t: number; key: string }[] {
  return r.events.flatMap((l) => (l.who === who && l.e.t === 'park' && l.e.dir === 'out' ? [{ t: l.t, key: l.e.key }] : []));
}

export const expect = (name: string, ok: boolean, detail: string): Expectation => ({ name, ok, detail });

/** It turned into a place whose key starts with `prefix` (kerb:, lot:, park:, street:, double:). */
export function parksIn(r: RunResult, who: string, prefix: string): Expectation {
  const ins = parkIns(r, who);
  const last = ins[ins.length - 1];
  return expect(`${who} parks in ${prefix}`, !!last && last.key.startsWith(prefix), last ? `${last.key} slot ${last.slot} at ${last.t.toFixed(1)} s` : 'never turned in');
}

/** It set out from its place (a 'park out', or straight back into the lane: a 'parkGo') and left the map by `by` s. */
export function leavesBy(r: RunResult, who: string, by: number): Expectation {
  const out = r.events.find((l) => l.who === who && ((l.e.t === 'park' && l.e.dir === 'out') || l.e.t === 'parkGo'));
  const gone = r.gone.get(who);
  return expect(`${who} leaves and is gone by ${by} s`, !!out && gone !== undefined && gone <= by, `out ${out ? out.t.toFixed(1) : '-'} s, gone ${gone?.toFixed(1) ?? '-'} s`);
}

/** It drove from gate to gate (entered and left) by `by` s. */
export function passesBy(r: RunResult, who: string, by: number): Expectation {
  const gone = r.gone.get(who);
  return expect(`${who} is through by ${by} s`, gone !== undefined && gone <= by, `entered ${r.entered.get(who)?.toFixed(1) ?? '-'} s, gone ${gone?.toFixed(1) ?? '-'} s`);
}

/** Hardest braking of `who`'s moving frames (px/s², 0.1 s windows so a frame's rounding is not braking). */
export function hardestBrake(r: RunResult, who: string): number {
  const byUid = new Map<number, Sample[]>();
  for (const s of samplesOf(r, who)) if (s.state === 'moving') (byUid.get(s.uid) ?? byUid.set(s.uid, []).get(s.uid)!).push(s);
  let worst = 0;
  for (const list of byUid.values()) {
    for (let i = 6; i < list.length; i++) {
      const a = list[i - 6]!, b = list[i]!;
      if (b.frame - a.frame !== 6) continue;
      worst = Math.max(worst, (a.v - b.v) / (b.t - a.t || 0.1));
    }
  }
  return worst;
}

export function brakesUnder(r: RunResult, who: string, limit: number): Expectation {
  const b = hardestBrake(r, who);
  return expect(`${who} never brakes harder than ${limit} px/s²`, b <= limit, `${b.toFixed(0)} px/s²`);
}

/** No violation of any rule by this actor. */
export function clean(r: RunResult, who: string): Expectation {
  const mine = r.violations.filter((v) => v.who === who);
  const rules = [...new Set(mine.map((v) => v.rule))];
  return expect(`${who} breaks no motion rule`, mine.length === 0, mine.length === 0 ? 'clean' : `${mine.length}: ${rules.join(', ')}`);
}

/** When `who` was first drawn manoeuvring (its turn-in or pull-out began), or undefined. */
export const firstManoeuvre = (r: RunResult, who: string): number | undefined => samplesOf(r, who).find((s) => s.state === 'manoeuvre')?.t;

/** At some frame (parked or manoeuvring) inside a block's or car park's rectangle. */
export function wasInside(r: RunResult, who: string, rect: { x: number; y: number; w: number; h: number }): Expectation {
  const hit = samplesOf(r, who).find((s) => s.x >= rect.x && s.x <= rect.x + rect.w && s.y >= rect.y && s.y <= rect.y + rect.h);
  return expect(`${who} stands inside its place`, !!hit, hit ? `${hit.state} at ${hit.x.toFixed(0)},${hit.y.toFixed(0)} (${hit.t.toFixed(1)} s)` : 'never inside');
}

/** Parked at some frame off the paved road (a forecourt, a car park, the sand), not left in a lane or at the kerb. */
export function standsOffRoad(r: RunResult, who: string): Expectation {
  const c = (r.city as unknown as { c: City }).c;
  const segs = segments(c);
  const hit = samplesOf(r, who).find((s) => { if (s.state !== 'parked') return false; const n = nearest(segs, s.x, s.y); return !n || n.d > halfWidth(n.seg.road) + s.wid / 2; });
  return expect(`${who} parks off the road`, !!hit, hit ? `at ${hit.x.toFixed(0)},${hit.y.toFixed(0)} (${hit.t.toFixed(1)} s)` : 'never parked off the road');
}

/** The point where a block's driveway meets its road. */
export function lotDoor(r: RunResult, name: string): Pt {
  const c = (r.city as unknown as { c: City }).c;
  const l = c.lots.find((x) => x.name === name);
  const road = l?.access ? c.net.roads.find((x) => x.id === l.access!.road) : undefined;
  return l?.access && road ? pointAlong(road.line, l.access.s) : { x: 0, y: 0 };
}

/**
 * Round a junction the right-hand way: anticlockwise on the plan (y down, so the cross product of offset and travel
 * is negative). Counts frames within 1.5 radii of the middle; wants 90% of them anticlockwise.
 */
export function anticlockwise(r: RunResult, who: string, j: { x: number; y: number; radius: number }): Expectation {
  let acw = 0, cw = 0;
  const list = samplesOf(r, who).filter((s) => s.state === 'moving');
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1]!, b = list[i]!;
    if (Math.hypot(b.x - j.x, b.y - j.y) > j.radius * 1.5) continue;
    const cross = (b.x - j.x) * (b.y - a.y) - (b.y - j.y) * (b.x - a.x);
    if (cross < -1e-3) acw++; else if (cross > 1e-3) cw++;
  }
  const share = acw + cw > 0 ? acw / (acw + cw) : 0;
  return expect(`${who} goes round anticlockwise`, share >= 0.9, `${acw} frames anticlockwise, ${cw} clockwise`);
}

/** When `who` (a moving car) came closest to a point, and how close. */
export function closest(r: RunResult, who: string, p: Pt): { t: number; d: number } {
  let best = { t: -1, d: Infinity };
  for (const s of samplesOf(r, who)) { const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < best.d) best = { t: s.t, d }; }
  return best;
}

export { lotRect };

/** A turn of this much (rad) is a swing round, and takes a real car at least ROUND_S (an R_MIN arc at manoeuvre pace, played). */
const ROUND = (2 * Math.PI) / 3;
const ROUND_S = (ROUND * 18.5) / (17.5 * 1.25);

/** The quickest the car swung round (ROUND rad of heading, moving or manoeuvring) in seconds, and where; Infinity if it never did. */
export function quickestRound(r: RunResult, who: string): { s: number; t: number; x: number; y: number } {
  const list = samplesOf(r, who).filter((s) => s.state !== 'parked');
  let best = { s: Infinity, t: 0, x: 0, y: 0 };
  const cum: number[] = [0];
  for (let i = 1; i < list.length; i++) {
    const join = list[i]!.frame - list[i - 1]!.frame <= 2;
    cum.push(cum[i - 1]! + (join ? Math.atan2(Math.sin(list[i]!.a - list[i - 1]!.a), Math.cos(list[i]!.a - list[i - 1]!.a)) : 0));
  }
  for (let i = 0, j = 0; i < list.length; i++) {
    while (j < i && Math.abs(cum[i]! - cum[j]!) >= ROUND) {
      const s = list[i]!.t - list[j]!.t;
      if (s < best.s) best = { s, t: list[j]!.t, x: list[j]!.x, y: list[j]!.y };
      j++;
    }
  }
  return best;
}

/** No swing round faster than a real car can drive it (120 degrees on an R_MIN arc at the manoeuvre pace). */
export function roundsAtPace(r: RunResult, who: string): Expectation {
  const q = quickestRound(r, who);
  return expect(`${who} swings round no faster than a real car (120 deg in ${ROUND_S.toFixed(1)} s or more)`, q.s >= ROUND_S * 0.9,
    q.s === Infinity ? 'never swung round' : `quickest ${q.s.toFixed(2)} s at ${q.t.toFixed(1)} s (${q.x.toFixed(0)},${q.y.toFixed(0)})`);
}
