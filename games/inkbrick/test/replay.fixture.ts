/**
 * Replays existing levels with seeded bots and reduces each run to a fingerprint, so an engine
 * change that alters how an old level plays is caught (test/replay.test.ts holds the numbers
 * recorded before the 2026-11-18 variety pass).
 */
import { Bot, type BotKind } from '../src/sim/bot';
import { Sim } from '../src/sim/sim';
import { Aimer, aimWindow } from '../src/sim/trace';
import type { LevelDef } from '../src/sim/types';

export interface Fingerprint {
  readonly phase: string;
  readonly elapsed: string;
  readonly heartsLost: number;
  readonly breakableLeft: number;
  readonly peakBalls: number;
  readonly breakInAt: string;
  readonly events: number;
  readonly hash: number;
  readonly aim: string;
}

function mix(h: number, v: number): number {
  return Math.imul(h ^ (v | 0), 0x01000193) >>> 0;
}

export function fingerprint(level: LevelDef, kind: BotKind, seed: number, seconds: number): Fingerprint {
  const sim = new Sim(level);
  const bot = new Bot(kind, seed, new Aimer(level));
  let h = 0x811c9dc5;
  let events = 0;
  for (let i = 0; i < seconds * 120 && (sim.state.phase === 'aim' || sim.state.phase === 'play'); i++) {
    sim.step(bot.input(sim.state));
    for (const e of sim.drainEvents()) {
      events++;
      h = mix(h, e.type.length * 131 + e.type.charCodeAt(0));
      if ('brick' in e) h = mix(h, e.brick);
      if ('x' in e) h = mix(h, Math.round(e.x * 1000));
      if ('y' in e) h = mix(h, Math.round(e.y * 1000));
    }
  }
  const s = sim.state;
  for (const b of s.balls) h = mix(mix(h, Math.round(b.x * 1e6)), Math.round(b.vy * 1e6));
  return {
    phase: s.phase, elapsed: s.elapsed.toFixed(4), heartsLost: s.heartsLost, breakableLeft: s.breakableLeft,
    peakBalls: s.peakBalls, breakInAt: s.breakInAt.toFixed(4), events, hash: h, aim: aimWindow(level, 360).toFixed(6),
  };
}
