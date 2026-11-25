/** What the desk shows for each city before its content is loaded. */
export type CityStatus = 'free' | 'paid' | 'soon';
export interface CityMeta { readonly no: 1 | 2 | 3 | 4 | 5; readonly name: string; readonly blurb: string; readonly status: CityStatus }

export const CITY_META: readonly CityMeta[] = [
  { no: 1, name: 'Saffron Bay', blurb: 'A young desert port. Cheap land, wide roads, and everyone drives.', status: 'free' },
  { no: 2, name: 'Old Harbour', blurb: 'An old stone town. Streets cannot be widened, so think trams, permits and a very tense vote.', status: 'paid' },
  { no: 3, name: 'Twin Isles', blurb: 'Rich islands with almost no land. Tunnels, and tolls that follow the speed.', status: 'paid' },
  { no: 4, name: 'Seven Hills', blurb: 'A huge hilly strait. Two bridges, ferries and minibuses with opinions.', status: 'soon' },
  { no: 5, name: 'Cross Rivers', blurb: 'An ageing freeway city. Everything needs repair, and one freeway may have to go.', status: 'soon' },
];

/**
 * What a city card shows. Owners have the content: a city is playable when the content holds it, whatever this table hoped for.
 * Everyone else sees what the table says (Seven Hills and Cross Rivers are still coming).
 */
export function statusOf(m: CityMeta, loaded: readonly number[], owned: boolean): CityStatus {
  if (m.status === 'free') return 'free';
  if (!owned) return m.status;
  return loaded.includes(m.no) ? 'paid' : 'soon';
}

/** Saffron Bay's year names, for stamps before its content loads. */
export const SAFFRON_YEARS: readonly string[] = [
  'The Roundabout', 'No Space at the Market', 'The Fine Print', 'Office Hours', 'The Red Lane', 'Over the Top', 'The Second Bridge', 'Mall Season', 'The Green Line', 'The Grand Fair',
];
