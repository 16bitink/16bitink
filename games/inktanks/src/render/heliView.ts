import type Phaser from 'phaser';
import type { Match } from '../logic/match/match';
import type { HeliProp, TruckProp } from '../logic/objectives/types';
import { worldKey } from './worldArt';
import { pickupKey } from './pickupArt';
import { SHADOW } from './tankView';
import bodyUrl from '../art/pixel/world/fx/heli-body.png?url';
import rotorUrl from '../art/pixel/world/fx/heli-rotor.png?url';

/**
 * The cargo helicopter (objectives/heli.ts): its body (PixelLab, nose up),
 * the rotor spun over it, and a shadow on the ground that slides away and
 * shrinks as it climbs. When it carries the cargo, the crate hangs under it.
 */
const KEY = { body: 'fx:heli-body', rotor: 'fx:heli-rotor' } as const;
const SIZE = { body: 1.35, rotor: 1.6, climb: 0.18 } as const;
/** The rotor hub, from the body's centre (px of the body art, nose up). */
const HUB = { dx: 0, dy: -14 } as const;
/** Ground to flying height, px of shadow offset. */
const HEIGHT = 140;
const DEPTH = { shadow: 21, ground: 4000, air: 7000 } as const;
const SPIN = 22;

export function preloadHeli(scene: Phaser.Scene): void {
  scene.load.image(KEY.body, bodyUrl);
  scene.load.image(KEY.rotor, rotorUrl);
}

interface Parts {
  readonly shadow: Phaser.GameObjects.Image;
  readonly rotorShadow: Phaser.GameObjects.Image;
  readonly body: Phaser.GameObjects.Image;
  readonly rotor: Phaser.GameObjects.Image;
  readonly cargo: Phaser.GameObjects.Image | null;
}

export class HeliLayer {
  private parts: Parts | null = null;
  private spin = 0;
  private truck: { body: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image } | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  update(m: Match, dt: number): void {
    this.drawTruck(m.objective.props().find((x): x is TruckProp => x.kind === 'truck') ?? null);
    const p = m.objective.props().find((x): x is HeliProp => x.kind === 'heli') ?? null;
    if (!p) {
      this.clear();
      return;
    }
    const s = this.scene;
    if (!this.parts) {
      const img = (k: string) => s.add.image(0, 0, k);
      this.parts = {
        shadow: img(KEY.body).setTint(0x000000).setAlpha(0.3),
        rotorShadow: img(KEY.rotor).setTint(0x000000).setAlpha(0.14),
        body: img(KEY.body),
        rotor: img(KEY.rotor).setAlpha(0.85),
        cargo: s.textures.exists(pickupKey('proto')) ? img(pickupKey('proto')) : null,
      };
    }
    const { shadow, rotorShadow, body, rotor, cargo } = this.parts;
    this.spin += dt * SPIN * p.rotor;
    // Nose up in the art: heading 0 (east) is a quarter turn.
    const rot = p.heading + Math.PI / 2;
    const grow = 1 + p.alt * SIZE.climb;
    const lift = p.alt * HEIGHT;
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    const hub = { x: HUB.dx * c - HUB.dy * sn, y: HUB.dx * sn + HUB.dy * c };
    const depth = p.alt > 0.05 ? DEPTH.air : DEPTH.ground + p.y / 1000;
    // Top-down like the tanks: the body over its ground point, the shadow thrown along the sun the higher it flies.
    const bx = p.x;
    const by = p.y;
    shadow.setPosition(p.x + SHADOW.x * (6 + lift), p.y + SHADOW.y * (6 + lift)).setRotation(rot).setScale(SIZE.body * (1 - p.alt * 0.15)).setDepth(DEPTH.shadow);
    rotorShadow.setPosition(shadow.x + hub.x, shadow.y + hub.y).setRotation(this.spin).setScale(SIZE.rotor * (1 - p.alt * 0.15)).setDepth(DEPTH.shadow + 0.01);
    if (cargo) {
      cargo.setVisible(p.cargo).setPosition(bx, by + 34 + p.alt * 30).setScale(0.9).setDepth(depth - 0.02);
    }
    body.setPosition(bx, by).setRotation(rot).setScale(SIZE.body * grow).setDepth(depth);
    rotor.setPosition(bx + hub.x * grow, by + hub.y * grow).setRotation(this.spin).setScale(SIZE.rotor * grow).setDepth(depth + 0.01);
  }

  /** The rescue truck (the escort truck's art, nose up), parked or driving off. */
  private drawTruck(p: TruckProp | null): void {
    const key = worldKey('vehicles/truck-1');
    if (!p || !this.scene.textures.exists(key)) {
      this.truck?.body.destroy();
      this.truck?.shadow.destroy();
      this.truck = null;
      return;
    }
    if (!this.truck) this.truck = { shadow: this.scene.add.image(0, 0, key).setTint(0x000000).setAlpha(0.32), body: this.scene.add.image(0, 0, key) };
    const rot = p.heading + Math.PI / 2;
    this.truck.shadow.setPosition(p.x + SHADOW.x * 6, p.y + SHADOW.y * 6).setRotation(rot).setDepth(DEPTH.shadow);
    this.truck.body.setPosition(p.x, p.y).setRotation(rot).setDepth(DEPTH.ground + p.y / 1000);
  }

  private clear(): void {
    if (!this.parts) return;
    for (const o of Object.values(this.parts)) o?.destroy();
    this.parts = null;
  }

  destroy(): void {
    this.clear();
    this.drawTruck(null);
  }
}
