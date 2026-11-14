import type Phaser from 'phaser';
import { WORLD, type EffectArt } from '../art/pixel/world/world';
import type { Match } from '../logic/match/match';
import { footDepth } from './tankView';
import { ALL_KINDS as KINDS } from '../content/kinds';
import { WORLD_URLS, worldKey } from './worldArt';

/**
 * Chapter 3's fire (match/flame.ts): the Flamer's jet from the nozzle of
 * every tank streaming now, and flames standing on burning reeds. Both are
 * PixelLab strips in the world manifest's `effects` (flamer: a jet pointing
 * +x from its nozzle anchor, rotated to the gun and stretched to the range;
 * burningReeds: flames on the ground, anchor at their foot). Without the art
 * the jet is a drawn orange wedge and the reeds a flicker of circles.
 */
const EFFECTS: Readonly<Record<string, EffectArt>> = WORLD.effects ?? {};
const JET = { key: 'fx:flamer', anim: 'fx:flamer-loop' } as const;
const REEDS = { key: 'fx:burningReeds', anim: 'fx:burningReeds-loop' } as const;
/** Chapter 5: a blazing canopy over a burning tree (treeFire's anchor is the blaze's middle: the canopy centre, about the tree's foot minus 0.55 of its height). */
const TREE = { key: 'fx:treeFire', anim: 'fx:treeFire-loop', lift: 0.55, young: 0.6, youngBelow: 60 } as const;
/** A stream shows this long after its last tick (ticks are 0.1 s). */
const JET_HOLD = 0.14;
const DEPTH_JET = 5150;

export function preloadFlames(scene: Phaser.Scene): void {
  for (const [name, k] of [['flamer', JET.key], ['burningReeds', REEDS.key], ['treeFire', TREE.key]] as const) {
    const e = EFFECTS[name];
    const url = e ? WORLD_URLS.get(worldKey(e.file)) : undefined;
    if (e && url && !scene.textures.exists(k)) scene.load.spritesheet(k, url, { frameWidth: e.frame[0], frameHeight: e.frame[1] });
  }
}

function anim(scene: Phaser.Scene, key: string, name: string, e: EffectArt | undefined): boolean {
  if (!e || !scene.textures.exists(key)) return false;
  if (!scene.anims.exists(name)) scene.anims.create({ key: name, frames: scene.anims.generateFrameNumbers(key, {}), frameRate: e.fps, repeat: -1 });
  return true;
}

export class FlameLayer {
  private readonly jets = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly reeds = new Map<number, Phaser.GameObjects.Sprite[]>();
  private readonly drawn: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.drawn = scene.add.graphics().setDepth(DEPTH_JET);
  }

  update(m: Match): void {
    this.drawn.clear();
    this.updateJets(m);
    this.updateReeds(m);
  }

  private updateJets(m: Match): void {
    const art = EFFECTS.flamer;
    const has = anim(this.scene, JET.key, JET.anim, art);
    const live = new Set<number>();
    for (const t of m.tanks) {
      const g = t.stats.gun;
      if (!t.alive || g.cone <= 0 || m.t - t.firedAt > JET_HOLD) continue;
      live.add(t.id);
      const muzzle = t.stats.radius * 0.95;
      const x = t.x + Math.cos(t.turret) * muzzle;
      const y = t.y + Math.sin(t.turret) * muzzle;
      if (!has || !art) {
        // Stand-in: a wedge the width of the cone.
        const h = g.cone / 2;
        this.drawn.fillStyle(0xff9a3a, 0.55).fillTriangle(x, y, x + Math.cos(t.turret - h) * g.range, y + Math.sin(t.turret - h) * g.range, x + Math.cos(t.turret + h) * g.range, y + Math.sin(t.turret + h) * g.range);
        continue;
      }
      let s = this.jets.get(t.id);
      if (!s) {
        s = this.scene.add.sprite(x, y, JET.key).setOrigin(art.anchor[0] / art.frame[0], art.anchor[1] / art.frame[1]).play(JET.anim);
        this.jets.set(t.id, s);
      }
      // Stretched along x from the nozzle to the stream's reach; a little wider than drawn for the cone.
      const sx = g.range / Math.max(1, art.frame[0] - art.anchor[0]);
      s.setVisible(true).setPosition(x, y).setRotation(t.turret).setScale(sx, Math.max(1, sx * 0.8)).setDepth(Math.max(DEPTH_JET, footDepth(t.y + 30)));
    }
    for (const [id, s] of this.jets) {
      if (live.has(id)) continue;
      s.destroy();
      this.jets.delete(id);
    }
  }

  private updateReeds(m: Match): void {
    const art = EFFECTS.burningReeds;
    const has = anim(this.scene, REEDS.key, REEDS.anim, art);
    const treeArt = EFFECTS.treeFire;
    const hasTree = anim(this.scene, TREE.key, TREE.anim, treeArt);
    const live = new Set<number>();
    for (const f of m.fires.list) {
      live.add(f.i);
      // Up over its first 0.3 s, down over its last 0.6 s.
      const a = Math.max(0, Math.min(1, (m.t - f.at) / 0.3, (f.until - m.t) / 0.6));
      if (f.tree && hasTree && treeArt) {
        let blaze = this.reeds.get(f.i);
        if (!blaze) {
          const h = KINDS[m.structs[f.i]!.def.kind]?.height ?? 80;
          const sc = h < TREE.youngBelow ? TREE.young : 1;
          blaze = [this.scene.add.sprite(f.x, f.y - h * TREE.lift, TREE.key).setOrigin(treeArt.anchor[0] / treeArt.frame[0], treeArt.anchor[1] / treeArt.frame[1]).setScale(sc).setDepth(5100).play({ key: TREE.anim, startFrame: f.i % treeArt.frames })];
          this.reeds.set(f.i, blaze);
        }
        for (const s of blaze) s.setAlpha(a);
        continue;
      }
      if (!has || !art) {
        for (let k = 0; k < 3; k++) this.drawn.fillStyle(k % 2 ? 0xffc040 : 0xe0501c, 0.6 * a).fillCircle(f.x + Math.sin(m.t * 9 + k * 2 + f.i) * f.r * 0.4, f.y - 6 - k * 5, f.r * (0.5 - k * 0.1));
        continue;
      }
      let flames = this.reeds.get(f.i);
      if (!flames) {
        flames = [-0.45, 0.1, 0.5].map((dx, k) =>
          this.scene.add.sprite(f.x + dx * f.r, f.y + (k - 1) * 4, REEDS.key).setOrigin(art.anchor[0] / art.frame[0], art.anchor[1] / art.frame[1]).setDepth(footDepth(f.y + 12)).play({ key: REEDS.anim, startFrame: (k * 3 + f.i) % art.frames }),
        );
        this.reeds.set(f.i, flames);
      }
      for (const s of flames) s.setAlpha(a);
    }
    for (const [i, flames] of this.reeds) {
      if (live.has(i)) continue;
      for (const s of flames) s.destroy();
      this.reeds.delete(i);
    }
  }

  destroy(): void {
    for (const s of this.jets.values()) s.destroy();
    for (const fl of this.reeds.values()) for (const s of fl) s.destroy();
    this.drawn.destroy();
  }
}
