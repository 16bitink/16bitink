import Phaser from 'phaser';
import { INK_HEX, PAPER_HEX, RED_HEX } from '../../art/palette';
import type { GameScene } from '../GameScene';
import { edgeMark } from '../game/followCam';
import { toView, viewSize } from '../hidpi';

/** Marks sit this far in from the screen's edges, view px (from the top and bottom by `insetY`, clear of the HUD's bands). */
const INSET = 20;
/** The mark's size, view px at UI scale 1. */
const SIZE = 11;

/**
 * Small red arrows at the screen's edge pointing at threats out of sight
 * (a hawk's shadow, a boss, a rival snake) while the phone camera shows only
 * part of the board, so being zoomed in never makes a hit unfair.
 */
export class EdgeMarks {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics();
  }

  update(scene: Phaser.Scene, game: GameScene, k: number, upright: boolean, time: number, hidden: boolean): void {
    const g = this.g;
    g.clear();
    if (hidden || !game.following || game.world.state !== 'play') return;
    const { width, height } = viewSize(scene);
    const s = SIZE * k;
    const pulse = 0.75 + 0.25 * Math.sin(time / 160);
    for (const t of game.threats()) {
      const d = game.toScreen(t.x, t.y);
      const v = toView(d.x, d.y, scene);
      const mark = edgeMark(v, width, height, INSET * k, (upright ? 64 : INSET) * k);
      if (!mark) continue;
      const a = mark.angle;
      const tip = { x: mark.x + Math.cos(a) * s, y: mark.y + Math.sin(a) * s };
      const l = { x: mark.x + Math.cos(a + 2.4) * s * 0.85, y: mark.y + Math.sin(a + 2.4) * s * 0.85 };
      const r = { x: mark.x + Math.cos(a - 2.4) * s * 0.85, y: mark.y + Math.sin(a - 2.4) * s * 0.85 };
      g.fillStyle(PAPER_HEX, 0.85 * pulse);
      g.fillCircle(mark.x, mark.y, s * 1.15);
      g.fillStyle(RED_HEX, pulse);
      g.fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
      g.lineStyle(Math.max(1, 1.4 * k), INK_HEX, 0.9 * pulse);
      g.strokeTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
