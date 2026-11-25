import type { WorldPort } from '../../app/worldPort';
import type { Frame, Mark, Target } from '../../guide/types';
import type { Pt } from '../../sim/types';
import { div, Dirty, esc } from '../dom';
import { pic } from '../pics';
import { boxOf, firstVisible, grow, toolButton, type Box } from './dom';

/** Draws one frame of the guide: rings, dashed lines, the hand. Follows the map every drawn frame. */
const HAND = '<svg viewBox="0 0 44 56"><path d="M16 4c3 0 5 2 5 5v15l2 .3V22c0-2.4 1.8-4 4-4s4 1.6 4 4v3l1.6.3c.4-1.8 1.9-3 3.7-3 2.2 0 3.9 1.7 3.9 4l.2 14c0 8-5 12.7-13 12.7h-5c-4.4 0-7.4-1.6-9.8-5L3.6 35.600c-1.5-2.200-1-4.700 1-6 1.900-1.200 4.200-.8 5.700 1l.7.900V9c0-3 2-5 5-5z" fill="#fffaf0" stroke="#2a2832" stroke-width="2.800" stroke-linejoin="round"/><path d="M23 24v8M31 25v7" fill="none" stroke="#2a2832" stroke-width="2.200" stroke-linecap="round"/></svg>';
const DRAG_MS = 2000;
const DRAG_HOLD = 0.18; // of the loop: the hand rests at each end
const UI_PAD = 8;
const TIP = { x: 16, y: 4 } as const; // the fingertip in the hand's picture
const LABEL_LIFT = 20;

export class GuideLayer {
  private readonly svg: SVGSVGElement;
  private readonly rings: HTMLElement;
  private readonly hand: HTMLElement;
  private readonly labels: HTMLElement;
  private readonly dirty = new Dirty();
  private frame: Frame | null = null;
  /** What the target covers, for the speech box to keep clear of. */
  targetBox: Box | null = null;

  constructor(private readonly root: HTMLElement, layer: HTMLElement, private readonly world: () => WorldPort | null) {
    layer.insertAdjacentHTML('beforeend', '<svg class="gsvg"></svg>');
    this.svg = layer.lastElementChild as SVGSVGElement;
    this.labels = div(layer, 'glabels');
    this.rings = div(layer, 'grings');
    this.hand = div(layer, 'ghand', HAND);
    this.hand.hidden = true;
  }

  show(f: Frame | null): void {
    this.frame = f;
    this.rings.classList.toggle('dim', !!f?.dim && f.target !== null && f.target.t !== 'drag');
    if (!f) {
      this.targetBox = null;
      this.clear();
    }
  }

  private clear(): void {
    if (this.dirty.changed('svg', '')) this.svg.innerHTML = '';
    if (this.dirty.changed('rings', '')) this.rings.innerHTML = '';
    if (this.dirty.changed('labels', '')) this.labels.innerHTML = '';
    this.hand.hidden = true;
  }

  /** Place everything. Every drawn frame. */
  draw(nowMs: number): void {
    const f = this.frame;
    if (!f) return;
    const rings: string[] = [];
    const paths: string[] = [];
    const labels: string[] = [];
    for (const m of f.marks) this.mark(m, rings, paths, labels);
    this.target(f.target, rings, paths, nowMs);
    if (this.dirty.changed('svg', paths.join(''))) this.svg.innerHTML = paths.join('');
    this.putRings(rings);
    if (this.dirty.changed('labels', labels.join(''))) this.labels.innerHTML = labels.join('');
  }

  /** Rings keep their elements (so their pulse runs on) and only move. */
  private putRings(list: readonly string[]): void {
    if (this.dirty.changed('rings', list.map((r) => r.split('|')[0]).join())) this.rings.innerHTML = list.map((r) => `<i class="gring ${r.split('|')[0]}"></i>`).join('');
    list.forEach((r, i) => { (this.rings.children[i] as HTMLElement).style.cssText = r.split('|')[1]!; });
  }

  private px(p: Pt): Pt | null {
    return this.world()?.screenOf(p) ?? null;
  }

  /** A plan circle as the ellipse it is on screen. */
  private ellipse(at: Pt, r: number): Box | null {
    const c = this.px(at);
    const e = this.px({ x: at.x + r, y: at.y });
    const s = this.px({ x: at.x, y: at.y + r });
    if (!c || !e || !s) return null;
    const rx = Math.max(20, e.x - c.x);
    const ry = Math.max(18, s.y - c.y);
    return { x: c.x - rx, y: c.y - ry, w: rx * 2, h: ry * 2 };
  }

  private mark(m: Mark, rings: string[], paths: string[], labels: string[]): void {
    if ('ring' in m) {
      const b = this.ellipse(m.ring, m.r);
      if (b) rings.push(`soft|${css(b)}`);
      return;
    }
    const pts = m.line.map((p) => this.px(p)).filter((p): p is Pt => p !== null);
    if (pts.length < 2) return;
    paths.push(dashes(pts, m.old));
    const mid = pts[Math.floor(pts.length / 2)]!;
    if (m.label) labels.push(`<b class="glabel${m.old ? ' old' : ''}" style="left:${mid.x.toFixed(0)}px;top:${(mid.y - LABEL_LIFT).toFixed(0)}px">${esc(m.label)}</b>`);
  }

  private target(t: Target | null, rings: string[], paths: string[], nowMs: number): void {
    this.targetBox = null;
    this.hand.hidden = true;
    if (!t) return;
    if (t.t === 'spot') {
      const b = this.ellipse(t.at, t.r);
      if (!b) return;
      const hole = t.wide ? this.ellipse(t.at, t.wide) : null;
      if (hole) rings.push(`hole|${css(hole)}`);
      rings.push(`round|${css(b)}`);
      this.targetBox = b;
      if (t.tap) this.tapHand(b.x + b.w / 2, b.y + b.h / 2);
      return;
    }
    if (t.t === 'drag') return this.drag(t.line, rings, paths, nowMs);
    const el = t.t === 'tool' ? toolButton(this.root, t.tool) : firstVisible(this.root, t.sel);
    if (!el) return;
    const b = grow(boxOf(el, this.root.getBoundingClientRect()), UI_PAD);
    rings.push(`box|${css(b)}`);
    this.targetBox = b;
    if (t.t === 'tool' || t.tap) this.tapHand(b.x + b.w * 0.6, b.y + b.h * 0.62);
  }

  private tapHand(x: number, y: number): void {
    this.hand.hidden = false;
    this.hand.classList.add('tap');
    this.hand.style.transform = `translate3d(${(x - TIP.x).toFixed(0)}px,${(y - TIP.y).toFixed(0)}px,0)`;
  }

  private drag(line: readonly Pt[], rings: string[], paths: string[], nowMs: number): void {
    const pts = line.map((p) => this.px(p)).filter((p): p is Pt => p !== null);
    if (pts.length < 2) return;
    paths.push(dashes(pts));
    const a = pts[0]!;
    const b = pts[pts.length - 1]!;
    const r = 22;
    for (const p of [a, b]) rings.push(`round small|${css({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 })}`);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    this.targetBox = grow({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }, r);
    const t = (nowMs % DRAG_MS) / DRAG_MS;
    const k = Math.min(1, Math.max(0, (t - DRAG_HOLD) / (1 - DRAG_HOLD * 2)));
    const at = along(pts, k * k * (3 - 2 * k));
    this.hand.hidden = false;
    this.hand.classList.remove('tap');
    this.hand.style.transform = `translate3d(${(at.x - TIP.x).toFixed(0)}px,${(at.y - TIP.y).toFixed(0)}px,0)`;
  }
}

const css = (b: Box): string => `left:${b.x.toFixed(1)}px;top:${b.y.toFixed(1)}px;width:${b.w.toFixed(1)}px;height:${b.h.toFixed(1)}px`;
const dashes = (pts: readonly Pt[], old = false): string => {
  const d = `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L')}`;
  return `<path class="gback${old ? ' old' : ''}" d="${d}"/><path class="gdash${old ? ' old' : ''}" d="${d}"/>`;
};

/** A point a share of the way along a line. Pure. */
export function along(pts: readonly Pt[], k: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
  let left = k * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i]!;
    if (left <= l && l > 0) { const a = pts[i]!; const b = pts[i + 1]!; return { x: a.x + ((b.x - a.x) * left) / l, y: a.y + ((b.y - a.y) * left) / l }; }
    left -= l;
  }
  return pts[pts.length - 1]!;
}

/** The speech box's inside. */
export function boxHtml(f: Frame): string {
  const bullets = f.bullets.length ? `<ul class="gbul">${f.bullets.map((b) => `<li>${pic(b.icon)}<span>${esc(b.text)}</span></li>`).join('')}</ul>` : '';
  const win = f.kind === 'reward' ? '<svg class="gtick" viewBox="0 0 20 16"><path d="M2 8.5 7.5 14 18 2"/></svg>' : '';
  const stop = f.pause ? '<span class="gstop"><i class="pauseglyph"></i>Time is stopped</span>' : '';
  const ok = f.ok ? `<button class="btn go sm" data-act="gok">${esc(f.ok)}</button>` : '';
  const skip = f.kind === 'step' ? '<button class="gskip" data-act="gskip">Skip guide</button>' : '';
  return `${stop}${win}${pic(`portrait-${f.who}`)}<div class="gtext">${f.why ? `<p class="gwhy">${esc(f.why)}</p>` : ''}<p class="gsay">${esc(f.say)}</p>${bullets}</div><div class="gbtns">${ok}${skip}</div>`;
}
