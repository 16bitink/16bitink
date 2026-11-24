import type { SimPort } from '../render/port';
import { Bot, type BotKind } from '../sim/bot';
import { Aimer } from '../sim/trace';
import type { LevelDef, SimInput } from '../sim/types';

/** Dev autoplay: the engine's bot drives the raft from the sim state (loaded on demand, dev only). */
const KINDS: readonly BotKind[] = ['beginner', 'novice', 'decent', 'skilled'];
const SEED = 7;

export function makeAutopilot(kind: string, level: LevelDef): (port: SimPort) => SimInput {
  const k = (KINDS as readonly string[]).includes(kind) ? (kind as BotKind) : 'skilled';
  const bot = new Bot(k, SEED, new Aimer(level));
  return (port) => bot.input(port.state());
}
