/**
 * `node dev/trails.mjs <scenario|park|all> [--out dir] [--from s] [--to s]`: a top-down trail picture of a motion-lab
 * scenario (SVG, rendered to PNG by dev/trails.mjs with playwright's Chromium): roads, lots and car parks, the cars parked at the start, and
 * every actor's drawn middle frame by frame: moving blue, manoeuvring green, reversing orange, a body outline every
 * second of a manoeuvre, violations as red rings. For eyes on phase B's moves (docs/inkroad-vehicle-model.md).
 */
import { runScenario, type RunResult, type Sample } from '../test/motion/lab';
import { ALL_SCENARIOS } from '../test/motion/all';
import { halfWidth } from '../src/sim/roadGeom';
import { lotRect } from '../src/city/geometry';
import { CELL } from '../src/sim/constants';

const SCALE = 5;
/** Px round the manoeuvres the picture keeps. */
const PAD = 60;
const COLOURS = ['#1f5fd6', '#8a3fd1', '#1f9b8a', '#c23f8a', '#6b8f1f', '#3a3a3a'];

function box(s: { x: number; y: number; a: number; len: number; wid: number }, style: string): string {
  const c = Math.cos(s.a), n = Math.sin(s.a), hl = s.len / 2, hw = s.wid / 2;
  const pts = [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([f, r]) => `${(s.x + f! * c - r! * n).toFixed(1)},${(s.y + f! * n + r! * c).toFixed(1)}`);
  return `<polygon points="${pts.join(' ')}" ${style}/>`;
}

function svgOf(r: RunResult, from: number, to: number): string {
  const v = r.city;
  const [w, h] = r.scenario.size;
  const W = w * CELL, H = h * CELL;
  // Cropped to the actors' manoeuvres (and where they stood), with room round them.
  const near = r.trace.flatMap((row) => (row ?? []).filter((s) => s.who !== 'bg' && s.who !== 'fill' && s.who !== 'bus' && s.state !== 'moving' && s.t >= from && s.t <= to));
  const xs = near.map((s) => s.x), ys = near.map((s) => s.y);
  const x0 = xs.length ? Math.max(0, Math.min(...xs) - PAD) : 0, y0 = ys.length ? Math.max(0, Math.min(...ys) - PAD) : 0;
  const x1 = xs.length ? Math.min(W, Math.max(...xs) + PAD) : W, y1 = ys.length ? Math.min(H, Math.max(...ys) + PAD) : H;
  const out: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round((x1 - x0) * SCALE)}" height="${Math.round((y1 - y0) * SCALE)}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#eee9dc"/>`];
  for (const l of v.lots) { const q = lotRect(l); out.push(`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="#d9cdb0" stroke="#a89a78" stroke-width="0.4"/>`); }
  for (const p of v.carParks) { const q = lotRect(p); out.push(`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="#c9c9c9" stroke="#888" stroke-width="0.4"/>`); }
  for (const road of v.roads) {
    const d = road.line.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
    out.push(`<path d="${d}" stroke="#77777a" stroke-width="${2 * halfWidth(road)}" fill="none" stroke-linejoin="round"/>`);
    if (road.kerb || road.type === 'street') out.push(`<path d="${d}" stroke="#a7a39a" stroke-width="${2 * halfWidth(road) + 22}" fill="none" opacity="0.5"/>`, `<path d="${d}" stroke="#77777a" stroke-width="${2 * halfWidth(road)}" fill="none"/>`);
    if (!road.oneWay) out.push(`<path d="${d}" stroke="#f4f0d0" stroke-width="0.4" stroke-dasharray="3 3" fill="none"/>`);
  }
  for (const j of v.junctions) out.push(`<circle cx="${j.x}" cy="${j.y}" r="${j.radius}" fill="#77777a"/>`);
  const first = r.trace.find((row) => row && row.length) ?? [];
  for (const s of first) if (s.state === 'parked' && s.who !== '?') out.push(box(s, 'fill="#9a9aa4" stroke="#555" stroke-width="0.3"'));
  const actors = [...new Set(r.trace.flatMap((row) => (row ?? []).map((s) => s.who)))].filter((x) => x !== 'bg' && x !== 'fill' && x !== 'bus');
  actors.forEach((who, k) => {
    const col = COLOURS[k % COLOURS.length]!;
    let last: Sample | null = null;
    let boxT = -1;
    for (const row of r.trace) for (const s of row ?? []) {
      if (s.who !== who || s.t < from || s.t > to) continue;
      if (last && s.state !== 'parked' && Math.hypot(s.x - last.x, s.y - last.y) < 8) {
        const colour = s.gear === 'R' ? '#e8731a' : s.state === 'manoeuvre' ? '#18a050' : col;
        out.push(`<line x1="${last.x.toFixed(2)}" y1="${last.y.toFixed(2)}" x2="${s.x.toFixed(2)}" y2="${s.y.toFixed(2)}" stroke="${colour}" stroke-width="0.6"/>`);
      }
      if (s.state === 'manoeuvre' && s.t - boxT >= 1) { out.push(box(s, `fill="none" stroke="${col}" stroke-width="0.25" opacity="0.8"`)); boxT = s.t; }
      if (s.state === 'parked' && last?.state !== 'parked') out.push(box(s, `fill="${col}" opacity="0.5" stroke="${col}" stroke-width="0.3"`));
      last = s;
    }
    out.push(`<text x="${x0 + 3}" y="${y0 + 8 + k * 7}" font-size="5" fill="${col}" font-family="sans-serif">${who}</text>`);
  });
  for (const x of r.violations) if (x.t >= from && x.t <= to) out.push(`<circle cx="${x.x.toFixed(1)}" cy="${x.y.toFixed(1)}" r="2.5" fill="none" stroke="#e01010" stroke-width="0.5"><title>${x.rule}</title></circle>`);
  out.push(`<text x="${x0 + 3}" y="${y1 - 3}" font-size="4" font-family="sans-serif">${r.scenario.id}: ${r.violations.length} violations; blue drive, green manoeuvre, orange reverse</text></svg>`);
  return out.join('\n');
}

const flag = (args: readonly string[], name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

export function main(args: readonly string[]): string {
  const name = args.find((a) => !a.startsWith('--') && !(args[args.indexOf(a) - 1] ?? '').startsWith('--')) ?? 'park';
  const dir = flag(args, 'out') ?? '.';
  const from = Number(flag(args, 'from') ?? 0), to = Number(flag(args, 'to') ?? Infinity);
  const pick = name === 'all' ? ALL_SCENARIOS : ALL_SCENARIOS.filter((s) => s.id === name || s.id.startsWith(name));
  return JSON.stringify(pick.map((sc) => ({ file: `${dir}/${sc.id}.svg`, svg: svgOf(runScenario(sc), from, to) })));
}
