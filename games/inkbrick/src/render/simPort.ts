import { Sim } from '../sim/sim';
import type { LevelDef, SimState } from '../sim/types';
import type { BoardView, SimPort } from './port';

/**
 * Wraps the engine's Sim (src/sim/sim.ts) as the renderer's SimPort. The
 * view is built from SimState on demand; arrays are mapped once per call
 * (balls up to 300), cheap next to drawing them.
 */
const DEG = Math.PI / 180;

function viewOf(s: SimState): BoardView {
  const fire = s.fireLeft > 0;
  return {
    t: s.elapsed,
    lives: s.lives,
    paddleX: s.paddle.x,
    paddleW: s.paddle.width,
    held: s.phase === 'aim',
    // Built only when read (the renderer reads it once a frame; the input reads only the raft).
    get balls() {
      return s.balls.map((b) => ({ x: b.x, y: b.y, fire }));
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
  };
}

export function simPort(level: LevelDef): SimPort {
  const sim = new Sim(level);
  let cached: BoardView | null = null;
  return {
    step: (input) => {
      sim.step(input);
      cached = null;
    },
    drainEvents: () => sim.drainEvents(),
    view: () => (cached ??= viewOf(sim.state)),
    state: () => sim.state,
  };
}
