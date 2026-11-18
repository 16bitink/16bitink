import { describe, expect, it } from 'vitest';
import { SAMPLES } from '../dev/daily/samples';
import { dailyDate, dailyId, DAILY_RULES, RULE_INFO, ruleLine } from '../src/level/daily';
import { placeOf } from '../src/level/levels';
import { parseLevel } from '../src/level/validate';
import { EVENT_SNAKES, relativeOf, SNAKE_SPECS } from '../src/logic/species';
import { ABILITIES } from '../src/logic/abilities/index';
import { botPlace } from './bot';

const DATE = '2026-12-24';
const days = SAMPLES.map((s) => s.make(DATE));
const json = (v: unknown): Record<string, unknown> => JSON.parse(JSON.stringify(v)) as Record<string, unknown>;
const base = (): Record<string, unknown> => json(days[0]);

describe('daily level fields', () => {
  it('names daily ids by date', () => {
    expect(dailyId(DATE)).toBe('daily-2026-12-24');
    expect(dailyDate('daily-2026-12-24')).toBe(DATE);
    expect(dailyDate('farm-1')).toBeNull();
  });

  it('every sample day survives the validator unchanged', () => {
    for (const d of days) expect(parseLevel(json(d))).toEqual(json(d));
  });

  it('reads the place from the level first, for the game and the bot', () => {
    const reef = days.find((d) => d.place === 'reef')!;
    expect(placeOf(reef)).toBe('reef');
    expect(botPlace(reef)).toBe('reef');
    expect(placeOf('farm-3')).toBe('farm');
  });

  it('refuses unknown or malformed daily fields', () => {
    const bad: Record<string, unknown>[] = [
      { place: 'moon' }, { season: 'monsoon' }, { rule: 'lava' }, { event: 'birthday' }, { snake: 'dragon' },
      { treats: { kind: 'bug', count: 3 } }, { treats: { kind: 'cookie', count: 0 } }, { treats: { kind: 'cookie', count: 2.5 } },
      { goal: { kind: 'golden', count: 0 } }, { goal: { kind: 'golden', count: 11 } },
      { goal: { kind: 'feast', food: 'cookie', count: 5 } },
      { tomorrow: { place: 'farm', snake: 'corn', rule: 'nope' } }, { tomorrow: { place: 'farm', snake: 'corn', rule: 'ice', event: 'x' } },
      { id: 'daily-2026-02-30' }, { id: 'daily-tomorrow' },
    ];
    for (const patch of bad) expect(() => parseLevel({ ...base(), ...patch }), JSON.stringify(patch)).toThrow();
  });

  it('lets a feast ask for the day\'s treats only when they are on the board', () => {
    const l = parseLevel({ ...base(), treats: { kind: 'cookie', count: 3 }, goal: { kind: 'feast', food: 'cookie', count: 5 } });
    expect(l.goal).toEqual({ kind: 'feast', food: 'cookie', count: 5 });
    expect(() => parseLevel({ ...base(), treats: { kind: 'heart', count: 3 }, goal: { kind: 'feast', food: 'cookie', count: 5 } })).toThrow();
  });

  it('drops fields it does not know', () => {
    expect(parseLevel({ ...base(), secret: 1 })).not.toHaveProperty('secret');
  });

  it('words every rule', () => {
    for (const r of DAILY_RULES) expect(ruleLine(r).length).toBeGreaterThan(2);
    expect(ruleLine('ice')).toBe('Ice: you slide when you turn');
    expect(RULE_INFO.night.engine).toBe(false);
  });

  it('gives every event snake a spec and its relative\'s ability', () => {
    for (const id of EVENT_SNAKES) {
      expect(SNAKE_SPECS[id].latin).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
      expect(ABILITIES[id] === ABILITIES[relativeOf(id)]).toBe(true);
    }
    expect(ABILITIES.goldentree).toBeDefined();
    expect(ABILITIES.candycane).toBeUndefined();
  });
});
