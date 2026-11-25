import { describe, expect, it } from 'vitest';
import type { GameEvent } from '@16bitink/game-sdk';
import { Tracker } from '../src/app/tracker';

describe('tracker', () => {
  it('numbers levels by city and year and ends each once', () => {
    const got: GameEvent[] = [];
    const t = new Tracker((e) => got.push(e));
    t.start(t.ref(2, 3, 'Test'));
    t.tick(12.4);
    t.end('win', 3);
    t.end('lose');
    t.leave();
    expect(got.map((e) => e.type)).toEqual(['level_start', 'level_end']);
    expect(got[0]).toMatchObject({ level: '13', n: 13 });
    expect(got[1]).toMatchObject({ result: 'win', seconds: 12, score: 3 });
  });
  it('reports quit when a new year starts over an open one, and survives a throwing sink', () => {
    const got: GameEvent[] = [];
    const t = new Tracker((e) => got.push(e));
    t.start(t.ref(1, 1, 'A'));
    t.start(t.ref(1, 2, 'B'));
    expect(got.map((e) => (e.type === 'level_end' ? e.result : e.type))).toEqual(['level_start', 'quit', 'level_start']);
    expect(() => new Tracker(() => { throw new Error('x'); }).start(t.ref(1, 1, 'A'))).not.toThrow();
  });
});
