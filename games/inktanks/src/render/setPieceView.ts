import type Phaser from 'phaser';
import type { Match } from '../logic/match/match';
import { CLAN_COLOUR } from '../logic/match/names';
import type { CameraProp, FlagProp } from '../logic/objectives/types';
import { WORLD } from '../art/pixel/world/world';
import { footDepth } from './tankView';
import { worldKey } from './worldArt';

/**
 * The new mission types' set pieces ("levels mean something", design doc):
 * - Capture: a flagpole per flag; our flag runs up as we take it, theirs as they retake it.
 * - Recon: a camera viewfinder over the camp while you dwell, a white flash once it's photographed.
 * (Chase's set piece is the courier's base gate, a structure the objective opens.)
 *
 * The flagpole is generated art (world structures flagBare / flagInk / flagCrow);
 * the image swaps when ownership changes. The hold bar under it and the
 * viewfinder and flash are UI marks (lines and a flash), as the rings are.
 */
const FLAG = { bare: 'flagBare', ours: 'flagInk', theirs: 'flagCrow' } as const;
const BAR = { w: 30, h: 4, dy: 12 } as const;
const DEPTH = { finder: 8100, flash: 8200 } as const;
const FLASH_S = 0.45;

interface FlagView {
  readonly shadow: Phaser.GameObjects.Image;
  readonly pole: Phaser.GameObjects.Image;
}

export class SetPieceLayer {
  private readonly flagViews: FlagView[] = [];
  private readonly holds: Phaser.GameObjects.Graphics;
  private readonly finder: Phaser.GameObjects.Graphics;
  private readonly flash: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.holds = scene.add.graphics().setDepth(DEPTH.finder);
    this.finder = scene.add.graphics().setDepth(DEPTH.finder);
    this.flash = scene.add.graphics().setDepth(DEPTH.flash);
  }

  update(m: Match): void {
    const props = m.objective.props();
    const clan = m.tanks.find((t) => t.team !== 0)?.clan ?? 'crows';
    const theirs = CLAN_COLOUR[clan];
    // Each clan flies its own flag where the art has one (Weasels from chapter 3, the Iron Hive from chapter 5).
    const own = clan === 'weasels' ? 'flagWeasel' : clan === 'hive' ? 'flagHive' : null;
    this.theirFlag = own && WORLD.structures[own] ? own : FLAG.theirs;
    const flags = props.filter((p): p is FlagProp => p.kind === 'flag');
    const hg = this.holds.clear();
    flags.forEach((f, i) => {
      this.showFlag(this.flagView(i), f);
      this.drawHold(hg, f, CLAN_COLOUR.ink, theirs);
    });
    for (let i = flags.length; i < this.flagViews.length; i++) {
      this.flagViews[i]!.pole.setVisible(false);
      this.flagViews[i]!.shadow.setVisible(false);
    }
    const fg = this.finder.clear();
    const xg = this.flash.clear();
    for (const c of props) if (c.kind === 'camera') this.drawCamera(fg, xg, c);
  }

  private flagView(i: number): FlagView {
    let v = this.flagViews[i];
    if (!v) {
      v = { shadow: this.scene.add.image(0, 0, worldKey('structures/flagBare-1')).setDepth(15), pole: this.scene.add.image(0, 0, worldKey('structures/flagBare-1')) };
      this.flagViews.push(v);
    }
    return v;
  }

  /** Theirs: the Weasels' flag on their levels (chapter 3), else the Crows'. */
  private theirFlag: string = FLAG.theirs;

  /** The pole's art by owner: bare until someone holds it, then ours (Ink) or theirs (Crow). */
  private showFlag(v: FlagView, f: FlagProp): void {
    const name = Math.abs(f.hold) < 0.02 ? FLAG.bare : f.hold > 0 ? FLAG.ours : this.theirFlag;
    const art = WORLD.structures[name];
    const key = worldKey(`structures/${name}-1`);
    if (!art || !this.scene.textures.exists(key)) return;
    const [ax, ay] = art.anchor;
    const [sw, sh] = art.size;
    const sortY = art.pieces[`${name}-1`]?.sortY ?? 0;
    v.pole.setTexture(key).setOrigin(ax / sw, ay / sh).setPosition(f.x, f.y).setDepth(footDepth(f.y + sortY)).setVisible(true);
    const sk = worldKey(art.shadows['1'] ?? '');
    if (art.shadows['1'] && this.scene.textures.exists(sk)) v.shadow.setTexture(sk).setOrigin(ax / sw, ay / sh).setPosition(f.x, f.y).setVisible(true);
    else v.shadow.setVisible(false);
  }

  /** The capture progress: a small bar under the pole in the holder's colour (UI mark, not the flag). */
  private drawHold(g: Phaser.GameObjects.Graphics, f: FlagProp, ours: number, theirs: number): void {
    const k = Math.abs(f.hold);
    if (k < 0.02 || k >= 0.999) return;
    const x = f.x - BAR.w / 2;
    const y = f.y + BAR.dy;
    g.fillStyle(0x000000, 0.45).fillRect(x - 1, y - 1, BAR.w + 2, BAR.h + 2);
    g.fillStyle(f.hold > 0 ? ours : theirs, 0.95).fillRect(x, y, BAR.w * k, BAR.h);
  }

  /** Four corner brackets closing in on the camp as the photo develops; the flash when it's taken. */
  private drawCamera(fg: Phaser.GameObjects.Graphics, xg: Phaser.GameObjects.Graphics, c: CameraProp): void {
    if (c.done) {
      if (c.since < FLASH_S) {
        const a = 1 - c.since / FLASH_S;
        xg.fillStyle(0xffffff, 0.75 * a).fillCircle(c.x, c.y, c.r * (0.7 + 0.5 * (1 - a)));
      }
      return;
    }
    const half = c.r * (1.1 - 0.4 * c.progress);
    const arm = 22;
    fg.lineStyle(3, 0xf4ecd8, 0.85);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const x = c.x + sx * half;
      const y = c.y + sy * half;
      fg.lineBetween(x, y, x - sx * arm, y).lineBetween(x, y, x, y - sy * arm);
    }
    fg.fillStyle(0xd85a3a, 0.9).fillCircle(c.x - half + 10, c.y - half + 10, 4);
  }

  destroy(): void {
    for (const g of [this.holds, this.finder, this.flash]) g.destroy();
    for (const v of this.flagViews) {
      v.pole.destroy();
      v.shadow.destroy();
    }
  }
}
