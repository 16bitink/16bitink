import { describe, expect, it } from 'vitest';
import {
  challengeUrl,
  isBetterPlay,
  mergeDays,
  milestoneStates,
  parseChallenge,
  parseDailyPlay,
  percentBetter,
  toStanding,
  totalDaysPlayed,
  type GameDay,
} from '../src/lib/daily';

const VISITOR = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const play = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({ date: '2026-11-22', result: 'win', seconds: 48.5, breakIn: 12.25, shells: 3, late: false, visitor: VISITOR, ...over });

describe('parseDailyPlay', () => {
  it('accepts a good play', () => {
    expect(parseDailyPlay(play())).toEqual({ date: '2026-11-22', result: 'win', seconds: 48.5, breakIn: 12.25, shells: 3, late: false, visitor: VISITOR });
  });
  it('treats breakIn, late and visitor as optional', () => {
    expect(parseDailyPlay(JSON.stringify({ date: '2026-11-22', result: 'lose', seconds: 9, shells: 0 }))).toEqual({
      date: '2026-11-22', result: 'lose', seconds: 9, shells: 0, late: false,
    });
  });
  it.each([
    ['not json', 'nope'],
    ['an array', '[]'],
    ['a bad date', play({ date: '2026-02-31' })],
    ['a bad result', play({ result: 'draw' })],
    ['negative seconds', play({ seconds: -1 })],
    ['absurd seconds', play({ seconds: 99999 })],
    ['NaN-like seconds', play({ seconds: 'fast' })],
    ['a bad breakIn', play({ breakIn: -3 })],
    ['fractional shells', play({ shells: 1.5 })],
    ['too many shells', play({ shells: 1e9 })],
    ['a non-boolean late', play({ late: 'yes' })],
    ['a short visitor id', play({ visitor: 'abc' })],
    ['a visitor id with odd characters', play({ visitor: 'a1b2c3d4 e5f6!' })],
  ])('rejects %s', (_name, body) => {
    expect(parseDailyPlay(body)).toBeNull();
  });
});

describe('isBetterPlay', () => {
  it('prefers a win to a loss', () => {
    expect(isBetterPlay({ result: 'win', seconds: 99 }, { result: 'lose', seconds: 1 })).toBe(true);
    expect(isBetterPlay({ result: 'lose', seconds: 1 }, { result: 'win', seconds: 99 })).toBe(false);
  });
  it('prefers a faster win', () => {
    expect(isBetterPlay({ result: 'win', seconds: 30 }, { result: 'win', seconds: 40 })).toBe(true);
    expect(isBetterPlay({ result: 'win', seconds: 40 }, { result: 'win', seconds: 40 })).toBe(false);
  });
  it('prefers an earlier break-in between two losses', () => {
    expect(isBetterPlay({ result: 'lose', seconds: 5, breakIn: 3 }, { result: 'lose', seconds: 5, breakIn: 4 })).toBe(true);
    expect(isBetterPlay({ result: 'lose', seconds: 5, breakIn: 3 }, { result: 'lose', seconds: 5 })).toBe(true);
    expect(isBetterPlay({ result: 'lose', seconds: 5 }, { result: 'lose', seconds: 5, breakIn: 4 })).toBe(false);
  });
});

describe('percentBetter', () => {
  it('is the share of the other players behind you', () => {
    expect(percentBetter(3, 5)).toBe(75); // 3 of the 4 others
    expect(percentBetter(0, 5)).toBe(0);
    expect(percentBetter(4, 5)).toBe(100);
    expect(percentBetter(1, 4)).toBe(33);
  });
  it('has no answer when you are the only player', () => {
    expect(percentBetter(0, 1)).toBeUndefined();
    expect(percentBetter(0, 0)).toBeUndefined();
  });
  it('stays within 0-100 whatever the counts', () => {
    expect(percentBetter(50, 5)).toBe(100);
    expect(percentBetter(-2, 5)).toBe(0);
  });
});

describe('toStanding', () => {
  const counts = { players: 5, withBreakIn: 5, slowerBreakIn: 3, wins: 4, slowerWins: 1 };
  it('reports both percentiles for a winning play with a break-in', () => {
    expect(toStanding({ result: 'win', seconds: 40, breakIn: 10 }, counts)).toEqual({ players: 5, breakInBetterThan: 75, clearBetterThan: 33 });
  });
  it('leaves out the clear time for a loss', () => {
    expect(toStanding({ result: 'lose', seconds: 40, breakIn: 10 }, counts)).toEqual({ players: 5, breakInBetterThan: 75 });
  });
  it('leaves out the break-in for a play that never broke in', () => {
    expect(toStanding({ result: 'win', seconds: 40 }, counts)).toEqual({ players: 5, clearBetterThan: 33 });
  });
  it('gives only the count when alone', () => {
    expect(toStanding({ result: 'win', seconds: 40, breakIn: 10 }, { players: 1, withBreakIn: 1, slowerBreakIn: 0, wins: 1, slowerWins: 0 })).toEqual({ players: 1 });
  });
});

const day = (game: string, date: string, over: Partial<GameDay> = {}): GameDay => ({ game, date, result: 'win', late: false, seconds: 50, ...over });

describe('days', () => {
  it('counts each date once across games, never consecutive', () => {
    expect(totalDaysPlayed([day('inkbrick', '2026-11-22'), day('inksnake', '2026-11-22'), day('inkbrick', '2026-11-25')])).toBe(2);
    expect(totalDaysPlayed([])).toBe(0);
  });
  it('merges lists keeping the better play and only calling a day late when all plays were', () => {
    const merged = mergeDays([day('inkbrick', '2026-11-23', { seconds: 60, late: true })], [day('inkbrick', '2026-11-23', { seconds: 40, late: true }), day('inkbrick', '2026-11-22')]);
    expect(merged.map((d) => d.date)).toEqual(['2026-11-22', '2026-11-23']);
    expect(merged[1]).toMatchObject({ seconds: 40, late: true });
    expect(mergeDays([day('inkbrick', '2026-11-23', { late: true })], [day('inkbrick', '2026-11-23', { seconds: 70 })])[0]!.late).toBe(false);
  });
});

describe('milestoneStates', () => {
  it('marks stamps earned and names the next', () => {
    const { states, next } = milestoneStates(7);
    expect(states.map((s) => [s.days, s.earned])).toEqual([[3, true], [7, true], [14, false], [30, false], [50, false], [100, false]]);
    expect(next).toBe(14);
  });
  it('has nothing next once every stamp is earned', () => {
    expect(milestoneStates(100).next).toBeNull();
    expect(milestoneStates(0).next).toBe(3);
  });
});

describe('challenge links', () => {
  it('round-trips', () => {
    const url = challengeUrl('https://16bit.ink', 'inkbrick', '2026-11-22', 48.456);
    expect(url).toBe('https://16bit.ink/play/inkbrick?challenge=2026-11-22:48.46');
    expect(parseChallenge(new URL(url).search)).toEqual({ date: '2026-11-22', seconds: 48.46 });
  });
  it.each(['', '?challenge=', '?challenge=2026-11-22', '?challenge=2026-02-31:40', '?challenge=2026-11-22:-4', '?challenge=2026-11-22:0', '?challenge=2026-11-22:abc', '?challenge=2026-11-22:99999999'])(
    'ignores %j',
    (q) => expect(parseChallenge(q)).toBeUndefined(),
  );
});
