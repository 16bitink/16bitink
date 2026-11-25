import type { CarsView, Link, Road } from '../../sim/types';
import { lineLength, resample } from '../geom';

/**
 * Where cars stand, per lane direction: each car is matched to the link it is
 * on, stopped cars close together make a queue, and every stretch of a link
 * gets a heat. Pure apart from the map it keeps.
 */
export const PIECE = 13; // plan px of road per stretch
const SAMPLE = 10;
const BUCKET = 40;
const REACH = 22; // a car this far from every link is on none
const SAME_WAY = 0.55; // cosine
const STOPPED = 5; // plan px/s
const SLOW_SHARE = 0.34; // of the free speed
const GAP = 46; // plan px between two cars of one queue
const ROOM = 11; // half a car and its breath
const ON_DECK = 6;
const MIN_QUEUE = 2;
const SLOW_HEAT = 0.3;
const BASE_HEAT = 0.42;
const HEAT_PER_CAR = 0.11;

export interface Lane { readonly link: Link; readonly len: number; readonly pieces: number }
interface Sample { readonly lane: number; readonly x: number; readonly y: number; readonly cos: number; readonly sin: number; readonly s: number }

export class LaneMap {
  readonly lanes: readonly Lane[];
  private readonly buckets = new Map<number, Sample[]>();

  constructor(links: readonly Link[], roads: readonly Road[]) {
    const high = new Set(roads.filter((r) => r.level !== 0).map((r) => r.id));
    this.lanes = links.filter((l) => !high.has(l.road) && l.line.length > 1).map((link) => {
      const len = lineLength(link.line);
      return { link, len, pieces: Math.max(1, Math.ceil(len / PIECE)) };
    });
    this.lanes.forEach((l, i) => this.lay(l, i));
  }

  private lay(l: Lane, lane: number): void {
    const pts = resample(l.link.line, SAMPLE);
    pts.forEach((p, k) => {
      const key = keyOf(p.x, p.y);
      const list = this.buckets.get(key) ?? [];
      list.push({ lane, x: p.x, y: p.y, cos: Math.cos(p.a), sin: Math.sin(p.a), s: (l.len * k) / Math.max(1, pts.length - 1) });
      this.buckets.set(key, list);
    });
  }

  /** The lane a car at (x, y) with this heading drives on, and how far along. */
  at(x: number, y: number, heading: number): { readonly lane: number; readonly s: number } | null {
    const c = Math.cos(heading);
    const n = Math.sin(heading);
    let best: Sample | null = null;
    let d = REACH * REACH;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        for (const p of this.buckets.get(keyOf(x + i * BUCKET, y + j * BUCKET)) ?? NONE) {
          if (p.cos * c + p.sin * n < SAME_WAY) continue;
          const k = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (k < d) { d = k; best = p; }
        }
      }
    }
    return best ? { lane: best.lane, s: best.s } : null;
  }
}

const NONE: readonly Sample[] = [];
const keyOf = (x: number, y: number): number => Math.floor(x / BUCKET) * 8192 + Math.floor(y / BUCKET);

export interface Stretch { readonly from: number; readonly to: number; readonly n: number }

/** Runs of cars no further apart than `gap`. `at` is sorted ascending. */
export function runs(at: readonly number[], gap = GAP, room = ROOM): Stretch[] {
  const out: Stretch[] = [];
  for (const s of at) {
    const last = out[out.length - 1];
    if (last && s - (last.to - room) <= gap) out[out.length - 1] = { from: last.from, to: s + room, n: last.n + 1 };
    else out.push({ from: s - room, to: s + room, n: 1 });
  }
  return out;
}

/** The heat each stretch of each lane should have, 0..1. Lanes with none are missing. */
export function heats(map: LaneMap, cars: CarsView): Map<number, Float32Array> {
  const stopped = new Map<number, number[]>();
  const slow = new Map<number, number[]>();
  for (let i = 0; i < cars.count; i++) {
    if (cars.alive[i] !== 1 || cars.state[i]! >= 2 || Math.abs(cars.z[i]!) > ON_DECK) continue;
    const v = cars.speed[i]!;
    const at = v < 60 ? map.at(cars.x[i]!, cars.y[i]!, cars.heading[i]!) : null;
    if (!at) continue;
    const lane = map.lanes[at.lane]!;
    const list = v < STOPPED ? stopped : v < lane.link.freeSpeed * SLOW_SHARE ? slow : null;
    if (!list) continue;
    const mine = list.get(at.lane);
    if (mine) mine.push(at.s);
    else list.set(at.lane, [at.s]);
  }
  const out = new Map<number, Float32Array>();
  const paint = (lane: number, r: Stretch, heat: number): void => {
    const l = map.lanes[lane]!;
    const row = out.get(lane) ?? new Float32Array(l.pieces);
    out.set(lane, row);
    const to = Math.min(l.pieces - 1, Math.floor(r.to / PIECE));
    for (let k = Math.max(0, Math.floor(r.from / PIECE)); k <= to; k++) row[k] = Math.max(row[k]!, heat);
  };
  const wide = (lane: number): number => Math.max(1, map.lanes[lane]!.link.lanes);
  for (const [lane, at] of slow) for (const r of runs(at.sort(asc))) if (r.n >= MIN_QUEUE) paint(lane, r, SLOW_HEAT);
  for (const [lane, at] of stopped) {
    for (const r of runs(at.sort(asc))) if (r.n >= MIN_QUEUE) paint(lane, r, Math.min(1, BASE_HEAT + ((r.n - MIN_QUEUE) / wide(lane)) * HEAT_PER_CAR));
  }
  return out;
}

const asc = (a: number, b: number): number => a - b;

