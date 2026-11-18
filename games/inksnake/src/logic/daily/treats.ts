import type { TreatKind } from '../../level/daily';
import type { Rng } from '../rng';
import { freeSpot } from '../preyMoves';
import type { PreyWorld } from '../preyTypes';
import { dist, type Pt } from '../vec';
import { TREAT } from './params';

/** A treat on the board: picked up when the head touches it, with a sparkle. */
export interface Treat {
  readonly id: number;
  readonly kind: TreatKind;
  x: number;
  y: number;
  /** 0..1 while it appears. */
  shown: number;
}

/** Seconds a treat takes to appear. */
const APPEAR = 0.5;

/** The board's treats: `count` at a time, each taken one back a moment later. */
export class Treats {
  readonly list: Treat[] = [];
  private readonly waits: number[] = [];
  private nextId = 1;

  constructor(readonly kind: TreatKind, readonly count: number, private readonly rng: Rng) {}

  fill(world: Omit<PreyWorld, 'headSeen'>, atStart: boolean): void {
    while (this.list.length < this.count - this.waits.length) {
      if (!this.place(world, atStart)) return;
    }
  }

  private place(world: Omit<PreyWorld, 'headSeen'>, atStart: boolean): boolean {
    const at = freeSpot(world, 10, atStart ? TREAT.away * 0.6 : TREAT.away);
    if (!at) return false;
    this.list.push({ id: this.nextId++, kind: this.kind, x: at.x, y: at.y, shown: 0 });
    return true;
  }

  /** Appearing, coming back, and what the head picks up this frame. */
  step(world: Omit<PreyWorld, 'headSeen'>, head: Pt, reach: number, dt: number): Treat[] {
    for (const t of this.list) t.shown = Math.min(1, t.shown + dt / APPEAR);
    for (let i = this.waits.length - 1; i >= 0; i--) {
      this.waits[i]! -= dt;
      if (this.waits[i]! > 0) continue;
      this.waits.splice(i, 1);
      this.place(world, false);
    }
    const taken = this.list.filter((t) => t.shown >= 1 && dist(t, head) < reach + TREAT.reach);
    for (const t of taken) {
      this.list.splice(this.list.indexOf(t), 1);
      this.waits.push(TREAT.respawn[0] + this.rng() * (TREAT.respawn[1] - TREAT.respawn[0]));
    }
    return taken;
  }
}
