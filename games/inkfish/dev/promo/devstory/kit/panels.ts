import { paperPattern } from './gameArt';
import { clamp01, clipped, hash, HAND, MONO, pop, ramp, roundRect, type Pt, type Rect } from './geom';

/**
 * The windows on Dewy's screen: a dark editor in an ink-and-paper theme
 * (deep ink-blue page, paper-coloured text, watercolour syntax colours; no real
 * IDE's look or branding), a console log, and the game-preview window.
 * Every draw is a pure function of `t`. Text is ≥ 26 px so it reads on a phone.
 */

export const THEME = {
  page: '#171b26',
  gutter: '#12151e',
  bar: '#0e1118',
  barText: '#d9cfb8',
  text: '#efe6d2',
  dim: '#6f7789',
  keyword: '#ee8a6e',
  string: '#a5cf95',
  number: '#f0c56a',
  func: '#8fc0ea',
  type: '#c8aef0',
  comment: '#7c8698',
  prop: '#e6d3ad',
  highlight: 'rgba(240,197,106,0.16)',
  highlightEdge: '#f0c56a',
  warn: '#ff5a4e',
  warnBand: 'rgba(255,90,78,0.16)',
  caret: '#f0c56a',
} as const;

const TITLE_H = 54;
const DOTS = ['#e0604f', '#e9b44c', '#6fb36b'] as const;

/** A window frame: rounded dark body, a title bar with three watercolour dots and a title in the game's hand. Returns the inner rect. */
export function drawWindow(ctx: CanvasRenderingContext2D, r: Rect, title: string, opts: { readonly light?: boolean; readonly alpha?: number; readonly reserveRight?: number } = {}): Rect {
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, r, 16);
  ctx.fillStyle = opts.light ? '#efe6d2' : THEME.page;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  clipped(ctx, r, () => {
    ctx.fillStyle = opts.light ? '#e2d6bb' : THEME.bar;
    ctx.fillRect(r.x, r.y, r.w, TITLE_H);
    // Paper grain over the bar, so it reads as painted rather than flat.
    ctx.globalAlpha *= 0.18;
    ctx.globalCompositeOperation = opts.light ? 'multiply' : 'overlay';
    ctx.fillStyle = paperPattern(ctx);
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }, 16);
  ctx.globalCompositeOperation = 'source-over';
  DOTS.forEach((c, i) => {
    ctx.beginPath();
    ctx.arc(r.x + 30 + i * 30, r.y + TITLE_H / 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.stroke();
  });
  ctx.font = `700 34px ${HAND}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = opts.light ? '#2a2630' : THEME.barText;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x + 120, r.y, Math.max(0, r.w - 136 - (opts.reserveRight ?? 0)), TITLE_H);
  ctx.clip();
  ctx.fillText(title, r.x + 128, r.y + TITLE_H / 2 + 1);
  ctx.restore();
  roundRect(ctx, r, 16);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = opts.light ? 'rgba(27,26,31,0.75)' : 'rgba(0,0,0,0.8)';
  ctx.stroke();
  ctx.restore();
  return { x: r.x, y: r.y + TITLE_H, w: r.w, h: r.h - TITLE_H };
}

// ------------------------------------------------------------------ syntax

const KEYWORDS = new Set(['const', 'let', 'var', 'if', 'else', 'return', 'function', 'export', 'import', 'from', 'new', 'class', 'interface', 'type', 'for', 'while', 'of', 'in', 'true', 'false', 'null', 'undefined', 'this', 'await', 'async', 'readonly', 'switch', 'case', 'break']);

interface Token { readonly text: string; readonly color: string; readonly italic?: boolean }

/** Splits a line of TypeScript into coloured tokens (a rough highlighter: enough to look right). */
export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  const re = /(\/\/.*$)|('[^']*'?|"[^"]*"?|`[^`]*`?)|(\b\d[\d_.,]*\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let prev = '';
  while ((m = re.exec(line))) {
    const [all, comment, str, num, word] = m;
    let color: string = THEME.text;
    if (comment) out.push({ text: all, color: THEME.comment, italic: true });
    else {
      if (str) color = THEME.string;
      else if (num) color = THEME.number;
      else if (word) {
        const next = line.slice(re.lastIndex).trimStart()[0];
        if (KEYWORDS.has(word)) color = THEME.keyword;
        else if (next === '(') color = THEME.func;
        else if (/^[A-Z]/.test(word)) color = THEME.type;
        else if (prev === '.') color = THEME.prop;
      }
      out.push({ text: all, color });
    }
    if (all.trim()) prev = all;
  }
  return out;
}

// ------------------------------------------------------------------ editor

export interface Typing {
  /** When typing starts (s). */
  readonly at: number;
  /** Characters per second on average (default 26); each key gets a little jitter. */
  readonly cps?: number;
  /** Lines before this index are already there; typing starts at this line (default 0). */
  readonly fromLine?: number;
}

export interface Warning {
  /** Line index (in `code`) that goes red. */
  readonly line: number;
  /** When it appears (s). */
  readonly at: number;
  /** Optional message drawn at the line's end, e.g. 'duck.y < 0'. */
  readonly text?: string;
}

export interface EditorOpts {
  readonly rect: Rect;
  readonly t: number;
  /** Shown in the title bar, e.g. 'decoy.ts'. */
  readonly file: string;
  readonly code: readonly string[];
  /** Number shown on the first line (default 1). */
  readonly firstLineNo?: number;
  readonly typing?: Typing;
  /** A highlighted line (index in `code`), lit from `at` (default always). */
  readonly highlight?: { readonly line: number; readonly at?: number };
  readonly warnings?: readonly Warning[];
  /** Code size in px (default 28; keep ≥ 26). */
  readonly fontSize?: number;
  /** Keep this line in view instead of following the caret. */
  readonly scrollTo?: number;
  readonly alpha?: number;
}

/** How many characters of `total` are typed `elapsed` s after typing started (jittered keys, pauses after ; and newlines). */
export function typedCount(chars: string, elapsed: number, cps = 26): number {
  if (elapsed <= 0) return 0;
  let time = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    let d = (0.55 + hash(i * 3.1) * 0.9) / cps;
    if (c === '\n') d += 0.18;
    else if (c === ';' || c === '{') d += 0.08;
    time += d;
    if (time > elapsed) return i;
  }
  return chars.length;
}

/** Seconds it takes to type `code` from line `fromLine` (for timing the next beat). */
export function typingDuration(code: readonly string[], cps = 26, fromLine = 0): number {
  const chars = code.slice(fromLine).join('\n');
  let time = 0;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    time += (0.55 + hash(i * 3.1) * 0.9) / cps + (c === '\n' ? 0.18 : c === ';' || c === '{' ? 0.08 : 0);
  }
  return time;
}

/** The editor: line numbers, coloured code typing itself, a highlighted line, red warning lines. Returns the caret's position. */
export function drawEditor(ctx: CanvasRenderingContext2D, o: EditorOpts): Pt {
  const inner = drawWindow(ctx, o.rect, o.file, { alpha: o.alpha });
  const size = o.fontSize ?? 28;
  const lh = Math.round(size * 1.45);
  const gutterW = size * 2.4;
  // What's visible: whole lines before fromLine, then the typed part.
  let lines = [...o.code];
  let caret = { line: lines.length - 1, col: lines[lines.length - 1]?.length ?? 0 };
  let typingNow = false;
  if (o.typing) {
    const from = o.typing.fromLine ?? 0;
    const rest = o.code.slice(from).join('\n');
    const n = typedCount(rest, o.t - o.typing.at, o.typing.cps);
    const typed = rest.slice(0, n).split('\n');
    lines = [...o.code.slice(0, from), ...(n > 0 || from === 0 ? typed : [])];
    if (n === 0 && from > 0) lines = [...o.code.slice(0, from)];
    caret = n === 0 && from > 0
      ? { line: from - 1, col: o.code[from - 1]!.length }
      : { line: from + typed.length - 1, col: typed[typed.length - 1]!.length };
    typingNow = n > 0 && n < rest.length;
  }
  const visibleRows = Math.floor((inner.h - 24) / lh);
  const focus = o.scrollTo ?? caret.line;
  const first = Math.max(0, Math.min(focus - visibleRows + 2, o.code.length - visibleRows));
  const top = inner.y + 18;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  clipped(ctx, inner, () => {
    ctx.fillStyle = THEME.gutter;
    ctx.fillRect(inner.x, inner.y, gutterW, inner.h);
    ctx.textBaseline = 'middle';
    for (let row = 0; row < visibleRows + 1; row++) {
      const i = first + row;
      const y = top + row * lh + lh / 2;
      if (i >= o.code.length) break;
      const warn = o.warnings?.find((w) => w.line === i && o.t >= w.at);
      const lit = o.highlight && o.highlight.line === i && o.t >= (o.highlight.at ?? -Infinity);
      if (lit || warn) {
        const a = warn ? clamp01((o.t - warn.at) / 0.15) : clamp01((o.t - (o.highlight!.at ?? -1)) / 0.2);
        ctx.globalAlpha = a;
        ctx.fillStyle = warn ? THEME.warnBand : THEME.highlight;
        ctx.fillRect(inner.x + gutterW, y - lh / 2, inner.w - gutterW, lh);
        ctx.fillStyle = warn ? THEME.warn : THEME.highlightEdge;
        ctx.fillRect(inner.x + gutterW, y - lh / 2, 5, lh);
        ctx.globalAlpha = 1;
      }
      // Line number (a red dot for a warning line).
      ctx.font = `${size * 0.85}px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = lit ? THEME.highlightEdge : THEME.dim;
      ctx.fillText(String((o.firstLineNo ?? 1) + i), inner.x + gutterW - size * 0.5, y);
      if (warn) {
        ctx.beginPath();
        ctx.arc(inner.x + size * 0.45, y, size * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = THEME.warn;
        ctx.fill();
      }
      // Code.
      ctx.textAlign = 'left';
      const text = lines[i];
      if (text === undefined) continue;
      let x = inner.x + gutterW + size * 0.7;
      for (const tok of tokenize(text)) {
        ctx.font = `${tok.italic ? 'italic ' : ''}${size}px ${MONO}`;
        ctx.fillStyle = tok.color;
        ctx.fillText(tok.text, x, y);
        x += ctx.measureText(tok.text).width;
      }
      if (warn) {
        squiggle(ctx, inner.x + gutterW + size * 0.7, x, y + size * 0.62, o.t);
        if (warn.text) {
          ctx.font = `700 ${size * 0.92}px ${MONO}`;
          ctx.fillStyle = THEME.warn;
          const msg = `  ⚠ ${warn.text}`;
          const room = inner.x + inner.w - x - 10;
          if (ctx.measureText(msg).width <= room) ctx.fillText(msg, x, y);
        }
      }
    }
    // Caret: solid while typing, blinking when idle.
    const cRow = caret.line - first;
    if (cRow >= 0 && cRow <= visibleRows && (typingNow || Math.floor(o.t * 2.2) % 2 === 0)) {
      ctx.font = `${size}px ${MONO}`;
      const cx = inner.x + gutterW + size * 0.7 + ctx.measureText((lines[caret.line] ?? '').slice(0, caret.col)).width;
      ctx.fillStyle = THEME.caret;
      ctx.fillRect(cx, top + cRow * lh + lh * 0.14, 3.5, lh * 0.72);
    }
  });
  ctx.restore();
  ctx.font = `${size}px ${MONO}`;
  const cx = inner.x + gutterW + size * 0.7 + ctx.measureText((lines[caret.line] ?? '').slice(0, caret.col)).width;
  return { x: cx, y: top + (caret.line - first) * lh + lh / 2 };
}

function squiggle(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, t: number): void {
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 3) {
    const yy = y + Math.sin((x - x0) * 0.55 + t * 6) * 3;
    if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
  }
  ctx.strokeStyle = THEME.warn;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

// ------------------------------------------------------------------ log

export interface LogRow {
  readonly at: number;
  readonly text: string;
  readonly kind?: 'info' | 'warn' | 'error';
}

/** A console: rows arrive at their `at`, newest at the bottom, sliding up; an error count badge in the title bar. */
export function drawLog(ctx: CanvasRenderingContext2D, o: { readonly rect: Rect; readonly t: number; readonly rows: readonly LogRow[]; readonly title?: string; readonly fontSize?: number; readonly alpha?: number }): void {
  const inner = drawWindow(ctx, o.rect, o.title ?? 'console', { alpha: o.alpha });
  const size = o.fontSize ?? 26;
  const lh = Math.round(size * 1.4);
  const shown = o.rows.filter((r) => r.at <= o.t);
  const errors = shown.filter((r) => r.kind === 'error' || r.kind === 'warn').length;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  if (errors > 0) {
    const last = shown.filter((r) => r.kind !== 'info').at(-1)!;
    const s = 1 + 0.25 * (1 - clamp01((o.t - last.at) / 0.3));
    ctx.save();
    ctx.translate(o.rect.x + o.rect.w - 48, o.rect.y + 27);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.roundRect(-30, -17, 60, 34, 17);
    ctx.fillStyle = THEME.warn;
    ctx.fill();
    ctx.font = `700 26px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(errors), 0, 1);
    ctx.restore();
  }
  clipped(ctx, inner, () => {
    const last = shown.at(-1);
    const slide = last ? 1 - ramp(o.t, last.at, last.at + 0.15) : 0;
    const bottom = inner.y + inner.h - 14 + slide * lh;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    shown.slice(-Math.ceil(inner.h / lh) - 1).reverse().forEach((r, k) => {
      const y = bottom - k * lh - lh / 2;
      const col = r.kind === 'error' ? THEME.warn : r.kind === 'warn' ? THEME.number : THEME.dim;
      if (r.kind === 'error') {
        ctx.fillStyle = THEME.warnBand;
        ctx.fillRect(inner.x, y - lh / 2, inner.w, lh);
      }
      ctx.font = `${r.kind === 'error' ? '700 ' : ''}${size}px ${MONO}`;
      ctx.fillStyle = col;
      const mark = r.kind === 'error' ? '✖ ' : r.kind === 'warn' ? '⚠ ' : '› ';
      ctx.fillText(mark + r.text, inner.x + 18, y);
    });
  });
  ctx.restore();
}

// ------------------------------------------------------------------ preview

export interface PreviewOpts {
  readonly rect: Rect;
  readonly t: number;
  /** Title bar text (default 'InkFish · preview'). */
  readonly title?: string;
  /** Draws the game into `inner` (already clipped to it). */
  readonly draw: (ctx: CanvasRenderingContext2D, inner: Rect) => void;
  /** No title bar: the game fills the whole rect (full-monitor glimpses). */
  readonly bare?: boolean;
  /** A small status pill at the bar's right ('● running', 'paused'…). */
  readonly status?: string;
  readonly alpha?: number;
  /** Pops the window in from `at` (scale overshoot). */
  readonly popAt?: number;
}

/** The game-preview window: a paper title bar, then the supplied drawing clipped to the viewport. Returns the viewport. */
export function drawPreview(ctx: CanvasRenderingContext2D, o: PreviewOpts): Rect {
  const s = o.popAt === undefined ? 1 : pop(o.t, o.popAt);
  if (s <= 0) return o.rect;
  ctx.save();
  const cx = o.rect.x + o.rect.w / 2;
  const cy = o.rect.y + o.rect.h / 2;
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  ctx.font = `700 26px ${MONO}`;
  const pillW = o.status ? ctx.measureText(o.status).width + 46 : 0;
  const inner = o.bare ? o.rect : drawWindow(ctx, o.rect, o.title ?? 'InkFish · preview', { light: true, alpha: o.alpha, reserveRight: pillW });
  ctx.globalAlpha *= o.alpha ?? 1;
  clipped(ctx, inner, () => o.draw(ctx, inner), o.bare ? 0 : 0);
  if (!o.bare) {
    ctx.strokeStyle = 'rgba(27,26,31,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(inner.x + inner.w, inner.y);
    ctx.stroke();
  }
  if (o.status && !o.bare) {
    ctx.font = `700 26px ${MONO}`;
    const w = ctx.measureText(o.status).width + 30;
    const x = o.rect.x + o.rect.w - w - 16;
    ctx.beginPath();
    ctx.roundRect(x, o.rect.y + 10, w, 34, 17);
    ctx.fillStyle = 'rgba(27,26,31,0.85)';
    ctx.fill();
    ctx.fillStyle = '#f4eddc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.status, x + 15, o.rect.y + 28);
  }
  ctx.restore();
  return inner;
}
