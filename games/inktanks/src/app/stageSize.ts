import { isPhone, PHONE_WORLD_CSS_MIN } from '@16bitink/game-sdk';

/**
 * Pixel art at density C: the native view stays about 540 px tall (2 device
 * px per art px on a 1080p screen). A phone is zoomed in instead (owner's
 * playtest, 2026-11-20: the tanks were a third smaller than on a laptop): an
 * art px is drawn at least PHONE_WORLD_CSS_MIN CSS px, still in whole device
 * px, so a phone on its side shows about 360–430 art px of the field.
 */
export const NATIVE_HEIGHT = 540;

export interface StageSize {
  readonly width: number;
  readonly height: number;
  /** CSS px per art px (Phaser's scale zoom). */
  readonly zoom: number;
}

export function stageSize(cssW: number, cssH: number, dpr: number): StageSize {
  const fit = Math.max(1, Math.round((cssH * dpr) / NATIVE_HEIGHT));
  const scale = isPhone({ width: cssW, height: cssH }) ? Math.max(fit, Math.ceil(dpr * PHONE_WORLD_CSS_MIN)) : fit;
  return { width: Math.ceil((cssW * dpr) / scale), height: Math.ceil((cssH * dpr) / scale), zoom: scale / dpr };
}
