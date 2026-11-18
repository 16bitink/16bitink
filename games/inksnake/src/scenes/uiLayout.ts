import { BOARD } from '../level/types';
import { TOUCH_GAP, TOUCH_MIN } from './uiSizes';

/**
 * Where the interface goes, as plain numbers (no Phaser, so it can be
 * tested): how big a card may draw, how big a finger's target must be,
 * and where the HUD's pieces sit for a screen held either way.
 */

/** The smallest touch target, CSS px (see uiSizes). */
export const MIN_TOUCH = TOUCH_MIN;
/** Room kept round a card on screen, layout units (a phone's cards take nearly all of it). */
const CARD_ROOM = { x: 44, y: 40 } as const;
const PHONE_CARD_ROOM = { x: 16, y: 20 } as const;
/** Room kept for the HUD above and below an upright board, CSS px (as GameScene's UPRIGHT_HUD). */
const UPRIGHT_HUD = 56;

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A phone held upright: the board turns a quarter to fill it (as GameScene's isUpright). */
export function uprightScreen(width: number, height: number): boolean {
  return height > width * 1.15;
}

/**
 * How big a card w × h draws in a view: shrunk to fit a short screen,
 * and allowed to grow up to `grow` where there's room (an upright phone,
 * whose interface scale is set by its narrow width, has height to spare).
 */
export function cardFit(view: Size, card: { readonly w: number; readonly h: number }, grow = 1, phone = false): number {
  const room = phone ? PHONE_CARD_ROOM : CARD_ROOM;
  return Math.max(0.3, Math.min(grow, (view.height - room.y) / card.h, (view.width - room.x) / card.w));
}

/** A hit area at least MIN_TOUCH CSS px across for a part `visual` units across, drawn at `scale` CSS px per unit. */
export function hitSize(visual: number, scale: number): number {
  return Math.max(visual + 8, MIN_TOUCH / Math.max(0.01, scale));
}

/** The free paper either side of a landscape board, in a view's units (0 when the board fills the width). */
export function boardSideRoom(css: Size, uiScale: number): number {
  if (uprightScreen(css.width, css.height)) return 0;
  const zoom = Math.min(css.width / BOARD.w, css.height / BOARD.h);
  return Math.max(0, (css.width - BOARD.w * zoom) / 2 / uiScale);
}

/** The free paper above (and below) an upright board, in a view's units. */
export function boardEndRoom(css: Size, uiScale: number): number {
  const zoom = Math.min(css.width / BOARD.h, (css.height - UPRIGHT_HUD * 2) / BOARD.w);
  return Math.max(UPRIGHT_HUD, (css.height - BOARD.w * zoom) / 2) / uiScale;
}

export interface HudPlan {
  readonly upright: boolean;
  /** Extra scale for the HUD's pieces (upright phones draw them bigger: they have the room). */
  readonly k: number;
  /** The level's tag: its top-left corner, and its scale (k, or less where the buttons need the room). */
  readonly tag: { readonly x: number; readonly y: number; readonly k: number };
  /** The meter row (score, bar, lives): its centre, and its scale (k, or less to fit a narrow screen). */
  readonly meter: { readonly x: number; readonly y: number; readonly k: number };
  /** The round buttons' centres, pause first. */
  readonly buttons: readonly { readonly x: number; readonly y: number }[];
  /** The hint note's centre line. */
  readonly hintY: number;
}

export interface HudSizes {
  /** A round button's diameter, the gap kept from the edges, and the meter's height, units. */
  readonly button: number;
  readonly margin: number;
  readonly meterH: number;
  /** The meter row's and the level tag's widths, units. */
  readonly meterW: number;
  readonly tagW: number;
}

/**
 * Lays the HUD out over the board. Landscape: the tag top-left, the meter
 * top-centre, the buttons top-right, stacked down the paper beside the
 * board when there's room for them there. Upright: the tag and buttons
 * share the strip above the board and the meter takes the strip below.
 * The hint sits at the bottom, or mid-board on rail levels (the gecko
 * runs along the bottom there).
 */
export function hudPlan(view: Size, css: Size, uiScale: number, rail: boolean, s: HudSizes): HudPlan {
  const upright = uprightScreen(css.width, css.height);
  const { width, height } = view;
  // Buttons keep TOUCH_GAP CSS px apart, however small the interface draws.
  const gap = Math.max(10, TOUCH_GAP / uiScale);
  if (upright) {
    const k = Math.min(1.3, Math.max(1, width / 560));
    const b = s.button * k;
    const room = boardEndRoom(css, uiScale);
    const top = s.margin + b / 2;
    const meterK = Math.min(k, (width - s.margin * 2) / s.meterW);
    const meterY = height - Math.max(s.margin + (s.meterH * meterK) / 2, room / 2);
    const second = width - s.margin - b * 1.5 - gap * k;
    return {
      upright, k,
      tag: { x: s.margin, y: s.margin, k: Math.min(k, (second - b / 2 - gap - s.margin) / s.tagW) },
      meter: { x: width / 2, y: meterY, k: meterK },
      buttons: [{ x: width - s.margin - b / 2, y: top }, { x: second, y: top }],
      hintY: meterY - (s.meterH * meterK) / 2 - 44 * k,
    };
  }
  const side = boardSideRoom(css, uiScale);
  const b = s.button;
  const stacked = side >= b + s.margin;
  const x = stacked ? width - side / 2 : width - s.margin - b / 2;
  const buttons = stacked
    ? [{ x, y: s.margin + b / 2 }, { x, y: s.margin + b * 1.5 + gap }]
    : [{ x, y: s.margin + b / 2 }, { x: x - b - gap, y: s.margin + b / 2 }];
  // The meter takes the top's middle, unless the tag and the buttons leave it no room there (a phone on its side): then the bottom.
  const left = s.margin + s.tagW + gap;
  const right = (stacked ? width - side : Math.min(...buttons.map((p) => p.x)) - b / 2) - gap;
  const fitsTop = width / 2 - s.meterW / 2 >= left && width / 2 + s.meterW / 2 <= right;
  const meterY = fitsTop ? s.margin + s.meterH / 2 : height - s.margin - s.meterH / 2;
  return {
    upright, k: 1,
    tag: { x: s.margin, y: s.margin, k: 1 },
    meter: { x: width / 2, y: meterY, k: 1 },
    buttons,
    // Rail levels: mid-board, clear of the lines that start along the top and the branch along the bottom.
    hintY: rail ? height * 0.5 : fitsTop ? height - 40 : meterY - s.meterH / 2 - 34,
  };
}
