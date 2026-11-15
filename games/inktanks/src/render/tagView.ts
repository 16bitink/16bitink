import type Phaser from 'phaser';
import { hidden } from '../logic/bots/perception';
import { inFog } from '../logic/match/fog';
import type { Match } from '../logic/match/match';
import { planTags, type TagPlan, type TagSubject } from './tagLogic';

/**
 * Name plates over aces and bosses: the name in gold, aces with the gold ace emblem (generated art:
 * ui/ace-emblem.png). Our wingmen and freed clan crews get theirs in Brigade blue. Ordinary enemies get nothing (part icons on every tank were too much). Hidden or
 * fogged tanks get nothing either: a plate must never give one away.
 */
const emblems = import.meta.glob<string>('../art/pixel/ui/ace-emblem.png', { eager: true, query: '?url', import: 'default' });
const EMBLEM_URL = Object.values(emblems)[0] ?? null;
const EMBLEM_KEY = 'ui:ace-emblem';
const DEPTH = 8590;
const PLATE_LIFT = 72;

export function preloadTags(scene: Phaser.Scene): void {
  if (EMBLEM_URL) scene.load.image(EMBLEM_KEY, EMBLEM_URL);
}

interface Plate {
  readonly text: Phaser.GameObjects.Text;
  readonly emblem: Phaser.GameObjects.Image | null;
}

export class TagLayer {
  private readonly plates = new Map<number, Plate>();

  constructor(private readonly scene: Phaser.Scene) {}

  private lost(m: Match, t: TagSubject, view: Phaser.Geom.Rectangle): boolean {
    const tank = m.tank(t.id)!;
    if (tank.x < view.x - 20 || tank.x > view.right + 20 || tank.y < view.y - 90 || tank.y > view.bottom + 40) return true;
    const p = m.player;
    if (tank.team === m.player?.team) return false; // Ours: always shown.
    if (m.fogNow.length > 0 && inFog(m.fogNow, tank.x, tank.y)) return true;
    if (m.sight < Infinity && p && Math.hypot(tank.x - p.x, tank.y - p.y) > m.sight + 40) return true;
    return hidden(m, tank);
  }

  update(m: Match, view: Phaser.Geom.Rectangle): void {
    const plans = planTags(m.tanks, m.player?.team ?? null, (t) => !this.lost(m, t, view));
    const plated = new Set<number>();
    for (const plan of plans) {
      plated.add(plan.id);
      this.drawPlate(m.tank(plan.id)!, plan);
    }
    for (const [id, pl] of this.plates) if (!plated.has(id)) (pl.text.destroy(), pl.emblem?.destroy(), this.plates.delete(id));
  }

  private drawPlate(t: Match['tanks'][number], plan: TagPlan): void {
    let pl = this.plates.get(plan.id);
    if (!pl) {
      const text = this.scene.add
        .text(0, 0, plan.plate, { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '13px', fontStyle: 'bold', color: plan.ally ? '#8fb8ff' : '#ffd866', stroke: '#14110c', strokeThickness: 4 })
        .setOrigin(0.5).setDepth(DEPTH + 1);
      const emblem = plan.emblem && this.scene.textures.exists(EMBLEM_KEY) ? this.scene.add.image(0, 0, EMBLEM_KEY).setDisplaySize(24, 24).setDepth(DEPTH + 1) : null;
      pl = { text, emblem };
      this.plates.set(plan.id, pl);
    }
    const y = Math.round(t.y - PLATE_LIFT);
    const half = pl.text.width / 2;
    const em = pl.emblem ? 26 : 0;
    pl.text.setPosition(Math.round(t.x + em / 2), y);
    pl.emblem?.setPosition(Math.round(t.x - half - 2), y);
  }

  destroy(): void {
    for (const pl of this.plates.values()) (pl.text.destroy(), pl.emblem?.destroy());
    this.plates.clear();
  }
}
