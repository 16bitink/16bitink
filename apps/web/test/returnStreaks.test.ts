import { describe, expect, it } from 'vitest';
import { ALL_GAMES, currentRun, longestRun, RUN_BUCKETS, streakRows, type PlayerDays } from '../src/lib/returnStreaks';

describe('longestRun', () => {
  it('counts the longest stretch of back-to-back days', () => {
    expect(longestRun([])).toBe(0);
    expect(longestRun(['2026-11-10'])).toBe(1);
    expect(longestRun(['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14', '2026-11-15'])).toBe(3);
  });

  it('ignores order and repeats, and runs across a month end', () => {
    expect(longestRun(['2026-12-01', '2026-11-30', '2026-11-30', '2026-11-29'])).toBe(3);
  });
});

describe('currentRun', () => {
  const days = ['2026-11-14', '2026-11-16', '2026-11-17', '2026-11-18'];

  it('is the run that reaches today', () => {
    expect(currentRun(days, '2026-11-18')).toBe(3);
  });

  it('still counts when the last play was yesterday: today is not over', () => {
    expect(currentRun(days, '2026-11-19')).toBe(3);
  });

  it('is 0 once a whole day has gone by without a play', () => {
    expect(currentRun(days, '2026-11-20')).toBe(0);
    expect(currentRun([], '2026-11-20')).toBe(0);
  });
});

describe('streakRows', () => {
  const rows: PlayerDays[] = [
    { player: 'a', game: 'inkfish', days: ['2026-11-16', '2026-11-17', '2026-11-18'] },
    { player: 'b', game: 'inkfish', days: ['2026-11-01'] },
    { player: 'a', game: 'inksnake', days: ['2026-11-15'] },
    { player: 'c', game: 'inksnake', days: ['2026-11-10', '2026-11-11'] },
  ];
  const today = '2026-11-18';

  it('has a row per game, most players first, after one for all games', () => {
    expect(streakRows(rows, today).map((r) => r.game)).toEqual([ALL_GAMES, 'inkfish', 'inksnake']);
  });

  it('counts players, those who came back on another day, the longest run and runs going now', () => {
    const fish = streakRows(rows, today).find((r) => r.game === 'inkfish');
    expect(fish).toMatchObject({ players: 2, cameBack: 1, longest: 3, going: 1 });
  });

  it('sorts each player into the bucket of their longest run', () => {
    const fish = streakRows(rows, today).find((r) => r.game === 'inkfish');
    expect(RUN_BUCKETS.map((b) => b.label)).toEqual(['1 day', '2 days', '3–6 days', '7–13 days', '14+ days']);
    expect(fish?.buckets).toEqual([1, 0, 1, 0, 0]);
  });

  it('joins a player\'s days across games for the all-games row', () => {
    // a: Nov 15 (snake) runs on into Nov 16–18 (fish): 4 days.
    const all = streakRows(rows, today)[0];
    expect(all).toMatchObject({ game: ALL_GAMES, players: 3, cameBack: 2, longest: 4, going: 1 });
    expect(all?.buckets).toEqual([1, 1, 1, 0, 0]);
  });

  it('a one-day run reaching today is not counted as going: nobody has come back yet', () => {
    const one = streakRows([{ player: 'x', game: 'inkfish', days: [today] }], today);
    expect(one[0]?.going).toBe(0);
  });

  it('is empty without plays', () => {
    expect(streakRows([], today)).toEqual([]);
  });
});
