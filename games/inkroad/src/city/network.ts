import type { Network } from '../sim/trafficTypes';
import { buildSpots } from './parking';
import { refreshAccess } from './places';
import { shapeNet } from './rules/ground';
import type { City } from './state';
import { repairLines, syncServices } from './transit';

/** Take a new road network: driveways, lines, spaces and traffic follow it. */
export function commitNetwork(c: City, next: Network): void {
  const net = shapeNet(c, next);
  if (net === c.net) return;
  c.net = net;
  refreshAccess(c);
  repairLines(c);
  c.traffic.setNetwork(net);
  syncServices(c);
  buildSpots(c);
}

