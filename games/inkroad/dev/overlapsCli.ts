/**
 * `node dev/overlaps.mjs [case] [--top n] [--json]`: plays the motion test's seasons (Saffron Bay years 3 and 6, Old
 * Harbour year 4) through the motion watch and breaks every frame two drawn bodies overlap down by cause: wide
 * vehicles (vans, lorries, buses: anything wider than a car), queues, junction boxes, lane changes, oncoming
 * traffic, manoeuvres by kind, parked cars, played turns, stand-ins, handoffs and spawns. docs/inkroad-vehicle-model.md
 * "Phase B, round 3".
 */
import { createCity } from '../src/city/city';
import { PAID_CITIES } from '../content/paid';
import type { CityView } from '../src/sim/types';
import { cityAtYear, inner } from '../test/city-helpers';
import { MotionWatch, type DrawnCar } from '../test/motion-helpers';
import { bodiesOverlap, sizeOf } from '../src/sim/vehicleSize';
import type { CarStore } from '../src/sim/store';
import { turn } from '../src/render/cars/drawnPose';
import { lotRect } from '../src/city/geometry';
import { halfWidth } from '../src/sim/roadGeom';

const TRACK = ['lane', 'turn', 'entry', 'arc', 'span', 'exit'];
/** Wider than a car (vans, lorries, buses). */
const WIDE = sizeOf('car').wid + 0.01;

function harbourAt(year: number): CityView {
  const v = createCity(PAID_CITIES[0]!, 3);
  const c = inner(v);
  c.money = 9000;
  while (v.year < year) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
  v.apply({ t: 'next' });
  return v;
}

const CASES: Readonly<Record<string, () => CityView>> = {
  'Saffron Bay year 3': () => cityAtYear(3),
  'Saffron Bay year 6': () => cityAtYear(6),
  'Old Harbour year 4': () => harbourAt(4),
};

interface Seen { readonly keys: Map<number, string>; readonly joined: Map<number, number>; readonly first: Map<number, number>; readonly handed: Map<number, number> }

/** What a drawn body is doing, in a word or two. */
function ctx(v: CityView, d: DrawnCar, seen: Seen): string {
  if (d.id[0] === 'p') return 'parked';
  if (d.man) return `man ${(seen.keys.get(d.uid) ?? '?').split(':')[0]}`;
  const c = v.cars as unknown as CarStore;
  const i = c.slotOf.get(d.uid);
  if (i === undefined) return 'gone';
  if (c.play[i]) return 'played turn';
  const t = c.track[i];
  const parts = [t ? TRACK[t.kind]! : 'none'];
  if (c.offEnd[i]! > c.s[i]!) parts.push('shift');
  if (c.state[i] !== 0) parts.push(`st${c.state[i]}`);
  const j = seen.joined.get(d.uid);
  if (j !== undefined && v.clock - j < 6) parts.push('joined');
  const f = seen.first.get(d.uid) ?? seen.first.set(d.uid, v.clock).get(d.uid)!;
  if (v.clock - f < 4 && j === undefined) parts.push('spawn');
  return parts.join('+');
}

/** How two moving cars stand to each other. */
function relation(v: CityView, a: DrawnCar, b: DrawnCar): string {
  const c = v.cars as unknown as CarStore;
  const i = c.slotOf.get(a.uid), j = c.slotOf.get(b.uid);
  if (i === undefined || j === undefined) return '?';
  const ta = c.track[i], tb = c.track[j];
  if (ta && ta === tb) return 'same track';
  if (Math.abs(turn(a.a, b.a)) > 2.6) return 'oncoming';
  if (ta && tb && ta.kind !== 0 && tb.kind !== 0 && ta.node === tb.node) return 'junction box';
  if (ta && tb && (ta.kind !== 0 || tb.kind !== 0)) return 'lane/junction';
  if (ta && tb && ta.link === tb.link) return 'next lane';
  if (ta && tb && (ta.to === tb || tb.to === ta || c.ahead[i] === j || c.ahead[j] === i)) return 'queue across tracks';
  return 'lanes apart';
}

export function main(args: readonly string[]): string {
  const top = Number(args[args.indexOf('--top') + 1]) || 0;
  const pick = args[args.indexOf('--pair') + 1] && args.includes('--pair') ? args[args.indexOf('--pair') + 1] : '';
  let pickN = 0, uidN = 0;
  const uidEvery = args.includes('--every') ? Number(args[args.indexOf('--every') + 1]) : 12;
  const watchUid = args.includes('--uid') ? Number(args[args.indexOf('--uid') + 1]) : 0;
  const snapArg = args.includes('--snap') ? args[args.indexOf('--snap') + 1]!.split(',').map(Number) : null;
  const snapAt = snapArg ? { frame: snapArg[0]!, x: snapArg[1]!, y: snapArg[2]!, r: snapArg[3] ?? 80 } : null;
  const snaps: string[] = [];
  const only = args.find((a, k) => !a.startsWith('--') && Number.isNaN(Number(a)) && args[k - 1] !== '--pair' && args[k - 1] !== '--uid' && args[k - 1] !== '--snap' && args[k - 1] !== '--every');
  const out: string[] = [];
  const json: Record<string, unknown> = {};
  for (const [name, make] of Object.entries(CASES)) {
    if (only && !name.includes(only)) continue;
    const v = make();
    if (args.includes('--slots')) out.push(...slotsOnRoad(v));
    const seen: Seen = { keys: new Map(), joined: new Map(), first: new Map(), handed: new Map() };
    const by = new Map<string, number>();
    const pairs = new Map<string, { n: number; first: number; frame: number; at: string; what: string }>();
    let total = 0, wide = 0;
    const w: MotionWatch = new MotionWatch(v, {
      onFrame: (f, clock, drawn, parked) => {
        if (snapAt && f === snapAt.frame) snaps.push(snapSvg(v, snapAt, drawn, parked));
        for (const e of w.lastEvents) {
          if (e.t === 'park') seen.keys.set(e.car, e.key);
          if (e.t === 'parkGo' && e.uid !== undefined) { seen.joined.set(e.uid, v.clock); seen.keys.set(e.uid, e.key); seen.handed.set(e.uid, e.car); }
        }
        for (const d of drawn) if (!seen.first.has(d.uid)) seen.first.set(d.uid, v.clock);
        if (watchUid) for (const d of drawn) if (d.uid === watchUid && (uidN++ % uidEvery === 0)) {
          const cs = v.cars as unknown as CarStore; const i = cs.slotOf.get(d.uid);
          out.push(`  #${d.id} @${clock.toFixed(2)} ${d.x.toFixed(1)},${d.y.toFixed(1)} ${d.a.toFixed(2)} ${d.info ?? ''} ${i === undefined ? '' : `st${cs.state[i]} arr${cs.arrived[i]} v${cs.v[i]!.toFixed(1)} until${cs.until[i]!.toFixed(1)} ${TRACK[cs.track[i]!.kind] ?? cs.track[i]!.kind} s${cs.s[i]!.toFixed(1)}/${cs.track[i]!.len.toFixed(1)} g${cs.granted[i]} room${cs.room[i]!.toFixed(1)} acc${cs.acc[i]!.toFixed(1)} a${cs.fa[i]!.toFixed(1)} ahead${cs.ahead[i]}`} ${w.lastEvents.map((e) => e.t).join(',')}`);
        }
        const all = [...drawn, ...parked];
        for (let x = 0; x < drawn.length; x++) {
          const a = drawn[x]!;
          for (const b of all) {
            if (b === a || Math.abs(a.z - b.z) > 0.5 || (b.id[0] !== 'p' && b.id <= a.id)) continue;
            if (Math.abs(a.x - b.x) > 30 || Math.abs(a.y - b.y) > 30) continue;
            if (!bodiesOverlap(a, b, 0.4)) continue;
            // A pull-out and the moving car it becomes (as the watch's own `same`).
            if (a.man !== b.man && b.id[0] !== 'p' && (seen.handed.get(a.man ? b.uid : a.uid) === (a.man ? a.uid : b.uid))) continue;
            const isWide = a.wid > WIDE || b.wid > WIDE;
            const ca = ctx(v, a, seen), cb = ctx(v, b, seen);
            const rel = !a.man && !b.man && b.id[0] !== 'p' ? relation(v, a, b) : '';
            const [p, q] = [ca, cb].sort();
            const key = `${a.man || b.man ? 'MAN' : 'MOV'} ${isWide ? 'wide' : 'cars'} | ${p} ~ ${q}${rel ? ` | ${rel}` : ''}`;
            by.set(key, (by.get(key) ?? 0) + 1);
            total++;
            if (isWide) wide++;
            const pk = `${a.id}|${b.id}`;
            if (pick && pick.split(',').includes(pk) && (pickN++ % 20 === 0)) out.push(`  @${clock.toFixed(2)} ${a.id} ${a.x.toFixed(1)},${a.y.toFixed(1)} ${a.a.toFixed(2)} ${a.info ?? ''} ${ctx(v, a, seen)} | ${b.id} ${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.a.toFixed(2)} ${b.info ?? ''} ${ctx(v, b, seen)} ${seen.keys.get(a.uid) ?? ''} ${seen.keys.get(b.uid) ?? ''}`);
            const pr = pairs.get(pk) ?? { n: 0, first: clock, frame: f, at: `${a.x.toFixed(0)},${a.y.toFixed(0)}`, what: key };
            pr.n++;
            pairs.set(pk, pr);
          }
        }
      },
    });
    w.season();
    const counts = w.counts();
    const rows = [...by.entries()].sort((p, q) => q[1] - p[1]);
    out.push(`## ${name}: ${total} overlap frames (watch: manoeuvre ${counts['bodies overlap (manoeuvre)'] ?? 0}, moving ${counts['bodies overlap (moving)'] ?? 0}), wide involved ${wide} (${((100 * wide) / Math.max(1, total)).toFixed(0)}%)`);
    for (const [k, n] of rows.slice(0, 40)) out.push(`${String(n).padStart(7)}  ${k}`);
    if (top) {
      out.push(`  worst pairs:`);
      for (const [k, p] of [...pairs.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, top)) out.push(`    ${p.n}\t${k}\t@${p.first.toFixed(1)} f${p.frame} ${p.at}\t${p.what}`);
    }
    json[name] = { total, wide, by: Object.fromEntries(rows), counts };
  }
  if (snaps.length) return JSON.stringify(snaps);
  return args.includes('--json') ? JSON.stringify(json) : out.join('\n');
}

/** An SVG of the drawn bodies round a point at one frame: roads, lots, moving (blue), manoeuvring (green), parked (grey). */
function snapSvg(v: CityView, at: { x: number; y: number; r: number }, drawn: readonly DrawnCar[], parked: readonly DrawnCar[]): string {
  const k = 6, W = at.r * 2 * k;
  const X = (x: number): number => (x - at.x + at.r) * k, Y = (y: number): number => (y - at.y + at.r) * k;
  const c = inner(v);
  const parts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}"><rect width="100%" height="100%" fill="#e8e4d8"/>`];
  for (const l of [...c.lots, ...c.parks]) { const r = lotRect(l); parts.push(`<rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.w * k}" height="${r.h * k}" fill="#d0c8b0" stroke="#a09070"/>`); }
  for (const r of c.net.roads) if (r.level === 0) parts.push(`<polyline points="${r.line.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}" fill="none" stroke="#999" stroke-width="${halfWidth(r) * 2 * k}" stroke-linejoin="round"/><polyline points="${r.line.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')}" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="6 6"/>`);
  for (const j of c.net.junctions) parts.push(`<circle cx="${X(j.x)}" cy="${Y(j.y)}" r="${j.radius * k}" fill="#999"/>`);
  for (const b of [...parked, ...drawn]) {
    if (Math.abs(b.x - at.x) > at.r + 20 || Math.abs(b.y - at.y) > at.r + 20) continue;
    const col = b.id[0] === 'p' ? '#777' : b.man ? '#2a2' : '#36c';
    const deg = (b.a * 180) / Math.PI;
    parts.push(`<g transform="translate(${X(b.x)},${Y(b.y)}) rotate(${deg})"><rect x="${(-b.len / 2) * k}" y="${(-b.wid / 2) * k}" width="${b.len * k}" height="${b.wid * k}" fill="${col}" fill-opacity="0.55" stroke="${b.wid > WIDE ? '#c00' : '#000'}"/><line x1="0" y1="0" x2="${(b.len / 2) * k}" y2="0" stroke="#fff" stroke-width="2"/></g><text x="${X(b.x)}" y="${Y(b.y) - 4}" font-size="11" text-anchor="middle">${b.id}</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

/** Off-road slots whose body reaches onto a road's paved width (a layout fault: a car standing there is in a lane). */
function slotsOnRoad(v: CityView): string[] {
  const c = inner(v);
  const out: string[] = [];
  for (const s of c.day.spots.values()) {
    const l = s.layout;
    if (!l || s.kind === 'kerb' || s.kind === 'street' || s.kind === 'double') continue;
    l.poses.forEach((p, k) => {
      for (const r of c.net.roads) {
        if (r.level !== 0) continue;
        const hw = halfWidth(r);
        for (let i = 1; i < r.line.length; i++) {
          const a = r.line[i - 1]!, b = r.line[i]!;
          const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
          const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
          const d = Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
          const h = Math.atan2(dy, dx);
          const ext = (16 * Math.abs(Math.sin(p.a - h)) + 8.3 * Math.abs(Math.cos(p.a - h))) / 2;
          if (d - ext < hw - 0.5) { out.push(`  slot on road: ${s.key} #${k} at ${p.x.toFixed(0)},${p.y.toFixed(0)} road ${r.id} ${(hw - d + ext).toFixed(1)} px in`); return; }
        }
      }
    });
  }
  return out;
}
