import { drawTextLine, PAPER_ON_DARK } from '../captions';
import { VIDEO } from '../short';
import { captionAt, feetLabel, HOOK_LINES, hookAlpha, hookWord, LINES, couchBar, placeLabel, TEXT, weightLabel } from './story';
import type { Word } from './words';

/** The words on screen: the hook's two lines together, then each phrase as it is said, and the measures. */
const MAX_W = 980;
/** The bus's yellow, for the word being said. */
const HOT = '#ffc233';
const DIM = 0.55;

interface Spoken {
  readonly words: readonly Word[];
  readonly now: number;
  readonly y: number;
  readonly size: number;
  readonly unsaid: number;
  readonly alpha: number;
}

/** One line, word by word, shrunk to fit. */
function drawLine(ctx: CanvasRenderingContext2D, s: Spoken): void {
  ctx.save();
  ctx.font = `700 ${s.size}px Caveat`;
  const space = ctx.measureText(' ').width;
  const widths = s.words.map((w) => ctx.measureText(w.text).width);
  ctx.restore();
  const total = widths.reduce((sum, w) => sum + w, 0) + space * (s.words.length - 1);
  const k = Math.min(1, MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  s.words.forEach((w, i) => {
    const ink = i === s.now ? { fill: HOT, halo: PAPER_ON_DARK.halo } : PAPER_ON_DARK;
    drawTextLine(ctx, w.text, x + (widths[i]! * k) / 2, s.y, s.size * k, 700, s.alpha * (i <= s.now ? 1 : s.unsaid), ink);
    x += (widths[i]! + space) * k;
  });
}

export function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  const hook = hookAlpha(t);
  if (hook > 0) {
    let now = hookWord(t);
    LINES.slice(0, HOOK_LINES).forEach((l, i) => {
      drawLine(ctx, { words: l.words, now, y: TEXT.hook.y + i * TEXT.hook.gap, size: TEXT.hook.size, unsaid: 1, alpha: hook });
      now -= l.words.length;
    });
  }
  const c = captionAt(t);
  if (c) drawLine(ctx, { words: c.line.words, now: c.word, y: TEXT.line.y, size: TEXT.line.size, unsaid: DIM, alpha: 1 });
  for (const [label, alpha] of [[TEXT.feet, feetLabel(t)], [TEXT.place, placeLabel(t)], [TEXT.weight, weightLabel(t)], [TEXT.couch, couchBar(t)]] as const) {
    if (alpha > 0) drawTextLine(ctx, label.text, VIDEO.width / 2, label.y, label.size, 700, alpha, { fill: '#ffe08a', halo: PAPER_ON_DARK.halo });
  }
}
