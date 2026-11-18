import { BOARD } from '../../level/types';
import type { Pt } from '../../logic/vec';

/**
 * The phone camera: on a small screen the board is shown bigger than fits,
 * and the camera follows the snake's head with a look-ahead in the way it's
 * heading, kept from showing more than a strip of the place past the
 * board's border. Plain maths here (no Phaser), so it can be tested.
 */

/** Screens whose short side is under this (CSS px) get the follow camera. */
export const SMALL_SCREEN = 600;
/** The snake's body is shown at least this wide on a small screen, CSS px. */
export const MIN_BODY_CSS = 18;
/** But never so close that less than this share of the board's short side shows. */
export const MIN_SHOW = 0.55;
/** How far past the board's edges the camera may show (the border and a strip of the place beyond), board px. */
export const EDGE_ROOM = 64;
/** The look-ahead, as a share of the visible extent's shorter side. */
export const LEAD_SHARE = 0.22;
/** How quickly the camera catches up with where it wants to be, and the look-ahead swings round, per second. */
export const FOLLOW_RATE = 5;
export const LEAD_RATE = 2.4;

/** The board's extent the screen shows, board px along the board's x and y. */
export interface Extent {
  readonly w: number;
  readonly h: number;
}

export interface FollowState {
  readonly centre: Pt;
  readonly lead: Pt;
}

export function wantsFollow(width: number, height: number): boolean {
  return Math.min(width, height) < SMALL_SCREEN;
}

/** What a screen width × height (CSS px) shows of the board at `zoom` CSS px per board px; a turned board swaps the axes. */
export function viewExtent(width: number, height: number, zoom: number, turned: boolean): Extent {
  return turned ? { w: height / zoom, h: width / zoom } : { w: width / zoom, h: height / zoom };
}

/**
 * The follow camera's zoom (CSS px per board px): enough to show a body
 * `bodyW` board px wide at MIN_BODY_CSS, never less than the whole-board
 * zoom, nor so close that under MIN_SHOW of the board's short side shows.
 */
export function followZoom(whole: number, bodyW: number, width: number, height: number, turned: boolean): number {
  const want = MIN_BODY_CSS / Math.max(1, bodyW);
  const unit = viewExtent(width, height, 1, turned);
  const most = Math.min(unit.w / BOARD.w, unit.h / BOARD.h) / MIN_SHOW;
  return Math.max(whole, Math.min(want, most));
}

/** One axis: the centre kept so that a view `half` either side stays within lo..hi, or the middle if it can't. */
export function clampAxis(c: number, half: number, lo: number, hi: number): number {
  if (hi - lo <= half * 2) return (lo + hi) / 2;
  return Math.min(hi - half, Math.max(lo + half, c));
}

/** A camera centre kept so the view shows no more than `room` past the board's edges. */
export function clampCentre(c: Pt, view: Extent, room = EDGE_ROOM): Pt {
  return {
    x: clampAxis(c.x, view.w / 2, -room, BOARD.w + room),
    y: clampAxis(c.y, view.h / 2, -room, BOARD.h + room),
  };
}

/** Where the camera starts: on the head, a little ahead, clamped. */
export function followStart(head: Pt, heading: number, view: Extent): FollowState {
  const lead = leadFor(heading, view);
  return { centre: clampCentre({ x: head.x + lead.x, y: head.y + lead.y }, view), lead };
}

/**
 * One frame of following: the look-ahead swings towards the heading, the
 * centre eases towards the head plus it, and is clamped. Returns a new state.
 */
export function followStep(s: FollowState, head: Pt, heading: number, dt: number, view: Extent): FollowState {
  const want = leadFor(heading, view);
  const kl = 1 - Math.exp(-dt * LEAD_RATE);
  const lead = { x: s.lead.x + (want.x - s.lead.x) * kl, y: s.lead.y + (want.y - s.lead.y) * kl };
  const kc = 1 - Math.exp(-dt * FOLLOW_RATE);
  const target = { x: head.x + lead.x, y: head.y + lead.y };
  const centre = clampCentre({ x: s.centre.x + (target.x - s.centre.x) * kc, y: s.centre.y + (target.y - s.centre.y) * kc }, view);
  return { centre, lead };
}

function leadFor(heading: number, view: Extent): Pt {
  const r = Math.min(view.w, view.h) * LEAD_SHARE;
  return { x: Math.cos(heading) * r, y: Math.sin(heading) * r };
}

/** A screen rectangle (CSS px) and a point that may lie outside it. */
export interface EdgeMark {
  readonly x: number;
  readonly y: number;
  /** The way to the thing off screen, radians. */
  readonly angle: number;
}

/**
 * Where an off-screen thing at `p` (screen CSS px) is marked: on the edge of
 * the rectangle inset `inset` from the screen (top and bottom by `insetY`),
 * along the line from the screen's middle to it. Null if it's on screen.
 */
export function edgeMark(p: Pt, width: number, height: number, inset: number, insetY = inset): EdgeMark | null {
  const x0 = inset;
  const x1 = width - inset;
  const y0 = insetY;
  const y1 = height - insetY;
  if (p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height) return null;
  const cx = width / 2;
  const cy = height / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const tx = dx === 0 ? Infinity : (dx > 0 ? x1 - cx : x0 - cx) / dx;
  const ty = dy === 0 ? Infinity : (dy > 0 ? y1 - cy : y0 - cy) / dy;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t, angle: Math.atan2(dy, dx) };
}
