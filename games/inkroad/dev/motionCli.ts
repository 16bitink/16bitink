/**
 * `npm run motion -- <scenario|all|list|table> [--switch ROOMY_CORNERS=on GAP_ACCEPT=on] [--on] [--both] [--json] [--frame n] [--log n] [--rule text] [--who A]`
 * (dev/motion.mjs). One verdict line per scenario; a named scenario also prints its expectations, a compact violation
 * timeline and an ASCII frame at the first violation (or at --frame n). Switches also from the environment:
 * MOTION_SWITCHES=PLANNED_TIMES,ROOMY_CORNERS. docs/inkroad-motion-lab.md.
 */
import { asciiFrame } from '../test/motion/ascii';
import { runScenario, type RunResult } from '../test/motion/lab';
import { ALL_SCENARIOS as SCENARIOS } from '../test/motion/all';
import { CATALOGUE } from '../test/motion/catalogue';
import type { MotionSwitches } from '../src/sim/switches';

type Env = Readonly<Record<string, string | undefined>>;
const NAMES: readonly (keyof MotionSwitches)[] = ['ROOMY_CORNERS', 'GAP_ACCEPT'];
const TIMELINE = 40;

export function parseSwitches(args: readonly string[], env: Env): Partial<MotionSwitches> {
  const out: Partial<MotionSwitches> = {};
  for (const name of (env.MOTION_SWITCHES ?? '').split(',').filter(Boolean)) if (NAMES.includes(name as keyof MotionSwitches)) out[name as keyof MotionSwitches] = true;
  if (args.includes('--on')) for (const n of NAMES) out[n] = true;
  const i = args.indexOf('--switch');
  if (i >= 0) {
    for (const tok of args.slice(i + 1)) {
      if (tok.startsWith('--')) break;
      const [k, val] = tok.split('=');
      if (!NAMES.includes(k as keyof MotionSwitches)) throw new Error(`Unknown switch ${k}: ${NAMES.join(', ')}`);
      out[k as keyof MotionSwitches] = val === undefined || val === 'on' || val === '1' || val === 'true';
    }
  }
  return out;
}

const flag = (args: readonly string[], name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const sw = (s: Partial<MotionSwitches>): string => NAMES.filter((n) => s[n]).join('+') || 'defaults';

export function verdict(r: RunResult): string {
  const total = r.violations.length;
  const failed = r.expectations.filter((e) => !e.ok);
  const top = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${n} ${k}`).join(', ');
  const ok = total === 0 && failed.length === 0;
  return `${ok ? 'PASS' : 'FAIL'} ${r.scenario.id.padEnd(34)} ${String(total).padStart(4)} violations${top ? ` (${top})` : ''}; expectations ${r.expectations.length - failed.length}/${r.expectations.length}${failed.length ? ` failed: ${failed.map((e) => `${e.name} [${e.detail}]`).join('; ')}` : ''} [${r.ms} ms]`;
}

function detail(r: RunResult, args: readonly string[]): string {
  const out: string[] = [];
  out.push(`${r.scenario.title}\n  expect: ${r.scenario.expect}\n  switches: ${sw(r.switches)}; ${r.frames} frames`);
  for (const e of r.expectations) out.push(`  ${e.ok ? 'ok  ' : 'FAIL'} ${e.name}: ${e.detail}`);
  const rule = flag(args, 'rule');
  const who = flag(args, 'who');
  const list = r.violations.filter((v) => (!rule || v.rule.includes(rule)) && (!who || v.who === who));
  const n = Number(flag(args, 'log') ?? TIMELINE);
  out.push(`  violations (${list.length}${list.length > n ? `, first ${n}` : ''}):`);
  for (const v of list.slice(0, n)) {
    const val = v.value !== undefined ? ` ${v.value.toFixed(2)}${v.limit !== undefined ? ` vs ${v.limit.toFixed(2)}` : ''}` : '';
    out.push(`  ${v.t.toFixed(2).padStart(6)}s f${String(v.frame).padEnd(5)} ${v.who.padEnd(3)} ${v.rule}${val} at ${v.x.toFixed(0)},${v.y.toFixed(0)} ${((v.a * 180) / Math.PI).toFixed(0)}deg: ${v.detail}`);
  }
  const at = flag(args, 'frame');
  const first = list[0];
  const frame = at !== undefined ? Number(at) : first?.frame;
  if (frame !== undefined && r.trace[frame - 1]) {
    const row = r.trace[frame - 1]!;
    const focus = first && at === undefined ? first : row.find((s) => s.who !== 'bg' && s.state !== 'parked') ?? row[0];
    const c = (r.city as unknown as { c: Parameters<typeof asciiFrame>[0] }).c;
    out.push(`\n  frame ${frame} (${row[0]?.t.toFixed(2) ?? '?'} s)${first && at === undefined ? `: first violation, ${first.who} ${first.rule}` : ''}`);
    if (focus) out.push(asciiFrame(c, row, focus.x, focus.y, first && at === undefined ? first.uid : -1));
  }
  return out.join('\n');
}

const OFF: MotionSwitches = { ROOMY_CORNERS: false, GAP_ACCEPT: false };
const ON: MotionSwitches = { ROOMY_CORNERS: true, GAP_ACCEPT: true };
/** Rules shown in the main-failure column when no other expectation fails. */
const TOP_RULES = 2;

/** One switch set's verdict cell ("PASS, 0" or "FAIL, n violations") and its main failure. */
function cell(r: RunResult): { readonly verdict: string; readonly main: string } {
  const total = r.violations.length;
  const failed = r.expectations.filter((e) => !e.ok).map((e) => e.name);
  const verdict = total === 0 && failed.length === 0 ? 'PASS, 0' : `FAIL, ${total} violations`;
  // The behaviour expectations first; a run that only breaks the motion rules shows its biggest rules.
  const named = failed.filter((n) => !n.endsWith('breaks no motion rule'));
  const top = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).slice(0, TOP_RULES).map(([k, n]) => `${n} ${k}`);
  return { verdict, main: named.length ? named.join('; ') : top.join(', ') };
}

/** `npm run motion -- table`: the catalogue table of docs/inkroad-motion-lab.md (defaults and every switch on). */
export function table(): string {
  const rows = ['| Id | Defaults (switches off) | Switches on | Main failure (today) |', '|---|---|---|---|'];
  for (const sc of SCENARIOS) {
    const off = cell(runScenario(sc, OFF));
    const on = cell(runScenario(sc, ON));
    const main = !off.main && !on.main ? 'clean' : [off.main && `off: ${off.main}`, on.main && `on: ${on.main}`].filter(Boolean).join('. ');
    rows.push(`| ${sc.id} | ${off.verdict} | ${on.verdict} | ${main} |`);
  }
  const todo = CATALOGUE.filter((k) => !SCENARIOS.some((s) => s.id === k.id));
  for (const k of todo) rows.push(`| ${k.id} | todo | todo | ${k.expect} |`);
  rows.push('', `${CATALOGUE.length} situations: ${CATALOGUE.length - todo.length} built, ${todo.length} todo.`);
  return rows.join('\n');
}

export function main(args: readonly string[], env: Env): string {
  const name = args.find((a) => !a.startsWith('--') && !a.includes('=')) ?? 'all';
  const switches = parseSwitches(args, env);
  const runs: Partial<MotionSwitches>[] = args.includes('--both') ? [{ ROOMY_CORNERS: false, GAP_ACCEPT: false }, { ROOMY_CORNERS: true, GAP_ACCEPT: true }] : [switches];
  if (name === 'table') return table();
  if (name === 'list') return CATALOGUE.map((k) => `${k.id.padEnd(34)} ${k.built ? 'built' : 'todo '} ${k.expect}`).join('\n');
  const picked = name === 'all' ? SCENARIOS : SCENARIOS.filter((s) => s.id === name || s.id.startsWith(name));
  if (picked.length === 0) return `No scenario ${name}. Built: ${SCENARIOS.map((s) => s.id).join(', ')} (npm run motion -- list for the catalogue)`;
  if (args.includes('--json')) {
    return JSON.stringify(runs.map((s) => ({ switches: sw(s), runs: picked.map((sc) => { const r = runScenario(sc, s); return { id: sc.id, counts: r.counts, failed: r.expectations.filter((e) => !e.ok).map((e) => e.name) }; }) })), null, 1);
  }
  const out: string[] = [];
  for (const s of runs) {
    out.push(`-- switches: ${sw(s)}`);
    for (const sc of picked) {
      const r = runScenario(sc, s);
      out.push(verdict(r));
      if (picked.length === 1) out.push(detail(r, args));
    }
  }
  return out.join('\n');
}
