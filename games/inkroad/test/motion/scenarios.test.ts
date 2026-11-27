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
import { KNOWN_NOW as KNOWN } from './knownNow';
import { CATALOGUE } from './catalogue';
import type { MotionSwitches } from '../../src/sim/switches';


const SETS: readonly { readonly name: 'defaults' | 'on'; readonly switches: MotionSwitches }[] = [
  { name: 'defaults', switches: { ROOMY_CORNERS: false, GAP_ACCEPT: false } },
  { name: 'on', switches: { ROOMY_CORNERS: true, GAP_ACCEPT: true } },
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
