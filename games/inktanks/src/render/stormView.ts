import type Phaser from 'phaser';
import worldManifest from '../art/pixel/world/manifest.json';
import type { Match } from '../logic/match/match';
import { WORLD_URLS, worldKey } from './worldArt';

/**
 * The sandstorm over the player's view (match/weather.ts): a wall of sand
 * that closes in to about the storm's sight round your tank, with sand
 * drifting across it. Both images follow the player in world space, so the
 * clear circle is the storm's sight in world px at any zoom.
 *
 * The drift is the delivered painted haze (world/fx/sandstorm.png, 512 px,
 * seamless, straight alpha; manifest.overlays.sandstorm), tiled and drifting.
 * A blizzard (chapter 4) has a white veil and the painted driving snow
 * (manifest.overlays.blizzard: streaks from upper right to lower left) in two
 * layers, one fast at 1×, one slower and fainter at 2×.
 */
const OVERLAYS = (worldManifest as unknown as { overlays?: Readonly<Record<string, { file: string }>> }).overlays ?? {};
const KEY = { veil: 'fx:storm-veil', drift: 'fx:sandstorm', snowVeil: 'fx:blizzard-veil', snow: 'fx:blizzard' } as const;
const SAND = { r: 214, g: 178, b: 120 } as const;
const SNOW = { r: 236, g: 242, b: 248 } as const;
/** The painted snow's drift, px/s (along its streaks), for the near layer; the far one at FAR × it. */
const SNOW_DRIFT = { x: -200, y: 260 } as const;
const FAR = 0.45;
/** The veil's clear centre as a share of its half-size: the display is sized so this radius is the storm's sight. */
const CLEAR = 0.18;
const FADE = 0.3;
const DEPTH = 8500;
/** The wind: drift speed, px/s, and direction (from the west, a little south). */
const WIND = { x: 220, y: 40 } as const;
const VEIL_SIZE = 512;

export function preloadStorm(scene: Phaser.Scene): void {
  for (const [name, k] of [['sandstorm', KEY.drift], ['blizzard', KEY.snow]] as const) {
    const file = OVERLAYS[name]?.file;
    const url = file ? WORLD_URLS.get(worldKey(file)) : undefined;
    if (url && !scene.textures.exists(k)) scene.load.image(k, url);
  }
}

/** A radial veil: clear in the middle, sand (or snow) at the edge. */
function makeVeil(scene: Phaser.Scene, key: string, c0: { r: number; g: number; b: number }): void {
  if (scene.textures.exists(key)) return;
  const c = scene.textures.createCanvas(key, VEIL_SIZE, VEIL_SIZE);
  if (!c) return;
  const g = c.getContext();
  const h = VEIL_SIZE / 2;
  const grad = g.createRadialGradient(h, h, h * CLEAR, h, h, h * FADE);
  grad.addColorStop(0, `rgba(${c0.r},${c0.g},${c0.b},0)`);
  grad.addColorStop(0.5, `rgba(${c0.r},${c0.g},${c0.b},0.8)`);
  grad.addColorStop(1, `rgba(${c0.r - 20},${c0.g - 24},${c0.b - 20},0.97)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, VEIL_SIZE, VEIL_SIZE);
  c.refresh();
}

export class StormLayer {
  private veil: Phaser.GameObjects.Image | null = null;
  private sand: Phaser.GameObjects.TileSprite | null = null;
  /** A blizzard's second, slower snow layer (2× scale). */
  private far: Phaser.GameObjects.TileSprite | null = null;
  private t = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  update(m: Match, dt: number, view: Phaser.Geom.Rectangle): void {
    const now = m.stormNow();
    const level = now?.level ?? 0;
    const p = m.player;
    if (level <= 0 || !p || !m.storm) {
      this.veil?.setVisible(false);
      this.sand?.setVisible(false);
      this.far?.setVisible(false);
      return;
    }
    const snow = m.storm.kind === 'blizzard';
    this.ensure(snow);
    this.t += dt;
    // At full strength the clear circle is the storm's sight; while it rolls in the veil opens out.
    const sight = Math.min(2000, m.sight * 1.05);
    const half = sight / CLEAR;
    this.veil!.setVisible(true).setPosition(p.x, p.y).setDisplaySize(half * 2, half * 2).setAlpha(Math.min(1, level * 1.2));
    this.sand!.setVisible(true).setPosition(view.centerX, view.centerY).setSize(view.width + 64, view.height + 64);
    // The sand as it always drifted; the snow's tile offset runs against its drift, so the streaks move along themselves.
    const drift = snow ? { x: -SNOW_DRIFT.x, y: -SNOW_DRIFT.y } : WIND;
    this.sand!.setTilePosition(view.x + this.t * drift.x, view.y + this.t * drift.y).setAlpha((snow ? 0.8 : 0.65) * level);
    if (!this.far) return;
    this.far.setVisible(true).setPosition(view.centerX, view.centerY).setSize((view.width + 64) / 2, (view.height + 64) / 2);
    this.far.setTilePosition((view.x + this.t * drift.x * FAR) / 2, (view.y + this.t * drift.y * FAR) / 2).setAlpha(0.45 * level);
  }

  private ensure(snow: boolean): void {
    if (this.veil) return;
    const s = this.scene;
    const veil = snow ? KEY.snowVeil : KEY.veil;
    makeVeil(s, veil, snow ? SNOW : SAND);
    this.veil = s.add.image(0, 0, veil).setDepth(DEPTH);
    if (snow) this.far = s.add.tileSprite(0, 0, 64, 64, KEY.snow).setScale(2).setDepth(DEPTH + 0.5);
    this.sand = s.add.tileSprite(0, 0, 64, 64, snow ? KEY.snow : KEY.drift).setDepth(DEPTH + 1);
  }

  destroy(): void {
    this.veil?.destroy();
    this.sand?.destroy();
    this.far?.destroy();
  }
}
