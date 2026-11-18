/**
 * How big the interface must draw on a phone, in CSS px, and the sums that
 * turn those minimums into each screen's layout units. Plain numbers, no
 * Phaser, so the minimums can be tested (test/uiSizes.test.ts).
 *
 * Sources: Apple's Human Interface Guidelines (hit targets at least
 * 44 × 44 pt), Material Design (touch targets at least 48 × 48 dp, 8 dp
 * apart), WCAG 2.2 success criteria 2.5.5 (44 × 44 CSS px, AAA) and 2.5.8
 * (24 × 24 CSS px, AA), and the usual mobile type floor: 16 px for body
 * text, 12–14 px for secondary text. On the web a CSS px is Apple's pt and
 * Google's dp, so the numbers carry over as they are.
 */

/** The smallest touch target, CSS px (Apple 44 pt, WCAG 2.5.5; Material's 48 dp is the comfortable size). */
export const TOUCH_MIN = 44;
/** Room kept between two touch targets, CSS px (Material's 8 dp). */
export const TOUCH_GAP = 8;
/**
 * The smallest text on a phone, CSS px: body lines and secondary captions.
 * The usual floor is 16 px body and 12–14 px secondary for a plain sans;
 * our hand lettering (Caveat) has a small x-height, so it gets 2 px more.
 */
export const TEXT_MIN = { body: 18, small: 14 } as const;
export type TextRole = keyof typeof TEXT_MIN;

/** A screen whose short side is under this (CSS px) is a phone, held either way. */
export const PHONE_SIDE = 500;
/** On a phone the interface is laid out for a short side this many units across, so it draws near full size. */
const PHONE_DESIGN_SIDE = 420;
/** The laptop's design size: smaller screens draw the interface smaller (never under MIN_UI). */
const UI_DESIGN = { w: 760, h: 560 } as const;
const MIN_UI = 0.55;
/** A phone's interface never draws smaller than this. */
const PHONE_MIN_UI = 0.8;

/** The map's nest is this many world px across (MAP.nodeRadius × 2), its name this big. */
export const MAP_NODE = { d: 60, hit: 78, label: 23, number: 26 } as const;
/** The map's zoom on a phone: nests big enough to tap and names big enough to read. */
export const PHONE_MAP_ZOOM = 0.8;

/** A phone's paper card never draws smaller than this, CSS px per unit: a taller card scrolls instead. */
export const PHONE_CARD_CSS = 0.72;
/** A day's cell in the calendar on a phone, units: TOUCH_MIN CSS px once the card fills a 360 px screen. */
export const PHONE_CELL = 56;

/** The daily hunt's calendar page on the map: at least 64 CSS px on a phone (a thumb's easy target), and its laptop size, units. */
export const DAILY_PAGE = { phoneCss: { w: 64, h: 70 }, desk: { w: 66, h: 72 } } as const;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export function isPhone(css: Size): boolean {
  return Math.min(css.width, css.height) < PHONE_SIDE;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * CSS px per layout unit for a scaled screen (HUD, cards, the map's bar):
 * 1 on a laptop, less on a small screen, and near full size on a phone,
 * whose layouts are written for its narrow side.
 */
export function interfaceScale(css: Size): number {
  if (isPhone(css)) return clamp(Math.min(css.width, css.height) / PHONE_DESIGN_SIDE, PHONE_MIN_UI, 1);
  return clamp(Math.min(css.width / UI_DESIGN.w, css.height / UI_DESIGN.h), MIN_UI, 1);
}

/** The chapter map's zoom: the plan's width fitted on a laptop, zoomed in on a phone (dragged to pan). */
export function mapZoom(css: Size, fit: { readonly w: number; readonly h: number }): number {
  const fitted = clamp(Math.min(css.width / fit.w, css.height / fit.h), 0.5, 1.5);
  return isPhone(css) ? Math.max(fitted, PHONE_MAP_ZOOM) : fitted;
}

/**
 * Sizes for a piece drawn at `scale` CSS px per unit: on a phone, text and
 * targets are raised to the minimums; elsewhere they stay as designed.
 */
export interface Sizer {
  readonly phone: boolean;
  readonly scale: number;
  /** A font size, units, at least TEXT_MIN[role] CSS px on a phone. */
  text(units: number, role?: TextRole): number;
  /** A button's height (or a target's side), units, at least TOUCH_MIN CSS px on a phone. */
  tap(units: number): number;
  /** A gap between targets, units, at least TOUCH_GAP CSS px on a phone. */
  gap(units: number): number;
}

export function sizer(phone: boolean, scale: number): Sizer {
  const s = Math.max(0.01, scale);
  const at = (units: number, css: number): number => (phone ? Math.max(units, Math.ceil(css / s)) : units);
  return {
    phone, scale: s,
    text: (units, role = 'small') => at(units, TEXT_MIN[role]),
    tap: (units) => at(units, TOUCH_MIN),
    gap: (units) => at(units, TOUCH_GAP),
  };
}

/**
 * The least fit a card `cardW` units wide takes on a phone, in a view
 * `viewW` units wide drawn at `ui` CSS px per unit: at least `minCss` CSS px
 * per unit (PHONE_CARD_CSS or more), but never wider than the view less `room`.
 */
export function phoneCardFit(viewW: number, cardW: number, ui: number, room: number, minCss = PHONE_CARD_CSS): number {
  return Math.min((viewW - room) / cardW, Math.max(PHONE_CARD_CSS, minCss) / ui);
}
