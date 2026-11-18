import type { DailyDay, DailyHost, DailyPlay, DailyStanding, KeyValueStore } from '@16bitink/game-sdk';
import { SAMPLES, sampleOn } from './samples';

/**
 * The dev harness's DailyHost: hand-written sample days (samples.ts) served
 * as JSON, as the website would; plays kept in localStorage; a made-up
 * standing. `?hunt=xmas` picks which sample is today's (ice, xmas, rival,
 * golden, newyear: earlier days take the next ones round the list), and
 * `?beat=75` opens today's hunt as a challenge with 75 s to beat.
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
  const first = Math.max(0, SAMPLES.findIndex((s) => s.key === params.get('hunt')));
  const today = (): string => localDate(new Date());
  const beat = Number(params.get('beat'));
  return {
    today,
    async load(date) {
      if (date > today()) throw new Error('future days are never served');
      if (date !== today() && !owned) throw new Error('past days are for owners');
      const level = sampleOn(date, today(), first);
      if (!level) throw new Error(`no sample for ${date}`);
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
    challengeLink: (date, seconds) => `${location.origin}${location.pathname}?beat=${seconds}#${date}`,
    ...(beat > 0 ? { challenge: { date: today(), seconds: beat } } : {}),
  };
}
