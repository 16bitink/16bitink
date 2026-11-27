/**
 * The motion lab's scenarios (docs/inkroad-motion-lab.md). Each built scenario runs the real city and traffic code twice,
 * with the switches off (today's game) and on (src/sim/switches.ts), and is held to a ratchet: violation counts per
 * rule may not rise and no expectation that passes may start failing. Every fix shows up as a count going down: lower
 * the table to the new numbers (`npm run motion -- all --both --json`). MOTION_STRICT=1 asks for zero and every
 * expectation. The rest of the catalogue is listed as todo until its scenario is written.
 */
import { describe, expect, it } from 'vitest';
import { runScenario } from './lab';
import { ALL_SCENARIOS as SCENARIOS } from './all';
import { KNOWN_CITY } from './scenarios.city';
import { KNOWN_DRIVING } from './scenarios.driving';
import { KNOWN_PARKING } from './scenarios.parking';
import { KNOWN_TURNS } from './scenarios.turns';
import type { KnownSets } from './known';
import { CATALOGUE } from './catalogue';
import type { MotionSwitches } from '../../src/sim/switches';


/** November 27, step 2 phase A (moving cars on the vehicle model): where each scenario stands (counts per rule, expectations that fail). */
const KNOWN_CORE: KnownSets = {
  defaults: {
    'park.kerb.parallel-traffic': { counts: {'too fast on a curve (moving)': 10, 'reverse too fast (manoeuvre)': 79, 'too fast on a curve (manoeuvre)': 21, 'jumps (manoeuvre)': 8, 'bodies overlap (manoeuvre)': 1}, failing: ['B is through by 20 s', 'A breaks no motion rule'] },
    'park.forecourt.far-lane': { counts: {'jumps (manoeuvre)': 29, 'too fast on a curve (manoeuvre)': 2, 'reverse too fast (manoeuvre)': 6, 'crosses a kerb (manoeuvre)': 2}, failing: ['A breaks no motion rule'] },
    'park.carpark.gate-aisle': { counts: {'too fast on a curve (manoeuvre)': 75, 'jumps (manoeuvre)': 31, 'bodies overlap (manoeuvre)': 1, 'cuts across without a gap (manoeuvre)': 1, 'reverse too fast (manoeuvre)': 73, 'crosses a kerb (manoeuvre)': 1}, failing: ['A breaks no motion rule'] },
    'drive.cross.right': { counts: {}, failing: [] },
    'drive.roundabout.exits': { counts: {'bodies overlap (moving)': 1}, failing: ['C is through by 26 s', 'C breaks no motion rule'] },
    'park.double.park-leave': { counts: {'bodies overlap (moving)': 5, 'jumps (manoeuvre)': 81, 'bodies overlap (manoeuvre)': 11, 'too fast on a curve (manoeuvre)': 16, 'reverse too fast (manoeuvre)': 16, 'crosses a kerb (manoeuvre)': 4, 'too tight (manoeuvre)': 2, 'cuts across without a gap (manoeuvre)': 1}, failing: ['A breaks no motion rule'] },
  },
  on: {
    'park.kerb.parallel-traffic': { counts: {'cuts across without a gap (manoeuvre)': 2}, failing: ['B is through by 20 s', 'A breaks no motion rule'] },
    'park.forecourt.far-lane': { counts: {'crosses a kerb (manoeuvre)': 1}, failing: ['A leaves and is gone by 36 s', 'A breaks no motion rule'] },
    'park.carpark.gate-aisle': { counts: {'crosses a kerb (manoeuvre)': 1, 'jumps (manoeuvre)': 1}, failing: ['A leaves and is gone by 36 s', 'A breaks no motion rule'] },
    'drive.cross.right': { counts: {}, failing: [] },
    'drive.roundabout.exits': { counts: {'bodies overlap (moving)': 1}, failing: ['C is through by 26 s', 'C breaks no motion rule'] },
    'park.double.park-leave': { counts: {'bodies overlap (moving)': 1, 'bodies overlap (manoeuvre)': 2}, failing: ['A breaks no motion rule'] },
  },
};

const GROUP_KNOWN: readonly KnownSets[] = [KNOWN_CORE, KNOWN_PARKING, KNOWN_DRIVING, KNOWN_CITY, KNOWN_TURNS];
const KNOWN: KnownSets = {
  defaults: Object.assign({}, ...GROUP_KNOWN.map((k) => k.defaults)),
  on: Object.assign({}, ...GROUP_KNOWN.map((k) => k.on)),
};

const SETS: readonly { readonly name: 'defaults' | 'on'; readonly switches: MotionSwitches }[] = [
  { name: 'defaults', switches: { PLANNED_TIMES: false, ROOMY_CORNERS: false, GAP_ACCEPT: false, ROAD_STOPS: false, HONEST_SWINGS: false } },
  { name: 'on', switches: { PLANNED_TIMES: true, ROOMY_CORNERS: true, GAP_ACCEPT: true, ROAD_STOPS: true, HONEST_SWINGS: true } },
];

const strict = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.MOTION_STRICT;

describe('motion lab scenarios (the real city, sampled as drawn)', () => {
  for (const set of SETS) {
    describe(`switches ${set.name}`, () => {
      for (const s of SCENARIOS) {
        it(`${s.id}: ${s.expect}`, () => {
          const r = runScenario(s, set.switches);
          expect(r.frames).toBeGreaterThan(100);
          const failing = r.expectations.filter((e) => !e.ok).map((e) => `${e.name} [${e.detail}]`);
          if (strict) { expect({ counts: r.counts, failing }).toEqual({ counts: {}, failing: [] }); return; }
          const known = KNOWN[set.name][s.id] ?? { counts: {}, failing: [] };
          const over = Object.entries(r.counts).filter(([rule, n]) => n > (known.counts[rule] ?? 0)).map(([rule, n]) => `${rule}: ${n} > ${known.counts[rule] ?? 0}`);
          expect(over).toEqual([]);
          const newly = failing.filter((f) => !known.failing.some((k) => f.startsWith(`${k} [`)));
          expect(newly).toEqual([]);
        }, 10_000);
      }
    });
  }
  const todo = CATALOGUE.filter((k) => !SCENARIOS.some((s) => s.id === k.id));
  if (todo.length > 0) describe('the rest of the catalogue', () => { for (const k of todo) it.todo(`${k.id}: ${k.expect}`); });
  it('every scenario is in the catalogue, once', () => {
    const ids = new Set(CATALOGUE.map((k) => k.id));
    expect(SCENARIOS.map((s) => s.id).filter((id) => !ids.has(id))).toEqual([]);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });
});
