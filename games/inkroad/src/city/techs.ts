import type { TechDef } from '../sim/types';
import type { City } from './state';
import { openPolicies, openTools } from './state';

/** Every technology changes something you can feel the next morning. */
export const TECHS: readonly TechDef[] = [
  { id: 'smart', name: 'Smart signals', text: 'A new junction control that watches the queues and shares the green itself.', icon: 'smart_signals' },
  { id: 'tow', name: 'Tow trucks', text: 'Double-parked and broken cars are gone in half the time.', icon: 'tow_trucks' },
  { id: 'app', name: 'Parking app', text: 'Drivers see free spaces, so they circle far less.', icon: 'parking_app' },
  { id: 'forecast', name: 'Traffic forecast', text: 'More people leave a little later when the peak looks bad.', icon: 'traffic_forecast' },
  { id: 'stagger', name: 'Staggered hours', text: 'Offices and schools start at different times. The peaks get flatter.', icon: 'staggered_hours' },
  { id: 'schoolbus', name: 'School buses', text: 'Six in ten pupils stop coming by car.', icon: 'school_buses' },
  { id: 'scancars', name: 'Scan cars', text: 'Every inspector counts double.', icon: 'scan_car' },
  { id: 'quiet', name: 'Quiet asphalt', text: 'Roads hum 40 in 100 less.', icon: 'quiet_asphalt' },
  { id: 'precast', name: 'Night crews', text: 'Works take half as long, and flyovers cost 15 in 100 less.', icon: 'night_works' },
  { id: 'electric', name: 'Electric buses', text: 'Buses and trams cost a third less to run.', icon: 'electric_buses' },
  { id: 'tap', name: 'Ride app', text: 'Faster boarding and a fifth more from fares.', icon: 'park_and_ride_app' },
  { id: 'bigbus', name: 'Express buses', text: 'Every bus and tram carries half as many again.', icon: 'express_bus' },
  { id: 'drones', name: 'Drone patrol', text: 'Drones hum over the kerbs. A third fewer dare to double-park.', icon: 'drone_patrol' },
  { id: 'doorstep', name: 'Doorstep permits', text: 'Homes find room for four cars in ten more.', icon: 'resident_permits' },
];
const CHOICES = 3;
/** Smart signals are on the table every year from here on, until taken. */
const SMART_FROM = 4;

/** Only what the player can already use. */
function useful(c: City, id: string): boolean {
  const tools = openTools(c);
  if (id === 'scancars') return openPolicies(c).includes('inspectors');
  if (id === 'app') return tools.includes('parking') || tools.includes('kerb');
  if (id === 'tap' || id === 'bigbus' || id === 'electric') return tools.includes('bus') || tools.includes('tram');
  if (id === 'drones' || id === 'doorstep') return c.year >= 2;
  if (id === 'precast') return tools.includes('flyover');
  if (id === 'smart') return c.year >= 2;
  return true;
}

/** Three to choose from, at a year's end. */
export function offerTechs(c: City): readonly string[] {
  const must = c.year >= SMART_FROM && !c.techs.includes('smart') ? ['smart'] : [];
  let pool = TECHS.map((t) => t.id).filter((id) => !c.techs.includes(id) && !must.includes(id) && useful(c, id));
  const out: string[] = [...must];
  while (out.length < CHOICES && pool.length > 0) {
    const id = c.dice.pick(pool);
    out.push(id);
    pool = pool.filter((x) => x !== id);
  }
  return out;
}

export const techById = (id: string): TechDef | undefined => TECHS.find((t) => t.id === id);
