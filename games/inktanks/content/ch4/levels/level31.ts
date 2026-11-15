import type { LevelDef } from '../../../src/logic/level/types';
import { blob, depot, drifts, each, LOOT_SNOW, patch, path, TANK } from './kit';

/**
 * Level 31, Thin Ice (Breakout): cross the frozen lake to our depot on the
 * far shore before the timer runs out, 4 × 2 screens. The whole lake is ice:
 * every drive slides on it (turn early, brake early). Three leads of open
 * water cut the lake from shore to shore, and each is frozen over only at one
 * end (south, north, south): a bridge of thin ice that carries a Medium but
 * cracks and gives way under a Heavy hull (1.4 s on it, then into the water),
 * and past it a narrow strip of solid shore ice along the map edge, the
 * Heavies' long way round. So the crossing zigzags. The clans have come north
 * together: Boar Heavies hold the shore-ice strips and the solid ice by the
 * bridges (they can't follow you onto thin ice), Weasel skimmers run up and
 * down the open leads, a Crow mortar covers the first bridge, and a Laser the
 * second (its aim line shows before every beam: break the line or keep
 * moving). Our depot's towers cover the landing.
 */
const DEPOT = depot(3420, 540, 300, 240, ['cannon', 'machinegun']);
/** The leads: x of the west bank, width; open water away from their frozen end. */
const LEAD = { w: 140, a: 1150, b: 2000, c: 2800 } as const;
/** Where a lead is bridged: thin ice from `from` to `to` (y), solid shore ice beyond to the map edge. */
const SOUTH = { open: 760, thin: 960 } as const;
const NORTH = { open: 320, thin: 120 } as const;

export const LEVEL_31: LevelDef = {
  id: 'ch4-31', number: 31, name: 'Thin Ice', type: 'breakout',
  briefing: 'Frostridge. The clans have all come north, and our depot is across the frozen lake. Get there before they close the shore. Everything slides on ice: turn early and brake early. Three leads of open water cross the lake, each frozen over at one end by thin ice. It will carry a Medium; under a Heavy it cracks and gives way, so a Heavy must go round by the shore ice. Their Heavies can’t follow you onto it. Watch the Laser by the second bridge: its aim line shows just before it fires.',
  teaches: 'Ice slides every drive; thin ice breaks under Heavies; the Laser’s telegraphed beam; three clans at once',
  map: {
    cols: 4, rows: 2, base: 'snow',
    terrain: [
      // The lake, shore to shore, with its edges broken up by snow banks.
      patch('ice', 600, 0, 2650, 1080),
      blob('snow', 600, 140, 90), blob('snow', 620, 980, 110), blob('snow', 3250, 120, 100), blob('snow', 3240, 960, 90),
      // Lead A (open to the north, bridged in the south), lead B (bridged in the north), lead C (bridged in the south).
      patch('water', LEAD.a, 0, LEAD.w, SOUTH.open), patch('thinIce', LEAD.a - 20, SOUTH.open, LEAD.w + 40, SOUTH.thin - SOUTH.open),
      patch('water', LEAD.b, NORTH.open, LEAD.w, 1080 - NORTH.open), patch('thinIce', LEAD.b - 20, NORTH.thin, LEAD.w + 40, NORTH.open - NORTH.thin),
      patch('water', LEAD.c, 0, LEAD.w, SOUTH.open), patch('thinIce', LEAD.c - 20, SOUTH.open, LEAD.w + 40, SOUTH.thin - SOUTH.open),
      // Islands of frozen ground between the leads.
      blob('frozenDirt', 1620, 620, 110), blob('snow', 2450, 300, 110), blob('frozenDirt', 2470, 820, 90),
      // The tracks to the lake and from it to the depot.
      path('snowTrackH', [{ x: 120, y: 560 }, { x: 600, y: 545 }], 80), path('snowTrackH', [{ x: 3250, y: 540 }, { x: 3700, y: 540 }], 80),
    ],
    structures: [
      // The mortar's island between leads A and B, behind snowdrifts; the Laser's island east of lead B.
      ...drifts(1560, 520, 2), ...each('iceRockB', [[1700, 700]]), { kind: 'firSmall', x: 1580, y: 700 },
      ...drifts(2400, 400, 2), ...each('iceRockA', [[2380, 200], [2560, 240]]), { kind: 'cabinSmall', x: 2500, y: 860 },
      // Ice rocks and huts out on the lake: something to slide round and hide behind.
      ...each('iceRockB', [[900, 300], [1450, 280], [1800, 920], [2300, 620], [3050, 380]]), ...each('iceRockC', [[850, 820], [1400, 960], [2200, 160], [2650, 620], [3100, 820]]),
      { kind: 'signalBox', x: 880, y: 140 }, { kind: 'cabinSmall', x: 3020, y: 140 },
      // The west shore: pines and a frozen fence by the start.
      ...each('snowPine', [[120, 200], [300, 120], [480, 260], [140, 900], [380, 980], [520, 820]]), ...each('firSmall', [[420, 400], [430, 720]]),
      { kind: 'frozenFenceH', x: 300, y: 470 }, { kind: 'frozenFenceH', x: 364, y: 470 },
      // The east shore and our depot.
      ...each('snowPine', [[3330, 160], [3350, 960], [3700, 140], [3760, 940]]), ...each('firSmall', [[3300, 330], [3300, 760]]),
      ...DEPOT.structures, { kind: 'crate', x: 3640, y: 470 },
    ],
    points: {
      start: { x: 220, y: 560 }, exit: { x: 3600, y: 540 },
      mortarIsle: { x: 1620, y: 600 }, laserIsle: { x: 2450, y: 320 },
      // Boars by the bridges and on the shore-ice strips (solid ice: they can't step onto the bridges).
      aWest: { x: 1000, y: 880 }, aStrip: { x: 1220, y: 1030 }, cEast: { x: 3080, y: 860 },
      eastShore: { x: 3150, y: 330 }, waveNE: { x: 3300, y: 60 }, waveSE: { x: 3300, y: 1030 },
    },
    roads: {
      // Skimmers run up and down the open leads.
      leadA: [{ x: LEAD.a + LEAD.w / 2, y: 60 }, { x: LEAD.a + LEAD.w / 2, y: SOUTH.open - 60 }],
      leadB: [{ x: LEAD.b + LEAD.w / 2, y: 1020 }, { x: LEAD.b + LEAD.w / 2, y: NORTH.open + 60 }],
      leadC: [{ x: LEAD.c + LEAD.w / 2, y: 60 }, { x: LEAD.c + LEAD.w / 2, y: SOUTH.open - 60 }],
    },
  },
  start: 'start', startHeading: 0,
  mixedClans: true,
  enemies: [
    // Weasel skimmers up and down the open leads (Hover crosses water).
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer, at: { x: LEAD.a + 70, y: 60 }, route: 'leadA', hpMult: 0.38 },
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer, at: { x: LEAD.b + 70, y: 1020 }, route: 'leadB', hpMult: 0.38 },
    { role: 'patrol', clan: 'weasels', tank: TANK.skimmer, at: { x: LEAD.c + 70, y: 60 }, route: 'leadC', hpMult: 0.38 },
    // Boar Heavies by the bridges and on the shore ice.
    { role: 'guard', clan: 'boars', tank: TANK.boarHeavy, at: 'aWest', hpMult: 0.25, sight: 400, leash: 260 },
    { role: 'guard', clan: 'boars', tank: TANK.boarHeavy, at: 'cEast', hpMult: 0.25, sight: 400, leash: 260 },
    // The Crow mortar covers bridge A; the Laser covers bridge B.
    { role: 'turret', clan: 'crows', tank: TANK.mortar, at: 'mortarIsle', hpMult: 0.28, sight: 480 },
    { role: 'guard', clan: 'crows', tank: TANK.laser, at: 'laserIsle', hpMult: 0.34, sight: 460, leash: 160 },
    { role: 'guard', clan: 'crows', tank: TANK.scout, at: 'eastShore', hpMult: 0.44, sight: 400, leash: 300 },
    // The alarm brings a Weasel skimmer down the east shore; a Boar Heavy comes round the south strip at 0:30.
    { role: 'wave', clan: 'weasels', tank: TANK.skimmer, at: 'waveNE', when: 'alarm', hpMult: 0.38 },
    { role: 'wave', clan: 'boars', tank: TANK.boarHeavy, at: 'waveSE', when: 30, hpMult: 0.28 },
  ],
  allies: DEPOT.allies,
  crates: [{ at: { x: 1680, y: 520 }, content: 'kit' }, { at: { x: 2520, y: 380 }, content: { family: 'laser', mk: 4 } }, { at: { x: 2470, y: 760 } }, { at: { x: 900, y: 420 } }],
  objective: { kind: 'breakout', exit: 'exit', radius: 110, to: 'our depot' },
  bonus: [{ kind: 'time', under: 50 }, { kind: 'kills', n: 3 }],
  timeLimit: 75,
  loot: LOOT_SNOW,
};
