import type { GameEvent, LevelRef } from '@16bitink/game-sdk';
import { levelNumber } from '../ui/format';

/** Reports a year as a level to the site: started, completed, failed, left. A stat must never break the game. */
export class Tracker {
  private open: LevelRef | null = null;
  private seconds = 0;

  constructor(private readonly send: ((e: GameEvent) => void) | undefined) {}

  private emit(e: GameEvent): void {
    try {
      this.send?.(e);
    } catch {
      // ignored on purpose
    }
  }

  ref(cityNo: number, year: number, name: string): LevelRef {
    const n = levelNumber(cityNo, year);
    return { level: String(n), n, name };
  }

  start(ref: LevelRef): void {
    this.leave();
    this.open = ref;
    this.seconds = 0;
    this.emit({ type: 'level_start', ...ref });
  }

  tick(dt: number): void {
    if (this.open) this.seconds += dt;
  }

  progress(progress: string): void {
    if (this.open) this.emit({ type: 'level_progress', ...this.open, seconds: Math.round(this.seconds), progress });
  }

  end(result: 'win' | 'lose', score?: number, cause?: string, progress?: string): void {
    if (!this.open) return;
    this.emit({ type: 'level_end', ...this.open, result, seconds: Math.round(this.seconds), score, cause, progress });
    this.open = null;
  }

  /** The player left the year unfinished. */
  leave(): void {
    if (!this.open) return;
    this.emit({ type: 'level_end', ...this.open, result: 'quit', seconds: Math.round(this.seconds) });
    this.open = null;
  }
}
