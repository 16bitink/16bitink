import { CELL } from '../sim/constants';
import type { Pt } from '../sim/types';
import { clamp, lerp, smooth, type Box } from '../render/geom';
import { projectY, TILT, unproject } from '../render/projection';
import { isPhone, PHONE_WORLD_CSS_MIN } from '@16bitink/game-sdk';
import type { Insets } from './port';

/**
 * The camera's numbers, in CSS px and scene px (no Phaser): where it looks,
 * how far it may go, glides, flings and smooth zoom round a point.
 */
const ZOOM_MAX = 3;
const ZOOM_EASE = 14; // per second
const FLING_DECAY = 5; // per second
const FLING_MIN = 8;
const OVERSCROLL = 0.42; // share of the screen that may show past the map's edge
/** Cells across and down at the start: near enough to watch one crossroads. */
const START = { cols: 17, rows: 10.5 } as const;
const PHONE_COLS = 11;
const OVERVIEW_SLACK = 0.94;

export interface Size { readonly w: number; readonly h: number }

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  private goal = 1;
  private anchor: { css: Pt; scene: Pt } | null = null;
  private vx = 0;
  private vy = 0;
  private glide: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; t: number; ms: number } | null = null;
  private insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  private size: Size = { w: 1, h: 1 };
  private map: Box = { x0: 0, y0: 0, x1: 1, y1: 1 };
  moved = true;

  setMap(plan: Box): void {
    this.map = { x0: plan.x0, y0: plan.y0 * TILT, x1: plan.x1, y1: plan.y1 * TILT };
  }

  setSize(s: Size): void {
    this.size = s;
    this.zoom = this.goal = clamp(this.zoom, this.minZoom, ZOOM_MAX);
    this.bound();
  }

  setInsets(i: Insets): void { this.insets = i; }

  /** Far enough out to see the whole map (and, on a phone, no further than the play view's own floor needs). */
  get minZoom(): number {
    const fit = Math.min(this.size.w / (this.map.x1 - this.map.x0), this.size.h / (this.map.y1 - this.map.y0));
    return Math.min(1, fit * OVERVIEW_SLACK);
  }

  get startZoom(): number {
    const phone = isPhone({ width: this.size.w, height: this.size.h });
    const fit = Math.min(this.size.w / (START.cols * CELL), this.size.h / (START.rows * CELL * TILT));
    return phone ? Math.max(PHONE_WORLD_CSS_MIN, this.size.w / (PHONE_COLS * CELL)) : clamp(fit, 1, ZOOM_MAX);
  }

  jump(at: Pt, zoom: number): void {
    this.zoom = this.goal = clamp(zoom, this.minZoom, ZOOM_MAX);
    this.x = at.x;
    this.y = projectY(at.y);
    this.glide = null;
    this.bound();
  }

  // -------------------------------------------------------------- CSS px to world and back

  toScene(css: Pt): Pt {
    return { x: this.x + (css.x - this.size.w / 2) / this.zoom, y: this.y + (css.y - this.size.h / 2) / this.zoom };
  }

  toPlan(css: Pt): Pt { return unproject(this.toScene(css)); }

  toCss(plan: Pt, z = 0): Pt {
    return { x: (plan.x - this.x) * this.zoom + this.size.w / 2, y: (projectY(plan.y, z) - this.y) * this.zoom + this.size.h / 2 };
  }

  /** Is a CSS point inside the screen by at least `margin`? */
  onScreen(p: Pt, margin: number): boolean {
    return p.x > margin && p.y > margin && p.x < this.size.w - margin && p.y < this.size.h - margin;
  }

  /** The plan rectangle on screen, grown by `pad` plan px. */
  view(pad = 0): Box {
    const hw = this.size.w / 2 / this.zoom;
    const hh = this.size.h / 2 / this.zoom;
    return { x0: this.x - hw - pad, y0: (this.y - hh) / TILT - pad, x1: this.x + hw + pad, y1: (this.y + hh) / TILT + pad };
  }

  // -------------------------------------------------------------- moving

  /** Drag by CSS px. */
  pan(dx: number, dy: number): void {
    this.glide = null;
    this.anchor = null;
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.bound();
  }

  fling(vx: number, vy: number): void {
    this.vx = vx / this.zoom;
    this.vy = vy / this.zoom;
  }

  stop(): void { this.vx = this.vy = 0; }

  zoomAt(css: Pt, factor: number, instant = false): void {
    this.glide = null;
    this.goal = clamp(this.goal * factor, this.minZoom, ZOOM_MAX);
    this.anchor = { css, scene: this.toScene(css) };
    if (instant) { this.zoom = this.goal; this.hold(); }
  }

  /** Keep the anchored scene point under its CSS point. */
  private hold(): void {
    if (!this.anchor) return;
    const { css, scene } = this.anchor;
    this.x = scene.x - (css.x - this.size.w / 2) / this.zoom;
    this.y = scene.y - (css.y - this.size.h / 2) / this.zoom;
    this.bound();
  }

  focus(at: Pt, zoom: number | undefined, ms: number): void {
    const z1 = clamp(zoom ?? Math.max(this.zoom, this.startZoom), this.minZoom, ZOOM_MAX);
    const ox = (this.insets.left - this.insets.right) / 2 / z1;
    const oy = (this.insets.top - this.insets.bottom) / 2 / z1;
    this.stop();
    this.anchor = null;
    this.glide = { x0: this.x, y0: this.y, z0: this.zoom, x1: at.x - ox, y1: projectY(at.y) - oy, z1, t: 0, ms: Math.max(1, ms) };
  }

  overview(ms: number): void {
    const z = this.minZoom;
    this.stop();
    this.anchor = null;
    this.glide = { x0: this.x, y0: this.y, z0: this.zoom, x1: (this.map.x0 + this.map.x1) / 2, y1: (this.map.y0 + this.map.y1) / 2, z1: z, t: 0, ms: Math.max(1, ms) };
  }

  update(dt: number): void {
    const before = [this.x, this.y, this.zoom];
    if (this.glide) this.runGlide(dt);
    else {
      if (Math.abs(this.goal - this.zoom) > 0.0005) {
        this.zoom = lerp(this.zoom, this.goal, 1 - Math.exp(-ZOOM_EASE * dt));
        if (Math.abs(this.goal - this.zoom) < 0.001) this.zoom = this.goal;
        this.hold();
      }
      if (Math.hypot(this.vx, this.vy) * this.zoom > FLING_MIN) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        const k = Math.exp(-FLING_DECAY * dt);
        this.vx *= k;
        this.vy *= k;
        this.bound();
      } else this.stop();
    }
    this.moved = before[0] !== this.x || before[1] !== this.y || before[2] !== this.zoom;
  }

  private runGlide(dt: number): void {
    const g = this.glide!;
    g.t += (dt * 1000) / g.ms;
    const t = smooth(g.t);
    this.zoom = this.goal = Math.exp(lerp(Math.log(g.z0), Math.log(g.z1), t));
    this.x = lerp(g.x0, g.x1, t);
    this.y = lerp(g.y0, g.y1, t);
    this.bound();
    if (g.t >= 1) this.glide = null;
  }

  /** The middle of the screen stays on the map, with a little scenery past its edge. */
  private bound(): void {
    const hw = (this.size.w / this.zoom) * (0.5 - OVERSCROLL / 2);
    const hh = (this.size.h / this.zoom) * (0.5 - OVERSCROLL / 2);
    const fit = (v: number, lo: number, hi: number): number => (lo > hi ? (lo + hi) / 2 : clamp(v, lo, hi));
    this.x = fit(this.x, this.map.x0 + hw, this.map.x1 - hw);
    this.y = fit(this.y, this.map.y0 + hh, this.map.y1 - hh);
  }
}
