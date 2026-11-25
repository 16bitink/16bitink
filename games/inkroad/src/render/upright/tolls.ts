import type Phaser from 'phaser';
import type { CityView, Pt } from '../../sim/types';
import { lineLength, pointAt } from '../geom';
import { kerbOf, type RoadScene } from '../ground/roadShape';
import { projectY } from '../projection';
import { INK } from '../style';
import { ctxOf, makeCanvas } from '../tiles';

/** The beam of a toll gantry, post to post over the road, with a coin on it and the lamps that read the plates. */
const SCALE = 4;
const PAD = 8;
const POST = 22; // screen px from a post's foot to the beam
const THICK = 5;
const SIGN = 5.4;

export class Tolls {
  private images: Phaser.GameObjects.Image[] = [];
  private sig = '';

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {}

  refresh(city: CityView, roads: RoadScene): void {
    const tolled = roads.roads.filter((r) => r.road.toll && !r.waits);
    const sig = `${city.version}:${tolled.map((r) => r.road.id).join()}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.clear();
    for (const r of tolled) {
      const p = pointAt(r.road.line, lineLength(r.road.line) / 2);
      const off = r.half + kerbOf(r.road);
      const end = (side: number): Pt => ({ x: p.x - Math.sin(p.a) * off * side, y: p.y + Math.cos(p.a) * off * side });
      this.beam(`toll-${r.road.id}`, end(-1), end(1));
    }
  }

  private beam(key: string, a: Pt, b: Pt): void {
    const A = { x: a.x, y: projectY(a.y) - POST };
    const B = { x: b.x, y: projectY(b.y) - POST };
    const x0 = Math.min(A.x, B.x) - PAD;
    const y0 = Math.min(A.y, B.y) - PAD;
    const w = Math.abs(A.x - B.x) + PAD * 2;
    const h = Math.abs(A.y - B.y) + PAD * 2 + THICK;
    const c = makeCanvas(w * SCALE, h * SCALE);
    const g = ctxOf(c);
    g.setTransform(SCALE, 0, 0, SCALE, -x0 * SCALE, -y0 * SCALE);
    paint(g, A, B);
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.scene.textures.addCanvas(key, c);
    this.images.push(this.scene.add.image(x0, y0, key).setOrigin(0).setScale(1 / SCALE).setDepth(this.depth + Math.max(a.y, b.y) + 2));
  }

  clear(): void {
    for (const i of this.images) {
      const key = i.texture.key;
      i.destroy();
      this.scene.textures.remove(key);
    }
    this.images = [];
  }
}

function paint(g: CanvasRenderingContext2D, a: Pt, b: Pt): void {
  const bar = (grow: number, style: string, from: number, to: number): void => {
    g.strokeStyle = style;
    g.lineWidth = THICK + grow;
    g.beginPath();
    g.moveTo(a.x + (b.x - a.x) * from, a.y + (b.y - a.y) * from);
    g.lineTo(a.x + (b.x - a.x) * to, a.y + (b.y - a.y) * to);
    g.stroke();
  };
  g.lineCap = 'round';
  bar(1.8, INK, 0, 1);
  bar(0, '#ece4d2', 0, 1);
  g.lineCap = 'butt';
  for (let k = 0.06; k < 0.94; k += 0.16) bar(-1.4, '#2f8f92', k, k + 0.07);
  for (const k of [0.27, 0.73]) {
    const x = a.x + (b.x - a.x) * k;
    const y = a.y + (b.y - a.y) * k + THICK * 0.7;
    g.fillStyle = INK;
    g.fillRect(x - 1.6, y - 1, 3.2, 2.6);
    g.fillStyle = '#ffe9a8';
    g.fillRect(x - 0.9, y - 0.3, 1.8, 1.4);
  }
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  g.beginPath();
  g.arc(m.x, m.y, SIGN, 0, Math.PI * 2);
  g.fillStyle = '#e8bf52';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.1;
  g.stroke();
  g.beginPath();
  g.arc(m.x, m.y, SIGN * 0.62, 0, Math.PI * 2);
  g.strokeStyle = 'rgba(120,80,20,0.7)';
  g.lineWidth = 0.8;
  g.stroke();
}
