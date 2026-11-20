/**
 * How big a game's interface must be on a phone, in CSS px: the numbers
 * every game follows (docs/mobile-playbook.md). Plain numbers, so a game's
 * own size sums can be tested against them.
 *
 * Sources: Apple's Human Interface Guidelines (hit targets at least
 * 44 × 44 pt), Material Design (touch targets 48 × 48 dp, 8 dp apart),
 * WCAG 2.2 success criteria 2.5.5 (44 × 44 CSS px, AAA) and 2.5.8 (24 × 24,
 * AA), and the usual mobile type floor (16 px body, 12–14 px secondary).
 * On the web a CSS px is Apple's pt and Google's dp, so they carry over.
 */

/** A screen whose short side is under this, CSS px, is a phone (held either way). */
export const PHONE_SIDE = 500;

/** Touch targets, CSS px: `min` everywhere on a phone, `comfy` for the main actions, `gap` between two. */
export const TOUCH = { min: 44, comfy: 48, gap: 8 } as const;

/**
 * The smallest text on a phone, CSS px, by role. `body`: anything read
 * (objectives, card text, button labels); `small`: captions, counts, hints.
 * Hand lettering with a small x-height (Caveat) adds 2 px to each.
 */
export const TEXT_MIN = { body: 16, small: 14 } as const;

/**
 * Pixel fonts drawn at whole or half multiples of their design size stay
 * crisp: a 12 px pixel font is body text from 24 px and a caption from 18 px
 * (1.5×, sharp at 2× screens) on a phone. Its 1× size is for laptops only.
 */
export const PIXEL_TEXT_MIN = { body: 2, small: 1.5 } as const;

/** Thumbsticks, CSS px: the base's diameter and the knob's. */
export const STICK_MIN = { base: 120, knob: 44 } as const;

/**
 * The play view on a phone: an art (world) px is drawn at least this many
 * CSS px, so the player's piece is as big as on a laptop's smaller window
 * rather than shrunk to fit the whole board. Pan or follow the player instead.
 */
export const PHONE_WORLD_CSS_MIN = 0.9;

export interface ScreenSize {
  readonly width: number;
  readonly height: number;
}

export function isPhone(css: ScreenSize): boolean {
  return Math.min(css.width, css.height) < PHONE_SIDE;
}

/** The CSS media query for a phone, to scope a game's phone-only styles (as isPhone, plus a touch screen). */
export const PHONE_MEDIA = `(pointer: coarse) and (max-height: ${PHONE_SIDE - 1}px), (pointer: coarse) and (max-width: ${PHONE_SIDE - 1}px)`;

/** The smallest a text role may draw on a phone, CSS px; `pixelDesign` is a pixel font's design size. */
export function minTextPx(role: keyof typeof TEXT_MIN, pixelDesign?: number): number {
  if (pixelDesign === undefined) return TEXT_MIN[role];
  return Math.max(TEXT_MIN[role], pixelDesign * PIXEL_TEXT_MIN[role]);
}
