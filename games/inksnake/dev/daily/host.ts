import type { DailyDay, DailyHost, DailyPlay, DailyStanding, KeyValueStore } from '@16bitink/game-sdk';
import { inksnakeDaily } from '../../content/daily';
import { SAMPLES, sampleOn } from './samples';

/**
 * The dev harness's DailyHost, as the website serves it: the real frozen days
 * (content/daily) for dates that have one and nothing for the rest (so
 * before the first hunt the archive is empty); plays kept in localStorage; a
 * made-up standing. `?date=2026-12-24` pretends that is today (default: the
 * real local date; with no frozen day for it, today has no hunt, as on the
 * site). `?hunt=ice|xmas|rival|golden|newyear` serves the hand-written
 * samples instead (earlier days take the next ones round the list), each
 * stamped for the date it is served for. `?beat=75` opens today's hunt as a
 * challenge with 75 s to beat.
 */
const KEY = 'inksnake.dev.daily.v1';

const localDate = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function readDays(store: KeyValueStore): DailyDay[] {
  try {
    return JSON.parse(store.getItem(KEY) ?? '[]') as DailyDay[];
  } catch {
    return [];
  }
}

export function devDailyHost(store: KeyValueStore, search: string, owned: boolean): DailyHost {
  const params = new URLSearchParams(search);
  const hunt = SAMPLES.findIndex((s) => s.key === params.get('hunt'));
  const pretend = params.get('date');
  const now = pretend && /^\d{4}-\d{2}-\d{2}$/.test(pretend) ? pretend : localDate(new Date());
  const today = (): string => now;
  const beat = Number(params.get('beat'));
  return {
    today,
    async load(date) {
      if (date > today()) throw new Error('future days are never served');
      if (date !== today() && !owned) throw new Error('past days are for owners');
      const level = hunt >= 0 ? sampleOn(date, today(), hunt) : inksnakeDaily(date);
      if (!level) throw new Error(`no hunt for ${date}`);
      return JSON.parse(JSON.stringify(level)) as unknown;
    },
    async record(play: DailyPlay): Promise<DailyStanding> {
      const days = readDays(store).filter((d) => d.date !== play.date);
      store.setItem(KEY, JSON.stringify([...days, { date: play.date, result: play.result, late: play.date !== today(), seconds: play.seconds }].sort((a, b) => a.date.localeCompare(b.date))));
      return { players: 37, ...(play.result === 'win' ? { clearBetterThan: Math.max(5, Math.min(95, Math.round(100 - play.seconds))) } : {}) };
    },
    history: async () => readDays(store),
    // ?days=6 pretends six more days were played elsewhere (to see a milestone).
    totalDays: async () => readDays(store).length + (Number(params.get('days')) || 0),
    challengeLink: (date, seconds) => `${location.origin}${location.pathname}?${pretend ? `date=${pretend}&` : ''}beat=${seconds}#${date}`,
    ...(beat > 0 ? { challenge: { date: today(), seconds: beat } } : {}),
  };
}
