import Phaser from 'phaser';
import { STEP, type SimInput } from '../sim/types';

/**
 * The raft's controls: the pointer or finger's x drives it directly; the
 * arrows or A/D move it at 900 px/s; a click, tap or Space launches; Esc or P
 * pauses. `take` is called once per sim step.
 */
export const KEY_SPEED = 900;

export class PlayInput {
  enabled = true;
  private target: number | null = null;
  private launch = false;
  private keyDir = 0;
  private readonly held = new Set<string>();

  constructor(scene: Phaser.Scene, private readonly toBoardX: (screenX: number) => number, onPause: () => void) {
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.enabled) this.target = this.toBoardX(p.x);
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.enabled) return;
      this.target = this.toBoardX(p.x);
      this.launch = true;
    });
    const down = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') {
        onPause();
        return;
      }
      if (!this.enabled) return;
      if (k === ' ' || k === 'arrowup' || k === 'w') {
        this.launch = true;
        e.preventDefault();
      }
      if (['arrowleft', 'a', 'arrowright', 'd'].includes(k)) {
        this.held.add(k);
        this.target = null;
        e.preventDefault();
      }
      this.updateDir();
    };
    const up = (e: KeyboardEvent): void => {
      this.held.delete(e.key.toLowerCase());
      this.updateDir();
    };
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    scene.events.once('shutdown', () => {
      removeEventListener('keydown', down);
      removeEventListener('keyup', up);
    });
  }

  private updateDir(): void {
    const left = this.held.has('arrowleft') || this.held.has('a');
    const right = this.held.has('arrowright') || this.held.has('d');
    this.keyDir = (right ? 1 : 0) - (left ? 1 : 0);
  }

  /** This step's input, given where the raft is now. */
  take(current: number): SimInput {
    const paddleX = this.keyDir !== 0 ? current + this.keyDir * KEY_SPEED * STEP : (this.target ?? current);
    const launch = this.launch;
    this.launch = false;
    return { paddleX, launch };
  }
}
