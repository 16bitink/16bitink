import type { CityDef } from '../../sim/types';
import { createCity } from '../city';
import type { CitySave } from '../save';
import type { Bot } from './tools';
import { playYear } from './play';

/** The last day's inner numbers, a line a year: for tuning. */
export function probe(def: CityDef, seed: number, bot: Bot, to: number): readonly string[] {
  const city = createCity(def, seed);
  const out: string[] = [];
  while (city.phase === 'yearStart' && city.year <= to) {
    const year = city.year;
    playYear(city, bot, 0);
    const s = city.save() as CitySave;
    const r = s.report!;
    const found = Object.entries(r.found).filter(([k]) => k.startsWith('kind:')).map(([k, v]) => `${k.slice(5, 9)} ${(v * 100).toFixed(0)}`).join(' ');
    out.push(`Y${year} legs ${r.count} lost ${r.gaveUp} stay ${r.stayed} bus ${(r.transit * 100).toFixed(0)}% dbl ${r.doubled} fined ${r.fined} ratio ${r.meanRatio.toFixed(2)} exp ${s.expect.trip.toFixed(2)} secs ${r.meanSeconds.toFixed(1)} pay ${r.meanPay.toFixed(2)}/${s.expect.pay.toFixed(2)} onTime ${(r.onTime * 100).toFixed(0)} own ${s.ownership.toFixed(2)} | ${found}`);
  }
  return out;
}
