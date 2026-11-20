import Phaser from 'phaser';
import { ChapterMapScene, MAP_KEY, type MapHooks } from '../scenes/map/ChapterMapScene';
import type { MissionScene } from '../scenes/mission/MissionScene';
import { stageSize, type StageSize } from './stageSize';

export { NATIVE_HEIGHT, stageSize } from './stageSize';

/**
 * The game's one Phaser instance: the chapter map's land, or a mission, at
 * the size stageSize picks (zoomed in on a phone), following the parent's
 * size. The DOM screens and HUD sit over it.
 */

export class Stage {
  readonly game: Phaser.Game;
  readonly map: ChapterMapScene;
  private readonly resizer: ResizeObserver;
  private mission: MissionScene | null = null;
  private serial = 0;

  constructor(private readonly parent: HTMLElement, hooks: MapHooks) {
    const s = this.size();
    this.map = new ChapterMapScene(hooks);
    this.game = new Phaser.Game({
      type: Phaser.WEBGL, parent, width: s.width, height: s.height, backgroundColor: '#1b1a16', pixelArt: true, roundPixels: true, antialias: false,
      scale: { mode: Phaser.Scale.NONE, zoom: s.zoom },
      // The texture units WebGL promises everywhere, as the other games.
      render: { maxTextures: 8, powerPreference: 'high-performance' },
      input: { activePointers: 3 }, audio: { noAudio: true }, banner: false, scene: [this.map],
    });
    this.resizer = new ResizeObserver(() => this.fit());
    this.resizer.observe(parent);
  }

  private size(): StageSize {
    return stageSize(this.parent.clientWidth || innerWidth, this.parent.clientHeight || innerHeight, devicePixelRatio || 1);
  }

  private fit(): void {
    const s = this.size();
    if (s.width !== this.game.scale.width || s.height !== this.game.scale.height) this.game.scale.resize(s.width, s.height);
    if (Math.abs(this.game.scale.zoom - s.zoom) > 1e-6) this.game.scale.setZoom(s.zoom);
  }

  /** Runs a mission scene in place of the map. */
  startMission(make: (key: string) => MissionScene): MissionScene {
    this.endMission();
    const scene = make(`Mission${++this.serial}`);
    this.game.scene.sleep(MAP_KEY);
    this.game.scene.add(scene.sys.settings.key, scene, true);
    this.mission = scene;
    return scene;
  }

  /** Drops the mission (if any) and shows the map again. */
  endMission(): void {
    if (this.mission) {
      this.game.scene.remove(this.mission.sys.settings.key);
      this.mission = null;
    }
    this.game.scene.wake(MAP_KEY);
  }

  destroy(): void {
    this.resizer.disconnect();
    this.game.destroy(true);
  }
}
