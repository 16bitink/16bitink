import Phaser from 'phaser';
import { ART_KEYS } from '../art/manifest';
import { ensureArt, preloadArt } from '../render/art';
import type { PlayScene } from '../scenes/PlayScene';

/**
 * The game's one Phaser instance. Its canvas covers the parent at device
 * resolution (capped at 2x), so the painted art stays sharp; the play scene
 * places the 540 x 960 board inside it. The boot scene loads every image
 * once and reports progress; play scenes come and go on top.
 */
const MAX_DPR = 2;
const BOOT_KEY = 'Boot';

export interface StageHooks {
  progress(f: number): void;
  ready(): void;
  loadError(what: string): void;
}

class BootScene extends Phaser.Scene {
  constructor(private readonly hooks: StageHooks) {
    super({ key: BOOT_KEY });
  }

  preload(): void {
    this.load.on('progress', (f: number) => this.hooks.progress(f));
    this.load.on('loaderror', (file: Phaser.Loader.File) => this.hooks.loadError(file.key));
    preloadArt(this, ART_KEYS);
  }

  create(): void {
    ensureArt(this, ['chip', 'stone']);
    this.hooks.ready();
  }
}

export function stageSize(cssW: number, cssH: number, dpr: number): { width: number; height: number; zoom: number } {
  const d = Math.min(MAX_DPR, Math.max(1, dpr));
  return { width: Math.ceil(cssW * d), height: Math.ceil(cssH * d), zoom: 1 / d };
}

export class Stage {
  readonly game: Phaser.Game;
  private readonly resizer: ResizeObserver;
  private play: PlayScene | null = null;
  private serial = 0;

  constructor(private readonly parent: HTMLElement, hooks: StageHooks) {
    const s = this.size();
    this.game = new Phaser.Game({
      type: Phaser.WEBGL, parent, width: s.width, height: s.height, backgroundColor: '#1d3a44',
      scale: { mode: Phaser.Scale.NONE, zoom: s.zoom },
      render: { maxTextures: 8, powerPreference: 'high-performance', antialias: true },
      input: { activePointers: 2 }, audio: { noAudio: true }, banner: false, scene: [new BootScene(hooks)],
    });
    this.resizer = new ResizeObserver(() => this.fit());
    this.resizer.observe(parent);
  }

  private size(): { width: number; height: number; zoom: number } {
    return stageSize(this.parent.clientWidth || innerWidth, this.parent.clientHeight || innerHeight, devicePixelRatio || 1);
  }

  private fit(): void {
    const s = this.size();
    if (s.width !== this.game.scale.width || s.height !== this.game.scale.height) this.game.scale.resize(s.width, s.height);
    if (Math.abs(this.game.scale.zoom - s.zoom) > 1e-6) this.game.scale.setZoom(s.zoom);
  }

  /** Runs a play scene (replacing any other). */
  startPlay(make: (key: string) => PlayScene): PlayScene {
    this.endPlay();
    const scene = make(`Play${++this.serial}`);
    this.game.scene.add(scene.sys.settings.key, scene, true);
    this.play = scene;
    return scene;
  }

  endPlay(): void {
    if (!this.play) return;
    this.game.scene.remove(this.play.sys.settings.key);
    this.play = null;
  }

  destroy(): void {
    this.resizer.disconnect();
    this.game.destroy(true);
  }
}
