import { BOARD_H, BOARD_W } from '../sim/types';

/**
 * Where the 540 x 960 board sits on the screen. Landscape: centred at full
 * height, the HUD in the side bands beside it. Portrait (phones): as wide as
 * fits, the HUD in the strip above it (or over the board's empty top rows
 * when there's no strip). Pure, in CSS px.
 */
export interface BoardLayout {
  readonly x: number;
  readonly y: number;
  /** CSS px per board px. */
  readonly scale: number;
  readonly w: number;
  readonly h: number;
  readonly mode: 'side' | 'top';
}

/** Side bands narrower than this can't hold the HUD: use the top strip. */
export const MIN_SIDE_BAND = 170;
/** The portrait HUD strip's height. */
export const TOP_STRIP = 64;

export function boardLayout(vw: number, vh: number): BoardLayout {
  const fullH = vh / BOARD_H;
  const sideBand = (vw - BOARD_W * fullH) / 2;
  if (sideBand >= MIN_SIDE_BAND) {
    const w = BOARD_W * fullH;
    return { x: (vw - w) / 2, y: 0, scale: fullH, w, h: vh, mode: 'side' };
  }
  const scale = Math.min(vw / BOARD_W, (vh - TOP_STRIP) / BOARD_H, fullH);
  const w = BOARD_W * scale;
  const h = BOARD_H * scale;
  const spare = vh - h;
  // With a strip, push the board below it; otherwise centre it.
  const y = spare >= TOP_STRIP ? TOP_STRIP + (spare - TOP_STRIP) / 2 : spare / 2;
  return { x: (vw - w) / 2, y, scale, w, h, mode: 'top' };
}
