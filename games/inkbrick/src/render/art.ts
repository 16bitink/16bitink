import Phaser from 'phaser';
import { art, ART_KEYS } from '../art/manifest';
import type { BrickDef } from '../sim/types';

/**
 * The one place the game asks for art: the Art agent's manifest
 * (src/art/manifest.ts) gives each key its image URL. A key it doesn't have
 * (yet) gets a plain placeholder shape drawn once into a texture, so the
 * game always runs.
 */
export const ART_URLS: Readonly<Record<string, string>> = Object.fromEntries(ART_KEYS.map((k) => [k, art[k].url]));

export const artUrl = (key: string): string | null => ART_URLS[key] ?? null;

interface Placeholder {
  readonly w: number;
  readonly h: number;
  readonly fill: number;
  readonly edge: number;
  readonly circle: boolean;
}

const P = (w: number, h: number, fill: number, edge: number, circle = false): Placeholder => ({ w, h, fill, edge, circle });

/** Shapes for keys the manifest lacks. */
const PLACEHOLDERS: Readonly<Record<string, Placeholder>> = {
  chip: P(8, 8, 0xffffff, 0xffffff),
  stone: P(20, 20, 0xf4f0e6, 0x3a3630, true),
};

/** Picture bricks' palette (BrickDef.tint indexes it). */
export const PICTURE_TINTS: readonly number[] = [0xffffff, 0xf4d8a0, 0xe08a5a, 0xa05a3a, 0x5a3a2a, 0x8ac0d8, 0x4a7aa8, 0x8ab05a, 0xf0c040, 0x303030];
export const FIRE_TINT = 0xffa040;

/** tough-1 is intact, tough-3 the most cracked (a 2-hit brick goes 1 then 3). */
export function toughStage(hp: number, maxHp: number): 1 | 2 | 3 {
  const steps = maxHp - 1;
  if (steps <= 0) return 1;
  const lost = Math.min(steps, Math.max(0, maxHp - hp));
  return (1 + Math.round((lost / steps) * 2)) as 1 | 2 | 3;
}

/** The image for a brick in its current state (variant by index, cracks by hits lost). */
export function brickTexture(def: BrickDef, index: number, hp: number, maxHp: number, cracked: boolean): string {
  const sq = def.w === def.h ? '-sq' : '';
  if (def.tint !== undefined) return `brick-dense${sq}`;
  switch (def.kind) {
    case 'soft':
      return `brick-soft-${1 + (index % 3)}${sq}`;
    case 'tough':
      return `brick-tough-${toughStage(hp, maxHp)}${sq}`;
    case 'ice':
      return `brick-ice-${cracked ? 2 : 1}${sq}`;
    default:
      return `brick-${def.kind}${sq}`;
  }
}

/** Every key the play scene may draw (loaded up front so a crack or pickup never waits). */
export function playArtKeys(chapter: number): readonly string[] {
  const own = ART_KEYS.filter((k) => !k.startsWith('bg-') && k !== 'map');
  const c = Math.max(1, Math.min(5, chapter));
  return [...own, `bg-${c}-board`, `bg-${c}-wide`, 'chip'];
}

export const boardKey = (chapter: number): string => `bg-${Math.max(1, Math.min(5, chapter))}-board`;
export const surroundKey = (chapter: number): string => `bg-${Math.max(1, Math.min(5, chapter))}-wide`;

/** Queues the real images (scene preload). Missing ones are made in `ensureArt`. */
export function preloadArt(scene: Phaser.Scene, keys: readonly string[]): void {
  for (const k of keys) {
    const url = artUrl(k);
    if (url && !scene.textures.exists(k)) scene.load.image(k, url);
  }
}

function drawPlaceholder(scene: Phaser.Scene, key: string, p: Placeholder): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  if (p.circle) {
    g.fillStyle(p.fill).fillCircle(p.w / 2, p.h / 2, p.w / 2 - 1);
    g.lineStyle(3, p.edge).strokeCircle(p.w / 2, p.h / 2, p.w / 2 - 2);
  } else {
    g.fillStyle(p.fill).fillRoundedRect(1, 1, p.w - 2, p.h - 2, 3);
  }
  g.generateTexture(key, p.w, p.h);
  g.destroy();
}

/** Makes sure every key has a texture: the loaded image, else its placeholder (a grey box for unknown keys). */
export function ensureArt(scene: Phaser.Scene, keys: readonly string[]): void {
  for (const k of keys) {
    if (scene.textures.exists(k)) continue;
    drawPlaceholder(scene, k, PLACEHOLDERS[k] ?? P(64, 64, 0x808080, 0x303030));
  }
}
