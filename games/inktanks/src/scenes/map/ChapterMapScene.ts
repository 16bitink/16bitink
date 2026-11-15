import Phaser from 'phaser';
import { chapterMap, MAP_ART_SCALE, MAP_H, MAP_W } from '../../content/chapterMaps';
import { preloadMission } from '../mission/MissionScene';

/**
 * The chapter map's painting, behind the DOM level spots (src/ui/mapScreen.ts).
 * Its preload is also the game's boot: it loads every texture a mission
 * draws with, so missions start without a load, plus the shown chapter's
 * painting (the others load when first shown). The camera shows SPOT_BOX,
 * zooming out only when the view is smaller than it, and never past the
 * painting's edges.
 */
export const MAP_KEY = 'ChapterMap';

export interface MapHooks {
  readonly onProgress: (fraction: number) => void;
  readonly onReady: () => void;
  readonly onLoadError: (what: string) => void;
}

const artKey = (index: number): string => `chapterMap${index}`;

export class ChapterMapScene extends Phaser.Scene {
  private art: Phaser.GameObjects.Image | null = null;
  /** The chapter shown (0-based); showChapter swaps the painting. */
  private chapter = 0;
  private created = false;

  constructor(private readonly hooks: MapHooks) {
    super(MAP_KEY);
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, (f: number) => this.hooks.onProgress(f));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => this.hooks.onLoadError(file.key));
    preloadMission(this);
    this.load.image(artKey(this.chapter), chapterMap(this.chapter).art);
  }

  create(): void {
    // The boot bar is done; later loads (other chapters' paintings) don't report to it.
    this.load.off(Phaser.Loader.Events.PROGRESS);
    this.created = true;
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H).setRoundPixels(true);
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.frame, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.frame, this));
    this.frame();
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => this.hooks.onReady());
  }

  /** Shows the chapter's painting, loading it first if it isn't yet. */
  private build(): void {
    const index = this.chapter;
    const key = artKey(index);
    if (!this.textures.exists(key)) {
      this.load.image(key, chapterMap(index).art);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        if (this.chapter === index && this.textures.exists(key)) this.build();
      });
      this.load.start();
      return;
    }
    this.art?.destroy();
    this.art = this.add.image(0, 0, key).setOrigin(0).setScale(MAP_ART_SCALE);
  }

  /** Shows another chapter's map (0-based). */
  showChapter(index: number): void {
    if (index === this.chapter) return;
    this.chapter = index;
    if (!this.created) return;
    this.build();
    this.frame();
  }

  private get centre(): { x: number; y: number } {
    const b = chapterMap(this.chapter).box;
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 - 10 };
  }

  /**
   * Fits the spots' box: whole native pixels when it fits, zoomed out when
   * the view is smaller; zoomed in just enough that the view stays on the painting.
   */
  private frame(): void {
    const cam = this.cameras.main;
    const box = chapterMap(this.chapter).box;
    const fit = Math.min(1, this.scale.width / box.w, this.scale.height / (box.h + 170));
    const zoom = Math.max(fit, this.scale.width / MAP_W, this.scale.height / MAP_H);
    cam.setSize(this.scale.width, this.scale.height).setZoom(zoom);
    cam.centerOn(this.centre.x, this.centre.y);
  }

  /** A world point in CSS px relative to the canvas (for the DOM spots). */
  toScreen(x: number, y: number): { x: number; y: number } {
    const r = this.game.canvas.getBoundingClientRect();
    // Worked out here rather than read from worldView, which only updates at the next render.
    const zoom = this.cameras.main.zoom;
    const w = this.scale.width / zoom;
    const h = this.scale.height / zoom;
    const c = this.centre;
    return { x: ((x - (c.x - w / 2)) / w) * r.width, y: ((y - (c.y - h / 2)) / h) * r.height };
  }
}
