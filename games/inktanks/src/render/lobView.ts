import type Phaser from 'phaser';
import type { Match } from '../logic/match/match';
import { isLobbed, LOB_ARC, lobSpot } from '../logic/match/lob';
import { SHADOW } from './tankView';

/**
 * Lobbed shells (the Mortar, match/lob.ts), drawn so a lob reads at a glance:
 * - the landing spot: a red ring the size of the blast that fills as the shell falls,
 *   so you can see where it lands and drive out (ours are pale, not red);
 * - the shell itself up in its arc, with its shadow sliding along the ground;
 * - with a mortar fitted, your own reticle where your next shell would land.
 * Code draws only rings, dots and shadows here (the art rules), no sprites.
 */
const DEPTH = { ring: 890, shadow: 22, shell: 7050, reticle: 8050 } as const;
const ENEMY = 0xff6a4a;
const OURS = 0xf4ecd8;

export class LobLayer {
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly shadows: Phaser.GameObjects.Graphics;
  private readonly shells: Phaser.GameObjects.Graphics;
  private readonly reticle: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.rings = scene.add.graphics().setDepth(DEPTH.ring);
    this.shadows = scene.add.graphics().setDepth(DEPTH.shadow);
    this.shells = scene.add.graphics().setDepth(DEPTH.shell);
    this.reticle = scene.add.graphics().setDepth(DEPTH.reticle);
  }

  update(m: Match): void {
    const rg = this.rings.clear();
    const sh = this.shadows.clear();
    const sg = this.shells.clear();
    for (const s of m.shots) {
      if (!s.lob) continue;
      const k = Math.min(1, s.travelled / s.range);
      const colour = s.team === 0 ? OURS : ENEMY;
      // The landing ring: faint at first, solid and filling as it comes down.
      rg.fillStyle(colour, 0.06 + 0.16 * k).fillCircle(s.lob.tx, s.lob.ty, s.splash);
      rg.lineStyle(2, colour, 0.45 + 0.45 * k).strokeCircle(s.lob.tx, s.lob.ty, s.splash);
      rg.lineStyle(2, colour, 0.9).strokeCircle(s.lob.tx, s.lob.ty, Math.max(2, s.splash * (1 - k)));
      // Up in the air: height on a parabola, the shadow on the ground under it.
      const h = Math.sin(Math.PI * k) * s.range * LOB_ARC;
      sh.fillStyle(0x000000, 0.25).fillEllipse(s.x + SHADOW.x * 2, s.y + SHADOW.y * 2, 8, 5);
      sg.fillStyle(0x2a2620, 1).fillCircle(s.x, s.y - h, 4 + 2 * Math.sin(Math.PI * k));
      sg.fillStyle(0xffe0a0, 0.5).fillCircle(s.x - 1, s.y - h - 1, 1.5);
    }
    this.drawReticle(m);
  }

  /** Your mortar's next landing spot: a small cross in a ring, dim while reloading. */
  private drawReticle(m: Match): void {
    const g = this.reticle.clear();
    const p = m.player;
    if (!p?.alive || !isLobbed(p.stats.gun)) return;
    const at = lobSpot(p);
    const ready = p.reload <= 0;
    const r = p.stats.gun.splash;
    g.lineStyle(1.5, OURS, ready ? 0.8 : 0.3).strokeCircle(at.x, at.y, r);
    g.lineBetween(at.x - 8, at.y, at.x + 8, at.y).lineBetween(at.x, at.y - 8, at.x, at.y + 8);
  }

  destroy(): void {
    for (const g of [this.rings, this.shadows, this.shells, this.reticle]) g.destroy();
  }
}
