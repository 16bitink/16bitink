import type { Network } from '../sim/trafficTypes';
import { standPose } from './movePlan';
import { buildSpots } from './parking';
import { refreshAccess } from './places';
import { shapeNet } from './rules/ground';
import type { City } from './state';
import { repairLines, syncServices } from './transit';

/** Take a new road network: driveways, lines, spaces and traffic follow it. */
export function commitNetwork(c: City, next: Network): void {
  const net = shapeNet(c, next);
  if (net === c.net) return;
  captureParkedPoses(c);
  c.net = net;
  refreshAccess(c);
  repairLines(c);
  c.traffic.setNetwork(net);
  syncServices(c);
  buildSpots(c);
}

/** Keep parked cars where they are while parking layouts are rebuilt. */
export function captureParkedPoses(c: City): void {
  for (const spot of c.day.spots.values()) {
    for (const e of spot.cars) if (!e.stood) e.stood = standPose(c, e) ?? undefined;
    spot.ver++;
  }
  c.day.parkingDirty = true;
  c.day.parkingNow = true;
}
