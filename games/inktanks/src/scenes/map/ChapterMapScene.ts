import Phaser from 'phaser';
import { chapterMap } from '../../content/chapterMaps';
import type { StructRt } from '../../logic/match/types';
import { GroundStream } from '../../render/ground';
import { StructLayer } from '../../render/structView';
import { preloadMission } from '../mission/MissionScene';

/**
 * The chapter map's painted land, behind the DOM level spots (src/ui/mapScreen.ts).
 * Its preload is also the game's boot: it loads every texture a mission
 * draws with, so missions start without a load. The camera shows SPOT_BOX,
 * zooming out only when the view is smaller than it.
 */
export const MAP_KEY = 'ChapterMap';

export interface MapHooks {
  readonly onProgress: (fraction: number) => void;
  readonly onReady: () => void;
  readonly onLoadError: (what: string) => void;
}

export class ChapterMapScene extends Phaser.Scene {
  private ground: GroundStream | null = null;
  private structs: StructLayer | null = null;
  /** The chapter shown (0-based); showChapter swaps the land. */
  private chapter = 0;

  constructor(private readonly hooks: MapHooks) {
    super(MAP_KEY);
  }

  preload(): void {
    this.load.on(Phaser.Loader.Events.PROGRESS, (f: number) => this.hooks.onProgress(f));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => this.hooks.onLoadError(file.key));
    preloadMission(this);
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.frame, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.frame, this));
    this.frame();
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => this.hooks.onReady());
  }

  /** Paints the chapter's land (called again when the chapter changes). */
  private build(): void {
    this.ground?.destroy();
    this.structs?.destroy();
    const land = chapterMap(this.chapter).land();
    const structs: StructRt[] = land.structures.map((def) => ({ def, hp: def.hp, state: 2 as const }));
    this.ground = new GroundStream(this, land);
    this.structs = new StructLayer(this, structs);
    this.cameras.main.setBounds(0, 0, land.width, land.height).setRoundPixels(true);
  }

  /** Shows another chapter's map (0-based). */
  showChapter(index: number): void {
    if (index === this.chapter) return;
    this.chapter = index;
    if (!this.ground) return;
    this.build();
    this.frame();
  }

  private get centre(): { x: number; y: number } {
    const b = chapterMap(this.chapter).box;
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 - 10 };
  }

  /** Fits the spots' box: whole native pixels when it fits, zoomed out when the view is smaller. */
  private frame(): void {
    const cam = this.cameras.main;
    const box = chapterMap(this.chapter).box;
    const zoom = Math.min(1, this.scale.width / box.w, this.scale.height / (box.h + 170));
    cam.setSize(this.scale.width, this.scale.height).setZoom(zoom);
    cam.centerOn(this.centre.x, this.centre.y);
    this.paint();
  }

  private paint(): void {
    const view = this.cameras.main.worldView;
    this.ground?.update(view);
    this.structs?.update(view, null);
  }

  update(): void {
    this.paint();
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
