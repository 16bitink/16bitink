import type Phaser from 'phaser';
import { CELL } from '../../sim/constants';
import type { CityView, ToolId } from '../../sim/types';
import { TILT } from '../projection';
import { HAND } from '../style';

/** The charging zone's edge: bold while its tool is in hand, a quiet dashed line while the charge runs. */
const EDGE = 0x2f7f8f;
const PAPER = 0xfbf5e6;
const DASH = 18;
const GAP = 11;
const TEXT_PX = 44;
const TEXT_CSS = 26;

export class ZoneLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private sig = '';

  constructor(scene: Phaser.Scene, depth: number, labelDepth: number) {
    this.g = scene.add.graphics().setDepth(depth).setScale(1, TILT);
    this.label = scene.add.text(0, 0, '', { fontFamily: HAND, fontSize: `${TEXT_PX}px`, fontStyle: '700', color: '#1f5a66', stroke: '#fbf5e6', strokeThickness: 11 }).setOrigin(0.5, 1.2).setDepth(labelDepth).setVisible(false);
  }

  update(city: CityView, tool: ToolId | null, zoom: number): void {
    const held = tool === 'zone';
    const on = city.prices.zone > 0;
    const sig = `${city.def.id}:${held}:${on}:${city.prices.zone}`;
    if (sig !== this.sig) {
      this.sig = sig;
      this.draw(city, held, on);
    }
    if (this.label.visible) this.label.setScale(TEXT_CSS / TEXT_PX / zoom);
  }

  private draw(city: CityView, held: boolean, on: boolean): void {
    const g = this.g.clear();
    const cells = held || on ? city.def.rules.zoneCells ?? [] : [];
    this.label.setVisible(held && cells.length > 0);
    for (const [gx, gy, w, h] of cells) {
      const x = gx * CELL;
      const y = gy * CELL;
      if (held) g.fillStyle(EDGE, 0.16).fillRect(x, y, w * CELL, h * CELL);
      for (const [width, colour, alpha] of [[7, PAPER, 0.7], [4, EDGE, 1]] as const) {
        g.lineStyle(width, colour, alpha * (held ? 1 : 0.55));
        dashes(g, x, y, x + w * CELL, y);
        dashes(g, x + w * CELL, y, x + w * CELL, y + h * CELL);
        dashes(g, x + w * CELL, y + h * CELL, x, y + h * CELL);
        dashes(g, x, y + h * CELL, x, y);
      }
      this.label.setText(on ? `Charging zone: ${city.prices.zone} to drive in` : 'The charging zone').setPosition(x + (w * CELL) / 2, (y + (h * CELL) / 2) * TILT);
    }
  }
}

function dashes(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  for (let s = 0; s < len; s += DASH + GAP) {
    const e = Math.min(len, s + DASH);
    g.lineBetween(x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len, x0 + ((x1 - x0) * e) / len, y0 + ((y1 - y0) * e) / len);
  }
}
