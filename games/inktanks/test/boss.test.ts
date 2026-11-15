import { describe, expect, it } from 'vitest';
import { ch1Level } from '../src/content/ch1/levels';
import type { BossDef } from '../src/logic/level/types';
import { Match } from '../src/logic/match/match';
import { BOSS_BODY } from '../src/logic/objectives/combat';
import { STARTER_LOADOUT } from '../src/logic/parts';
import { bossArt } from '../src/render/tankView';
import { WORLD } from '../src/art/pixel/world/world';
import { fixture, load } from './fixtures/levels';

const boss = (b: Partial<BossDef>) => {
  const def: BossDef = { name: 'Crawler', hp: 900, speed: 20, road: 'line', turrets: [{ gun: 'mortar', dx: 0, dy: 30, hp: 150 }, { gun: 'machinegun', dx: 40, dy: 0, hp: 120 }], ...b };
  const m = new Match({ level: load(fixture({ kind: 'fortress', boss: def })), seed: 1, player: { loadout: STARTER_LOADOUT } });
  return { m, body: m.tanks.find((t) => t.role === 'boss')! };
};

describe('bosses', () => {
  it('level 10 keeps the Iron Sow: the fortress body, Boars, radius 70, armour 14', () => {
    const m = new Match({ level: ch1Level(10), seed: 1, player: { loadout: STARTER_LOADOUT } });
    const b = m.tanks.find((t) => t.role === 'boss')!;
    expect([b.body, b.clan, b.stats.radius, b.stats.armour]).toEqual(['fortress', 'boars', BOSS_BODY.radius, BOSS_BODY.armour]);
  });
  it('a BossDef can bring its own body art, clan, size and a Mortar turret', () => {
    const { m, body } = boss({ body: 'sandCrawler', clan: 'crows', radius: 80, armour: 16 });
    expect([body.body, body.clan, body.stats.radius, body.stats.armour]).toEqual(['sandCrawler', 'crows', 80, 16]);
    const turrets = m.tanks.filter((t) => t.parent === body.id);
    expect(turrets.map((t) => t.loadout.gun.family)).toEqual(['mortar', 'machinegun']);
    expect(turrets.every((t) => t.clan === 'crows')).toBe(true);
  });
  it('a body without art yet draws as the fortress', () => {
    expect(bossArt('fortress')).toBe(WORLD.vehicles.fortress);
    expect(bossArt('noSuchBody').body).toBe(WORLD.vehicles.fortress.body);
  });
});
