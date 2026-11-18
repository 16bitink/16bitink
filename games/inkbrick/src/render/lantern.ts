import Phaser from 'phaser';
import { ART_STYLE } from '../art/style';
import { BOARD_H, BOARD_W } from '../sim/types';
import type { BoardView } from './port';

/**
 * Dark levels: the board is dark except a soft circle of light around each
 * stone and a dim glow around the raft. One half-size canvas is redrawn each
 * frame (destination-out discs on a black fill); at most MAX_LIGHTS stones
 * are lit and stones close together share one disc, so 300 balls stay cheap.
 */
const SCALE = 0.5;
const DARK_ALPHA = 0.9;
const LIGHT_R = 80;
const RAFT_R = 78;
const RAFT_ALPHA = 0.5;
const MAX_LIGHTS = 40;
const MERGE_PX = 26;
const EDGE = 0.3;
/** Ink: the dark is the pen's own ink (a deep warm grey-black), not a blue night. */
const DARK_RGB = ART_STYLE === 'ink' ? '27,26,31' : '4,8,14';

export class Lantern {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Container) {
    const key = `lantern-${scene.scene.key}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    this.tex = scene.textures.createCanvas(key, Math.ceil(BOARD_W * SCALE), Math.ceil(BOARD_H * SCALE))!;
    this.canvas = this.tex.getSourceImage() as HTMLCanvasElement;
    this.ctx = this.tex.getContext();
    this.image = scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(BOARD_W, BOARD_H);
    layer.add(this.image);
  }

  private light(x: number, y: number, r: number, alpha: number): void {
    const c = this.ctx;
    const g = c.createRadialGradient(x * SCALE, y * SCALE, 0, x * SCALE, y * SCALE, r * SCALE);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(EDGE, `rgba(0,0,0,${alpha * 0.65})`);
    g.addColorStop(0.65, `rgba(0,0,0,${alpha * 0.25})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x * SCALE, y * SCALE, r * SCALE, 0, Math.PI * 2);
    c.fill();
  }

  /** Redraws the darkness for this frame's stones (up to MAX_LIGHTS, near ones merged). */
  sync(v: BoardView, raftY: number): void {
    const c = this.ctx;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.fillStyle = `rgba(${DARK_RGB},${DARK_ALPHA})`;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.globalCompositeOperation = 'destination-out';
    this.light(v.paddleX, raftY, RAFT_R, RAFT_ALPHA);
    const lit: { x: number; y: number }[] = [];
    for (const b of v.balls) {
      if (lit.length >= MAX_LIGHTS) break;
      if (lit.some((l) => Math.abs(l.x - b.x) < MERGE_PX && Math.abs(l.y - b.y) < MERGE_PX)) continue;
      lit.push(b);
      this.light(b.x, b.y, LIGHT_R, 1);
    }
    c.globalCompositeOperation = 'source-over';
    this.tex.refresh();
  }

  destroy(): void {
    this.image.destroy();
  }
}
