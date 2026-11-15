import { describe, expect, it } from 'vitest';
import { Match } from '../src/logic/match/match';
import { matchReport } from '../src/logic/match/report';
import { prizeGoal, prizePickup } from '../src/logic/match/prize';
import { applyOutcome } from '../src/logic/mission/outcome';
import { parseTank } from '../src/logic/level/load';
import { grantFamily, newProgress } from '../src/logic/workshop';
import { labLevel } from '../src/sim/levels';

const tank = parseTank('cannon2/medium2/halftracks2');
const level21 = () => new Match({ level: labLevel(21), seed: 1, player: { loadout: tank, kits: 2 }, playerBot: true });

describe("a level's prize (level 21's Hover)", () => {
  it('level 21 no longer fits a Hover for you: you start on your own drive', () => {
    const m = level21();
    expect(m.player!.loadout.drive.family).toBe('halftracks');
    expect(prizePickup(m, m.player!)).not.toBeNull();
    expect(prizeGoal(m, m.player!)!.text).toMatch(/Hover/);
  });

  it('the stand-in takes the Hover, and fitting it unlocks Hover in the workshop', () => {
    const m = level21();
    for (let i = 0; i < 30 * 20 && m.player!.loadout.drive.family !== 'hover'; i++) m.step(1 / 30);
    expect(m.player!.loadout.drive.family).toBe('hover');
    expect(prizePickup(m, m.player!)).toBeNull();
    const before = newProgress();
    expect(before.unlocked).not.toContain('hover');
    const { progress, outcome } = applyOutcome(before, m.level.def, matchReport(m));
    expect(outcome.prize).toBe('hover');
    expect(progress.unlocked).toContain('hover');
    expect(progress.mk.hover).toBe(1);
  });

  it('a run that never fits it unlocks nothing', () => {
    const m = new Match({ level: labLevel(21), seed: 1, player: { loadout: tank, kits: 2 } });
    m.step(1 / 30);
    const { progress, outcome } = applyOutcome(newProgress(), m.level.def, matchReport(m));
    expect(outcome.prize).toBeNull();
    expect(progress.unlocked).not.toContain('hover');
  });

  it('granting a family already unlocked keeps its Mk', () => {
    const p = { ...grantFamily(newProgress(), 'hover') };
    const raised = { ...p, mk: { ...p.mk, hover: 3 as const } };
    expect(grantFamily(raised, 'hover').mk.hover).toBe(3);
  });
});
