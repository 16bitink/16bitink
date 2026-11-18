import { Sim } from '../sim/sim';
import { BALL_RADIUS, CELL, CRAB_H, CRAB_W, RESCUE_SIZE, type LevelDef, type SimState } from '../sim/types';
import type { BoardView, PieceBump, PieceCrab, PieceFlip, SimPort } from './port';

/**
 * Wraps the engine's Sim (src/sim/sim.ts) as the renderer's SimPort. The
 * view is built from SimState on demand; arrays are mapped once per call
 * (balls up to 300), cheap next to drawing them.
 *
 * The variety fields (2026-11-18) fall back to the level's own placements
 * when a SimState doesn't carry them yet (the engine fills them in as it
 * lands), so the pieces always draw where the level puts them.
 */
const DEG = Math.PI / 180;

type Partial2<T> = { readonly [K in keyof T]?: T[K] };

/** The pieces as the level places them (cells to px), for a state that lacks them. */
function placed(level: LevelDef): {
  bumpers: PieceBump[]; flips: PieceFlip[]; crabs: PieceCrab[];
  pearls: { x: number; y: number; taken: boolean }[]; rescue: BoardView['rescue']; dailyPearl: BoardView['dailyPearl'];
} {
  const c = (v: number): number => v * CELL + CELL / 2;
  return {
    bumpers: (level.bumpers ?? []).map((b) => ({ ...b, kickAt: -1 })),
    flips: (level.flips ?? []).map((f) => ({ x: f.x * CELL, y: f.y * CELL, w: f.w * CELL, h: f.h * CELL, link: f.link, solid: f.on })),
    crabs: (level.crabs ?? []).map((k) => ({ x: (k.x0 + (k.x1 - k.x0) * k.phase) * CELL, y: k.y * CELL, w: CRAB_W * CELL, h: CRAB_H * CELL, dir: 1, fastLeft: 0 })),
    pearls: (level.pearls ?? []).map((p) => ({ x: c(p.x), y: c(p.y), taken: false })),
    rescue: level.rescue ? { x: level.rescue.x * CELL, y: level.rescue.y * CELL, w: RESCUE_SIZE * CELL, h: RESCUE_SIZE * CELL, who: level.rescue.who } : null,
    dailyPearl: level.dailyPearl ? { x: c(level.dailyPearl.x), y: c(level.dailyPearl.y) } : null,
  };
}

function viewOf(state: SimState, level: LevelDef, fallback: ReturnType<typeof placed>): BoardView {
  const s = state as Partial2<SimState> & SimState;
  const fire = s.fireLeft > 0;
  const tide = level.tide && (level.goal ?? 'clear') === 'tide' ? level.tide : null;
  return {
    t: s.elapsed,
    lives: s.lives,
    paddleX: s.paddle.x,
    paddleW: s.paddle.width,
    held: s.phase === 'aim',
    // Built only when read (the renderer reads it once a frame; the input reads only the raft).
    get balls() {
      return s.balls.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, fire }));
    },
    pickups: s.pickups,
    alive: (i) => s.bricks[i]?.alive ?? false,
    hp: (i) => s.bricks[i]?.hp ?? 0,
    cracked: (i) => s.bricks[i]?.cracked ?? false,
    moved: (i) => {
      const b = s.bricks[i];
      return b ? { x: b.x, y: b.y } : null;
    },
    spinners: s.spinners.map((p) => ({ x: (p.x1 + p.x2) / 2, y: (p.y1 + p.y2) / 2, angle: p.angle * DEG, length: Math.hypot(p.x2 - p.x1, p.y2 - p.y1) })),
    shutters: s.shutters,
    boss: s.boss,
    broken: s.breakableTotal - s.breakableLeft,
    breakable: s.breakableTotal,
    clock: s.time,
    goal: s.goal ?? level.goal ?? 'clear',
    rule: s.rule ?? level.rule ?? null,
    ballR: s.ballRadius ?? BALL_RADIUS,
    caught: s.caught ?? false,
    revealed: (i) => s.bricks[i]?.revealed ?? !level.bricks[i]?.hidden,
    bumpers: s.bumpers ?? fallback.bumpers,
    flips: s.flips ?? fallback.flips,
    crabs: s.crabs ?? fallback.crabs,
    rescue: s.rescue !== undefined ? s.rescue : fallback.rescue,
    rescued: s.rescued ?? false,
    pearls: s.pearls ?? fallback.pearls,
    pearlsTaken: s.pearlsTaken ?? 0,
    stonesLeft: s.stonesLeft ?? ((level.goal === 'stones' && level.stones) || -1),
    brokenShare: s.brokenShare ?? (s.breakableTotal > 0 ? 1 - s.breakableLeft / s.breakableTotal : 0),
    need: s.need ?? (level.goal === 'stones' ? (level.need ?? 0) : 0),
    tideNextIn: s.tideNextIn ?? (tide ? tide.every : 0),
    tideLineY: tide ? tide.line * CELL : null,
    dailyPearl: s.dailyPearl !== undefined ? s.dailyPearl : fallback.dailyPearl,
    dailyPearlFound: s.dailyPearlFound ?? false,
  };
}

export function simPort(level: LevelDef): SimPort {
  const sim = new Sim(level);
  const fallback = placed(level);
  let cached: BoardView | null = null;
  return {
    step: (input) => {
      sim.step(input);
      cached = null;
    },
    drainEvents: () => sim.drainEvents(),
    view: () => (cached ??= viewOf(sim.state, level, fallback)),
    state: () => sim.state,
  };
}
