/**
 * The site's shared calendar for daily levels (see docs/daily-playbook.md):
 * meteorological seasons for the northern hemisphere, and the event days
 * every game's daily follows. Dates are local calendar dates, YYYY-MM-DD.
 * Dates that move each year (Lunar New Year, Easter, Diwali) come from
 * MOVING_DATES: add a year's dates at least 90 days ahead (a test checks).
 */

export const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const;
export type Season = (typeof SEASONS)[number];

export const EVENT_IDS = [
  'newYear', 'lunarNewYear', 'valentines', 'wildlifeDay', 'stPatricks', 'easter', 'earthDay', 'oceansDay',
  'snakeDay', 'catDay', 'halloween', 'diwali', 'christmasEve', 'christmas', 'boxingDay', 'newYearsEve',
] as const;
export type EventId = (typeof EVENT_IDS)[number];

export interface EventInfo {
  /** As players read it: "Christmas Eve". */
  readonly name: string;
  /** The theme in a few words, for the games' looks. */
  readonly theme: string;
}

export const EVENTS: Readonly<Record<EventId, EventInfo>> = {
  newYear: { name: "New Year's Day", theme: 'fireworks at night, confetti' },
  lunarNewYear: { name: 'Lunar New Year', theme: 'red lanterns, gold, red envelopes' },
  valentines: { name: "Valentine's Day", theme: 'hearts, pink and red' },
  wildlifeDay: { name: 'World Wildlife Day', theme: 'animals from every place on one board' },
  stPatricks: { name: "St Patrick's Day", theme: 'green, clovers, gold coins' },
  easter: { name: 'Easter', theme: 'painted eggs, spring blossom' },
  earthDay: { name: 'Earth Day', theme: 'flowers bloom where you go' },
  oceansDay: { name: 'World Oceans Day', theme: 'the sea' },
  snakeDay: { name: 'World Snake Day', theme: 'snakes everywhere' },
  catDay: { name: 'International Cat Day', theme: 'cats' },
  halloween: { name: 'Halloween', theme: 'night, pumpkins, candy, bats' },
  diwali: { name: 'Diwali', theme: 'oil lamps that light as you pass' },
  christmasEve: { name: 'Christmas Eve', theme: 'snow, presents, cookies' },
  christmas: { name: 'Christmas Day', theme: 'snow, presents, candy canes' },
  boxingDay: { name: 'Boxing Day', theme: 'snow, presents, cookies' },
  newYearsEve: { name: "New Year's Eve", theme: 'fireworks at midnight' },
};

/** Events on the same month and day every year, by MM-DD. */
const FIXED: Readonly<Record<string, EventId>> = {
  '01-01': 'newYear',
  '02-14': 'valentines',
  '03-03': 'wildlifeDay',
  '03-17': 'stPatricks',
  '04-22': 'earthDay',
  '06-08': 'oceansDay',
  '07-16': 'snakeDay',
  '08-08': 'catDay',
  '10-30': 'halloween',
  '10-31': 'halloween',
  '12-24': 'christmasEve',
  '12-25': 'christmas',
  '12-26': 'boxingDay',
  '12-31': 'newYearsEve',
};

/** The events whose date moves each year. */
export const MOVING_EVENTS = ['lunarNewYear', 'easter', 'diwali'] as const satisfies readonly EventId[];
export type MovingEvent = (typeof MOVING_EVENTS)[number];

/**
 * Each moving event's date, by year. Fact-checked 2026-11-18 for 2027 and
 * 2028 (docs/inksnake-daily.md). Diwali 2028 is still to add (needed by
 * early October 2027).
 */
export const MOVING_DATES: Readonly<Record<number, Partial<Record<MovingEvent, string>>>> = {
  2026: { lunarNewYear: '2026-02-17', easter: '2026-04-05', diwali: '2026-11-08' },
  2027: { lunarNewYear: '2027-02-06', easter: '2027-03-28', diwali: '2027-10-29' },
  2028: { lunarNewYear: '2028-01-26', easter: '2028-04-16' },
};

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** Whether `date` is a real calendar date written YYYY-MM-DD. */
export function isDate(date: unknown): date is string {
  if (typeof date !== 'string') return false;
  const m = DATE.exec(date);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

function parts(date: string): { year: number; month: number; day: number } {
  if (!isDate(date)) throw new Error(`bad date ${date}`);
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) };
}

/** `date` moved by `days` (negative goes back), YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const { year, month, day } = parts(date);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  const p = parts(a);
  const q = parts(b);
  return Math.round((Date.UTC(q.year, q.month - 1, q.day) - Date.UTC(p.year, p.month - 1, p.day)) / DAY_MS);
}

/** The meteorological season (northern hemisphere) of `date`: December–February is winter. */
export function seasonOf(date: string): Season {
  const { month } = parts(date);
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

/** The event on `date`, or null. Throws on a malformed date. */
export function eventOn(date: string): EventId | null {
  const { year } = parts(date);
  const moving = MOVING_DATES[year] ?? {};
  for (const id of MOVING_EVENTS) if (moving[id] === date) return id;
  return FIXED[date.slice(5)] ?? null;
}

/** The next event day from `date` (that day included) within `days` days, or null. */
export function nextEvent(date: string, days: number): { readonly id: EventId; readonly date: string; readonly inDays: number } | null {
  for (let i = 0; i <= days; i++) {
    const d = addDays(date, i);
    const id = eventOn(d);
    if (id) return { id, date: d, inDays: i };
  }
  return null;
}

/** The earliest and latest month-day each moving event can fall on. */
const SPAN: Readonly<Record<MovingEvent, readonly [string, string]>> = {
  lunarNewYear: ['01-21', '02-20'],
  easter: ['03-22', '04-25'],
  diwali: ['10-17', '11-15'],
};

/**
 * The moving events whose date for some year is missing although they could
 * fall between `date` and `days` days after it (empty when the table is ready).
 */
export function missingMovingDates(date: string, days: number): readonly string[] {
  const end = addDays(date, days);
  const out: string[] = [];
  for (let y = parts(date).year; y <= parts(end).year; y++) {
    for (const id of MOVING_EVENTS) {
      const [lo, hi] = SPAN[id];
      if (!MOVING_DATES[y]?.[id] && `${y}-${lo}` <= end && `${y}-${hi}` >= date) out.push(`${id} ${y}`);
    }
  }
  return out;
}
