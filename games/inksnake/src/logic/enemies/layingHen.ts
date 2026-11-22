import type { Enemy, EnemyCtx } from '../enemyTypes';
import { dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

type LayingMode = 'walk' | 'roost' | 'scared';

const WALK_SPEED = 70;
/** She stands this far off the nest she lays in, so the egg shows beside her, px. */
const BESIDE = pt(24, -16);
const SCARE_REACH = 40;
const SCARED_SECONDS = 2;

/**
 * The first level's hen: she lays eggs for the snake rather than guarding
 * them. She walks to an empty nest and settles beside it, and the next egg
 * is laid there (World.place reads `layAt`). She never pecks; a strike
 * sends her flapping off for a moment, which is how a new player first
 * finds out what a strike does.
 */
export class LayingHen extends EnemyBase<LayingMode> {
  private nest: Pt | null = null;

  constructor(id: number, at: Pt) {
    super(id, 'hen', at, 'walk');
  }

  get away(): boolean {
    return false;
  }

  /** The empty nest she is settled at, where the next egg goes; null while she walks or flaps. */
  get layAt(): Pt | null {
    return this.m === 'roost' ? this.nest : null;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const head = ctx.snake.head;
    if (this.m === 'scared') {
      const a = Math.atan2(this.y - head.y, this.x - head.x);
      this.moveTo(pt(this.x + Math.cos(a) * 50, this.y + Math.sin(a) * 50), 190, dt);
      this.keepOn(ctx, 24);
      if (done) this.go('walk');
      return;
    }
    if (this.struckBy(ctx, SCARE_REACH)) {
      this.go('scared', SCARED_SECONDS);
      ctx.emit({ type: 'scared', kind: 'hen', x: this.x, y: this.y });
      return;
    }
    if (this.nest && this.m === 'roost' && hasEgg(ctx, this.nest)) {
      // Laid: a cluck, and off to the next empty nest.
      ctx.emit({ type: 'cluck', x: this.x, y: this.y });
      this.go('walk');
    }
    if (this.m === 'walk') this.nest = nearestEmpty(ctx, this.here());
    // Every nest full: she waits where she is until one is emptied.
    if (!this.nest) return;
    const spot = pt(this.nest.x + BESIDE.x, this.nest.y + BESIDE.y);
    if (this.m === 'walk') {
      if (this.moveTo(spot, WALK_SPEED, dt)) this.go('roost');
      return;
    }
    // Settled: shuffling on the spot, facing the nest.
    this.moveTo(pt(spot.x + Math.cos(this.age * 1.4) * 4, spot.y + Math.sin(this.age * 1.4) * 3), 12, dt);
    this.heading = Math.atan2(this.nest.y - this.y, this.nest.x - this.x);
  }
}

/** Whether an enemy is a hen that lays eggs (the world lays the next egg where she says). */
export function isLayer(e: Enemy): e is LayingHen {
  return e instanceof LayingHen;
}

function hasEgg(ctx: EnemyCtx, nest: Pt): boolean {
  return ctx.prey.some((p) => p.nest !== null && dist(p.nest, nest) < 1);
}

function nearestEmpty(ctx: EnemyCtx, from: Pt): Pt | null {
  const empty = (ctx.level.nests ?? []).filter((n) => !hasEgg(ctx, n));
  return empty.reduce<Pt | null>((best, n) => (best === null || dist(from, n) < dist(from, best) ? n : best), null);
}
