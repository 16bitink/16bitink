import type Phaser from 'phaser';
import { WORLD } from '../art/pixel/world/world';
import type { Match } from '../logic/match/match';
import { WORLD_URLS, worldKey } from './worldArt';

/**
 * Fog banks (match/fog.ts) over the world: each bank is the painted swamp
 * mist (manifest.overlays.fog, 512 px, tileable, straight alpha) cut to a
 * soft-edged disc, drawn over tanks so whatever is inside reads as lost in
 * it. The disc is a little larger than the bank (its soft edge is the
 * bank's rim). Without the art, a pale radial haze.
 */
const KEY = { art: 'fx:fog', disc: 'fx:fog-disc' } as const;
const DISC = 256;
/** The disc drawn this much wider than the bank's radius. */
const OVER = 1.25;
const DEPTH = 5100;
const ALPHA = 0.92;

export function preloadFog(scene: Phaser.Scene): void {
  const file = WORLD.overlays?.fog?.file;
  const url = file ? WORLD_URLS.get(worldKey(file)) : undefined;
  if (url && !scene.textures.exists(KEY.art)) scene.load.image(KEY.art, url);
}

/** The mist cut to a disc: solid in the middle, fading out over the outer third. */
function makeDisc(scene: Phaser.Scene): void {
  if (scene.textures.exists(KEY.disc)) return;
  const c = scene.textures.createCanvas(KEY.disc, DISC, DISC);
  if (!c) return;
  const g = c.getContext();
  const h = DISC / 2;
  if (scene.textures.exists(KEY.art)) {
    const img = scene.textures.get(KEY.art).getSourceImage() as HTMLImageElement;
    g.drawImage(img, 0, 0, DISC, DISC);
    // Thicken it: the art's alpha tops out near 200, and a bank should hide what's in it.
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(226, 230, 220, 0.45)';
    g.fillRect(0, 0, DISC, DISC);
  } else {
    g.fillStyle = 'rgb(226, 230, 220)';
    g.fillRect(0, 0, DISC, DISC);
  }
  g.globalCompositeOperation = 'destination-in';
  const grad = g.createRadialGradient(h, h, h * 0.55, h, h, h);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, DISC, DISC);
  c.refresh();
}

export class FogLayer {
  private readonly discs: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  update(m: Match): void {
    if (m.fogNow.length === 0) return;
    if (this.discs.length === 0) {
      makeDisc(this.scene);
      for (let i = 0; i < m.fogNow.length; i++) this.discs.push(this.scene.add.image(0, 0, KEY.disc).setDepth(DEPTH + i * 0.01).setAlpha(ALPHA));
    }
    m.fogNow.forEach((b, i) => {
      // A slow turn so the mist inside seems to move even on a still bank.
      this.discs[i]?.setPosition(b.x, b.y).setDisplaySize(b.r * 2 * OVER, b.r * 2 * OVER).setRotation(m.t * 0.02 + i);
    });
  }

  destroy(): void {
    for (const d of this.discs) d.destroy();
  }
}
