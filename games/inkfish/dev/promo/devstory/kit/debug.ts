import { clamp01, HAND, MONO, pop, ramp, type Pt, type Rect } from './geom';

/**
 * Debug overlays drawn over the game preview: hitboxes, a target arrow, a live
 * number readout, rig bones along a fish. Bright debug colours on purpose (the
 * game itself never uses them), thick enough to read on a phone.
 */

export const DEBUG = { box: '#3ff0c8', target: '#ffcc33', bad: '#ff4b3e', bone: '#7fd3ff', joint: '#ffffff' } as const;

export interface HitboxOpts {
  readonly t: number;
  /** Label on the box's tag, e.g. 'duck#2'. */
  readonly label?: string;
  readonly color?: string;
  /** Pops in from `at`. */
  readonly at?: number;
  /** A circle hitbox instead of the rectangle (radius = min(w, h) / 2). */
  readonly circle?: boolean;
}

/** A dashed hitbox with corner ticks, marching ants and a tag. */
export function drawHitbox(ctx: CanvasRenderingContext2D, r: Rect, o: HitboxOpts): void {
  const s = o.at === undefined ? 1 : pop(o.t, o.at, 0.25);
  if (s <= 0) return;
  const col = o.color ?? DEBUG.box;
  ctx.save();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.lineDashOffset = -o.t * 40;
  ctx.beginPath();
  if (o.circle) ctx.arc(cx, cy, Math.min(r.w, r.h) / 2, 0, Math.PI * 2);
  else ctx.rect(r.x, r.y, r.w, r.h);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!o.circle) {
    ctx.lineWidth = 5;
    const k = Math.min(18, r.w / 3, r.h / 3);
    for (const [x, y, dx, dy] of [[r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1], [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(x + dx * k, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * k);
      ctx.stroke();
    }
  }
  if (o.label) tag(ctx, o.label, r.x, r.y - 6, col, 'bottom');
  ctx.restore();
}

/** A filled label tag (monospace, dark text on the debug colour). `anchor` is which side of the tag sits on (x, y). */
export function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, col: string, anchor: 'bottom' | 'top' = 'bottom', size = 26): void {
  ctx.font = `700 ${size}px ${MONO}`;
  const w = ctx.measureText(text).width + 16;
  const h = size * 1.35;
  const top = anchor === 'bottom' ? y - h : y;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(x, top, w, h, 6);
  ctx.fill();
  ctx.fillStyle = '#0b0d12';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 8, top + h / 2 + 1);
}

/** A curved, dashed arrow from `from` to `to` with flowing dashes; `label` at its middle. Grows in from `at`. */
export function drawTargetArrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, o: { readonly t: number; readonly at?: number; readonly color?: string; readonly label?: string; readonly bend?: number }): void {
  const grow = o.at === undefined ? 1 : ramp(o.t, o.at, o.at + 0.3);
  if (grow <= 0) return;
  const col = o.color ?? DEBUG.target;
  const bend = o.bend ?? 0.25;
  const mx = (from.x + to.x) / 2 - (to.y - from.y) * bend;
  const my = (from.y + to.y) / 2 + (to.x - from.x) * bend;
  const end = bez(from, { x: mx, y: my }, to, grow);
  const before = bez(from, { x: mx, y: my }, to, Math.max(0, grow - 0.04));
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.setLineDash([16, 10]);
  ctx.lineDashOffset = -o.t * 60;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  for (let k = 1; k <= 24; k++) {
    const p = bez(from, { x: mx, y: my }, to, (k / 24) * grow);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const a = Math.atan2(end.y - before.y, end.x - before.x);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(end.x + Math.cos(a) * 8, end.y + Math.sin(a) * 8);
  ctx.lineTo(end.x - Math.cos(a - 0.5) * 28, end.y - Math.sin(a - 0.5) * 28);
  ctx.lineTo(end.x - Math.cos(a + 0.5) * 28, end.y - Math.sin(a + 0.5) * 28);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(from.x, from.y, 7, 0, Math.PI * 2);
  ctx.fill();
  if (o.label && grow > 0.5) {
    const m = bez(from, { x: mx, y: my }, to, 0.5);
    ctx.globalAlpha *= clamp01((grow - 0.5) * 4);
    tag(ctx, o.label, m.x + 10, m.y - 10, col);
  }
  ctx.restore();
}

const bez = (a: Pt, c: Pt, b: Pt, u: number): Pt => ({
  x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
  y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
});

/** A number the way the readout shows it: thousands commas and a real minus sign, e.g. −12,480. */
export function formatNumber(v: number, decimals = 0): string {
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return v < 0 ? `−${s}` : s;
}

export interface ReadoutOpts {
  /** e.g. 'duck.y' */
  readonly label: string;
  readonly value: number;
  readonly t: number;
  /** Red, shaking a little: the value is wrong. */
  readonly bad?: boolean;
  readonly size?: number;
  readonly decimals?: number;
  readonly anchor?: 'left' | 'center';
}

/** A live readout `duck.y: −12,480` in a dark pill; turns red and jitters when `bad`. */
export function drawReadout(ctx: CanvasRenderingContext2D, x: number, y: number, o: ReadoutOpts): void {
  const size = o.size ?? 34;
  const text = `${o.label}: ${formatNumber(o.value, o.decimals)}`;
  ctx.save();
  ctx.font = `700 ${size}px ${MONO}`;
  const w = ctx.measureText(text).width + size * 0.9;
  const h = size * 1.5;
  const jx = o.bad ? Math.sin(o.t * 53) * 2 : 0;
  const left = (o.anchor === 'center' ? x - w / 2 : x) + jx;
  ctx.fillStyle = o.bad ? 'rgba(80,8,8,0.88)' : 'rgba(11,13,18,0.85)';
  ctx.beginPath();
  ctx.roundRect(left, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = o.bad ? DEBUG.bad : DEBUG.box;
  ctx.stroke();
  ctx.fillStyle = o.bad ? '#ffd9d4' : '#e9fff8';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + size * 0.45, y + 1);
  ctx.restore();
}

/** Points along a fish's body (nose to tail) for rig bones: body centre (x, y), length, facing, tilt; `n` joints. */
export function fishSpinePoints(x: number, y: number, length: number, facing: 1 | -1, tilt = 0, n = 6, sway?: { readonly t: number; readonly amount: number }): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const along = (0.46 - u * 0.92) * length;
    const bendY = sway ? Math.sin(sway.t * 7 - u * 3) * sway.amount * length * u * u : 0;
    const lx = along * facing;
    pts.push({ x: x + lx * Math.cos(tilt) - bendY * Math.sin(tilt), y: y + lx * Math.sin(tilt) + bendY * Math.cos(tilt) });
  }
  return pts;
}

/** Rig bones along `pts`: tapered diamond bones and round joints, appearing one by one from `at` over `dur` s. */
export function drawRigBones(ctx: CanvasRenderingContext2D, pts: readonly Pt[], o: { readonly t: number; readonly at?: number; readonly dur?: number; readonly color?: string; readonly label?: string }): void {
  const at = o.at ?? -Infinity;
  const dur = o.dur ?? 0.8;
  const col = o.color ?? DEBUG.bone;
  ctx.save();
  for (let i = 0; i < pts.length - 1; i++) {
    const u = Number.isFinite(at) ? clamp01((o.t - at - (i * dur) / pts.length) / 0.18) : 1;
    if (u <= 0) continue;
    const a = pts[i]!;
    const b0 = pts[i + 1]!;
    const b = { x: a.x + (b0.x - a.x) * u, y: a.y + (b0.y - a.y) * u };
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const wide = Math.max(8, Math.hypot(b0.x - a.x, b0.y - a.y) * 0.14);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.2, -wide);
    ctx.lineTo(len, 0);
    ctx.lineTo(len * 0.2, wide);
    ctx.closePath();
    ctx.fillStyle = 'rgba(127,211,255,0.35)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = col;
    ctx.stroke();
    ctx.restore();
  }
  pts.forEach((p, i) => {
    const u = Number.isFinite(at) ? clamp01((o.t - at - (i * dur) / pts.length) / 0.12) : 1;
    if (u <= 0) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9 * u, 0, Math.PI * 2);
    ctx.fillStyle = DEBUG.joint;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = col;
    ctx.stroke();
  });
  if (o.label && pts.length) {
    const u = Number.isFinite(at) ? clamp01((o.t - at - dur) / 0.2) : 1;
    ctx.globalAlpha *= u;
    tag(ctx, o.label, pts[0]!.x - 20, pts[0]!.y - 30, col);
  }
  ctx.restore();
}

/** A red warning toast stacking upwards: `rows` appear at their `at`, newest on top of the stack at (x, y). */
export function drawWarningStack(ctx: CanvasRenderingContext2D, x: number, y: number, rows: readonly { readonly at: number; readonly text: string }[], t: number, size = 28): void {
  const shown = rows.filter((r) => r.at <= t);
  shown.forEach((r, k) => {
    const s = pop(t, r.at, 0.25);
    const yy = y - (shown.length - 1 - k) * size * 1.7;
    ctx.save();
    ctx.translate(x, yy);
    ctx.scale(s, s);
    ctx.font = `700 ${size}px ${MONO}`;
    const w = ctx.measureText(`⚠ ${r.text}`).width + 24;
    ctx.fillStyle = 'rgba(120,12,12,0.92)';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -size * 0.75, w, size * 1.5, 8);
    ctx.fill();
    ctx.strokeStyle = DEBUG.bad;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffe3df';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚠ ${r.text}`, 0, 1);
    ctx.restore();
  });
}

