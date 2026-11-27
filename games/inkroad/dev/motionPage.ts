/**
 * The motion lab's replay page (dev/motion.html, `npm run dev` then /motion.html?s=<scenario>&on=1). Runs a scenario
 * in the browser through the same harness as the tests (test/motion/lab.ts: the real city and traffic, sampled
 * through the renderer's pure code) and draws it on a plain canvas: road ribbons and kerbs, junctions, blocks and car
 * parks, their slots, oriented car bodies with heading arrows. Play, pause, scrub, slow motion; violations are red on
 * the timeline and on the car. docs/inkroad-motion-lab.md.
 */
import { lotRect } from '../src/city/geometry';
import type { City } from '../src/city/state';
import { halfWidth } from '../src/sim/roadGeom';
import type { MotionSwitches } from '../src/sim/switches';
import { runScenario, type RunResult, type Sample } from '../test/motion/lab';
import { ALL_SCENARIOS as SCENARIOS } from '../test/motion/all';
import type { Violation } from '../test/motion/checks';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const view = $<HTMLCanvasElement>('view');
const line = $<HTMLCanvasElement>('timeline');
const ctx = view.getContext('2d')!;
const tl = line.getContext('2d')!;
const SWITCHES: readonly (keyof MotionSwitches)[] = ['PLANNED_TIMES', 'ROOMY_CORNERS', 'GAP_ACCEPT', 'ROAD_STOPS', 'HONEST_SWINGS'];
const ACTOR_COLOURS = ['#2f6fd6', '#d6862f', '#8a3fd1', '#1f9b8a', '#c23f8a', '#6b8f1f'];
/** A violation shows on its car for this many frames either side. */
const MARK_FRAMES = 4;
const FPS = 60;
const TRAIL = 90;

let run: RunResult | null = null;
let frame = 1;
let playing = false;
let zoom = 1;
let pan = { x: 0, y: 0 };
let byFrame = new Map<number, Violation[]>();

const params = new URLSearchParams(location.search);
const pick = $<HTMLSelectElement>('scenario');
for (const s of SCENARIOS) pick.add(new Option(`${s.id}: ${s.title}`, s.id));
pick.value = params.get('s') ?? SCENARIOS[0]!.id;
for (const k of SWITCHES) ($<HTMLInputElement>(`sw-${k}`)).checked = params.get('on') === '1' || params.get(k) === '1';

const colourOf = (who: string): string => {
  if (who === 'bg') return '#777b80';
  if (who === 'fill' || who === '?') return '#a9a39a';
  const ids = run?.scenario.actors.map((a) => a.id) ?? [];
  return ACTOR_COLOURS[Math.max(0, ids.indexOf(who)) % ACTOR_COLOURS.length]!;
};

function go(): void {
  const s = SCENARIOS.find((x) => x.id === pick.value) ?? SCENARIOS[0]!;
  const sw: Partial<MotionSwitches> = {};
  for (const k of SWITCHES) sw[k] = $<HTMLInputElement>(`sw-${k}`).checked;
  const t0 = performance.now();
  run = runScenario(s, sw);
  byFrame = new Map();
  for (const v of run.violations) for (let f = v.frame - MARK_FRAMES; f <= v.frame + MARK_FRAMES; f++) (byFrame.get(f) ?? byFrame.set(f, []).get(f)!).push(v);
  frame = 1;
  fit();
  side();
  $('status').textContent = `${run.frames} frames, ${run.violations.length} violations, ran in ${Math.round(performance.now() - t0)} ms`;
  history.replaceState(null, '', `?s=${s.id}${SWITCHES.map((k) => (sw[k] ? `&${k}=1` : '')).join('')}`);
  draw();
}

const cityOf = (r: RunResult): City => (r.city as unknown as { c: City }).c;

/** Zoom to the roads. */
function fit(): void {
  if (!run) return;
  const c = cityOf(run);
  const xs = c.net.junctions.map((j) => j.x), ys = c.net.junctions.map((j) => j.y);
  const pad = 40;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad * 3, y1 = Math.max(...ys) + pad;
  zoom = Math.min(view.width / (x1 - x0), view.height / (y1 - y0));
  pan = { x: -x0 * zoom + (view.width - (x1 - x0) * zoom) / 2, y: -y0 * zoom + (view.height - (y1 - y0) * zoom) / 2 };
}

function ground(c: City): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    for (const r of c.net.roads) {
      ctx.beginPath();
      r.line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.strokeStyle = pass === 0 ? '#efe9d8' : r.level !== 0 ? '#6d6f73' : '#55585c';
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
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = '#d8d2bf';
  for (const r of c.net.roads) {
    if (r.oneWay) continue;
    ctx.beginPath();
    r.line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const l of c.lots) box(lotRect(l), '#8c7b5a', l.name);
  for (const p of c.parks) box(lotRect(p), '#5a6f8c', `car park ${p.kind}`);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 0.5;
  for (const s of c.day.spots.values()) for (const p of s.layout?.poses ?? []) outline(p.x, p.y, p.a, 16, 8.3);
}

function box(r: { x: number; y: number; w: number; h: number }, colour: string, label: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = colour;
  ctx.font = '8px monospace';
  ctx.fillText(label, r.x + 3, r.y + 10);
}

function outline(x: number, y: number, a: number, len: number, wid: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.strokeRect(-len / 2, -wid / 2, len, wid);
  ctx.restore();
}

function car(s: Sample, bad: boolean): void {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.a);
  ctx.fillStyle = bad ? '#e0392b' : colourOf(s.who);
  ctx.globalAlpha = s.state === 'parked' ? 0.75 : 1;
  ctx.fillRect(-s.len / 2, -s.wid / 2, s.len, s.wid);
  ctx.strokeStyle = s.state === 'manoeuvre' ? '#ffe066' : '#1d1f22';
  ctx.lineWidth = s.state === 'manoeuvre' ? 1 : 0.5;
  ctx.strokeRect(-s.len / 2, -s.wid / 2, s.len, s.wid);
  ctx.beginPath();
  ctx.moveTo(s.len / 2 - 5, -2.5);
  ctx.lineTo(s.len / 2 - 1, 0);
  ctx.lineTo(s.len / 2 - 5, 2.5);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  if (s.who !== 'bg' && s.who !== 'fill' && s.who !== '?') {
    ctx.fillStyle = '#111';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(`${s.who}${s.gear === 'R' ? ' R' : ''}`, s.x + 6, s.y - 6);
  }
}

function trails(r: RunResult): void {
  if (!$<HTMLInputElement>('trails').checked) return;
  const last = new Map<number, Sample>();
  for (let f = Math.max(1, frame - TRAIL); f <= frame; f++) {
    for (const s of r.trace[f - 1] ?? []) {
      if (s.state === 'parked' || s.who === 'bg') continue;
      const p = last.get(s.uid);
      if (p && Math.hypot(p.x - s.x, p.y - s.y) < 10) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = s.gear === 'R' ? '#ff9f43' : colourOf(s.who);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      last.set(s.uid, s);
    }
  }
}

function draw(): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);
  if (!run) return;
  ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);
  ground(cityOf(run));
  trails(run);
  const here = byFrame.get(frame) ?? [];
  const bad = new Set(here.map((v) => v.uid));
  const row = run.trace[frame - 1] ?? [];
  for (const s of row) if (s.state === 'parked') car(s, bad.has(s.uid));
  for (const s of row) if (s.state !== 'parked') car(s, bad.has(s.uid));
  for (const v of here) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(224,57,43,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#111';
  ctx.font = '13px monospace';
  const t = row[0]?.t ?? 0;
  ctx.fillText(`frame ${frame} / ${run.frames}   t ${t.toFixed(2)} s`, 10, 18);
  here.slice(0, 6).forEach((v, i) => { ctx.fillStyle = '#b3261e'; ctx.fillText(`${v.who} ${v.rule}: ${v.detail}`, 10, 36 + i * 16); });
  timeline(run);
  for (const el of Array.from(document.querySelectorAll('#viol div'))) el.classList.toggle('here', Number((el as HTMLElement).dataset.frame) === frame);
}

function timeline(r: RunResult): void {
  const w = line.width, h = line.height;
  tl.clearRect(0, 0, w, h);
  const x = (f: number): number => ((f - 1) / Math.max(1, r.frames - 1)) * w;
  tl.fillStyle = '#e0392b';
  for (const v of r.violations) tl.fillRect(x(v.frame), 4, 1.5, h - 18);
  tl.fillStyle = '#f0c674';
  for (const e of r.events) tl.fillRect(x(Math.round(e.t * FPS)), h - 12, 2, 8);
  tl.fillStyle = '#fff';
  tl.fillRect(x(frame) - 1, 0, 2, h);
}

function side(): void {
  if (!run) return;
  const r = run;
  const counts = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<div>${n} ${k}</div>`).join('');
  const exp = r.expectations.map((e) => `<div class="${e.ok ? 'ok' : 'bad'}">${e.ok ? 'ok' : 'FAIL'} ${e.name}: ${e.detail}</div>`).join('');
  const viol = r.violations.map((v) => `<div data-frame="${v.frame}" title="${v.detail}">${v.t.toFixed(2)}s ${v.who} ${v.rule}${v.value !== undefined ? ` ${v.value.toFixed(1)}/${v.limit?.toFixed(1) ?? ''}` : ''}</div>`).join('');
  $('side').innerHTML = `<h3>${r.scenario.title}</h3><div>${r.scenario.expect}</div><h3>Expectations</h3>${exp || '<div>none</div>'}<h3>Rules broken</h3>${counts || '<div class="ok">none</div>'}<h3>Violations (click to jump)</h3><div id="viol">${viol}</div>`;
  for (const el of Array.from(document.querySelectorAll('#viol div'))) el.addEventListener('click', () => { frame = Number((el as HTMLElement).dataset.frame); playing = false; draw(); });
}

let last = 0;
let carry = 0;
function tick(now: number): void {
  if (playing && run) {
    carry += ((now - last) / 1000) * FPS * Number($<HTMLSelectElement>('speed').value);
    const n = Math.floor(carry);
    carry -= n;
    if (n > 0) { frame = Math.min(run.frames, frame + n); if (frame >= run.frames) playing = false; draw(); }
  }
  last = now;
  $('play').textContent = playing ? 'Pause' : 'Play';
  requestAnimationFrame(tick);
}

const jump = (dir: 1 | -1): void => {
  if (!run) return;
  const list = run.violations.map((v) => v.frame);
  const to = dir > 0 ? list.find((f) => f > frame) : [...list].reverse().find((f) => f < frame);
  if (to !== undefined) { frame = to; playing = false; draw(); }
};

$('run').addEventListener('click', go);
pick.addEventListener('change', go);
for (const k of SWITCHES) $(`sw-${k}`).addEventListener('change', go);
$('play').addEventListener('click', () => { if (run && frame >= run.frames) frame = 1; playing = !playing; });
$('back').addEventListener('click', () => { frame = Math.max(1, frame - 1); playing = false; draw(); });
$('fwd').addEventListener('click', () => { frame = Math.min(run?.frames ?? 1, frame + 1); playing = false; draw(); });
$('prevViol').addEventListener('click', () => jump(-1));
$('nextViol').addEventListener('click', () => jump(1));
$('trails').addEventListener('change', draw);
const scrub = (e: MouseEvent): void => {
  if (!run) return;
  const b = line.getBoundingClientRect();
  frame = Math.max(1, Math.min(run.frames, Math.round(((e.clientX - b.left) / b.width) * (run.frames - 1)) + 1));
  playing = false;
  draw();
};
let scrubbing = false;
line.addEventListener('mousedown', (e) => { scrubbing = true; scrub(e); });
window.addEventListener('mousemove', (e) => { if (scrubbing) scrub(e); });
window.addEventListener('mouseup', () => { scrubbing = false; dragging = null; });
let dragging: { x: number; y: number } | null = null;
view.addEventListener('mousedown', (e) => { dragging = { x: e.clientX, y: e.clientY }; });
view.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const k = view.width / view.getBoundingClientRect().width;
  pan = { x: pan.x + (e.clientX - dragging.x) * k, y: pan.y + (e.clientY - dragging.y) * k };
  dragging = { x: e.clientX, y: e.clientY };
  draw();
});
view.addEventListener('wheel', (e) => {
  e.preventDefault();
  const b = view.getBoundingClientRect(), k = view.width / b.width;
  const mx = (e.clientX - b.left) * k, my = (e.clientY - b.top) * k;
  const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  pan = { x: mx - (mx - pan.x) * f, y: my - (my - pan.y) * f };
  zoom *= f;
  draw();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { playing = !playing; e.preventDefault(); }
  if (e.key === 'ArrowRight') { frame = Math.min(run?.frames ?? 1, frame + (e.shiftKey ? 60 : 1)); playing = false; draw(); }
  if (e.key === 'ArrowLeft') { frame = Math.max(1, frame - (e.shiftKey ? 60 : 1)); playing = false; draw(); }
});

go();
requestAnimationFrame(tick);
