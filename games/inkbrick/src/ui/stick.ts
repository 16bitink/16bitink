import type { PadRect } from '../render/layout';

/**
 * The thumbstick on touch screens: a raft only moves sideways, so it's a
 * one-axis stick, a pill with a knob that springs back to the middle. It
 * floats: the base centres where the thumb lands in its strip (under the
 * board), and drags along when the thumb runs past the knob's travel, so
 * turning back reverses the raft at once. Deflection sets the raft's speed,
 * slow near the middle for fine aiming. A short, still tap throws the stone,
 * so the thumb never has to leave the strip. Sizes in CSS px
 * (docs/mobile-playbook.md: knob 48+, base 120+).
 */
export const STICK = {
  /** The knob's diameter. */
  knob: 60,
  /** How far the knob goes either way from the middle. */
  travel: 64,
  /** The pill's height. */
  height: 72,
  /** Deflection (share of the travel) that reads as nothing. */
  dead: 0.1,
  /** Speed rises as deflection to this power: gentle near the middle. */
  curve: 1.6,
} as const;

/** A touch this short (ms) that moved this little (px) is a tap. */
const TAP_MS = 250;
const TAP_MOVE = 12;
/** A tap still counts this long (ms) if the sim hasn't taken it yet. */
const TAP_KEEP_MS = 300;

/** The stick's reading for a knob `dx` px from the middle: -1 (full left) .. 1 (full right). */
export function stickValue(dx: number, travel: number): number {
  const t = Math.max(-1, Math.min(1, dx / travel));
  const a = Math.abs(t);
  if (a <= STICK.dead) return 0;
  return Math.sign(t) * ((a - STICK.dead) / (1 - STICK.dead)) ** STICK.curve;
}

/** The base's middle after the thumb moved to `x`: dragged along once the thumb is past the travel. */
export function followOrigin(origin: number, x: number, travel: number): number {
  if (x - origin > travel) return x - travel;
  if (origin - x > travel) return x + travel;
  return origin;
}

export function isTap(ms: number, moved: number): boolean {
  return ms <= TAP_MS && moved <= TAP_MOVE;
}

/** What the play scene reads from a stick each step. */
export interface StickSource {
  value(): number;
  /** Whether the stick was tapped since the last call (a throw). */
  takeTap(): boolean;
}

const HALF_W = STICK.travel + STICK.knob / 2;

export class Stick implements StickSource {
  private readonly el: HTMLElement;
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private rect: PadRect | null = null;
  private pointer: number | null = null;
  private origin = 0;
  private x = 0;
  private startX = 0;
  private downAt = 0;
  private moved = 0;
  private tapAt = Number.NEGATIVE_INFINITY;

  constructor(parent: HTMLElement, private readonly now: () => number = () => performance.now()) {
    this.el = document.createElement('div');
    this.el.className = 'stick';
    this.el.hidden = true;
    this.el.innerHTML = '<div class="stick-base"><i class="stick-arrow l"></i><i class="stick-arrow r"></i><div class="stick-knob"></div></div>';
    this.base = this.el.querySelector<HTMLElement>('.stick-base')!;
    this.knob = this.el.querySelector<HTMLElement>('.stick-knob')!;
    this.el.addEventListener('pointerdown', this.down);
    this.el.addEventListener('pointermove', this.move);
    this.el.addEventListener('pointerup', this.up);
    this.el.addEventListener('pointercancel', this.cancel);
    this.el.addEventListener('lostpointercapture', this.cancel);
    parent.appendChild(this.el);
  }

  /** Puts the stick in its strip (CSS px on the page), or hides it. */
  place(rect: PadRect | null): void {
    this.rect = rect;
    this.el.hidden = rect === null;
    if (!rect) {
      this.release();
      return;
    }
    Object.assign(this.el.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
    if (this.pointer === null) this.rest();
  }

  value(): number {
    return this.pointer === null ? 0 : stickValue(this.x - this.origin, STICK.travel);
  }

  takeTap(): boolean {
    const tapped = this.now() - this.tapAt <= TAP_KEEP_MS;
    this.tapAt = Number.NEGATIVE_INFINITY;
    return tapped;
  }

  /** Lets go (pause, a card over the game): the raft stops. */
  release(): void {
    this.pointer = null;
    this.tapAt = Number.NEGATIVE_INFINITY;
    this.rest();
  }

  destroy(): void {
    this.el.remove();
  }

  private localX(e: PointerEvent): number {
    return e.clientX - this.el.getBoundingClientRect().left;
  }

  /** A strip narrower than the pill (a small tablet's side band) keeps the base in its middle, as at rest. */
  private clampOrigin(x: number): number {
    const w = this.rect?.w ?? HALF_W * 2;
    if (w < HALF_W * 2) return w / 2;
    return Math.max(HALF_W, Math.min(w - HALF_W, x));
  }

  private readonly down = (e: PointerEvent): void => {
    // A second finger is ignored, unless the first press lost its pointerup (then the new one takes over).
    if (this.pointer !== null && !e.isPrimary) return;
    e.preventDefault();
    this.pointer = e.pointerId;
    this.x = this.localX(e);
    this.startX = this.x;
    this.origin = this.clampOrigin(this.x);
    this.downAt = this.now();
    this.moved = 0;
    this.draw(true);
    // Keeps the thumb's moves coming when it slides off the strip; best effort (an already-lifted pointer throws).
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      // Moves still arrive while the thumb stays on the strip.
    }
  };

  private readonly move = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointer) return;
    this.x = this.localX(e);
    this.moved = Math.max(this.moved, Math.abs(this.x - this.startX));
    this.origin = this.clampOrigin(followOrigin(this.origin, this.x, STICK.travel));
    this.draw(true);
  };

  private readonly up = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointer) return;
    if (isTap(this.now() - this.downAt, this.moved)) this.tapAt = this.now();
    this.pointer = null;
    this.rest();
  };

  private readonly cancel = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointer) return;
    this.pointer = null;
    this.rest();
  };

  /** The base in the middle of its strip, the knob centred, faded. */
  private rest(): void {
    this.origin = (this.rect?.w ?? 0) / 2;
    this.x = this.origin;
    this.draw(false);
  }

  private draw(active: boolean): void {
    const dx = Math.max(-STICK.travel, Math.min(STICK.travel, this.x - this.origin));
    this.base.style.left = `${this.origin - HALF_W}px`;
    this.knob.style.transform = `translateX(${dx}px)`;
    this.el.classList.toggle('active', active);
  }
}
