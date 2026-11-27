/**
 * The vehicle-model comparison page (dev/vehicle.html, `npm run dev` then /vehicle.html?s=<situation>). Left: the
 * car as the game draws it today (a motion-lab scenario through the real city and renderer code). Right: the same
 * car driven by the new model (src/sim/vehicle/: kinematic bicycle, tracker, clothoid turns, Reeds–Shepp moves),
 * built from the same run (test/vehicle/scene.ts). One clock for both; slow motion, frame step, scrub.
 * `&play=1` starts playing at once and sets the title to "done" at the end (for recording clips).
 * docs/inkroad-vehicle-model.md.
 */
import { lotRect } from '../src/city/geometry';
import type { City } from '../src/city/state';
import { halfWidth } from '../src/sim/roadGeom';
import { buildScene, SITUATIONS, type NewFrame, type Scene } from '../test/vehicle/scene';
import type { Sample } from '../test/motion/lab';
import { PHYSICAL } from '../test/vehicle/invariants';
import { KEYS, rowFor, type Row } from './vehicleCli';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const oldView = $<HTMLCanvasElement>('old'), newView = $<HTMLCanvasElement>('new'), line = $<HTMLCanvasElement>('timeline');
const FPS = 60;
/** Seconds of trail behind the car (`&all=1`: the whole path, for a still of the route). */
const TRAIL_S = new URLSearchParams(location.search).get('all') === '1' ? 1e4 : 4;

let scene: Scene | null = null;
let row: Row | null = null;
let t = 0, tEnd = 1, playing = false, last = 0;
let view = { zoom: 1, x: 0, y: 0 };
/** `&until=` stops playing there (clips); else the end. */
const UNTIL = Number(new URLSearchParams(location.search).get('until') ?? Infinity);
const stopAt = (): number => Math.min(tEnd, UNTIL);

const params = new URLSearchParams(location.search);
const pick = $<HTMLSelectElement>('situation');
for (const s of SITUATIONS) pick.add(new Option(`${s.id}: ${s.title}`, s.id));
pick.value = params.get('s') ?? SITUATIONS[0]!.id;
if (params.get('speed')) $<HTMLSelectElement>('speed').value = params.get('speed')!;

function load(): void {
  const sit = SITUATIONS.find((s) => s.id === pick.value) ?? SITUATIONS[0]!;
  const t0 = performance.now();
  scene = buildScene(sit);
  row = rowFor(scene);
  const oldTimes = scene.old.filter((s) => s !== undefined).map((s) => s!.t);
  t = Math.max(0, Math.min(scene.t0, oldTimes[0] ?? 0) - 0.3);
  tEnd = Math.max(oldTimes[oldTimes.length - 1] ?? 0, scene.frames[scene.frames.length - 1]?.t ?? 0) + 0.5;
  fit();
  table();
  $('status').textContent = `built in ${Math.round(performance.now() - t0)} ms`;
  history.replaceState(null, '', `?s=${sit.id}${params.get('play') ? '&play=1' : ''}${params.get('speed') ? `&speed=${params.get('speed')}` : ''}`);
  draw();
}

/** Zoom to where the car manoeuvres or turns (slow frames), both versions; the whole path if it never slows. */
function fit(): void {
  if (!scene) return;
  const xs: number[] = [], ys: number[] = [];
  const slow = Number(params.get('slow') ?? '20');
  for (const s of scene.old) if (s && (s.state !== 'moving' || Math.abs(s.v) < slow)) { xs.push(s.x); ys.push(s.y); }
  for (const f of scene.frames) if (f.phase !== 'wait' && Math.abs(f.v) < slow) { xs.push(f.x); ys.push(f.y); }
  if (xs.length < 10) for (const f of scene.frames) { xs.push(f.x); ys.push(f.y); }
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = Math.max(Math.max(...xs) - Math.min(...xs) + 60, 170), h = Math.max(Math.max(...ys) - Math.min(...ys) + 60, 130);
  const zoom = Math.min(oldView.width / w, oldView.height / h) * Number(params.get('zoom') ?? '1');
  view = { zoom, x: oldView.width / 2 - cx * zoom, y: oldView.height / 2 - cy * zoom };
}

const cityOf = (sc: Scene): City => sc.city;

function ground(ctx: CanvasRenderingContext2D, c: City): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  // The parking band beside streets and kerb-bay roads (test/motion/checks.ts PARK_BAND): paved, where kerb cars stand.
  for (const r of c.net.roads) {
    if (!(r.kerb || r.type === 'street')) continue;
    ctx.beginPath();
    r.line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.strokeStyle = '#8f8d86';
    ctx.lineWidth = (halfWidth(r) + 11) * 2;
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    for (const r of c.net.roads) {
      ctx.beginPath();
      r.line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = pass === 0 ? '#efe9d8' : '#55585c';
      ctx.lineWidth = halfWidth(r) * 2 + (pass === 0 ? 3 : 0);
      ctx.stroke();
    }
    for (const j of c.net.junctions) {
      ctx.beginPath();
      ctx.arc(j.x, j.y, j.radius + (pass === 0 ? 1.5 : 0), 0, Math.PI * 2);
      ctx.fillStyle = pass === 0 ? '#efe9d8' : '#55585c';
      ctx.fill();
    }
  }
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = '#d8d2bf';
  for (const r of c.net.roads) {
    if (r.oneWay) continue;
    ctx.beginPath();
    r.line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const l of c.lots) box(ctx, lotRect(l), '#8c7b5a', l.name);
  for (const p of c.parks) box(ctx, lotRect(p), '#5a6f8c', `car park`);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.4;
  for (const s of c.day.spots.values()) for (const p of s.layout?.poses ?? []) outline(ctx, p.x, p.y, p.a, 16, 8.3);
}

function box(ctx: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, colour: string, label: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = colour;
  ctx.font = '7px monospace';
  ctx.fillText(label, r.x + 3, r.y + 9);
}

function outline(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, wid: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.strokeRect(-len / 2, -wid / 2, len, wid);
  ctx.restore();
}

/** A body with its nose arrow; `wheels` draws the four wheels, the front ones turned by delta (the new model). */
function body(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, wid: number, fill: string, opts: { alpha?: number; reverse?: boolean; wheels?: { wheelbase: number; toMiddle: number; delta: number } } = {}): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.fillStyle = fill;
  ctx.fillRect(-len / 2, -wid / 2, len, wid);
  ctx.strokeStyle = '#1d1f22';
  ctx.lineWidth = 0.4;
  ctx.strokeRect(-len / 2, -wid / 2, len, wid);
  if (opts.wheels) wheels(ctx, opts.wheels, wid);
  ctx.beginPath();
  ctx.moveTo(len / 2 - 4, -2);
  ctx.lineTo(len / 2 - 1, 0);
  ctx.lineTo(len / 2 - 4, 2);
  ctx.strokeStyle = opts.reverse ? '#ff9f43' : '#fff';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

function wheels(ctx: CanvasRenderingContext2D, w: { wheelbase: number; toMiddle: number; delta: number }, wid: number): void {
  const rear = -w.toMiddle, front = rear + w.wheelbase, side = wid / 2 - 1;
  ctx.fillStyle = '#111';
  for (const sy of [-side, side]) {
    ctx.fillRect(rear - 1.4, sy - 0.6, 2.8, 1.2);
    ctx.save();
    ctx.translate(front, sy);
    ctx.rotate(w.delta);
    ctx.fillRect(-1.4, -0.6, 2.8, 1.2);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(rear, 0, 0.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe066';
  ctx.fill();
}

const frameNo = (time: number): number => Math.max(1, Math.round(time * FPS));
const oldAt = (sc: Scene, time: number): Sample | undefined => sc.old[frameNo(time) - 1];
function newAt(sc: Scene, time: number): NewFrame | null {
  if (sc.frames.length === 0 || time < sc.t0) return null;
  const i = Math.min(sc.frames.length - 1, Math.max(0, Math.round((time - sc.t0) * FPS) - 1));
  return sc.frames[i]!;
}

/** The other cars of today's run at this time (parked solid, moving faded). */
function others(ctx: CanvasRenderingContext2D, sc: Scene, time: number, ghost: boolean): void {
  const rowNow = sc.run.trace[frameNo(time) - 1] ?? [];
  for (const s of rowNow) {
    if (s.who === sc.situation.who) continue;
    if (s.state !== 'parked' && !$<HTMLInputElement>('traffic').checked) continue;
    body(ctx, s.x, s.y, s.a, s.len, s.wid, s.state === 'parked' ? '#8d8a84' : '#6d7f95', { alpha: s.state === 'parked' ? 0.9 : ghost ? 0.35 : 0.8 });
  }
}

function trailOld(ctx: CanvasRenderingContext2D, sc: Scene, time: number): void {
  const f1 = TRAIL_S > 1e3 ? sc.old.length : frameNo(time), f0 = Math.max(1, f1 - TRAIL_S * FPS);
  let prev: Sample | undefined;
  for (let f = f0; f <= f1; f++) {
    const s = sc.old[f - 1];
    if (s && prev && Math.hypot(s.x - prev.x, s.y - prev.y) < 12) seg(ctx, prev.x, prev.y, s.x, s.y, s.gear === 'R' ? '#ff9f43' : '#d64b2f');
    prev = s;
  }
}

function trailNew(ctx: CanvasRenderingContext2D, sc: Scene, time: number): void {
  const i1 = TRAIL_S > 1e3 ? sc.frames.length - 1 : Math.round((time - sc.t0) * FPS) - 1, i0 = Math.max(0, i1 - TRAIL_S * FPS);
  for (let i = Math.max(1, i0); i <= Math.min(i1, sc.frames.length - 1); i++) {
    const a = sc.frames[i - 1]!, b = sc.frames[i]!;
    seg(ctx, a.rx, a.ry, b.rx, b.ry, b.v < 0 ? '#ff9f43' : '#2f8f3a');
  }
}

function seg(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, colour: string): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

function hud(ctx: CanvasRenderingContext2D, lines: readonly string[]): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(29,31,34,0.75)';
  ctx.fillRect(6, 6, 300, 16 * lines.length + 6);
  ctx.fillStyle = '#eee';
  ctx.font = '13px monospace';
  lines.forEach((l, i) => ctx.fillText(l, 12, 22 + i * 16));
}

function paneOld(sc: Scene): void {
  const ctx = oldView.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, oldView.width, oldView.height);
  ctx.setTransform(view.zoom, 0, 0, view.zoom, view.x, view.y);
  ground(ctx, cityOf(sc));
  others(ctx, sc, t, false);
  if ($<HTMLInputElement>('trails').checked) trailOld(ctx, sc, t);
  const s = oldAt(sc, t);
  if (s) body(ctx, s.x, s.y, s.a, s.len, s.wid, '#d6862f', { reverse: s.gear === 'R' });
  hud(ctx, [`t ${t.toFixed(2)} s   ${sc.situation.who}${s ? ` ${s.state}` : ' not drawn'}`, s ? `v ${s.v.toFixed(1)} px/s ${s.gear}  ${s.info.slice(0, 26)}` : '']);
}

function paneNew(sc: Scene): void {
  const ctx = newView.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, newView.width, newView.height);
  ctx.setTransform(view.zoom, 0, 0, view.zoom, view.x, view.y);
  ground(ctx, cityOf(sc));
  others(ctx, sc, t, true);
  if ($<HTMLInputElement>('trails').checked) trailNew(ctx, sc, t);
  const f = newAt(sc, t);
  const p = sc.params;
  if (f) body(ctx, f.x, f.y, f.a, p.len, p.wid, '#3f8fd6', { reverse: f.v < 0, wheels: { wheelbase: p.wheelbase, toMiddle: p.toMiddle, delta: f.delta } });
  const deg = (r: number): string => `${((r * 180) / Math.PI).toFixed(0)}°`;
  hud(ctx, [`t ${t.toFixed(2)} s   ${f ? `${f.label} ${f.phase}` : 'not started'}`, f ? `v ${f.v.toFixed(1)} px/s ${f.v < -0.01 ? 'R' : 'D'}  wheels ${deg(f.delta)}` : '']);
}

function timeline(): void {
  const tl = line.getContext('2d')!;
  tl.clearRect(0, 0, line.width, line.height);
  const x = (time: number): number => (time / tEnd) * line.width;
  tl.fillStyle = '#3a3e44';
  tl.fillRect(0, 14, line.width, 6);
  tl.fillStyle = '#f0c674';
  tl.fillRect(x(t) - 1, 0, 3, line.height);
  tl.fillStyle = '#aaa';
  tl.font = '11px monospace';
  tl.fillText(`${t.toFixed(2)} / ${tEnd.toFixed(1)} s`, 6, 32);
}

function draw(): void {
  if (!scene) return;
  paneOld(scene);
  paneNew(scene);
  timeline();
}

function table(): void {
  if (!row) return;
  const cell = (k: (typeof KEYS)[number], v: number): string => {
    const lim = (PHYSICAL as Record<string, number | undefined>)[k];
    const cls = lim === undefined ? '' : v > lim ? 'bad' : 'ok';
    return `<td class="${cls}">${v >= 100 ? v.toFixed(0) : v.toFixed(2)}</td>`;
  };
  const head = `<tr><th></th>${KEYS.map((k) => `<th>${k}</th>`).join('')}<th>moving s</th></tr>`;
  const r1 = `<tr><th>today</th>${KEYS.map((k) => cell(k, row!.old[k])).join('')}<td>${row.oldTime.toFixed(1)}</td></tr>`;
  const r2 = `<tr><th>new</th>${KEYS.map((k) => cell(k, row!.now[k])).join('')}<td>${row.newTime.toFixed(1)}</td></tr>`;
  $('table').innerHTML = `<table>${head}${r1}${r2}</table>`;
  $('notes').textContent = `Ratios against the limits (1 = the limit; kappa: full lock, kappaRate: wheel-angle rate, accel/brake/jerk, curve: √(aLat/κ)). slip in rad, jump in px per frame, pivots and overlaps in frames.\nNew model, by leg: ${Object.entries(row.times).map(([k, v]) => `${k} ${v.toFixed(1)} s`).join(', ')}; ${row.us.toFixed(1)} µs per car per frame.\n${row.notes.join('\n')}`;
}

function tick(now: number): void {
  if (playing) {
    const dt = Math.min(0.05, (now - last) / 1000) * Number($<HTMLSelectElement>('speed').value);
    t = Math.min(stopAt(), t + dt);
    if (t >= stopAt()) { playing = false; $('play').textContent = 'Play'; document.title = 'done'; }
    draw();
  }
  last = now;
  requestAnimationFrame(tick);
}

$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; };
$('back').onclick = () => { playing = false; t = Math.max(0, t - 1 / FPS); draw(); };
$('fwd').onclick = () => { playing = false; t = Math.min(tEnd, t + 1 / FPS); draw(); };
$('restart').onclick = () => { t = 0; draw(); };
pick.onchange = () => load();
line.onclick = (e) => { const r = line.getBoundingClientRect(); t = ((e.clientX - r.left) / r.width) * tEnd; draw(); };
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') $('fwd').click();
  if (e.key === 'ArrowLeft') $('back').click();
  if (e.key === ' ') { e.preventDefault(); $('play').click(); }
});
/** For recording: jump to a time (?t=), e.g. from the devtools. */
(window as unknown as { seek: (s: number) => void }).seek = (s: number) => { t = s; draw(); };

load();
if (params.get('t')) { t = Number(params.get('t')); draw(); }
if (params.get('play') === '1') { playing = true; $('play').textContent = 'Pause'; }
requestAnimationFrame((n) => { last = n; tick(n); });
