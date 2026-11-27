import Phaser from 'phaser';
import type { CityEvent } from '../../sim/types';
import { dressCar } from './carDress';
import type { CarLayer } from './carLayer';
import { ManoeuvreCore, type Blinker } from './manoeuvreCore';
import type { ParkedCars } from './parkedCars';

export type { Blinker } from './manoeuvreCore';

type ParkEvent = Extract<CityEvent, { t: 'park' }>;
type GoEvent = Extract<CityEvent, { t: 'parkGo' }>;

/**
 * Cars turning into and out of their spaces: the pictures. Where each car is drawn comes from the pure
 * `ManoeuvreCore` (src/render/cars/manoeuvreCore.ts), which the motion tests drive the same way.
 * Pooled; nothing is allocated per frame.
 */
export class Manoeuvres {
  private readonly core: ManoeuvreCore<Phaser.GameObjects.Image>;

  constructor(private readonly scene: Phaser.Scene, private readonly cars: CarLayer, parked: ParkedCars, private readonly depth: number) {
    this.core = new ManoeuvreCore(parked, () => this.image(), (m) => m.tag.setVisible(false));
  }

  get active(): number { return this.core.active; }
  get blinkers(): readonly Blinker[] { return this.core.blinkers; }

  start(e: ParkEvent): void { this.core.start(e); this.paint(); }
  go(e: GoEvent): void { this.core.go(e); }
  dropWaiting(): void { this.core.dropWaiting(); }

  /** `seconds`: sim seconds since last frame (zero while paused). */
  update(seconds: number): void {
    this.core.update(seconds);
    this.paint();
  }

  clear(): void { this.core.clear(); }

  private image(): Phaser.GameObjects.Image {
    const img = new Phaser.GameObjects.Image(this.scene, 0, 0, '__DEFAULT').setVisible(false).setDepth(this.depth);
    this.scene.add.existing(img);
    return img;
  }

  private paint(): void {
    for (let i = 0; i < this.core.active; i++) {
      const m = this.core.at(i);
      dressCar(m.tag, this.cars, m.kind, m.tint, m.px, m.py, m.pa);
      m.tag.setAlpha(m.alpha);
    }
  }
}
