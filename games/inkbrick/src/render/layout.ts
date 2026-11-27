import { BOARD_H, BOARD_W } from '../sim/types';

/**
 * Where the 540 x 960 board sits on the screen. Landscape: centred at full
 * height, the HUD in the side bands beside it. Portrait (phones): as wide as
 * fits, the HUD in the strip above it (or over the board's empty top rows
 * when there's no strip). On a touch screen the thumbstick gets `pad`: the
 * strip under the board (portrait) or the low part of the right band
 * (landscape), never over the board, so no finger hides the raft or the
 * stone. Pure, in CSS px.
 */
export interface PadRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface BoardLayout {
  readonly x: number;
  readonly y: number;
  /** CSS px per board px. */
  readonly scale: number;
  readonly w: number;
  readonly h: number;
  readonly mode: 'side' | 'top';
  /** Where the thumbstick lives, or null without one (mouse and keys). */
  readonly pad: PadRect | null;
}

/** Side bands narrower than this can't hold the HUD: use the top strip. */
export const MIN_SIDE_BAND = 170;
/** The portrait HUD strip's height. */
export const TOP_STRIP = 64;
/** The thumbstick's strip under the board, at the least (src/ui/stick.ts). */
export const STICK_STRIP = 96;
/** In landscape the stick takes this share of the right band's height, low down (or STICK_STRIP if more). */
const SIDE_PAD_SHARE = 0.4;
/** Of the spare height in portrait, the share above the board; the rest goes to the stick's strip. */
const ABOVE_SHARE = 0.3;

/** `controls`: the stick strip's height on a touch screen, 0 without a stick. */
export function boardLayout(vw: number, vh: number, controls = 0): BoardLayout {
  const fullH = vh / BOARD_H;
  const sideBand = (vw - BOARD_W * fullH) / 2;
  if (sideBand >= MIN_SIDE_BAND) {
    const w = BOARD_W * fullH;
    const x = (vw - w) / 2;
    const padH = Math.max(controls, vh * SIDE_PAD_SHARE);
    const pad = controls > 0 ? { x: x + w, y: vh - padH, w: sideBand, h: padH } : null;
    return { x, y: 0, scale: fullH, w, h: vh, mode: 'side', pad };
  }
  const scale = Math.min(vw / BOARD_W, (vh - TOP_STRIP - controls) / BOARD_H, fullH);
  const w = BOARD_W * scale;
  const h = BOARD_H * scale;
  const spare = vh - h;
  const x = (vw - w) / 2;
  if (controls > 0) {
    // The strip above, the board, then everything left over for the thumb.
    const y = TOP_STRIP + Math.max(0, spare - TOP_STRIP - controls) * ABOVE_SHARE;
    return { x, y, scale, w, h, mode: 'top', pad: { x: 0, y: y + h, w: vw, h: vh - y - h } };
  }
  // With a strip, push the board below it; otherwise centre it.
  const y = spare >= TOP_STRIP ? TOP_STRIP + (spare - TOP_STRIP) / 2 : spare / 2;
  return { x, y, scale, w, h, mode: 'top', pad: null };
}
