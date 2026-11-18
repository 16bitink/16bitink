import Phaser from 'phaser';
import { ART_STYLE } from '../art/style';

/**
 * Small generated textures for effects that have no painted art: a soft
 * dot (the plain stone trail), a faint shadow, a light disc for the lantern.
 * Made once per scene from a radial gradient.
 */
export const SOFT_DOT = 'fx-soft-dot';
export const SHADOW_DOT = 'fx-shadow-dot';
export const LIGHT_DISC = 'fx-light-disc';
const SIZE = 64;

function radial(scene: Phaser.Scene, key: string, rgb: string, stops: readonly (readonly [number, number])[]): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, SIZE, SIZE);
  if (!tex) return;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  for (const [at, alpha] of stops) g.addColorStop(at, `rgba(${rgb},${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  tex.refresh();
}

/** Ink set: flat dots, no glow (the trail is a faint pen dot, the shadow a pale ink disc). */
function flat(scene: Phaser.Scene, key: string, rgb: string, alpha: number, r: number): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, SIZE, SIZE);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.fillStyle = `rgba(${rgb},${alpha})`;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE * r, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
}

export function ensureSoftTextures(scene: Phaser.Scene): void {
  if (ART_STYLE === 'ink') {
    flat(scene, SOFT_DOT, '27,26,31', 0.35, 0.3);
    flat(scene, SHADOW_DOT, '27,26,31', 0.16, 0.36);
  }
  radial(scene, SOFT_DOT, '255,250,235', [[0, 0.9], [0.5, 0.45], [1, 0]]);
  radial(scene, SHADOW_DOT, '20,14,8', [[0, 0.55], [0.6, 0.3], [1, 0]]);
  radial(scene, LIGHT_DISC, '255,255,255', [[0, 1], [0.55, 0.85], [1, 0]]);
}
