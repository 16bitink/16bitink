import type Phaser from 'phaser';
import { GROUND_KINDS } from '../../art/manifest';
import { lotRect } from '../../city/geometry';
import type { Overlay } from '../../scenes/port';
import type { CityView, Pt } from '../../sim/types';
import { lineLength, pointAt } from '../geom';
import { project } from '../projection';
import { PLAIN } from '../style';
import { ctxOf, makeCanvas } from '../tiles';

/** What the map views say in words: spaces on car parks, faces on blocks, prices where money comes in. */
const EVERY_S = 1;
const TAG_CSS = 15;
const TAG_PX = 30;
const FACE_CSS = 34;
const FACE_PX = 96;
const FACES = ['calm', 'meh', 'angry'] as const;
type Face = (typeof FACES)[number];
const MEH_FROM = 0.34;
const ANGRY_FROM = 0.64;

export interface Mark { readonly at: Pt; readonly text?: string; readonly face?: Face }

/** What to show where for a view. Pure. */
export function marksOf(city: Pick<CityView, 'lots' | 'carParks' | 'roads' | 'prices' | 'lotMood'>, overlay: Overlay): Mark[] {
  const mid = (b: { gx: number; gy: number; w: number; h: number }): Pt => { const r = lotRect(b); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; };
  if (overlay === 'anger') {
    return city.lots.filter((l) => l.level > 0 && !GROUND_KINDS.includes(l.kind)).map((l) => {
      const v = city.lotMood(l.id).trips;
      return { at: mid(l), face: v > ANGRY_FROM ? 'angry' : v > MEH_FROM ? 'meh' : 'calm' };
    });
  }
  if (overlay === 'parking') return city.carParks.map((p) => ({ at: mid(p), text: `${Math.round(p.used)} of ${p.spaces}` }));
  if (overlay !== 'money') return [];
  const price = (n: number): string => (n > 0 ? `${Math.round(n * 10) / 10}` : 'free');
  return [
    ...city.carParks.map((p) => ({ at: mid(p), text: `park ${price(city.prices.park)}` })),
    ...city.roads.filter((r) => r.toll).map((r) => ({ at: pointAt(r.line, lineLength(r.line) / 2), text: `toll ${price(city.prices.tollPeak)}` })),
    ...city.roads.filter((r) => r.kerb && lineLength(r.line) > 90).map((r) => ({ at: pointAt(r.line, lineLength(r.line) / 2), text: `kerb ${price(city.prices.parkPeak)}` })),
  ];
}

export class Marks {
  private texts: Phaser.GameObjects.Text[] = [];
  private faces: Phaser.GameObjects.Image[] = [];
  private wait = 0;
  private shown: Overlay = 'none';
  private zoom = 1;

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {
    for (const f of FACES) faceTexture(scene, f);
  }

  update(dt: number, city: CityView, overlay: Overlay, zoom: number): void {
    this.wait -= dt;
    if (overlay !== this.shown || this.wait <= 0) {
      this.wait = EVERY_S;
      this.shown = overlay;
      this.fill(marksOf(city, overlay));
      this.zoom = 0;
    }
    if (zoom === this.zoom) return;
    this.zoom = zoom;
    for (const t of this.texts) t.setScale(TAG_CSS / TAG_PX / zoom);
    for (const f of this.faces) f.setScale(FACE_CSS / FACE_PX / zoom);
  }

  private fill(list: readonly Mark[]): void {
    const words = list.filter((m) => m.text !== undefined);
    const moods = list.filter((m) => m.face !== undefined);
    while (this.texts.length < words.length) this.texts.push(this.tag());
    while (this.faces.length < moods.length) this.faces.push(this.scene.add.image(0, 0, 'fx-face-calm').setDepth(this.depth));
    this.texts.forEach((t, i) => {
      const m = words[i];
      t.setVisible(m !== undefined);
      if (!m) return;
      const p = project(m.at);
      if (t.text !== m.text) t.setText(m.text!);
      t.setPosition(p.x, p.y);
    });
    this.faces.forEach((f, i) => {
      const m = moods[i];
      f.setVisible(m !== undefined);
      if (!m) return;
      const p = project(m.at);
      f.setTexture(`fx-face-${m.face}`).setPosition(p.x, p.y).setAlpha(m.face === 'calm' ? 0.8 : 1);
    });
  }

  private tag(): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, '', { fontFamily: PLAIN, fontSize: `${TAG_PX}px`, fontStyle: '800', color: '#2a2832', backgroundColor: '#fffaf0', padding: { x: 14, y: 7 } })
      .setOrigin(0.5).setDepth(this.depth);
  }

  clear(): void {
    this.texts.forEach((t) => t.destroy());
    this.faces.forEach((f) => f.destroy());
    this.texts = [];
    this.faces = [];
    this.wait = 0;
  }
}

const SKIN: Readonly<Record<Face, string>> = { calm: '#a9cfa4', meh: '#efcf7c', angry: '#e88a4e' };

function faceTexture(scene: Phaser.Scene, face: Face): void {
  const key = `fx-face-${face}`;
  if (scene.textures.exists(key)) return;
  const c = makeCanvas(FACE_PX, FACE_PX);
  const g = ctxOf(c);
  const m = FACE_PX / 2;
  g.lineCap = 'round';
  g.lineWidth = 5;
  g.strokeStyle = '#2a2832';
  g.fillStyle = SKIN[face];
  g.beginPath();
  g.ellipse(m, m, m - 7, m - 8, 0.06, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#2a2832';
  for (const x of [m - 15, m + 15]) { g.beginPath(); g.arc(x, m - 6, 4.6, 0, Math.PI * 2); g.fill(); }
  g.beginPath();
  if (face === 'calm') g.arc(m, m + 6, 17, 0.25, Math.PI - 0.25);
  else if (face === 'meh') { g.moveTo(m - 14, m + 19); g.lineTo(m + 14, m + 17); }
  else g.arc(m, m + 31, 16, Math.PI + 0.3, -0.3);
  if (face === 'angry') for (const s of [-1, 1]) { g.moveTo(m + s * 26, m - 24); g.lineTo(m + s * 8, m - 15); }
  g.stroke();
  scene.textures.addCanvas(key, c);
}
