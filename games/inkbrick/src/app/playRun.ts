import type { SoundBoard } from '../audio/sound';
import type { BoardLayout } from '../render/layout';
import type { SimPort } from '../render/port';
import { simPort } from '../render/simPort';
import type { Looks } from '../render/piecesView';
import { PlayScene, type PlayOutcome } from '../scenes/PlayScene';
import type { LevelDef, SimInput } from '../sim/types';
import { clear } from '../ui/dom';
import { Hud, type HudInfo } from '../ui/hud';
import { showPause } from '../ui/results';
import type { Shells } from './save';
import type { Stage } from './stage';

/**
 * One level being played: the board scene, the HUD beside it, and the pause
 * card. The app gets the outcome when the level ends (or quits it).
 */
export interface RunParts {
  readonly stage: Stage;
  readonly hudRoot: HTMLElement;
  readonly cardRoot: HTMLElement;
  readonly sound: SoundBoard;
}

export interface RunHooks {
  end(o: PlayOutcome): void;
  retry(o: PlayOutcome | null): void;
  leave(o: PlayOutcome | null): void;
  /** Sound on/off from the pause card; returns the new state. */
  toggleSound(): boolean;
}

export interface RunSpec {
  readonly level: LevelDef;
  readonly looks: Looks;
  readonly surround: string;
  readonly hud: HudInfo;
  readonly leaveLabel: string;
  readonly soundOn: boolean;
}

export const shellsFor = (o: PlayOutcome, par: number): Shells => {
  const won = o.result === 'win';
  return [won, won && o.heartsLost === 0, won && o.seconds <= par];
};

export class PlayRun {
  private readonly scene: PlayScene;
  private readonly hud: Hud;
  private paused = false;
  private over = false;
  private soundOn: boolean;
  private lastT = 0;
  private layout: BoardLayout | null = null;
  private readonly port: SimPort;
  private autopilot: ((port: SimPort) => SimInput) | undefined;

  constructor(private readonly parts: RunParts, private readonly spec: RunSpec, private readonly hooks: RunHooks) {
    this.soundOn = spec.soundOn;
    this.port = simPort(spec.level);
    if (import.meta.env.DEV) void this.devBot(spec.level);
    this.hud = new Hud(parts.hudRoot, spec.hud, { pause: () => this.pause(), cheatWin: () => this.finish({ result: 'win', seconds: this.lastT, breakIn: null, heartsLost: 0 }) });
    this.scene = parts.stage.startPlay((key) => new PlayScene(key, {
      level: spec.level, port: this.port, autopilot: (p) => this.autopilot?.(p) ?? null, looks: spec.looks, sound: parts.sound, surround: spec.surround,
      hooks: {
        hud: (h) => {
          this.lastT = h.t;
          this.hud.update(h);
        },
        layout: (l) => {
          this.layout = l;
          this.hud.setLayout(l);
        },
        end: (o) => this.finish(o),
        pauseKey: () => (this.paused ? this.resume() : this.pause()),
      },
    }));
  }

  /** Dev only: ?bot=novice|decent|skilled plays the level with the engine's bot (not in production builds). */
  private async devBot(level: LevelDef): Promise<void> {
    const kind = new URLSearchParams(location.search).get('bot');
    if (!kind) return;
    const { makeAutopilot } = await import('./autopilot');
    this.autopilot = makeAutopilot(kind, level);
  }

  private partial(): PlayOutcome {
    return { result: 'lose', seconds: this.lastT, breakIn: null, heartsLost: 0 };
  }

  pause(): void {
    if (this.over || this.paused) return;
    this.paused = true;
    this.scene.setPaused(true);
    this.drawPause();
  }

  private drawPause(): void {
    showPause(this.parts.cardRoot, this.soundOn, this.spec.leaveLabel, {
      resume: () => this.resume(),
      retry: () => this.hooks.retry(this.partial()),
      leave: () => this.hooks.leave(this.partial()),
      sound: () => {
        this.soundOn = this.hooks.toggleSound();
        this.drawPause();
      },
    });
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    clear(this.parts.cardRoot);
    this.scene.setPaused(false);
  }

  private finish(o: PlayOutcome): void {
    if (this.over) return;
    this.over = true;
    this.scene.setPaused(true);
    this.hooks.end(o);
  }

  /** Dev autoplay: where (CSS px) the raft should go to catch the lowest falling stone. */
  devAimX(): number | null {
    const l = this.layout;
    if (!l) return null;
    const v = this.port.view();
    let best: { x: number; y: number } | null = null;
    for (const b of v.balls) if (!best || b.y > best.y) best = b;
    const x = v.held ? v.paddleX + 20 : (best?.x ?? v.paddleX);
    return l.x + x * l.scale;
  }

  destroy(): void {
    this.hud.destroy();
    this.parts.stage.endPlay();
  }
}
