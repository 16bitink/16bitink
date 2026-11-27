import { curveAt } from '../../short';
import { PAINT_RED, paperPattern } from './gameArt';
import { clamp01, hash, HAND, MONO, pop, ramp, type Pt } from './geom';

/**
 * UI gags: a to-do list that ticks itself, a phone message bubble, a racing
 * clock, a counter, and a wandering cursor that clicks. Pure functions of `t`.
 */

const INK = '#1b1a1f';

// ------------------------------------------------------------------ to-do

export interface TodoItem {
  readonly text: string;
  /** When its tick is drawn (omit: never ticked). */
  readonly tickAt?: number;
  /** When the line appears (omit: from the start). */
  readonly showAt?: number;
}

/** A paper sticky note with a hand-written list; each tick draws itself in red ink at its time. Returns the note's height. */
export function drawTodo(ctx: CanvasRenderingContext2D, o: { readonly x: number; readonly y: number; readonly w: number; readonly t: number; readonly title?: string; readonly items: readonly TodoItem[]; readonly size?: number; readonly rot?: number; readonly popAt?: number }): number {
  const size = o.size ?? 42;
  const lh = size * 1.2;
  const shown = o.items.filter((it) => (it.showAt ?? -Infinity) <= o.t);
  const head = o.title ? size * 1.35 : size * 0.4;
  const h = head + Math.max(1, shown.length) * lh + size * 0.5;
  const s = o.popAt === undefined ? 1 : pop(o.t, o.popAt);
  if (s <= 0) return h;
  ctx.save();
  ctx.translate(o.x + o.w / 2, o.y);
  ctx.rotate(o.rot ?? -0.025);
  ctx.scale(s, s);
  ctx.translate(-o.w / 2, 0);
  // Note: paper, a warm yellow wash, a soft shadow, a strip of tape.
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#f6e7a8';
  ctx.fillRect(0, 0, o.w, h);
  ctx.shadowColor = 'transparent';
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = paperPattern(ctx);
  ctx.fillRect(0, 0, o.w, h);
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, 'rgba(240,200,90,0.0)');
  wash.addColorStop(1, 'rgba(220,170,70,0.25)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, o.w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(235,235,220,0.7)';
  ctx.save();
  ctx.translate(o.w / 2, 0);
  ctx.rotate(0.04);
  ctx.fillRect(-60, -14, 120, 30);
  ctx.restore();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (o.title) {
    ctx.font = `700 ${size * 1.05}px ${HAND}`;
    ctx.fillStyle = INK;
    ctx.fillText(o.title, size * 0.5, head * 0.55);
    ctx.fillRect(size * 0.5, head * 0.92, ctx.measureText(o.title).width, 2.5);
  }
  shown.forEach((it, i) => {
    const y = head + i * lh + lh / 2;
    const a = clamp01((o.t - (it.showAt ?? -1)) / 0.2);
    ctx.globalAlpha = a;
    // Box: a wobbly hand-drawn square.
    const bx = size * 0.5;
    const b = size * 0.62;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(bx + jit(i, 1), y - b / 2 + jit(i, 2));
    ctx.lineTo(bx + b + jit(i, 3), y - b / 2 + jit(i, 4));
    ctx.lineTo(bx + b + jit(i, 5), y + b / 2 + jit(i, 6));
    ctx.lineTo(bx + jit(i, 7), y + b / 2 + jit(i, 8));
    ctx.closePath();
    ctx.stroke();
    ctx.font = `700 ${size}px ${HAND}`;
    ctx.fillStyle = INK;
    ctx.fillText(it.text, bx + b + size * 0.45, y + 2);
    if (it.tickAt !== undefined && o.t >= it.tickAt) {
      drawTick(ctx, bx + b * 0.5, y, b, clamp01((o.t - it.tickAt) / 0.22), i);
      // A quick scratch-through once ticked.
      const u = ramp(o.t, it.tickAt + 0.15, it.tickAt + 0.35);
      if (u > 0) {
        ctx.strokeStyle = 'rgba(27,26,31,0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const x0 = bx + b + size * 0.4;
        const tw = ctx.measureText(it.text).width;
        ctx.moveTo(x0, y + 4);
        ctx.lineTo(x0 + tw * u, y + 1 + jit(i, 9));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
  ctx.restore();
  return h;
}

const jit = (i: number, k: number): number => (hash(i * 13 + k) - 0.5) * 3;

/** A hand-drawn tick, `u` 0..1 of its stroke drawn, in red ink, a bit bigger than the box. */
export function drawTick(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, u: number, seed = 0): void {
  const pts: Pt[] = [
    { x: cx - size * 0.5, y: cy - size * 0.05 },
    { x: cx - size * 0.12, y: cy + size * 0.42 + jit(seed, 11) },
    { x: cx + size * 0.75, y: cy - size * 0.75 + jit(seed, 12) },
  ];
  const l1 = Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y);
  const l2 = Math.hypot(pts[2]!.x - pts[1]!.x, pts[2]!.y - pts[1]!.y);
  const d = u * (l1 + l2);
  ctx.save();
  ctx.strokeStyle = PAINT_RED;
  ctx.lineWidth = size * 0.17;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  if (d <= l1) ctx.lineTo(pts[0]!.x + ((pts[1]!.x - pts[0]!.x) * d) / l1, pts[0]!.y + ((pts[1]!.y - pts[0]!.y) * d) / l1);
  else {
    ctx.lineTo(pts[1]!.x, pts[1]!.y);
    const f = (d - l1) / l2;
    ctx.lineTo(pts[1]!.x + (pts[2]!.x - pts[1]!.x) * f, pts[1]!.y + (pts[2]!.y - pts[1]!.y) * f);
  }
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ phone message

/**
 * A phone message bubble (grey, from someone else; tail bottom-left), with
 * three typing dots for `typingS` s before it pops in at `at`. (x, y) = its top-left.
 */
export function drawMessage(ctx: CanvasRenderingContext2D, o: { readonly x: number; readonly y: number; readonly maxW: number; readonly text: string; readonly t: number; readonly at: number; readonly from?: string; readonly typingS?: number; readonly size?: number; readonly mine?: boolean }): void {
  const size = o.size ?? 38;
  const typingFrom = o.at - (o.typingS ?? 0.8);
  if (o.t < typingFrom) return;
  ctx.save();
  ctx.font = `600 ${size}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  const lines = wrap(ctx, o.text, o.maxW - size * 1.2);
  const lh = size * 1.22;
  const nameH = o.from ? size * 0.85 : 0;
  const typing = o.t < o.at;
  const w = typing ? size * 3.2 : Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 1.2;
  const h = typing ? size * 1.8 : lines.length * lh + size * 0.7;
  const s = typing ? 1 : pop(o.t, o.at, 0.3);
  const bg = o.mine ? '#3b82f6' : '#e9e9ee';
  const fg = o.mine ? '#fff' : '#111';
  const x0 = o.mine ? o.x + o.maxW - w : o.x;
  if (o.from) {
    ctx.font = `600 ${size * 0.6}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textBaseline = 'top';
    ctx.fillText(o.from, x0 + size * 0.4, o.y);
  }
  const top = o.y + nameH;
  ctx.translate(x0 + (o.mine ? w : 0), top + h);
  ctx.scale(s, s);
  ctx.translate(-(x0 + (o.mine ? w : 0)), -(top + h));
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x0, top, w, h, size * 0.8);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // Tail.
  ctx.beginPath();
  const tx = o.mine ? x0 + w - size * 0.3 : x0 + size * 0.3;
  ctx.moveTo(tx, top + h - size * 0.6);
  ctx.quadraticCurveTo(tx + (o.mine ? size * 0.2 : -size * 0.2), top + h, tx + (o.mine ? size * 0.6 : -size * 0.6), top + h + size * 0.05);
  ctx.quadraticCurveTo(tx + (o.mine ? -size * 0.1 : size * 0.1), top + h, tx + (o.mine ? -size * 0.5 : size * 0.5), top + h - size * 0.2);
  ctx.fill();
  if (typing) {
    for (let k = 0; k < 3; k++) {
      const b = 0.5 + 0.5 * Math.sin(o.t * 9 - k * 0.9);
      ctx.beginPath();
      ctx.arc(x0 + size * (0.95 + k * 0.65), top + h / 2 - b * 4, size * 0.17, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(90,90,100,${0.45 + 0.5 * b})`;
      ctx.fill();
    }
  } else {
    ctx.font = `600 ${size}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, x0 + size * 0.6, top + size * 0.35 + lh * (i + 0.5)));
  }
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// ------------------------------------------------------------------ clock

const DAYS = ['SAT', 'SUN', 'MON', 'TUE'] as const;

/** "SAT 4:00 PM" for minutes since Saturday 00:00 (1440 = Sunday midnight). */
export function clockLabel(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  const day = DAYS[Math.min(DAYS.length - 1, Math.floor(m / 1440))]!;
  const inDay = m % 1440;
  const h24 = Math.floor(inDay / 60);
  const mm = String(inDay % 60).padStart(2, '0');
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${day} ${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`;
}
/** Minutes since Saturday 00:00 for a day ('SAT'|'SUN'|'MON') and a 24 h time, e.g. at('SAT', 16, 0). */
export const weekendMinutes = (day: (typeof DAYS)[number], h: number, m = 0): number => DAYS.indexOf(day) * 1440 + h * 60 + m;

/** The clock's minutes at `t`: smooth through keys ({ t, at: minutes }), racing between them. */
export const clockAt = (keys: readonly { readonly t: number; readonly at: number }[], t: number): number => curveAt(keys.map((k) => ({ ...k, rate: 0 })), t).at;

/** A racing clock: a dark pill, an analog face whose hands spin, and the day + time; blur streaks while racing. */
export function drawClock(ctx: CanvasRenderingContext2D, o: { readonly x: number; readonly y: number; readonly minutes: number; readonly t: number; readonly speed?: number; readonly size?: number; readonly popAt?: number }): void {
  const size = o.size ?? 44;
  const s = o.popAt === undefined ? 1 : pop(o.t, o.popAt);
  if (s <= 0) return;
  const label = clockLabel(o.minutes);
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s, s);
  ctx.font = `700 ${size}px ${MONO}`;
  const tw = ctx.measureText(label).width;
  const r = size * 0.62;
  const w = tw + r * 2 + size * 1.3;
  const h = size * 1.7;
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(14,17,24,0.92)';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f0c56a';
  ctx.stroke();
  const fx = -w / 2 + size * 0.45 + r;
  ctx.beginPath();
  ctx.arc(fx, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f4eddc';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.stroke();
  const hand = (ang: number, len: number, wdt: number): void => {
    ctx.beginPath();
    ctx.moveTo(fx, 0);
    ctx.lineTo(fx + Math.sin(ang) * len, -Math.cos(ang) * len);
    ctx.lineWidth = wdt;
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.stroke();
  };
  hand(((o.minutes % 720) / 720) * Math.PI * 2, r * 0.5, 4);
  hand(((o.minutes % 60) / 60) * Math.PI * 2, r * 0.8, 3);
  ctx.fillStyle = '#f4eddc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, fx + r + size * 0.4, 2);
  const speed = o.speed ?? 0;
  if (speed > 0) {
    ctx.strokeStyle = `rgba(240,197,106,${Math.min(0.8, speed)})`;
    ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      const yy = (k - 1) * h * 0.28;
      ctx.beginPath();
      ctx.moveTo(-w / 2 - 14 - k * 6, yy);
      ctx.lineTo(-w / 2 - 14 - k * 6 - 40 * Math.min(1, speed), yy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ counter

/** A count from `from` to `to` over [t0, t1], easing in (it accelerates): the whole value and how fresh the last step is (1 = just ticked). */
export function countAt(t: number, from: number, to: number, t0: number, t1: number, ease = 1.6): { readonly value: number; readonly fresh: number } {
  const u = clamp01((t - t0) / (t1 - t0));
  const exact = from + (to - from) * Math.pow(u, ease);
  const value = Math.floor(exact + 1e-9);
  return { value: Math.min(to, value), fresh: u >= 1 ? Math.max(0, 1 - (t - t1) / 0.3) : 1 - (exact - value) };
}

/** A big counter, 'LEVEL 37' style: a label above a number that bumps each time it ticks. */
export function drawCounter(ctx: CanvasRenderingContext2D, o: { readonly x: number; readonly y: number; readonly label: string; readonly value: number; readonly fresh?: number; readonly size?: number; readonly color?: string; readonly suffix?: string }): void {
  const size = o.size ?? 96;
  const bump = 1 + 0.14 * (o.fresh ?? 0);
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${size * 0.4}px ${MONO}`;
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(11,13,18,0.85)';
  ctx.strokeText(o.label, 0, -size * 0.72);
  ctx.fillStyle = '#f4eddc';
  ctx.fillText(o.label, 0, -size * 0.72);
  ctx.scale(bump, bump);
  ctx.font = `700 ${size}px ${HAND}`;
  ctx.lineWidth = size * 0.14;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(11,13,18,0.9)';
  const txt = `${o.value}${o.suffix ?? ''}`;
  ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = o.color ?? '#f0c56a';
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}

// ------------------------------------------------------------------ cursor

export interface CursorKey {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  /** Click on arrival. */
  readonly click?: boolean;
}

/** Where the cursor is at `t` along its waypoints (smooth, with a slight human wander), and seconds since its last click (Infinity if none). */
export function cursorAt(keys: readonly CursorKey[], t: number): { readonly x: number; readonly y: number; readonly clickAge: number } {
  const x = curveAt(keys.map((k) => ({ t: k.t, at: k.x })), t).at + Math.sin(t * 3.1) * 3;
  const y = curveAt(keys.map((k) => ({ t: k.t, at: k.y })), t).at + Math.sin(t * 2.3 + 1) * 3;
  const last = [...keys].reverse().find((k) => k.click && k.t <= t);
  return { x, y, clickAge: last ? t - last.t : Infinity };
}

/** Cursor image hotspots (art/screen/cut.py): the arrow's tip and the pointing finger's tip, in image px. */
export const ARROW_TIP = { x: 6, y: 4 } as const;
export const HAND_TIP = { x: 76, y: 4 } as const;

/** The painted cursor (arrow or pointing hand) with its tip on (x, y); a press squash and a ripple ring after a click. */
export function drawCursor(ctx: CanvasRenderingContext2D, img: HTMLImageElement, kind: 'arrow' | 'hand', o: { readonly x: number; readonly y: number; readonly clickAge?: number; readonly width?: number }): void {
  const width = o.width ?? (kind === 'arrow' ? 62 : 84);
  const s = width / img.width;
  const tip = kind === 'arrow' ? ARROW_TIP : HAND_TIP;
  const age = o.clickAge ?? Infinity;
  if (age < 0.45) {
    const u = age / 0.45;
    ctx.save();
    ctx.beginPath();
    ctx.arc(o.x, o.y, 14 + u * 46, 0, Math.PI * 2);
    ctx.lineWidth = 5 * (1 - u);
    ctx.strokeStyle = `rgba(240,197,106,${1 - u})`;
    ctx.stroke();
    ctx.restore();
  }
  const press = age < 0.18 ? 1 - 0.12 * Math.sin((age / 0.18) * Math.PI) : 1;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(press, press);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;
  ctx.drawImage(img, -tip.x * s, -tip.y * s, img.width * s, img.height * s);
  ctx.restore();
}
