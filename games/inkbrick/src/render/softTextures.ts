import Phaser from 'phaser';

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

export function ensureSoftTextures(scene: Phaser.Scene): void {
  radial(scene, SOFT_DOT, '255,250,235', [[0, 0.9], [0.5, 0.45], [1, 0]]);
  radial(scene, SHADOW_DOT, '20,14,8', [[0, 0.55], [0.6, 0.3], [1, 0]]);
  radial(scene, LIGHT_DISC, '255,255,255', [[0, 1], [0.55, 0.85], [1, 0]]);
}
