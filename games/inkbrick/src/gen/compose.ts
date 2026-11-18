/** A candidate daily from its plan: shell + fill + teasers + at most one twist. */
import { fill, minus, stone } from '../sim/kit';
import { mulberry32, pick, randInt, type Rng } from '../sim/rng';
import type { BrickDef, LevelDef, PickupKind } from '../sim/types';
import type { Layout, Twist } from './calendar';
import { applyRuleBricks, placeDailyPearl, placePearls, placeRescue, spotsOf, tideFor } from './goals';
import { addBumpers, addCrab, addHidden, addLevers, addTrapDoors } from './newpieces';
import { pictureById } from './pictures';
import { daySeed, type DayPlan } from './plan';
import { LOW_SCREEN_ROWS, screenLaunch } from './screen';
import { bandWithLane, buildShell, type Rect, type Shell } from './shells';

const COLS = 36;
const DROPS: readonly PickupKind[] = ['wide', 'plus3', 'fireball'];
const PICTURE_SHELL_EVERY = 4;
/** Share of a soft fill made driftwood, drawn per candidate: the main length dial of a daily. */
const TOUGH_SHARE: readonly [number, number] = [0.25, 0.5];
/** Share of the driftwood that takes 3 hits instead of 2. */
const HARD_SHARE = 0.3;
const CORE_TOUGH = 0.75;
/** A chamber's payoff row: an x3 shell every this many cells; kegs every 3 cells on its middle row. */
const CHAMBER_SHELL_EVERY = 2;
const KEG_EVERY = 3;
/** A fuse's blasts don't care about driftwood, but a novice's misses before the fuse do. */
const FUSE_TOUGH_SHARE = 0.1;
/** Two lines of kegs through the picture (every 3 cells, so they chain): one stone on a keg wears away a band. */
const PICTURE_KEG_EVERY = 3;
export const LAYOUT_NAMES: Readonly<Record<Layout, readonly string[]>> = {
  vault: ['The Strongroom', 'The Sandcastle Vault', 'The Treasure Room', 'The Locked Cove'],
  wall: ['Over the Sea Wall', 'The Breakwater', 'Behind the Wall', 'The Long Wall'],
  hourglass: ['The Hourglass', 'The Narrow Neck', 'The Funnel'],
  guarded: ['The Guarded Gate', 'The Watched Door'],
  maze: ['The Winding Way', 'The Rock Maze', 'The Switchback'],
  core: ['The Shell Core', 'The Multiplier', 'The Big Split', 'Shell Storm'],
  fuse: ['The Long Fuse', 'The Powder Line', 'Chain Blast'],
  picture: ['Picture'],
  nested: ['The Box in a Box', 'The Double Vault', 'Two Doors'],
  layers: ['The Winding Way', 'Floor by Floor', 'The Stairway', 'The Decks'],
  open: ['The Driftwood Fort', 'Open Water', 'The Crate Pile', 'The Soft Shell'],
};
const TWIST_NAMES: Partial<Record<Twist, string>> = { shutter: 'The Shuttered Gate', spinner: 'The Spinning Gate' };
const LAYER_TWIST_NAMES: Partial<Record<Twist, string>> = { shutter: 'The Trap Doors', lever: 'The Lever Decks', spinner: 'The Turning Stair', whirlpool: 'The Whirling Decks' };
/** Open layout: armour hits (Monday a little softer). */
const ARMOUR_HP = 3;
const ARMOUR_HP_MONDAY = 2;
/** Open: the second face of x3 shells sits this many rows above the first (out of the face's keg blasts). */
const OPEN_SECOND_FACE = 4;
/** Few Stones (campaign only): a starting point for level agents to tune. */
const FEW_STONES = 4;
const FEW_STONES_NEED = 0.6;

function tagged(bricks: readonly BrickDef[], extra: Partial<BrickDef>): BrickDef[] {
  return bricks.map((b) => ({ ...b, ...extra }));
}

interface Mix { readonly tough: number }

function fillArea(r: Rect, plan: DayPlan, rng: Rng, main: 'soft' | 'ice', mix: Mix): BrickDef[] {
  if (r.w < 1 || r.h < 1) return [];
  if (plan.density === 'dense') return fill(r.x, r.y, r.w, r.h, main, { bw: 1 });
  const skip = plan.density === 'light' ? (_x: number, y: number) => (y - r.y) % 2 === 1 : undefined;
  const base = [...fill(r.x, r.y, r.w - (r.w % 3), r.h, main, skip ? { skip } : {}), ...fill(r.x + r.w - (r.w % 3), r.y, r.w % 3, r.h, main, { bw: 1, ...(skip ? { skip } : {}) })];
  return base.map((b) => {
    const roll = rng();
    if (main === 'soft' && roll < (plan.layout === 'fuse' ? FUSE_TOUGH_SHARE : mix.tough)) return { ...b, kind: 'tough' as const, hp: rng() < HARD_SHARE ? 3 : 2 };
    if (roll > 0.985) return { ...b, kind: 'pickup' as const, drop: pick(rng, DROPS) };
    if (main === 'soft' && plan.density === 'normal' && roll > 0.97) return { ...b, kind: 'keg' as const };
    return b;
  });
}

function pictureBricks(plan: DayPlan, row: number, rng: Rng, mix: Mix): BrickDef[] {
  const pic = pictureById(plan.picture ?? 'heart');
  const scale = 2;
  const h = pic.rows.length * scale;
  const kegRows = new Set([row + Math.floor(h / 3), row + Math.floor((2 * h) / 3)]);
  const x0 = Math.floor((COLS - pic.rows[0]!.length * scale) / 2);
  const out: BrickDef[] = [];
  pic.rows.forEach((line, py) => {
    [...line].forEach((ch, px) => {
      if (ch === '.') return;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const x = x0 + px * scale + dx;
        const y = row + py * scale + dy;
        const keg = kegRows.has(y) && x % PICTURE_KEG_EVERY === 0;
        const tough = !keg && rng() < mix.tough;
        out.push({ x, y, w: 1, h: 1, kind: keg ? 'keg' : tough ? 'tough' : 'soft', tint: Number(ch), ...(tough ? { hp: 2 } : {}) });
      }
    });
  });
  return out;
}

function pictureShell(plan: DayPlan, rng: Rng, mix: Mix): { shell: Shell; bricks: BrickDef[] } {
  const pic = pictureById(plan.picture ?? 'heart');
  const k = plan.holeW;
  const row = 4 + pic.rows.length * 2 + 3;
  const tx = 2;
  const walls = [stone(0, row, tx - 1, 1), stone(tx - 1, row - 1, 1, 1), stone(tx + k, row - 1, 1, 2), stone(tx + k + 1, row, COLS - tx - k - 1, 1)];
  // Small x3 shells under the picture: a stone up the tunnel multiplies and floods it.
  const shellRow = fill(0, row - 3, COLS, 1, 'x3', { bw: 1, skip: (x) => x % PICTURE_SHELL_EVERY !== 0 || (x >= tx - 1 && x <= tx + k) });
  return { shell: { walls, fills: [], field: bandWithLane(row + 2, randInt(rng, 1, 2), tx, k), pocket: { x: 18, y: 1 }, window: { x: tx, y: row, w: k, h: 1, side: 'bottom' } }, bricks: [...pictureBricks(plan, 4, rng, mix), ...shellRow] };
}

/** The outside field: plain 3 x 1 sandcastle and driftwood rows, packed (no skipped rows). */
function fieldArea(r: Rect, plan: DayPlan, rng: Rng, mix: Mix): BrickDef[] {
  return fillArea(r, { ...plan, density: 'normal' }, rng, 'soft', mix).map((b) => (b.kind === 'keg' ? { ...b, kind: 'soft' as const } : b));
}

/** A sealed chamber's payoff: x3 shells along the row the stone meets first, a chained keg line, sandcastle and driftwood. */
function chamberBricks(r: Rect, plan: DayPlan, rng: Rng, mix: Mix, faceRow: number): BrickDef[] {
  if (r.w < 1 || r.h < 1) return [];
  const shells = fill(r.x, faceRow, r.w, 1, 'x3', { bw: 1, skip: (x) => (x - r.x) % CHAMBER_SHELL_EVERY !== 0 });
  const kegRow = r.y + Math.floor(r.h / 2);
  const kegs = r.h >= 3 ? fill(r.x + 1, kegRow, r.w - 1, 1, 'keg', { bw: 1, skip: (x) => (x - r.x - 1) % KEG_EVERY !== 0 }) : [];
  const special = [...shells, ...kegs];
  return [...special, ...minus(fillArea(r, { ...plan, density: 'normal' }, rng, 'soft', mix), special)];
}

/** The fill's column beside the chimney as 1 x 1 bricks, x3 shells on every other row: the first thing a stone inside hits splits it. */
function lineColumn(bricks: BrickDef[], col: number): BrickDef[] {
  const hit = bricks.filter((b) => b.kind !== 'stone' && b.floe === undefined && b.x <= col && col < b.x + b.w);
  if (hit.length === 0) return bricks;
  const rest = bricks.filter((b) => !hit.includes(b));
  const cells = hit.flatMap((b) => Array.from({ length: b.w * b.h }, (_, i) => ({ ...b, x: b.x + (i % b.w), y: b.y + Math.floor(i / b.w), w: 1, h: 1 })));
  return [...rest, ...cells.map((c) => (c.x === col && c.y % 2 === 0 ? { x: c.x, y: c.y, w: 1, h: 1, kind: 'x3' as const } : c))];
}

function coreShells(r: Rect, plan: DayPlan): BrickDef[] {
  const sunday = plan.weekday === 0;
  return fill(r.x, r.y, r.w, r.h, 'x3', { bw: 1, skip: (x, y) => !sunday && (x + y) % 2 === 1 });
}

/** A few x3 shells on the payoff side's top row, so a break-in pays off (fewer on harder days). */
const SHELLS_BY_WEEKDAY: readonly number[] = [0, 3, 3, 2, 2, 2, 2];
const BRICKS_PER_EXTRA_SHELL = 40;

function seedShells(bricks: BrickDef[], plan: DayPlan, rng: Rng, payoffRow?: number): BrickDef[] {
  const soft = bricks.map((b, i) => ({ b, i })).filter(({ b }) => (b.kind === 'soft' || b.kind === 'ice') && b.floe === undefined && b.y < 30);
  if (soft.length === 0) return bricks;
  const top = Math.min(...soft.map(({ b }) => b.y));
  // The row the stone meets first once inside, else the fill's top row.
  const onPayoff = payoffRow === undefined ? [] : soft.filter(({ b }) => b.y === payoffRow);
  const row = onPayoff.length > 0 ? onPayoff : soft.filter(({ b }) => b.y <= top + 1);
  const chosen = new Set<number>();
  // Big fills get more shells (one more per BRICKS_PER_EXTRA_SHELL), or the payoff can't reach 35% in 8 s.
  const want = SHELLS_BY_WEEKDAY[plan.weekday]! + Math.floor(soft.length / BRICKS_PER_EXTRA_SHELL);
  for (let n = 0; n < want * 3 && chosen.size < Math.min(want, row.length); n++) chosen.add(row[Math.floor(rng() * row.length)]!.i);
  return bricks.map((b, i) => (chosen.has(i) ? { ...b, kind: 'x3' as const } : b));
}

interface Extras {
  floes?: LevelDef['floes'];
  shutters?: LevelDef['shutters'];
  spinners?: LevelDef['spinners'];
  whirlpools?: LevelDef['whirlpools'];
  dark?: boolean;
  bumpers?: LevelDef['bumpers'];
  flips?: LevelDef['flips'];
  crabs?: LevelDef['crabs'];
}

/** A rectangle covered fully with armour: 3 x 1 bricks along rows (1 x 1 where 3 doesn't fit, and up thin columns). */
function armourBricks(r: Rect, kind: 'tough' | 'ice', hp: number): BrickDef[] {
  const out: BrickDef[] = [];
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; ) {
      const w = Math.min(3, r.x + r.w - x);
      out.push({ x, y, w, h: 1, kind, ...(kind === 'tough' ? { hp } : {}), armour: true });
      x += w;
    }
  }
  return out;
}

/**
 * Open: the armour (driftwood, `armour: true`) and the payload it encloses (dev/recipes/open.ts).
 * The payload's face, its bottom row of 1 x 1 bricks, is what a stone through the breach meets:
 * a keg web (keg, x3, sandcastle repeating: the kegs chain along the whole face) or an x3 core
 * (a shell every other cell); a second face of x3 shells 4 rows up, out of the blasts' reach.
 * On an ice day the payload is an ice sheet.
 */
function openBricks(shell: Shell, plan: DayPlan, rng: Rng, mix: Mix): BrickDef[] {
  const hp = plan.weekday === 1 ? ARMOUR_HP_MONDAY : ARMOUR_HP;
  const armour = (shell.armour ?? []).flatMap((r) => armourBricks(r, 'tough', hp));
  const web = rng() < 0.5;
  const out: BrickDef[] = [...armour];
  for (const r of shell.payloads ?? []) {
    if (r.w < 1 || r.h < 2) continue;
    const fy = r.y + r.h - 1;
    const face = fill(r.x, fy, r.w, 1, 'soft', { bw: 1 }).map((b) => {
      const k = (b.x - r.x) % 3;
      if (web) return k === 0 ? { ...b, kind: 'keg' as const } : k === 1 ? { ...b, kind: 'x3' as const } : b;
      return (b.x - r.x) % 2 === 0 ? { ...b, kind: 'x3' as const } : b;
    });
    const second = fy - OPEN_SECOND_FACE >= r.y ? fill(r.x, fy - OPEN_SECOND_FACE, r.w, 1, 'x3', { bw: 1, skip: (x) => (x - r.x) % 2 === 1 }) : [];
    const special = [...face, ...second];
    const rest = { x: r.x, y: r.y, w: r.w, h: r.h - 1 };
    out.push(...special, ...minus(fillArea(rest, plan, rng, plan.twist === 'ice' ? 'ice' : 'soft', mix), special));
  }
  return out;
}

function twist(plan: DayPlan, shell: Shell, rng: Rng, bricks: BrickDef[]): { bricks: BrickDef[]; extras: Extras } {
  const win = shell.window;
  switch (plan.twist) {
    case 'bumper':
      return addBumpers(bricks, rng, plan.layout === 'open');
    case 'hidden':
      return { bricks: addHidden(bricks, rng), extras: {} };
    case 'crab':
      return addCrab(bricks, rng);
    case 'lever':
      return addLevers(bricks, shell, rng);
    case 'floe': {
      const x = randInt(rng, 0, 8);
      const row = tagged(fill(x, randInt(rng, 44, 46), 9, 1, 'soft'), { floe: 'f1' });
      return { bricks: [...bricks, ...row], extras: { floes: [{ id: 'f1', dx: randInt(rng, 8, COLS - x - 9), dy: 0, period: randInt(rng, 5, 8) }] } };
    }
    case 'keyGate': {
      if (!win) return { bricks, extras: {} };
      const gate: BrickDef = { x: win.x, y: win.y, w: win.w, h: win.h, kind: 'gate', link: 'g' };
      // Out to one side, low (never over the launch spot): a bank shot or a dig opens the gate.
      const key: BrickDef = { x: rng() < 0.5 ? randInt(rng, 1, 4) : randInt(rng, 29, 32), y: randInt(rng, 36, 42), w: 3, h: 1, kind: 'key', link: 'g' };
      return { bricks: [...minus(bricks, [key]), gate, key], extras: {} };
    }
    case 'shutter':
      if (plan.layout === 'layers') return { bricks, extras: addTrapDoors(shell, rng) };
      if (!win) return { bricks, extras: {} };
      return { bricks, extras: { shutters: [{ x: win.x, y: win.y, w: win.w, h: win.h, open: 1.6 + rng(), closed: 1.2 + rng(), phase: 0 }] } };
    case 'spinner': {
      if (!win) return { bricks, extras: {} };
      // Under a floor hole the bar turns 3 rows below it; beside a side window, 4 cells out.
      const bottom = win.side === 'bottom';
      const px = bottom ? win.x + Math.floor(win.w / 2) : win.side === 'left' ? win.x - 4 : win.x + 4;
      const py = bottom ? win.y + 3 : win.y + Math.floor(win.h / 2);
      const period = 2.5 + Math.round(rng() * 10) / 10;
      // Upright at the start (a quarter turn), so the aim window is measured with the hole open.
      return { bricks: minus(bricks, [{ x: px - 2, y: py - 2, w: 5, h: 5, kind: 'stone' }]), extras: { spinners: [{ x: px, y: py, length: (bottom ? win.w : win.h) + 1, period, phase: period / 4 }] } };
    }
    case 'whirlpool':
      return { bricks, extras: { whirlpools: [{ a: { x: randInt(rng, 4, 31), y: randInt(rng, 46, 49) }, b: shell.pocket }] } };
    case 'dark':
      return { bricks, extras: { dark: true } };
    default:
      return { bricks, extras: {} };
  }
}

function levelName(plan: DayPlan, rng: Rng): string {
  if (plan.layout === 'picture') return pictureById(plan.picture ?? 'heart').name.replace(/^the /, 'The ');
  if (plan.layout === 'layers') return LAYER_TWIST_NAMES[plan.twist] ?? pick(rng, LAYOUT_NAMES.layers);
  return TWIST_NAMES[plan.twist] ?? pick(rng, LAYOUT_NAMES[plan.layout]);
}

/** The day's goal on the board: the friend, the pearls, or the tide (after the launch screen); the daily's hidden pearl. */
function withGoal(level: LevelDef, plan: DayPlan, rng: Rng): LevelDef {
  let out: LevelDef = { ...level, goal: plan.goal };
  if (plan.goal === 'rescue') {
    const r = placeRescue(out, rng);
    out = r ? { ...out, bricks: r.bricks, rescue: r.rescue } : { ...out, goal: 'clear' };
  } else if (plan.goal === 'pearls') {
    const p = placePearls(out, rng, []);
    out = p ? { ...out, bricks: p.bricks, pearls: p.pearls } : { ...out, goal: 'clear' };
  }
  else if (plan.goal === 'stones') out = { ...out, stones: FEW_STONES, need: FEW_STONES_NEED };
  if (plan.date.startsWith('level-')) return out;
  const d = placeDailyPearl(out, rng, spotsOf(out));
  return d ? { ...out, bricks: d.bricks, dailyPearl: d.pearl } : out;
}

/** Candidate `k` of a day (deterministic: the same date, plan and k give the same level). */
export function compose(plan: DayPlan, k: number, salt = 0): LevelDef {
  const rng = mulberry32((daySeed(plan.date) ^ Math.imul(k + 1 + salt * 100_003, 0x9e3779b9)) >>> 0);
  // The spectacle's field takes hundreds of stones: mostly driftwood, or it's gone in 20 s.
  const mix: Mix = plan.layout === 'core' ? { tough: CORE_TOUGH } : { tough: TOUGH_SHARE[0] + (TOUGH_SHARE[1] - TOUGH_SHARE[0]) * rng() };
  const pic = plan.layout === 'picture' ? pictureShell(plan, rng, mix) : null;
  const shell = pic?.shell ?? buildShell(plan, rng);
  const main = plan.twist === 'ice' ? 'ice' : 'soft';
  let bricks: BrickDef[] = [...shell.walls, ...(pic?.bricks ?? []), ...(plan.layout === 'open' ? openBricks(shell, plan, rng, mix) : [])];
  for (const r of shell.fills) bricks.push(...minus(fillArea(r, plan, rng, main, mix), bricks));
  if (shell.chamber) {
    const c = shell.chamber;
    // The maze's chamber is met from below, the nested inner vault's from its band above.
    const face = plan.layout === 'maze' || plan.layout === 'layers' ? c.y + c.h - 1 : c.y;
    bricks.push(...minus(chamberBricks(c, plan, rng, mix, face), bricks));
  }
  if (shell.payoffCol !== undefined) bricks = lineColumn(bricks, shell.payoffCol);
  if (shell.core) bricks.push(...minus(coreShells(shell.core, plan), bricks));
  if (plan.layout === 'fuse') {
    const kegs = shell.fills.flatMap((r) => fill(r.x, r.y, r.w, 1, 'keg', { bw: 1, skip: (x) => (x - r.x) % 3 !== 0 }));
    bricks = [...minus(bricks, kegs), ...kegs];
  }
  if (plan.layout !== 'core' && plan.layout !== 'open') bricks = seedShells(bricks, plan, rng, shell.payoffRow);
  for (const r of shell.field) bricks.push(...minus(fieldArea(r, plan, rng, mix), bricks));
  bricks = applyRuleBricks(bricks, plan, rng);
  const t = twist(plan, shell, rng, bricks);
  const rule = plan.rule ? { rule: plan.rule, ...(plan.rule === 'current' ? { ruleDir: plan.ruleDir } : {}) } : {};
  const base: LevelDef = {
    id: `daily-${plan.date}`, name: levelName(plan, rng), number: 0, chapter: 0, par: 90,
    layout: plan.layout, bricks: t.bricks, ...t.extras, ...rule,
  };
  const goal = withGoal(base, plan, rng);
  const screened = screenLaunch(goal, spotsOf(goal), plan.layout === 'layers' ? LOW_SCREEN_ROWS : undefined);
  return plan.goal === 'tide' ? { ...screened, tide: tideFor(screened) } : screened;
}
