/**
 * Shells: the layouts' stone (the hard start), the areas the fill goes into (the payoff), and the
 * outside field around them (something to break on every return, a packed board). Every shell is
 * centred (mirror-symmetric) except its hole, and no hole sits on the straight launch line
 * (x = 18, the stone's starting column).
 */
import { INSIDE_PROBE } from '../sim/constants';
import { shell, stone } from '../sim/kit';
import { pick, randInt, type Rng } from '../sim/rng';
import type { BrickDef } from '../sim/types';
import type { DayPlan } from './plan';

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export interface Shell {
  readonly walls: readonly BrickDef[];
  /** Inside areas (the payoff). */
  readonly fills: readonly Rect[];
  /** Outside areas packed with bricks (rows above and beside the shell, the field under a wall). */
  readonly field: readonly Rect[];
  /** An empty inside cell (a whirlpool's far end). */
  readonly pocket: { readonly x: number; readonly y: number };
  /** The hole's cells (for gates, shutters, spinners). */
  readonly window?: Rect & { readonly side: 'left' | 'right' | 'bottom' };
  /** The fill's row the stone meets first once inside: x3 shells go there. */
  readonly payoffRow?: number;
  /** The fill's column beside the chimney (a stone coming in hits it first): x3 shells line it. */
  readonly payoffCol?: number;
  /** Rows reserved for the core's x3 shells. */
  readonly core?: Rect;
  /** A sealed chamber past the last turn (maze, nested, layers): packed with x3 shells and kegs. */
  readonly chamber?: Rect;
  /** layers: every floor's gap, lowest first (shutters, flip walls). */
  readonly gaps?: readonly Rect[];
  /** open: the armour's rectangles (driftwood hp 3 or ice, `armour: true`), and what they enclose. */
  readonly armour?: readonly Rect[];
  /** open: the payload inside the armour (x3 core, keg web or ice). */
  readonly payloads?: readonly Rect[];
}

const COLS = 36;
const TOP = 4;
/** Empty rows under a vault's roof (the stone's run above the fill). */
const VAULT_BAND = 3;
/** Cells kept clear on each side of a hole's column through a field (the way in from below). */
const LANE_PAD = 3;
/** Rows between a box's floor and its wings, and the most wing rows. */
const WING_GAP = 2;
const WING_ROWS = 2;
/** The stone's starting column: a hole's lane never covers it straight up. */
const LAUNCH_COL = 18;

function sized(plan: DayPlan, short: number, normal: readonly [number, number], big: number, rng: Rng): number {
  return plan.size === 'short' ? short : plan.size === 'big' ? big : randInt(rng, normal[0], normal[1]);
}

/** Rows of field under a full-width wall (more on big days). */
function fieldRows(plan: DayPlan, rng: Rng): number {
  return plan.size === 'short' ? randInt(rng, 0, 1) : plan.size === 'big' ? randInt(rng, 2, 3) : randInt(rng, 1, 3);
}

/** A field band from row y, h rows, with a lane kept open under the hole at x..x+k-1. */
export function bandWithLane(y: number, h: number, x: number, k: number): Rect[] {
  if (h <= 0) return [];
  const l = Math.max(0, x - LANE_PAD);
  const r = Math.min(COLS, x + k + LANE_PAD);
  return [{ x: 0, y, w: l, h }, { x: r, y, w: COLS - r, h }].filter((q) => q.w >= 3);
}

/**
 * The field of a box shell: two rows of "wings" under its floor, on the side away from the hole,
 * where every return can reach them (bricks above or beside a box are only reached up a corridor,
 * one per return, and turn a minute's play into five).
 */
function wings(x: number, y: number, w: number, h: number, holeLeft: boolean, rng: Rng): Rect[] {
  const half = Math.floor(w / 2);
  const rows = randInt(rng, 1, WING_ROWS);
  return [{ x: holeLeft ? x + half : x, y: y + h + WING_GAP, w: w - half, h: rows }];
}

/** A hole's first column by the left or right wall of a box at x of width w, never over the launch column. */
function holeAt(x: number, w: number, k: number, left: boolean): number {
  const at = left ? 1 : w - 1 - k;
  const col = x + at;
  if (col <= LAUNCH_COL && col + k > LAUNCH_COL) return left ? Math.max(1, LAUNCH_COL - x - k - 1) : Math.min(w - 1 - k, LAUNCH_COL - x + 2);
  return at;
}

/**
 * A vault (chapter 1, level 1's shape): a floor hole by one side wall, an empty chimney above it
 * up to a band under the roof, the fill beside the chimney.
 */
function vault(plan: DayPlan, rng: Rng): Shell {
  const w = plan.size === 'big' ? 26 : pick(rng, [22, 24, 26]);
  const h = sized(plan, 18, [19, 22], 23, rng);
  const x = Math.floor((COLS - w) / 2);
  const y = randInt(rng, 5, 7);
  const left = rng() < 0.5;
  const k = Math.min(INSIDE_PROBE - 1, plan.holeW);
  const at = holeAt(x, w, k, left);
  const chimney = k + 2;
  const floor = y + h - 1;
  const fillX = left ? x + at + chimney : x + 1;
  const fillW = left ? x + w - 1 - fillX : x + at - 2 - x;
  return {
    walls: shell(x, y, w, h, [{ side: 'bottom', at, width: k }]),
    fills: [{ x: fillX, y: y + 1 + VAULT_BAND, w: fillW, h: h - 2 - VAULT_BAND }],
    field: wings(x, y, w, h, left, rng),
    pocket: { x: left ? x + w - 3 : x + 2, y: y + 1 },
    window: { x: x + at, y: floor, w: k, h: 1, side: 'bottom' },
    payoffRow: y + 1 + VAULT_BAND,
    payoffCol: left ? fillX : fillX + fillW - 1,
  };
}

/** A tunnel column for a full-width wall: off the launch column, either side. */
function tunnelX(rng: Rng, k: number): number {
  return rng() < 0.5 ? randInt(rng, 6, LAUNCH_COL - k - 4) : randInt(rng, LAUNCH_COL + 4, COLS - 6 - k);
}

function wall(plan: DayPlan, rng: Rng): Shell {
  const row = sized(plan, 12, [13, 16], 17, rng);
  const k = plan.holeW;
  const tx = tunnelX(rng, k);
  return {
    walls: [stone(0, row, tx - 1, 1), stone(tx + k + 1, row, COLS - tx - k - 1, 1), stone(tx - 1, TOP, 1, row - 3), stone(tx + k, TOP, 1, row - 3)],
    fills: [{ x: 0, y: TOP, w: tx - 1, h: row - TOP }, { x: tx + k + 1, y: TOP, w: COLS - tx - k - 1, h: row - TOP }],
    field: bandWithLane(row + 2, fieldRows(plan, rng), tx, k),
    pocket: { x: 2, y: 1 },
    window: { x: tx, y: row, w: k, h: 1, side: 'bottom' },
  };
}

/** A neck in a full-width wall; the fill stops 3 rows above it, so a stone through the neck runs under the fill. */
function hourglass(plan: DayPlan, rng: Rng): Shell {
  const n = sized(plan, 15, [16, 19], 21, rng);
  const k = plan.holeW;
  const nx = tunnelX(rng, k);
  const walls: BrickDef[] = [stone(0, n, nx, 1), stone(nx + k, n, COLS - nx - k, 1)];
  return {
    walls, fills: [{ x: 0, y: TOP, w: COLS, h: n - 7 }], field: bandWithLane(n + 2, fieldRows(plan, rng), nx, k),
    pocket: { x: COLS / 2, y: n - 2 }, payoffRow: n - 4, window: { x: nx, y: n, w: k, h: 1, side: 'bottom' },
  };
}

/**
 * Two walls with gaps at opposite ends; past the last turn (the upper gap) a sealed chamber
 * under the ceiling packed with x3 shells and kegs.
 */
function maze(plan: DayPlan, rng: Rng): Shell {
  const low = sized(plan, 21, [22, 24], 25, rng);
  const up = low - 7;
  const k = plan.holeW;
  const left = rng() < 0.5;
  const lx = left ? randInt(rng, 3, 6) : COLS - randInt(rng, 3, 6) - k;
  const ux = COLS - lx - k;
  return {
    walls: [stone(0, low, lx, 1), stone(lx + k, low, COLS - lx - k, 1), stone(0, up, ux, 1), stone(ux + k, up, COLS - ux - k, 1)],
    fills: [{ x: 6, y: up + 3, w: 24, h: 2 }],
    chamber: { x: 0, y: TOP, w: COLS, h: up - 3 - TOP },
    field: bandWithLane(low + 2, fieldRows(plan, rng), lx, k),
    pocket: { x: COLS / 2, y: up - 2 },
    payoffRow: up + 3,
    window: { x: lx, y: low, w: k, h: 1, side: 'bottom' },
  };
}

/** Off-centre doors: below by one side wall, above by the other. */
function core(plan: DayPlan, rng: Rng): Shell {
  const w = pick(rng, [14, 16]);
  const h = plan.size === 'big' ? 10 : 9;
  const x = (COLS - w) / 2;
  const y = randInt(rng, 24, 27);
  const k = Math.min(INSIDE_PROBE - 1, plan.holeW);
  const left = rng() < 0.5;
  const at = holeAt(x, w, k, left);
  const topAt = left ? w - 1 - Math.min(4, k + 1) : 1;
  return {
    walls: shell(x, y, w, h, [{ side: 'bottom', at, width: k }, { side: 'top', at: topAt, width: Math.min(4, k + 1) }]),
    fills: [],
    field: [{ x: 0, y: TOP, w: COLS, h: y - 3 - TOP }, ...wings(x, y, w, h, left, rng)],
    // Three empty rows above the floor: a stone through the door rattles under the shells.
    core: { x: x + 1, y: y + 2, w: w - 2, h: h - 6 },
    pocket: { x: x + 1, y: y + 1 },
    window: { x: x + at, y: y + h - 1, w: k, h: 1, side: 'bottom' },
  };
}

/** A vault inside a vault: floor holes, the outer one by one side, the inner one by the other; the inner vault is the chamber. */
function nested(plan: DayPlan, rng: Rng): Shell {
  const k = Math.min(INSIDE_PROBE - 1, plan.holeW);
  const ox = 5;
  const ow = 26;
  const oy = randInt(rng, 6, 8);
  const oh = plan.size === 'big' ? 27 : 25;
  const ix = 9;
  const iw = 18;
  const ih = 15;
  const iy = oy + 4;
  const left = rng() < 0.5;
  const outerAt = holeAt(ox, ow, k, left);
  const innerAt = left ? iw - 1 - k : 1;
  return {
    walls: [...shell(ox, oy, ow, oh, [{ side: 'bottom', at: outerAt, width: k }]), ...shell(ix, iy, iw, ih, [{ side: 'bottom', at: innerAt, width: k }])],
    fills: [{ x: ox + 1, y: oy + 1 + VAULT_BAND - 1, w: ow - 2, h: 2 }],
    chamber: { x: left ? ix + 1 : ix + k + 3, y: iy + 1 + VAULT_BAND, w: iw - k - 4, h: ih - 2 - VAULT_BAND },
    payoffCol: left ? ix + iw - k - 4 : ix + k + 3,
    field: wings(ox, oy, ow, oh, left, rng),
    pocket: { x: 18, y: oy + 1 },
    window: { x: ox + outerAt, y: oy + oh - 1, w: k, h: 1, side: 'bottom' },
    payoffRow: oy + VAULT_BAND,
  };
}

/**
 * Layers (Level 23, The Winding Way): full-width stone floors with their gaps on alternating
 * sides near the walls; a 3-row band of bricks in each corridor with empty rows above and below
 * it (the stone runs along the band), and a sealed top room past the last gap packed with x3
 * shells and kegs. The gaps may become trap doors, flip walls, a spinner or a whirlpool (twists).
 */
function layers(plan: DayPlan, rng: Rng): Shell {
  const k = Math.min(INSIDE_PROBE - 1, plan.holeW);
  const floors = plan.size === 'short' ? 2 : 3;
  const spacing = plan.size === 'big' ? 8 : pick(rng, [7, 8]);
  const bottom = (plan.size === 'short' ? 30 : randInt(rng, 36, 38)) - (floors === 3 && spacing === 8 ? 0 : 0);
  let left = rng() < 0.5;
  const walls: BrickDef[] = [];
  const gaps: Rect[] = [];
  const fills: Rect[] = [];
  for (let f = 0; f < floors; f++) {
    const row = bottom - f * spacing;
    const gx = left ? randInt(rng, 3, 6) : COLS - randInt(rng, 3, 6) - k;
    walls.push(stone(0, row, gx, 1), stone(gx + k, row, COLS - gx - k, 1));
    gaps.push({ x: gx, y: row, w: k, h: 1 });
    // The corridor above this floor (between it and the next): a band of bricks, a run above and below.
    if (f < floors - 1) fills.push({ x: 0, y: row - spacing + 2, w: COLS, h: spacing - 5 });
    left = !left;
  }
  const top = bottom - (floors - 1) * spacing;
  const g0 = gaps[0]!;
  return {
    walls, fills, gaps,
    chamber: { x: 0, y: TOP, w: COLS, h: top - 3 - TOP },
    field: bandWithLane(bottom + 2, fieldRows(plan, rng), g0.x, k),
    pocket: { x: COLS / 2, y: bottom - 1 },
    window: { ...g0, side: 'bottom' },
    payoffRow: bottom - spacing + 2,
  };
}

/** Rows of armour (driftwood, 3 hits) the open layout stacks; a stone needs to chew through them (2 rows doubled the break-in: 60 s skilled). */
const ARMOUR_ROWS = 1;
/** Empty rows between the armour and the payload's face (the band's are TOP-relative: row - TOP - 3). */
const OPEN_RUN = 3;

/**
 * Open: no stone at all. The way in is breakable armour (`armour: true`): a full-width band
 * under the payload (the wall made of driftwood), two pods flush with the side walls (no corridor
 * between pod and edge, so their insides count), or a ring in the middle. The payload inside is
 * an x3 core, a keg web or an ice sheet (compose decides).
 */
function open(plan: DayPlan, rng: Rng): Shell {
  const shape = pick(rng, ['band', 'band', 'pods', 'ring'] as const);
  if (shape === 'band') {
    const row = sized(plan, 14, [15, 18], 19, rng);
    return {
      walls: [], fills: [], armour: [{ x: 0, y: row, w: COLS, h: ARMOUR_ROWS }],
      payloads: [{ x: 0, y: TOP, w: COLS, h: row - TOP - OPEN_RUN }],
      field: [{ x: 0, y: row + ARMOUR_ROWS + 2, w: COLS, h: fieldRows(plan, rng) }].filter((r) => r.h > 0),
      pocket: { x: COLS / 2, y: row - 1 }, payoffRow: TOP,
    };
  }
  if (shape === 'pods') {
    const w = randInt(rng, 12, 14);
    const h = sized(plan, 12, [13, 15], 16, rng);
    const y = randInt(rng, 5, 8);
    const pod = (x: number): Rect[] => [
      { x, y: y + h - ARMOUR_ROWS, w, h: ARMOUR_ROWS }, { x, y, w, h: 1 },
      x === 0 ? { x: w - 1, y: y + 1, w: 1, h: h - 1 - ARMOUR_ROWS } : { x, y: y + 1, w: 1, h: h - 1 - ARMOUR_ROWS },
    ];
    // The pods are the side walls' own: the board's edge closes them.
    const leftArm = pod(0).map((r) => (r.w === 1 ? r : { ...r, w }));
    const rightArm = pod(COLS - w);
    return {
      walls: [], fills: [], armour: [...leftArm, ...rightArm],
      payloads: [{ x: 0, y: y + 1, w: w - 1, h: h - 1 - ARMOUR_ROWS - OPEN_RUN }, { x: COLS - w + 1, y: y + 1, w: w - 1, h: h - 1 - ARMOUR_ROWS - OPEN_RUN }],
      field: [{ x: w + 1, y: TOP, w: COLS - 2 * w - 2, h: y + h - TOP }, { x: 0, y: y + h + 2, w: COLS, h: fieldRows(plan, rng) }].filter((r) => r.h > 0 && r.w >= 3),
      pocket: { x: 2, y: y + h - ARMOUR_ROWS - 1 }, payoffRow: y + 1,
    };
  }
  const w = pick(rng, [18, 20, 22]);
  const h = sized(plan, 12, [13, 15], 16, rng);
  const x = (COLS - w) / 2;
  const y = randInt(rng, 6, 9);
  return {
    walls: [], fills: [],
    armour: [{ x, y, w, h: 1 }, { x, y: y + h - ARMOUR_ROWS, w, h: ARMOUR_ROWS }, { x, y: y + 1, w: 1, h: h - 1 - ARMOUR_ROWS }, { x: x + w - 1, y: y + 1, w: 1, h: h - 1 - ARMOUR_ROWS }],
    payloads: [{ x: x + 1, y: y + 1, w: w - 2, h: h - 1 - ARMOUR_ROWS - OPEN_RUN }],
    field: [{ x: 0, y: TOP, w: COLS, h: Math.max(0, y - 2 - TOP) }, ...wings(x, y, w, h, rng() < 0.5, rng)].filter((r) => r.h > 0),
    pocket: { x: x + 2, y: y + h - ARMOUR_ROWS - 1 }, payoffRow: y + 1,
  };
}

export function buildShell(plan: DayPlan, rng: Rng): Shell {
  switch (plan.layout) {
    case 'vault':
    case 'guarded':
      return vault(plan, rng);
    case 'wall':
    case 'fuse':
      return wall(plan, rng);
    case 'picture': {
      const w = wall({ ...plan, size: 'big' }, rng);
      return { ...w, fills: [] };
    }
    case 'hourglass':
      return hourglass(plan, rng);
    case 'maze':
      return maze(plan, rng);
    case 'core':
      return core(plan, rng);
    case 'nested':
      return nested(plan, rng);
    case 'layers':
      return layers(plan, rng);
    case 'open':
      return open(plan, rng);
  }
}
