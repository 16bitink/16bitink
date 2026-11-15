import type Phaser from 'phaser';
import { hidden } from '../logic/bots/perception';
import { inFog } from '../logic/match/fog';
import type { Match } from '../logic/match/match';
import { MK_COLOUR } from '../logic/parts';
import { partsArt } from './partsArt';
import { planTags, type IconKind, type TagPlan, type TagSubject } from './tagLogic';

/**
 * Tags over enemy tanks. Part icons (gun, hull, drive) in a small row under every visible enemy, each on a
 * rarity-coloured underline for its Mk, so you pick targets by the tech you want (design doc, "Intel and
 * the workshop"). Aces and bosses wear a name plate over the tank, aces with the gold ace emblem (generated
 * art: ui/ace-emblem.png). Hidden or fogged tanks get nothing: a tag must never give one away.
 */
const emblems = import.meta.glob<string>('../art/pixel/ui/ace-emblem.png', { eager: true, query: '?url', import: 'default' });
const EMBLEM_URL = Object.values(emblems)[0] ?? null;
const EMBLEM_KEY = 'ui:ace-emblem';
const ICON_PREFIX = 'tag:';
const DEPTH = 8590;
const BELOW = 32;
const PLATE_LIFT = 72;
const ICON = 16;
const GAP = 2;

const coarse = (): boolean => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export function preloadTags(scene: Phaser.Scene): void {
  if (EMBLEM_URL) scene.load.image(EMBLEM_KEY, EMBLEM_URL);
  for (const [key, url] of partsArt().urls) if (key.startsWith('icons/')) scene.load.image(ICON_PREFIX + key.slice(6), url);
}

interface Plate {
  readonly text: Phaser.GameObjects.Text;
  readonly emblem: Phaser.GameObjects.Image | null;
}

export class TagLayer {
  private g: Phaser.GameObjects.Graphics | null = null;
  private readonly icons = new Map<string, Phaser.GameObjects.Image>();
  private readonly plates = new Map<number, Plate>();

  constructor(private readonly scene: Phaser.Scene) {}

  private lost(m: Match, t: TagSubject, view: Phaser.Geom.Rectangle): boolean {
    if (t.x < view.x - 20 || t.x > view.right + 20 || t.y < view.y - 90 || t.y > view.bottom + 40) return true;
    const p = m.player;
    if (m.fogNow.length > 0 && inFog(m.fogNow, t.x, t.y)) return true;
    if (m.sight < Infinity && p && Math.hypot(t.x - p.x, t.y - p.y) > m.sight + 40) return true;
    return hidden(m, m.tank(t.id)!);
  }

  update(m: Match, view: Phaser.Geom.Rectangle): void {
    const g = (this.g ??= this.scene.add.graphics().setDepth(DEPTH));
    g.clear();
    const plans = planTags(m.tanks, m.player, (t) => !this.lost(m, t, view));
    const used = new Set<string>();
    const plated = new Set<number>();
    const size = coarse() ? 20 : ICON;
    for (const plan of plans) {
      const t = m.tank(plan.id)!;
      this.drawIcons(g, t, plan, size, used);
      if (plan.plate) {
        plated.add(plan.id);
        this.drawPlate(t, plan);
      }
    }
    for (const [k, im] of this.icons) if (!used.has(k)) (im.destroy(), this.icons.delete(k));
    for (const [id, pl] of this.plates) if (!plated.has(id)) (pl.text.destroy(), pl.emblem?.destroy(), this.plates.delete(id));
  }

  private drawIcons(g: Phaser.GameObjects.Graphics, t: Match['tanks'][number], plan: TagPlan, size: number, used: Set<string>): void {
    const art = partsArt();
    const n = plan.icons.length;
    const w = n * size + (n - 1) * GAP;
    const x0 = Math.round(t.x - w / 2);
    const y = Math.round(t.y + BELOW);
    plan.icons.forEach((kind: IconKind, i) => {
      const p = t.loadout[kind];
      const url = art.icon(p);
      const x = x0 + i * (size + GAP);
      g.fillStyle(0xe8dcc0, 0.82 * plan.alpha).fillRect(x - 1, y - 1, size + 2, size + 4);
      g.fillStyle(MK_COLOUR[p.mk].hex, plan.alpha).fillRect(x - 1, y + size + 1, size + 2, 2);
      if (!url) return;
      const key = ICON_PREFIX + url.slice(url.lastIndexOf('/') + 1).replace(/\.png.*$/, '');
      const id = `${t.id}:${kind}`;
      used.add(id);
      let im = this.icons.get(id);
      if (!im && this.scene.textures.exists(key)) {
        im = this.scene.add.image(0, 0, key).setDepth(DEPTH + 1);
        this.icons.set(id, im);
      }
      im?.setTexture(key).setDisplaySize(size, size).setPosition(x + size / 2, y + size / 2).setAlpha(plan.alpha);
    });
  }

  private drawPlate(t: Match['tanks'][number], plan: TagPlan): void {
    let pl = this.plates.get(plan.id);
    if (!pl) {
      const text = this.scene.add
        .text(0, 0, plan.plate!, { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '13px', fontStyle: 'bold', color: '#ffd866', stroke: '#14110c', strokeThickness: 4 })
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
    this.g?.destroy();
    this.g = null;
    for (const im of this.icons.values()) im.destroy();
    this.icons.clear();
    for (const pl of this.plates.values()) (pl.text.destroy(), pl.emblem?.destroy());
    this.plates.clear();
  }
}
