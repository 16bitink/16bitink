import type Phaser from 'phaser';
import { VEHICLES } from '../../sim/constants';
import type { VehicleKind } from '../../sim/types';
import { projectAngle, projectY } from '../projection';
import { carOrigin, headingFrame, HEADINGS } from './carAtlas';
import type { CarLayer } from './carLayer';

/** Puts a car's picture on an image at a plan pose: the nearest baked heading, turned by the rest. Shared so a car looks the same moving and standing. */
export function dressCar(img: Phaser.GameObjects.Image, cars: CarLayer, kindName: string, tint: number, x: number, y: number, a: number): void {
  const kind = Math.max(0, VEHICLES.indexOf(kindName as VehicleKind));
  const { index, rest } = headingFrame(a);
  const f = cars.frame(kind, tint, index);
  const o = carOrigin(VEHICLES[kind] as VehicleKind);
  const step = (index * Math.PI * 2) / HEADINGS;
  img.setTexture(f.texture, f.frame).setOrigin(o.x, o.y).setScale(1 / f.scale).setPosition(x, projectY(y)).setVisible(true);
  img.rotation = projectAngle(step + rest) - projectAngle(step);
}
