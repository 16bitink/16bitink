import { describe, expect, it } from 'vitest';
import { parseTank } from '../src/logic/level/load';
import { Match } from '../src/logic/match/match';
import { labLevel } from '../src/sim/levels';

describe('boss turret wrecks', () => {
  it("a destroyed turret stays on its mount and rides with the hull (level 20's Sand Crawler)", () => {
    const m = new Match({ level: labLevel(20), seed: 1, player: { loadout: parseTank('cannon2/medium2/halftracks2'), kits: 2 } });
    const body = m.tanks.find((t) => t.role === 'boss')!;
    const turret = m.tanks.find((t) => t.role === 'bossTurret' && t.parent === body.id)!;
    turret.hp = 0;
    turret.alive = false;
    const start = { x: body.x, y: body.y };
    for (let i = 0; i < 30 * 8; i++) m.step(1 / 30);
    expect(Math.hypot(body.x - start.x, body.y - start.y)).toBeGreaterThan(40);
    const c = Math.cos(body.heading);
    const s = Math.sin(body.heading);
    expect(turret.x).toBeCloseTo(body.x + turret.mount!.dx * c - turret.mount!.dy * s, 3);
    expect(turret.y).toBeCloseTo(body.y + turret.mount!.dx * s + turret.mount!.dy * c, 3);
    expect(turret.heading).toBeCloseTo(body.heading, 6);
  });
});
