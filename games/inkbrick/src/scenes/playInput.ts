import Phaser from 'phaser';
import { STEP, type SimInput } from '../sim/types';
import type { StickSource } from '../ui/stick';

/**
 * The raft's controls: the mouse's x drives it directly; the arrows or A/D
 * move it at 900 px/s; on a touch screen the thumbstick under the board sets
 * its speed (a finger on the board would hide the raft and the stone, so
 * there a touch only throws). A click, tap or Space launches; Esc or P
 * pauses. `take` is called once per sim step.
 */
export const KEY_SPEED = 900;
/** Board px/s at the stick's full deflection. */
export const STICK_SPEED = 1100;

export class PlayInput {
  enabled = true;
  private target: number | null = null;
  private launch = false;
  private keyDir = 0;
  private readonly held = new Set<string>();

  constructor(
    scene: Phaser.Scene,
    private readonly toBoardX: (screenX: number) => number,
    onPause: () => void,
    private readonly stick: StickSource | null = null,
  ) {
    // With a stick, a finger on the board doesn't steer: only the mouse does.
    const steers = (p: Phaser.Input.Pointer): boolean => this.stick === null || !p.wasTouch;
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.enabled && steers(p)) this.target = this.toBoardX(p.x);
    });
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.enabled) return;
      if (steers(p)) this.target = this.toBoardX(p.x);
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
    const pushed = this.stick?.value() ?? 0;
    if (pushed !== 0) this.target = null;
    const paddleX = this.keyDir !== 0
      ? current + this.keyDir * KEY_SPEED * STEP
      : pushed !== 0 ? current + pushed * STICK_SPEED * STEP : (this.target ?? current);
    const launch = this.launch || (this.enabled && (this.stick?.takeTap() ?? false));
    this.launch = false;
    return { paddleX, launch };
  }
}
