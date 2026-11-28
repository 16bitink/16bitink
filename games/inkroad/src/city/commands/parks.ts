import { refuse, type Refusal } from '../../sim/netGround';
import type { CarPark, CarParkKind } from '../../sim/types';
import { blocksMeet, centreOf, lotRect, vertexInBlock, type Block } from '../geometry';
import { earn } from '../money';
import { blockAccess } from '../net';
import { buildSpots } from '../parking';
import type { City } from '../state';
import { openParks } from '../state';
import { beachServed, sandProblem } from '../rules/beachSites';
import { holdsGround, lotRefusal, parkRefusal, plannedRoads, shownYear } from '../standing';
import { PARKS, REFUND } from '../tune';
import { meetsRoadReserve } from '../validateRoadRoom';
import { landAt, needTool, no, noAt, priced, type Handler } from './shared';

/** Ground the Council needs for its own roads within two years. Roads further ahead buy what stands in their way. */
function plannedRoad(c: City, b: Block): Refusal | null {
  for (const r of plannedRoads(c.def, c.year)) {
    const x = r.cells.find((q) => vertexInBlock(b, q));
    if (x) return refuse(`The Council builds its ${r.type} here in year ${shownYear(c.def, r.year)}`, x);
  }
  return null;
}

function groundProblem(c: City, kind: CarParkKind, b: Block): Refusal | null {
  for (let gx = b.gx; gx <= b.gx + b.w; gx++) {
    for (let gy = b.gy; gy <= b.gy + b.h; gy++) {
      const x = { gx, gy };
      const t = c.net.terrain[gy]?.[gx];
      if (t === undefined) return refuse('That is off the map', x);
      if (t === '~') return refuse('Water: cars float badly', x);
      if (t === '#') return refuse('Rock and old walls: nothing fits here', x);
      if (t === 'p') return refuse('The park is protected', x);
      const sand = t === 'b' ? sandProblem(c, kind, b, x) : null;
      if (sand) return sand;
    }
  }
  return null;
}

function siteProblem(c: City, kind: CarParkKind, b: Block): Refusal | null {
  const ground = groundProblem(c, kind, b);
  if (ground) return ground;
  const lot = c.lots.find((l) => holdsGround(l, c.year) && blocksMeet(l, b));
  if (lot) return lotRefusal(c.def, lot);
  const park = c.parks.find((p) => blocksMeet(p, b));
  if (park) return parkRefusal(park);
  if (meetsRoadReserve(c.def, lotRect(b))) return { why: 'This strip is reserved for a wider road and its sidewalk', at: b };
  for (const r of c.net.roads) {
    const x = r.flyover ? undefined : r.cells.find((q) => vertexInBlock(b, q));
    if (x) return refuse('A road runs here: leave it a cell of room', x);
  }
  return plannedRoad(c, b);
}

export const carPark: Handler<'carPark'> = {
  quote(c, cmd) {
    const closed = needTool(c, 'parking');
    if (closed) return no(closed);
    const p = PARKS[cmd.kind];
    if (!p) return no('Unknown car park');
    if (!openParks(c).includes(cmd.kind)) return no('Not in this year\'s toolbox yet');
    const b: Block = { gx: cmd.at.gx, gy: cmd.at.gy, w: p.w, h: p.h };
    const bad = siteProblem(c, cmd.kind, b);
    if (bad) return noAt(bad);
    if (!blockAccess(c.net, b)) return noAt({ why: 'No road close enough for a way in', at: b });
    const sea = beachServed(c, cmd.kind, b);
    const land = landAt(c, cmd.at) * p.w * p.h * (cmd.kind === 'under' ? 0.4 : 1);
    return priced(c, p.cost, { land, ...(sea ? { note: `Beach parking: ${sea.name}` } : {}) });
  },
  run(c, cmd) {
    const p = PARKS[cmd.kind];
    const block: Block = { gx: cmd.at.gx, gy: cmd.at.gy, w: p.w, h: p.h };
    const park: CarPark = { id: c.nextId, kind: cmd.kind, ...block, spaces: p.spaces, used: 0, access: blockAccess(c.net, block), occupancy: 0, ...(beachServed(c, cmd.kind, block) ? { beach: true } : {}) };
    c.nextId += 1;
    c.parks = [...c.parks, park];
    buildSpots(c);
    return centreOf(block);
  },
};

export const removePark: Handler<'removePark'> = {
  quote: (c, cmd) => (c.parks.some((p) => p.id === cmd.park) ? priced(c, 0) : no('Nothing to remove')),
  run(c, cmd) {
    const park = c.parks.find((p) => p.id === cmd.park)!;
    earn(c, 'grant', Math.round(PARKS[park.kind].cost * REFUND));
    c.parks = c.parks.filter((p) => p.id !== cmd.park);
    buildSpots(c);
    return centreOf(park);
  },
};
