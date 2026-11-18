import { describe, expect, it } from 'vitest';
import { monthGrid } from '../src/lib/dailyCalendar';
import type { GameDay } from '../src/lib/daily';

describe('monthGrid', () => {
  it('lays November 2026 out in Monday-first weeks (the 1st is a Sunday)', () => {
    const weeks = monthGrid(2026, 10, [], ['inkbrick']);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]!.slice(0, 6).every((c) => c.date === null)).toBe(true);
    expect(weeks[0]![6]).toMatchObject({ date: '2026-11-01', day: 1 });
    expect(weeks.flat().filter((c) => c.date !== null)).toHaveLength(30);
  });
  it('marks played days with their games and late plays', () => {
    const days: GameDay[] = [
      { game: 'inksnake', date: '2026-11-22', result: 'win', late: false, seconds: 40 },
      { game: 'inkbrick', date: '2026-11-22', result: 'win', late: true, seconds: 50 },
    ];
    const cell = monthGrid(2026, 10, days, ['inkbrick', 'inksnake']).flat().find((c) => c.date === '2026-11-22')!;
    expect(cell.games).toEqual([{ game: 'inkbrick', late: true }, { game: 'inksnake', late: false }]);
  });
});
